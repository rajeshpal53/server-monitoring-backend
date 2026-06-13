const { Op } = require('sequelize');
const { ErrorLog, ErrorComment, ErrorAssignment, Application, User } = require('../models/index');
const telegramService = require('../services/telegramService');

// POST /api/errors  — called by SDK middleware (API key auth)
const ingest = async (req, res) => {
  try {
    const {
      environment, endpoint, method, severity = 'ERROR',
      errorMessage, stackTrace, requestBody, userId, serverName,
    } = req.body;

    if (!errorMessage) {
      return res.status(400).json({ message: 'errorMessage is required.' });
    }

    const application_id = req.application.id;

    // Deduplication: same app + endpoint + error message within last 24h
    const existing = await ErrorLog.findOne({
      where: {
        application_id,
        endpoint: endpoint || null,
        error_message: errorMessage,
        status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
        last_seen_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) {
      await existing.update({
        occurrence_count: existing.occurrence_count + 1,
        last_seen_at: new Date(),
      });
      return res.status(200).json({ id: existing.id, deduplicated: true });
    }

    const log = await ErrorLog.create({
      application_id,
      environment: environment || req.application.environment,
      endpoint,
      method,
      severity,
      error_message: errorMessage,
      stack_trace: stackTrace,
      request_body: requestBody,
      user_id: userId,
      server_name: serverName || req.application.server_name,
      first_seen_at: new Date(),
      last_seen_at: new Date(),
    });

    if (severity === 'CRITICAL') {
      telegramService.notifyCriticalError(req.application, log).catch(() => {});
    }

    return res.status(201).json({ id: log.id, deduplicated: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/errors
const list = async (req, res) => {
  try {
    const {
      application_id, severity, status, environment,
      from, to, search, assigned_to,
      page = 1, limit = 20,
    } = req.query;

    const where = {};
    if (application_id) where.application_id = application_id;
    if (severity)       where.severity = severity;
    if (status)         where.status = status;
    if (environment)    where.environment = environment;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to)   where.created_at[Op.lte] = new Date(to);
    }
    if (search) {
      where[Op.or] = [
        { error_message: { [Op.like]: `%${search}%` } },
        { endpoint:      { [Op.like]: `%${search}%` } },
        { stack_trace:   { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let assignmentFilter = null;
    if (assigned_to) {
      assignmentFilter = {
        model: ErrorAssignment,
        as: 'assignments',
        where: { assigned_to },
        required: true,
      };
    }

    const { count, rows } = await ErrorLog.findAndCountAll({
      where,
      include: [
        { model: Application, as: 'application', attributes: ['id', 'app_name', 'environment'] },
        ...(assignmentFilter ? [assignmentFilter] : [
          { model: ErrorAssignment, as: 'assignments', limit: 1, order: [['assigned_at', 'DESC']],
            include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }] },
        ]),
      ],
      order: [['last_seen_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    return res.json({
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: rows,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/errors/:id
const getOne = async (req, res) => {
  try {
    const log = await ErrorLog.findByPk(req.params.id, {
      include: [
        { model: Application, as: 'application' },
        {
          model: ErrorComment, as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
          order: [['created_at', 'ASC']],
        },
        {
          model: ErrorAssignment, as: 'assignments',
          include: [
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
            { model: User, as: 'assigner', attributes: ['id', 'name'] },
          ],
          order: [['assigned_at', 'DESC']],
        },
      ],
    });
    if (!log) return res.status(404).json({ message: 'Error log not found.' });
    return res.json(log);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /api/errors/:id/status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` });
    }

    const log = await ErrorLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Error log not found.' });

    await log.update({ status });

    // Stamp resolved_at on the latest open assignment so MTTR can be computed
    if (status === 'RESOLVED') {
      const latest = await ErrorAssignment.findOne({
        where: { error_id: log.id, resolved_at: null },
        order: [['assigned_at', 'DESC']],
      });
      if (latest) await latest.update({ resolved_at: new Date() });
    }

    // Invalidate analytics cache so next request reflects the change
    const cache = require('../services/cacheService');
    cache.invalidatePrefix('analytics:');

    return res.json({ id: log.id, status: log.status });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/errors/:id/assign
const assign = async (req, res) => {
  try {
    const { assigned_to, notes } = req.body;
    if (!assigned_to) return res.status(400).json({ message: 'assigned_to is required.' });

    const log = await ErrorLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Error log not found.' });

    const assignee = await User.findByPk(assigned_to);
    if (!assignee) return res.status(404).json({ message: 'Developer not found.' });

    const assignment = await ErrorAssignment.create({
      error_id: log.id,
      assigned_to,
      assigned_by: req.user.id,
      notes,
    });

    if (log.status === 'OPEN') {
      await log.update({ status: 'IN_PROGRESS' });
    }

    return res.status(201).json(assignment);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/errors/:id/comments
const addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ message: 'comment is required.' });

    const log = await ErrorLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ message: 'Error log not found.' });

    const record = await ErrorComment.create({
      error_id: log.id,
      user_id: req.user.id,
      comment,
    });

    return res.status(201).json(record);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { ingest, list, getOne, updateStatus, assign, addComment };
