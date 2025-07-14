const multer = require('multer');
const path = require('path');
const { validateAudioFile } = require('../validation/audio-validator');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const result = validateAudioFile(file);
    if (!result.valid) {
      return cb(new Error(result.reason));
    }
    cb(null, true);
  },
});

module.exports = upload; 