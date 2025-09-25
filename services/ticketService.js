const { Service, Project, Line, User, Ticket } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

const updateWaitingTickets = async (lineId) => {
    const waitingTickets = await Ticket.findAll({
        where: { line_id: lineId, status: 'waiting' },
        order: [['joined_at', 'ASC']]
    });

    for (let i = 0; i < waitingTickets.length; i++) {
        const ticket = waitingTickets[i];
        ticket.queue_length_at_join = i;
        await ticket.save();
    }
};

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
        const { line_id, status, search,page = 1, limit = 10 } = filters;
        let whereClause = {};

        if (line_id) {
            whereClause.line_id = line_id;
        }

        if (status) {
            whereClause.status = status;
        }

        if (search) {
            whereClause[Op.and] = [
                { name: { [Op.iLike]: `%${search}%` } }
            ];
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

const callNextTicket = async (lineId, currentUser) => {
    try {
        const nextTicket = await Ticket.findOne({
            where: {
                line_id: lineId,
                status: 'waiting'
            },
            order: [['joined_at', 'ASC']]
        });

        if (!nextTicket) {
            throw new AppError('No waiting ticket found for this line', 404);
        }

        nextTicket.status = 'serving';
        nextTicket.served_at = new Date();
        await nextTicket.save();

        const line = await Line.findByPk(lineId);
        if (line && line.total > 0) {
            await line.decrement('total');
        }

        return nextTicket;
    } catch (error) {
        throw error;
    }
};

const finishTicket = async (ticketId, currentUser) => {
    try {
        const ticket = await Ticket.findByPk(ticketId);
        if (!ticket) {
            throw new AppError('Ticket not found', 404);
        }
        if (ticket.status !== 'serving') {
            throw new AppError('Ticket is not being served', 400);
        }

        ticket.status = 'done';
        ticket.finished_at = new Date();
        await ticket.save();

        const serviceTime = ticket.finished_at - ticket.served_at;
        const serviceTimeMinutes = Math.round(serviceTime / 60000 * 100) / 100;

        await updateWaitingTickets(ticket.line_id);

        return {
            ticket,
            service_time_ms: serviceTimeMinutes
        };
    } catch (error) {
        throw error;
    }
};

const cancelTicket = async (ticketId, currentUser) => {
    try {
        const ticket = await Ticket.findByPk(ticketId);
        if (!ticket) {
            throw new AppError('Ticket not found', 404);
        }
        if (ticket.status !== 'waiting') {
            throw new AppError('Ticket is not waiting', 400);
        }

        ticket.status = 'cancelled';
        await ticket.save();

        await updateWaitingTickets(ticket.line_id);

        return ticket;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createTicket,
    getTickets,
    callNextTicket,
    finishTicket,
    cancelTicket
};
