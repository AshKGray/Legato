const _ = require('lodash');
const moment = require('moment');

/**
 * Simple Voting Mechanics for Legato
 * 
 * Pure engagement-based voting system:
 * - Simple like/unlike functionality
 * - Comment-based engagement tracking
 * - No reputation weighting - all votes equal
 * - Real-time aggregation for charts
 * - Version ranking based on likes/comments
 */

class SimpleVotingMechanics {
  constructor(config = {}) {
    this.config = {
      // Voting limits
      maxCommentsPerUser: config.maxCommentsPerUser || 10, // Per song
      commentMaxLength: config.commentMaxLength || 500,
      
      // Engagement tracking
      trackEngagementVelocity: config.trackEngagementVelocity !== false,
      velocityTimeWindow: config.velocityTimeWindow || 24, // Hours
      
      // Real-time updates
      enableRealTimeUpdates: config.enableRealTimeUpdates !== false,
      
      ...config
    };

    // In-memory tracking for real-time updates
    this.voteCache = new Map();
    this.commentCache = new Map();
    this.engagementMetrics = new Map();
    
    console.log('👍 Simple Voting Mechanics initialized');
  }

  /**
   * Handle like/unlike vote on a song or collaboration
   */
  async handleVote(userId, targetId, targetType, action, database) {
    try {
      // Validate input
      if (!userId || !targetId || !targetType || !action) {
        throw new Error('Missing required voting parameters');
      }

      if (!['like', 'unlike'].includes(action)) {
        throw new Error('Invalid vote action. Must be "like" or "unlike"');
      }

      if (!['song', 'collaboration'].includes(targetType)) {
        throw new Error('Invalid target type. Must be "song" or "collaboration"');
      }

      // Check if user has already voted
      const existingVote = await this.findExistingVote(userId, targetId, targetType, database);
      
      if (action === 'like') {
        if (existingVote) {
          return {
            success: false,
            message: 'User has already liked this content',
            currentLikes: await this.getLikeCount(targetId, targetType, database)
          };
        }

        // Create new like
        await this.createVote(userId, targetId, targetType, database);
        
        // Update cache
        this.updateVoteCache(targetId, targetType, 'like');
        
        // Track engagement velocity
        if (this.config.trackEngagementVelocity) {
          this.trackEngagementVelocity(targetId, targetType, 'like');
        }

        const newLikeCount = await this.getLikeCount(targetId, targetType, database);
        
        return {
          success: true,
          action: 'liked',
          likeCount: newLikeCount,
          timestamp: moment().toISOString()
        };

      } else if (action === 'unlike') {
        if (!existingVote) {
          return {
            success: false,
            message: 'User has not liked this content',
            currentLikes: await this.getLikeCount(targetId, targetType, database)
          };
        }

        // Remove like
        await this.removeVote(userId, targetId, targetType, database);
        
        // Update cache
        this.updateVoteCache(targetId, targetType, 'unlike');

        const newLikeCount = await this.getLikeCount(targetId, targetType, database);
        
        return {
          success: true,
          action: 'unliked',
          likeCount: newLikeCount,
          timestamp: moment().toISOString()
        };
      }

    } catch (error) {
      console.error('Vote handling error:', error);
      throw error;
    }
  }

  /**
   * Add comment to a song or collaboration
   */
  async addComment(userId, targetId, targetType, content, database, parentId = null) {
    try {
      // Validate input
      if (!userId || !targetId || !targetType || !content) {
        throw new Error('Missing required comment parameters');
      }

      if (content.length > this.config.commentMaxLength) {
        throw new Error(`Comment too long. Maximum ${this.config.commentMaxLength} characters`);
      }

      // Check user comment limit
      const userCommentCount = await this.getUserCommentCount(userId, targetId, targetType, database);
      if (userCommentCount >= this.config.maxCommentsPerUser) {
        throw new Error(`Maximum ${this.config.maxCommentsPerUser} comments per user per song`);
      }

      // Create comment
      const comment = await this.createComment(userId, targetId, targetType, content, parentId, database);
      
      // Update cache
      this.updateCommentCache(targetId, targetType, 'add');
      
      // Track engagement velocity
      if (this.config.trackEngagementVelocity) {
        this.trackEngagementVelocity(targetId, targetType, 'comment');
      }

      const commentCount = await this.getCommentCount(targetId, targetType, database);

      return {
        success: true,
        comment: comment,
        commentCount: commentCount,
        timestamp: moment().toISOString()
      };

    } catch (error) {
      console.error('Comment creation error:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive engagement metrics for a song/collaboration
   */
  async getEngagementMetrics(targetId, targetType, database) {
    try {
      const likeCount = await this.getLikeCount(targetId, targetType, database);
      const commentCount = await this.getCommentCount(targetId, targetType, database);
      
      // Calculate engagement score (likes + comments with comment weight)
      const engagementScore = likeCount + (commentCount * 2); // Comments worth 2x likes
      
      // Get velocity metrics if enabled
      let velocityMetrics = null;
      if (this.config.trackEngagementVelocity) {
        velocityMetrics = this.getEngagementVelocity(targetId, targetType);
      }

      return {
        targetId,
        targetType,
        likes: likeCount,
        comments: commentCount,
        engagementScore,
        velocityMetrics,
        lastUpdated: moment().toISOString()
      };

    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard of most engaged content
   */
  async getEngagementLeaderboard(targetType, limit = 10, database) {
    try {
      // Get all content with engagement metrics
      const content = await this.getAllContentWithEngagement(targetType, database);
      
      // Sort by engagement score (likes + comments * 2)
      const sortedContent = content
        .map(item => ({
          ...item,
          engagementScore: item.likes + (item.comments * 2)
        }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);

      return {
        targetType,
        leaderboard: sortedContent,
        generatedAt: moment().toISOString()
      };

    } catch (error) {
      console.error('Error generating engagement leaderboard:', error);
      throw error;
    }
  }

  /**
   * Find existing vote by user for target
   */
  async findExistingVote(userId, targetId, targetType, database) {
    const { Vote } = database;
    
    const vote = await Vote.findOne({
      where: {
        userId,
        [`${targetType}Id`]: targetId,
        value: 1 // Like
      }
    });

    return vote;
  }

  /**
   * Create new vote record
   */
  async createVote(userId, targetId, targetType, database) {
    const { Vote } = database;
    
    const voteData = {
      userId,
      value: 1, // Like
      weight: 1.0, // All votes equal weight
      category: 'overall'
    };

    // Set the appropriate foreign key
    voteData[`${targetType}Id`] = targetId;

    return await Vote.create(voteData);
  }

  /**
   * Remove vote record
   */
  async removeVote(userId, targetId, targetType, database) {
    const { Vote } = database;
    
    const whereClause = {
      userId,
      value: 1
    };
    whereClause[`${targetType}Id`] = targetId;

    await Vote.destroy({ where: whereClause });
  }

  /**
   * Get like count for target
   */
  async getLikeCount(targetId, targetType, database) {
    const { Vote } = database;
    
    const whereClause = {
      value: 1
    };
    whereClause[`${targetType}Id`] = targetId;

    return await Vote.count({ where: whereClause });
  }

  /**
   * Create comment record
   */
  async createComment(userId, targetId, targetType, content, parentId, database) {
    const { Comment } = database;
    
    const commentData = {
      userId,
      content,
      parentId
    };

    // Set the appropriate foreign key
    commentData[`${targetType}Id`] = targetId;

    return await Comment.create(commentData);
  }

  /**
   * Get comment count for target
   */
  async getCommentCount(targetId, targetType, database) {
    const { Comment } = database;
    
    const whereClause = {};
    whereClause[`${targetType}Id`] = targetId;

    return await Comment.count({ where: whereClause });
  }

  /**
   * Get user's comment count for specific target
   */
  async getUserCommentCount(userId, targetId, targetType, database) {
    const { Comment } = database;
    
    const whereClause = {
      userId
    };
    whereClause[`${targetType}Id`] = targetId;

    return await Comment.count({ where: whereClause });
  }

  /**
   * Get all content with engagement metrics
   */
  async getAllContentWithEngagement(targetType, database) {
    const { Vote, Comment } = database;
    const model = targetType === 'song' ? database.Song : database.Collaboration;
    
    const content = await model.findAll({
      attributes: [
        'id',
        'title',
        'userId',
        'createdAt'
      ],
      include: [
        {
          model: Vote,
          attributes: [],
          required: false
        },
        {
          model: Comment,
          attributes: [],
          required: false
        }
      ],
      group: ['id'],
      raw: true
    });

    // Get engagement counts for each item
    const contentWithEngagement = await Promise.all(
      content.map(async (item) => {
        const likes = await this.getLikeCount(item.id, targetType, database);
        const comments = await this.getCommentCount(item.id, targetType, database);
        
        return {
          ...item,
          likes,
          comments
        };
      })
    );

    return contentWithEngagement;
  }

  /**
   * Update vote cache for real-time updates
   */
  updateVoteCache(targetId, targetType, action) {
    const key = `${targetType}:${targetId}`;
    const current = this.voteCache.get(key) || { likes: 0, lastUpdated: Date.now() };
    
    if (action === 'like') {
      current.likes += 1;
    } else if (action === 'unlike') {
      current.likes = Math.max(0, current.likes - 1);
    }
    
    current.lastUpdated = Date.now();
    this.voteCache.set(key, current);
  }

  /**
   * Update comment cache for real-time updates
   */
  updateCommentCache(targetId, targetType, action) {
    const key = `${targetType}:${targetId}`;
    const current = this.commentCache.get(key) || { comments: 0, lastUpdated: Date.now() };
    
    if (action === 'add') {
      current.comments += 1;
    }
    
    current.lastUpdated = Date.now();
    this.commentCache.set(key, current);
  }

  /**
   * Track engagement velocity for trending calculations
   */
  trackEngagementVelocity(targetId, targetType, engagementType) {
    const key = `${targetType}:${targetId}`;
    const now = Date.now();
    
    if (!this.engagementMetrics.has(key)) {
      this.engagementMetrics.set(key, {
        likes: [],
        comments: [],
        windows: []
      });
    }
    
    const metrics = this.engagementMetrics.get(key);
    
    // Add engagement event
    if (engagementType === 'like') {
      metrics.likes.push(now);
    } else if (engagementType === 'comment') {
      metrics.comments.push(now);
    }
    
    // Clean old events outside window
    const windowMs = this.config.velocityTimeWindow * 60 * 60 * 1000; // Convert hours to ms
    const cutoff = now - windowMs;
    
    metrics.likes = metrics.likes.filter(timestamp => timestamp > cutoff);
    metrics.comments = metrics.comments.filter(timestamp => timestamp > cutoff);
    
    this.engagementMetrics.set(key, metrics);
  }

  /**
   * Get engagement velocity metrics
   */
  getEngagementVelocity(targetId, targetType) {
    const key = `${targetType}:${targetId}`;
    const metrics = this.engagementMetrics.get(key);
    
    if (!metrics) {
      return {
        likesPerHour: 0,
        commentsPerHour: 0,
        totalEngagementPerHour: 0
      };
    }
    
    const likesPerHour = metrics.likes.length / this.config.velocityTimeWindow;
    const commentsPerHour = metrics.comments.length / this.config.velocityTimeWindow;
    
    return {
      likesPerHour: Math.round(likesPerHour * 100) / 100,
      commentsPerHour: Math.round(commentsPerHour * 100) / 100,
      totalEngagementPerHour: Math.round((likesPerHour + commentsPerHour * 2) * 100) / 100
    };
  }

  /**
   * Get cached engagement data for real-time updates
   */
  getCachedEngagement(targetId, targetType) {
    const voteKey = `${targetType}:${targetId}`;
    const commentKey = `${targetType}:${targetId}`;
    
    const votes = this.voteCache.get(voteKey) || { likes: 0 };
    const comments = this.commentCache.get(commentKey) || { comments: 0 };
    
    return {
      likes: votes.likes,
      comments: comments.comments,
      engagementScore: votes.likes + (comments.comments * 2)
    };
  }

  /**
   * Clear caches (for cleanup)
   */
  clearCaches() {
    this.voteCache.clear();
    this.commentCache.clear();
    this.engagementMetrics.clear();
    console.log('🧹 Voting caches cleared');
  }
}

module.exports = SimpleVotingMechanics; 