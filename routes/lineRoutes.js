const express = require('express');
const { createNewLine } = require('../controllers/lineController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('admin'), createNewLine);

module.exports = router;