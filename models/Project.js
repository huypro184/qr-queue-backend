const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true 
  },
  description: {
    type: String,
    trim: true
  },
  managerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Project', ProjectSchema);
