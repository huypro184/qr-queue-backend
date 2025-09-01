const { createProject } = require('../services/projectService');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const createNewProject = asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;

    if (!name) {
        return next(new AppError('Please provide project name', 400));
    }

    const project = await createProject(req.body, req.user);
    
    res.status(201).json({
        status: 'success',
        message: 'Project created successfully',
        data: project
    });
});

module.exports = {
    createNewProject
};