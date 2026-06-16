const cache = require('../services/cacheService');

const LOG_TTL_MS = 3 * 60 * 1000; // expire if the agent stops pushing for 3 minutes
const key = (applicationId) => `logs:${applicationId}`;

// POST /api/logs/push — called by pm2-agent every few seconds per process
const push = async (req, res) => {
  try {
    const { server_name, logs } = req.body;
    if (!server_name || !Array.isArray(logs)) {
      return res.status(400).json({ message: 'server_name and logs[] are required.' });
    }

    let stored = 0;
    for (const entry of logs) {
      const { application_id, process_name, stdout, stderr } = entry;
      if (!application_id) continue; // can't route logs for a process with no app mapping
      cache.set(key(application_id), {
        server_name,
        process_name,
        stdout: Array.isArray(stdout) ? stdout.slice(-300) : [],
        stderr: Array.isArray(stderr) ? stderr.slice(-300) : [],
        updated_at: new Date(),
      }, LOG_TTL_MS);
      stored++;
    }

    return res.status(201).json({ stored });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/logs/:applicationId — polled by the dashboard while the logs modal is open
const get = async (req, res) => {
  try {
    const entry = cache.get(key(req.params.applicationId));
    if (!entry) {
      return res.json({ available: false, stdout: [], stderr: [], message: 'No live log data yet. Make sure the PM2 agent is running for this app and APP_MAP includes it.' });
    }
    return res.json({ available: true, ...entry });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { push, get };
