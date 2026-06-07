const router = require('express').Router();
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const {
  getAvailableSlots,
  getRecurringBlocks,
  createRecurringBlock,
  deleteRecurringBlock,
} = require('../controllers/slotController');

router.get('/available', getAvailableSlots);
router.get('/recurring', auth, getRecurringBlocks);
router.post('/recurring', auth, createRecurringBlock);
router.delete('/recurring/:id', auth, validateId, deleteRecurringBlock);

module.exports = router;
