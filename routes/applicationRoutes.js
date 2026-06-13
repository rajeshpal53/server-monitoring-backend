const router = require('express').Router();
const c = require('../controllers/applicationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/',                   verifyToken, c.list);
router.get('/:id',                verifyToken, c.getOne);
router.post('/',                  verifyToken, requireRole('super_admin', 'admin'), c.create);
router.put('/:id',                verifyToken, requireRole('super_admin', 'admin'), c.update);
router.patch('/:id/toggle',       verifyToken, requireRole('super_admin', 'admin'), c.toggle);
router.patch('/:id/regenerate-key', verifyToken, requireRole('super_admin', 'admin'), c.regenerateApiKey);

module.exports = router;
