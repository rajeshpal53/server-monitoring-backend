const axios = require('axios');
const { Application, AppHealth } = require('../models/index');
const telegramService = require('./telegramService');
const { Op } = require('sequelize');

const runHealthChecks = async () => {
  const apps = await Application.findAll({
    where: { is_active: true, health_url: { [Op.ne]: null } },
  });

  await Promise.allSettled(apps.map(async (app) => {
    const start = Date.now();
    let is_up = false;
    let status_code = null;
    let error_message = null;

    try {
      const response = await axios.get(app.health_url, { timeout: 10000 });
      status_code = response.status;
      is_up = response.status >= 200 && response.status < 400;
    } catch (err) {
      error_message = err.message;
      status_code = err.response?.status || null;
    }

    const response_time_ms = Date.now() - start;

    await AppHealth.create({
      application_id: app.id,
      health_url: app.health_url,
      status_code,
      response_time_ms,
      is_up,
      error_message,
      checked_at: new Date(),
    });

    if (!is_up) {
      telegramService.notifyAppDown(app, error_message).catch(() => {});
    }
  }));
};

module.exports = { runHealthChecks };
