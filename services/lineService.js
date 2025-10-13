const { Line, Service } = require('../models');
const AppError = require('../utils/AppError');
const { Op, where } = require('sequelize');
const redisClient = require('../config/redisClient');

const createLine = async (data, currentUser) => {
    try {
        const { name, service_id } = data;

        if (!name || name.trim() === '') {
            throw new AppError('Line name is required', 400);
        }
        if (!service_id) {
            throw new AppError('Service ID is required', 400);
        }

        const service = await Service.findOne({
            where: { id: service_id, project_id: currentUser.project_id }
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

        const keys = await redisClient.keys(`lines:${currentUser.project_id}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        };

        return newLine;
    } catch (error) {
        throw new AppError('Failed to create line', 500);
    }
};

const getLines = async (currentUser, filters = {}) => {
    try {
        const cacheKey = `lines:${currentUser.project_id}:${JSON.stringify(filters)}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const { service_id, search, page = 1, limit = 10 } = filters;

        let whereClause = {};

        if (service_id) {
            whereClause.service_id = service_id;
        }

        if (search) {
            whereClause[Op.and] = [
                { name: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows: lines } = await Line.findAndCountAll({
            where: whereClause,
            include: [{
                model: Service,
                as: 'service',
                where: { project_id: currentUser.project_id },
                attributes: []
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        if (count === 0) {
            throw new AppError('No lines found', 404);
        }

        const result = {
            lines,
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
        throw new AppError('Failed to retrieve lines', 500);
    }
};

const updateLine = async (lineId, data, currentUser) => {
    try {
        const { name } = data;

        const line = await Line.findOne({
            where: { id: lineId },
            include: [{
                model: Service,
                as: 'service',
                where: { project_id: currentUser.project_id }
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

        const keys = await redisClient.keys(`lines:${currentUser.project_id}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        return line;
    } catch (error) {
        throw new AppError('Failed to update line', 500);
    }
};

const deleteLine = async (lineId, currentUser) => {
    try {
        const line = await Line.findOne({
            where: { id: lineId },
            include: [{
                model: Service,
                as: 'service',
                where: { project_id: currentUser.project_id }
            }]
        });
        if (!line) {
            throw new AppError('Line not found', 404);
        }

        await line.destroy();

        const keys = await redisClient.keys(`lines:${currentUser.project_id}:*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        return { id: lineId, name: line.name };
    } catch (error) {
        throw new AppError('Failed to delete line', 500);
    }
};

module.exports = {
    createLine,
    getLines,
    updateLine,
    deleteLine
};