const { Op, fn, col, literal } = require('sequelize');
const { ErrorLog, Application, AppHealth, sequelize } = require('../models/index');
const cache = require('../services/cacheService');

const summary = async (req, res) => {
  const cached = cache.get('dashboard:summary');
  if (cached) return res.json(cached);

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalToday,
      openErrors,
      criticalErrors,
      resolvedErrors,
      activeApps,
    ] = await Promise.all([
      ErrorLog.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      ErrorLog.count({ where: { status: 'OPEN' } }),
      ErrorLog.count({ where: { severity: 'CRITICAL', status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] } } }),
      ErrorLog.count({ where: { status: 'RESOLVED', created_at: { [Op.gte]: todayStart } } }),
      Application.count({ where: { is_active: true } }),
    ]);

    // Apps that had a failed health check in the last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentFailedChecks = await AppHealth.findAll({
      where: { is_up: false, checked_at: { [Op.gte]: fiveMinAgo } },
      attributes: [[fn('DISTINCT', col('application_id')), 'application_id']],
      raw: true,
    });
    const appsDown = recentFailedChecks.length;

    const result = {
      total_errors_today: totalToday,
      open_errors: openErrors,
      critical_errors: criticalErrors,
      resolved_today: resolvedErrors,
      apps_down: appsDown,
      active_applications: activeApps,
    };
    cache.set('dashboard:summary', result, 30 * 1000); // 30s TTL
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const errorsByDay = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const rows = await ErrorLog.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: since } },
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    });

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const errorsByApp = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const rows = await ErrorLog.findAll({
      attributes: [
        'application_id',
        [fn('COUNT', col('ErrorLog.id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: since } },
      include: [{ model: Application, as: 'application', attributes: ['app_name'] }],
      group: ['application_id', 'application.id'],
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true,
      nest: true,
    });

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const errorsBySeverity = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const rows = await ErrorLog.findAll({
      attributes: [
        'severity',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: since } },
      group: ['severity'],
      raw: true,
    });

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { summary, errorsByDay, errorsByApp, errorsBySeverity };
