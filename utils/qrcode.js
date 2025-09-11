const QRCode = require('qrcode');

const generateProjectQRCode = async (projectId, urlPrefix = 'https://yourdomain.com/queue?project_id=') => {
    const url = `${urlPrefix}${projectId}`;
    return await QRCode.toDataURL(url);
};

module.exports = {
    generateProjectQRCode
};