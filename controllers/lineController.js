const { createLine, getLines, updateLine } = require('../services/lineService');
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

const getAllLines = asyncHandler(async (req, res, next) => {
    const result = await getLines(req.query);
    res.status(200).json({
        status: 'success',
        message: 'Lines retrieved successfully',
        data: {
            lines: result.lines,
            pagination: result.pagination
        }
    });
});

const updateLineById = asyncHandler(async (req, res, next) => {
    const line = await updateLine(req.params.id, req.body, req.user);
    res.status(200).json({
        status: 'success',
        message: 'Line updated successfully',
        data: {
            id: line.id,
            name: line.name,
            service_id: line.service_id,
        }
    });
});

module.exports = {
    createNewLine,
    getAllLines,
    updateLineById
};