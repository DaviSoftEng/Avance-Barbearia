const router = require('express').Router();
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { uploadSingleImage } = require('../middleware/upload');
const {
  getServices,
  getAllServices,
  createService,
  updateService,
  deleteService,
  uploadImage,
} = require('../controllers/serviceController');

router.get('/', getServices);
router.get('/all', auth, getAllServices);
router.post('/upload', auth, uploadSingleImage, uploadImage);
router.post('/', auth, createService);
router.put('/:id', auth, validateId, updateService);
router.delete('/:id', auth, validateId, deleteService);

module.exports = router;
