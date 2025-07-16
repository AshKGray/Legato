const axios = require('axios');

/**
 * Legato Integration Test Suite
 * Tests all agents working together
 */

class IntegrationTester {
  constructor() {
    this.results = {
      apiCore: false,
      votingSystem: false,
      mobileApp: false,
      database: false,
      overall: false
    };
  }

  async testApiCore() {
    try {
      console.log('🔍 Testing API Core (Agent 3)...');
      const response = await axios.get('http://localhost:3001/api/health');
      
      if (response.status === 200 && response.data.status === 'OK') {
        console.log('✅ API Core is running and healthy');
        this.results.apiCore = true;
        return true;
      }
    } catch (error) {
      console.log('❌ API Core test failed:', error.message);
      return false;
    }
  }

  async testVotingSystem() {
    try {
      console.log('🔍 Testing Voting System (Agent 6)...');
      const response = await axios.get('http://localhost:3006/api/voting/health');
      
      if (response.status === 200) {
        console.log('✅ Voting System is running and healthy');
        this.results.votingSystem = true;
        return true;
      }
    } catch (error) {
      console.log('❌ Voting System test failed:', error.message);
      return false;
    }
  }

  async testDatabaseConnection() {
    try {
      console.log('🔍 Testing Database Connection...');
      // Test a simple database operation through the API
      const response = await axios.get('http://localhost:3001/api/users');
      
      if (response.status === 200) {
        console.log('✅ Database connection is working');
        this.results.database = true;
        return true;
      }
    } catch (error) {
      console.log('❌ Database test failed:', error.message);
      return false;
    }
  }

  async testMobileAppConnection() {
    try {
      console.log('🔍 Testing Mobile App API Connection...');
      // Test if mobile app can reach the API
      const response = await axios.get('http://192.168.0.232:3001/api/health');
      
      if (response.status === 200) {
        console.log('✅ Mobile app can connect to API');
        this.results.mobileApp = true;
        return true;
      }
    } catch (error) {
      console.log('❌ Mobile app connection test failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Legato Integration Tests...\n');
    
    const tests = [
      this.testApiCore(),
      this.testVotingSystem(),
      this.testDatabaseConnection(),
      this.testMobileAppConnection()
    ];

    await Promise.allSettled(tests);
    
    // Calculate overall status
    this.results.overall = Object.values(this.results).every(result => result === true);
    
    this.printResults();
  }

  printResults() {
    console.log('\n📊 Integration Test Results:');
    console.log('========================');
    console.log(`API Core (Agent 3): ${this.results.apiCore ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Voting System (Agent 6): ${this.results.votingSystem ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Database Connection: ${this.results.database ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Mobile App Connection: ${this.results.mobileApp ? '✅ PASS' : '❌ FAIL'}`);
    console.log('========================');
    console.log(`Overall Status: ${this.results.overall ? '✅ ALL SYSTEMS GO' : '⚠️ SOME ISSUES DETECTED'}`);
    
    if (!this.results.overall) {
      console.log('\n🔧 Troubleshooting Tips:');
      if (!this.results.apiCore) {
        console.log('- Start API Core: cd agents/api-core && npm start');
      }
      if (!this.results.votingSystem) {
        console.log('- Start Voting System: cd agents/voting && npm start');
      }
      if (!this.results.database) {
        console.log('- Check database connection and migrations');
      }
      if (!this.results.mobileApp) {
        console.log('- Verify API base URL in mobile app matches your IP');
      }
    }
  }
}

// Run the integration tests
const tester = new IntegrationTester();
tester.runAllTests().catch(console.error); 