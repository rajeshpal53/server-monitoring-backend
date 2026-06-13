const router = require('express').Router();
const c = require('../controllers/serverMetricController');
const { verifyToken, verifyApiKey } = require('../middleware/authMiddleware');

router.post('/',                       verifyApiKey, c.push);
router.get('/latest',                  verifyToken, c.latest);
router.get('/:serverName/history',     verifyToken, c.history);

module.exports = router;
