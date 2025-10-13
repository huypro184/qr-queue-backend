const {createAdmin, createStaff, getAllUsers, deleteUser, updateUser, getMe} = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');

const createNewAdmin = asyncHandler(async (req, res, next) => {

    const user = await createAdmin(req.body);
    
    res.status(201).json({
        status: 'success',
        message: 'Admin created successfully',
        data: user
    });
});

const createNewStaff = asyncHandler(async (req, res, next) => {

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

const getMeProfile = asyncHandler(async (req, res, next) => {
    const user = await getMe(req.user);
    res.status(200).json({
        status: 'success',
        message: 'User profile retrieved successfully',
        data: user
    });
});

module.exports = {
    createNewAdmin,
    createNewStaff,
    getUsers,
    getMeProfile,
    deleteUserById,
    updateUserById,
};
