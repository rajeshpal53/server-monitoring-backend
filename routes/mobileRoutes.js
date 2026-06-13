const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { Op, fn, col } = require('sequelize');
const { ErrorLog, Application, AppHealth } = require('../models/index');

// GET /api/mobile/dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalToday, openErrors, criticalErrors, activeApps] = await Promise.all([
      ErrorLog.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      ErrorLog.count({ where: { status: 'OPEN' } }),
      ErrorLog.count({ where: { severity: 'CRITICAL', status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] } } }),
      Application.count({ where: { is_active: true } }),
    ]);

    return res.json({ total_errors_today: totalToday, open_errors: openErrors, critical_errors: criticalErrors, active_applications: activeApps });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/mobile/errors
router.get('/errors', verifyToken, async (req, res) => {
  try {
    const { severity, status, page = 1, limit = 15 } = req.query;
    const where = {};
    if (severity) where.severity = severity;
    if (status)   where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await ErrorLog.findAndCountAll({
      where,
      include: [{ model: Application, as: 'application', attributes: ['app_name'] }],
      order: [['last_seen_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)), data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/mobile/errors/:id
router.get('/errors/:id', verifyToken, async (req, res) => {
  try {
    const log = await ErrorLog.findByPk(req.params.id, {
      include: [{ model: Application, as: 'application', attributes: ['app_name', 'environment'] }],
    });
    if (!log) return res.status(404).json({ message: 'Not found.' });
    return res.json(log);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
