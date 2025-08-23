const { 
  registerUser, 
  loginUser, 
} = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
    const user = await registerUser(req.body);

    res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
            user
        }
    });
});

const login = asyncHandler(async (req, res) => {
    const user = await loginUser(req.body);

    res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
            user
        }
    });
});


module.exports = {
    register,
    login,
};
