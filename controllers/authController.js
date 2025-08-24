const { 
  registerUser, 
  loginUser, 
  forgotPasswordUser
} = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);

    res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: result

    });
});

const login = asyncHandler(async (req, res) => {
    const result = await loginUser(req.body);

    res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: result
    });
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide email address'
    });
  }

  const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password`;
  
  const result = await forgotPasswordUser(email, resetURL);

    res.status(200).json({
    status: 'success',
    message: 'Password reset instructions sent to your email',
    message: result.message,
  });
});


const resetPassword = asyncHandler(async (req, res) => {
   
});

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};
