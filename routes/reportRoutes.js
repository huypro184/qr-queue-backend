const express = require('express');
const { fetchReportSummary, fetchCustomersByDays, getTopServicesController, getAllProjectsStats, getStatusDistributionController, getTicketCountByHourController } = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', protect, restrictTo('superadmin'), fetchReportSummary);
router.get('/all-projects-stats', protect, restrictTo('superadmin'), getAllProjectsStats);
router.get('/top-services', protect, restrictTo('superadmin','admin', 'staff'), getTopServicesController);


router.get('/customers-by-days', protect, restrictTo('admin', 'staff'), fetchCustomersByDays);


router.get('/status-distribution', protect, restrictTo('superadmin','admin', 'staff'), getStatusDistributionController);
router.get('/peak-hours', protect, restrictTo('superadmin','admin', 'staff'), getTicketCountByHourController);

module.exports = router;