const { createProject, getAllProjects, updateProject, deleteProject, getServicefromSlug, assignProjectToUser, getProjectsWithoutAdmin } = require('../services/projectService');
const { asyncHandler } = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const createNewProject = asyncHandler(async (req, res, next) => {
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

const getService = asyncHandler(async (req, res, next) => {
    const { slug } = req.params;
    const service = await getServicefromSlug(slug);

    res.status(200).json({
        status: 'success',
        message: 'Service retrieved successfully',
        data: service
    });
});

const assignProjectToUserController = asyncHandler(async (req, res, next) => {
    const { userId, projectName } = req.body;

    const result = await assignProjectToUser(userId, projectName);

    res.status(200).json({
        status: 'success',
        message: 'Project assigned to admin successfully',
        data: result
    });
});

const getProjectsWithoutAdminController = asyncHandler(async (req, res, next) => {
    const { search } = req.query;

    const result = await getProjectsWithoutAdmin({ search });

    res.status(200).json({
        status: 'success',
        message: 'Unassigned projects retrieved successfully',
        data: result
    });
});

module.exports = {
    createNewProject,
    getProjects,
    updateProjectById,
    getProjectsWithoutAdminController,
    deleteProjectById,
    getService,
    assignProjectToUserController
};