const mime = require('mime-types');

/**
 * Media Types and Format Management for Legato Recording System
 * 
 * Handles all audio/video format detection, validation, and configuration
 * Similar to Smule's media handling but more flexible
 */

class MediaTypes {
  constructor() {
    // Supported audio formats
    this.audioFormats = {
      'audio/mp3': { ext: '.mp3', quality: 'high', streaming: true },
      'audio/mpeg': { ext: '.mp3', quality: 'high', streaming: true },
      'audio/wav': { ext: '.wav', quality: 'highest', streaming: false },
      'audio/webm': { ext: '.webm', quality: 'high', streaming: true },
      'audio/ogg': { ext: '.ogg', quality: 'high', streaming: true },
      'audio/m4a': { ext: '.m4a', quality: 'high', streaming: true },
      'audio/aac': { ext: '.aac', quality: 'high', streaming: true }
    };

    // Supported video formats
    this.videoFormats = {
      'video/mp4': { ext: '.mp4', quality: 'high', streaming: true, mobile: true },
      'video/webm': { ext: '.webm', quality: 'high', streaming: true, mobile: false },
      'video/quicktime': { ext: '.mov', quality: 'highest', streaming: false, mobile: true },
      'video/x-msvideo': { ext: '.avi', quality: 'medium', streaming: false, mobile: false }
    };

    // Recording configuration presets
    this.recordingPresets = {
      // Audio-only presets
      'audio-low': {
        type: 'audio',
        sampleRate: 22050,
        bitRate: 64000,
        channels: 1,
        format: 'audio/webm'
      },
      'audio-medium': {
        type: 'audio',
        sampleRate: 44100,
        bitRate: 128000,
        channels: 2,
        format: 'audio/webm'
      },
      'audio-high': {
        type: 'audio',
        sampleRate: 48000,
        bitRate: 320000,
        channels: 2,
        format: 'audio/wav'
      },
      
      // Video presets
      'video-low': {
        type: 'video',
        width: 480,
        height: 640,
        frameRate: 24,
        videoBitRate: 500000,
        audioBitRate: 64000,
        format: 'video/webm'
      },
      'video-medium': {
        type: 'video',
        width: 720,
        height: 1280,
        frameRate: 30,
        videoBitRate: 1500000,
        audioBitRate: 128000,
        format: 'video/webm'
      },
      'video-high': {
        type: 'video',
        width: 1080,
        height: 1920,
        frameRate: 30,
        videoBitRate: 3000000,
        audioBitRate: 192000,
        format: 'video/mp4'
      }
    };

    // Collaboration types (like Smule duets)
    this.collaborationTypes = {
      'duet': {
        name: 'Duet',
        description: 'Record with another artist side-by-side',
        maxParticipants: 2,
        layout: 'split-screen',
        syncRequired: true
      },
      'group': {
        name: 'Group Collaboration',
        description: 'Multiple artists in one recording',
        maxParticipants: 6,
        layout: 'grid',
        syncRequired: true
      },
      'layer': {
        name: 'Layer Addition',
        description: 'Add instrument or vocal layer to existing track',
        maxParticipants: 1,
        layout: 'overlay',
        syncRequired: true
      },
      'remix': {
        name: 'Remix/Cover',
        description: 'Create your own version of a song',
        maxParticipants: 1,
        layout: 'full-screen',
        syncRequired: false
      }
    };
  }

  /**
   * Detect media type from file or MIME type
   */
  detectMediaType(input) {
    let mimeType;
    
    if (typeof input === 'string') {
      // If it's a filename, detect from extension
      mimeType = mime.lookup(input);
    } else if (input.type) {
      // If it's a File object or has type property
      mimeType = input.type;
    } else {
      return null;
    }

    if (this.audioFormats[mimeType]) {
      return {
        category: 'audio',
        mimeType,
        ...this.audioFormats[mimeType]
      };
    }

    if (this.videoFormats[mimeType]) {
      return {
        category: 'video',
        mimeType,
        ...this.videoFormats[mimeType]
      };
    }

    return null;
  }

  /**
   * Check if a media type is supported
   */
  isSupported(mimeType) {
    return !!(this.audioFormats[mimeType] || this.videoFormats[mimeType]);
  }

  /**
   * Get recording configuration for a given quality level
   */
  getRecordingConfig(quality = 'medium', type = 'audio') {
    const presetKey = `${type}-${quality}`;
    return this.recordingPresets[presetKey] || this.recordingPresets[`${type}-medium`];
  }

  /**
   * Get optimal format for a given scenario
   */
  getOptimalFormat(scenario = 'web-recording', type = 'audio') {
    const scenarios = {
      'web-recording': {
        audio: 'audio/webm',
        video: 'video/webm'
      },
      'mobile-recording': {
        audio: 'audio/mp3',
        video: 'video/mp4'
      },
      'high-quality': {
        audio: 'audio/wav',
        video: 'video/mp4'
      },
      'streaming': {
        audio: 'audio/mp3',
        video: 'video/mp4'
      }
    };

    return scenarios[scenario]?.[type] || scenarios['web-recording'][type];
  }

  /**
   * Validate file size and duration limits
   */
  validateMedia(file, maxSize = 100 * 1024 * 1024, maxDuration = 300) { // 100MB, 5 minutes
    const mediaType = this.detectMediaType(file);
    
    if (!mediaType) {
      return {
        valid: false,
        error: 'Unsupported file format'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`
      };
    }

    // Duration validation would require media analysis
    // For now, we'll skip it and handle it in processing

    return {
      valid: true,
      mediaType
    };
  }

  /**
   * Get collaboration configuration
   */
  getCollaborationConfig(type = 'duet') {
    return this.collaborationTypes[type] || this.collaborationTypes['duet'];
  }

  /**
   * Generate media constraints for WebRTC recording
   */
  getMediaConstraints(preset = 'audio-medium') {
    const config = this.getRecordingConfig(preset.split('-')[1], preset.split('-')[0]);
    
    if (config.type === 'audio') {
      return {
        audio: {
          sampleRate: config.sampleRate,
          channelCount: config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
    } else {
      return {
        audio: {
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: config.width },
          height: { ideal: config.height },
          frameRate: { ideal: config.frameRate },
          facingMode: 'user'
        }
      };
    }
  }

  /**
   * Get file extension for a MIME type
   */
  getExtension(mimeType) {
    const mediaType = this.detectMediaType({ type: mimeType });
    return mediaType?.ext || '.bin';
  }

  /**
   * Check if format is suitable for mobile
   */
  isMobileFriendly(mimeType) {
    const mediaType = this.detectMediaType({ type: mimeType });
    
    if (mediaType?.category === 'audio') {
      return ['audio/mp3', 'audio/m4a', 'audio/aac'].includes(mimeType);
    } else if (mediaType?.category === 'video') {
      return this.videoFormats[mimeType]?.mobile || false;
    }
    
    return false;
  }

  /**
   * Get all supported formats for a category
   */
  getSupportedFormats(category = 'audio') {
    if (category === 'audio') {
      return Object.keys(this.audioFormats);
    } else if (category === 'video') {
      return Object.keys(this.videoFormats);
    } else {
      return [...Object.keys(this.audioFormats), ...Object.keys(this.videoFormats)];
    }
  }
}

module.exports = MediaTypes; 