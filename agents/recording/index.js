const RecordingStudio = require('./interfaces/recording-studio');
const MediaTypes = require('./utils/media-types');
const express = require('express');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

/**
 * Legato Recording & Media System - Main Orchestrator
 * 
 * Agent 5: Comprehensive recording solution that provides:
 * - Real-time audio/video recording (like Smule)
 * - File upload capabilities
 * - Play-along functionality for duets/collaborations
 * - Media processing and storage
 * - WebSocket-based real-time communication
 */

class RecordingMediaOrchestrator {
  constructor(config = {}) {
    this.config = {
      // Server configuration
      port: config.port || 3005,
      enableWebSocket: config.enableWebSocket !== false,
      wsPort: config.wsPort || 3006,
      
      // Recording configuration
      enableVideo: config.enableVideo !== false,
      enablePlayAlong: config.enablePlayAlong !== false,
      maxConcurrentSessions: config.maxConcurrentSessions || 50,
      
      // Media processing
      enableMediaProcessing: config.enableMediaProcessing !== false,
      enableAutoCleanup: config.enableAutoCleanup !== false,
      
      // Storage configuration
      mediaStorageDir: config.mediaStorageDir || './media-storage',
      tempDir: config.tempDir || './temp-media',
      
      ...config
    };

    // Initialize core systems
    this.mediaTypes = new MediaTypes();
    this.recordingStudio = new RecordingStudio({
      maxSessions: this.config.maxConcurrentSessions,
      enableVideo: this.config.enableVideo,
      enablePlayAlong: this.config.enablePlayAlong,
      recording: {
        outputDir: this.config.mediaStorageDir + '/recordings',
        tempDir: this.config.tempDir + '/recordings'
      },
      upload: {
        uploadDir: this.config.mediaStorageDir + '/uploads',
        tempDir: this.config.tempDir + '/uploads'
      }
    });

    // Express app for HTTP endpoints
    this.app = express();
    this.setupExpress();

    // WebSocket server for real-time communication
    if (this.config.enableWebSocket) {
      this.wss = null;
      this.wsConnections = new Map();
    }

    // System state
    this.isInitialized = false;
    this.activeConnections = 0;
    this.totalSessions = 0;

    console.log('🎬 Recording & Media Orchestrator initialized');
  }

  /**
   * Initialize the recording system
   */
  async initialize() {
    try {
      // Set up scheduled cleanup if enabled
      if (this.config.enableAutoCleanup) {
        this.setupCleanupScheduler();
      }

      // Start HTTP server
      this.server = this.app.listen(this.config.port, () => {
        console.log(`🚀 Recording API server running on port ${this.config.port}`);
      });

      // Start WebSocket server
      if (this.config.enableWebSocket) {
        this.startWebSocketServer();
      }

      this.isInitialized = true;
      console.log('✅ Recording & Media System initialized successfully');

      return {
        success: true,
        httpPort: this.config.port,
        wsPort: this.config.wsPort,
        capabilities: this.getSystemCapabilities()
      };

    } catch (error) {
      console.error('❌ Failed to initialize Recording & Media System:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up Express middleware and routes
   */
  setupExpress() {
    // Middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Routes
    this.setupRoutes();
  }

  /**
   * Set up API routes
   */
  setupRoutes() {
    // System endpoints
    this.app.get('/api/recording/capabilities', (req, res) => {
      res.json(this.getSystemCapabilities());
    });

    this.app.get('/api/recording/status', (req, res) => {
      res.json(this.getSystemStatus());
    });

    // Session management
    this.app.post('/api/recording/session', async (req, res) => {
      const { userId, options } = req.body;
      const result = await this.createRecordingSession(userId, options);
      res.json(result);
    });

    this.app.get('/api/recording/session/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      const session = this.recordingStudio.getSessionInfo(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json({ success: true, session });
    });

    this.app.delete('/api/recording/session/:sessionId', async (req, res) => {
      const { sessionId } = req.params;
      const result = await this.recordingStudio.cleanupSession(sessionId);
      res.json(result);
    });

    // Recording control
    this.app.post('/api/recording/session/:sessionId/start', async (req, res) => {
      const { sessionId } = req.params;
      const { options } = req.body;
      const result = await this.recordingStudio.startRecording(sessionId, options);
      res.json(result);
    });

    this.app.post('/api/recording/session/:sessionId/stop', async (req, res) => {
      const { sessionId } = req.params;
      const result = await this.recordingStudio.stopRecording(sessionId);
      res.json(result);
    });

    // File upload
    this.app.post('/api/recording/session/:sessionId/upload', 
      this.recordingStudio.uploader.getUploadMiddleware('media'),
      async (req, res) => {
        const { sessionId } = req.params;
        const uploadId = uuidv4();
        const result = await this.recordingStudio.uploader.processUpload(uploadId, req, req.body);
        res.json(result);
      }
    );

    // Play-along functionality
    this.app.post('/api/recording/session/:sessionId/playalong/:trackId', async (req, res) => {
      const { sessionId, trackId } = req.params;
      const result = await this.recordingStudio.setupPlayAlong(sessionId, trackId);
      res.json(result);
    });

    this.app.post('/api/recording/session/:sessionId/playalong/start', async (req, res) => {
      const { sessionId } = req.params;
      const result = await this.recordingStudio.startPlayAlong(sessionId);
      res.json(result);
    });

    this.app.post('/api/recording/session/:sessionId/playalong/stop', async (req, res) => {
      const { sessionId } = req.params;
      const result = await this.recordingStudio.stopPlayAlong(sessionId);
      res.json(result);
    });

    // Media type utilities
    this.app.get('/api/recording/formats', (req, res) => {
      const { category } = req.query;
      const formats = this.mediaTypes.getSupportedFormats(category);
      res.json({ formats });
    });

    this.app.post('/api/recording/validate', (req, res) => {
      const { filename, mimeType, size } = req.body;
      const file = { originalname: filename, mimetype: mimeType, size };
      const validation = this.mediaTypes.validateMedia(file);
      res.json(validation);
    });

    // Statistics and monitoring
    this.app.get('/api/recording/stats', (req, res) => {
      const stats = this.getDetailedStats();
      res.json(stats);
    });
  }

  /**
   * Start WebSocket server for real-time communication
   */
  startWebSocketServer() {
    this.wss = new WebSocket.Server({ 
      port: this.config.wsPort,
      clientTracking: true
    });

    this.wss.on('connection', (ws, req) => {
      const connectionId = uuidv4();
      
      // Store connection
      this.wsConnections.set(connectionId, {
        id: connectionId,
        ws,
        connectedAt: Date.now(),
        sessionId: null,
        userId: null
      });

      this.activeConnections++;
      console.log(`📡 WebSocket connection established: ${connectionId} (${this.activeConnections} active)`);

      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(connectionId, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.wsConnections.delete(connectionId);
        this.activeConnections--;
        console.log(`📡 WebSocket disconnected: ${connectionId} (${this.activeConnections} active)`);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        connectionId,
        capabilities: this.recordingStudio.getRecordingCapabilities()
      }));
    });

    console.log(`📡 WebSocket server running on port ${this.config.wsPort}`);
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(connectionId, data) {
    const connection = this.wsConnections.get(connectionId);
    if (!connection) return;

    const { type, payload } = data;

    switch (type) {
      case 'join-session':
        this.handleJoinSession(connectionId, payload);
        break;
      
      case 'recording-progress':
        this.handleRecordingProgress(connectionId, payload);
        break;
      
      case 'playback-sync':
        this.handlePlaybackSync(connectionId, payload);
        break;
      
      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Handle session join via WebSocket
   */
  handleJoinSession(connectionId, payload) {
    const { sessionId, userId } = payload;
    const connection = this.wsConnections.get(connectionId);
    
    if (connection) {
      connection.sessionId = sessionId;
      connection.userId = userId;
      
      // Send session info
      const sessionInfo = this.recordingStudio.getSessionInfo(sessionId);
      connection.ws.send(JSON.stringify({
        type: 'session-joined',
        session: sessionInfo
      }));
    }
  }

  /**
   * Create new recording session
   */
  async createRecordingSession(userId, options = {}) {
    try {
      const result = await this.recordingStudio.createSession(userId, options);
      
      if (result.success) {
        this.totalSessions++;
        
        // Notify connected clients if this is a collaborative session
        if (options.collaborationType !== 'solo') {
          this.broadcastToSession(result.sessionId, {
            type: 'session-created',
            session: result.session
          });
        }
      }

      return result;

    } catch (error) {
      console.error('Failed to create recording session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Broadcast message to all connections in a session
   */
  broadcastToSession(sessionId, message) {
    for (const connection of this.wsConnections.values()) {
      if (connection.sessionId === sessionId) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Get system capabilities
   */
  getSystemCapabilities() {
    return {
      recording: this.recordingStudio.getRecordingCapabilities(),
      realTime: this.config.enableWebSocket,
      playAlong: this.config.enablePlayAlong,
      videoSupport: this.config.enableVideo,
      maxConcurrentSessions: this.config.maxConcurrentSessions,
      supportedFormats: {
        audio: this.mediaTypes.getSupportedFormats('audio'),
        video: this.mediaTypes.getSupportedFormats('video')
      },
      collaborationTypes: Object.keys(this.mediaTypes.collaborationTypes)
    };
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const studioStats = this.recordingStudio.getStudioStats();
    
    return {
      initialized: this.isInitialized,
      activeConnections: this.activeConnections,
      activeSessions: studioStats.activeSessions,
      totalSessionsCreated: this.totalSessions,
      httpServer: !!this.server,
      webSocketServer: !!this.wss,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      studioStats
    };
  }

  /**
   * Get detailed system statistics
   */
  getDetailedStats() {
    const status = this.getSystemStatus();
    const capabilities = this.getSystemCapabilities();
    
    return {
      status,
      capabilities,
      connections: Array.from(this.wsConnections.values()).map(conn => ({
        id: conn.id,
        connectedAt: conn.connectedAt,
        sessionId: conn.sessionId,
        userId: conn.userId
      })),
      activeSessions: this.recordingStudio.getActiveSessions()
    };
  }

  /**
   * Set up automatic cleanup scheduler
   */
  setupCleanupScheduler() {
    // Clean up temporary files every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🧹 Running scheduled cleanup...');
      
      try {
        // Clean up uploads
        const uploadCleanup = await this.recordingStudio.uploader.cleanupTempFiles();
        console.log(`🧹 Cleaned up ${uploadCleanup} temporary upload files`);
        
        // Clean up old sessions (older than 24 hours)
        const oldSessions = [];
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [sessionId, session] of this.recordingStudio.sessions) {
          if (now - session.createdAt > maxAge) {
            oldSessions.push(sessionId);
          }
        }
        
        for (const sessionId of oldSessions) {
          await this.recordingStudio.cleanupSession(sessionId);
        }
        
        console.log(`🧹 Cleaned up ${oldSessions.length} old sessions`);
        
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    });

    console.log('⏰ Automatic cleanup scheduler enabled');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Recording & Media System...');

    try {
      // Close WebSocket connections
      if (this.wss) {
        for (const connection of this.wsConnections.values()) {
          connection.ws.close();
        }
        this.wss.close();
      }

      // Clean up all active sessions
      const activeSessions = this.recordingStudio.getActiveSessions();
      for (const session of activeSessions) {
        await this.recordingStudio.cleanupSession(session.id);
      }

      // Close HTTP server
      if (this.server) {
        this.server.close();
      }

      console.log('✅ Recording & Media System shut down successfully');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

module.exports = RecordingMediaOrchestrator; 