const express = require('express');
const { createNewAdmin, createNewStaff,getUsers } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');


const router = express.Router();

router.post('/createAdmin', protect, restrictTo('superadmin'), createNewAdmin);
router.post('/createStaff', protect, restrictTo('admin'), createNewStaff);


// router.get('/', protect, restrictTo('admin'), getUsers);
router.get('/', protect, getUsers);

module.exports = router;
