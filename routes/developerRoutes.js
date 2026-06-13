const router = require('express').Router();
const c = require('../controllers/developerController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/',           verifyToken, c.list);
router.get('/:id',        verifyToken, c.getOne);
router.put('/:id',        verifyToken, requireRole('super_admin', 'admin'), c.update);
router.delete('/:id',     verifyToken, requireRole('super_admin', 'admin'), c.deactivate);

module.exports = router;
