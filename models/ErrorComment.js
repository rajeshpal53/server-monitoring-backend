const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ErrorComment = sequelize.define('ErrorComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  error_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'error_comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = ErrorComment;
