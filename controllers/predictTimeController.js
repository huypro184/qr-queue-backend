const { predictWaitingTime } = require('../services/predictTime');
const { asyncHandler } = require('../utils/asyncHandler');

const predictTimeController = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.body;
    if (!ticketId) {
        return res.status(400).json({ status: 'error', message: 'ticketId is required' });
    }

    const waitingTime = await predictWaitingTime(ticketId);

    res.status(200).json({
        status: 'success',
        data: {
            ticketId,
            waiting_time_prediction: waitingTime
        }
    });
});

module.exports = { predictTimeController };