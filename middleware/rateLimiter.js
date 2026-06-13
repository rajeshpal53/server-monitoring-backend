const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Error ingestion — higher throughput, keyed by API key when present, else IP
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: (req) => req.headers['x-api-key'] || ipKeyGenerator(req),
  message: { message: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API — per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints — strict to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { ingestLimiter, apiLimiter, authLimiter };
