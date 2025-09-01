const express = require('express');
const { createNewProject } = require('../controllers/projectController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/create', protect, restrictTo('admin', 'superadmin'), createNewProject);

module.exports = router;
