const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

const send = async (message) => {
  if (!BOT_TOKEN || !CHAT_ID) return;
  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id:    CHAT_ID,
    text:       message,
    parse_mode: 'Markdown',
  });
};

const notifyCriticalError = async (application, errorLog) => {
  const msg =
    `🚨 *CRITICAL ERROR*\n\n` +
    `*App:* ${application.app_name}\n` +
    `*Server:* ${errorLog.server_name || application.server_name || 'N/A'}\n` +
    `*Endpoint:* ${errorLog.endpoint || 'N/A'}\n` +
    `*Message:* ${errorLog.error_message?.substring(0, 300)}\n` +
    `*Time:* ${new Date().toISOString()}`;
  await send(msg);
};

const notifyAppDown = async (application, errorMessage) => {
  const msg =
    `⛔ *APP DOWN*\n\n` +
    `*App:* ${application.app_name}\n` +
    `*URL:* ${application.health_url}\n` +
    `*Error:* ${errorMessage || 'No response'}\n` +
    `*Time:* ${new Date().toISOString()}`;
  await send(msg);
};

const notifyPM2Down = async (serverName, processName, status) => {
  const msg =
    `⚠️ *PM2 PROCESS ${status.toUpperCase()}*\n\n` +
    `*Server:* ${serverName}\n` +
    `*Process:* ${processName}\n` +
    `*Time:* ${new Date().toISOString()}`;
  await send(msg);
};

// Called by cron when a server's resource usage breaches a threshold
const notifyServerThreshold = async (serverName, alerts) => {
  const lines = alerts.map(a => `  • ${a}`).join('\n');
  const msg =
    `🔥 *SERVER ALERT*\n\n` +
    `*Server:* ${serverName}\n` +
    `*Issues:*\n${lines}\n` +
    `*Time:* ${new Date().toISOString()}`;
  await send(msg);
};

module.exports = {
  send,
  notifyCriticalError,
  notifyAppDown,
  notifyPM2Down,
  notifyServerThreshold,
};
