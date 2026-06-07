const router = require('express').Router();
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const {
  getBusinessHours,
  updateBusinessHours,
  getDayBlocks,
  createDayBlock,
  deleteDayBlock,
} = require('../controllers/businessController');

router.get('/hours', getBusinessHours);
router.put('/hours', auth, updateBusinessHours);
router.get('/blocks', auth, getDayBlocks);
router.post('/blocks', auth, createDayBlock);
router.delete('/blocks/:id', auth, validateId, deleteDayBlock);

module.exports = router;
