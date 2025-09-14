const { Service, Project, Line } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

const createTicket = async (data, currentUser) => {
    try {
        const { serviceId, name, phone } = data;
        if (!serviceId) {
            throw new AppError('Service ID is required', 400);
        }

        const service = await Service.findOne({
            where: { id: serviceId, project_id: currentUser.project_id }
        });
        if (!service) {
            throw new AppError('Service not found', 404);
        }
    } catch (error) {
        throw error;
    }
};
