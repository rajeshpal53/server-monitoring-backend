const router = require('express').Router();
const c = require('../controllers/errorController');
const { verifyToken, verifyApiKey } = require('../middleware/authMiddleware');
const { ingestLimiter } = require('../middleware/rateLimiter');

// Public ingestion — authenticated via API key, rate-limited per key
router.post('/', ingestLimiter, verifyApiKey, c.ingest);

// Dashboard/management — authenticated via JWT
router.get('/',               verifyToken, c.list);
router.get('/:id',            verifyToken, c.getOne);
router.patch('/:id/status',   verifyToken, c.updateStatus);
router.post('/:id/assign',    verifyToken, c.assign);
router.post('/:id/comments',  verifyToken, c.addComment);

module.exports = router;
