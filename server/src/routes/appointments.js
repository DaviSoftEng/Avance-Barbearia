const router = require('express').Router();
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const { publicLimiter } = require('../middleware/rateLimit');
const {
  createAppointment,
  getAppointments,
  updateStatus,
  updateAppointment,
  cancelAppointment,
  cancelAppointmentPublic,
  deleteAppointment,
  lookupByPhone,
  getStats,
  getClients,
} = require('../controllers/appointmentController');

router.post('/', publicLimiter, createAppointment);
router.get('/lookup', publicLimiter, lookupByPhone);
router.get('/stats', auth, getStats);
router.get('/clients', auth, getClients);
router.get('/', auth, getAppointments);
router.put('/:id', auth, validateId, updateAppointment);
router.patch('/:id/status', auth, validateId, updateStatus);
router.patch('/:id/cancel', auth, validateId, cancelAppointment);
router.patch('/:id/cancel-public', publicLimiter, validateId, cancelAppointmentPublic);
router.delete('/:id', auth, validateId, deleteAppointment);

module.exports = router;
