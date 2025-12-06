const {createAdmin, createStaff, getAllUsers, deleteUser, updateUser, getMe, getAllStaff, updateStaff, deleteStaff} = require('../services/userService');
const { asyncHandler } = require('../utils/asyncHandler');

const createNewAdmin = asyncHandler(async (req, res, next) => {

    const user = await createAdmin(req.body, req.user);
    
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
        data: {
            deleteUser: result.deletedUser
        }
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

const getAllStaffController = asyncHandler(async (req, res, next) => {
    const { search, page, limit } = req.query;

    const result = await getAllStaff(req.user, { search, page, limit });

    res.status(200).json({
        status: 'success',
        message: 'Staff retrieved successfully',
        data: result
    });
});

const updateStaffController = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const result = await updateStaff(id, { name, email, phone }, req.user);

    res.status(200).json({
        status: 'success',
        message: 'Staff updated successfully',
        data: result
    });
});

const deleteStaffController = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const result = await deleteStaff(id, req.user);

    res.status(200).json({
        status: 'success',
        message: 'Staff deleted successfully',
        data: result
    });
});

module.exports = {
    createNewAdmin,
    createNewStaff,
    getUsers,
    getAllStaffController,
    updateStaffController,
    getMeProfile,
    deleteUserById,
    updateUserById,
    deleteStaffController
};
