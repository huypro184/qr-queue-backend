const { createTicket, getTickets } = require('../services/ticketService');
const { asyncHandler } = require('../utils/asyncHandler');

const createTicketController = asyncHandler(async (req, res, next) => {
    const ticket = await createTicket(req.body, req.user);
    res.status(201).json({
        status: 'success',
        message: 'Ticket created successfully',
        data: ticket
    });
});

const getTicketsController = asyncHandler(async (req, res, next) => {
    const tickets = await getTickets(req.user, req.query);
    res.status(200).json({
        status: 'success',
        data: tickets
    });
});

module.exports = {
    createTicketController,
    getTicketsController
};