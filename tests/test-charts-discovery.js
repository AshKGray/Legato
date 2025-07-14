const ChartsDiscoveryOrchestrator = require('../index');
const moment = require('moment');

/**
 * Comprehensive Test Suite for Agent 4 - Charts & Discovery System
 */

// Mock data for testing
const mockSongsData = [
  {
    id: 'song1',
    title: 'Electric Dreams',
    description: 'A vibrant electronic track perfect for collaboration',
    genre: 'electronic',
    mood: 'energetic',
    key: 'C',
    tempo: 128,
    userId: 'user1',
    isOpenForCollaboration: true,
    collaborationNeeded: ['vocals', 'guitar'],
    createdAt: moment().subtract(2, 'days').toISOString(),
    votes: [
      { userId: 'user2', value: 1, weight: 1.0, createdAt: moment().subtract(1, 'hour').toISOString() },
      { userId: 'user3', value: 1, weight: 1.2, createdAt: moment().subtract(2, 'hours').toISOString() }
    ],
    collaborations: [
      { userId: 'user2', contributionType: 'vocals', createdAt: moment().subtract(1, 'day').toISOString() }
    ],
    comments: [
      { userId: 'user3', content: 'Great beat!', createdAt: moment().subtract(3, 'hours').toISOString() }
    ]
  },
  {
    id: 'song2',
    title: 'Folk Melody',
    description: 'A gentle acoustic folk song with heartfelt lyrics',
    genre: 'folk',
    mood: 'calm',
    key: 'G',
    tempo: 90,
    userId: 'user2',
    isOpenForCollaboration: true,
    collaborationNeeded: ['harmonica', 'backing-vocals'],
    createdAt: moment().subtract(5, 'days').toISOString(),
    votes: [
      { userId: 'user1', value: 1, weight: 1.1, createdAt: moment().subtract(4, 'hours').toISOString() }
    ],
    collaborations: [],
    comments: []
  },
  {
    id: 'song3',
    title: 'Jazz Fusion',
    description: 'Complex jazz composition with modern elements',
    genre: 'jazz',
    mood: 'sophisticated',
    key: 'F#',
    tempo: 120,
    userId: 'user3',
    isOpenForCollaboration: false,
    collaborationNeeded: [],
    createdAt: moment().subtract(1, 'week').toISOString(),
    votes: [
      { userId: 'user1', value: 1, weight: 1.0, createdAt: moment().subtract(6, 'days').toISOString() },
      { userId: 'user2', value: 1, weight: 1.0, createdAt: moment().subtract(5, 'days').toISOString() }
    ],
    collaborations: [
      { userId: 'user1', contributionType: 'piano', createdAt: moment().subtract(6, 'days').toISOString() },
      { userId: 'user2', contributionType: 'bass', createdAt: moment().subtract(5, 'days').toISOString() }
    ],
    comments: [
      { userId: 'user1', content: 'Amazing composition!', createdAt: moment().subtract(5, 'days').toISOString() }
    ]
  }
];

const mockUsersData = [
  {
    id: 'user1',
    username: 'musician_alex',
    displayName: 'Alex Rodriguez',
    bio: 'Electronic music producer and pianist',
    skills: ['production', 'piano', 'mixing'],
    genres: ['electronic', 'jazz'],
    reputation: 75,
    createdAt: moment().subtract(2, 'months').toISOString()
  },
  {
    id: 'user2',
    username: 'folk_singer_sam',
    displayName: 'Sam Wilson',
    bio: 'Folk singer-songwriter with a passion for storytelling',
    skills: ['vocals', 'guitar', 'songwriting'],
    genres: ['folk', 'indie'],
    reputation: 45,
    createdAt: moment().subtract(3, 'weeks').toISOString()
  },
  {
    id: 'user3',
    username: 'jazz_master_charlie',
    displayName: 'Charlie Davis',
    bio: 'Jazz musician and composer with 20 years experience',
    skills: ['saxophone', 'composition', 'arrangement'],
    genres: ['jazz', 'classical'],
    reputation: 95,
    createdAt: moment().subtract(5, 'years').toISOString()
  }
];

const mockUserInteractions = [
  { userId: 'user1', songId: 'song2', type: 'vote', value: 1, createdAt: moment().subtract(4, 'hours').toISOString() },
  { userId: 'user1', songId: 'song3', type: 'collaboration', createdAt: moment().subtract(6, 'days').toISOString() },
  { userId: 'user1', songId: 'song3', type: 'vote', value: 1, createdAt: moment().subtract(6, 'days').toISOString() },
  { userId: 'user2', songId: 'song1', type: 'vote', value: 1, createdAt: moment().subtract(1, 'hour').toISOString() },
  { userId: 'user2', songId: 'song1', type: 'collaboration', createdAt: moment().subtract(1, 'day').toISOString() },
  { userId: 'user3', songId: 'song1', type: 'vote', value: 1, createdAt: moment().subtract(2, 'hours').toISOString() },
  { userId: 'user3', songId: 'song1', type: 'comment', createdAt: moment().subtract(3, 'hours').toISOString() }
];

class ChartsDiscoveryTestSuite {
  constructor() {
    this.orchestrator = new ChartsDiscoveryOrchestrator({
      chartUpdateSchedule: null, // Disable automatic updates for testing
      enableCaching: false // Disable caching for consistent test results
    });
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Charts & Discovery System Test Suite...\n');

    const tests = [
      this.testTrendingAlgorithm,
      this.testChartGeneration,
      this.testPersonalizedRecommendations,
      this.testCollaborationOpportunities,
      this.testAdvancedSearch,
      this.testAutocompleteSuggestions,
      this.testSystemIntegration
    ];

    for (const test of tests) {
      try {
        await test.call(this);
      } catch (error) {
        this.addTestResult(test.name, false, error.message);
      }
    }

    this.printTestSummary();
    return this.getOverallTestResult();
  }

  /**
   * Test 1: Trending Algorithm
   */
  async testTrendingAlgorithm() {
    console.log('1. 🔥 Testing Trending Algorithm...');

    // Test single song trending score
    const result = await this.orchestrator.calculateTrendingScore(mockSongsData[0]);
    
    if (!result.success) {
      throw new Error('Failed to calculate trending score');
    }

    const score = result.data;
    if (!score.totalScore || score.totalScore < 0 || score.totalScore > 100) {
      throw new Error('Invalid trending score range');
    }

    if (!score.breakdown || !score.breakdown.voteScore) {
      throw new Error('Missing score breakdown');
    }

    console.log(`   ✅ Trending score calculated: ${score.totalScore.toFixed(2)}`);
    console.log(`   📊 Vote score: ${score.breakdown.voteScore.toFixed(2)}`);
    console.log(`   🤝 Collaboration score: ${score.breakdown.collaborationScore.toFixed(2)}`);
    console.log(`   ⏱️  Recency score: ${score.breakdown.recencyScore.toFixed(2)}`);

    this.addTestResult('testTrendingAlgorithm', true, 'Trending algorithm working correctly');
  }

  /**
   * Test 2: Chart Generation
   */
  async testChartGeneration() {
    console.log('\n2. 📊 Testing Chart Generation...');

    // Test overall chart
    const overallResult = await this.orchestrator.getChart('overall', mockSongsData, mockUsersData);
    if (!overallResult.success || !overallResult.data.songs) {
      throw new Error('Failed to generate overall chart');
    }
    console.log(`   ✅ Overall chart: ${overallResult.data.songs.length} songs`);

    // Test genre chart
    const genreResult = await this.orchestrator.getChart('genre', mockSongsData, mockUsersData, { genre: 'electronic' });
    if (!genreResult.success) {
      throw new Error('Failed to generate genre chart');
    }
    console.log(`   ✅ Electronic genre chart: ${genreResult.data.songs.length} songs`);

    // Test rising stars chart
    const risingStarsResult = await this.orchestrator.getChart('rising-stars', mockSongsData, mockUsersData);
    if (!risingStarsResult.success) {
      throw new Error('Failed to generate rising stars chart');
    }
    console.log(`   ✅ Rising stars chart: ${risingStarsResult.data.artists.length} artists`);

    // Test collaboration chart
    const collabResult = await this.orchestrator.getChart('collaboration', mockSongsData, mockUsersData);
    if (!collabResult.success) {
      throw new Error('Failed to generate collaboration chart');
    }
    console.log(`   ✅ Collaboration chart: ${collabResult.data.songs.length} songs`);

    // Test all charts at once
    const allChartsResult = await this.orchestrator.getAllCharts(mockSongsData, mockUsersData);
    if (!allChartsResult.success || !allChartsResult.data.overall) {
      throw new Error('Failed to generate all charts');
    }
    console.log(`   ✅ All charts generated successfully`);

    this.addTestResult('testChartGeneration', true, 'All chart types generated successfully');
  }

  /**
   * Test 3: Personalized Recommendations
   */
  async testPersonalizedRecommendations() {
    console.log('\n3. 🎯 Testing Personalized Recommendations...');

    const result = await this.orchestrator.getPersonalizedRecommendations(
      'user1',
      mockSongsData,
      mockUsersData,
      mockUserInteractions
    );

    if (!result.success) {
      throw new Error('Failed to generate personalized recommendations');
    }

    const recommendations = result.data;
    if (!recommendations.recommendations || !recommendations.userProfile) {
      throw new Error('Missing recommendation data');
    }

    console.log(`   ✅ Recommendations: ${recommendations.recommendations.length} songs`);
    console.log(`   👤 User profile skills: ${recommendations.userProfile.declaredSkills.join(', ')}`);
    console.log(`   🎵 Inferred genres: ${Object.keys(recommendations.userProfile.inferredGenres).join(', ')}`);
    console.log(`   📈 Activity level: ${recommendations.userProfile.activityLevel}`);

    // Test with different user
    const result2 = await this.orchestrator.getPersonalizedRecommendations(
      'user2',
      mockSongsData,
      mockUsersData,
      mockUserInteractions
    );

    if (!result2.success) {
      throw new Error('Failed to generate recommendations for second user');
    }

    console.log(`   ✅ User 2 recommendations: ${result2.data.recommendations.length} songs`);

    this.addTestResult('testPersonalizedRecommendations', true, 'Personalized recommendations working correctly');
  }

  /**
   * Test 4: Collaboration Opportunities
   */
  async testCollaborationOpportunities() {
    console.log('\n4. 🤝 Testing Collaboration Opportunities...');

    const result = await this.orchestrator.getCollaborationOpportunities(
      'user1',
      mockSongsData,
      mockUsersData,
      mockUserInteractions
    );

    if (!result.success) {
      throw new Error('Failed to find collaboration opportunities');
    }

    const opportunities = result.data;
    console.log(`   ✅ Collaboration opportunities: ${opportunities.opportunities.length}`);

    opportunities.opportunities.forEach((opp, index) => {
      console.log(`   ${index + 1}. "${opp.song.title}" (Match: ${opp.matchScore.toFixed(1)}%)`);
      console.log(`      Skills needed: ${opp.matchingSkills.join(', ')}`);
      console.log(`      Difficulty: ${opp.difficultyLevel}, Time: ${opp.estimatedTimeCommitment}`);
    });

    this.addTestResult('testCollaborationOpportunities', true, 'Collaboration matching working correctly');
  }

  /**
   * Test 5: Advanced Search
   */
  async testAdvancedSearch() {
    console.log('\n5. 🔍 Testing Advanced Search...');

    // Test song search
    const songSearchResult = await this.orchestrator.searchSongs(
      'electronic',
      { genres: ['electronic'] },
      { songsData: mockSongsData, limit: 10 }
    );

    if (!songSearchResult.success) {
      throw new Error('Song search failed');
    }

    console.log(`   ✅ Song search results: ${songSearchResult.data.results.length}`);
    console.log(`   📊 Search facets: ${Object.keys(songSearchResult.data.facets).length}`);

    // Test user search
    const userSearchResult = await this.orchestrator.searchUsers(
      'musician',
      { skills: ['production'] },
      { usersData: mockUsersData, limit: 10 }
    );

    if (!userSearchResult.success) {
      throw new Error('User search failed');
    }

    console.log(`   ✅ User search results: ${userSearchResult.data.results.length}`);

    // Test collaboration search
    const collabSearchResult = await this.orchestrator.searchCollaborationOpportunities(
      'vocals',
      { requiredSkills: ['vocals'] },
      { songsData: mockSongsData, limit: 10 }
    );

    if (!collabSearchResult.success) {
      throw new Error('Collaboration search failed');
    }

    console.log(`   ✅ Collaboration search results: ${collabSearchResult.data.results.length}`);

    this.addTestResult('testAdvancedSearch', true, 'Advanced search working correctly');
  }

  /**
   * Test 6: Autocomplete Suggestions
   */
  async testAutocompleteSuggestions() {
    console.log('\n6. 💡 Testing Autocomplete Suggestions...');

    const result = await this.orchestrator.getAutocompleteSuggestions(
      'ele',
      'songs',
      { songsData: mockSongsData }
    );

    if (!result.success) {
      throw new Error('Autocomplete suggestions failed');
    }

    console.log(`   ✅ Autocomplete suggestions: ${result.data.length}`);
    if (result.data.length > 0) {
      console.log(`   💡 Suggestions: ${result.data.join(', ')}`);
    }

    this.addTestResult('testAutocompleteSuggestions', true, 'Autocomplete working correctly');
  }

  /**
   * Test 7: System Integration
   */
  async testSystemIntegration() {
    console.log('\n7. ⚙️  Testing System Integration...');

    // Initialize orchestrator
    await this.orchestrator.initialize();

    // Test system status
    const status = this.orchestrator.getSystemStatus();
    if (!status.initialized || !status.services.trendingAlgorithm) {
      throw new Error('System not properly initialized');
    }

    console.log(`   ✅ System initialized: ${status.initialized}`);
    console.log(`   🎯 Services loaded: ${Object.keys(status.services).length}`);
    console.log(`   🎵 Supported genres: ${status.supportedGenres.length}`);

    // Test configuration update
    this.orchestrator.updateConfig({
      trendingConfig: { voteWeight: 0.5 }
    });

    console.log(`   ✅ Configuration updated successfully`);

    // Test cache clearing
    this.orchestrator.clearAllCaches();
    console.log(`   ✅ Caches cleared successfully`);

    this.addTestResult('testSystemIntegration', true, 'System integration working correctly');
  }

  /**
   * Test utilities
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({ testName, passed, message });
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${testName}: ${message}`);
  }

  printTestSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.message}`);
    });

    if (passed === total) {
      console.log('\n🎉 All tests passed! Agent 4 is working perfectly!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
  }

  getOverallTestResult() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    return {
      totalTests: total,
      passedTests: passed,
      failedTests: total - passed,
      successRate: (passed / total) * 100,
      allPassed: passed === total
    };
  }
}

// Export the test suite
module.exports = ChartsDiscoveryTestSuite;

// If this file is run directly, execute the tests
if (require.main === module) {
  const testSuite = new ChartsDiscoveryTestSuite();
  
  testSuite.runAllTests().then(result => {
    console.log('\n🏁 Test execution completed!');
    process.exit(result.allPassed ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
} 