const express = require('express');
const { createNewAdmin, createNewStaff, getUsers, deleteUser } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');


const router = express.Router();

router.post('/createAdmin', protect, restrictTo('superadmin'), createNewAdmin);
router.post('/createStaff', protect, restrictTo('admin'), createNewStaff);
router.get('/getUsers', protect, restrictTo('superadmin', 'admin'), getUsers);
router.delete('/:userId', protect, restrictTo('superadmin', 'admin'), deleteUser);

module.exports = router;
