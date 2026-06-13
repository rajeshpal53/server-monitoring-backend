const router = require('express').Router();
const c = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/summary',       verifyToken, c.dailySummary);
router.get('/export/csv',    verifyToken, requireRole('super_admin', 'admin'), c.exportCsv);
router.get('/export/excel',  verifyToken, requireRole('super_admin', 'admin'), c.exportExcel);

module.exports = router;
