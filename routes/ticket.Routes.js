const express = require('express');
const { createTicketController, getTicketsController } = require('../controllers/ticketController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('admin', 'staff'), createTicketController);
router.get('/', protect, restrictTo('admin', 'staff'), getTicketsController);



module.exports = router;