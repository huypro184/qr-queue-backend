const { Project } = require('../models');
const { generateProjectQRCode } = require('../utils/qrcode');
const AppError = require('../utils/AppError');

const getProjectQRCode = async (projectId) => {
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Project not found', 404);

    const qr_code = await generateProjectQRCode(projectId);
    return { project, qr_code };
};

module.exports = {
    getProjectQRCode
};