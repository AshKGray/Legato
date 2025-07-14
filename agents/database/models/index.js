const { Sequelize } = require('sequelize');
const path = require('path');
const config = require(path.resolve(__dirname, '../../../shared/config/app-config.js'));

const sequelize = new Sequelize(
  config.db.database,
  config.db.username,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    pool: config.db.pool,
    logging: config.db.logging,
  }
);
const User = require('./User')(sequelize);
const Song = require('./Song')(sequelize);
const Collaboration = require('./Collaboration')(sequelize);
const Vote = require('./Vote')(sequelize);
const Comment = require('./Comment')(sequelize);
const Follow = require('./Follow')(sequelize);
const Notification = require('./Notification')(sequelize);

// Associations
User.hasMany(Song, { foreignKey: 'userId' });
Song.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Collaboration, { foreignKey: 'userId' });
Collaboration.belongsTo(User, { foreignKey: 'userId' });

Song.hasMany(Collaboration, { foreignKey: 'songId' });
Collaboration.belongsTo(Song, { foreignKey: 'songId' });

User.hasMany(Vote, { foreignKey: 'userId' });
Vote.belongsTo(User, { foreignKey: 'userId' });

Collaboration.hasMany(Vote, { foreignKey: 'collaborationId' });
Vote.belongsTo(Collaboration, { foreignKey: 'collaborationId' });

User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

Song.hasMany(Comment, { foreignKey: 'songId' });
Comment.belongsTo(Song, { foreignKey: 'songId' });

Collaboration.hasMany(Comment, { foreignKey: 'collaborationId' });
Comment.belongsTo(Collaboration, { foreignKey: 'collaborationId' });

Comment.hasMany(Comment, { as: 'Replies', foreignKey: 'parentId' });
Comment.belongsTo(Comment, { as: 'Parent', foreignKey: 'parentId' });

User.hasMany(Follow, { as: 'Followers', foreignKey: 'followingId' });
User.hasMany(Follow, { as: 'Following', foreignKey: 'followerId' });
Follow.belongsTo(User, { as: 'Follower', foreignKey: 'followerId' });
Follow.belongsTo(User, { as: 'Following', foreignKey: 'followingId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Song,
  Collaboration,
  Vote,
  Comment,
  Follow,
  Notification,
}; 