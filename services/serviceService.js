const { Service, Project, Line, User } = require('../models');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');
const redisClient = require('../config/redisClient');

const invalidateServiceCache = async (projectId) => {
    const keys = await redisClient.keys(`services:${projectId}:*`);
    if (keys.length > 0) {
        await redisClient.del(keys);
    }
};

const getUserProject = async (currentUser) => {
    let project;

    if (currentUser.role === 'admin') {
        // Admin: tìm project mà admin quản lý
        project = await Project.findOne({
            where: { admin_id: currentUser.id }
        });
    } else if (currentUser.role === 'staff') {
        // Staff: tìm project mà staff thuộc về
        project = await Project.findOne({
            where: { id: currentUser.project_id }
        });
    } else {
        throw new AppError('Invalid user role', 403);
    }

    if (!project) {
        throw new AppError('You have not been assigned to any project. Please contact admin.', 403);
    }

    return project;
};

const createService = async (data, currentUser) => {
    try {
        const project = await getUserProject(currentUser);
        // if (!project) {
        //     throw new AppError('Admin has not been assigned to any project. Please contact super admin.', 403);
        // }

        const { name, description } = data;

        if (!name || name.trim() === '') {
            throw new AppError('Service name is required', 400);
        }

        const projectId = project.id;

        const existed = await Service.findOne({
            where: { name, project_id: projectId }
        });
        
        if (existed) {
            throw new AppError('Service name already exists in this project', 409);
        }



        const newService = await Service.create({
            name,
            description,
            project_id: projectId
        });

        await invalidateServiceCache(projectId);

        return newService.toJSON();
    } catch (error) {
        throw error;
    }
};

const getServices = async (currentUser, filters = {}) => {
    try {
        const { search, page = 1, limit = 10 } = filters;

        const project = await getUserProject(currentUser);
        const projectId = project.id;

        const cacheKey = `services:${projectId}:page:${page}:limit:${limit}:search:${search || ''}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        let whereClause = {
            project_id: projectId
        };

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows: services } = await Service.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: ['id', 'name', 'description', 'created_at'],
        });

        // const message = count === 0 ? 'No services found' : `${count} service${count > 1 ? 's' : ''} retrieved successfully`;
        let message;
        if (count === 0) {
        message = 'No services found';
        } else {
        const plural = count > 1 ? 's' : '';
        message = `${count} service${plural} retrieved successfully`;
        }

        const result = {
            services,
            message,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
                hasNext: page < Math.ceil(count / limit),
                hasPrev: page > 1
            }
        };

        await redisClient.set(cacheKey, JSON.stringify(result), {
            EX: 60 * 5  //5 phút
        });

        return result;
    } catch (error) {
        throw error;
    }
};

const updateService = async (serviceId, data, currentUser) => {
    try {
        const { name, description, average_service_time } = data;
        const project = await getUserProject(currentUser);
        const projectId = project.id;

        const service = await Service.findOne({
            where: { id: serviceId, project_id: projectId }
        });
        if (!service) {
            throw new AppError('Service not found', 404);
        }

        if (name && name !== service.name) {
            const existed = await Service.findOne({
                where: { name, project_id: projectId, id: { [Op.ne]: serviceId } }
            });
            if (existed) {
                throw new AppError('Service name already exists in this project', 409);
            }
        }

        if (name !== undefined) service.name = name;
        if (description !== undefined) service.description = description;
        if (average_service_time !== undefined) service.average_service_time = average_service_time;

        await invalidateServiceCache(projectId);

        await service.save();

        return service;
    } catch (error) {
        throw error;
    }
};

const deleteService = async (serviceId, currentUser) => {
    try {
        const project = await getUserProject(currentUser);
        const projectId = project.id;

        const service = await Service.findOne({
            where: { id: serviceId, project_id: projectId }
        });
        if (!service) {
            throw new AppError('Service not found', 404);
        }

        await service.destroy();

        await invalidateServiceCache(projectId);

        return { id: serviceId, name: service.name };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createService,
    getServices,
    updateService,
    deleteService
};