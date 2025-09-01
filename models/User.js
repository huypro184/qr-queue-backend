// const mongoose = require('mongoose');
// const crypto = require('crypto');
// const { type } = require('os');

// const UserSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   email: { 
//     type: String, 
//     unique: true, 
//     index: true,
//     lowercase: true,
//     trim: true,
//     validate: {
//       validator: (value) => {
//         const re =
//           /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
//         return value.match(re);
//       },
//       message: "Please enter a valid email address",
//     },
//   },
//   phone: {
//     type: String,
//     trim: true
//   },
//   password: {
//     type: String,
//     required: true,
//     minlength: 8,
//     select: false
//   },
//   role: { 
//     type: String, 
//     enum: ["superadmin", "admin", "user"], 
//     default: "user", 
//     index: true 
//   },
//   projectIds: [{ 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "Project", 
//     index: true 
//   }],
//   passwordChangedAt: {
//     type: Date
//   },
//   passwordResetToken: {
//     type: String
//   },
//   passwordResetExpires: {
//     type: Date
//   }
// }, { 
//   timestamps: true 
// });

// UserSchema.pre('save', function(next) {
//   if (!this.isModified('password')) return next();

//   this.passwordChangedAt = Date.now();
//   next();
// });

// UserSchema.methods.createPasswordResetToken = function() {
//   const resetToken = crypto.randomBytes(32).toString('hex');
//   this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//   this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
//   return resetToken;
// };

// module.exports = mongoose.model('User', UserSchema);
// models/User.js
const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'user_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'customer',
    validate: {
      isIn: [['customer', 'staff', 'admin']]
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_reset_token'
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_expires'
  },
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_changed_at'
  }
}, {
  tableName: 'users',
  timestamps: false,
  defaultScope: {
    attributes: { exclude: ['password_hash'] }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password_hash'] }
    }
  }
});

// Instance method for password reset token
User.prototype.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return resetToken;
};

module.exports = User;