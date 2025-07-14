const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Follow extends Model {}
  Follow.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    followerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    followingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Follow',
    tableName: 'follows',
    timestamps: true,
  });
  return Follow;
}; 