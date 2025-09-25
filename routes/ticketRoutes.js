const express = require('express');
const { createTicketController, getTicketsController, callNextTicketController, finishTicketController, cancelTicketController } = require('../controllers/ticketController');
const { predictTimeController } = require('../controllers/predictTimeController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, restrictTo('admin', 'staff'), createTicketController);
router.get('/', protect, restrictTo('admin', 'staff'), getTicketsController);
router.put('/call-next/:lineId', protect, restrictTo('admin', 'staff'), callNextTicketController);
router.put('/finish/:ticketId', protect, restrictTo('admin', 'staff'), finishTicketController);
router.put('/cancel/:ticketId', protect, restrictTo('admin', 'staff'), cancelTicketController);
router.post('/predict-time', protect, restrictTo('admin', 'staff'), predictTimeController);


module.exports = router;
