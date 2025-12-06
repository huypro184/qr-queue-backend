const { Line, Service, Project } = require('../models');
const AppError = require('../utils/AppError');
const { Op, where } = require('sequelize');
const redisClient = require('../config/redisClient');

const getUserProject = async (currentUser) => {
    let project;

    if (currentUser.role === 'admin') {
        project = await Project.findOne({
            where: { admin_id: currentUser.id }
        });
    } else if (currentUser.role === 'staff') {
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

const createLine = async (data, currentUser) => {
    try {

        const project = await getUserProject(currentUser);
        const { name, service_id } = data;

        if (!name || name.trim() === '') {
            throw new AppError('Line name is required', 400);
        }
        if (!service_id) {
            throw new AppError('Service ID is required', 400);
        }

        const service = await Service.findOne({
            where: { id: service_id, project_id: project.id }
        });
        if (!service) {
            throw new AppError('Service not found', 404);
        }
        
        const existed = await Line.findOne({
            where: { name, service_id }
        });
        if (existed) {
            throw new AppError('Line name already exists in this service', 409);
        }

        const newLine = await Line.create({
            name,
            service_id
        });

        return newLine;
    } catch (error) {
        throw error;
    }
};

const getLines = async (serviceId ,currentUser, filters = {}) => {
    try {
        const project = await getUserProject(currentUser);
        const service = await Service.findOne({
            where: { 
                id: serviceId, 
                project_id: project.id 
            }
        });
        if (!service) {
            throw new AppError('Service not found', 404);
        }
        
        const { search, page = 1, limit = 10 } = filters;

        let whereClause = {
            service_id: serviceId
        };

        if (search && search.trim()) {
            whereClause.name = { [Op.iLike]: `%${search.trim()}%` };
        }

        const offset = (page - 1) * limit;

        // const { count, rows: lines } = await Line.findAndCountAll({
        //     where: whereClause,
        //     include: [{
        //         model: Service,
        //         as: 'service',
        //         where: { project_id: currentUser.project_id },
        //         attributes: []
        //     }],
        //     order: [['created_at', 'DESC']],
        //     limit: parseInt(limit),
        //     offset: parseInt(offset)
        // });

        const { count, rows: lines } = await Line.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: ['id', 'name', 'service_id', 'created_at']
        });

        const message = count === 0 
            ? 'No lines found for this service' 
            : `${count} line${count > 1 ? 's' : ''} retrieved successfully`;

        const result = {
            lines,
            message,
            service: {
                id: service.id,
                name: service.name
            },
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

const updateLine = async (lineId, data, currentUser) => {
    try {
        const { name } = data;
        const project = await getUserProject(currentUser);

        const line = await Line.findOne({
            where: { id: lineId },
            include: [{
                model: Service,
                as: 'service',
                where: { project_id: project.id }
            }]
        });
        if (!line) {
            throw new AppError('Line not found', 404);
        }

        if (name && name !== line.name) {
            const existed = await Line.findOne({
                where: {
                    name,
                    service_id: line.service_id,
                    id: { [Op.ne]: lineId }
                }
            });
            if (existed) {
                throw new AppError('Line name already exists in this service', 409);
            }
        }

        if (name !== undefined) line.name = name;

        await line.save();

        return line;
    } catch (error) {
        throw error;
    }
};

const deleteLine = async (lineId, currentUser) => {
    try {
        const project = await getUserProject(currentUser);
        const line = await Line.findOne({
            where: { id: lineId },
            include: [{
                model: Service,
                as: 'service',
                where: { project_id: project.id }
            }]
        });
        if (!line) {
            throw new AppError('Line not found', 404);
        }

        await line.destroy();

        return { id: lineId, name: line.name };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createLine,
    getLines,
    updateLine,
    deleteLine
};