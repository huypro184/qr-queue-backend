const {createAdmin, createStaff, getAllUsers, deleteUser, updateUser} = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');

const createNewAdmin = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, project_id } = req.body;

    const user = await createAdmin(req.body);
    
    res.status(201).json({
        status: 'success',
        message: 'Admin created successfully',
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
        message: 'Users retrieved successfully',
        data: result.users,
        pagination: result.pagination
    });
});

const deleteUserById = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const result = await deleteUser(userId, req.user);

    res.status(200).json({
        status: 'success',
        message: 'User deleted successfully',
        data: result
    });
});

const updateUserById = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const result = await updateUser(userId, req.body, req.user);

    res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: result.user
    });
});

module.exports = {
    createNewAdmin,
    createNewStaff,
    getUsers,
    deleteUserById,
    updateUserById,
};
