const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'is_active'],
    });
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User not found or inactive.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions.' });
  }
  next();
};

// Used by error ingestion endpoint — validates API key against applications table
const verifyApiKey = async (req, res, next) => {
  const { Application } = require('../models/index');
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ message: 'API key required.' });
  }
  const app = await Application.findOne({ where: { api_key: apiKey, is_active: true } });
  if (!app) {
    return res.status(401).json({ message: 'Invalid API key.' });
  }
  req.application = app;
  next();
};

module.exports = { verifyToken, requireRole, verifyApiKey };
