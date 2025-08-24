const express = require('express');
const { createNewUser, getUsers } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');


const router = express.Router();

router.post('/', protect, createNewUser);
router.get('/', protect, restrictTo('admin'), getUsers);

module.exports = router;
