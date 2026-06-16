const router = require('express').Router();
const c = require('../controllers/pm2Controller');
const { verifyToken, verifyApiKey } = require('../middleware/authMiddleware');

// Snapshot pushed by server agent — uses API key of any registered app on that server
router.post('/snapshot',          verifyApiKey, c.snapshot);

// Read endpoints — JWT protected
router.get('/latest',             verifyToken, c.latest);
router.get('/servers',            verifyToken, c.listServers);
router.get('/history/:processName', verifyToken, c.history);

module.exports = router;
