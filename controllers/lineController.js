const { createLine } = require('../services/lineService');
const { asyncHandler } = require('../utils/asyncHandler');

const createNewLine = asyncHandler(async (req, res, next) => {
    const line = await createLine(req.body, req.user);
    res.status(201).json({
        status: 'success',
        message: 'Line created successfully',
        data: {
            id: line.id,
            name: line.name,
            service_id: line.service_id,
        }
    });
});

module.exports = {
    createNewLine
};