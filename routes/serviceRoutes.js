const express = require('express');
const { createNewService, getAllServices, updateServiceById, deleteServiceById } = require('../controllers/serviceController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('admin'), createNewService);
router.get('/', protect, restrictTo('admin'), getAllServices);
router.patch('/:serviceId', protect, restrictTo('admin'), updateServiceById);
router.delete('/:serviceId', protect, restrictTo('admin'), deleteServiceById);

module.exports = router;
