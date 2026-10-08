const mongoose = require('mongoose');

const audioSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', index: true },
  provider: { type: String, default: 'local-tts' },
  voice: { type: String, default: 'bn-default' },
  language: { type: String, default: 'Bengali' },
  speed: { type: Number, default: 1.0 },
  pitch: { type: Number, default: 0 },
  text: { type: String, default: '' },
  audioPath: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  status: { type: String, enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'QUEUED' },
  error: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Audio', audioSchema);
