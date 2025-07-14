const _ = require('lodash');
const moment = require('moment');
const TrendingAlgorithm = require('../algorithms/trending');

/**
 * Chart Service for Legato
 * 
 * Generates various types of charts:
 * - Top 10 Overall
 * - Genre Charts
 * - Rising Stars
 * - Collaboration Charts
 * - Daily/Weekly Charts
 */

class ChartService {
  constructor(config = {}) {
    this.config = {
      // Chart sizes
      overallChartSize: config.overallChartSize || 10,
      genreChartSize: config.genreChartSize || 10,
      risingStarsSize: config.risingStarsSize || 10,
      collaborationChartSize: config.collaborationChartSize || 10,
      
      // Time windows
      dailyChartHours: config.dailyChartHours || 24,
      weeklyChartHours: config.weeklyChartHours || 168, // 7 days
      
      // Rising stars criteria
      risingStarsMaxAge: config.risingStarsMaxAge || 168, // 1 week old max
      risingStarsMinGrowth: config.risingStarsMinGrowth || 20, // Min 20% growth
      
      // Cache settings
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 900, // 15 minutes
      
      ...config
    };
    
    this.trendingAlgorithm = new TrendingAlgorithm(config.trendingConfig);
    this.cache = new Map();
  }

  /**
   * Generate Top 10 Overall Chart
   */
  async generateOverallChart(songsData, options = {}) {
    const cacheKey = 'overall_chart';
    
    if (this.config.cacheEnabled && this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    // Calculate trending scores for all songs
    const trendingScores = this.trendingAlgorithm.calculateBatchTrendingScores(
      songsData, 
      { applyGenreBalancing: true }
    );

    // Take top N songs
    const topSongs = trendingScores
      .slice(0, this.config.overallChartSize)
      .map((score, index) => ({
        rank: index + 1,
        songId: score.songId,
        trendingScore: score.totalScore,
        breakdown: score.breakdown,
        song: songsData.find(s => s.id === score.songId)
      }));

    const chart = {
      type: 'overall',
      title: 'Top 10 Overall',
      generatedAt: moment().toISOString(),
      songs: topSongs,
      metadata: {
        totalSongs: songsData.length,
        algorithm: 'trending_v1',
        genreBalance: this.calculateGenreDistribution(topSongs)
      }
    };

    this.setCache(cacheKey, chart);
    return chart;
  }

  /**
   * Generate Genre-specific Charts
   */
  async generateGenreCharts(songsData, genres = [], options = {}) {
    const charts = {};
    
    for (const genre of genres) {
      const cacheKey = `genre_chart_${genre}`;
      
      if (this.config.cacheEnabled && this.isValidCache(cacheKey)) {
        charts[genre] = this.cache.get(cacheKey).data;
        continue;
      }

      // Filter songs by genre
      const genreSongs = songsData.filter(song => 
        song.genre && song.genre.toLowerCase() === genre.toLowerCase()
      );

      if (genreSongs.length === 0) {
        charts[genre] = this.createEmptyChart('genre', `Top ${genre} Songs`);
        continue;
      }

      // Calculate trending scores for genre songs
      const trendingScores = this.trendingAlgorithm.calculateBatchTrendingScores(
        genreSongs,
        { applyGenreBalancing: false } // No genre balancing within same genre
      );

      // Take top N songs for this genre
      const topSongs = trendingScores
        .slice(0, this.config.genreChartSize)
        .map((score, index) => ({
          rank: index + 1,
          songId: score.songId,
          trendingScore: score.totalScore,
          breakdown: score.breakdown,
          song: genreSongs.find(s => s.id === score.songId)
        }));

      const chart = {
        type: 'genre',
        title: `Top ${this.capitalizeGenre(genre)} Songs`,
        genre: genre,
        generatedAt: moment().toISOString(),
        songs: topSongs,
        metadata: {
          totalSongs: genreSongs.length,
          algorithm: 'trending_v1'
        }
      };

      charts[genre] = chart;
      this.setCache(cacheKey, chart);
    }

    return charts;
  }

  /**
   * Generate Rising Stars Chart (new artists gaining momentum)
   */
  async generateRisingStarsChart(songsData, usersData = [], options = {}) {
    const cacheKey = 'rising_stars_chart';
    
    if (this.config.cacheEnabled && this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    // Filter for recent songs (within rising stars max age)
    const recentSongs = songsData.filter(song => {
      const hoursOld = moment().diff(moment(song.createdAt), 'hours');
      return hoursOld <= this.config.risingStarsMaxAge;
    });

    // Group by artist and calculate growth metrics
    const artistMetrics = this.calculateArtistGrowthMetrics(recentSongs, usersData);

    // Filter artists with significant growth
    const risingArtists = artistMetrics
      .filter(artist => artist.growthRate >= this.config.risingStarsMinGrowth)
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, this.config.risingStarsSize);

    const chart = {
      type: 'rising_stars',
      title: 'Rising Stars',
      generatedAt: moment().toISOString(),
      artists: risingArtists.map((artist, index) => ({
        rank: index + 1,
        userId: artist.userId,
        user: artist.user,
        growthRate: artist.growthRate,
        totalScore: artist.totalScore,
        songCount: artist.songCount,
        recentSongs: artist.recentSongs
      })),
      metadata: {
        totalArtists: artistMetrics.length,
        minGrowthRate: this.config.risingStarsMinGrowth,
        timeWindow: `${this.config.risingStarsMaxAge} hours`
      }
    };

    this.setCache(cacheKey, chart);
    return chart;
  }

  /**
   * Generate Collaboration Chart (most collaborative songs)
   */
  async generateCollaborationChart(songsData, options = {}) {
    const cacheKey = 'collaboration_chart';
    
    if (this.config.cacheEnabled && this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    // Score songs by collaboration count and diversity
    const collaborationScores = songsData
      .map(song => {
        const collaborations = song.collaborations || [];
        const collaborationTypes = new Set(collaborations.map(c => c.contributionType));
        
        return {
          songId: song.id,
          song: song,
          collaborationCount: collaborations.length,
          collaborationTypeCount: collaborationTypes.size,
          recentCollaborations: collaborations.filter(c => 
            moment().diff(moment(c.createdAt), 'hours') <= 24
          ).length,
          // Score combines count, diversity, and recency
          collaborationScore: collaborations.length * 10 + 
                            collaborationTypes.size * 5 + 
                            collaborations.filter(c => 
                              moment().diff(moment(c.createdAt), 'hours') <= 24
                            ).length * 3
        };
      })
      .filter(score => score.collaborationCount > 0)
      .sort((a, b) => b.collaborationScore - a.collaborationScore)
      .slice(0, this.config.collaborationChartSize);

    const chart = {
      type: 'collaboration',
      title: 'Most Collaborative Songs',
      generatedAt: moment().toISOString(),
      songs: collaborationScores.map((score, index) => ({
        rank: index + 1,
        songId: score.songId,
        song: score.song,
        collaborationCount: score.collaborationCount,
        collaborationTypeCount: score.collaborationTypeCount,
        recentCollaborations: score.recentCollaborations,
        collaborationScore: score.collaborationScore
      })),
      metadata: {
        totalCollaborativeSongs: songsData.filter(s => (s.collaborations || []).length > 0).length
      }
    };

    this.setCache(cacheKey, chart);
    return chart;
  }

  /**
   * Generate Daily Chart
   */
  async generateDailyChart(songsData, options = {}) {
    return this.generateTimeBasedChart(
      songsData, 
      this.config.dailyChartHours, 
      'daily',
      'Today\'s Top Songs'
    );
  }

  /**
   * Generate Weekly Chart
   */
  async generateWeeklyChart(songsData, options = {}) {
    return this.generateTimeBasedChart(
      songsData, 
      this.config.weeklyChartHours, 
      'weekly',
      'This Week\'s Top Songs'
    );
  }

  /**
   * Generate time-based chart (daily/weekly)
   */
  async generateTimeBasedChart(songsData, timeWindowHours, type, title) {
    const cacheKey = `${type}_chart`;
    
    if (this.config.cacheEnabled && this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    // Filter songs with activity in the time window
    const timeWindowSongs = songsData.filter(song => {
      // Check if song has recent activity (votes, collaborations, comments)
      const hasRecentActivity = this.hasRecentActivity(song, timeWindowHours);
      return hasRecentActivity;
    });

    // Use modified trending algorithm with higher recency weight
    const timeBasedAlgorithm = new TrendingAlgorithm({
      ...this.trendingAlgorithm.getConfig(),
      recencyWeight: 0.4, // Higher weight for recency in time-based charts
      velocityWeight: 0.3  // Higher weight for velocity
    });

    const trendingScores = timeBasedAlgorithm.calculateBatchTrendingScores(
      timeWindowSongs,
      { applyGenreBalancing: true }
    );

    const topSongs = trendingScores
      .slice(0, this.config.overallChartSize)
      .map((score, index) => ({
        rank: index + 1,
        songId: score.songId,
        trendingScore: score.totalScore,
        breakdown: score.breakdown,
        song: timeWindowSongs.find(s => s.id === score.songId)
      }));

    const chart = {
      type: type,
      title: title,
      generatedAt: moment().toISOString(),
      timeWindow: `${timeWindowHours} hours`,
      songs: topSongs,
      metadata: {
        totalActiveSongs: timeWindowSongs.length,
        algorithm: 'trending_v1_time_based'
      }
    };

    this.setCache(cacheKey, chart);
    return chart;
  }

  /**
   * Calculate artist growth metrics for rising stars
   */
  calculateArtistGrowthMetrics(recentSongs, usersData) {
    const userMap = _.keyBy(usersData, 'id');
    const artistData = {};

    // Group songs by artist
    recentSongs.forEach(song => {
      const userId = song.userId;
      if (!artistData[userId]) {
        artistData[userId] = {
          userId,
          user: userMap[userId],
          songs: [],
          totalScore: 0
        };
      }
      artistData[userId].songs.push(song);
    });

    // Calculate metrics for each artist
    return Object.values(artistData).map(artist => {
      const songScores = artist.songs.map(song => 
        this.trendingAlgorithm.calculateTrendingScore(song)
      );

      const totalScore = songScores.reduce((sum, score) => sum + score.totalScore, 0);
      const averageScore = totalScore / songScores.length;

      // Calculate growth rate based on recent performance vs historical average
      // For now, use velocity as a proxy for growth
      const recentVelocity = songScores.reduce((sum, score) => 
        sum + score.breakdown.velocityScore, 0
      ) / songScores.length;

      return {
        ...artist,
        totalScore,
        averageScore,
        growthRate: recentVelocity, // Simplified growth calculation
        songCount: artist.songs.length,
        recentSongs: artist.songs.slice(0, 3) // Top 3 recent songs
      };
    });
  }

  /**
   * Check if song has recent activity
   */
  hasRecentActivity(song, timeWindowHours) {
    const cutoffTime = moment().subtract(timeWindowHours, 'hours');
    
    // Check votes
    const recentVotes = (song.votes || []).some(vote => 
      moment(vote.createdAt).isAfter(cutoffTime)
    );
    
    // Check collaborations
    const recentCollaborations = (song.collaborations || []).some(collab => 
      moment(collab.createdAt).isAfter(cutoffTime)
    );
    
    // Check comments
    const recentComments = (song.comments || []).some(comment => 
      moment(comment.createdAt).isAfter(cutoffTime)
    );

    return recentVotes || recentCollaborations || recentComments;
  }

  /**
   * Calculate genre distribution in chart
   */
  calculateGenreDistribution(chartSongs) {
    const genreCounts = {};
    chartSongs.forEach(chartSong => {
      const genre = chartSong.song?.genre;
      if (genre) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }
    });
    return genreCounts;
  }

  /**
   * Create empty chart structure
   */
  createEmptyChart(type, title) {
    return {
      type,
      title,
      generatedAt: moment().toISOString(),
      songs: [],
      metadata: {
        totalSongs: 0,
        isEmpty: true
      }
    };
  }

  /**
   * Capitalize genre name
   */
  capitalizeGenre(genre) {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  }

  /**
   * Cache management
   */
  isValidCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const isExpired = moment().diff(moment(cached.timestamp), 'seconds') > this.config.cacheTTL;
    return !isExpired;
  }

  setCache(key, data) {
    if (this.config.cacheEnabled) {
      this.cache.set(key, {
        data,
        timestamp: moment().toISOString()
      });
    }
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Get all available charts
   */
  async generateAllCharts(songsData, usersData = [], genres = []) {
    const [
      overallChart,
      genreCharts,
      risingStarsChart,
      collaborationChart,
      dailyChart,
      weeklyChart
    ] = await Promise.all([
      this.generateOverallChart(songsData),
      this.generateGenreCharts(songsData, genres),
      this.generateRisingStarsChart(songsData, usersData),
      this.generateCollaborationChart(songsData),
      this.generateDailyChart(songsData),
      this.generateWeeklyChart(songsData)
    ]);

    return {
      overall: overallChart,
      genres: genreCharts,
      risingStars: risingStarsChart,
      collaboration: collaborationChart,
      daily: dailyChart,
      weekly: weeklyChart,
      generatedAt: moment().toISOString()
    };
  }
}

module.exports = ChartService; 