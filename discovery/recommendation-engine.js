const _ = require('lodash');
const moment = require('moment');

/**
 * Recommendation Engine for Legato
 * 
 * Provides personalized discovery through:
 * - Content-based filtering (skills, genres, preferences)
 * - Collaborative filtering (similar users' preferences)
 * - Hybrid recommendations combining multiple approaches
 * - Collaboration opportunity matching
 */

class RecommendationEngine {
  constructor(config = {}) {
    this.config = {
      // Recommendation weights
      contentBasedWeight: config.contentBasedWeight || 0.4,
      collaborativeWeight: config.collaborativeWeight || 0.3,
      trendingWeight: config.trendingWeight || 0.2,
      diversityWeight: config.diversityWeight || 0.1,

      // Recommendation limits
      maxRecommendations: config.maxRecommendations || 20,
      maxCollaborationOpportunities: config.maxCollaborationOpportunities || 10,
      
      // Similarity thresholds
      minUserSimilarity: config.minUserSimilarity || 0.3,
      minContentSimilarity: config.minContentSimilarity || 0.2,
      
      // Diversity settings
      maxSameGenre: config.maxSameGenre || 5,
      maxSameArtist: config.maxSameArtist || 3,
      
      // Time decay for user activity
      activityDecayDays: config.activityDecayDays || 30,
      
      ...config
    };
  }

  /**
   * Get personalized song recommendations for a user
   */
  async getPersonalizedRecommendations(userId, songsData, usersData, userInteractions = []) {
    const user = usersData.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user's interaction history and preferences
    const userProfile = this.buildUserProfile(user, userInteractions, songsData);
    
    // Calculate different types of recommendations
    const contentBased = this.getContentBasedRecommendations(userProfile, songsData);
    const collaborative = this.getCollaborativeRecommendations(userProfile, songsData, usersData, userInteractions);
    const trending = this.getTrendingRecommendations(songsData);
    
    // Combine recommendations with weights
    const combinedRecommendations = this.combineRecommendations([
      { recommendations: contentBased, weight: this.config.contentBasedWeight },
      { recommendations: collaborative, weight: this.config.collaborativeWeight },
      { recommendations: trending, weight: this.config.trendingWeight }
    ]);

    // Apply diversity filtering
    const diverseRecommendations = this.applyDiversityFiltering(
      combinedRecommendations, 
      userProfile
    );

    // Remove songs user has already interacted with
    const filteredRecommendations = this.filterInteractedSongs(
      diverseRecommendations,
      userInteractions,
      userId
    );

    return {
      userId,
      recommendations: filteredRecommendations.slice(0, this.config.maxRecommendations),
      userProfile,
      generatedAt: moment().toISOString(),
      methodology: {
        contentBasedWeight: this.config.contentBasedWeight,
        collaborativeWeight: this.config.collaborativeWeight,
        trendingWeight: this.config.trendingWeight,
        diversityApplied: true
      }
    };
  }

  /**
   * Get collaboration opportunities for a user
   */
  async getCollaborationOpportunities(userId, songsData, usersData, userInteractions = []) {
    const user = usersData.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const userProfile = this.buildUserProfile(user, userInteractions, songsData);
    
    // Find songs that need collaborations matching user skills
    const opportunities = songsData
      .filter(song => {
        // Exclude user's own songs
        if (song.userId === userId) return false;
        
        // Only songs open for collaboration
        if (!song.isOpenForCollaboration) return false;
        
        // Check if user's skills match what's needed
        const neededSkills = song.collaborationNeeded || [];
        const userSkills = user.skills || [];
        const hasMatchingSkills = neededSkills.some(needed => 
          userSkills.includes(needed)
        );
        
        return hasMatchingSkills;
      })
      .map(song => {
        const matchScore = this.calculateCollaborationMatchScore(song, userProfile);
        return {
          song,
          matchScore,
          matchingSkills: this.getMatchingSkills(song.collaborationNeeded, user.skills),
          estimatedTimeCommitment: this.estimateTimeCommitment(song),
          difficultyLevel: this.estimateDifficultyLevel(song, userProfile)
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, this.config.maxCollaborationOpportunities);

    return {
      userId,
      opportunities,
      userProfile,
      generatedAt: moment().toISOString()
    };
  }

  /**
   * Build comprehensive user profile from interactions and preferences
   */
  buildUserProfile(user, userInteractions, songsData) {
    const profile = {
      userId: user.id,
      declaredSkills: user.skills || [],
      declaredGenres: user.genres || [],
      reputation: user.reputation || 0,
      activityLevel: 'medium'
    };

    // Analyze interaction patterns
    const recentInteractions = userInteractions.filter(interaction =>
      moment().diff(moment(interaction.createdAt), 'days') <= this.config.activityDecayDays
    );

    // Genre preferences from interactions
    const interactedSongs = recentInteractions
      .map(interaction => songsData.find(s => s.id === interaction.songId))
      .filter(Boolean);

    profile.inferredGenres = this.calculateGenrePreferences(interactedSongs);
    profile.averageRating = this.calculateAverageRating(recentInteractions);
    profile.collaborationStyle = this.inferCollaborationStyle(recentInteractions, songsData);
    profile.activityLevel = this.calculateActivityLevel(recentInteractions);
    profile.preferredSongLength = this.inferPreferredSongLength(interactedSongs);
    profile.complexityPreference = this.inferComplexityPreference(interactedSongs);

    return profile;
  }

  /**
   * Content-based recommendations using user preferences and song features
   */
  getContentBasedRecommendations(userProfile, songsData) {
    return songsData
      .map(song => {
        const similarity = this.calculateContentSimilarity(song, userProfile);
        return {
          songId: song.id,
          song,
          score: similarity,
          reasons: this.getContentMatchReasons(song, userProfile)
        };
      })
      .filter(rec => rec.score >= this.config.minContentSimilarity)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Collaborative filtering based on similar users' preferences
   */
  getCollaborativeRecommendations(userProfile, songsData, usersData, allInteractions) {
    // Find similar users
    const similarUsers = this.findSimilarUsers(userProfile, usersData, allInteractions);
    
    if (similarUsers.length === 0) {
      return [];
    }

    // Get songs liked by similar users
    const recommendations = new Map();
    
    similarUsers.forEach(similarUser => {
      const userInteractions = allInteractions.filter(i => i.userId === similarUser.userId);
      const likedSongs = userInteractions
        .filter(i => i.type === 'vote' && i.value > 0)
        .map(i => i.songId);

      likedSongs.forEach(songId => {
        const song = songsData.find(s => s.id === songId);
        if (!song) return;

        const existingScore = recommendations.get(songId)?.score || 0;
        const weightedScore = existingScore + (similarUser.similarity * 1);
        
        recommendations.set(songId, {
          songId,
          song,
          score: weightedScore,
          reasons: [`Liked by similar users (${Math.round(similarUser.similarity * 100)}% match)`]
        });
      });
    });

    return Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Trending recommendations with user preference filtering
   */
  getTrendingRecommendations(songsData) {
    // Simple trending based on recent activity and votes
    return songsData
      .map(song => {
        const recentVotes = (song.votes || []).filter(vote =>
          moment().diff(moment(vote.createdAt), 'hours') <= 24
        );
        const recentCollaborations = (song.collaborations || []).filter(collab =>
          moment().diff(moment(collab.createdAt), 'hours') <= 24
        );
        
        const trendingScore = recentVotes.length * 2 + recentCollaborations.length * 3;
        
        return {
          songId: song.id,
          song,
          score: trendingScore,
          reasons: ['Trending now']
        };
      })
      .filter(rec => rec.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Combine multiple recommendation types with weights
   */
  combineRecommendations(recommendationSets) {
    const combined = new Map();

    recommendationSets.forEach(({ recommendations, weight }) => {
      recommendations.forEach((rec, index) => {
        const positionScore = Math.max(0, 1 - (index / recommendations.length));
        const weightedScore = rec.score * weight * positionScore;

        const existing = combined.get(rec.songId);
        if (existing) {
          existing.score += weightedScore;
          existing.reasons = [...existing.reasons, ...rec.reasons];
        } else {
          combined.set(rec.songId, {
            songId: rec.songId,
            song: rec.song,
            score: weightedScore,
            reasons: [...rec.reasons]
          });
        }
      });
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Apply diversity filtering to prevent genre/artist dominance
   */
  applyDiversityFiltering(recommendations, userProfile) {
    const filtered = [];
    const genreCounts = {};
    const artistCounts = {};

    for (const rec of recommendations) {
      const song = rec.song;
      const genre = song.genre;
      const artistId = song.userId;

      // Check genre diversity
      if (genre && genreCounts[genre] >= this.config.maxSameGenre) {
        continue;
      }

      // Check artist diversity
      if (artistCounts[artistId] >= this.config.maxSameArtist) {
        continue;
      }

      // Add to filtered list
      filtered.push(rec);

      // Update counts
      if (genre) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }
      artistCounts[artistId] = (artistCounts[artistId] || 0) + 1;
    }

    return filtered;
  }

  /**
   * Calculate content similarity between song and user profile
   */
  calculateContentSimilarity(song, userProfile) {
    let similarity = 0;
    let factors = 0;

    // Genre matching
    if (song.genre) {
      const genreMatch = userProfile.inferredGenres[song.genre] || 
                        (userProfile.declaredGenres.includes(song.genre) ? 0.8 : 0);
      similarity += genreMatch * 0.4;
      factors += 0.4;
    }

    // Mood/key matching (simplified)
    if (song.mood && userProfile.preferredMoods) {
      const moodMatch = userProfile.preferredMoods[song.mood] || 0;
      similarity += moodMatch * 0.2;
      factors += 0.2;
    }

    // Collaboration style matching
    if (song.collaborations && userProfile.collaborationStyle) {
      const collabTypes = new Set(song.collaborations.map(c => c.contributionType));
      const styleMatch = Array.from(collabTypes).some(type => 
        userProfile.collaborationStyle.includes(type)
      ) ? 0.7 : 0.3;
      similarity += styleMatch * 0.2;
      factors += 0.2;
    }

    // Song complexity matching
    if (userProfile.complexityPreference) {
      const songComplexity = this.estimateSongComplexity(song);
      const complexityDiff = Math.abs(songComplexity - userProfile.complexityPreference);
      const complexityMatch = Math.max(0, 1 - complexityDiff);
      similarity += complexityMatch * 0.2;
      factors += 0.2;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculate collaboration match score
   */
  calculateCollaborationMatchScore(song, userProfile) {
    let score = 0;

    // Skill matching
    const neededSkills = song.collaborationNeeded || [];
    const userSkills = userProfile.declaredSkills || [];
    const matchingSkills = neededSkills.filter(skill => userSkills.includes(skill));
    score += (matchingSkills.length / Math.max(neededSkills.length, 1)) * 40;

    // Genre preference
    if (song.genre && userProfile.inferredGenres[song.genre]) {
      score += userProfile.inferredGenres[song.genre] * 30;
    }

    // Reputation match (similar level collaborators)
    const songCreator = song.user || {};
    const creatorReputation = songCreator.reputation || 0;
    const userReputation = userProfile.reputation || 0;
    const reputationDiff = Math.abs(creatorReputation - userReputation);
    const reputationMatch = Math.max(0, 1 - (reputationDiff / 100));
    score += reputationMatch * 20;

    // Song recency (prefer newer collaboration opportunities)
    const hoursOld = moment().diff(moment(song.createdAt), 'hours');
    const recencyScore = Math.max(0, 1 - (hoursOld / (7 * 24))); // 7 day decay
    score += recencyScore * 10;

    return Math.min(100, score);
  }

  /**
   * Find users with similar preferences
   */
  findSimilarUsers(userProfile, usersData, allInteractions) {
    const userInteractions = allInteractions.filter(i => i.userId === userProfile.userId);
    
    return usersData
      .filter(user => user.id !== userProfile.userId)
      .map(user => {
        const otherInteractions = allInteractions.filter(i => i.userId === user.id);
        const similarity = this.calculateUserSimilarity(userInteractions, otherInteractions, user, userProfile);
        
        return {
          userId: user.id,
          user,
          similarity
        };
      })
      .filter(item => item.similarity >= this.config.minUserSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10); // Top 10 similar users
  }

  /**
   * Calculate similarity between two users
   */
  calculateUserSimilarity(userInteractions, otherInteractions, otherUser, userProfile) {
    let similarity = 0;
    let factors = 0;

    // Skill overlap
    const userSkills = new Set(userProfile.declaredSkills);
    const otherSkills = new Set(otherUser.skills || []);
    const skillOverlap = this.calculateSetSimilarity(userSkills, otherSkills);
    similarity += skillOverlap * 0.3;
    factors += 0.3;

    // Genre preferences
    const userGenres = new Set(userProfile.declaredGenres);
    const otherGenres = new Set(otherUser.genres || []);
    const genreOverlap = this.calculateSetSimilarity(userGenres, otherGenres);
    similarity += genreOverlap * 0.3;
    factors += 0.3;

    // Interaction patterns
    const commonSongs = this.findCommonInteractions(userInteractions, otherInteractions);
    if (commonSongs.length > 0) {
      const agreementScore = this.calculateAgreementScore(userInteractions, otherInteractions, commonSongs);
      similarity += agreementScore * 0.4;
      factors += 0.4;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Helper methods
   */
  calculateSetSimilarity(set1, set2) {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  calculateGenrePreferences(songs) {
    const genreCounts = {};
    songs.forEach(song => {
      if (song.genre) {
        genreCounts[song.genre] = (genreCounts[song.genre] || 0) + 1;
      }
    });
    
    const total = songs.length;
    const preferences = {};
    Object.keys(genreCounts).forEach(genre => {
      preferences[genre] = genreCounts[genre] / total;
    });
    
    return preferences;
  }

  calculateAverageRating(interactions) {
    const votes = interactions.filter(i => i.type === 'vote' && i.value !== undefined);
    if (votes.length === 0) return 0;
    
    const total = votes.reduce((sum, vote) => sum + vote.value, 0);
    return total / votes.length;
  }

  inferCollaborationStyle(interactions, songsData) {
    const collabInteractions = interactions.filter(i => i.type === 'collaboration');
    const contributionTypes = collabInteractions
      .map(i => {
        const song = songsData.find(s => s.id === i.songId);
        return song?.collaborations?.find(c => c.userId === i.userId)?.contributionType;
      })
      .filter(Boolean);
    
    return [...new Set(contributionTypes)];
  }

  calculateActivityLevel(interactions) {
    const recentInteractions = interactions.filter(i =>
      moment().diff(moment(i.createdAt), 'days') <= 7
    );
    
    if (recentInteractions.length >= 10) return 'high';
    if (recentInteractions.length >= 3) return 'medium';
    return 'low';
  }

  estimateSongComplexity(song) {
    // Simplified complexity estimation
    let complexity = 0.5; // Base complexity
    
    if (song.collaborations && song.collaborations.length > 3) {
      complexity += 0.2; // More collaborations = more complex
    }
    
    if (song.key && ['F#', 'C#', 'Db', 'Ab'].includes(song.key)) {
      complexity += 0.1; // Sharp/flat keys slightly more complex
    }
    
    return Math.min(1, complexity);
  }

  getMatchingSkills(neededSkills, userSkills) {
    return (neededSkills || []).filter(skill => (userSkills || []).includes(skill));
  }

  estimateTimeCommitment(song) {
    const collaborations = song.collaborations || [];
    if (collaborations.length === 0) return 'low';
    if (collaborations.length <= 2) return 'medium';
    return 'high';
  }

  estimateDifficultyLevel(song, userProfile) {
    const songComplexity = this.estimateSongComplexity(song);
    const userExperience = userProfile.reputation / 100; // Normalize reputation
    
    if (songComplexity > userExperience + 0.3) return 'challenging';
    if (songComplexity < userExperience - 0.3) return 'easy';
    return 'moderate';
  }

  getContentMatchReasons(song, userProfile) {
    const reasons = [];
    
    if (song.genre && userProfile.declaredGenres.includes(song.genre)) {
      reasons.push(`Matches your ${song.genre} preference`);
    }
    
    if (song.collaborationNeeded) {
      const matching = this.getMatchingSkills(song.collaborationNeeded, userProfile.declaredSkills);
      if (matching.length > 0) {
        reasons.push(`Uses your ${matching.join(', ')} skills`);
      }
    }
    
    return reasons;
  }

  findCommonInteractions(interactions1, interactions2) {
    const songs1 = new Set(interactions1.map(i => i.songId));
    const songs2 = new Set(interactions2.map(i => i.songId));
    return [...songs1].filter(songId => songs2.has(songId));
  }

  calculateAgreementScore(interactions1, interactions2, commonSongs) {
    let agreements = 0;
    let total = 0;
    
    commonSongs.forEach(songId => {
      const vote1 = interactions1.find(i => i.songId === songId && i.type === 'vote');
      const vote2 = interactions2.find(i => i.songId === songId && i.type === 'vote');
      
      if (vote1 && vote2) {
        total++;
        if ((vote1.value > 0 && vote2.value > 0) || (vote1.value <= 0 && vote2.value <= 0)) {
          agreements++;
        }
      }
    });
    
    return total > 0 ? agreements / total : 0;
  }

  filterInteractedSongs(recommendations, userInteractions, userId) {
    const interactedSongIds = new Set(userInteractions
      .filter(i => i.userId === userId)
      .map(i => i.songId)
    );
    
    return recommendations.filter(rec => !interactedSongIds.has(rec.songId));
  }

  inferPreferredSongLength(songs) {
    // This would analyze song lengths if we had that data
    return 'medium'; // Default
  }

  inferComplexityPreference(songs) {
    // This would analyze the complexity of songs user interacts with
    return 0.5; // Default medium complexity
  }
}

module.exports = RecommendationEngine; 