const { Op, fn, col } = require('sequelize');
const { ErrorLog, Application } = require('../models/index');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

const buildReportData = async (from, to) => {
  const where = {};
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(from);
    if (to)   where.created_at[Op.lte] = new Date(to);
  }

  const [total, critical, resolved, byApp] = await Promise.all([
    ErrorLog.count({ where }),
    ErrorLog.count({ where: { ...where, severity: 'CRITICAL' } }),
    ErrorLog.count({ where: { ...where, status: 'RESOLVED' } }),
    ErrorLog.findAll({
      attributes: ['application_id', [fn('COUNT', col('ErrorLog.id')), 'count']],
      where,
      include: [{ model: Application, as: 'application', attributes: ['app_name'] }],
      group: ['application_id', 'application.id'],
      order: [[fn('COUNT', col('ErrorLog.id')), 'DESC']],
      limit: 10,
      raw: true,
      nest: true,
    }),
  ]);

  return { total, critical, resolved, byApp };
};

const dailySummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await buildReportData(from, to);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const exportCsv = async (req, res) => {
  try {
    const { from, to, application_id, severity, status } = req.query;
    const where = {};
    if (application_id) where.application_id = application_id;
    if (severity)       where.severity = severity;
    if (status)         where.status = status;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to)   where.created_at[Op.lte] = new Date(to);
    }

    const rows = await ErrorLog.findAll({
      where,
      include: [{ model: Application, as: 'application', attributes: ['app_name'] }],
      order: [['created_at', 'DESC']],
      limit: 50000,
    });

    const data = rows.map(r => ({
      id: r.id,
      app_name: r.application?.app_name,
      environment: r.environment,
      endpoint: r.endpoint,
      method: r.method,
      severity: r.severity,
      status: r.status,
      error_message: r.error_message,
      occurrence_count: r.occurrence_count,
      first_seen_at: r.first_seen_at,
      last_seen_at: r.last_seen_at,
      created_at: r.created_at,
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="errors.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const exportExcel = async (req, res) => {
  try {
    const { from, to, application_id, severity, status } = req.query;
    const where = {};
    if (application_id) where.application_id = application_id;
    if (severity)       where.severity = severity;
    if (status)         where.status = status;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to)   where.created_at[Op.lte] = new Date(to);
    }

    const rows = await ErrorLog.findAll({
      where,
      include: [{ model: Application, as: 'application', attributes: ['app_name'] }],
      order: [['created_at', 'DESC']],
      limit: 50000,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Errors');

    sheet.columns = [
      { header: 'ID',              key: 'id',               width: 12 },
      { header: 'Application',     key: 'app_name',         width: 20 },
      { header: 'Environment',     key: 'environment',      width: 14 },
      { header: 'Endpoint',        key: 'endpoint',         width: 30 },
      { header: 'Method',          key: 'method',           width: 8 },
      { header: 'Severity',        key: 'severity',         width: 12 },
      { header: 'Status',          key: 'status',           width: 14 },
      { header: 'Error Message',   key: 'error_message',    width: 50 },
      { header: 'Occurrences',     key: 'occurrence_count', width: 12 },
      { header: 'First Seen',      key: 'first_seen_at',    width: 22 },
      { header: 'Last Seen',       key: 'last_seen_at',     width: 22 },
    ];

    rows.forEach(r => {
      sheet.addRow({
        id: r.id,
        app_name: r.application?.app_name,
        environment: r.environment,
        endpoint: r.endpoint,
        method: r.method,
        severity: r.severity,
        status: r.status,
        error_message: r.error_message,
        occurrence_count: r.occurrence_count,
        first_seen_at: r.first_seen_at,
        last_seen_at: r.last_seen_at,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="errors.xlsx"');
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { dailySummary, exportCsv, exportExcel };
