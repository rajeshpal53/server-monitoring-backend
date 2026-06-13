const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppHealth = sequelize.define('AppHealth', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  health_url: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  status_code: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  response_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_up: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  checked_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'app_health',
  timestamps: false,
  indexes: [
    { fields: ['application_id', 'checked_at'] },
  ],
});

module.exports = AppHealth;
