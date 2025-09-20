const { 
  registerUser, 
  loginUser, 
  forgotPasswordUser,
  resetPasswordUser
} = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');

const getCookieOptions = () => {
    const expiresIn = parseInt(process.env.JWT_COOKIE_EXPIRES_IN);
    
    return {
        httpOnly: true,
        expires: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };
};

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

    res.cookie('jwt', result.token, getCookieOptions());

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
        data: {
            message: result.message,
            ...(process.env.NODE_ENV === 'development' && {
                resetToken: result.resetToken,
                resetURL: result.resetURL
            })
        }
    });
});


const resetPassword = asyncHandler(async (req, res) => {
   const { token } = req.params;
   const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({
            status: 'fail',
            message: 'Please provide new password'
        });
    }

   const result = await resetPasswordUser(token, newPassword);

   res.cookie('jwt', result.token, getCookieOptions());

   res.status(200).json({
       status: 'success',
       message: 'Password reset successful',
       data: result
   });
});

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};
