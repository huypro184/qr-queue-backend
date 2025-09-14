const { Service, Project, Line, User, Ticket } = require('../models');
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

        let user = await User.findOne({ where: { phone } });
        if (!user) user = await User.create({
            name, 
            phone, 
            role: 'customer',
            email: `${phone}@guest.local`,
            password_hash: 'guest'
        });

        const existedTicket = await Ticket.findOne({
            where: { user_id: user.id, status: 'waiting' },
            include: [{ model: Line, as: 'line', where: { service_id: serviceId } }]
        });
        if (existedTicket) {
            throw new AppError('User already has a waiting ticket for this service', 409);
        }

        const line = await Line.findOne({
            where: { service_id: serviceId },
            order: [['total', 'ASC']]
        });

        const newTicket = await Ticket.create({
            service_id: serviceId,
            user_id: user.id,
            status: 'waiting',
            line_id: line.id,
            joined_at: new Date(),
            queue_length_at_join: line.total
        });
        await line.increment('total');

        return newTicket;
    } catch (error) {
        throw error;
    }
};

const getTickets = async (currentUser, filters = {}) => {
    try {
        const { line_id, status, page = 1, limit = 10 } = filters;
        let whereClause = {};

        if (line_id) {
            whereClause.line_id = line_id;
        }

        if (status) {
            whereClause.status = status;
        }

        const offset = (page - 1) * limit;

        const { count, rows: tickets } = await Ticket.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'phone'] }, 
                { model: Line, as: 'line', attributes: ['id', 'name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            tickets,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
                hasNext: page < Math.ceil(count / limit),
                hasPrev: page > 1
            }
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createTicket,
    getTickets
};
