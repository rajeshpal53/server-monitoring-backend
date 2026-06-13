/**
 * Wertone Server Metrics Agent
 *
 * Collects CPU, RAM, Disk, and Network usage every 60 seconds
 * and pushes to the Monitoring Service.
 *
 * Setup on each server:
 *   1. Copy this file + package.json to a folder (e.g. /opt/wertone-agent/)
 *   2. npm install
 *   3. Set env vars below (or use a .env file with dotenv)
 *   4. Run with PM2:  pm2 start server-agent.js --name wertone-server-agent
 */

const os   = require('os');
const fs   = require('fs');
const { exec }  = require('child_process');
const axios     = require('axios');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const MONITORING_URL = process.env.MONITORING_URL || 'http://localhost:3005';
const API_KEY        = process.env.API_KEY;          // Required: any app's API key on this server
const SERVER_NAME    = process.env.SERVER_NAME || os.hostname();
const INTERVAL_MS    = parseInt(process.env.INTERVAL_MS || '60000');
// ─────────────────────────────────────────────────────────────────────────────

if (!API_KEY) {
  console.error('[server-agent] API_KEY env var is required.');
  process.exit(1);
}

// CPU: compare two samples 1 second apart to get actual usage %
function getCpuUsage() {
  return new Promise((resolve) => {
    const s1 = os.cpus();
    setTimeout(() => {
      const s2 = os.cpus();
      let totalIdle = 0, totalTick = 0;
      s1.forEach((cpu, i) => {
        const prev = cpu.times;
        const curr = s2[i].times;
        const idle = curr.idle - prev.idle;
        const total = Object.values(curr).reduce((a, b) => a + b, 0)
                    - Object.values(prev).reduce((a, b) => a + b, 0);
        totalIdle += idle;
        totalTick += total;
      });
      resolve(parseFloat(((1 - totalIdle / totalTick) * 100).toFixed(2)));
    }, 1000);
  });
}

// Disk: parse `df -k /` output (works on Linux and macOS)
function getDiskUsage() {
  return new Promise((resolve) => {
    exec('df -k / | tail -1', (err, stdout) => {
      if (err) { return resolve({ disk_used: null, disk_total: null }); }
      const parts = stdout.trim().split(/\s+/);
      resolve({
        disk_total: parseInt(parts[1]) * 1024,  // KB → bytes
        disk_used:  parseInt(parts[2]) * 1024,
      });
    });
  });
}

// Network: bytes since last sample (Linux: /proc/net/dev, macOS: netstat)
let _lastNet = null;

function getNetworkBytes() {
  // Linux path
  try {
    const data = fs.readFileSync('/proc/net/dev', 'utf-8');
    let rxBytes = 0, txBytes = 0;
    data.split('\n').slice(2).forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts[0] && !parts[0].startsWith('lo:')) {
        rxBytes += parseInt(parts[1])  || 0;
        txBytes += parseInt(parts[9])  || 0;
      }
    });
    const now = Date.now();
    if (_lastNet) {
      const elapsed = (now - _lastNet.time) / 1000 || 1;
      const result = {
        network_in:  Math.round((rxBytes - _lastNet.rx) / elapsed),
        network_out: Math.round((txBytes - _lastNet.tx) / elapsed),
      };
      _lastNet = { time: now, rx: rxBytes, tx: txBytes };
      return result;
    }
    _lastNet = { time: now, rx: rxBytes, tx: txBytes };
    return { network_in: null, network_out: null };
  } catch {
    return { network_in: null, network_out: null };
  }
}

async function collect() {
  const [cpu_usage, disk] = await Promise.all([getCpuUsage(), getDiskUsage()]);
  const net = getNetworkBytes();

  const payload = {
    server_name: SERVER_NAME,
    cpu_usage,
    ram_used:    os.totalmem() - os.freemem(),
    ram_total:   os.totalmem(),
    disk_used:   disk.disk_used,
    disk_total:  disk.disk_total,
    network_in:  net.network_in,
    network_out: net.network_out,
  };

  try {
    await axios.post(`${MONITORING_URL}/api/server-metrics/`, payload, {
      headers: { 'x-api-key': API_KEY },
      timeout: 8000,
    });
    console.log(`[${new Date().toISOString()}] Metrics pushed — CPU: ${cpu_usage}% RAM: ${((payload.ram_used / payload.ram_total) * 100).toFixed(1)}%`);
  } catch (err) {
    console.error(`[server-agent] Push failed: ${err.message}`);
  }
}

console.log(`[server-agent] Starting. Server: ${SERVER_NAME} → ${MONITORING_URL}`);
collect();
setInterval(collect, INTERVAL_MS);
