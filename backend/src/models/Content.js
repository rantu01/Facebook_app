const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  trendTopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrendTopic', default: null },
  topicHash: { type: String, index: true },
  normalizedTopic: { type: String, index: true },
  language: { type: String, default: 'Bengali' },
  tone: { type: String, default: 'Informative' },
  durationSec: { type: Number, default: 30 },
  aspectRatio: { type: String, enum: ['9:16', '16:9', '1:1'], default: '9:16' },
  voice: { type: String, default: 'bn-default' },
  videoStyle: { type: String, default: 'ai-generated' },
  status: { type: String, enum: ['DRAFT', 'GENERATING', 'READY', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'BLOCKED'], default: 'DRAFT', index: true },
  // Generated artefacts
  title: { type: String, default: '' },
  hook: { type: String, default: '' },
  script: { type: String, default: '' },
  cta: { type: String, default: '' },
  visualScenes: { type: Array, default: [] },
  keywords: { type: [String], default: [] },
  hashtags: { type: [String], default: [] },
  thumbnailText: { type: String, default: '' },
  caption: { type: String, default: '' },
  videoPrompt: { type: String, default: '' },
  originalVideoPath: { type: String, default: '' },
  finalVideoPath: { type: String, default: '' },
  audioPath: { type: String, default: '' },
  subtitlePath: { type: String, default: '' },
  thumbnailPath: { type: String, default: '' },
  musicAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'MusicAsset', default: null },
  seoScore: { type: Number, default: 0 },
  contentQualityScore: { type: Number, default: 0 },
  trendScore: { type: Number, default: 0 },
  seoReasoning: { type: String, default: '' },
  qualityStatus: { type: String, enum: ['PENDING', 'PASSED', 'WARNING', 'BLOCKED'], default: 'PENDING' },
  qualityNotes: { type: [String], default: [] },
  scheduledAt: { type: Date, default: null, index: true },
  facebookPageId: { type: String, default: '' },
  publishAttempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  version: { type: Number, default: 1 },
}, { timestamps: true });

contentSchema.index({ createdAt: -1 });
contentSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Content', contentSchema);
