const { Service, Project, Line } = require('../models');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');
const redisClient = require('../config/redisClient');

const getAdminProject = async (currentUser) => {
    const project = await Project.findOne({
        where: { admin_id: currentUser.id }
    });

    if (!project) {
        throw new AppError('Admin has not been assigned to any project. Please contact super admin.', 403);
    }

    return project;
};

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
            throw new AppError('Admin has not been assigned to any project. Please contact super admin.', 403);
        }

        const newService = await Service.create({
            name,
            description,
            project_id: projectId
        });

        // const { average_service_time: avgServiceTime, historical_avg_wait: histAvgWait, ...serviceData } = newService.toJSON();
        return newService.toJSON();
    } catch (error) {
        throw error;
    }
};

const getServices = async (currentUser, filters = {}) => {
    try {
        const { search, page = 1, limit = 10 } = filters;

        const project = await getAdminProject(currentUser);
        const projectId = project.id;


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
            include: [{
            model: Line,
            as: 'lines',
            attributes: ['id', 'name', 'total', 'created_at']
            }]
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

        return result;
    } catch (error) {
        throw error;
    }
};

const updateService = async (serviceId, data, currentUser) => {
    try {
        const { name, description, average_service_time } = data;
        const project = await getAdminProject(currentUser);
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

        await service.save();

        return service;
    } catch (error) {
        throw error;
    }
};

const deleteService = async (serviceId, currentUser) => {
    try {
        const project = await getAdminProject(currentUser);
        const projectId = project.id;

        const service = await Service.findOne({
            where: { id: serviceId, project_id: projectId }
        });
        if (!service) {
            throw new AppError('Service not found', 404);
        }

        await service.destroy();

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