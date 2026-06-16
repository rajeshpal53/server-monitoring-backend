const router = require('express').Router();
const c = require('../controllers/logController');
const { verifyToken, verifyApiKey } = require('../middleware/authMiddleware');

router.post('/push',          verifyApiKey, c.push);
router.get('/:applicationId', verifyToken,  c.get);

module.exports = router;
