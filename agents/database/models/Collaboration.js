const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class Collaboration extends Model {}

Collaboration.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  songId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  audioUrl: DataTypes.STRING,
  notes: DataTypes.TEXT,
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'Collaboration',
  tableName: 'collaborations',
  timestamps: true,
});

module.exports = Collaboration; 