const express = require('express');
const { createNewProject, getProjects, updateProjectById, deleteProjectById, getService } = require('../controllers/projectController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('superadmin'), createNewProject);
router.get('/', protect, restrictTo('superadmin'), getProjects);
router.get('/:slug', protect, restrictTo('admin'), getService);
router.patch('/:id', protect, restrictTo('superadmin', 'admin'), updateProjectById);
router.delete('/:id', protect, restrictTo('superadmin', 'admin'), deleteProjectById);

module.exports = router;
