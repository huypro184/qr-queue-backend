const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    enum: ["info", "warning", "success"], 
    default: "info" 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
