const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const {
  sequelize, ErrorLog, ErrorAssignment, Application, AppHealth, User,
} = require('../models/index');
const cache = require('../services/cacheService');

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const CACHE_TTL   = 2 * 60 * 1000; // 2 minutes

// GET /api/analytics/summary
const summary = async (req, res) => {
  const cacheKey = 'analytics:summary';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const since30d = new Date(Date.now() - THIRTY_DAYS);

    const [total, critical, resolved, recurring] = await Promise.all([
      ErrorLog.count({ where: { created_at: { [Op.gte]: since30d } } }),
      ErrorLog.count({ where: { severity: 'CRITICAL', created_at: { [Op.gte]: since30d } } }),
      ErrorLog.count({ where: { status: 'RESOLVED', created_at: { [Op.gte]: since30d } } }),
      // Errors that occurred more than once (are repeat offenders)
      ErrorLog.count({ where: { occurrence_count: { [Op.gt]: 1 }, created_at: { [Op.gte]: since30d } } }),
    ]);

    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';
    const recurringRate  = total > 0 ? ((recurring / total) * 100).toFixed(1) : '0.0';

    const result = { total, critical, resolved, recurring, resolutionRate, recurringRate };
    cache.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/error-rate  — errors per hour for last 24h
const errorRate = async (req, res) => {
  const cacheKey = 'analytics:error-rate';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const rows = await sequelize.query(`
      SELECT
        HOUR(created_at)  AS hour,
        DATE(created_at)  AS date,
        COUNT(*)          AS count
      FROM error_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY DATE(created_at), HOUR(created_at)
      ORDER BY date ASC, hour ASC
    `, { type: QueryTypes.SELECT });

    // Fill in missing hours with 0
    const now = new Date();
    const filled = Array.from({ length: 24 }, (_, i) => {
      const h = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const hour  = h.getHours();
      const date  = h.toISOString().split('T')[0];
      const match = rows.find(r => r.hour === hour && r.date === date);
      return {
        label: `${String(hour).padStart(2, '0')}:00`,
        count: match ? Number(match.count) : 0,
      };
    });

    cache.set(cacheKey, filled, CACHE_TTL);
    return res.json(filled);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/mttr  — Mean Time To Resolution per application (minutes)
const mttr = async (req, res) => {
  const cacheKey = 'analytics:mttr';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const rows = await sequelize.query(`
      SELECT
        e.application_id,
        a.app_name,
        COUNT(*)                                                              AS resolved_count,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, e.first_seen_at, ea.resolved_at)))   AS avg_minutes
      FROM error_logs e
      JOIN applications a  ON a.id = e.application_id
      JOIN error_assignments ea ON ea.error_id = e.id AND ea.resolved_at IS NOT NULL
      WHERE e.status = 'RESOLVED'
      GROUP BY e.application_id, a.app_name
      ORDER BY avg_minutes ASC
    `, { type: QueryTypes.SELECT });

    const result = rows.map(r => ({
      application_id: r.application_id,
      app_name:       r.app_name,
      resolved_count: Number(r.resolved_count),
      avg_minutes:    Number(r.avg_minutes) || 0,
      avg_hours:      +(Number(r.avg_minutes) / 60).toFixed(1),
    }));

    cache.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/reliability  — uptime % + avg response time per app (30d)
const reliability = async (req, res) => {
  const cacheKey = 'analytics:reliability';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const since30d = new Date(Date.now() - THIRTY_DAYS);
    const apps = await Application.findAll({ where: { is_active: true } });

    const results = await Promise.all(apps.map(async (app) => {
      const [healthStats, errorCount] = await Promise.all([
        sequelize.query(`
          SELECT
            COUNT(*)                    AS total_checks,
            SUM(is_up)                  AS up_checks,
            ROUND(AVG(response_time_ms)) AS avg_response_ms
          FROM app_health
          WHERE application_id = :appId AND checked_at >= :since
        `, {
          replacements: { appId: app.id, since: since30d },
          type: QueryTypes.SELECT,
        }),
        ErrorLog.count({
          where: { application_id: app.id, created_at: { [Op.gte]: since30d } },
        }),
      ]);

      const h = healthStats[0];
      const total   = Number(h.total_checks) || 0;
      const up      = Number(h.up_checks)    || 0;
      const uptime  = total > 0 ? +((up / total) * 100).toFixed(2) : null;

      return {
        application_id:  app.id,
        app_name:        app.app_name,
        environment:     app.environment,
        uptime_pct:      uptime,
        avg_response_ms: Number(h.avg_response_ms) || null,
        total_checks:    total,
        error_count_30d: errorCount,
      };
    }));

    // Sort by uptime ascending (most critical first), nulls last
    results.sort((a, b) => {
      if (a.uptime_pct === null) return 1;
      if (b.uptime_pct === null) return -1;
      return a.uptime_pct - b.uptime_pct;
    });

    cache.set(cacheKey, results, CACHE_TTL);
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/top-errors  — most recurring errors (30d)
const topErrors = async (req, res) => {
  const { limit = 10 } = req.query;
  const cacheKey = `analytics:top-errors:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const since30d = new Date(Date.now() - THIRTY_DAYS);
    const rows = await ErrorLog.findAll({
      where: { created_at: { [Op.gte]: since30d }, occurrence_count: { [Op.gt]: 1 } },
      include: [{ model: Application, as: 'application', attributes: ['app_name'] }],
      order: [['occurrence_count', 'DESC']],
      limit: parseInt(limit),
      attributes: ['id', 'application_id', 'error_message', 'endpoint', 'severity', 'status', 'occurrence_count', 'first_seen_at', 'last_seen_at'],
    });

    cache.set(cacheKey, rows, CACHE_TTL);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/developer-stats  — per-developer resolution metrics
const developerStats = async (req, res) => {
  const cacheKey = 'analytics:developer-stats';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const rows = await sequelize.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COUNT(ea.id)                                                               AS total_assigned,
        SUM(ea.resolved_at IS NOT NULL)                                            AS total_resolved,
        ROUND(AVG(CASE
          WHEN ea.resolved_at IS NOT NULL
          THEN TIMESTAMPDIFF(MINUTE, ea.assigned_at, ea.resolved_at)
        END))                                                                      AS avg_resolution_minutes
      FROM users u
      LEFT JOIN error_assignments ea ON ea.assigned_to = u.id
      WHERE u.role = 'developer' AND u.is_active = 1
      GROUP BY u.id, u.name, u.email
      ORDER BY total_resolved DESC
    `, { type: QueryTypes.SELECT });

    const result = rows.map(r => ({
      id:                     r.id,
      name:                   r.name,
      email:                  r.email,
      total_assigned:         Number(r.total_assigned),
      total_resolved:         Number(r.total_resolved),
      resolution_rate:        r.total_assigned > 0
                                ? +((r.total_resolved / r.total_assigned) * 100).toFixed(1)
                                : 0,
      avg_resolution_minutes: Number(r.avg_resolution_minutes) || null,
    }));

    cache.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { summary, errorRate, mttr, reliability, topErrors, developerStats };
