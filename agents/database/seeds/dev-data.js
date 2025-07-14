const { sequelize, User, Song, Collaboration, Vote, Comment, Follow } = require('../models');

async function seed() {
  await sequelize.sync({ force: true });

  // Users
  const users = await User.bulkCreate([
    { username: 'alice', email: 'alice@example.com', passwordHash: 'hashedpw1', displayName: 'Alice', skills: ['vocals'], genres: ['pop'], reputation: 10 },
    { username: 'bob', email: 'bob@example.com', passwordHash: 'hashedpw2', displayName: 'Bob', skills: ['guitar'], genres: ['rock'], reputation: 5 },
  ]);

  // Songs
  const songs = await Song.bulkCreate([
    { userId: users[0].id, title: 'First Song', genre: 'pop', mood: 'happy', key: 'C', tempo: 120, collaborationNeeds: ['lyrics', 'vocals'] },
    { userId: users[1].id, title: 'Second Song', genre: 'rock', mood: 'energetic', key: 'E', tempo: 140, collaborationNeeds: ['drums'] },
  ]);

  // Collaborations
  const collaborations = await Collaboration.bulkCreate([
    { userId: users[0].id, songId: songs[0].id, notes: 'Initial track', version: 1 },
    { userId: users[1].id, songId: songs[0].id, notes: 'Added guitar', version: 2, parentId: null },
  ]);

  // Votes
  await Vote.bulkCreate([
    { userId: users[1].id, collaborationId: collaborations[0].id, category: 'production', value: 1, weight: 1.0 },
    { userId: users[0].id, collaborationId: collaborations[1].id, category: 'guitar', value: 1, weight: 1.0 },
  ]);

  // Comments
  const comments = await Comment.bulkCreate([
    { userId: users[0].id, songId: songs[0].id, content: 'Great start!' },
    { userId: users[1].id, songId: songs[0].id, parentId: null, content: 'Thanks!' },
  ]);

  // Follows
  await Follow.bulkCreate([
    { followerId: users[0].id, followingId: users[1].id },
    { followerId: users[1].id, followingId: users[0].id },
  ]);

  console.log('Seed data inserted.');
  await sequelize.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
}); 