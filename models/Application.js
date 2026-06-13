const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  app_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  environment: {
    type: DataTypes.ENUM('development', 'staging', 'production'),
    allowNull: false,
    defaultValue: 'production',
  },
  server_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  health_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL polled by health check cron',
  },
  api_key: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'Used by SDK middleware to authenticate error submissions',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'applications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Application;
