const { Line, Service } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

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

        return newLine;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createLine
};