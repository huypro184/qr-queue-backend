const { getProjectQRCode } = require('../services/qrservice');
const { asyncHandler } = require('../utils/asyncHandler');

const getQRCodeForProject = asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;
    const result = await getProjectQRCode(projectId);
    res.status(200).json({
        status: 'success',
        data: {
            project: result.project,
            qr_code: result.qr_code
        }
    });
});

module.exports = {
    getQRCodeForProject
};