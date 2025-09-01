const User = require('../models/User');

const createUser = async (data) => {
    try {
        const user = await User.create(data);
        return user;
    } catch (error) {
        throw error;
    }
}

const getAllUsers = async () => {
    try {
        const users = await User.findAll();
        const safeUsers = users.map(u => {
            const { passwordResetToken, passwordResetExpires, passwordChangedAt, password_hash, ...rest } = u.toJSON();
            return rest;
        });
        return safeUsers;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createUser,
    getAllUsers
};