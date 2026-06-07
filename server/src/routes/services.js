const router = require('express').Router();
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const {
  getServices,
  getAllServices,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');

router.get('/', getServices);
router.get('/all', auth, getAllServices);
router.post('/', auth, createService);
router.put('/:id', auth, validateId, updateService);
router.delete('/:id', auth, validateId, deleteService);

module.exports = router;
