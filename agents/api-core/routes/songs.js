const express = require('express');
const { Song, User, Collaboration } = require('../../database/models');
const { Op } = require('sequelize');
const authenticateJWT = require('../../database/auth/jwt-middleware');
const upload = require('../../audio-storage/upload/file-upload');
const { updateSongAudioUrl } = require('../../audio-storage/integration/database-sync');

const router = express.Router();

// Create new song with audio upload
router.post('/', authenticateJWT, upload.single('audio'), async (req, res) => {
  try {
    const { title, genre, mood, key, tempo, collaborationNeeds } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Create song record
    const song = await Song.create({
      userId: req.user.id,
      title,
      genre,
      mood,
      key: key ? key : null,
      tempo: tempo ? parseInt(tempo) : null,
      collaborationNeeds: collaborationNeeds ? collaborationNeeds.split(',') : [],
    });

    // If audio file was uploaded, update the song with audio URL
    if (req.file) {
      // TODO: Process audio file and upload to S3
      // For now, just store the temporary file path
      await updateSongAudioUrl(song.id, `/tmp/${req.file.filename}`);
    }

    // Fetch the complete song with user info
    const completeSong = await Song.findByPk(song.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }]
    });

    res.status(201).json({
      message: 'Song created successfully',
      song: completeSong
    });
  } catch (error) {
    console.error('Create song error:', error);
    res.status(500).json({ error: 'Failed to create song' });
  }
});

// Get all songs with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      genre, 
      mood, 
      collaborationNeeds, 
      limit = 20, 
      offset = 0 
    } = req.query;

    const where = { isActive: true };
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (genre) where.genre = genre;
    if (mood) where.mood = mood;
    if (collaborationNeeds) {
      where.collaborationNeeds = { [Op.contains]: collaborationNeeds.split(',') };
    }

    const songs = await Song.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({ songs });
  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// Get song by ID
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Collaboration,
          include: [{
            model: User,
            attributes: ['id', 'username', 'displayName', 'avatarUrl']
          }]
        }
      ]
    });

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ song });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

// Update song (only by owner)
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { title, genre, mood, key, tempo, collaborationNeeds } = req.body;

    const song = await Song.findByPk(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Check ownership
    if (song.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this song' });
    }

    // Update fields
    if (title !== undefined) song.title = title;
    if (genre !== undefined) song.genre = genre;
    if (mood !== undefined) song.mood = mood;
    if (key !== undefined) song.key = key;
    if (tempo !== undefined) song.tempo = tempo;
    if (collaborationNeeds !== undefined) {
      song.collaborationNeeds = Array.isArray(collaborationNeeds) 
        ? collaborationNeeds 
        : collaborationNeeds.split(',');
    }

    await song.save();

    res.json({
      message: 'Song updated successfully',
      song
    });
  } catch (error) {
    console.error('Update song error:', error);
    res.status(500).json({ error: 'Failed to update song' });
  }
});

// Delete song (only by owner)
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const song = await Song.findByPk(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Check ownership
    if (song.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this song' });
    }

    await song.destroy();

    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

module.exports = router; 