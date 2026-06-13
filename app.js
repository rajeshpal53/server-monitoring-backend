require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const { apiLimiter, authLimiter, ingestLimiter } = require('./middleware/rateLimiter');

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(compression());          // gzip all responses
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use('/api', apiLimiter);     // global rate limit on all API routes

/* =========================
   DATABASE + MODELS
========================= */
const db = require('./models/index');

/* =========================
   ROUTES
========================= */
app.use('/api/auth',           authLimiter,   require('./routes/authRoutes'));
app.use('/api/errors',                        require('./routes/errorRoutes'));      // ingestLimiter applied per-route inside
app.use('/api/applications',                  require('./routes/applicationRoutes'));
app.use('/api/developers',                    require('./routes/developerRoutes'));
app.use('/api/pm2',                           require('./routes/pm2Routes'));
app.use('/api/health',                        require('./routes/healthRoutes'));
app.use('/api/server-metrics',                require('./routes/serverMetricRoutes'));
app.use('/api/dashboard',                     require('./routes/dashboardRoutes'));
app.use('/api/reports',                       require('./routes/reportRoutes'));
app.use('/api/mobile',                        require('./routes/mobileRoutes'));
app.use('/api/analytics',                     require('./routes/analyticsRoutes'));

/* =========================
   CRON JOBS
========================= */
require('./utility/cronJobs');

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3005;

db.sequelize.authenticate().then(() => {
  console.log('Database connected.');
  app.listen(PORT, () => {
    console.log(`Monitoring Service running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to database:', err.message);
  console.error('Run migrations first: npx sequelize-cli db:migrate');
  process.exit(1);
});
