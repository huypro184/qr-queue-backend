const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { User } = require('../models');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization?.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('You are not logged in!', 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const freshUser = await User.findByPk(decoded.id);

    if (!freshUser) {
        return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    if(freshUser.passwordChangedAt) {
        const isPasswordChanged = freshUser.passwordChangedAt > decoded.iat * 1000;
        if (isPasswordChanged) {
            return next(new AppError('User recently changed password! Please log in again.', 401));
        }
    }
    req.user = freshUser;
    next();
});

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

module.exports = {
    protect,
    restrictTo
};
