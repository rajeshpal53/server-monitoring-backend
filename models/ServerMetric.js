const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ServerMetric = sequelize.define('ServerMetric', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  server_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  cpu_usage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Percentage 0-100',
  },
  ram_used: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Bytes',
  },
  ram_total: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Bytes',
  },
  disk_used: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Bytes',
  },
  disk_total: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Bytes',
  },
  network_in: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Bytes received since last snapshot',
  },
  network_out: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Bytes sent since last snapshot',
  },
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'server_metrics',
  timestamps: false,
  indexes: [
    { fields: ['server_name', 'recorded_at'] },
  ],
});

module.exports = ServerMetric;
