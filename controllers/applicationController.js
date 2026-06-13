const crypto = require('crypto');
const { Application } = require('../models/index');
const { Op } = require('sequelize');

const list = async (req, res) => {
  try {
    const { search, environment, is_active, page = 1, limit = 20 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { app_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { server_name: { [Op.like]: `%${search}%` } },
      ];
    }
    if (environment) where.environment = environment;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Application.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
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

const getOne = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });
    return res.json(app);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { app_name, description, environment, server_name, health_url } = req.body;
    if (!app_name) return res.status(400).json({ message: 'app_name is required.' });

    const api_key = crypto.randomBytes(32).toString('hex');
    const app = await Application.create({
      app_name, description, environment, server_name, health_url, api_key,
    });

    return res.status(201).json(app);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'app_name already exists.' });
    }
    console.log("its an error:", err);
    return res.status(500).json({ message: err.message });
    
  }
};

const update = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });

    const { app_name, description, environment, server_name, health_url } = req.body;
    await app.update({ app_name, description, environment, server_name, health_url });

    return res.json(app);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const toggle = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });

    await app.update({ is_active: !app.is_active });
    return res.json({ id: app.id, is_active: app.is_active });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const regenerateApiKey = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found.' });

    const api_key = crypto.randomBytes(32).toString('hex');
    await app.update({ api_key });
    return res.json({ id: app.id, api_key });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { list, getOne, create, update, toggle, regenerateApiKey };
