const cron = require('node-cron');
const { runHealthChecks }      = require('../services/healthChecker');
const { notifyServerThreshold } = require('../services/telegramService');

// ── Health checks every minute ───────────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  try {
    await runHealthChecks();
  } catch (err) {
    console.error('[cron:healthCheck]', err.message);
  }
});

// ── Server metric threshold alerts every 5 minutes ───────────────────────────
// In-memory cooldown map — prevents alert spam (1 alert per server per hour)
const _alertSentAt = new Map();
const COOLDOWN_MS  = 60 * 60 * 1000; // 1 hour

const CPU_THRESHOLD  = parseFloat(process.env.ALERT_CPU_PCT  || '85');  // %
const RAM_THRESHOLD  = parseFloat(process.env.ALERT_RAM_PCT  || '90');  // %
const DISK_THRESHOLD = parseFloat(process.env.ALERT_DISK_PCT || '90');  // %

cron.schedule('*/5 * * * *', async () => {
  try {
    const { ServerMetric } = require('../models/index');
    const { fn, col, Op }  = require('sequelize');

    // Get the latest record per server (recorded within last 10 minutes)
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const rows = await ServerMetric.findAll({
      where: { recorded_at: { [Op.gte]: cutoff } },
      order: [['recorded_at', 'DESC']],
    });

    // Deduplicate to one record per server (most recent)
    const latestPerServer = {};
    rows.forEach(r => {
      if (!latestPerServer[r.server_name]) latestPerServer[r.server_name] = r;
    });

    for (const [serverName, m] of Object.entries(latestPerServer)) {
      const alerts = [];

      if (m.cpu_usage != null && m.cpu_usage >= CPU_THRESHOLD) {
        alerts.push(`CPU at *${m.cpu_usage.toFixed(1)}%* (threshold: ${CPU_THRESHOLD}%)`);
      }
      if (m.ram_used && m.ram_total) {
        const ramPct = (m.ram_used / m.ram_total) * 100;
        if (ramPct >= RAM_THRESHOLD) {
          alerts.push(`RAM at *${ramPct.toFixed(1)}%* (threshold: ${RAM_THRESHOLD}%)`);
        }
      }
      if (m.disk_used && m.disk_total) {
        const diskPct = (m.disk_used / m.disk_total) * 100;
        if (diskPct >= DISK_THRESHOLD) {
          alerts.push(`Disk at *${diskPct.toFixed(1)}%* (threshold: ${DISK_THRESHOLD}%)`);
        }
      }

      if (alerts.length === 0) continue;

      // Check cooldown — don't re-alert within COOLDOWN_MS
      const lastSent = _alertSentAt.get(serverName) || 0;
      if (Date.now() - lastSent < COOLDOWN_MS) continue;

      _alertSentAt.set(serverName, Date.now());
      notifyServerThreshold(serverName, alerts).catch(() => {});
      console.warn(`[cron:threshold] Alert fired for ${serverName}: ${alerts.join(', ')}`);
    }
  } catch (err) {
    console.error('[cron:serverThreshold]', err.message);
  }
});

// ── Daily purges ─────────────────────────────────────────────────────────────

cron.schedule('0 0 * * *', async () => {
  try {
    const { AppHealth } = require('../models/index');
    const { Op } = require('sequelize');
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleted = await AppHealth.destroy({ where: { checked_at: { [Op.lt]: cutoff } } });
    console.log(`[cron:purge] Removed ${deleted} old health records.`);
  } catch (err) {
    console.error('[cron:purge:health]', err.message);
  }
});

cron.schedule('0 1 * * *', async () => {
  try {
    const { PM2Status } = require('../models/index');
    const { Op } = require('sequelize');
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await PM2Status.destroy({ where: { recorded_at: { [Op.lt]: cutoff } } });
    console.log(`[cron:purge] Removed ${deleted} old PM2 records.`);
  } catch (err) {
    console.error('[cron:purge:pm2]', err.message);
  }
});

cron.schedule('30 1 * * *', async () => {
  try {
    const { ServerMetric } = require('../models/index');
    const { Op } = require('sequelize');
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await ServerMetric.destroy({ where: { recorded_at: { [Op.lt]: cutoff } } });
    console.log(`[cron:purge] Removed ${deleted} old server metric records.`);
  } catch (err) {
    console.error('[cron:purge:metrics]', err.message);
  }
});
