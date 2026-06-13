const { AppHealth, Application } = require('../models/index');
const { Op } = require('sequelize');

// GET /api/health/latest  — last check result per application
const latest = async (req, res) => {
  try {
    const apps = await Application.findAll({ where: { is_active: true, health_url: { [Op.ne]: null } } });

    const results = await Promise.all(apps.map(async app => {
      const last = await AppHealth.findOne({
        where: { application_id: app.id },
        order: [['checked_at', 'DESC']],
      });
      return {
        application_id: app.id,
        app_name: app.app_name,
        health_url: app.health_url,
        last_check: last || null,
      };
    }));

    return res.json(results);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/health/:appId/history
const history = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const rows = await AppHealth.findAll({
      where: {
        application_id: req.params.appId,
        checked_at: { [Op.gte]: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000) },
      },
      order: [['checked_at', 'ASC']],
    });
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/health/:appId/stats  — uptime %, avg response time
const stats = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const rows = await AppHealth.findAll({
      where: {
        application_id: req.params.appId,
        checked_at: { [Op.gte]: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000) },
      },
    });

    if (!rows.length) return res.json({ uptime_pct: null, avg_response_ms: null, total_checks: 0 });

    const up = rows.filter(r => r.is_up).length;
    const avgMs = rows.filter(r => r.response_time_ms !== null)
      .reduce((sum, r) => sum + r.response_time_ms, 0) / rows.length;

    return res.json({
      uptime_pct: ((up / rows.length) * 100).toFixed(2),
      avg_response_ms: Math.round(avgMs),
      total_checks: rows.length,
      up_count: up,
      down_count: rows.length - up,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { latest, history, stats };
