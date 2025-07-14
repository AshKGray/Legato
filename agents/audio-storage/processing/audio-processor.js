const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

function convertFormat(inputPath, outputPath, format) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat(format)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

function compressAudio(inputPath, outputPath, bitrate = '128k') {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioBitrate(bitrate)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

function generateWaveform(inputPath, outputPath) {
  // Generates a PNG waveform image
  return exec(`ffmpeg -i ${inputPath} -filter_complex "aformat=channel_layouts=mono,showwavespic=s=600x120" -frames:v 1 ${outputPath}`);
}

function createPreviewClip(inputPath, outputPath, duration = 30) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(0)
      .duration(duration)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

function extractMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

module.exports = {
  convertFormat,
  compressAudio,
  generateWaveform,
  createPreviewClip,
  extractMetadata,
}; 