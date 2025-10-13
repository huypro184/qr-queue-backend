const { Service, Project, Line } = require('../models');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');
const redisClient = require('../config/redisClient');

const createService = async (data, currentUser) => {
    try {
        const { name, description } = data;

        if (!name || name.trim() === '') {
            throw new AppError('Service name is required', 400);
        }

        const projectId = currentUser.project_id;

        const existed = await Service.findOne({
            where: { name, project_id: projectId }
        });
        
        if (existed) {
            throw new AppError('Service name already exists in this project', 409);
        }

        const project = await Project.findByPk(projectId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        const average_service_time = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
        const historical_avg_wait = Math.floor(Math.random() * (20 - 1 + 1)) + 1;

        const newService = await Service.create({
            name,
            description,
            project_id: projectId,
            average_service_time,
            historical_avg_wait
        });

        const keys = await redisClient.keys(`services:${projectId}:*`);
        if (keys.length > 0) await redisClient.del(keys);

        const { average_service_time: avgServiceTime, historical_avg_wait: histAvgWait, ...serviceData } = newService.toJSON();
        return serviceData;
    } catch (error) {
        throw error;
    }
};

const getServices = async (currentUser, filters = {}) => {
    try {
        const { search, page = 1, limit = 10 } = filters;

        const projectId = currentUser.project_id;

        const cacheKey = `services:${projectId}:${JSON.stringify(filters)}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        let whereClause = {
            project_id: projectId
        };

        logger.info(whereClause);

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
            include: [{
            model: Line,
            as: 'lines',
            attributes: ['id', 'name', 'total', 'created_at']
            }]
        });

        const message = count === 0 ? 'No services found' : `${count} service${count > 1 ? 's' : ''} retrieved successfully`;

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

        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 300 });

        return result;
    } catch (error) {
        throw error;
    }
};

const updateService = async (serviceId, data, currentUser) => {
    try {
        const { name, description, average_service_time } = data;
        const projectId = currentUser.project_id;

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

        await service.save();

        const keys = await redisClient.keys(`services:${projectId}:*`);
        if (keys.length > 0) await redisClient.del(keys);

        return service;
    } catch (error) {
        throw error;
    }
};

const deleteService = async (serviceId, currentUser) => {
    try {
        const projectId = currentUser.project_id;

        const service = await Service.findOne({
            where: { id: serviceId, project_id: projectId }
        });
        if (!service) {
            throw new AppError('Service not found', 404);
        }

        await service.destroy();

        const keys = await redisClient.keys(`services:${projectId}:*`);
        if (keys.length > 0) await redisClient.del(keys);

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