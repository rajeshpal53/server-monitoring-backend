const sequelize = require('../config/database');

const User            = require('./User');
const Application     = require('./Application');
const ErrorLog        = require('./ErrorLog');
const ErrorComment    = require('./ErrorComment');
const ErrorAssignment = require('./ErrorAssignment');
const PM2Status       = require('./PM2Status');
const AppHealth       = require('./AppHealth');
const ServerMetric    = require('./ServerMetric');

/* =========================
   ASSOCIATIONS
========================= */

// Application → ErrorLog
Application.hasMany(ErrorLog, { foreignKey: 'application_id', as: 'errors' });
ErrorLog.belongsTo(Application, { foreignKey: 'application_id', as: 'application' });

// Application → PM2Status
Application.hasMany(PM2Status, { foreignKey: 'application_id', as: 'pm2Snapshots' });
PM2Status.belongsTo(Application, { foreignKey: 'application_id', as: 'application' });

// Application → AppHealth
Application.hasMany(AppHealth, { foreignKey: 'application_id', as: 'healthChecks' });
AppHealth.belongsTo(Application, { foreignKey: 'application_id', as: 'application' });

// ErrorLog → ErrorComment
ErrorLog.hasMany(ErrorComment, { foreignKey: 'error_id', as: 'comments' });
ErrorComment.belongsTo(ErrorLog, { foreignKey: 'error_id', as: 'error' });

// ErrorLog → ErrorAssignment
ErrorLog.hasMany(ErrorAssignment, { foreignKey: 'error_id', as: 'assignments' });
ErrorAssignment.belongsTo(ErrorLog, { foreignKey: 'error_id', as: 'error' });

// User → ErrorComment (who wrote the comment)
User.hasMany(ErrorComment, { foreignKey: 'user_id', as: 'comments' });
ErrorComment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// User → ErrorAssignment (assigned to)
User.hasMany(ErrorAssignment, { foreignKey: 'assigned_to', as: 'assignedErrors' });
ErrorAssignment.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// User → ErrorAssignment (assigned by)
User.hasMany(ErrorAssignment, { foreignKey: 'assigned_by', as: 'assignedByMe' });
ErrorAssignment.belongsTo(User, { foreignKey: 'assigned_by', as: 'assigner' });

/* =========================
   EXPORTS
========================= */
module.exports = {
  sequelize,
  User,
  Application,
  ErrorLog,
  ErrorComment,
  ErrorAssignment,
  PM2Status,
  AppHealth,
  ServerMetric,
};
