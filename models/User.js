const mongoose = require('mongoose');
const crypto = require('crypto');

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
    select: false
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
  }],
  passwordChangedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

UserSchema.pre('save', function(next) {
  if (!this.isModified('password')) return next();

  this.passwordChangedAt = Date.now();
  next();
});

UserSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
