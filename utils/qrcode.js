const QRCode = require('qrcode');

/**
 * @param {string} slug
 * @param {string} [feDomain]
 * @returns {Promise<string>}
 */
const generateProjectQRCode = async (
    slug,
    feDomain = "https://smartqueue.top",
    feDomainDev = "http://localhost:3001"
) => {
    const url = `${feDomainDev}/projects/${slug}`;
    
    return await QRCode.toDataURL(url);
};

module.exports = {
    generateProjectQRCode
};
