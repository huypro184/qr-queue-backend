const {createAdmin, createStaff, getAllUsers, deleteUser: deleteUserService} = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const createNewAdmin = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, project_id } = req.body;

    const user = await createAdmin(req.body);
    
    res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: user
    });
});

const createNewStaff = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, service_ids } = req.body;

    const staff = await createStaff(req.body, req.user);
    
    res.status(201).json({
        status: 'success',
        message: 'Staff created successfully',
        data: staff
    });
});

const getUsers = asyncHandler(async (req, res, next) => {
    const result = await getAllUsers(req.user, req.query);

    res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.users,
        pagination: result.pagination
    });
});

const deleteUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const result = await deleteUserService(userId, req.user);

    res.status(200).json({
        status: 'success',
        message: 'User deleted successfully',
        data: result
    });
});

module.exports = {
    createNewAdmin,
    createNewStaff,
    getUsers,
    deleteUser
};
