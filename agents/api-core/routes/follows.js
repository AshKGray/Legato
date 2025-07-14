const express = require('express');
const { Follow, User } = require('../../database/models');
const authenticateJWT = require('../../database/auth/jwt-middleware');

const router = express.Router();

// Follow a user
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { followingId } = req.body;

    if (!followingId) {
      return res.status(400).json({ error: 'Following user ID is required' });
    }

    // Can't follow yourself
    if (followingId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const userToFollow = await User.findByPk(followingId);
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId
      }
    });

    if (existingFollow) {
      return res.status(409).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    const follow = await Follow.create({
      followerId: req.user.id,
      followingId
    });

    res.status(201).json({
      message: 'Successfully followed user',
      follow
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/:followingId', authenticateJWT, async (req, res) => {
  try {
    const { followingId } = req.params;

    const follow = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId
      }
    });

    if (!follow) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    await follow.destroy();

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get followers of a user
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const followers = await Follow.findAll({
      where: { followingId: userId },
      include: [{
        model: User,
        as: 'Follower',
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({ followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get users that a user is following
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const following = await Follow.findAll({
      where: { followerId: userId },
      include: [{
        model: User,
        as: 'Following',
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({ following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

module.exports = router; 