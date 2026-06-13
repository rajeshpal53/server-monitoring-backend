const router = require('express').Router();
const c = require('../controllers/healthController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/latest',             verifyToken, c.latest);
router.get('/:appId/history',     verifyToken, c.history);
router.get('/:appId/stats',       verifyToken, c.stats);

module.exports = router;
