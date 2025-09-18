const { createTicket, getTickets, callNextTicket, finishTicket, cancelTicket } = require('../services/ticketService');
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

const callNextTicketController = asyncHandler(async (req, res, next) => {
    const { lineId } = req.params;
    const ticket = await callNextTicket(lineId, req.user);
    res.status(200).json({
        status: 'success',
        data: ticket
    });
});

const finishTicketController = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.params;
    const ticket = await finishTicket(ticketId, req.user);
    res.status(200).json({
        status: 'success',
        data: ticket
    });
});

const cancelTicketController = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.params;
    const ticket = await cancelTicket(ticketId, req.user);
    res.status(200).json({
        status: 'success',
        data: ticket
    });
});

module.exports = {
    createTicketController,
    getTicketsController,
    callNextTicketController,
    finishTicketController,
    cancelTicketController
};