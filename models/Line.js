const mongoose = require('mongoose');

const LineSchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Project", 
    required: true,
    index: true 
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  managerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  total: { 
    type: Number, 
    default: 0,
    min: 0
  },
  current: { 
    type: Number, 
    default: 0,
    min: 0
  },
  serviceIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Service", 
    index: true 
  }],

  serviceStats: [{
    serviceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Service" 
    },
    waitingCount: { 
      type: Number, 
      default: 0,
      min: 0
    }
  }]
}, { 
  timestamps: true 
});

LineSchema.index({ projectId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Line', LineSchema);
