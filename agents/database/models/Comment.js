const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class Comment extends Model {}

Comment.init({
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
    allowNull: true,
  },
  collaborationId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Comment',
  tableName: 'comments',
  timestamps: true,
});

module.exports = Comment; 