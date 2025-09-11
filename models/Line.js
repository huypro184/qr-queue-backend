'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Line extends Model {
    static associate(models) {
      Line.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service',
        onDelete: 'CASCADE'
      });
    }
  }

  Line.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      service_id: {
        type: DataTypes.INTEGER
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      total: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'Line',
      tableName: 'lines',
      timestamps: false
    }
  );

  return Line;
};
