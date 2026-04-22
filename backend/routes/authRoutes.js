const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { buyerLoginRateLimiter } = require('../middleware/rateLimitMiddleware');
const {
  register,
  login,
  logout,
  getMe,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', buyerLoginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
