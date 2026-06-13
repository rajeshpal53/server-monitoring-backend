const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ErrorAssignment = sequelize.define('ErrorAssignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  error_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'error_assignments',
  timestamps: true,
  createdAt: 'assigned_at',
  updatedAt: false,
});

module.exports = ErrorAssignment;
