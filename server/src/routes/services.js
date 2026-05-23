const router = require('express').Router();
const auth = require('../middleware/auth');
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
router.put('/:id', auth, updateService);
router.delete('/:id', auth, deleteService);

module.exports = router;
