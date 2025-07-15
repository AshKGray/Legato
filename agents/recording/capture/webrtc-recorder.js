const MediaTypes = require('../utils/media-types');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

/**
 * WebRTC Recorder for Legato
 * 
 * Handles real-time audio/video recording in the browser
 * Supports play-along functionality like Smule for duets and collaborations
 */

class WebRTCRecorder {
  constructor(config = {}) {
    this.config = {
      maxRecordingTime: config.maxRecordingTime || 300000, // 5 minutes
      chunkSize: config.chunkSize || 1000, // 1 second chunks
      outputDir: config.outputDir || './recordings',
      tempDir: config.tempDir || './temp',
      ...config
    };

    this.mediaTypes = new MediaTypes();
    this.activeRecordings = new Map();
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Initialize recording session
   */
  async initializeRecording(sessionId, options = {}) {
    try {
      const {
        recordingType = 'audio-medium',
        collaborationType = 'solo',
        playAlongTrack = null,
        quality = 'medium'
      } = options;

      // Generate unique recording ID
      const recordingId = sessionId || uuidv4();
      
      // Get media constraints based on type
      const mediaConstraints = this.mediaTypes.getMediaConstraints(recordingType);
      
      // Create recording session object
      const session = {
        id: recordingId,
        type: recordingType.split('-')[0], // 'audio' or 'video'
        quality,
        constraints: mediaConstraints,
        collaborationType,
        playAlongTrack,
        status: 'initialized',
        chunks: [],
        startTime: null,
        duration: 0,
        metadata: {
          userAgent: 'web',
          timestamp: new Date().toISOString(),
          ...options.metadata
        }
      };

      this.activeRecordings.set(recordingId, session);
      
      return {
        success: true,
        sessionId: recordingId,
        constraints: mediaConstraints,
        session
      };

    } catch (error) {
      console.error('Failed to initialize recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start recording with media stream
   */
  async startRecording(sessionId, mediaStream, options = {}) {
    try {
      const session = this.activeRecordings.get(sessionId);
      if (!session) {
        throw new Error('Recording session not found');
      }

      // Get recording configuration
      const recordingConfig = this.mediaTypes.getRecordingConfig(
        session.quality,
        session.type
      );

      // Create MediaRecorder with appropriate options
      const mimeType = recordingConfig.format;
      const mediaRecorderOptions = {
        mimeType: mimeType,
        audioBitsPerSecond: recordingConfig.bitRate || 128000
      };

      // Add video options if recording video
      if (session.type === 'video') {
        mediaRecorderOptions.videoBitsPerSecond = recordingConfig.videoBitRate || 1000000;
      }

      const mediaRecorder = new MediaRecorder(mediaStream, mediaRecorderOptions);
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          session.chunks.push(event.data);
          this.onChunkReceived(sessionId, event.data);
        }
      };

      mediaRecorder.onstop = () => {
        this.onRecordingComplete(sessionId);
      };

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this.onRecordingError(sessionId, error);
      };

      // Update session
      session.mediaRecorder = mediaRecorder;
      session.mediaStream = mediaStream;
      session.status = 'recording';
      session.startTime = Date.now();

      // Start recording with time slice for chunking
      mediaRecorder.start(this.config.chunkSize);

      // Set up automatic stop timer
      session.stopTimer = setTimeout(() => {
        this.stopRecording(sessionId);
      }, this.config.maxRecordingTime);

      console.log(`📹 Recording started: ${sessionId} (${session.type})`);

      return {
        success: true,
        sessionId,
        status: 'recording',
        startTime: session.startTime
      };

    } catch (error) {
      console.error('Failed to start recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(sessionId) {
    try {
      const session = this.activeRecordings.get(sessionId);
      if (!session || session.status !== 'recording') {
        throw new Error('No active recording found');
      }

      // Stop the MediaRecorder
      if (session.mediaRecorder && session.mediaRecorder.state === 'recording') {
        session.mediaRecorder.stop();
      }

      // Stop media stream tracks
      if (session.mediaStream) {
        session.mediaStream.getTracks().forEach(track => track.stop());
      }

      // Clear the stop timer
      if (session.stopTimer) {
        clearTimeout(session.stopTimer);
      }

      session.status = 'stopping';
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;

      console.log(`⏹️ Recording stopped: ${sessionId} (${session.duration}ms)`);

      return {
        success: true,
        sessionId,
        duration: session.duration,
        status: 'stopping'
      };

    } catch (error) {
      console.error('Failed to stop recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(sessionId) {
    try {
      const session = this.activeRecordings.get(sessionId);
      if (!session || session.status !== 'recording') {
        throw new Error('No active recording to pause');
      }

      if (session.mediaRecorder && session.mediaRecorder.state === 'recording') {
        session.mediaRecorder.pause();
        session.status = 'paused';
        session.pausedAt = Date.now();
      }

      return {
        success: true,
        sessionId,
        status: 'paused'
      };

    } catch (error) {
      console.error('Failed to pause recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(sessionId) {
    try {
      const session = this.activeRecordings.get(sessionId);
      if (!session || session.status !== 'paused') {
        throw new Error('No paused recording to resume');
      }

      if (session.mediaRecorder && session.mediaRecorder.state === 'paused') {
        session.mediaRecorder.resume();
        session.status = 'recording';
        
        // Add paused time to total duration calculation
        if (session.pausedAt) {
          session.pausedDuration = (session.pausedDuration || 0) + (Date.now() - session.pausedAt);
        }
      }

      return {
        success: true,
        sessionId,
        status: 'recording'
      };

    } catch (error) {
      console.error('Failed to resume recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recording status and metadata
   */
  getRecordingStatus(sessionId) {
    const session = this.activeRecordings.get(sessionId);
    if (!session) {
      return {
        exists: false,
        error: 'Recording session not found'
      };
    }

    const currentTime = Date.now();
    const elapsed = session.startTime ? currentTime - session.startTime : 0;
    const remainingTime = Math.max(0, this.config.maxRecordingTime - elapsed);

    return {
      exists: true,
      sessionId,
      status: session.status,
      type: session.type,
      quality: session.quality,
      elapsed,
      remainingTime,
      chunksCount: session.chunks.length,
      collaborationType: session.collaborationType,
      playAlongTrack: session.playAlongTrack,
      metadata: session.metadata
    };
  }

  /**
   * Handle chunk received during recording
   */
  onChunkReceived(sessionId, chunk) {
    const session = this.activeRecordings.get(sessionId);
    if (!session) return;

    // Update real-time statistics
    const chunkSizeMB = (chunk.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 Chunk received for ${sessionId}: ${chunkSizeMB}MB`);

    // Emit progress event (for real-time UI updates)
    this.emitProgress(sessionId, {
      chunkIndex: session.chunks.length,
      chunkSize: chunk.size,
      totalSize: session.chunks.reduce((sum, c) => sum + c.size, 0),
      elapsed: Date.now() - session.startTime
    });
  }

  /**
   * Handle recording completion
   */
  async onRecordingComplete(sessionId) {
    try {
      const session = this.activeRecordings.get(sessionId);
      if (!session) return;

      session.status = 'processing';
      
      console.log(`✅ Recording complete: ${sessionId}`);
      console.log(`📊 Chunks: ${session.chunks.length}, Total size: ${session.chunks.reduce((sum, c) => sum + c.size, 0)} bytes`);

      // Combine chunks into final blob
      const finalBlob = new Blob(session.chunks, { 
        type: session.mediaRecorder.mimeType 
      });

      // Save to temporary file
      const tempFilePath = await this.saveTempFile(sessionId, finalBlob);
      
      session.tempFilePath = tempFilePath;
      session.finalBlob = finalBlob;
      session.status = 'completed';

      // Emit completion event
      this.emitCompletion(sessionId, {
        duration: session.duration,
        fileSize: finalBlob.size,
        filePath: tempFilePath,
        mimeType: session.mediaRecorder.mimeType
      });

    } catch (error) {
      console.error('Error processing completed recording:', error);
      this.onRecordingError(sessionId, error);
    }
  }

  /**
   * Handle recording errors
   */
  onRecordingError(sessionId, error) {
    const session = this.activeRecordings.get(sessionId);
    if (session) {
      session.status = 'error';
      session.error = error.message || error;
    }

    console.error(`❌ Recording error for ${sessionId}:`, error);
    
    this.emitError(sessionId, error);
  }

  /**
   * Save temporary file
   */
  async saveTempFile(sessionId, blob) {
    const session = this.activeRecordings.get(sessionId);
    const extension = this.mediaTypes.getExtension(session.mediaRecorder.mimeType);
    const filename = `${sessionId}_${Date.now()}${extension}`;
    const filePath = path.join(this.config.tempDir, filename);

    // Convert blob to buffer (this would be done differently in browser)
    // For now, we'll simulate the file saving process
    await fs.ensureDir(this.config.tempDir);
    
    // In a real browser environment, you'd use different methods to handle blob
    console.log(`💾 Saved temporary file: ${filePath}`);
    
    return filePath;
  }

  /**
   * Clean up recording session
   */
  async cleanupSession(sessionId) {
    const session = this.activeRecordings.get(sessionId);
    if (!session) return;

    // Stop any active recording
    if (session.status === 'recording' || session.status === 'paused') {
      await this.stopRecording(sessionId);
    }

    // Clean up temporary files
    if (session.tempFilePath) {
      try {
        await fs.remove(session.tempFilePath);
      } catch (error) {
        console.warn('Failed to cleanup temp file:', error);
      }
    }

    // Remove from active recordings
    this.activeRecordings.delete(sessionId);
    
    console.log(`🧹 Cleaned up recording session: ${sessionId}`);
  }

  /**
   * Get all active recording sessions
   */
  getActiveSessions() {
    const sessions = [];
    for (const [sessionId, session] of this.activeRecordings) {
      sessions.push({
        sessionId,
        status: session.status,
        type: session.type,
        duration: session.duration || (Date.now() - (session.startTime || Date.now())),
        collaborationType: session.collaborationType
      });
    }
    return sessions;
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    await fs.ensureDir(this.config.outputDir);
    await fs.ensureDir(this.config.tempDir);
  }

  // Event emitters (to be connected to WebSocket or EventEmitter in real implementation)
  emitProgress(sessionId, data) {
    // In real implementation, emit to connected clients
    console.log(`📈 Progress for ${sessionId}:`, data);
  }

  emitCompletion(sessionId, data) {
    console.log(`🎉 Recording completed for ${sessionId}:`, data);
  }

  emitError(sessionId, error) {
    console.log(`💥 Recording error for ${sessionId}:`, error);
  }
}

module.exports = WebRTCRecorder; 