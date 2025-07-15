const moment = require('moment');
const _ = require('lodash');

/**
 * Version Management System for Legato
 * 
 * Handles:
 * - 7-day collaboration periods for songs
 * - Featured version selection based on likes/comments
 * - Version hierarchy and ranking
 * - Automatic promotion of popular collaborations
 * - Collaboration window management
 */

class VersionManager {
  constructor(config = {}) {
    this.config = {
      // Collaboration window settings
      collaborationWindowHours: config.collaborationWindowHours || 168, // 7 days = 168 hours
      
      // Version ranking settings
      engagementScoreWeight: config.engagementScoreWeight || 1.0,
      commentMultiplier: config.commentMultiplier || 2, // Comments worth 2x likes
      
      // Featured version criteria
      minimumEngagementForFeatured: config.minimumEngagementForFeatured || 5,
      
      // Cleanup settings
      enableAutoCleanup: config.enableAutoCleanup !== false,
      
      ...config
    };

    // Track collaboration windows
    this.collaborationWindows = new Map();
    this.versionHierarchy = new Map();
    
    console.log('🔄 Version Manager initialized');
  }

  /**
   * Create a new song and start its collaboration window
   */
  async createSongWithCollaborationWindow(songData, database) {
    try {
      const { Song } = database;
      
      // Create song with collaboration window
      const song = await Song.create({
        ...songData,
        collaborationStartTime: moment().toISOString(),
        collaborationEndTime: moment().add(this.config.collaborationWindowHours, 'hours').toISOString(),
        isCollaborationOpen: true,
        featuredVersionId: null // Will be set to original song's collaboration
      });

      // Create initial collaboration (original version)
      const originalCollaboration = await this.createOriginalCollaboration(song, database);
      
      // Set original as featured version
      await song.update({
        featuredVersionId: originalCollaboration.id
      });

      // Track collaboration window
      this.trackCollaborationWindow(song.id, song.collaborationStartTime, song.collaborationEndTime);

      console.log(`🎵 Song "${song.title}" created with 7-day collaboration window`);
      
      return {
        song,
        originalCollaboration,
        collaborationWindow: {
          startTime: song.collaborationStartTime,
          endTime: song.collaborationEndTime,
          hoursRemaining: this.getHoursRemaining(song.collaborationEndTime)
        }
      };

    } catch (error) {
      console.error('Error creating song with collaboration window:', error);
      throw error;
    }
  }

  /**
   * Join a song with a new collaboration
   */
  async joinSongCollaboration(songId, userId, collaborationData, database) {
    try {
      const { Song, Collaboration } = database;
      
      // Check if collaboration window is still open
      const song = await Song.findByPk(songId);
      if (!song) {
        throw new Error('Song not found');
      }

      if (!this.isCollaborationWindowOpen(song)) {
        throw new Error('Collaboration window has closed for this song');
      }

      // Create new collaboration
      const collaboration = await Collaboration.create({
        ...collaborationData,
        userId,
        songId,
        version: await this.getNextVersionNumber(songId, database),
        parentId: collaborationData.parentId || null
      });

      // Update version hierarchy
      await this.updateVersionHierarchy(songId, database);

      console.log(`🎤 User ${userId} joined song ${songId} with collaboration ${collaboration.id}`);
      
      return {
        collaboration,
        versionNumber: collaboration.version,
        collaborationWindow: {
          hoursRemaining: this.getHoursRemaining(song.collaborationEndTime)
        }
      };

    } catch (error) {
      console.error('Error joining song collaboration:', error);
      throw error;
    }
  }

  /**
   * Update featured version based on engagement metrics
   */
  async updateFeaturedVersion(songId, database, votingMechanics) {
    try {
      const { Song, Collaboration } = database;
      
      // Get all collaborations for this song
      const collaborations = await Collaboration.findAll({
        where: { songId },
        include: [
          {
            model: database.User,
            attributes: ['id', 'username', 'displayName']
          }
        ]
      });

      if (collaborations.length === 0) {
        return null;
      }

      // Calculate engagement scores for each collaboration
      const collaborationsWithEngagement = await Promise.all(
        collaborations.map(async (collab) => {
          const metrics = await votingMechanics.getEngagementMetrics(
            collab.id, 
            'collaboration', 
            database
          );
          
          return {
            ...collab.toJSON(),
            engagementScore: metrics.engagementScore,
            likes: metrics.likes,
            comments: metrics.comments
          };
        })
      );

      // Sort by engagement score (highest first)
      const sortedCollaborations = collaborationsWithEngagement
        .sort((a, b) => b.engagementScore - a.engagementScore);

      // Get current featured version
      const song = await Song.findByPk(songId);
      const currentFeaturedId = song.featuredVersionId;
      const newFeaturedVersion = sortedCollaborations[0];

      // Check if featured version should change
      if (currentFeaturedId !== newFeaturedVersion.id) {
        // Update featured version
        await song.update({
          featuredVersionId: newFeaturedVersion.id
        });

        console.log(`⭐ Featured version updated for song ${songId}: ${newFeaturedVersion.id} (${newFeaturedVersion.engagementScore} engagement)`);
        
        return {
          changed: true,
          previousFeaturedId: currentFeaturedId,
          newFeaturedId: newFeaturedVersion.id,
          newFeaturedEngagement: newFeaturedVersion.engagementScore
        };
      }

      return {
        changed: false,
        currentFeaturedId: currentFeaturedId,
        currentEngagement: newFeaturedVersion.engagementScore
      };

    } catch (error) {
      console.error('Error updating featured version:', error);
      throw error;
    }
  }

  /**
   * Get version hierarchy for a song
   */
  async getVersionHierarchy(songId, database, votingMechanics) {
    try {
      const { Song, Collaboration } = database;
      
      // Get song with featured version info
      const song = await Song.findByPk(songId, {
        include: [
          {
            model: database.User,
            attributes: ['id', 'username', 'displayName']
          }
        ]
      });

      if (!song) {
        throw new Error('Song not found');
      }

      // Get all collaborations
      const collaborations = await Collaboration.findAll({
        where: { songId },
        include: [
          {
            model: database.User,
            attributes: ['id', 'username', 'displayName']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      // Add engagement metrics to each collaboration
      const collaborationsWithMetrics = await Promise.all(
        collaborations.map(async (collab) => {
          const metrics = await votingMechanics.getEngagementMetrics(
            collab.id, 
            'collaboration', 
            database
          );
          
          return {
            ...collab.toJSON(),
            engagementScore: metrics.engagementScore,
            likes: metrics.likes,
            comments: metrics.comments,
            isFeatured: collab.id === song.featuredVersionId
          };
        })
      );

      // Sort by engagement score for ranking
      const sortedByEngagement = [...collaborationsWithMetrics]
        .sort((a, b) => b.engagementScore - a.engagementScore);

      // Get collaboration window info
      const windowInfo = this.getCollaborationWindowInfo(song);

      return {
        song: {
          id: song.id,
          title: song.title,
          userId: song.userId,
          user: song.User,
          featuredVersionId: song.featuredVersionId
        },
        collaborationWindow: windowInfo,
        featuredVersion: collaborationsWithMetrics.find(c => c.isFeatured),
        allVersions: collaborationsWithMetrics,
        versionsByEngagement: sortedByEngagement,
        totalVersions: collaborations.length
      };

    } catch (error) {
      console.error('Error getting version hierarchy:', error);
      throw error;
    }
  }

  /**
   * Close collaboration window for a song
   */
  async closeCollaborationWindow(songId, database) {
    try {
      const { Song } = database;
      
      const song = await Song.findByPk(songId);
      if (!song) {
        throw new Error('Song not found');
      }

      // Close collaboration window
      await song.update({
        isCollaborationOpen: false,
        collaborationEndTime: moment().toISOString()
      });

      // Remove from tracking
      this.collaborationWindows.delete(songId);

      console.log(`🔒 Collaboration window closed for song ${songId}`);
      
      return {
        songId,
        closedAt: moment().toISOString(),
        totalCollaborations: await this.getCollaborationCount(songId, database)
      };

    } catch (error) {
      console.error('Error closing collaboration window:', error);
      throw error;
    }
  }

  /**
   * Get songs with open collaboration windows
   */
  async getOpenCollaborations(database, limit = 20) {
    try {
      const { Song } = database;
      
      const openSongs = await Song.findAll({
        where: {
          isCollaborationOpen: true,
          collaborationEndTime: {
            [database.Sequelize.Op.gt]: moment().toISOString()
          }
        },
        include: [
          {
            model: database.User,
            attributes: ['id', 'username', 'displayName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      // Add window info to each song
      const songsWithWindowInfo = openSongs.map(song => ({
        ...song.toJSON(),
        collaborationWindow: this.getCollaborationWindowInfo(song)
      }));

      return {
        openCollaborations: songsWithWindowInfo,
        totalOpen: openSongs.length
      };

    } catch (error) {
      console.error('Error getting open collaborations:', error);
      throw error;
    }
  }

  /**
   * Auto-cleanup expired collaboration windows
   */
  async cleanupExpiredWindows(database) {
    try {
      const { Song } = database;
      
      // Find expired windows
      const expiredSongs = await Song.findAll({
        where: {
          isCollaborationOpen: true,
          collaborationEndTime: {
            [database.Sequelize.Op.lt]: moment().toISOString()
          }
        }
      });

      // Close expired windows
      const closedWindows = [];
      for (const song of expiredSongs) {
        const result = await this.closeCollaborationWindow(song.id, database);
        closedWindows.push(result);
      }

      if (closedWindows.length > 0) {
        console.log(`🧹 Cleaned up ${closedWindows.length} expired collaboration windows`);
      }

      return {
        cleanedUp: closedWindows.length,
        closedWindows
      };

    } catch (error) {
      console.error('Error cleaning up expired windows:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Create original collaboration for a new song
   */
  async createOriginalCollaboration(song, database) {
    const { Collaboration } = database;
    
    return await Collaboration.create({
      userId: song.userId,
      songId: song.id,
      notes: 'Original version',
      version: 1,
      parentId: null,
      audioUrl: song.audioUrl // Copy from song
    });
  }

  /**
   * Check if collaboration window is open
   */
  isCollaborationWindowOpen(song) {
    return song.isCollaborationOpen && 
           moment().isBefore(moment(song.collaborationEndTime));
  }

  /**
   * Get hours remaining in collaboration window
   */
  getHoursRemaining(endTime) {
    const now = moment();
    const end = moment(endTime);
    
    if (now.isAfter(end)) {
      return 0;
    }
    
    return Math.ceil(end.diff(now, 'hours', true));
  }

  /**
   * Get collaboration window info
   */
  getCollaborationWindowInfo(song) {
    const hoursRemaining = this.getHoursRemaining(song.collaborationEndTime);
    const totalHours = this.config.collaborationWindowHours;
    const percentComplete = Math.max(0, Math.min(100, 
      ((totalHours - hoursRemaining) / totalHours) * 100
    ));

    return {
      isOpen: this.isCollaborationWindowOpen(song),
      startTime: song.collaborationStartTime,
      endTime: song.collaborationEndTime,
      hoursRemaining,
      totalHours,
      percentComplete: Math.round(percentComplete)
    };
  }

  /**
   * Track collaboration window
   */
  trackCollaborationWindow(songId, startTime, endTime) {
    this.collaborationWindows.set(songId, {
      startTime,
      endTime,
      isOpen: true
    });
  }

  /**
   * Get next version number for a song
   */
  async getNextVersionNumber(songId, database) {
    const { Collaboration } = database;
    
    const maxVersion = await Collaboration.max('version', {
      where: { songId }
    });
    
    return (maxVersion || 0) + 1;
  }

  /**
   * Update version hierarchy tracking
   */
  async updateVersionHierarchy(songId, database) {
    // This could be expanded for more complex hierarchy tracking
    // For now, we rely on the database queries
    return true;
  }

  /**
   * Get collaboration count for a song
   */
  async getCollaborationCount(songId, database) {
    const { Collaboration } = database;
    
    return await Collaboration.count({
      where: { songId }
    });
  }

  /**
   * Get collaboration window statistics
   */
  getWindowStatistics() {
    const activeWindows = Array.from(this.collaborationWindows.entries())
      .filter(([_, window]) => window.isOpen);
    
    return {
      totalTrackedWindows: this.collaborationWindows.size,
      activeWindows: activeWindows.length,
      averageWindowAge: this.calculateAverageWindowAge(activeWindows)
    };
  }

  /**
   * Calculate average window age
   */
  calculateAverageWindowAge(activeWindows) {
    if (activeWindows.length === 0) return 0;
    
    const totalAge = activeWindows.reduce((sum, [_, window]) => {
      const age = moment().diff(moment(window.startTime), 'hours');
      return sum + age;
    }, 0);
    
    return Math.round(totalAge / activeWindows.length);
  }
}

module.exports = VersionManager; 