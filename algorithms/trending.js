const moment = require('moment');
const _ = require('lodash');

/**
 * Trending Algorithm for Legato
 * 
 * Combines multiple factors to calculate trending scores:
 * - Vote score (weighted by user reputation)
 * - Collaboration count (indicates engagement)
 * - Recency boost (newer content gets higher scores)
 * - Velocity (rate of engagement over time)
 * - Genre diversity balancing
 */

class TrendingAlgorithm {
  constructor(config = {}) {
    this.config = {
      // Weights for different factors
      voteWeight: config.voteWeight || 0.35,
      collaborationWeight: config.collaborationWeight || 0.25,
      recencyWeight: config.recencyWeight || 0.20,
      velocityWeight: config.velocityWeight || 0.20,
      
      // Time decay parameters
      recencyDecayHours: config.recencyDecayHours || 72, // 3 days
      velocityWindowHours: config.velocityWindowHours || 24, // 1 day window
      
      // Minimum thresholds
      minVotes: config.minVotes || 3,
      minCollaborations: config.minCollaborations || 1,
      
      // Genre balancing
      genreBoostEnabled: config.genreBoostEnabled || true,
      genreBoostFactor: config.genreBoostFactor || 0.1,
      
      ...config
    };
  }

  /**
   * Calculate trending score for a single song
   */
  calculateTrendingScore(songData) {
    const {
      votes = [],
      collaborations = [],
      createdAt,
      genre,
      comments = [],
      plays = 0
    } = songData;

    // 1. Vote Score (weighted by user reputation)
    const voteScore = this.calculateVoteScore(votes);
    
    // 2. Collaboration Score
    const collaborationScore = this.calculateCollaborationScore(collaborations);
    
    // 3. Recency Score (newer content gets higher scores)
    const recencyScore = this.calculateRecencyScore(createdAt);
    
    // 4. Velocity Score (engagement rate over time)
    const velocityScore = this.calculateVelocityScore(votes, collaborations, comments, createdAt);
    
    // 5. Engagement Score (comments, plays)
    const engagementScore = this.calculateEngagementScore(comments, plays);

    // Combine all scores with weights
    const baseScore = (
      voteScore * this.config.voteWeight +
      collaborationScore * this.config.collaborationWeight +
      recencyScore * this.config.recencyWeight +
      velocityScore * this.config.velocityWeight +
      engagementScore * 0.1 // Small weight for engagement
    );

    // Apply genre balancing if enabled
    const finalScore = this.config.genreBoostEnabled 
      ? this.applyGenreBalancing(baseScore, genre)
      : baseScore;

    return {
      totalScore: Math.max(0, finalScore),
      breakdown: {
        voteScore,
        collaborationScore,
        recencyScore,
        velocityScore,
        engagementScore,
        genre
      }
    };
  }

  /**
   * Calculate vote score with user reputation weighting
   */
  calculateVoteScore(votes) {
    if (!votes.length || votes.length < this.config.minVotes) {
      return 0;
    }

    const totalWeightedScore = votes.reduce((sum, vote) => {
      const userWeight = vote.weight || 1.0; // User reputation weight
      const voteValue = vote.value; // 1 for upvote, -1 for downvote
      return sum + (voteValue * userWeight);
    }, 0);

    const totalWeight = votes.reduce((sum, vote) => sum + (vote.weight || 1.0), 0);
    
    // Normalize to 0-100 scale
    const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const normalizedScore = Math.max(0, Math.min(100, (averageScore + 1) * 50)); // -1 to 1 becomes 0 to 100
    
    // Apply volume bonus (more votes = higher confidence)
    const volumeBonus = Math.log(votes.length + 1) * 10;
    
    return Math.min(100, normalizedScore + volumeBonus);
  }

  /**
   * Calculate collaboration score
   */
  calculateCollaborationScore(collaborations) {
    if (!collaborations.length || collaborations.length < this.config.minCollaborations) {
      return 0;
    }

    // More collaborations = higher score, with diminishing returns
    const baseScore = Math.min(100, collaborations.length * 15);
    
    // Bonus for diverse collaboration types
    const collaborationTypes = new Set(collaborations.map(c => c.contributionType));
    const diversityBonus = (collaborationTypes.size - 1) * 5;
    
    // Bonus for recent collaborations
    const recentCollaborations = collaborations.filter(c => 
      moment().diff(moment(c.createdAt), 'hours') <= 24
    );
    const recentBonus = recentCollaborations.length * 3;

    return Math.min(100, baseScore + diversityBonus + recentBonus);
  }

  /**
   * Calculate recency score (newer content gets higher scores)
   */
  calculateRecencyScore(createdAt) {
    const hoursOld = moment().diff(moment(createdAt), 'hours');
    
    if (hoursOld < 0) return 100; // Future date, max score
    
    // Exponential decay over time
    const decayRate = 1 / this.config.recencyDecayHours;
    const score = 100 * Math.exp(-decayRate * hoursOld);
    
    return Math.max(0, score);
  }

  /**
   * Calculate velocity score (rate of engagement over time)
   */
  calculateVelocityScore(votes, collaborations, comments, createdAt) {
    const hoursOld = moment().diff(moment(createdAt), 'hours');
    
    if (hoursOld <= 0) return 0; // Too new to calculate velocity
    
    const windowHours = Math.min(hoursOld, this.config.velocityWindowHours);
    
    // Count recent engagement
    const recentVotes = votes.filter(v => 
      moment().diff(moment(v.createdAt), 'hours') <= windowHours
    ).length;
    
    const recentCollaborations = collaborations.filter(c => 
      moment().diff(moment(c.createdAt), 'hours') <= windowHours
    ).length;
    
    const recentComments = comments.filter(c => 
      moment().diff(moment(c.createdAt), 'hours') <= windowHours
    ).length;

    const totalRecentEngagement = recentVotes + recentCollaborations + recentComments;
    
    // Calculate engagement rate per hour
    const engagementRate = totalRecentEngagement / windowHours;
    
    // Normalize to 0-100 scale (assuming 1 engagement per hour = 100 score)
    return Math.min(100, engagementRate * 100);
  }

  /**
   * Calculate engagement score from comments and plays
   */
  calculateEngagementScore(comments, plays) {
    const commentScore = Math.min(50, comments.length * 2);
    const playScore = Math.min(50, Math.log(plays + 1) * 10);
    
    return commentScore + playScore;
  }

  /**
   * Apply genre balancing to prevent one genre from dominating
   */
  applyGenreBalancing(baseScore, genre, currentTopGenres = []) {
    if (!genre || !currentTopGenres.length) {
      return baseScore;
    }

    // Count how many times this genre appears in current top songs
    const genreCount = currentTopGenres.filter(g => g === genre).length;
    
    // Apply penalty if genre is over-represented
    const penalty = genreCount > 3 ? genreCount * this.config.genreBoostFactor : 0;
    
    return baseScore - penalty;
  }

  /**
   * Batch calculate trending scores for multiple songs
   */
  calculateBatchTrendingScores(songsData, options = {}) {
    const scores = songsData.map(song => ({
      songId: song.id,
      ...this.calculateTrendingScore(song)
    }));

    // Sort by trending score
    const sortedScores = _.orderBy(scores, ['totalScore'], ['desc']);

    // Apply genre balancing across the batch if enabled
    if (this.config.genreBoostEnabled && options.applyGenreBalancing) {
      return this.applyBatchGenreBalancing(sortedScores, songsData);
    }

    return sortedScores;
  }

  /**
   * Apply genre balancing across a batch of songs
   */
  applyBatchGenreBalancing(sortedScores, songsData) {
    const songMap = _.keyBy(songsData, 'id');
    const genreCounts = {};
    
    return sortedScores.map(score => {
      const song = songMap[score.songId];
      const genre = song?.genre;
      
      if (genre) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        
        // Apply genre balancing
        const currentTopGenres = Object.keys(genreCounts);
        const adjustedScore = this.applyGenreBalancing(
          score.totalScore, 
          genre, 
          currentTopGenres
        );
        
        return { ...score, totalScore: adjustedScore };
      }
      
      return score;
    });
  }

  /**
   * Get trending configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update trending configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = TrendingAlgorithm; 