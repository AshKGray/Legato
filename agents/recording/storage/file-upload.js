const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const MediaTypes = require('../utils/media-types');

/**
 * File Upload System for Legato
 * 
 * Handles uploading of pre-recorded audio/video files
 * Supports validation, processing, and storage management
 */

class FileUploadManager {
  constructor(config = {}) {
    this.config = {
      uploadDir: config.uploadDir || './uploads',
      tempDir: config.tempDir || './temp-uploads',
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      maxDuration: config.maxDuration || 600, // 10 minutes
      allowedFormats: config.allowedFormats || 'all',
      processOnUpload: config.processOnUpload !== false,
      ...config
    };

    this.mediaTypes = new MediaTypes();
    this.uploads = new Map(); // Track active uploads
    
    // Initialize directories
    this.initializeStorage();
    
    // Configure multer for file uploads
    this.multerConfig = this.configureMutler();
  }

  /**
   * Configure multer for handling file uploads
   */
  configureMutler() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.config.tempDir);
      },
      filename: (req, file, cb) => {
        const uploadId = uuidv4();
        const extension = path.extname(file.originalname);
        const filename = `${uploadId}_${Date.now()}${extension}`;
        
        // Store upload metadata
        this.uploads.set(uploadId, {
          id: uploadId,
          originalName: file.originalname,
          filename,
          mimeType: file.mimetype,
          uploadStarted: Date.now(),
          status: 'uploading'
        });
        
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const validation = this.validateFile(file);
      if (validation.valid) {
        cb(null, true);
      } else {
        cb(new Error(validation.error), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.config.maxFileSize,
        files: 1 // Single file upload
      }
    });
  }

  /**
   * Get multer middleware for express routes
   */
  getUploadMiddleware(fieldName = 'media') {
    return this.multerConfig.single(fieldName);
  }

  /**
   * Validate uploaded file
   */
  validateFile(file) {
    // Check MIME type
    const mediaType = this.mediaTypes.detectMediaType(file);
    if (!mediaType) {
      return {
        valid: false,
        error: `Unsupported file format: ${file.mimetype}`
      };
    }

    // Check if format is allowed
    if (this.config.allowedFormats !== 'all') {
      const allowedCategories = Array.isArray(this.config.allowedFormats) 
        ? this.config.allowedFormats 
        : [this.config.allowedFormats];
      
      if (!allowedCategories.includes(mediaType.category)) {
        return {
          valid: false,
          error: `${mediaType.category} files are not allowed`
        };
      }
    }

    // File size is handled by multer limits
    
    return {
      valid: true,
      mediaType
    };
  }

  /**
   * Process uploaded file
   */
  async processUpload(uploadId, req, additionalMetadata = {}) {
    try {
      const upload = this.uploads.get(uploadId);
      if (!upload) {
        throw new Error('Upload record not found');
      }

      const file = req.file;
      if (!file) {
        throw new Error('No file uploaded');
      }

      // Update upload record
      upload.status = 'processing';
      upload.filePath = file.path;
      upload.fileSize = file.size;
      upload.uploadCompleted = Date.now();

      // Detect media type from uploaded file
      const mediaType = this.mediaTypes.detectMediaType(file);
      
      // Validate file content (additional checks)
      const contentValidation = await this.validateFileContent(file.path, mediaType);
      if (!contentValidation.valid) {
        throw new Error(contentValidation.error);
      }

      // Create processed file metadata
      const processedMetadata = {
        id: uploadId,
        originalName: file.originalname,
        filename: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        mediaType: mediaType.category,
        format: mediaType.mimeType,
        duration: contentValidation.duration,
        uploadedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        userMetadata: additionalMetadata,
        status: 'completed'
      };

      // Move file to permanent storage if processing enabled
      if (this.config.processOnUpload) {
        const permanentPath = await this.moveToPermanentStorage(uploadId, file.path, mediaType);
        processedMetadata.permanentPath = permanentPath;
        processedMetadata.status = 'stored';
      }

      // Update upload record
      Object.assign(upload, processedMetadata);

      console.log(`✅ File upload processed: ${uploadId} (${upload.mediaType}, ${this.formatFileSize(upload.fileSize)})`);

      return {
        success: true,
        uploadId,
        metadata: processedMetadata
      };

    } catch (error) {
      console.error(`❌ Upload processing failed for ${uploadId}:`, error);
      
      // Update upload status
      const upload = this.uploads.get(uploadId);
      if (upload) {
        upload.status = 'error';
        upload.error = error.message;
      }

      return {
        success: false,
        uploadId,
        error: error.message
      };
    }
  }

  /**
   * Validate file content (duration, quality, etc.)
   */
  async validateFileContent(filePath, mediaType) {
    try {
      // For now, we'll do basic validation
      // In a real implementation, you'd use FFmpeg or similar to analyze the media file
      
      const stats = await fs.stat(filePath);
      
      // Basic file exists and size check
      if (!stats.isFile() || stats.size === 0) {
        return {
          valid: false,
          error: 'Invalid or empty file'
        };
      }

      // Estimate duration based on file size and format (rough approximation)
      let estimatedDuration = 0;
      if (mediaType.category === 'audio') {
        // Rough estimate: 1MB ≈ 1 minute for compressed audio
        estimatedDuration = stats.size / (1024 * 1024) * 60;
      } else if (mediaType.category === 'video') {
        // Rough estimate: 10MB ≈ 1 minute for compressed video
        estimatedDuration = stats.size / (10 * 1024 * 1024) * 60;
      }

      // Check duration limit
      if (estimatedDuration > this.config.maxDuration) {
        return {
          valid: false,
          error: `File duration exceeds ${this.config.maxDuration} seconds limit`
        };
      }

      return {
        valid: true,
        duration: Math.round(estimatedDuration),
        fileSize: stats.size
      };

    } catch (error) {
      return {
        valid: false,
        error: `File validation failed: ${error.message}`
      };
    }
  }

  /**
   * Move file to permanent storage
   */
  async moveToPermanentStorage(uploadId, tempPath, mediaType) {
    const upload = this.uploads.get(uploadId);
    const extension = this.mediaTypes.getExtension(mediaType.mimeType);
    
    // Create organized directory structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const permanentDir = path.join(
      this.config.uploadDir,
      mediaType.category, // 'audio' or 'video'
      String(year),
      month,
      day
    );

    await fs.ensureDir(permanentDir);
    
    const permanentFilename = `${uploadId}${extension}`;
    const permanentPath = path.join(permanentDir, permanentFilename);
    
    // Move file from temp to permanent location
    await fs.move(tempPath, permanentPath);
    
    console.log(`📁 Moved to permanent storage: ${permanentPath}`);
    
    return permanentPath;
  }

  /**
   * Get upload status and metadata
   */
  getUploadStatus(uploadId) {
    const upload = this.uploads.get(uploadId);
    if (!upload) {
      return {
        exists: false,
        error: 'Upload not found'
      };
    }

    return {
      exists: true,
      uploadId,
      ...upload
    };
  }

  /**
   * Get file stream for download/playback
   */
  async getFileStream(uploadId) {
    const upload = this.uploads.get(uploadId);
    if (!upload) {
      throw new Error('Upload not found');
    }

    const filePath = upload.permanentPath || upload.filePath;
    if (!filePath || !await fs.pathExists(filePath)) {
      throw new Error('File not found on disk');
    }

    return fs.createReadStream(filePath);
  }

  /**
   * Delete uploaded file
   */
  async deleteUpload(uploadId) {
    try {
      const upload = this.uploads.get(uploadId);
      if (!upload) {
        throw new Error('Upload not found');
      }

      // Delete file from disk
      const filePaths = [upload.filePath, upload.permanentPath].filter(Boolean);
      for (const filePath of filePaths) {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          console.log(`🗑️ Deleted file: ${filePath}`);
        }
      }

      // Remove from tracking
      this.uploads.delete(uploadId);

      return {
        success: true,
        uploadId
      };

    } catch (error) {
      console.error(`Failed to delete upload ${uploadId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const tempFiles = await fs.readdir(this.config.tempDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const filename of tempFiles) {
        const filePath = path.join(this.config.tempDir, filename);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
          cleanedCount++;
        }
      }

      console.log(`🧹 Cleaned up ${cleanedCount} temporary files`);
      return cleanedCount;

    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
      return 0;
    }
  }

  /**
   * Get upload statistics
   */
  getUploadStats() {
    const uploads = Array.from(this.uploads.values());
    
    const stats = {
      total: uploads.length,
      byStatus: {},
      byMediaType: {},
      totalSize: 0,
      averageSize: 0
    };

    uploads.forEach(upload => {
      // Count by status
      stats.byStatus[upload.status] = (stats.byStatus[upload.status] || 0) + 1;
      
      // Count by media type
      if (upload.mediaType) {
        stats.byMediaType[upload.mediaType] = (stats.byMediaType[upload.mediaType] || 0) + 1;
      }
      
      // Sum file sizes
      if (upload.fileSize) {
        stats.totalSize += upload.fileSize;
      }
    });

    stats.averageSize = uploads.length > 0 ? stats.totalSize / uploads.length : 0;

    return stats;
  }

  /**
   * Initialize storage directories
   */
  async initializeStorage() {
    await fs.ensureDir(this.config.uploadDir);
    await fs.ensureDir(this.config.tempDir);
    
    // Create subdirectories for different media types
    await fs.ensureDir(path.join(this.config.uploadDir, 'audio'));
    await fs.ensureDir(path.join(this.config.uploadDir, 'video'));
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get all uploads (with pagination)
   */
  getAllUploads(page = 1, limit = 50) {
    const uploads = Array.from(this.uploads.values());
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      uploads: uploads.slice(startIndex, endIndex),
      totalCount: uploads.length,
      page,
      limit,
      totalPages: Math.ceil(uploads.length / limit)
    };
  }
}

module.exports = FileUploadManager; 