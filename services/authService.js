const User = require('../models/User');
const bcrypt = require('bcrypt');

const registerUser = async (userData) => {
  try {
    const { email, password, name, phone } = userData;

    const existingUser = await User.findOne({ email });
    if(existingUser) {
      throw new Error('User already exists with this email');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone
    });

    const { password: _, ...userResponse } = newUser.toObject();
    return userResponse;

  } catch (error) {
    throw error;
  }
};

module.exports = {
  registerUser
};
