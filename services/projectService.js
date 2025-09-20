const { User, Project, Service } = require('../models');
const { get } = require('../routes/userRoutes');
const AppError = require('../utils/AppError');
const { generateProjectQRCode } = require('../utils/qrcode');
const { Op, where } = require('sequelize');
const { v4: uuidv4 } = require("uuid");
const redisClient = require('../config/redisClient');

const createProject = async (data, currentUser) => {
    try {
        const { name, description } = data;

        if (!name) {
            throw new AppError('Please provide project name', 400);
        }

        const existingProject = await Project.findOne({ 
            where: { name: name.trim() } 
        });
        
        if (existingProject) {
            throw new AppError('Project name already exists', 409);
        }

        const newProject = await Project.create({
            name: name.trim(),
            description: description ? description.trim() : null
        });

        const slug = uuidv4();
        const qrCodeDataUrl = await generateProjectQRCode(slug);

        await newProject.update({
            qr_code: qrCodeDataUrl,
            slug: slug
        });

        const result = {
            id: newProject.id,
            name: newProject.name,
            description: newProject.description,
            created_at: newProject.created_at
        };

        const keys = await redisClient.keys("projects:*");
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        return result;
    } catch (error) {
        throw error;
    }
};

const getAllProjects = async (currentUser, filters = {}) => {
    try {

        const cacheKey = `projects:${JSON.stringify(filters)}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        const { search, page = 1, limit = 10 } = filters;
        
        let whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const totalCount = await Project.count({
            where: whereClause
        });

        const offset = (page - 1) * limit;

        const { count, rows: projects } = await Project.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Service,
                    as: 'services',
                    attributes: ['id', 'name', 'description'],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: { exclude: ['qr_code'] }
        });


        const message = count === 0 ? 'Projects not found' : null;

        const result = {
            projects,
            message,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
                hasNext: page < Math.ceil(count / limit),
                hasPrev: page > 1
            }
        };

        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 300 });

        return result;
    } catch (error) {
        throw error;
    }
};

const updateProject = async (projectId, data, currentUser) => {
    try {
        const { name, description } = data;

        const existingProject = await Project.findByPk(projectId);
        if (!existingProject) {
            throw new AppError('Project not found', 404);
        }

        if (currentUser.role === 'admin' && currentUser.project_id !== parseInt(projectId)) {
            throw new AppError('You do not have permission to update this project', 403);
        }

        if (name && name.trim() !== existingProject.name) {
            const duplicateProject = await Project.findOne({
                where: { 
                    name: name.trim(),
                    id: { [Op.ne]: projectId }
                }
            });
            
            if (duplicateProject) {
                throw new AppError('Project name already exists', 409);
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description ? description.trim() : null;

        await Project.update(updateData, {
            where: { id: projectId }
        });

        const updatedProject = await Project.findByPk(projectId, {
            include: [
                {
                    model: User,
                    as: 'users',
                    attributes: ['id', 'name', 'role', 'status'],
                    where: { status: 'active' },
                    required: false
                }
            ]
        });

        const keys = await redisClient.keys("projects:*");
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        await redisClient.del(`slug:${updatedProject.slug}`);

        return {
            id: updatedProject.id,
            name: updatedProject.name,
            description: updatedProject.description,
            created_at: updatedProject.created_at,
            users: updatedProject.users || []
        };
    } catch (error) {
        throw error;
    }
};

const deleteProject = async (projectId, currentUser) => {
    try {
        const existingProject = await Project.findByPk(projectId);
        if (!existingProject) {
            throw new AppError('Project not found', 404);
        }

        if (currentUser.role === 'admin' && currentUser.project_id !== parseInt(projectId)) {
            throw new AppError('You do not have permission to delete this project', 403);
        }

        const usersInProject = await User.count({
            where: { project_id: projectId }
        });

        if (usersInProject > 0) {
            throw new AppError('Cannot delete project that has users. Please remove all users first.', 400);
        }

        const servicesInProject = await Service.count({
            where: { project_id: projectId }
        });

        if (servicesInProject > 0) {
            throw new AppError('Cannot delete project that has services. Please remove all services first.', 400);
        }

        await Project.destroy({
            where: { id: projectId }
        });

        const keys = await redisClient.keys("projects:*");
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        await redisClient.del(`slug:${existingProject.slug}`);

        return {
            message: 'Project deleted successfully',
            deletedProject: {
                id: existingProject.id,
                name: existingProject.name
            }
        };
    } catch (error) {
        throw error;
    }
};

const getServicefromSlug = async (slug) => {
    try {
        const cacheKey = `slug:${slug}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
        const service = await Service.findAll({
            include: [{
                model: Project,
                as: 'project',
                attributes: [],
                where: {
                    slug: {
                        [Op.eq]: slug
                    }
                }
            }],
            attributes: ['id', 'name', 'description']
        });

        await redisClient.set(cacheKey, JSON.stringify(service), { EX: 600 });

        return service;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createProject,
    getAllProjects,
    updateProject,
    deleteProject,
    getServicefromSlug
};