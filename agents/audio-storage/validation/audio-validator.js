const path = require('path');

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.flac'];
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/flac',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function validateAudioFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, reason: 'Invalid file extension' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, reason: 'Invalid MIME type' };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, reason: 'File too large' };
  }
  return { valid: true };
}

module.exports = { validateAudioFile }; 