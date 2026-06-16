const { User } = require('../models/index');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const list = async (req, res) => {
  try {
    const { search, role } = req.query;
    const where = { is_active: true };

    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'role', 'created_at'],
      order: [['name', 'ASC']],
    });

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'role', 'is_active', 'created_at'],
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { name, email, password, role, telegram_chat_id } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password_hash,
      role: role || 'developer',
      telegram_chat_id: telegram_chat_id || null,
    });

    return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { name, role, telegram_chat_id } = req.body;
    await user.update({ name, role, telegram_chat_id });

    return res.json({ id: user.id, name: user.name, role: user.role });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deactivate = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await user.update({ is_active: false });
    return res.json({ message: 'User deactivated.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { list, getOne, create, update, deactivate };
