const express = require('express');
const { User } = require('../../database/models');
const { Op } = require('sequelize');
const authenticateJWT = require('../../database/auth/jwt-middleware');

const router = express.Router();

// Get current user profile
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update current user profile
router.put('/me', authenticateJWT, async (req, res) => {
  try {
    const { displayName, bio, skills, genres, avatarUrl, audioSampleUrl } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (skills !== undefined) user.skills = skills;
    if (genres !== undefined) user.genres = genres;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (audioSampleUrl !== undefined) user.audioSampleUrl = audioSampleUrl;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        skills: user.skills,
        genres: user.genres,
        avatarUrl: user.avatarUrl,
        audioSampleUrl: user.audioSampleUrl,
        reputation: user.reputation,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash', 'email'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Search users
router.get('/', async (req, res) => {
  try {
    const { search, skills, genres, limit = 20, offset = 0 } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { displayName: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (skills) {
      where.skills = { [Op.contains]: skills.split(',') };
    }
    if (genres) {
      where.genres = { [Op.contains]: genres.split(',') };
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['passwordHash', 'email'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['reputation', 'DESC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router; 