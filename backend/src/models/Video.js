const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', index: true },
  provider: { type: String, default: 'gemini-veo' },
  prompt: { type: String, default: '' },
  aspectRatio: { type: String, default: '9:16' },
  durationSec: { type: Number, default: 8 },
  resolution: { type: String, default: '1080x1920' },
  operationId: { type: String, default: '', index: true },
  status: { type: String, enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'QUEUED' },
  originalPath: { type: String, default: '' },
  finalPath: { type: String, default: '' },
  thumbnailPath: { type: String, default: '' },
  width: { type: Number, default: 1080 },
  height: { type: Number, default: 1920 },
  durationActual: { type: Number, default: 0 },
  error: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
