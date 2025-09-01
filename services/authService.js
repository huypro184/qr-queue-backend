const User = require('../models/User');
const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const { Op } = require('sequelize');

const registerUser = async (userData) => {
  const { email, password, name, phone } = userData;

  if (!name || !email || !password || !phone) {
    throw new AppError('Please provide all required fields', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('User already exists with this email', 409);
  }

  const existingPhone = await User.findOne({ where: { phone } });
  if (existingPhone) {
    throw new AppError('Phone number already exists', 409);
  }

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = await User.create({
    name,
    email,
    password_hash: hashedPassword,
    phone
  });

  const { password_hash, ...userResponse } = newUser.toJSON();
  return { user: userResponse };
};

const loginUser = async (loginData) => {
  const { email, password } = loginData;

  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  const user = await User.scope('withPassword').findOne({ where: { email } });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordCorrect) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign({ id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

  const { password_hash, ...userResponse } = user.toJSON();
  return { user: userResponse, token };
};

const forgotPasswordUser = async (email, baseResetURL) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new AppError('There is no user with this email address', 404);
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${baseResetURL}/${resetToken}`;

  const message = `Hello ${user.name},

You requested a password reset for your QR Queue account.

To reset your password, please click the following link:
${resetURL}

This link will expire in 10 minutes.

If you didn't request this password reset, please ignore this email.

Best regards,
QR Queue Team`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request - QR Queue',
      message: message
    });

    return {
      message: 'Token sent to email!',
      resetToken, // For development
      resetURL
    };
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    throw new AppError('There was an error sending the email. Try again later!', 500);
  }
};

const resetPasswordUser = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
  where: {
    passwordResetToken: hashedToken,
    passwordResetExpires: { [Op.gt]: new Date() }
  }
});

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  user.password_hash = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date();
  
  await user.save();

  const newToken = jwt.sign(
    { id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const { password_hash, ...userResponse } = user.toJSON();
  return { 
    token: newToken,
  };
};

module.exports = {
  registerUser,
  loginUser,
  forgotPasswordUser,
  resetPasswordUser
};
