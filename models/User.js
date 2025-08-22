const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    unique: true, 
    index: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => {
        const re =
          /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        return value.match(re);
      },
      message: "Please enter a valid email address",
    },
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  role: { 
    type: String, 
    enum: ["superadmin", "admin", "user"], 
    default: "user", 
    index: true 
  },
  projectIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Project", 
    index: true 
  }]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);
