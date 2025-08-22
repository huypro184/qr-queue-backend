// const {createUser, getAllUsers} = require('../services/userService');
// const { asyncHandler } = require('../utils/asyncHandler');
// const AppError = require('../utils/AppError');

// const createNewUser = asyncHandler(async (req, res, next) => {
//     const { name, email, password } = req.body;

//     if (!name || !email || !password) {
//         return next(new AppError('Please provide name, email, and password', 400));
//     }

//     const user = await createUser(req.body);
//     res.status(201).json({
//         message: 'User created successfully',
//         data: user
//     });
// });

// const getUsers = asyncHandler(async (req, res, next) => {
//     const users = await getAllUsers();

//     if (!users || users.length === 0) {
//         return next(new AppError('No users found', 404));
//     }

//     res.status(200).json({
//         message: 'Users retrieved successfully',
//         data: users
//     });
// });

// module.exports = {
//     createNewUser,
//     getUsers
// };