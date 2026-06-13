const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ErrorLog = sequelize.define('ErrorLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  environment: {
    type: DataTypes.ENUM('development', 'staging', 'production'),
    allowNull: false,
    defaultValue: 'production',
  },
  endpoint: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  severity: {
    type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL'),
    allowNull: false,
    defaultValue: 'ERROR',
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
    allowNull: false,
    defaultValue: 'OPEN',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  stack_trace: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  request_body: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'End-user ID from the originating app, not a FK',
  },
  server_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  occurrence_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Incremented when same error repeats instead of inserting a new row',
  },
  first_seen_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'error_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['application_id', 'created_at', 'status', 'severity'] },
    { fields: ['severity'] },
    { fields: ['status'] },
  ],
});

module.exports = ErrorLog;
