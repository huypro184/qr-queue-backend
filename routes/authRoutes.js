const express = require('express');
const { 
  register, 
  login, 
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login  
router.post('/login', login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

router.patch('/reset-password/:token', resetPassword);

module.exports = router;
