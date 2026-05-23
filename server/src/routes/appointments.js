const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  updateStatus,
  cancelAppointment,
  deleteAppointment,
  lookupByPhone,
  getStats,
  getClients,
} = require('../controllers/appointmentController');

router.post('/', createAppointment);
router.get('/lookup', lookupByPhone);
router.get('/stats', auth, getStats);
router.get('/clients', auth, getClients);
router.get('/', auth, getAppointments);
router.patch('/:id/status', auth, updateStatus);
router.patch('/:id/cancel', auth, cancelAppointment);
router.delete('/:id', auth, deleteAppointment);

module.exports = router;
