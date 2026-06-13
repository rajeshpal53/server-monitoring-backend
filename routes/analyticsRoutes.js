const router = require('express').Router();
const c = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/summary',         verifyToken, c.summary);
router.get('/error-rate',      verifyToken, c.errorRate);
router.get('/mttr',            verifyToken, c.mttr);
router.get('/reliability',     verifyToken, c.reliability);
router.get('/top-errors',      verifyToken, c.topErrors);
router.get('/developer-stats', verifyToken, c.developerStats);

module.exports = router;
