const express = require('express');
const { createNewAdmin, createNewStaff, getUsers, deleteUserById, updateUserById, getMeProfile, getAllStaffController, updateStaffController, deleteStaffController } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');


const router = express.Router();

router.post('/createAdmin', protect, restrictTo('superadmin'), createNewAdmin);
router.post('/createStaff', protect, restrictTo('admin'), createNewStaff);

router.get('/me', protect, restrictTo('superadmin', 'admin', 'staff'), getMeProfile);
router.get('/staff', protect, restrictTo('superadmin', 'admin'), getAllStaffController);

router.get('/', protect, restrictTo('superadmin', 'admin'), getUsers);
router.delete('/:userId', protect, restrictTo('superadmin', 'admin'), deleteUserById);

router.patch('/:userId', protect, restrictTo('superadmin', 'admin'), updateUserById);

router.patch('/staff/:id', protect, restrictTo('admin'), updateStaffController);
router.delete('/staff/:id', protect, restrictTo('admin'), deleteStaffController);

module.exports = router;
