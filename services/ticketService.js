const { Service, Project, Line, User, Ticket } = require('../models');
const AppError = require('../utils/AppError');
const { predictWaitingTime } = require('./predictTime');
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

        if (!line) {
            throw new AppError('No line found for this service', 404);
        }

        const newTicket = await Ticket.create({
            service_id: serviceId,
            user_id: user.id,
            status: 'waiting',
            line_id: line.id,
            joined_at: new Date(),
            queue_length_at_join: line.total
        });
        await line.increment('total');

        await predictWaitingTime(line.id);

        const ticketWithLine = await Ticket.findByPk(newTicket.id, {
            include: [
                {
                    model: Line,
                    as: 'line',
                    attributes: ['name']
                }
            ]
        });

        return {
            id: ticketWithLine.id,
            line_id: ticketWithLine.line_id,
            line_name: ticketWithLine.line ? ticketWithLine.line.name : null,
            user_id: user.id,
            name: user.name,
            phone: user.phone,
            status: ticketWithLine.status,
            joined_at: ticketWithLine.joined_at,
            served_at: ticketWithLine.served_at,
            finished_at: ticketWithLine.finished_at,
            waiting_time: ticketWithLine.waiting_time,
            queue_length_at_join: ticketWithLine.queue_length_at_join,
            created_at: ticketWithLine.created_at
        };
    } catch (error) {
        throw error;
    }
};

const getTickets = async (currentUser, filters = {}) => {
    try {
        const { line_id, status, search,page = 1, limit = 10 } = filters;
        let whereClause = {};
        const adminId = currentUser.id;

        const include = [
            {
                model: Line,
                as: 'line',
                attributes: [],
                required: true,
                include: [
                    {
                        model: Service,
                        as: 'service',
                        attributes: [],
                        required: true,
                        include: [
                            {
                                model: Project,
                                as: 'project',
                                attributes: [],
                                where: currentUser.role === 'admin'
                                    ? { admin_id: adminId }
                                    : { id: currentUser.project_id },
                                required: true
                            }
                        ]
                    }
                ]
            },
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'phone']
            }
        ];

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
            include,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true,
            subQuery: false
        });

        if (count === 0) {
            throw new AppError('Tickets not found', 404);
        }

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

        await predictWaitingTime(lineId);

        const ticketFull = await Ticket.findByPk(nextTicket.id, {
            include: [
                {
                    model: Line,
                    as: 'line',
                    attributes: ['name']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone']
                }
            ]
        });

        return {
            id: ticketFull.id,
            line_id: ticketFull.line_id,
            line_name: ticketFull.line ? ticketFull.line.name : null,
            user_id: ticketFull.user ? ticketFull.user.id : null,
            name: ticketFull.user ? ticketFull.user.name : null,
            phone: ticketFull.user ? ticketFull.user.phone : null,
            status: ticketFull.status,
            joined_at: ticketFull.joined_at,
            served_at: ticketFull.served_at,
            finished_at: ticketFull.finished_at,
            waiting_time: ticketFull.waiting_time,
            queue_length_at_join: ticketFull.queue_length_at_join,
            created_at: ticketFull.created_at
        };
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

        return ticket;
    } catch (error) {
        throw error;
    }
};

const getTicketById = async (ticketId, currentUser) => {
    try {
        const ticket = await Ticket.findOne({
            where: { id: ticketId },
            include: [
                {
                    model: Line,
                    as: 'line',
                    attributes: ['name'],
                    required: true,
                    include: [
                        {
                            model: Service,
                            as: 'service',
                            attributes: [],
                            required: true,
                            include: [
                                {
                                    model: Project,
                                    as: 'project',
                                    attributes: [],
                                    where: currentUser.role === 'admin'
                                        ? { admin_id: currentUser.id }
                                        : { id: currentUser.project_id },
                                    required: true
                                }
                            ]
                        }
                    ]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone']
                }
            ]
        });

        if (!ticket) {
            throw new AppError('Ticket not found or does not belong to your project', 404);
        }

        return {
            id: ticket.id,
            line_id: ticket.line_id,
            line_name: ticket.line ? ticket.line.name : null,
            user_id: ticket.user ? ticket.user.id : null,
            name: ticket.user ? ticket.user.name : null,
            phone: ticket.user ? ticket.user.phone : null,
            status: ticket.status,
            joined_at: ticket.joined_at,
            served_at: ticket.served_at,
            finished_at: ticket.finished_at,
            waiting_time: ticket.waiting_time,
            queue_length_at_join: ticket.queue_length_at_join,
            created_at: ticket.created_at
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createTicket,
    getTickets,
    callNextTicket,
    finishTicket,
    cancelTicket,
    getTicketById
};
