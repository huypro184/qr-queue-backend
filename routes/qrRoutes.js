const express = require('express');
const { getQRCodeForProject } = require('../controllers/qrcontroller');

const router = express.Router();

router.get('/:projectId', getQRCodeForProject);

module.exports = router;