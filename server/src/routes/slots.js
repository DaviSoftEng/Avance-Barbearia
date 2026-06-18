const router = require('express').Router();
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const {
  getAvailableSlots,
  getRecurringBlocks,
  createRecurringBlock,
  updateRecurringBlock,
  deleteRecurringBlock,
  completeRecurring,
  getRecurringExceptions,
  createRecurringException,
  deleteRecurringException,
} = require('../controllers/slotController');

router.get('/available', getAvailableSlots);
router.get('/recurring', auth, getRecurringBlocks);
router.post('/recurring', auth, createRecurringBlock);
router.put('/recurring/:id', auth, validateId, updateRecurringBlock);
router.delete('/recurring/:id', auth, validateId, deleteRecurringBlock);
router.post('/recurring/:id/complete', auth, validateId, completeRecurring);

// Exceções da semana (adiantar/remarcar ou cancelar um fixo numa data específica)
router.get('/exceptions', auth, getRecurringExceptions);
router.post('/recurring/:id/exception', auth, validateId, createRecurringException);
router.delete('/exceptions/:id', auth, validateId, deleteRecurringException);

module.exports = router;
