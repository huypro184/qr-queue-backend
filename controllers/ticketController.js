const { createTicket, getTickets, callNextTicket, finishTicket, cancelTicket, getTicketById } = require('../services/ticketService');
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
    const { lineId } = req.params;
    const { status, search, page, limit } = req.query;
    const result = await getTickets(lineId, req.user, { status, search, page, limit });
    res.status(200).json({
        status: 'success',
        data: result
    });
});

const callNextTicketController = asyncHandler(async (req, res, next) => {
    const { lineId } = req.params;
    const result = await callNextTicket(lineId, req.user);
    res.status(200).json({
        status: 'success',
        message: 'Next ticket called successfully',
        data: result
    });
});

const finishTicketController = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.params;
    const ticket = await finishTicket(ticketId, req.user);
    res.status(200).json({
        status: 'success',
        message: 'Ticket finished successfully',
        data: ticket
    });
});

const cancelTicketController = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.params;
    const ticket = await cancelTicket(ticketId, req.user);
    res.status(200).json({
        status: 'success',
        message: 'Ticket cancelled successfully',
        data: ticket
    });
});

const getTicketByIdController = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const ticket = await getTicketById(id);
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
    getTicketByIdController,
    cancelTicketController
};