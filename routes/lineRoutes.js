const express = require('express');
const { createNewLine, getAllLines, updateLineById, deleteLineById } = require('../controllers/lineController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('admin', 'staff'), createNewLine);
router.get('/:serviceId', protect, restrictTo('admin', 'staff'), getAllLines);
router.patch('/:id', protect, restrictTo('admin', 'staff'), updateLineById);
router.delete('/:id', protect, restrictTo('admin', 'staff'), deleteLineById);

module.exports = router;