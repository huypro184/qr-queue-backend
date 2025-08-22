const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  lineId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Line", 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    index: true 
  },
  serviceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Service", 
    required: true,
    index: true 
  },
  
  number: { 
    type: Number, 
    required: true,
    min: 1,
    index: true 
  },
  
  status: { 
    type: String, 
    enum: ["waiting", "served", "canceled"], 
    default: "waiting", 
    index: true 
  },
  
  expiredAt: {
    type: Date,
    default: () => new Date(Date.now() + 8 * 60 * 60 * 1000)
  },
  
  calledAt: {
    type: Date
  },
  servedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

TicketSchema.index({ lineId: 1, number: 1 }, { unique: true });

TicketSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Ticket', TicketSchema);
