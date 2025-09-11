const express = require('express');
const { createNewLine, getAllLines, updateLineById } = require('../controllers/lineController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('admin'), createNewLine);
router.get('/', protect, restrictTo('admin'), getAllLines);
router.patch('/:id', protect, restrictTo('admin'), updateLineById);

module.exports = router;