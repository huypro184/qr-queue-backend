const express = require('express');
const { fetchReportSummary, fetchCustomersByDays, getAllProjectsStats } = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', protect, restrictTo('superadmin'), fetchReportSummary);
router.get('/customers-by-days', protect, restrictTo('admin', 'staff'), fetchCustomersByDays);
router.get('/all-projects-stats', protect, restrictTo('superadmin'), getAllProjectsStats);


module.exports = router;