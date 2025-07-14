const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Vote extends Model {}
  Vote.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    collaborationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    weight: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
  }, {
    sequelize,
    modelName: 'Vote',
    tableName: 'votes',
    timestamps: true,
  });
  return Vote;
}; 