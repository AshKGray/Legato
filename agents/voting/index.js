const SimpleVotingMechanics = require('./mechanics/simple-voting');
const VersionManager = require('./core/version-manager');
const ChartIntegration = require('./integration/chart-integration');
const AntiGamingSystem = require('./validation/anti-gaming');
const express = require('express');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const moment = require('moment');

/**
 * Legato Democratic Voting System - Main Orchestrator
 * 
 * Agent 6: Simplified voting system that provides:
 * - Simple like-based voting (no reputation weighting)
 * - Comment-based engagement tracking
 * - 7-day collaboration windows
 * - Featured version management based on likes/comments
 * - Real-time chart integration
 * - Anti-gaming protection
 * - WebSocket-based real-time updates
 */

class DemocraticVotingOrchestrator {
  constructor(config = {}) {
    this.config = {
      // Server configuration
      port: config.port || 3006,
      enableWebSocket: config.enableWebSocket !== false,
      wsPort: config.wsPort || 3007,
      
      // Database connection
      databaseModels: config.databaseModels || null,
      
      // Component configuration
      votingConfig: config.votingConfig || {},
      versionConfig: config.versionConfig || {},
      chartConfig: config.chartConfig || {},
      antiGamingConfig: config.antiGamingConfig || {},
      
      // Feature flags
      enableRealTimeUpdates: config.enableRealTimeUpdates !== false,
      enableChartIntegration: config.enableChartIntegration !== false,
      enableAntiGaming: config.enableAntiGaming !== false,
      
      // Cleanup settings
      enableAutoCleanup: config.enableAutoCleanup !== false,
      cleanupInterval: config.cleanupInterval || '0 */6 * * *', // Every 6 hours
      
      ...config
    };

    // Initialize core components
    this.votingMechanics = new SimpleVotingMechanics(this.config.votingConfig);
    this.versionManager = new VersionManager(this.config.versionConfig);
    this.chartIntegration = new ChartIntegration(this.config.chartConfig);
    this.antiGaming = new AntiGamingSystem(this.config.antiGamingConfig);

    // Express app for HTTP endpoints
    this.app = express();
    this.app.use(express.json());
    
    // WebSocket server for real-time updates
    this.wss = null;
    this.wsClients = new Map();
    
    // System state
    this.isInitialized = false;
    this.database = null;
    this.cleanupJobs = [];
    
    console.log('🗳️ Democratic Voting Orchestrator initialized');
  }

  /**
   * Initialize the voting system
   */
  async initialize(databaseModels) {
    try {
      if (this.isInitialized) {
        console.log('Voting system already initialized');
        return;
      }

      this.database = databaseModels;
      
      // Setup HTTP routes
      this.setupRoutes();
      
      // Start WebSocket server if enabled
      if (this.config.enableWebSocket) {
        this.startWebSocketServer();
      }
      
      // Start chart integration if enabled
      if (this.config.enableChartIntegration) {
        this.chartIntegration.startIntegration(
          this.votingMechanics,
          this.versionManager,
          this.database
        );
      }
      
      // Setup cleanup jobs
      if (this.config.enableAutoCleanup) {
        this.setupCleanupJobs();
      }
      
      this.isInitialized = true;
      console.log('✅ Democratic Voting System fully initialized');
      
    } catch (error) {
      console.error('Error initializing voting system:', error);
      throw error;
    }
  }

  /**
   * Start the HTTP server
   */
  async start() {
    if (!this.isInitialized) {
      throw new Error('Voting system must be initialized before starting');
    }

    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`🚀 Democratic Voting System running on port ${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the voting system
   */
  async stop() {
    console.log('⏹️ Stopping Democratic Voting System...');
    
    // Stop chart integration
    if (this.chartIntegration) {
      this.chartIntegration.stopIntegration();
    }
    
    // Stop cleanup jobs
    this.cleanupJobs.forEach(job => job.stop());
    this.cleanupJobs = [];
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Close HTTP server
    if (this.server) {
      this.server.close();
    }
    
    console.log('✅ Democratic Voting System stopped');
  }

  /**
   * Setup HTTP routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/api/voting/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: moment().toISOString(),
        components: {
          voting: true,
          versionManager: true,
          chartIntegration: this.config.enableChartIntegration,
          antiGaming: this.config.enableAntiGaming
        }
      });
    });

    // Vote on song or collaboration
    this.app.post('/api/voting/vote', async (req, res) => {
      try {
        const { userId, targetId, targetType, action } = req.body;
        
        // Validate input
        if (!userId || !targetId || !targetType || !action) {
          return res.status(400).json({
            error: 'Missing required fields: userId, targetId, targetType, action'
          });
        }

        // Anti-gaming validation
        if (this.config.enableAntiGaming && action === 'like') {
          const validation = await this.antiGaming.validateLike(userId, targetId, targetType);
          if (!validation.valid) {
            return res.status(429).json({
              error: validation.message,
              reason: validation.reason,
              retryAfter: validation.retryAfter
            });
          }
        }

        // Process vote
        const result = await this.votingMechanics.handleVote(
          userId, targetId, targetType, action, this.database
        );

        // Update featured versions if this affects a collaboration
        if (targetType === 'collaboration') {
          const collaboration = await this.database.Collaboration.findByPk(targetId);
          if (collaboration) {
            await this.versionManager.updateFeaturedVersion(
              collaboration.songId,
              this.database,
              this.votingMechanics
            );
          }
        }

        // Send real-time update
        if (this.config.enableRealTimeUpdates) {
          this.broadcastUpdate('vote', {
            userId,
            targetId,
            targetType,
            action,
            result
          });
        }

        // Process chart integration event
        if (this.config.enableChartIntegration) {
          await this.chartIntegration.processEngagementEvent({
            targetId,
            targetType,
            eventType: action,
            userId,
            timestamp: moment().toISOString()
          });
        }

        res.json({
          success: true,
          ...result
        });

      } catch (error) {
        console.error('Vote processing error:', error);
        res.status(500).json({
          error: 'Failed to process vote',
          message: error.message
        });
      }
    });

    // Add comment
    this.app.post('/api/voting/comment', async (req, res) => {
      try {
        const { userId, targetId, targetType, content, parentId } = req.body;
        
        // Validate input
        if (!userId || !targetId || !targetType || !content) {
          return res.status(400).json({
            error: 'Missing required fields: userId, targetId, targetType, content'
          });
        }

        // Anti-gaming validation
        if (this.config.enableAntiGaming) {
          const validation = await this.antiGaming.validateComment(
            userId, targetId, targetType, content
          );
          if (!validation.valid) {
            return res.status(429).json({
              error: validation.message,
              reason: validation.reason,
              retryAfter: validation.retryAfter
            });
          }
        }

        // Add comment
        const result = await this.votingMechanics.addComment(
          userId, targetId, targetType, content, this.database, parentId
        );

        // Send real-time update
        if (this.config.enableRealTimeUpdates) {
          this.broadcastUpdate('comment', {
            userId,
            targetId,
            targetType,
            content,
            result
          });
        }

        // Process chart integration event
        if (this.config.enableChartIntegration) {
          await this.chartIntegration.processEngagementEvent({
            targetId,
            targetType,
            eventType: 'comment',
            userId,
            timestamp: moment().toISOString()
          });
        }

        res.json({
          success: true,
          ...result
        });

      } catch (error) {
        console.error('Comment processing error:', error);
        res.status(500).json({
          error: 'Failed to add comment',
          message: error.message
        });
      }
    });

    // Get engagement metrics
    this.app.get('/api/voting/engagement/:targetType/:targetId', async (req, res) => {
      try {
        const { targetType, targetId } = req.params;
        
        const metrics = await this.votingMechanics.getEngagementMetrics(
          targetId, targetType, this.database
        );

        res.json(metrics);

      } catch (error) {
        console.error('Error getting engagement metrics:', error);
        res.status(500).json({
          error: 'Failed to get engagement metrics',
          message: error.message
        });
      }
    });

    // Create song with collaboration window
    this.app.post('/api/voting/song', async (req, res) => {
      try {
        const songData = req.body;
        
        const result = await this.versionManager.createSongWithCollaborationWindow(
          songData, this.database
        );

        res.json({
          success: true,
          ...result
        });

      } catch (error) {
        console.error('Error creating song:', error);
        res.status(500).json({
          error: 'Failed to create song',
          message: error.message
        });
      }
    });

    // Join song collaboration
    this.app.post('/api/voting/song/:songId/join', async (req, res) => {
      try {
        const { songId } = req.params;
        const { userId, ...collaborationData } = req.body;
        
        const result = await this.versionManager.joinSongCollaboration(
          songId, userId, collaborationData, this.database
        );

        res.json({
          success: true,
          ...result
        });

      } catch (error) {
        console.error('Error joining collaboration:', error);
        res.status(500).json({
          error: 'Failed to join collaboration',
          message: error.message
        });
      }
    });

    // Get version hierarchy
    this.app.get('/api/voting/song/:songId/versions', async (req, res) => {
      try {
        const { songId } = req.params;
        
        const hierarchy = await this.versionManager.getVersionHierarchy(
          songId, this.database, this.votingMechanics
        );

        res.json(hierarchy);

      } catch (error) {
        console.error('Error getting version hierarchy:', error);
        res.status(500).json({
          error: 'Failed to get version hierarchy',
          message: error.message
        });
      }
    });

    // Get open collaborations
    this.app.get('/api/voting/collaborations/open', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 20;
        
        const result = await this.versionManager.getOpenCollaborations(
          this.database, limit
        );

        res.json(result);

      } catch (error) {
        console.error('Error getting open collaborations:', error);
        res.status(500).json({
          error: 'Failed to get open collaborations',
          message: error.message
        });
      }
    });

    // Get charts
    this.app.get('/api/voting/charts', async (req, res) => {
      try {
        if (!this.config.enableChartIntegration) {
          return res.status(404).json({
            error: 'Chart integration not enabled'
          });
        }

        const charts = await this.chartIntegration.getComprehensiveChartData();
        res.json(charts);

      } catch (error) {
        console.error('Error getting charts:', error);
        res.status(500).json({
          error: 'Failed to get charts',
          message: error.message
        });
      }
    });

    // Get system statistics
    this.app.get('/api/voting/stats', async (req, res) => {
      try {
        const stats = {
          system: {
            initialized: this.isInitialized,
            uptime: process.uptime(),
            timestamp: moment().toISOString()
          },
          voting: this.votingMechanics.getCachedEngagement ? 
            'Available' : 'Basic functionality',
          versionManager: this.versionManager.getWindowStatistics(),
          chartIntegration: this.config.enableChartIntegration ? 
            this.chartIntegration.getIntegrationStats() : null,
          antiGaming: this.config.enableAntiGaming ? 
            this.antiGaming.getSystemStats() : null,
          webSocket: {
            enabled: this.config.enableWebSocket,
            connectedClients: this.wsClients.size
          }
        };

        res.json(stats);

      } catch (error) {
        console.error('Error getting system stats:', error);
        res.status(500).json({
          error: 'Failed to get system statistics',
          message: error.message
        });
      }
    });
  }

  /**
   * Start WebSocket server for real-time updates
   */
  startWebSocketServer() {
    this.wss = new WebSocket.Server({ port: this.config.wsPort });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      this.wsClients.set(clientId, {
        ws,
        connectedAt: Date.now(),
        subscriptions: new Set()
      });

      console.log(`📡 WebSocket client connected: ${clientId}`);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(clientId, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.wsClients.delete(clientId);
        console.log(`📡 WebSocket client disconnected: ${clientId}`);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        clientId,
        timestamp: moment().toISOString()
      }));
    });

    console.log(`📡 WebSocket server started on port ${this.config.wsPort}`);
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(clientId, data) {
    const client = this.wsClients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'subscribe':
        client.subscriptions.add(data.channel);
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          channel: data.channel,
          timestamp: moment().toISOString()
        }));
        break;

      case 'unsubscribe':
        client.subscriptions.delete(data.channel);
        client.ws.send(JSON.stringify({
          type: 'unsubscribed',
          channel: data.channel,
          timestamp: moment().toISOString()
        }));
        break;

      default:
        console.log(`Unknown WebSocket message type: ${data.type}`);
    }
  }

  /**
   * Broadcast update to WebSocket clients
   */
  broadcastUpdate(type, data) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type,
      data,
      timestamp: moment().toISOString()
    });

    this.wsClients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Setup cleanup jobs
   */
  setupCleanupJobs() {
    // Cleanup expired collaboration windows
    const windowCleanupJob = cron.schedule(this.config.cleanupInterval, async () => {
      try {
        await this.versionManager.cleanupExpiredWindows(this.database);
      } catch (error) {
        console.error('Window cleanup error:', error);
      }
    });

    // Cleanup anti-gaming data
    const antiGamingCleanupJob = cron.schedule(this.config.cleanupInterval, () => {
      try {
        if (this.config.enableAntiGaming) {
          this.antiGaming.cleanup();
        }
      } catch (error) {
        console.error('Anti-gaming cleanup error:', error);
      }
    });

    this.cleanupJobs.push(windowCleanupJob, antiGamingCleanupJob);
    
    console.log('🧹 Cleanup jobs scheduled');
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      components: {
        votingMechanics: !!this.votingMechanics,
        versionManager: !!this.versionManager,
        chartIntegration: this.config.enableChartIntegration,
        antiGaming: this.config.enableAntiGaming,
        webSocket: this.config.enableWebSocket
      },
      server: {
        httpPort: this.config.port,
        wsPort: this.config.wsPort,
        connectedClients: this.wsClients.size
      },
      database: !!this.database
    };
  }
}

module.exports = DemocraticVotingOrchestrator; 