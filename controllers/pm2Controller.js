const { PM2Status, Application } = require('../models/index');
const { Op } = require('sequelize');
const telegramService = require('../services/telegramService');

// POST /api/pm2/snapshot  — called by server agent every minute
const snapshot = async (req, res) => {
  try {
    const { server_name, processes } = req.body;
    if (!server_name || !Array.isArray(processes)) {
      return res.status(400).json({ message: 'server_name and processes[] are required.' });
    }

    const UNHEALTHY = ['stopped', 'errored'];

    // ── Status-change detection ──────────────────────────────────────────────
    // Fetch the most recent status for each process on this server
    // (within the last 5 minutes, so a cold-start doesn't flood alerts)
    const processNames = processes.map(p => p.name);
    const lastRows = await PM2Status.findAll({
      attributes: ['process_name', 'status'],
      where: {
        server_name,
        process_name: { [Op.in]: processNames },
        recorded_at:  { [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) },
      },
      order: [['recorded_at', 'DESC']],
    });

    // Build map: process_name → last known status
    const lastStatus = {};
    lastRows.forEach(r => {
      if (!lastStatus[r.process_name]) lastStatus[r.process_name] = r.status;
    });

    // Fire Telegram only when status transitions online → unhealthy
    for (const p of processes) {
      const prev = lastStatus[p.name];
      if (prev === 'online' && UNHEALTHY.includes(p.status)) {
        telegramService.notifyPM2Down(server_name, p.name, p.status).catch(() => {});
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const now = new Date();
    const records = processes.map(p => ({
      server_name,
      process_name:   p.name,
      pm2_id:         p.pm_id,
      pid:            p.pid,
      status:         p.status,
      cpu_usage:      p.cpu,
      memory_usage:   p.memory,
      uptime:         p.uptime,
      restart_count:  p.restart_count,
      application_id: p.application_id || null,
      recorded_at:    now,
    }));

    await PM2Status.bulkCreate(records);
    return res.status(201).json({ inserted: records.length });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/pm2/latest  — latest status per process per server
const latest = async (req, res) => {
  try {
    const { server_name } = req.query;
    const where = { recorded_at: { [Op.gte]: new Date(Date.now() - 10 * 60 * 1000) } };
    if (server_name) where.server_name = server_name;

    // Pull every snapshot from the last 10 minutes (covers all servers regardless
    // of when each agent last pushed) then keep only the newest row per
    // (server_name, process_name) so counts aren't inflated by repeated pushes.
    const rows = await PM2Status.findAll({
      where,
      include: [{ model: Application, as: 'application', attributes: ['id', 'app_name'], required: false }],
      order: [['recorded_at', 'DESC']],
    });

    const seen = new Set();
    const deduped = [];
    for (const row of rows) {
      const key = `${row.server_name}::${row.process_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(row);
    }

    return res.json(deduped);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/pm2/servers — distinct server names that have ever reported, regardless of current filter
const listServers = async (req, res) => {
  try {
    const rows = await PM2Status.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('server_name')), 'server_name']],
      order: [['server_name', 'ASC']],
      raw: true,
    });
    return res.json(rows.map(r => r.server_name));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/pm2/history/:processName
const history = async (req, res) => {
  try {
    const { server_name, hours = 24 } = req.query;
    const where = {
      process_name: req.params.processName,
      recorded_at:  { [Op.gte]: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000) },
    };
    if (server_name) where.server_name = server_name;

    const rows = await PM2Status.findAll({ where, order: [['recorded_at', 'ASC']] });
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { snapshot, latest, listServers, history };
