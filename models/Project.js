'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Project extends Model {
    static associate(models) {
      Project.hasMany(models.User, { 
        foreignKey: 'project_id',
        as: 'users' 
      });
      Project.hasMany(models.Service, {
      foreignKey: 'project_id',
      as: 'services'
    });
    }
  }
  
  Project.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    slug: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    qr_code: {
        type: DataTypes.TEXT,
        allowNull: true
      },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    timestamps: false
  });
  
  return Project;
};