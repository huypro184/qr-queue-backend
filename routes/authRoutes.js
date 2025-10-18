// routes/authRoutes.js
const express = require('express');
const { register, login } = require('../controllers/authController');
const router = express.Router();


router.post('/register', register);
router.post('/login', login);
// router.post('/forgot-password', forgotPassword);
// router.patch('/reset-password/:token', resetPassword);

module.exports = router;