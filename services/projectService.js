const { User, Project, Service } = require('../models');
const { get } = require('../routes/userRoutes');
const AppError = require('../utils/AppError');
const { generateProjectQRCode } = require('../utils/qrcode');
const { Op, where } = require('sequelize');
const { v4: uuidv4 } = require("uuid");
const redisClient = require('../config/redisClient');

const clearProjectCache = async () => {
    const keys = await redisClient.keys("projects:*");
    if (keys.length > 0) {
        await redisClient.del(keys);
    }
};

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

        await clearProjectCache();

        return result;
    } catch (error) {
        throw error;
    }
};

const getAllProjects = async (currentUser, filters = {}) => {
    try {
        const { search, page = 1, limit = 10 } = filters;
        const cacheKey = `projects:page:${page}:limit:${limit}:search:${search || ''}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        
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
                    model: User,
                    as: 'admin',
                    attributes: ['id', 'name', 'email'],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: { exclude: ['qr_code'] }
        });

        const projectsWithAdminName = projects.map(project => {
            const projectData = project.toJSON();
            return {
                ...projectData,
                admin_name: projectData.admin ? projectData.admin.name : null,
                admin_email: projectData.admin ? projectData.admin.email : null,
                admin: undefined  // Xóa object admin gốc nếu muốn
            };
        });

        const message = count === 0 ? 'Projects not found' : null;

        const result = {
            projects: projectsWithAdminName,
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

        await clearProjectCache();

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

        await clearProjectCache();

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
        const project = await Project.findOne({
            where: { slug: { [Op.eq]: slug } },
            attributes: ['id', 'name', 'description']
        });

        if (!project) {
            throw new AppError('Project not found', 404);
        }

        const services = await Service.findAll({
            where: { project_id: project.id },
            attributes: ['id', 'name', 'description']
        });

        return {
            project: {
                id: project.id,
                name: project.name,
                description: project.description
            },
            services
        };
    } catch (error) {
        throw error;
    }
};

const getProjectsWithoutAdmin = async (filters = {}) => {
    try {
        const { search } = filters;
        
        let whereClause = { admin_id: null };

        if (search && search.trim()) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search.trim()}%` } },
                { description: { [Op.iLike]: `%${search.trim()}%` } }
            ];
        }

        const projects = await Project.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'description'],
            order: [['created_at', 'DESC']]
        });

        const message = projects.length === 0 ? 'No unassigned projects found' : null;

        return {
            projects,
            message
        };
    } catch (error) {
        throw error;
    }
};

const assignProjectToUser = async (userId, projectName) => {
    try {
        // Kiểm tra user tồn tại và có role admin
        const user = await User.findOne({
            where: { 
                id: userId,
                role: 'admin'
            }
        });

        if (!user) {
            throw new AppError('Admin user not found', 404);
        }

        const existingProject = await Project.findOne({
            where: { admin_id: userId }
        });

        if (existingProject) {
            throw new AppError(`This admin is already assigned to project "${existingProject.name}". Please unassign first.`, 400);
        }

        // Kiểm tra project tồn tại
        const project = await Project.findOne({
            where: { 
                name: projectName.trim(),
                admin_id: null 
            }
        });

        if (!project) {
            throw new AppError('Project not found or already has an admin', 404);
        }

        // Gán admin cho project
        await project.update({ admin_id: userId });

        // Clear cache
        const keys = await redisClient.keys('projects:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        // Lấy thông tin project đã cập nhật
        const updatedProject = await Project.findByPk(project.id, {
            include: [
                {
                    model: User,
                    as: 'admin',
                    attributes: ['id', 'name', 'email', 'role']
                }
            ]
        });

        return {
            project: {
                id: updatedProject.id,
                name: updatedProject.name,
                description: updatedProject.description,
                admin: updatedProject.admin,
                created_at: updatedProject.created_at
            }
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createProject,
    getAllProjects,
    updateProject,
    deleteProject,
    getServicefromSlug,
    getProjectsWithoutAdmin,
    assignProjectToUser
};