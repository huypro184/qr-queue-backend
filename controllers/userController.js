const {createAdmin, createStaff,getAllUsers} = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const createNewAdmin = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, project_id } = req.body;

    if (!name || !email || !password) {
        return next(new AppError('Please provide name, email, password', 400));
    }

    const user = await createAdmin(req.body);
    
    res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: user
    });
});

const createNewStaff = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, service_ids } = req.body;

    if (!name || !email || !password) {
        return next(new AppError('Please provide name, email and password', 400));
    }

    const staff = await createStaff(req.body, req.user);
    
    res.status(201).json({
        status: 'success',
        message: 'Staff created successfully',
        data: staff
    });
});

const getUsers = asyncHandler(async (req, res, next) => {
    const users = await getAllUsers();

    if (!users || users.length === 0) {
        return next(new AppError('No users found', 404));
    }

    res.status(200).json({
        message: 'Users retrieved successfully',
        data: users
    });
});

module.exports = {
    createNewAdmin,
    createNewStaff,
    getUsers
};