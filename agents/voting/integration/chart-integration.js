const moment = require('moment');
const _ = require('lodash');
const { Op } = require('sequelize');

/**
 * Chart Integration for Voting System
 * 
 * Feeds engagement data to charts system:
 * - Real-time chart updates based on likes/comments
 * - Trending algorithm integration
 * - Featured version promotion to charts
 * - Engagement velocity tracking for trending
 */

class ChartIntegration {
  constructor(config = {}) {
    this.config = {
      // Update frequencies
      realTimeUpdateInterval: config.realTimeUpdateInterval || 30000, // 30 seconds
      chartUpdateInterval: config.chartUpdateInterval || 300000, // 5 minutes
      
      // Chart configuration
      maxChartSize: config.maxChartSize || 10,
      trendingWindowHours: config.trendingWindowHours || 24,
      
      // Engagement weighting
      likeWeight: config.likeWeight || 1.0,
      commentWeight: config.commentWeight || 2.0,
      velocityWeight: config.velocityWeight || 1.5,
      
      // Chart types
      enableOverallChart: config.enableOverallChart !== false,
      enableGenreCharts: config.enableGenreCharts !== false,
      enableRisingChart: config.enableRisingChart !== false,
      
      ...config
    };

    // Chart data cache
    this.chartCache = new Map();
    this.lastUpdateTime = null;
    this.updateQueue = [];
    
    // Integration state
    this.isIntegrationActive = false;
    this.updateIntervals = [];
    
    console.log('📊 Chart Integration initialized');
  }

  /**
   * Start real-time chart integration
   */
  startIntegration(votingMechanics, versionManager, database) {
    if (this.isIntegrationActive) {
      console.log('Chart integration already active');
      return;
    }

    this.votingMechanics = votingMechanics;
    this.versionManager = versionManager;
    this.database = database;
    this.isIntegrationActive = true;

    // Start update intervals
    this.startUpdateIntervals();
    
    console.log('🚀 Chart integration started');
  }

  /**
   * Stop chart integration
   */
  stopIntegration() {
    if (!this.isIntegrationActive) {
      return;
    }

    // Clear intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals = [];
    
    this.isIntegrationActive = false;
    console.log('⏹️ Chart integration stopped');
  }

  /**
   * Process engagement event for chart updates
   */
  async processEngagementEvent(eventData) {
    try {
      const { targetId, targetType, eventType, userId, timestamp } = eventData;
      
      // Add to update queue
      this.updateQueue.push({
        targetId,
        targetType,
        eventType, // 'like', 'unlike', 'comment'
        userId,
        timestamp: timestamp || moment().toISOString(),
        processed: false
      });

      // Process immediately if it's a high-impact event
      if (this.isHighImpactEvent(eventData)) {
        await this.processUpdateQueue();
      }

      return {
        success: true,
        queued: true,
        queueSize: this.updateQueue.length
      };

    } catch (error) {
      console.error('Error processing engagement event:', error);
      throw error;
    }
  }

  /**
   * Generate overall chart based on engagement
   */
  async generateOverallChart(limit = 10) {
    try {
      // Get all songs with their featured versions
      const songs = await this.getAllSongsWithFeaturedVersions();
      
      // Calculate engagement scores for each song
      const songsWithEngagement = await Promise.all(
        songs.map(async (song) => {
          const featuredCollab = await this.getFeaturedCollaboration(song);
          if (!featuredCollab) return null;
          
          const engagement = await this.votingMechanics.getEngagementMetrics(
            featuredCollab.id, 
            'collaboration', 
            this.database
          );
          
          const velocity = this.calculateEngagementVelocity(featuredCollab.id);
          
          return {
            songId: song.id,
            title: song.title,
            userId: song.userId,
            user: song.User,
            featuredCollaboration: featuredCollab,
            engagement,
            velocity,
            chartScore: this.calculateChartScore(engagement, velocity),
            lastUpdated: moment().toISOString()
          };
        })
      );

      // Filter out null results and sort by chart score
      const validSongs = songsWithEngagement
        .filter(song => song !== null)
        .sort((a, b) => b.chartScore - a.chartScore)
        .slice(0, limit);

      // Cache result
      this.chartCache.set('overall', {
        chart: validSongs,
        generatedAt: moment().toISOString(),
        type: 'overall'
      });

      return {
        chart: validSongs,
        generatedAt: moment().toISOString(),
        totalSongs: validSongs.length
      };

    } catch (error) {
      console.error('Error generating overall chart:', error);
      throw error;
    }
  }

  /**
   * Generate genre-specific charts
   */
  async generateGenreCharts(genres, limit = 10) {
    try {
      const genreCharts = {};
      
      for (const genre of genres) {
        const songs = await this.getSongsByGenre(genre);
        
        const songsWithEngagement = await Promise.all(
          songs.map(async (song) => {
            const featuredCollab = await this.getFeaturedCollaboration(song);
            if (!featuredCollab) return null;
            
            const engagement = await this.votingMechanics.getEngagementMetrics(
              featuredCollab.id, 
              'collaboration', 
              this.database
            );
            
            const velocity = this.calculateEngagementVelocity(featuredCollab.id);
            
            return {
              songId: song.id,
              title: song.title,
              userId: song.userId,
              user: song.User,
              genre: song.genre,
              featuredCollaboration: featuredCollab,
              engagement,
              velocity,
              chartScore: this.calculateChartScore(engagement, velocity)
            };
          })
        );

        const validSongs = songsWithEngagement
          .filter(song => song !== null)
          .sort((a, b) => b.chartScore - a.chartScore)
          .slice(0, limit);

        genreCharts[genre] = {
          chart: validSongs,
          genre,
          generatedAt: moment().toISOString()
        };

        // Cache result
        this.chartCache.set(`genre:${genre}`, genreCharts[genre]);
      }

      return genreCharts;

    } catch (error) {
      console.error('Error generating genre charts:', error);
      throw error;
    }
  }

  /**
   * Generate rising/trending chart based on velocity
   */
  async generateRisingChart(limit = 10) {
    try {
      // Get songs with recent activity
      const recentSongs = await this.getSongsWithRecentActivity(this.config.trendingWindowHours);
      
      const songsWithVelocity = await Promise.all(
        recentSongs.map(async (song) => {
          const featuredCollab = await this.getFeaturedCollaboration(song);
          if (!featuredCollab) return null;
          
          const engagement = await this.votingMechanics.getEngagementMetrics(
            featuredCollab.id, 
            'collaboration', 
            this.database
          );
          
          const velocity = this.calculateEngagementVelocity(featuredCollab.id);
          
          // Rising score emphasizes velocity over total engagement
          const risingScore = (velocity.totalEngagementPerHour * 2) + 
                             (engagement.engagementScore * 0.5);
          
          return {
            songId: song.id,
            title: song.title,
            userId: song.userId,
            user: song.User,
            featuredCollaboration: featuredCollab,
            engagement,
            velocity,
            risingScore,
            trend: this.calculateTrend(velocity)
          };
        })
      );

      const validSongs = songsWithVelocity
        .filter(song => song !== null && song.velocity.totalEngagementPerHour > 0)
        .sort((a, b) => b.risingScore - a.risingScore)
        .slice(0, limit);

      // Cache result
      this.chartCache.set('rising', {
        chart: validSongs,
        generatedAt: moment().toISOString(),
        type: 'rising'
      });

      return {
        chart: validSongs,
        generatedAt: moment().toISOString(),
        totalSongs: validSongs.length
      };

    } catch (error) {
      console.error('Error generating rising chart:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive chart data
   */
  async getComprehensiveChartData() {
    try {
      const chartData = {
        generatedAt: moment().toISOString(),
        charts: {}
      };

      // Generate overall chart
      if (this.config.enableOverallChart) {
        chartData.charts.overall = await this.generateOverallChart();
      }

      // Generate genre charts
      if (this.config.enableGenreCharts) {
        const genres = await this.getActiveGenres();
        chartData.charts.genres = await this.generateGenreCharts(genres);
      }

      // Generate rising chart
      if (this.config.enableRisingChart) {
        chartData.charts.rising = await this.generateRisingChart();
      }

      return chartData;

    } catch (error) {
      console.error('Error getting comprehensive chart data:', error);
      throw error;
    }
  }

  /**
   * Update featured version rankings in charts
   */
  async updateFeaturedVersionRankings(songId) {
    try {
      // Update featured version
      const updateResult = await this.versionManager.updateFeaturedVersion(
        songId, 
        this.database, 
        this.votingMechanics
      );

      if (updateResult && updateResult.changed) {
        // Trigger chart update for this song
        await this.updateSongInCharts(songId);
        
        console.log(`📈 Featured version change triggered chart update for song ${songId}`);
        
        return {
          updated: true,
          songId,
          newFeaturedId: updateResult.newFeaturedId,
          chartUpdateTriggered: true
        };
      }

      return {
        updated: false,
        songId,
        chartUpdateTriggered: false
      };

    } catch (error) {
      console.error('Error updating featured version rankings:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Start update intervals
   */
  startUpdateIntervals() {
    // Real-time updates
    const realTimeInterval = setInterval(() => {
      this.processUpdateQueue();
    }, this.config.realTimeUpdateInterval);

    // Chart updates
    const chartInterval = setInterval(() => {
      this.updateAllCharts();
    }, this.config.chartUpdateInterval);

    this.updateIntervals.push(realTimeInterval, chartInterval);
  }

  /**
   * Process update queue
   */
  async processUpdateQueue() {
    if (this.updateQueue.length === 0) return;

    const unprocessedEvents = this.updateQueue.filter(event => !event.processed);
    
    for (const event of unprocessedEvents) {
      try {
        await this.processIndividualEvent(event);
        event.processed = true;
      } catch (error) {
        console.error('Error processing individual event:', error);
      }
    }

    // Clean up processed events
    this.updateQueue = this.updateQueue.filter(event => !event.processed);
  }

  /**
   * Process individual engagement event
   */
  async processIndividualEvent(event) {
    const { targetId, targetType, eventType } = event;
    
    if (targetType === 'collaboration') {
      // Get song ID from collaboration
      const collaboration = await this.database.Collaboration.findByPk(targetId);
      if (collaboration) {
        await this.updateSongInCharts(collaboration.songId);
        await this.updateFeaturedVersionRankings(collaboration.songId);
      }
    } else if (targetType === 'song') {
      await this.updateSongInCharts(targetId);
      await this.updateFeaturedVersionRankings(targetId);
    }
  }

  /**
   * Update song in charts
   */
  async updateSongInCharts(songId) {
    // This would update the cached chart data for the specific song
    // For now, we'll invalidate the cache to force regeneration
    this.chartCache.delete('overall');
    this.chartCache.delete('rising');
    
    // Also invalidate genre cache if we know the song's genre
    const song = await this.database.Song.findByPk(songId);
    if (song && song.genre) {
      this.chartCache.delete(`genre:${song.genre}`);
    }
  }

  /**
   * Update all charts
   */
  async updateAllCharts() {
    try {
      console.log('🔄 Updating all charts...');
      await this.getComprehensiveChartData();
      this.lastUpdateTime = moment().toISOString();
      console.log('✅ All charts updated');
    } catch (error) {
      console.error('Error updating all charts:', error);
    }
  }

  /**
   * Calculate chart score
   */
  calculateChartScore(engagement, velocity) {
    const baseScore = engagement.engagementScore * this.config.likeWeight;
    const velocityBonus = velocity.totalEngagementPerHour * this.config.velocityWeight;
    
    return baseScore + velocityBonus;
  }

  /**
   * Calculate engagement velocity
   */
  calculateEngagementVelocity(collaborationId) {
    return this.votingMechanics.getEngagementVelocity(collaborationId, 'collaboration');
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(velocity) {
    const totalVelocity = velocity.totalEngagementPerHour;
    
    if (totalVelocity > 10) return 'hot';
    if (totalVelocity > 5) return 'rising';
    if (totalVelocity > 1) return 'steady';
    return 'slow';
  }

  /**
   * Check if event is high impact
   */
  isHighImpactEvent(eventData) {
    // High impact events trigger immediate processing
    return eventData.eventType === 'like' || 
           eventData.eventType === 'comment';
  }

  /**
   * Get all songs with featured versions
   */
  async getAllSongsWithFeaturedVersions() {
    return await this.database.Song.findAll({
      include: [
        {
          model: this.database.User,
          attributes: ['id', 'username', 'displayName']
        }
      ],
      where: {
        featuredVersionId: {
          [Op.ne]: null
        }
      }
    });
  }

  /**
   * Get featured collaboration for a song
   */
  async getFeaturedCollaboration(song) {
    if (!song.featuredVersionId) return null;
    
    return await this.database.Collaboration.findByPk(song.featuredVersionId, {
      include: [
        {
          model: this.database.User,
          attributes: ['id', 'username', 'displayName']
        }
      ]
    });
  }

  /**
   * Get songs by genre
   */
  async getSongsByGenre(genre) {
    return await this.database.Song.findAll({
      where: { genre },
      include: [
        {
          model: this.database.User,
          attributes: ['id', 'username', 'displayName']
        }
      ]
    });
  }

  /**
   * Get songs with recent activity
   */
  async getSongsWithRecentActivity(hours) {
    const cutoff = moment().subtract(hours, 'hours').toISOString();
    
    return await this.database.Song.findAll({
      include: [
        {
          model: this.database.User,
          attributes: ['id', 'username', 'displayName']
        },
        {
          model: this.database.Vote,
          where: {
            createdAt: {
              [Op.gt]: cutoff
            }
          },
          required: false
        },
        {
          model: this.database.Comment,
          where: {
            createdAt: {
              [Op.gt]: cutoff
            }
          },
          required: false
        }
      ]
    });
  }

  /**
   * Get active genres
   */
  async getActiveGenres() {
    const result = await this.database.Song.findAll({
      attributes: ['genre'],
      group: ['genre'],
      where: {
        genre: {
          [Op.ne]: null
        }
      }
    });
    
    return result.map(item => item.genre);
  }

  /**
   * Get cached chart data
   */
  getCachedChart(chartType) {
    return this.chartCache.get(chartType);
  }

  /**
   * Get integration statistics
   */
  getIntegrationStats() {
    return {
      isActive: this.isIntegrationActive,
      lastUpdateTime: this.lastUpdateTime,
      queueSize: this.updateQueue.length,
      cachedCharts: Array.from(this.chartCache.keys()),
      totalEvents: this.updateQueue.length
    };
  }
}

module.exports = ChartIntegration; 