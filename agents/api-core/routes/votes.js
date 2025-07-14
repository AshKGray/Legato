const express = require('express');
const { Vote, Collaboration, User } = require('../../database/models');
const authenticateJWT = require('../../database/auth/jwt-middleware');

const router = express.Router();

// Create or update vote
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { collaborationId, category, value } = req.body;

    if (!collaborationId || !category || value === undefined) {
      return res.status(400).json({ error: 'Collaboration ID, category, and value are required' });
    }

    // Verify collaboration exists
    const collaboration = await Collaboration.findByPk(collaborationId);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    // Check if user already voted on this collaboration in this category
    const existingVote = await Vote.findOne({
      where: {
        userId: req.user.id,
        collaborationId,
        category
      }
    });

    let vote;
    if (existingVote) {
      // Update existing vote
      existingVote.value = value;
      await existingVote.save();
      vote = existingVote;
    } else {
      // Create new vote
      vote = await Vote.create({
        userId: req.user.id,
        collaborationId,
        category,
        value,
        weight: 1.0 // TODO: Calculate based on user reputation
      });
    }

    res.json({
      message: existingVote ? 'Vote updated successfully' : 'Vote created successfully',
      vote
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// Get votes for a collaboration
router.get('/collaboration/:collaborationId', async (req, res) => {
  try {
    const { collaborationId } = req.params;

    const votes = await Vote.findAll({
      where: { collaborationId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }]
    });

    res.json({ votes });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// Delete vote
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const vote = await Vote.findByPk(req.params.id);
    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    // Check ownership
    if (vote.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this vote' });
    }

    await vote.destroy();

    res.json({ message: 'Vote deleted successfully' });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ error: 'Failed to delete vote' });
  }
});

module.exports = router; 