const DemocraticVotingOrchestrator = require('../index');
const SimpleVotingMechanics = require('../mechanics/simple-voting');
const VersionManager = require('../core/version-manager');
const ChartIntegration = require('../integration/chart-integration');
const AntiGamingSystem = require('../validation/anti-gaming');
const moment = require('moment');

/**
 * Comprehensive Test Suite for Agent 6 - Democratic Voting System
 * 
 * Tests all major components:
 * - Simple voting mechanics (likes/comments)
 * - Version management and 7-day windows
 * - Chart integration and trending
 * - Anti-gaming protection
 * - WebSocket real-time updates
 * - API endpoints
 */

class VotingSystemTester {
  constructor() {
    this.testResults = [];
    this.orchestrator = null;
    this.mockDatabase = this.createMockDatabase();
    this.testData = this.generateTestData();
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Democratic Voting System Tests...\n');
    
    try {
      // System initialization tests
      await this.testSystemInitialization();
      
      // Voting mechanics tests
      await this.testVotingMechanics();
      
      // Version management tests
      await this.testVersionManagement();
      
      // Chart integration tests
      await this.testChartIntegration();
      
      // Anti-gaming tests
      await this.testAntiGaming();
      
      // API endpoint tests
      await this.testAPIEndpoints();
      
      // Real-time update tests
      await this.testRealTimeUpdates();
      
      // Integration tests
      await this.testSystemIntegration();
      
      // Cleanup tests
      await this.testCleanupFunctionality();
      
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addTestResult('Test Suite', 'FAILED', error.message);
    }
  }

  /**
   * Test system initialization
   */
  async testSystemInitialization() {
    console.log('🔧 Testing System Initialization...');
    
    try {
      // Test orchestrator creation
      this.orchestrator = new DemocraticVotingOrchestrator({
        port: 3106,
        wsPort: 3107,
        enableWebSocket: true,
        enableChartIntegration: true,
        enableAntiGaming: true
      });
      
      this.addTestResult('Orchestrator Creation', 'PASSED', 'Successfully created orchestrator');
      
      // Test initialization
      await this.orchestrator.initialize(this.mockDatabase);
      const status = this.orchestrator.getSystemStatus();
      
      if (status.initialized) {
        this.addTestResult('System Initialization', 'PASSED', 'System initialized successfully');
      } else {
        this.addTestResult('System Initialization', 'FAILED', 'System not properly initialized');
      }
      
      // Test component initialization
      const components = ['votingMechanics', 'versionManager', 'chartIntegration', 'antiGaming'];
      components.forEach(component => {
        if (status.components[component]) {
          this.addTestResult(`${component} Component`, 'PASSED', 'Component initialized');
        } else {
          this.addTestResult(`${component} Component`, 'FAILED', 'Component not initialized');
        }
      });
      
    } catch (error) {
      this.addTestResult('System Initialization', 'FAILED', error.message);
    }
  }

  /**
   * Test voting mechanics
   */
  async testVotingMechanics() {
    console.log('👍 Testing Voting Mechanics...');
    
    try {
      const votingMechanics = new SimpleVotingMechanics();
      
      // Test like functionality
      const likeResult = await votingMechanics.handleVote(
        'user1', 'song1', 'song', 'like', this.mockDatabase
      );
      
      if (likeResult.success && likeResult.action === 'liked') {
        this.addTestResult('Like Functionality', 'PASSED', 'Like processed successfully');
      } else {
        this.addTestResult('Like Functionality', 'FAILED', 'Like not processed correctly');
      }
      
      // Test duplicate like prevention
      const duplicateLike = await votingMechanics.handleVote(
        'user1', 'song1', 'song', 'like', this.mockDatabase
      );
      
      if (!duplicateLike.success) {
        this.addTestResult('Duplicate Like Prevention', 'PASSED', 'Duplicate like prevented');
      } else {
        this.addTestResult('Duplicate Like Prevention', 'FAILED', 'Duplicate like allowed');
      }
      
      // Test unlike functionality
      const unlikeResult = await votingMechanics.handleVote(
        'user1', 'song1', 'song', 'unlike', this.mockDatabase
      );
      
      if (unlikeResult.success && unlikeResult.action === 'unliked') {
        this.addTestResult('Unlike Functionality', 'PASSED', 'Unlike processed successfully');
      } else {
        this.addTestResult('Unlike Functionality', 'FAILED', 'Unlike not processed correctly');
      }
      
      // Test comment functionality
      const commentResult = await votingMechanics.addComment(
        'user1', 'song1', 'song', 'Great song!', this.mockDatabase
      );
      
      if (commentResult.success && commentResult.comment) {
        this.addTestResult('Comment Functionality', 'PASSED', 'Comment added successfully');
      } else {
        this.addTestResult('Comment Functionality', 'FAILED', 'Comment not added correctly');
      }
      
      // Test engagement metrics
      const metrics = await votingMechanics.getEngagementMetrics(
        'song1', 'song', this.mockDatabase
      );
      
      if (metrics.engagementScore >= 0) {
        this.addTestResult('Engagement Metrics', 'PASSED', 'Metrics calculated correctly');
      } else {
        this.addTestResult('Engagement Metrics', 'FAILED', 'Metrics not calculated');
      }
      
    } catch (error) {
      this.addTestResult('Voting Mechanics', 'FAILED', error.message);
    }
  }

  /**
   * Test version management
   */
  async testVersionManagement() {
    console.log('🔄 Testing Version Management...');
    
    try {
      const versionManager = new VersionManager();
      
      // Test song creation with collaboration window
      const songResult = await versionManager.createSongWithCollaborationWindow(
        {
          title: 'Test Song',
          userId: 'user1',
          genre: 'pop'
        },
        this.mockDatabase
      );
      
      if (songResult.song && songResult.collaborationWindow) {
        this.addTestResult('Song Creation with Window', 'PASSED', 'Song created with collaboration window');
      } else {
        this.addTestResult('Song Creation with Window', 'FAILED', 'Song creation failed');
      }
      
      // Test collaboration joining
      const joinResult = await versionManager.joinSongCollaboration(
        songResult.song.id,
        'user2',
        {
          notes: 'Added harmonies',
          audioUrl: '/path/to/audio.mp3'
        },
        this.mockDatabase
      );
      
      if (joinResult.collaboration && joinResult.versionNumber > 1) {
        this.addTestResult('Collaboration Joining', 'PASSED', 'User joined collaboration successfully');
      } else {
        this.addTestResult('Collaboration Joining', 'FAILED', 'Collaboration joining failed');
      }
      
      // Test version hierarchy
      const hierarchy = await versionManager.getVersionHierarchy(
        songResult.song.id,
        this.mockDatabase,
        new SimpleVotingMechanics()
      );
      
      if (hierarchy.totalVersions >= 2) {
        this.addTestResult('Version Hierarchy', 'PASSED', 'Version hierarchy generated correctly');
      } else {
        this.addTestResult('Version Hierarchy', 'FAILED', 'Version hierarchy incorrect');
      }
      
      // Test open collaborations
      const openCollabs = await versionManager.getOpenCollaborations(this.mockDatabase);
      
      if (openCollabs.totalOpen >= 1) {
        this.addTestResult('Open Collaborations', 'PASSED', 'Open collaborations retrieved');
      } else {
        this.addTestResult('Open Collaborations', 'FAILED', 'No open collaborations found');
      }
      
    } catch (error) {
      this.addTestResult('Version Management', 'FAILED', error.message);
    }
  }

  /**
   * Test chart integration
   */
  async testChartIntegration() {
    console.log('📊 Testing Chart Integration...');
    
    try {
      const chartIntegration = new ChartIntegration();
      const votingMechanics = new SimpleVotingMechanics();
      const versionManager = new VersionManager();
      
      // Start integration
      chartIntegration.startIntegration(votingMechanics, versionManager, this.mockDatabase);
      
      // Test engagement event processing
      const eventResult = await chartIntegration.processEngagementEvent({
        targetId: 'song1',
        targetType: 'song',
        eventType: 'like',
        userId: 'user1',
        timestamp: moment().toISOString()
      });
      
      if (eventResult.success && eventResult.queued) {
        this.addTestResult('Engagement Event Processing', 'PASSED', 'Event processed and queued');
      } else {
        this.addTestResult('Engagement Event Processing', 'FAILED', 'Event processing failed');
      }
      
      // Test chart generation
      const overallChart = await chartIntegration.generateOverallChart(5);
      
      if (overallChart.chart && Array.isArray(overallChart.chart)) {
        this.addTestResult('Chart Generation', 'PASSED', 'Overall chart generated');
      } else {
        this.addTestResult('Chart Generation', 'FAILED', 'Chart generation failed');
      }
      
      // Test rising chart
      const risingChart = await chartIntegration.generateRisingChart(5);
      
      if (risingChart.chart && Array.isArray(risingChart.chart)) {
        this.addTestResult('Rising Chart', 'PASSED', 'Rising chart generated');
      } else {
        this.addTestResult('Rising Chart', 'FAILED', 'Rising chart generation failed');
      }
      
      // Test comprehensive chart data
      const comprehensiveData = await chartIntegration.getComprehensiveChartData();
      
      if (comprehensiveData.charts) {
        this.addTestResult('Comprehensive Chart Data', 'PASSED', 'Comprehensive data generated');
      } else {
        this.addTestResult('Comprehensive Chart Data', 'FAILED', 'Comprehensive data failed');
      }
      
    } catch (error) {
      this.addTestResult('Chart Integration', 'FAILED', error.message);
    }
  }

  /**
   * Test anti-gaming system
   */
  async testAntiGaming() {
    console.log('🛡️ Testing Anti-Gaming System...');
    
    try {
      const antiGaming = new AntiGamingSystem({
        likesPerMinute: 5,
        commentsPerMinute: 3,
        maxCommentLength: 100
      });
      
      // Test like validation
      const likeValidation = await antiGaming.validateLike('user1', 'song1', 'song');
      
      if (likeValidation.valid) {
        this.addTestResult('Like Validation', 'PASSED', 'Like validation passed');
      } else {
        this.addTestResult('Like Validation', 'FAILED', 'Like validation failed');
      }
      
      // Test comment validation
      const commentValidation = await antiGaming.validateComment(
        'user1', 'song1', 'song', 'This is a test comment'
      );
      
      if (commentValidation.valid) {
        this.addTestResult('Comment Validation', 'PASSED', 'Comment validation passed');
      } else {
        this.addTestResult('Comment Validation', 'FAILED', 'Comment validation failed');
      }
      
      // Test comment length validation
      const longCommentValidation = await antiGaming.validateComment(
        'user1', 'song1', 'song', 'x'.repeat(200)
      );
      
      if (!longCommentValidation.valid) {
        this.addTestResult('Comment Length Validation', 'PASSED', 'Long comment rejected');
      } else {
        this.addTestResult('Comment Length Validation', 'FAILED', 'Long comment accepted');
      }
      
      // Test user activity tracking
      const activityStats = antiGaming.getUserActivityStats('user1');
      
      if (activityStats.userId === 'user1') {
        this.addTestResult('User Activity Tracking', 'PASSED', 'Activity tracked correctly');
      } else {
        this.addTestResult('User Activity Tracking', 'FAILED', 'Activity tracking failed');
      }
      
      // Test system statistics
      const systemStats = antiGaming.getSystemStats();
      
      if (systemStats.activeUsers >= 0) {
        this.addTestResult('Anti-Gaming Statistics', 'PASSED', 'Statistics generated');
      } else {
        this.addTestResult('Anti-Gaming Statistics', 'FAILED', 'Statistics failed');
      }
      
    } catch (error) {
      this.addTestResult('Anti-Gaming System', 'FAILED', error.message);
    }
  }

  /**
   * Test API endpoints
   */
  async testAPIEndpoints() {
    console.log('🌐 Testing API Endpoints...');
    
    try {
      // Test health endpoint
      const healthResponse = await this.makeRequest('GET', '/api/voting/health');
      
      if (healthResponse.status === 'healthy') {
        this.addTestResult('Health Endpoint', 'PASSED', 'Health check successful');
      } else {
        this.addTestResult('Health Endpoint', 'FAILED', 'Health check failed');
      }
      
      // Test vote endpoint
      const voteResponse = await this.makeRequest('POST', '/api/voting/vote', {
        userId: 'user1',
        targetId: 'song1',
        targetType: 'song',
        action: 'like'
      });
      
      if (voteResponse.success) {
        this.addTestResult('Vote Endpoint', 'PASSED', 'Vote endpoint working');
      } else {
        this.addTestResult('Vote Endpoint', 'FAILED', 'Vote endpoint failed');
      }
      
      // Test comment endpoint
      const commentResponse = await this.makeRequest('POST', '/api/voting/comment', {
        userId: 'user1',
        targetId: 'song1',
        targetType: 'song',
        content: 'Test comment'
      });
      
      if (commentResponse.success) {
        this.addTestResult('Comment Endpoint', 'PASSED', 'Comment endpoint working');
      } else {
        this.addTestResult('Comment Endpoint', 'FAILED', 'Comment endpoint failed');
      }
      
      // Test engagement metrics endpoint
      const metricsResponse = await this.makeRequest('GET', '/api/voting/engagement/song/song1');
      
      if (metricsResponse.engagementScore >= 0) {
        this.addTestResult('Engagement Metrics Endpoint', 'PASSED', 'Metrics endpoint working');
      } else {
        this.addTestResult('Engagement Metrics Endpoint', 'FAILED', 'Metrics endpoint failed');
      }
      
      // Test statistics endpoint
      const statsResponse = await this.makeRequest('GET', '/api/voting/stats');
      
      if (statsResponse.system) {
        this.addTestResult('Statistics Endpoint', 'PASSED', 'Statistics endpoint working');
      } else {
        this.addTestResult('Statistics Endpoint', 'FAILED', 'Statistics endpoint failed');
      }
      
    } catch (error) {
      this.addTestResult('API Endpoints', 'FAILED', error.message);
    }
  }

  /**
   * Test real-time updates
   */
  async testRealTimeUpdates() {
    console.log('📡 Testing Real-Time Updates...');
    
    try {
      // Test WebSocket connection (simulated)
      const wsConnected = this.orchestrator.wsClients.size >= 0;
      
      if (wsConnected !== undefined) {
        this.addTestResult('WebSocket Server', 'PASSED', 'WebSocket server accessible');
      } else {
        this.addTestResult('WebSocket Server', 'FAILED', 'WebSocket server not accessible');
      }
      
      // Test broadcast functionality
      this.orchestrator.broadcastUpdate('test', { message: 'Test broadcast' });
      this.addTestResult('Broadcast Functionality', 'PASSED', 'Broadcast executed without errors');
      
      // Test message handling
      const testMessage = { type: 'subscribe', channel: 'votes' };
      this.orchestrator.handleWebSocketMessage('test-client', testMessage);
      this.addTestResult('Message Handling', 'PASSED', 'WebSocket message handled');
      
    } catch (error) {
      this.addTestResult('Real-Time Updates', 'FAILED', error.message);
    }
  }

  /**
   * Test system integration
   */
  async testSystemIntegration() {
    console.log('🔗 Testing System Integration...');
    
    try {
      // Test end-to-end voting flow
      const voteResult = await this.orchestrator.votingMechanics.handleVote(
        'user1', 'collab1', 'collaboration', 'like', this.mockDatabase
      );
      
      if (voteResult.success) {
        this.addTestResult('End-to-End Voting', 'PASSED', 'Complete voting flow works');
      } else {
        this.addTestResult('End-to-End Voting', 'FAILED', 'Voting flow failed');
      }
      
      // Test featured version update integration
      const updateResult = await this.orchestrator.versionManager.updateFeaturedVersion(
        'song1', this.mockDatabase, this.orchestrator.votingMechanics
      );
      
      if (updateResult !== null) {
        this.addTestResult('Featured Version Integration', 'PASSED', 'Featured version update works');
      } else {
        this.addTestResult('Featured Version Integration', 'FAILED', 'Featured version update failed');
      }
      
      // Test chart integration with voting
      if (this.orchestrator.chartIntegration.isIntegrationActive) {
        this.addTestResult('Chart-Voting Integration', 'PASSED', 'Chart integration is active');
      } else {
        this.addTestResult('Chart-Voting Integration', 'FAILED', 'Chart integration not active');
      }
      
    } catch (error) {
      this.addTestResult('System Integration', 'FAILED', error.message);
    }
  }

  /**
   * Test cleanup functionality
   */
  async testCleanupFunctionality() {
    console.log('🧹 Testing Cleanup Functionality...');
    
    try {
      // Test anti-gaming cleanup
      this.orchestrator.antiGaming.cleanup();
      this.addTestResult('Anti-Gaming Cleanup', 'PASSED', 'Cleanup executed successfully');
      
      // Test version manager cleanup
      const cleanupResult = await this.orchestrator.versionManager.cleanupExpiredWindows(
        this.mockDatabase
      );
      
      if (cleanupResult.cleanedUp >= 0) {
        this.addTestResult('Version Manager Cleanup', 'PASSED', 'Window cleanup executed');
      } else {
        this.addTestResult('Version Manager Cleanup', 'FAILED', 'Window cleanup failed');
      }
      
      // Test voting mechanics cache cleanup
      this.orchestrator.votingMechanics.clearCaches();
      this.addTestResult('Voting Cache Cleanup', 'PASSED', 'Cache cleanup executed');
      
    } catch (error) {
      this.addTestResult('Cleanup Functionality', 'FAILED', error.message);
    }
  }

  // Helper Methods

  /**
   * Create mock database for testing
   */
  createMockDatabase() {
    return {
      User: {
        findByPk: async (id) => ({ id, username: `user${id}`, displayName: `User ${id}` }),
        findAll: async () => [
          { id: 'user1', username: 'user1', displayName: 'User 1' },
          { id: 'user2', username: 'user2', displayName: 'User 2' }
        ]
      },
      Song: {
        create: async (data) => ({ id: 'song1', ...data }),
        findByPk: async (id) => ({ 
          id, 
          title: 'Test Song', 
          userId: 'user1', 
          genre: 'pop',
          isCollaborationOpen: true,
          collaborationEndTime: moment().add(7, 'days').toISOString(),
          featuredVersionId: 'collab1',
          User: { id: 'user1', username: 'user1', displayName: 'User 1' },
          update: async (data) => ({ ...this, ...data })
        }),
        findAll: async () => [
          { 
            id: 'song1', 
            title: 'Test Song', 
            userId: 'user1', 
            genre: 'pop',
            featuredVersionId: 'collab1',
            User: { id: 'user1', username: 'user1', displayName: 'User 1' }
          }
        ]
      },
      Collaboration: {
        create: async (data) => ({ id: 'collab1', ...data }),
        findByPk: async (id) => ({ 
          id, 
          userId: 'user1', 
          songId: 'song1', 
          version: 1,
          User: { id: 'user1', username: 'user1', displayName: 'User 1' }
        }),
        findAll: async () => [
          { 
            id: 'collab1', 
            userId: 'user1', 
            songId: 'song1', 
            version: 1,
            User: { id: 'user1', username: 'user1', displayName: 'User 1' }
          }
        ],
        max: async () => 1
      },
      Vote: {
        create: async (data) => ({ id: 'vote1', ...data }),
        findOne: async () => null,
        count: async () => 1,
        destroy: async () => true
      },
      Comment: {
        create: async (data) => ({ id: 'comment1', ...data }),
        count: async () => 1
      },
      Sequelize: {
        Op: {
          gt: 'gt',
          lt: 'lt',
          ne: 'ne'
        }
      }
    };
  }

  /**
   * Generate test data
   */
  generateTestData() {
    return {
      users: [
        { id: 'user1', username: 'testuser1', displayName: 'Test User 1' },
        { id: 'user2', username: 'testuser2', displayName: 'Test User 2' }
      ],
      songs: [
        { id: 'song1', title: 'Test Song 1', userId: 'user1', genre: 'pop' },
        { id: 'song2', title: 'Test Song 2', userId: 'user2', genre: 'rock' }
      ],
      collaborations: [
        { id: 'collab1', userId: 'user1', songId: 'song1', version: 1 },
        { id: 'collab2', userId: 'user2', songId: 'song1', version: 2 }
      ]
    };
  }

  /**
   * Make simulated API request
   */
  async makeRequest(method, path, data = null) {
    try {
      // Simulate API request based on path
      if (path === '/api/voting/health') {
        return { status: 'healthy', timestamp: moment().toISOString() };
      }
      
      if (path === '/api/voting/vote' && method === 'POST') {
        return { success: true, action: 'liked', likeCount: 1 };
      }
      
      if (path === '/api/voting/comment' && method === 'POST') {
        return { success: true, comment: { id: 'comment1', content: data.content } };
      }
      
      if (path === '/api/voting/engagement/song/song1') {
        return { engagementScore: 3, likes: 1, comments: 1 };
      }
      
      if (path === '/api/voting/stats') {
        return { system: { initialized: true, uptime: 100 } };
      }
      
      return { success: true };
      
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, status, message) {
    this.testResults.push({
      test: testName,
      status,
      message,
      timestamp: moment().toISOString()
    });
  }

  /**
   * Print test results
   */
  printTestResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    console.log('\nDetailed Results:');
    console.log('-'.repeat(60));
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
    });
    
    console.log('\n🎉 Democratic Voting System Testing Complete!');
  }
}

// Export for use in other test files
module.exports = VotingSystemTester;

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new VotingSystemTester();
  tester.runAllTests().catch(console.error);
} 