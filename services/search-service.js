const _ = require('lodash');
const moment = require('moment');

/**
 * Advanced Search Service for Legato
 * 
 * Provides sophisticated search and filtering capabilities:
 * - Full-text search across songs and users
 * - Multi-faceted filtering (genre, skills, collaboration type, etc.)
 * - Geographic and temporal filtering
 * - Smart suggestions and auto-complete
 * - Search result ranking and relevance scoring
 */

class SearchService {
  constructor(config = {}) {
    this.config = {
      // Search configuration
      maxResults: config.maxResults || 50,
      fuzzyMatchThreshold: config.fuzzyMatchThreshold || 0.7,
      
      // Relevance scoring weights
      titleWeight: config.titleWeight || 0.4,
      descriptionWeight: config.descriptionWeight || 0.3,
      tagsWeight: config.tagsWeight || 0.2,
      popularityWeight: config.popularityWeight || 0.1,
      
      // Filter limits
      maxGenres: config.maxGenres || 10,
      maxSkills: config.maxSkills || 15,
      
      // Time-based filters
      maxDaysOld: config.maxDaysOld || 365,
      
      ...config
    };
  }

  /**
   * Advanced song search with multi-faceted filtering
   */
  async searchSongs(query = '', filters = {}, options = {}) {
    let results = [];

    // Get all songs (in real implementation, this would be from database)
    const allSongs = options.songsData || [];
    
    // Apply text search if query provided
    if (query.trim()) {
      results = this.performTextSearch(allSongs, query, 'song');
    } else {
      results = allSongs.map(song => ({
        item: song,
        score: 0.5, // Default score for non-search results
        matchedFields: []
      }));
    }

    // Apply filters
    results = this.applyFilters(results, filters, 'song');

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    const limit = Math.min(options.limit || this.config.maxResults, this.config.maxResults);
    const offset = options.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      query,
      filters,
      results: paginatedResults.map(result => ({
        song: result.item,
        relevanceScore: result.score,
        matchedFields: result.matchedFields,
        matchReasons: result.matchReasons || []
      })),
      totalResults: results.length,
      pagination: {
        limit,
        offset,
        hasMore: results.length > offset + limit
      },
      suggestions: this.generateSearchSuggestions(query, filters, allSongs),
      facets: this.generateFacets(results.map(r => r.item), 'song')
    };
  }

  /**
   * Advanced user search
   */
  async searchUsers(query = '', filters = {}, options = {}) {
    let results = [];

    const allUsers = options.usersData || [];
    
    if (query.trim()) {
      results = this.performTextSearch(allUsers, query, 'user');
    } else {
      results = allUsers.map(user => ({
        item: user,
        score: 0.5,
        matchedFields: []
      }));
    }

    // Apply filters
    results = this.applyFilters(results, filters, 'user');

    // Sort by relevance and reputation
    results.sort((a, b) => {
      const scoreA = a.score + (a.item.reputation || 0) / 1000; // Small reputation boost
      const scoreB = b.score + (b.item.reputation || 0) / 1000;
      return scoreB - scoreA;
    });

    const limit = Math.min(options.limit || this.config.maxResults, this.config.maxResults);
    const offset = options.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      query,
      filters,
      results: paginatedResults.map(result => ({
        user: result.item,
        relevanceScore: result.score,
        matchedFields: result.matchedFields,
        matchReasons: result.matchReasons || []
      })),
      totalResults: results.length,
      pagination: {
        limit,
        offset,
        hasMore: results.length > offset + limit
      },
      facets: this.generateFacets(results.map(r => r.item), 'user')
    };
  }

  /**
   * Search for collaboration opportunities
   */
  async searchCollaborationOpportunities(query = '', filters = {}, options = {}) {
    const allSongs = options.songsData || [];
    
    // Filter to only collaboration-open songs
    let collaborationSongs = allSongs.filter(song => 
      song.isOpenForCollaboration && 
      (song.collaborationNeeded || []).length > 0
    );

    let results = [];

    if (query.trim()) {
      results = this.performTextSearch(collaborationSongs, query, 'song');
    } else {
      results = collaborationSongs.map(song => ({
        item: song,
        score: 0.5,
        matchedFields: []
      }));
    }

    // Apply collaboration-specific filters
    results = this.applyCollaborationFilters(results, filters);

    // Sort by urgency and relevance
    results.sort((a, b) => {
      const urgencyA = this.calculateCollaborationUrgency(a.item);
      const urgencyB = this.calculateCollaborationUrgency(b.item);
      return (b.score + urgencyB) - (a.score + urgencyA);
    });

    const limit = Math.min(options.limit || this.config.maxResults, this.config.maxResults);
    const offset = options.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      query,
      filters,
      results: paginatedResults.map(result => ({
        song: result.item,
        relevanceScore: result.score,
        urgencyScore: this.calculateCollaborationUrgency(result.item),
        matchedFields: result.matchedFields,
        neededSkills: result.item.collaborationNeeded || [],
        estimatedTimeCommitment: this.estimateTimeCommitment(result.item),
        collaboratorCount: (result.item.collaborations || []).length
      })),
      totalResults: results.length,
      pagination: {
        limit,
        offset,
        hasMore: results.length > offset + limit
      }
    };
  }

  /**
   * Perform text-based search across relevant fields
   */
  performTextSearch(items, query, itemType) {
    const searchTerms = this.tokenizeQuery(query);
    
    return items.map(item => {
      let totalScore = 0;
      const matchedFields = [];
      const matchReasons = [];

      if (itemType === 'song') {
        // Search song title
        const titleScore = this.calculateTextMatchScore(item.title || '', searchTerms);
        if (titleScore > 0) {
          totalScore += titleScore * this.config.titleWeight;
          matchedFields.push('title');
          matchReasons.push(`Title matches "${query}"`);
        }

        // Search description
        const descScore = this.calculateTextMatchScore(item.description || '', searchTerms);
        if (descScore > 0) {
          totalScore += descScore * this.config.descriptionWeight;
          matchedFields.push('description');
          matchReasons.push(`Description matches "${query}"`);
        }

        // Search genre, mood, key
        const metaText = [item.genre, item.mood, item.key].filter(Boolean).join(' ');
        const metaScore = this.calculateTextMatchScore(metaText, searchTerms);
        if (metaScore > 0) {
          totalScore += metaScore * this.config.tagsWeight;
          matchedFields.push('metadata');
          matchReasons.push(`Metadata matches "${query}"`);
        }

        // Search collaboration needs
        const collabText = (item.collaborationNeeded || []).join(' ');
        const collabScore = this.calculateTextMatchScore(collabText, searchTerms);
        if (collabScore > 0) {
          totalScore += collabScore * this.config.tagsWeight;
          matchedFields.push('collaborationNeeded');
          matchReasons.push(`Collaboration needs match "${query}"`);
        }

      } else if (itemType === 'user') {
        // Search username and display name
        const nameScore = this.calculateTextMatchScore(
          `${item.username || ''} ${item.displayName || ''}`, 
          searchTerms
        );
        if (nameScore > 0) {
          totalScore += nameScore * this.config.titleWeight;
          matchedFields.push('name');
          matchReasons.push(`Name matches "${query}"`);
        }

        // Search bio
        const bioScore = this.calculateTextMatchScore(item.bio || '', searchTerms);
        if (bioScore > 0) {
          totalScore += bioScore * this.config.descriptionWeight;
          matchedFields.push('bio');
          matchReasons.push(`Bio matches "${query}"`);
        }

        // Search skills and genres
        const skillsText = [
          ...(item.skills || []),
          ...(item.genres || [])
        ].join(' ');
        const skillsScore = this.calculateTextMatchScore(skillsText, searchTerms);
        if (skillsScore > 0) {
          totalScore += skillsScore * this.config.tagsWeight;
          matchedFields.push('skills');
          matchReasons.push(`Skills match "${query}"`);
        }
      }

      return {
        item,
        score: totalScore,
        matchedFields,
        matchReasons
      };
    }).filter(result => result.score > 0);
  }

  /**
   * Apply various filters to search results
   */
  applyFilters(results, filters, itemType) {
    return results.filter(result => {
      const item = result.item;

      // Genre filter
      if (filters.genres && filters.genres.length > 0) {
        if (!item.genre || !filters.genres.includes(item.genre)) {
          return false;
        }
      }

      // Skills filter (for users or collaboration needs)
      if (filters.skills && filters.skills.length > 0) {
        if (itemType === 'user') {
          const userSkills = item.skills || [];
          if (!filters.skills.some(skill => userSkills.includes(skill))) {
            return false;
          }
        } else if (itemType === 'song') {
          const neededSkills = item.collaborationNeeded || [];
          if (!filters.skills.some(skill => neededSkills.includes(skill))) {
            return false;
          }
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const itemDate = moment(item.createdAt);
        if (filters.dateRange.start && itemDate.isBefore(moment(filters.dateRange.start))) {
          return false;
        }
        if (filters.dateRange.end && itemDate.isAfter(moment(filters.dateRange.end))) {
          return false;
        }
      }

      // Collaboration status filter (for songs)
      if (itemType === 'song' && filters.collaborationStatus !== undefined) {
        if (filters.collaborationStatus === 'open' && !item.isOpenForCollaboration) {
          return false;
        }
        if (filters.collaborationStatus === 'closed' && item.isOpenForCollaboration) {
          return false;
        }
      }

      // Minimum rating filter
      if (filters.minRating !== undefined) {
        const avgRating = this.calculateAverageRating(item.votes || []);
        if (avgRating < filters.minRating) {
          return false;
        }
      }

      // Activity level filter (for songs)
      if (filters.activityLevel && itemType === 'song') {
        const activityLevel = this.calculateActivityLevel(item);
        if (activityLevel !== filters.activityLevel) {
          return false;
        }
      }

      // Reputation range filter (for users)
      if (itemType === 'user' && filters.reputationRange) {
        const reputation = item.reputation || 0;
        if (reputation < filters.reputationRange.min || reputation > filters.reputationRange.max) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply collaboration-specific filters
   */
  applyCollaborationFilters(results, filters) {
    return results.filter(result => {
      const song = result.item;

      // Required skills filter
      if (filters.requiredSkills && filters.requiredSkills.length > 0) {
        const neededSkills = song.collaborationNeeded || [];
        if (!filters.requiredSkills.every(skill => neededSkills.includes(skill))) {
          return false;
        }
      }

      // Time commitment filter
      if (filters.timeCommitment) {
        const estimatedCommitment = this.estimateTimeCommitment(song);
        if (estimatedCommitment !== filters.timeCommitment) {
          return false;
        }
      }

      // Difficulty level filter
      if (filters.difficultyLevel) {
        const difficulty = this.estimateDifficultyLevel(song);
        if (difficulty !== filters.difficultyLevel) {
          return false;
        }
      }

      // Collaboration count range
      if (filters.collaborationCountRange) {
        const collabCount = (song.collaborations || []).length;
        if (collabCount < filters.collaborationCountRange.min || 
            collabCount > filters.collaborationCountRange.max) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate text match score using various matching techniques
   */
  calculateTextMatchScore(text, searchTerms) {
    if (!text || searchTerms.length === 0) return 0;

    const normalizedText = text.toLowerCase();
    let score = 0;
    let matches = 0;

    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      
      // Exact match (highest score)
      if (normalizedText.includes(termLower)) {
        score += 1.0;
        matches++;
      }
      // Fuzzy match
      else if (this.fuzzyMatch(normalizedText, termLower)) {
        score += 0.7;
        matches++;
      }
      // Partial match
      else if (this.partialMatch(normalizedText, termLower)) {
        score += 0.4;
        matches++;
      }
    });

    // Normalize by number of search terms
    return searchTerms.length > 0 ? (score / searchTerms.length) : 0;
  }

  /**
   * Tokenize search query into meaningful terms
   */
  tokenizeQuery(query) {
    return query
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(term => term.length > 1)
      .slice(0, 10); // Limit to 10 terms
  }

  /**
   * Simple fuzzy matching
   */
  fuzzyMatch(text, term) {
    // Simple Levenshtein-like distance check
    if (Math.abs(text.length - term.length) > 2) return false;
    
    const distance = this.levenshteinDistance(text, term);
    const maxLength = Math.max(text.length, term.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= this.config.fuzzyMatchThreshold;
  }

  /**
   * Partial matching for substrings
   */
  partialMatch(text, term) {
    if (term.length < 3) return false;
    
    // Check if any word in text starts with the term
    const words = text.split(/\s+/);
    return words.some(word => word.startsWith(term));
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generate search suggestions based on query and data
   */
  generateSearchSuggestions(query, filters, items) {
    if (!query || query.length < 2) return [];

    const suggestions = new Set();

    // Extract common terms from items
    items.forEach(item => {
      const text = this.extractSearchableText(item);
      const words = text.toLowerCase().split(/\s+/);
      
      words.forEach(word => {
        if (word.length > 2 && word.startsWith(query.toLowerCase().substr(0, 3))) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Generate faceted search results
   */
  generateFacets(items, itemType) {
    const facets = {};

    if (itemType === 'song') {
      // Genre facets
      facets.genres = this.generateFacetCounts(items, 'genre');
      
      // Mood facets
      facets.moods = this.generateFacetCounts(items, 'mood');
      
      // Collaboration status
      facets.collaborationStatus = {
        open: items.filter(item => item.isOpenForCollaboration).length,
        closed: items.filter(item => !item.isOpenForCollaboration).length
      };

      // Activity level
      facets.activityLevels = {
        high: items.filter(item => this.calculateActivityLevel(item) === 'high').length,
        medium: items.filter(item => this.calculateActivityLevel(item) === 'medium').length,
        low: items.filter(item => this.calculateActivityLevel(item) === 'low').length
      };

    } else if (itemType === 'user') {
      // Skills facets
      facets.skills = this.generateArrayFacetCounts(items, 'skills');
      
      // Genres facets
      facets.genres = this.generateArrayFacetCounts(items, 'genres');
      
      // Reputation ranges
      facets.reputationRanges = {
        'newcomer (0-25)': items.filter(item => (item.reputation || 0) <= 25).length,
        'developing (26-50)': items.filter(item => (item.reputation || 0) > 25 && (item.reputation || 0) <= 50).length,
        'experienced (51-75)': items.filter(item => (item.reputation || 0) > 50 && (item.reputation || 0) <= 75).length,
        'expert (76+)': items.filter(item => (item.reputation || 0) > 75).length
      };
    }

    return facets;
  }

  /**
   * Helper methods
   */
  generateFacetCounts(items, field) {
    const counts = {};
    items.forEach(item => {
      const value = item[field];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    return counts;
  }

  generateArrayFacetCounts(items, field) {
    const counts = {};
    items.forEach(item => {
      const values = item[field] || [];
      values.forEach(value => {
        counts[value] = (counts[value] || 0) + 1;
      });
    });
    return counts;
  }

  extractSearchableText(item) {
    if (item.title) {
      // Song item
      return [
        item.title,
        item.description,
        item.genre,
        item.mood,
        ...(item.collaborationNeeded || [])
      ].filter(Boolean).join(' ');
    } else {
      // User item
      return [
        item.username,
        item.displayName,
        item.bio,
        ...(item.skills || []),
        ...(item.genres || [])
      ].filter(Boolean).join(' ');
    }
  }

  calculateAverageRating(votes) {
    if (!votes || votes.length === 0) return 0;
    const total = votes.reduce((sum, vote) => sum + (vote.value || 0), 0);
    return total / votes.length;
  }

  calculateActivityLevel(song) {
    const recentActivity = [
      ...(song.votes || []),
      ...(song.collaborations || []),
      ...(song.comments || [])
    ].filter(activity => 
      moment().diff(moment(activity.createdAt), 'hours') <= 24
    );

    if (recentActivity.length >= 5) return 'high';
    if (recentActivity.length >= 2) return 'medium';
    return 'low';
  }

  calculateCollaborationUrgency(song) {
    const daysOld = moment().diff(moment(song.createdAt), 'days');
    const neededSkills = song.collaborationNeeded || [];
    const existingCollaborations = song.collaborations || [];
    
    // Higher urgency for newer songs with specific needs and fewer collaborations
    let urgency = 0;
    
    if (daysOld <= 7) urgency += 0.5; // New song bonus
    if (neededSkills.length > 0) urgency += 0.3; // Has specific needs
    if (existingCollaborations.length === 0) urgency += 0.4; // No collaborations yet
    
    return Math.min(1, urgency);
  }

  estimateTimeCommitment(song) {
    const collaborations = song.collaborations || [];
    const neededSkills = song.collaborationNeeded || [];
    
    if (neededSkills.includes('production') || neededSkills.includes('mixing')) {
      return 'high';
    }
    if (collaborations.length >= 3) {
      return 'medium';
    }
    return 'low';
  }

  estimateDifficultyLevel(song) {
    const collaborations = song.collaborations || [];
    const key = song.key || '';
    
    if (collaborations.length > 5 || ['F#', 'C#', 'Db', 'Ab'].includes(key)) {
      return 'challenging';
    }
    if (collaborations.length <= 1) {
      return 'easy';
    }
    return 'moderate';
  }

  /**
   * Auto-complete suggestions
   */
  async getAutocompleteSuggestions(query, type = 'songs', options = {}) {
    const data = type === 'songs' ? (options.songsData || []) : (options.usersData || []);
    
    if (query.length < 2) return [];

    const suggestions = new Set();
    const queryLower = query.toLowerCase();

    data.forEach(item => {
      const searchableText = this.extractSearchableText(item);
      const words = searchableText.toLowerCase().split(/\s+/);
      
      words.forEach(word => {
        if (word.startsWith(queryLower) && word.length > queryLower.length) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions)
      .sort((a, b) => a.length - b.length) // Prefer shorter completions
      .slice(0, 8);
  }
}

module.exports = SearchService; 