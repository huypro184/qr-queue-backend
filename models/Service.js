const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true
  },
  managerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },
  status: { 
    type: String, 
    enum: ["active", "pending", "done"], 
    default: "active", 
    index: true 
  }
}, { 
  timestamps: true 
});

ServiceSchema.index({ projectId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Service', ServiceSchema);
