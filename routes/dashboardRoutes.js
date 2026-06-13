const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/summary',          verifyToken, c.summary);
router.get('/errors-by-day',    verifyToken, c.errorsByDay);
router.get('/errors-by-app',    verifyToken, c.errorsByApp);
router.get('/errors-by-severity', verifyToken, c.errorsBySeverity);

module.exports = router;
