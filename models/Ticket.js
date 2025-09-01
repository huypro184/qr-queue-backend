const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  line_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'lines',
      key: 'id'
    },
    field: 'line_id'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    field: 'user_id'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'waiting',
    validate: {
      isIn: [['waiting', 'serving', 'done', 'cancelled']]
    }
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'joined_at'
  },
  served_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'served_at'
  },
  finished_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'finished_at'
  }
}, {
  tableName: 'tickets',
  timestamps: false
});

module.exports = Ticket;