const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {}
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    displayName: DataTypes.STRING,
    bio: DataTypes.TEXT,
    skills: DataTypes.ARRAY(DataTypes.STRING),
    genres: DataTypes.ARRAY(DataTypes.STRING),
    reputation: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    avatarUrl: DataTypes.STRING,
    audioSampleUrl: DataTypes.STRING, // For Agent 2 audio file reference
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  });
  return User;
}; 