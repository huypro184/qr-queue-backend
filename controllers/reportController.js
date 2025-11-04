const { getReportSummary, getCustomersByProjectAndDays, getAllProjectsCustomerStats } = require('../services/reportService');
const { asyncHandler } = require('../utils/asyncHandler');

const fetchReportSummary = asyncHandler(async (req, res, next) => {
    const summary = await getReportSummary();
    res.status(200).json({
        status: 'success',
        message: 'Report summary retrieved successfully',
        data: summary
    });
});

const fetchCustomersByDays = asyncHandler(async (req, res, next) => {
    const days = parseInt(req.query.days) || 7;
    
    if (days < 1 || days > 365) {
        throw new AppError('Days must be between 1 and 365', 400);
    }
    
    const data = await getCustomersByProjectAndDays(req.user, days);
    
    res.status(200).json({
        status: 'success',
        results: data.length,
        data
    });
});


const getAllProjectsStats = asyncHandler(async (req, res, next) => {
    const { days = 7, includeEmpty = 'false' } = req.query;
    const result = await getAllProjectsCustomerStats(
        parseInt(days),
        includeEmpty === 'true'
    );

    res.status(200).json({
        status: 'success',
        results: result.length,
        data: result
    });
});

module.exports = {
    fetchReportSummary,
    fetchCustomersByDays,
    getAllProjectsStats
};