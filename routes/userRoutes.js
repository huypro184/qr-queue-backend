const express = require('express');
const { createNewAdmin, createNewStaff, getUsers, deleteUserById, updateUserById, getMeProfile } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');


const router = express.Router();

router.post('/createAdmin', protect, restrictTo('superadmin'), createNewAdmin);
router.post('/createStaff', protect, restrictTo('admin'), createNewStaff);
router.get('/', protect, restrictTo('superadmin', 'admin'), getUsers);
router.delete('/:userId', protect, restrictTo('superadmin', 'admin'), deleteUserById);
router.patch('/:userId', protect, restrictTo('superadmin', 'admin'), updateUserById);
router.get('/me', protect, restrictTo('superadmin', 'admin'), getMeProfile);

module.exports = router;
