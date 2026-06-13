const { ServerMetric } = require('../models/index');
const { Op } = require('sequelize');

// POST /api/server-metrics  — pushed by server agent
const push = async (req, res) => {
  try {
    const { server_name, cpu_usage, ram_used, ram_total, disk_used, disk_total, network_in, network_out } = req.body;
    if (!server_name) return res.status(400).json({ message: 'server_name is required.' });

    await ServerMetric.create({
      server_name, cpu_usage, ram_used, ram_total,
      disk_used, disk_total, network_in, network_out,
      recorded_at: new Date(),
    });

    return res.status(201).json({ message: 'Metrics recorded.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/server-metrics/latest
const latest = async (req, res) => {
  try {
    const { server_name } = req.query;

    // Get distinct server names
    const servers = server_name ? [server_name] : await ServerMetric.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('server_name')), 'server_name']],
      raw: true,
    }).then(rows => rows.map(r => r.server_name));

    const results = await Promise.all(servers.map(async name => {
      const row = await ServerMetric.findOne({
        where: { server_name: name },
        order: [['recorded_at', 'DESC']],
      });
      return row;
    }));

    return res.json(results.filter(Boolean));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/server-metrics/:serverName/history
const history = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const rows = await ServerMetric.findAll({
      where: {
        server_name: req.params.serverName,
        recorded_at: { [Op.gte]: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000) },
      },
      order: [['recorded_at', 'ASC']],
    });
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { push, latest, history };
