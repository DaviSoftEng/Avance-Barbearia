const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  cancelAppointment,
  deleteAppointment,
} = require('../controllers/appointmentController');

router.post('/', createAppointment);
router.get('/', auth, getAppointments);
router.patch('/:id/cancel', auth, cancelAppointment);
router.delete('/:id', auth, deleteAppointment);

module.exports = router;
