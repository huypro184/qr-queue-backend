const { registerUser } = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { model } = require('mongoose');

const register = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone} = req.body;

    if (!name || !email || !password || !phone) {
        return next(new AppError('Please provide all required fields', 400));
    }

    if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters long', 400));
    }

    const user = await registerUser({ name, email, password, phone });

    res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
            user
        }
    });
});

module.exports = {
    register
};
