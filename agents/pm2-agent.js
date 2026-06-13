/**
 * Wertone PM2 Agent
 *
 * Reads live PM2 process list every 60 seconds and pushes
 * a snapshot to the Monitoring Service.
 *
 * Setup on each server:
 *   1. Copy this file + package.json to a folder (e.g. /opt/wertone-agent/)
 *   2. npm install
 *   3. Set env vars below
 *   4. Run with PM2:  pm2 start pm2-agent.js --name wertone-pm2-agent
 *
 * Optional: map PM2 process names to application IDs by setting APP_MAP env:
 *   APP_MAP='{"customer-api":3,"payment-api":5}'
 */

const { exec }  = require('child_process');
const os        = require('os');
const axios     = require('axios');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const MONITORING_URL = process.env.MONITORING_URL || 'http://localhost:3005';
const API_KEY        = process.env.API_KEY;
const SERVER_NAME    = process.env.SERVER_NAME || os.hostname();
const INTERVAL_MS    = parseInt(process.env.INTERVAL_MS || '60000');
// Map PM2 process names → application_id in the Monitoring Service registry
const APP_MAP        = JSON.parse(process.env.APP_MAP || '{}');
// ─────────────────────────────────────────────────────────────────────────────

if (!API_KEY) {
  console.error('[pm2-agent] API_KEY env var is required.');
  process.exit(1);
}

function readPM2List() {
  return new Promise((resolve, reject) => {
    exec('pm2 jlist', (err, stdout, stderr) => {
      if (err) { return reject(new Error(stderr || err.message)); }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Failed to parse pm2 jlist output'));
      }
    });
  });
}

async function collect() {
  let rawList;
  try {
    rawList = await readPM2List();
  } catch (err) {
    console.error(`[pm2-agent] pm2 jlist failed: ${err.message}`);
    return;
  }

  const processes = rawList.map(p => ({
    name:           p.name,
    pm_id:          p.pm_id,
    pid:            p.pid,
    status:         p.pm2_env?.status,
    cpu:            p.monit?.cpu ?? null,
    memory:         p.monit?.memory ?? null,
    // uptime in ms since process start
    uptime:         p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null,
    restart_count:  p.pm2_env?.restart_time ?? 0,
    application_id: APP_MAP[p.name] || null,
  }));

  try {
    await axios.post(
      `${MONITORING_URL}/api/pm2/snapshot`,
      { server_name: SERVER_NAME, processes },
      { headers: { 'x-api-key': API_KEY }, timeout: 8000 }
    );
    console.log(`[${new Date().toISOString()}] PM2 snapshot pushed — ${processes.length} processes`);
  } catch (err) {
    console.error(`[pm2-agent] Push failed: ${err.message}`);
  }
}

console.log(`[pm2-agent] Starting. Server: ${SERVER_NAME} → ${MONITORING_URL}`);
collect();
setInterval(collect, INTERVAL_MS);
