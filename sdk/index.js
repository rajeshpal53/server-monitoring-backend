const axios = require('axios');

let _config = null;

const send = async (payload) => {
  if (!_config) return;
  try {
    await axios.post(`${_config.serviceUrl}/api/errors`, payload, {
      headers: { 'x-api-key': _config.apiKey },
      timeout: 5000,
    });
  } catch (_) {
    // Never let monitoring failures crash the monitored app
  }
};

const init = (config) => {
  const { appName, apiKey, serviceUrl, serverName, environment } = config;

  if (!appName || !apiKey || !serviceUrl) {
    throw new Error('[wertone-monitor] appName, apiKey, and serviceUrl are required.');
  }

  _config = { appName, apiKey, serviceUrl, serverName, environment };

  // Catch uncaught synchronous exceptions
  process.on('uncaughtException', (err) => {
    send({
      appName,
      environment: environment || process.env.NODE_ENV,
      serverName,
      severity: 'CRITICAL',
      errorMessage: err.message,
      stackTrace: err.stack,
    });
    console.error('[uncaughtException]', err);
  });

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    send({
      appName,
      environment: environment || process.env.NODE_ENV,
      serverName,
      severity: 'ERROR',
      errorMessage: err.message,
      stackTrace: err.stack,
    });
    console.error('[unhandledRejection]', err);
  });
};

// Express error-handling middleware — add AFTER all routes
const expressErrorHandler = (err, req, res, next) => {
  if (!_config) return next(err);

  send({
    appName: _config.appName,
    environment: _config.environment || process.env.NODE_ENV,
    serverName: _config.serverName,
    endpoint: req.originalUrl,
    method: req.method,
    severity: err.status >= 500 ? 'ERROR' : 'WARNING',
    errorMessage: err.message,
    stackTrace: err.stack,
    requestBody: req.body,
    userId: req.user?.id,
  });

  next(err);
};

// Wrap an axios/fetch call to catch external API failures
const wrapApiCall = async (fn, context = {}) => {
  try {
    return await fn();
  } catch (err) {
    send({
      appName: _config?.appName,
      environment: _config?.environment || process.env.NODE_ENV,
      serverName: _config?.serverName,
      severity: 'ERROR',
      errorMessage: `External API failure: ${err.message}`,
      stackTrace: err.stack,
      ...context,
    });
    throw err;
  }
};

module.exports = { init, expressErrorHandler, wrapApiCall };
