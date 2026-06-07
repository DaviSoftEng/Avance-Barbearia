const router = require('express').Router();
const { login } = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/login', loginLimiter, login);

module.exports = router;
