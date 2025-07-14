const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Song extends Model {}
  Song.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    audioUrl: DataTypes.STRING, // Audio file reference
    genre: DataTypes.STRING,
    mood: DataTypes.STRING,
    key: DataTypes.STRING,
    tempo: DataTypes.INTEGER,
    collaborationNeeds: DataTypes.ARRAY(DataTypes.STRING),
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'Song',
    tableName: 'songs',
    timestamps: true,
  });
  return Song;
}; 