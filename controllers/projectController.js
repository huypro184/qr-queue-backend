const { createProject, getAllProjects, updateProject, deleteProject } = require('../services/projectService');
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

const getProjects = asyncHandler(async (req, res, next) => {
    const result = await getAllProjects(req.user, req.query);

    res.status(200).json({
        status: 'success',
        message: 'Projects retrieved successfully',
        data: result.projects,
        pagination: result.pagination
    });
});

const updateProjectById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const result = await updateProject(id, req.body, req.user);
    
    res.status(200).json({
        status: 'success',
        message: 'Project updated successfully',
        data: result
    });
});

const deleteProjectById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const result = await deleteProject(id, req.user);
    
    res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.deletedProject
    });
});

module.exports = {
    createNewProject,
    getProjects,
    updateProjectById,
    deleteProjectById
};