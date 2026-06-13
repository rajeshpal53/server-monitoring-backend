const { User } = require('../models/index');
const { Op } = require('sequelize');

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

module.exports = { list, getOne, update, deactivate };
