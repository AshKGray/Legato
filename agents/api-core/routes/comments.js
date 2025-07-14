const express = require('express');
const { Comment, Song, Collaboration, User } = require('../../database/models');
const authenticateJWT = require('../../database/auth/jwt-middleware');

const router = express.Router();

// Create new comment
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { content, songId, collaborationId, parentId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!songId && !collaborationId) {
      return res.status(400).json({ error: 'Either songId or collaborationId is required' });
    }

    // Create comment
    const comment = await Comment.create({
      userId: req.user.id,
      content,
      songId: songId || null,
      collaborationId: collaborationId || null,
      parentId: parentId || null,
    });

    // Fetch complete comment with user info
    const completeComment = await Comment.findByPk(comment.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }]
    });

    res.status(201).json({
      message: 'Comment created successfully',
      comment: completeComment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Get comments for a song
router.get('/song/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const comments = await Comment.findAll({
      where: { songId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({ comments });
  } catch (error) {
    console.error('Get song comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get comments for a collaboration
router.get('/collaboration/:collaborationId', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const comments = await Comment.findAll({
      where: { collaborationId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName', 'avatarUrl']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({ comments });
  } catch (error) {
    console.error('Get collaboration comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Update comment (only by owner)
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;

    const comment = await Comment.findByPk(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check ownership
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    // Update content
    if (content !== undefined) comment.content = content;

    await comment.save();

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment (only by owner)
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check ownership
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await comment.destroy();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router; 