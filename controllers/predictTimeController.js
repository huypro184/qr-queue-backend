const { predictWaitingTime } = require('../services/predictTime');
const { asyncHandler } = require('../utils/asyncHandler');

const predictTimeController = asyncHandler(async (req, res, next) => {
    const { lineId } = req.body;
    if (!lineId) {
        return res.status(400).json({ status: 'error', message: 'lineId is required' });
    }

    const waitingTimes = await predictWaitingTime(lineId);

    res.status(200).json({
        status: 'success',
        data: {
            lineId,
            waiting_times: waitingTimes
        }
    });
});

module.exports = { predictTimeController };