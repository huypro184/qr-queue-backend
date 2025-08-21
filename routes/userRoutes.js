const express = require('express');
const { createNewUser, getUsers } = require('../controllers/userController');


const router = express.Router();

router.post('/', createNewUser);
router.get('/', getUsers);

module.exports = router;
