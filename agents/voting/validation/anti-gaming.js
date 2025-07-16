const { RateLimiterRedis } = require('rate-limiter-flexible');
const moment = require('moment');

/**
 * Anti-Gaming System for Legato Voting
 * 
 * Simple abuse prevention without complex reputation:
 * - Rate limiting for likes and comments
 * - Basic validation and spam detection
 * - User activity monitoring
 * - Automatic flagging of suspicious behavior
 */

class AntiGamingSystem {
  constructor(config = {}) {
    this.config = {
      // Rate limiting
      likesPerMinute: config.likesPerMinute || 10,
      commentsPerMinute: config.commentsPerMinute || 5,
      likesPerHour: config.likesPerHour || 100,
      commentsPerHour: config.commentsPerHour || 50,
      
      // Validation thresholds
      maxCommentLength: config.maxCommentLength || 500,
      minCommentLength: config.minCommentLength || 2,
      maxSimilarComments: config.maxSimilarComments || 3,
      
      // Spam detection
      enableSpamDetection: config.enableSpamDetection !== false,
      suspiciousPatternThreshold: config.suspiciousPatternThreshold || 0.8,
      
      // Cooldown periods
      likeSpamCooldown: config.likeSpamCooldown || 300, // 5 minutes
      commentSpamCooldown: config.commentSpamCooldown || 600, // 10 minutes
      
      // Redis configuration (optional)
      redisConfig: config.redisConfig || null,
      
      ...config
    };

    // Initialize rate limiters
    this.initializeRateLimiters();
    
    // Tracking maps
    this.userActivity = new Map();
    this.suspiciousActivity = new Map();
    this.commentHistory = new Map();
    
    console.log('🛡️ Anti-Gaming System initialized');
  }

  /**
   * Validate like action before processing
   */
  async validateLike(userId, targetId, targetType) {
    try {
      // Check rate limits
      const rateLimitCheck = await this.checkLikeRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return {
          valid: false,
          reason: 'rate_limit_exceeded',
          message: `Too many likes. Try again in ${rateLimitCheck.msBeforeNext}ms`,
          retryAfter: rateLimitCheck.msBeforeNext
        };
      }

      // Check for suspicious patterns
      const suspiciousCheck = this.checkSuspiciousLikePattern(userId, targetId, targetType);
      if (!suspiciousCheck.valid) {
        return suspiciousCheck;
      }

      // Track user activity
      this.trackUserActivity(userId, 'like', { targetId, targetType });

      return {
        valid: true,
        message: 'Like validation passed'
      };

    } catch (error) {
      console.error('Error validating like:', error);
      return {
        valid: false,
        reason: 'validation_error',
        message: 'Unable to validate like action'
      };
    }
  }

  /**
   * Validate comment before processing
   */
  async validateComment(userId, targetId, targetType, content) {
    try {
      // Check rate limits
      const rateLimitCheck = await this.checkCommentRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return {
          valid: false,
          reason: 'rate_limit_exceeded',
          message: `Too many comments. Try again in ${rateLimitCheck.msBeforeNext}ms`,
          retryAfter: rateLimitCheck.msBeforeNext
        };
      }

      // Validate comment content
      const contentCheck = this.validateCommentContent(content);
      if (!contentCheck.valid) {
        return contentCheck;
      }

      // Check for spam patterns
      const spamCheck = this.checkCommentSpam(userId, content);
      if (!spamCheck.valid) {
        return spamCheck;
      }

      // Check for suspicious patterns
      const suspiciousCheck = this.checkSuspiciousCommentPattern(userId, targetId, targetType);
      if (!suspiciousCheck.valid) {
        return suspiciousCheck;
      }

      // Track comment history
      this.trackCommentHistory(userId, content, targetId, targetType);

      // Track user activity
      this.trackUserActivity(userId, 'comment', { targetId, targetType, content });

      return {
        valid: true,
        message: 'Comment validation passed'
      };

    } catch (error) {
      console.error('Error validating comment:', error);
      return {
        valid: false,
        reason: 'validation_error',
        message: 'Unable to validate comment'
      };
    }
  }

  /**
   * Check if user is currently restricted
   */
  isUserRestricted(userId) {
    const restrictions = this.suspiciousActivity.get(userId);
    if (!restrictions) return { restricted: false };

    const now = Date.now();
    const activeRestrictions = restrictions.filter(r => r.expiresAt > now);

    if (activeRestrictions.length > 0) {
      return {
        restricted: true,
        restrictions: activeRestrictions,
        message: 'User is temporarily restricted due to suspicious activity'
      };
    }

    return { restricted: false };
  }

  /**
   * Report suspicious activity
   */
  reportSuspiciousActivity(userId, activityType, details = {}) {
    const now = Date.now();
    const restriction = {
      type: activityType,
      reportedAt: now,
      expiresAt: now + this.getCooldownPeriod(activityType),
      details,
      severity: this.calculateSeverity(activityType, details)
    };

    if (!this.suspiciousActivity.has(userId)) {
      this.suspiciousActivity.set(userId, []);
    }

    this.suspiciousActivity.get(userId).push(restriction);
    
    console.log(`🚨 Suspicious activity reported for user ${userId}: ${activityType}`);
    
    return restriction;
  }

  /**
   * Get user activity statistics
   */
  getUserActivityStats(userId) {
    const activity = this.userActivity.get(userId);
    if (!activity) {
      return {
        userId,
        totalLikes: 0,
        totalComments: 0,
        recentActivity: [],
        suspiciousReports: 0
      };
    }

    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const recentActivity = activity.filter(a => a.timestamp > hourAgo);

    return {
      userId,
      totalLikes: activity.filter(a => a.type === 'like').length,
      totalComments: activity.filter(a => a.type === 'comment').length,
      recentActivity: recentActivity.length,
      suspiciousReports: this.suspiciousActivity.get(userId)?.length || 0,
      lastActivity: activity.length > 0 ? activity[activity.length - 1].timestamp : null
    };
  }

  // Helper Methods

  /**
   * Initialize rate limiters
   */
  initializeRateLimiters() {
    const redisClient = this.config.redisClient || (this.config.redisConfig ? this.config.redisConfig : undefined);
    const rateLimiterOptions = {
      storeClient: redisClient,
      keyPrefix: 'legato_voting_',
    };

    // Like rate limiters
    this.likeLimiterMinute = new RateLimiterRedis({
      ...rateLimiterOptions,
      keyPrefix: 'legato_like_minute_',
      points: this.config.likesPerMinute,
      duration: 60, // 1 minute
    });

    this.likeLimiterHour = new RateLimiterRedis({
      ...rateLimiterOptions,
      keyPrefix: 'legato_like_hour_',
      points: this.config.likesPerHour,
      duration: 3600, // 1 hour
    });

    // Comment rate limiters
    this.commentLimiterMinute = new RateLimiterRedis({
      ...rateLimiterOptions,
      keyPrefix: 'legato_comment_minute_',
      points: this.config.commentsPerMinute,
      duration: 60, // 1 minute
    });

    this.commentLimiterHour = new RateLimiterRedis({
      ...rateLimiterOptions,
      keyPrefix: 'legato_comment_hour_',
      points: this.config.commentsPerHour,
      duration: 3600, // 1 hour
    });
  }

  /**
   * Check like rate limit
   */
  async checkLikeRateLimit(userId) {
    try {
      await this.likeLimiterMinute.consume(userId);
      await this.likeLimiterHour.consume(userId);
      
      return { allowed: true };
    } catch (rateLimiterRes) {
      return {
        allowed: false,
        msBeforeNext: rateLimiterRes.msBeforeNext,
        remainingPoints: rateLimiterRes.remainingPoints
      };
    }
  }

  /**
   * Check comment rate limit
   */
  async checkCommentRateLimit(userId) {
    try {
      await this.commentLimiterMinute.consume(userId);
      await this.commentLimiterHour.consume(userId);
      
      return { allowed: true };
    } catch (rateLimiterRes) {
      return {
        allowed: false,
        msBeforeNext: rateLimiterRes.msBeforeNext,
        remainingPoints: rateLimiterRes.remainingPoints
      };
    }
  }

  /**
   * Validate comment content
   */
  validateCommentContent(content) {
    // Check length
    if (content.length < this.config.minCommentLength) {
      return {
        valid: false,
        reason: 'comment_too_short',
        message: `Comment must be at least ${this.config.minCommentLength} characters`
      };
    }

    if (content.length > this.config.maxCommentLength) {
      return {
        valid: false,
        reason: 'comment_too_long',
        message: `Comment must be less than ${this.config.maxCommentLength} characters`
      };
    }

    // Check for basic spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /^[A-Z\s!]{20,}$/, // All caps
      /https?:\/\/[^\s]+/gi, // URLs (basic check)
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        return {
          valid: false,
          reason: 'spam_pattern_detected',
          message: 'Comment contains suspicious content'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check for comment spam
   */
  checkCommentSpam(userId, content) {
    const userComments = this.commentHistory.get(userId) || [];
    const recentComments = userComments.filter(c => 
      Date.now() - c.timestamp < (60 * 60 * 1000) // Last hour
    );

    // Check for similar comments
    const similarComments = recentComments.filter(c => 
      this.calculateSimilarity(content, c.content) > this.config.suspiciousPatternThreshold
    );

    if (similarComments.length >= this.config.maxSimilarComments) {
      return {
        valid: false,
        reason: 'similar_comments_detected',
        message: 'Too many similar comments detected'
      };
    }

    return { valid: true };
  }

  /**
   * Check suspicious like pattern
   */
  checkSuspiciousLikePattern(userId, targetId, targetType) {
    const userActivity = this.userActivity.get(userId) || [];
    const recentLikes = userActivity.filter(a => 
      a.type === 'like' && 
      Date.now() - a.timestamp < (5 * 60 * 1000) // Last 5 minutes
    );

    // Check for rapid-fire liking
    if (recentLikes.length >= this.config.likesPerMinute) {
      this.reportSuspiciousActivity(userId, 'rapid_liking', {
        recentLikes: recentLikes.length,
        timeWindow: '5_minutes'
      });

      return {
        valid: false,
        reason: 'suspicious_like_pattern',
        message: 'Suspicious liking pattern detected'
      };
    }

    return { valid: true };
  }

  /**
   * Check suspicious comment pattern
   */
  checkSuspiciousCommentPattern(userId, targetId, targetType) {
    const userActivity = this.userActivity.get(userId) || [];
    const recentComments = userActivity.filter(a => 
      a.type === 'comment' && 
      Date.now() - a.timestamp < (10 * 60 * 1000) // Last 10 minutes
    );

    // Check for rapid commenting
    if (recentComments.length >= this.config.commentsPerMinute * 2) {
      this.reportSuspiciousActivity(userId, 'rapid_commenting', {
        recentComments: recentComments.length,
        timeWindow: '10_minutes'
      });

      return {
        valid: false,
        reason: 'suspicious_comment_pattern',
        message: 'Suspicious commenting pattern detected'
      };
    }

    return { valid: true };
  }

  /**
   * Track user activity
   */
  trackUserActivity(userId, activityType, details) {
    if (!this.userActivity.has(userId)) {
      this.userActivity.set(userId, []);
    }

    const activity = {
      type: activityType,
      timestamp: Date.now(),
      details
    };

    this.userActivity.get(userId).push(activity);

    // Keep only recent activity (last 24 hours)
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentActivity = this.userActivity.get(userId).filter(a => a.timestamp > dayAgo);
    this.userActivity.set(userId, recentActivity);
  }

  /**
   * Track comment history
   */
  trackCommentHistory(userId, content, targetId, targetType) {
    if (!this.commentHistory.has(userId)) {
      this.commentHistory.set(userId, []);
    }

    const comment = {
      content,
      targetId,
      targetType,
      timestamp: Date.now()
    };

    this.commentHistory.get(userId).push(comment);

    // Keep only recent comments (last 24 hours)
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentComments = this.commentHistory.get(userId).filter(c => c.timestamp > dayAgo);
    this.commentHistory.set(userId, recentComments);
  }

  /**
   * Calculate text similarity
   */
  calculateSimilarity(text1, text2) {
    const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    if (norm1 === norm2) return 1.0;

    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  /**
   * Get cooldown period for activity type
   */
  getCooldownPeriod(activityType) {
    switch (activityType) {
      case 'rapid_liking':
        return this.config.likeSpamCooldown * 1000;
      case 'rapid_commenting':
        return this.config.commentSpamCooldown * 1000;
      default:
        return 300000; // 5 minutes default
    }
  }

  /**
   * Calculate severity of suspicious activity
   */
  calculateSeverity(activityType, details) {
    switch (activityType) {
      case 'rapid_liking':
        return details.recentLikes > 20 ? 'high' : 'medium';
      case 'rapid_commenting':
        return details.recentComments > 10 ? 'high' : 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Clean up expired data
   */
  cleanup() {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);

    // Clean user activity
    for (const [userId, activities] of this.userActivity.entries()) {
      const recentActivities = activities.filter(a => a.timestamp > dayAgo);
      if (recentActivities.length === 0) {
        this.userActivity.delete(userId);
      } else {
        this.userActivity.set(userId, recentActivities);
      }
    }

    // Clean comment history
    for (const [userId, comments] of this.commentHistory.entries()) {
      const recentComments = comments.filter(c => c.timestamp > dayAgo);
      if (recentComments.length === 0) {
        this.commentHistory.delete(userId);
      } else {
        this.commentHistory.set(userId, recentComments);
      }
    }

    // Clean expired restrictions
    for (const [userId, restrictions] of this.suspiciousActivity.entries()) {
      const activeRestrictions = restrictions.filter(r => r.expiresAt > now);
      if (activeRestrictions.length === 0) {
        this.suspiciousActivity.delete(userId);
      } else {
        this.suspiciousActivity.set(userId, activeRestrictions);
      }
    }

    console.log('🧹 Anti-gaming system cleanup completed');
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return {
      activeUsers: this.userActivity.size,
      usersWithRestrictions: this.suspiciousActivity.size,
      totalCommentHistory: Array.from(this.commentHistory.values()).reduce((sum, comments) => sum + comments.length, 0),
      totalActivity: Array.from(this.userActivity.values()).reduce((sum, activities) => sum + activities.length, 0)
    };
  }
}

module.exports = AntiGamingSystem; 