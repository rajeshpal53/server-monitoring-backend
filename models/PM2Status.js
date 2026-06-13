const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PM2Status = sequelize.define('PM2Status', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  application_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Nullable — a process may not map to a registered app',
  },
  server_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  process_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  pm2_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  pid: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('online', 'stopped', 'errored', 'restarting', 'launching'),
    allowNull: false,
  },
  cpu_usage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Percentage 0-100',
  },
  memory_usage: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Bytes',
  },
  uptime: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Milliseconds',
  },
  restart_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'pm2_status',
  timestamps: false,
  indexes: [
    { fields: ['server_name', 'recorded_at'] },
    { fields: ['process_name'] },
  ],
});

module.exports = PM2Status;
