const express = require('express');
const { Collaboration, Song, User } = require('../../database/models');
const authenticateJWT = require('../../database/auth/jwt-middleware');
const upload = require('../../audio-storage/upload/file-upload');
const { updateCollaborationAudioUrl } = require('../../audio-storage/integration/database-sync');

const router = express.Router();

// Create new collaboration
router.post('/', authenticateJWT, upload.single('audio'), async (req, res) => {
  try {
    const { songId, notes, parentId } = req.body;

    if (!songId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    // Verify song exists
    const song = await Song.findByPk(songId);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Create collaboration
    const collaboration = await Collaboration.create({
      userId: req.user.id,
      songId,
      notes,
      parentId: parentId || null,
      version: 1, // TODO: Calculate proper version number
    });

    // If audio file was uploaded, update the collaboration with audio URL
    if (req.file) {
      await updateCollaborationAudioUrl(collaboration.id, `/tmp/${req.file.filename}`);
    }

    // Fetch complete collaboration with user info
    const completeCollaboration = await Collaboration.findByPk(collaboration.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }]
    });

    res.status(201).json({
      message: 'Collaboration created successfully',
      collaboration: completeCollaboration
    });
  } catch (error) {
    console.error('Create collaboration error:', error);
    res.status(500).json({ error: 'Failed to create collaboration' });
  }
});

// Get collaborations for a song
router.get('/song/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const collaborations = await Collaboration.findAll({
      where: { 
        songId,
        isActive: true
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({ collaborations });
  } catch (error) {
    console.error('Get collaborations error:', error);
    res.status(500).json({ error: 'Failed to fetch collaborations' });
  }
});

// Get collaboration by ID
router.get('/:id', async (req, res) => {
  try {
    const collaboration = await Collaboration.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Song,
          include: [{
            model: User,
            attributes: ['id', 'username', 'displayName', 'avatarUrl']
          }]
        }
      ]
    });

    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    res.json({ collaboration });
  } catch (error) {
    console.error('Get collaboration error:', error);
    res.status(500).json({ error: 'Failed to fetch collaboration' });
  }
});

// Update collaboration (only by owner)
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { notes } = req.body;

    const collaboration = await Collaboration.findByPk(req.params.id);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    // Check ownership
    if (collaboration.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this collaboration' });
    }

    // Update fields
    if (notes !== undefined) collaboration.notes = notes;

    await collaboration.save();

    res.json({
      message: 'Collaboration updated successfully',
      collaboration
    });
  } catch (error) {
    console.error('Update collaboration error:', error);
    res.status(500).json({ error: 'Failed to update collaboration' });
  }
});

// Delete collaboration (only by owner)
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const collaboration = await Collaboration.findByPk(req.params.id);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    // Check ownership
    if (collaboration.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this collaboration' });
    }

    await collaboration.destroy();

    res.json({ message: 'Collaboration deleted successfully' });
  } catch (error) {
    console.error('Delete collaboration error:', error);
    res.status(500).json({ error: 'Failed to delete collaboration' });
  }
});

module.exports = router; 