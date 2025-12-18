const { Service, Project, Line, User, Ticket } = require('../models');
const AppError = require('../utils/AppError');
const { predictWaitingTime } = require('./predictTime');
const { Op } = require('sequelize');
const { getIO } = require('./websocket');

const notifyWaitingTickets = async (lineId) => {
  const io = getIO();
  
  // Lấy tất cả vé đang chờ trong line
  const waitingTickets = await Ticket.findAll({
    where: { line_id: lineId, status: 'waiting' }
  });

  // Gửi riêng cho từng vé
  for (const ticket of waitingTickets) {
    io.to(`ticket_${ticket.id}`).emit('ticket_updated', {
      ticketId: ticket.id,
      waiting_time: ticket.waiting_time,
      status: ticket.status,
      message: 'Thời gian chờ đã được cập nhật'
    });
  }
};

const createTicket = async (data, currentUser) => {
    try {
        const { serviceId, name, phone } = data;
        if (!serviceId) {
            throw new AppError('Service ID is required', 400);
        }

        const service = await Service.findOne({
            where: { id: serviceId }
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

        const ticketCount = await Ticket.count({
            where: { line_id: line.id }
        });
        const queueNumber = `${line.name.substring(0, 1).toUpperCase()}${String(ticketCount + 1).padStart(3, '0')}`;

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

        // await notifyWaitingTickets(line.id);

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
            queueNumber: queueNumber,
            service_id: serviceId,
            serviceName: service.name,
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

const getTickets = async (lineId, currentUser, filters = {}) => {
    try {
        const { status, search, page = 1, limit = 10 } = filters;
        let whereClause = { line_id: lineId };
        let userWhere = {};

        if (status) {
            whereClause.status = status;
        }

        let userRequired = false;

        if (search) {
            userWhere = {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { phone: { [Op.iLike]: `%${search}%` } }
                ]
            };
            userRequired = true;
        }

        const line = await Line.findOne({
            where: { id: lineId },
            include: [{
                model: Service,
                as: 'service',
                required: true,
                include: [{
                    model: Project,
                    as: 'project',
                    required: true,
                    where: currentUser.role === 'admin'
                        ? { admin_id: currentUser.id }
                        : { id: currentUser.project_id }
                }]
            }]
        });
        if (!line) {
            throw new AppError('Line not found or does not belong to your project', 404);
        }

        const offset = (page - 1) * limit;

        const { count, rows: tickets } = await Ticket.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone'],
                    where: Object.keys(userWhere).length ? userWhere : undefined,
                    required: userRequired
                },
                {
                    model: Line,
                    as: 'line',
                    attributes: ['id', 'name']
                }
            ],
            order: [['joined_at', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true,
            subQuery: false
        });

        // Lấy tất cả tickets trong line để tính index
        const allTicketsInLine = await Ticket.findAll({
            where: { line_id: lineId },
            order: [['id', 'ASC']],
            attributes: ['id']
        });

        // Map tickets với queueNumber
        const ticketsWithQueueNumber = tickets.map(ticket => {
            const ticketIndex = allTicketsInLine.findIndex(t => t.id === ticket.id);
            const queueNumber = `${line.name.substring(0, 1).toUpperCase()}${String(ticketIndex + 1).padStart(3, '0')}`;
            
            return {
                id: ticket.id,
                queueNumber: queueNumber,
                service_id: ticket.service_id,
                line_id: ticket.line_id,
                line_name: ticket.line?.name,
                user_id: ticket.user_id,
                name: ticket.user?.name,
                phone: ticket.user?.phone,
                status: ticket.status,
                joined_at: ticket.joined_at,
                served_at: ticket.served_at,
                finished_at: ticket.finished_at,
                waiting_time: ticket.waiting_time,
                queue_length_at_join: ticket.queue_length_at_join,
                created_at: ticket.created_at
            };
        });

        return {
            tickets: ticketsWithQueueNumber,
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
            order: [['joined_at', 'ASC']],
            include: [
                {
                    model: Line,
                    as: 'line',
                    attributes: ['name']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['name', 'phone']
                }
            ]
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

        const io = getIO();
        io.to(`ticket_${nextTicket.id}`).emit('ticket_updated', {
            ticketId: nextTicket.id,
            status: 'serving',
            message: 'It\'s your turn, please proceed to the counter'
        });

        await notifyWaitingTickets(lineId);

        return {
            id: nextTicket.id,
            line_name: nextTicket.line ? nextTicket.line.name : null,
            customer_name: nextTicket.user ? nextTicket.user.name : null,
            customer_phone: nextTicket.user ? nextTicket.user.phone : null,
            status: nextTicket.status,
            served_at: nextTicket.served_at
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
        if (ticket.status !== 'waiting' && ticket.status !== 'serving') {
            throw new AppError('Ticket is not waiting or serving', 400);
        }

        ticket.status = 'cancelled';
        await ticket.save();

        await predictWaitingTime(ticket.line_id);

        const io = getIO();
        io.to(`ticket_${ticketId}`).emit('ticket_updated', {
            ticketId: ticketId,
            status: 'cancelled',
            message: 'Your ticket has been canceled'
        });

        await notifyWaitingTickets(ticket.line_id);

        return ticket;
    } catch (error) {
        throw error;
    }
};

const getTicketById = async (ticketId) => {
    try {
        const ticket = await Ticket.findByPk(ticketId, {
            include: [
                {
                    model: Line,
                    as: 'line',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: Service,
                            as: 'service',
                            attributes: ['id', 'name']
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
            throw new AppError('Ticket not found', 404);
        }

        // Tạo queue number giống hàm createTicket
        const allTicketsInLine = await Ticket.findAll({
            where: { line_id: ticket.line_id },
            order: [['id', 'ASC']]
        });
        const ticketIndex = allTicketsInLine.findIndex(t => t.id === ticket.id);
        const queueNumber = `${ticket.line.name.substring(0, 1).toUpperCase()}${String(ticketIndex + 1).padStart(3, '0')}`;

        return {
            id: ticket.id,
            queueNumber: queueNumber,
            service_id: ticket.line?.service?.id,
            serviceName: ticket.line?.service?.name,
            line_id: ticket.line_id,
            line_name: ticket.line?.name,
            user_id: ticket.user?.id,
            name: ticket.user?.name,
            phone: ticket.user?.phone,
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
