const express = require('express');
const { createNewService, getAllServices, updateServiceById, deleteServiceById } = require('../controllers/serviceController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('admin', 'staff'), createNewService);
router.get('/', protect, restrictTo('admin', 'staff'), getAllServices);
router.patch('/:serviceId', protect, restrictTo('admin', 'staff'), updateServiceById);
router.delete('/:serviceId', protect, restrictTo('admin', 'staff'), deleteServiceById);
module.exports = router;
