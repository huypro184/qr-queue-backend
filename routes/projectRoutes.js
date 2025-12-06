const express = require('express');
const { createNewProject, getProjects, updateProjectById, deleteProjectById, getService, assignProjectToUserController, getProjectsWithoutAdminController } = require('../controllers/projectController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.get('/:slug', getService);

router.post('/', protect, restrictTo('superadmin'), createNewProject);
router.get('/', protect, restrictTo('superadmin'), getProjects);

router.post('/assign-project', protect, restrictTo('superadmin'), assignProjectToUserController);
router.get('/unassigned/projects', protect, restrictTo('superadmin'), getProjectsWithoutAdminController);

router.patch('/:id', protect, restrictTo('superadmin', 'admin'), updateProjectById);
router.delete('/:id', protect, restrictTo('superadmin', 'admin'), deleteProjectById);


module.exports = router;
