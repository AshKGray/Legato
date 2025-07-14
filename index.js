const TrendingAlgorithm = require('./algorithms/trending');
const ChartService = require('./services/chart-service');
const RecommendationEngine = require('./discovery/recommendation-engine');
const SearchService = require('./services/search-service');
const cron = require('node-cron');
const moment = require('moment');

/**
 * Legato Charts & Discovery System - Main Orchestrator
 * 
 * Coordinates all chart generation, discovery recommendations, 
 * and search functionality for the Legato music platform.
 */

class ChartsDiscoveryOrchestrator {
  constructor(config = {}) {
    this.config = {
      // Cron schedule for chart updates
      chartUpdateSchedule: config.chartUpdateSchedule || '*/15 * * * *', // Every 15 minutes
      
      // Cache configuration
      enableCaching: config.enableCaching !== false,
      chartCacheTTL: config.chartCacheTTL || 900, // 15 minutes
      
      // Supported genres
      supportedGenres: config.supportedGenres || [
        'pop', 'rock', 'hip-hop', 'jazz', 'electronic', 'classical', 
        'country', 'r&b', 'folk', 'indie', 'metal', 'reggae'
      ],
      
      // Chart generation config
      trendingConfig: config.trendingConfig || {},
      chartConfig: config.chartConfig || {},
      discoveryConfig: config.discoveryConfig || {},
      searchConfig: config.searchConfig || {},
      
      ...config
    };

    // Initialize services
    this.trendingAlgorithm = new TrendingAlgorithm(this.config.trendingConfig);
    this.chartService = new ChartService({
      ...this.config.chartConfig,
      trendingConfig: this.config.trendingConfig,
      cacheEnabled: this.config.enableCaching,
      cacheTTL: this.config.chartCacheTTL
    });
    this.recommendationEngine = new RecommendationEngine(this.config.discoveryConfig);
    this.searchService = new SearchService(this.config.searchConfig);

    // Internal state
    this.isInitialized = false;
    this.latestCharts = null;
    this.chartGenerationInProgress = false;

    console.log('🎯 Charts & Discovery Orchestrator initialized');
  }

  /**
   * Initialize the orchestrator and start background processes
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️  Orchestrator already initialized');
      return;
    }

    console.log('🚀 Initializing Charts & Discovery System...');

    try {
      // Start scheduled chart generation
      this.startChartUpdateScheduler();
      
      this.isInitialized = true;
      console.log('✅ Charts & Discovery System initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Charts & Discovery System:', error);
      throw error;
    }
  }

  /**
   * Start the scheduled chart update process
   */
  startChartUpdateScheduler() {
    if (this.config.chartUpdateSchedule) {
      console.log(`📅 Starting chart update scheduler: ${this.config.chartUpdateSchedule}`);
      
      cron.schedule(this.config.chartUpdateSchedule, async () => {
        try {
          console.log('🔄 Running scheduled chart update...');
          await this.generateAllChartsBackground();
        } catch (error) {
          console.error('❌ Scheduled chart update failed:', error);
        }
      });
    }
  }

  /**
   * Generate all charts in the background (for scheduled updates)
   */
  async generateAllChartsBackground() {
    if (this.chartGenerationInProgress) {
      console.log('⏭️  Chart generation already in progress, skipping...');
      return;
    }

    this.chartGenerationInProgress = true;
    
    try {
      // In a real implementation, this would fetch from the database
      // For now, we'll simulate with empty data
      const mockData = {
        songs: [],
        users: []
      };
      
      const charts = await this.chartService.generateAllCharts(
        mockData.songs,
        mockData.users,
        this.config.supportedGenres
      );
      
      this.latestCharts = charts;
      console.log('✅ Background chart generation completed');
      
    } catch (error) {
      console.error('❌ Background chart generation failed:', error);
    } finally {
      this.chartGenerationInProgress = false;
    }
  }

  /**
   * PUBLIC API METHODS
   */

  /**
   * Get all available charts
   */
  async getAllCharts(songsData = [], usersData = []) {
    try {
      const charts = await this.chartService.generateAllCharts(
        songsData,
        usersData,
        this.config.supportedGenres
      );

      return {
        success: true,
        data: charts,
        metadata: {
          generatedAt: moment().toISOString(),
          supportedGenres: this.config.supportedGenres,
          algorithm: 'trending_v1'
        }
      };
    } catch (error) {
      console.error('Error generating charts:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get a specific chart type
   */
  async getChart(chartType, songsData = [], usersData = [], options = {}) {
    try {
      let chart;

      switch (chartType) {
        case 'overall':
          chart = await this.chartService.generateOverallChart(songsData, options);
          break;
        case 'genre':
          const genre = options.genre;
          if (!genre) throw new Error('Genre is required for genre charts');
          const genreCharts = await this.chartService.generateGenreCharts(songsData, [genre], options);
          chart = genreCharts[genre];
          break;
        case 'rising-stars':
          chart = await this.chartService.generateRisingStarsChart(songsData, usersData, options);
          break;
        case 'collaboration':
          chart = await this.chartService.generateCollaborationChart(songsData, options);
          break;
        case 'daily':
          chart = await this.chartService.generateDailyChart(songsData, options);
          break;
        case 'weekly':
          chart = await this.chartService.generateWeeklyChart(songsData, options);
          break;
        default:
          throw new Error(`Unknown chart type: ${chartType}`);
      }

      return {
        success: true,
        data: chart,
        metadata: {
          chartType,
          generatedAt: moment().toISOString()
        }
      };
    } catch (error) {
      console.error(`Error generating ${chartType} chart:`, error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(userId, songsData = [], usersData = [], userInteractions = [], options = {}) {
    try {
      const recommendations = await this.recommendationEngine.getPersonalizedRecommendations(
        userId,
        songsData,
        usersData,
        userInteractions
      );

      return {
        success: true,
        data: recommendations,
        metadata: {
          userId,
          generatedAt: moment().toISOString(),
          algorithm: 'hybrid_v1'
        }
      };
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get collaboration opportunities for a user
   */
  async getCollaborationOpportunities(userId, songsData = [], usersData = [], userInteractions = [], options = {}) {
    try {
      const opportunities = await this.recommendationEngine.getCollaborationOpportunities(
        userId,
        songsData,
        usersData,
        userInteractions
      );

      return {
        success: true,
        data: opportunities,
        metadata: {
          userId,
          generatedAt: moment().toISOString()
        }
      };
    } catch (error) {
      console.error('Error finding collaboration opportunities:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Search songs with advanced filtering
   */
  async searchSongs(query = '', filters = {}, options = {}) {
    try {
      const results = await this.searchService.searchSongs(query, filters, options);

      return {
        success: true,
        data: results,
        metadata: {
          query,
          searchType: 'songs',
          generatedAt: moment().toISOString()
        }
      };
    } catch (error) {
      console.error('Error searching songs:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Search users with advanced filtering
   */
  async searchUsers(query = '', filters = {}, options = {}) {
    try {
      const results = await this.searchService.searchUsers(query, filters, options);

      return {
        success: true,
        data: results,
        metadata: {
          query,
          searchType: 'users',
          generatedAt: moment().toISOString()
        }
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Search collaboration opportunities
   */
  async searchCollaborationOpportunities(query = '', filters = {}, options = {}) {
    try {
      const results = await this.searchService.searchCollaborationOpportunities(query, filters, options);

      return {
        success: true,
        data: results,
        metadata: {
          query,
          searchType: 'collaborations',
          generatedAt: moment().toISOString()
        }
      };
    } catch (error) {
      console.error('Error searching collaboration opportunities:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get auto-complete suggestions
   */
  async getAutocompleteSuggestions(query, type = 'songs', options = {}) {
    try {
      const suggestions = await this.searchService.getAutocompleteSuggestions(query, type, options);

      return {
        success: true,
        data: suggestions,
        metadata: {
          query,
          type,
          generatedAt: moment().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting autocomplete suggestions:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Calculate trending score for a single song
   */
  async calculateTrendingScore(songData, options = {}) {
    try {
      const score = this.trendingAlgorithm.calculateTrendingScore(songData);

      return {
        success: true,
        data: score,
        metadata: {
          songId: songData.id,
          calculatedAt: moment().toISOString(),
          algorithm: 'trending_v1'
        }
      };
    } catch (error) {
      console.error('Error calculating trending score:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.chartService.clearCache();
    this.latestCharts = null;
    console.log('🧹 All caches cleared');
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      chartGenerationInProgress: this.chartGenerationInProgress,
      latestChartsAvailable: !!this.latestCharts,
      latestChartsGenerated: this.latestCharts?.generatedAt || null,
      supportedGenres: this.config.supportedGenres,
      services: {
        trendingAlgorithm: !!this.trendingAlgorithm,
        chartService: !!this.chartService,
        recommendationEngine: !!this.recommendationEngine,
        searchService: !!this.searchService
      },
      config: {
        chartUpdateSchedule: this.config.chartUpdateSchedule,
        enableCaching: this.config.enableCaching,
        chartCacheTTL: this.config.chartCacheTTL
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update service configurations
    if (newConfig.trendingConfig) {
      this.trendingAlgorithm.updateConfig(newConfig.trendingConfig);
    }
    
    console.log('⚙️  Configuration updated');
  }

  /**
   * Shutdown the orchestrator gracefully
   */
  async shutdown() {
    console.log('🔄 Shutting down Charts & Discovery System...');
    
    // Clear any ongoing processes
    this.chartGenerationInProgress = false;
    this.clearAllCaches();
    
    this.isInitialized = false;
    console.log('✅ Charts & Discovery System shut down successfully');
  }
}

// Export both the class and a default instance
module.exports = ChartsDiscoveryOrchestrator;

// If this file is run directly, start the orchestrator
if (require.main === module) {
  const orchestrator = new ChartsDiscoveryOrchestrator();
  
  orchestrator.initialize().then(() => {
    console.log('🎉 Charts & Discovery System is running!');
    console.log('📊 System Status:', JSON.stringify(orchestrator.getSystemStatus(), null, 2));
  }).catch(error => {
    console.error('💥 Failed to start Charts & Discovery System:', error);
    process.exit(1);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    await orchestrator.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await orchestrator.shutdown();
    process.exit(0);
  });
} 