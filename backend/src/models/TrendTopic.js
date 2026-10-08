const mongoose = require('mongoose');

const trendTopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  source: { type: String, required: true },
  sourceUrl: { type: String, default: '' },
  publishedAt: { type: Date, default: null },
  category: { type: String, default: 'general' },
  keywords: { type: [String], default: [] },
  trendScore: { type: Number, default: 0, index: true },
  sourceCredibility: { type: Number, default: 0.5 },
  // AI analysis
  relevance: { type: Number, default: 0 },
  viralPotential: { type: Number, default: 0 },
  freshness: { type: Number, default: 0 },
  audienceInterest: { type: Number, default: 0 },
  competition: { type: Number, default: 0 },
  facebookSuitability: { type: Number, default: 0 },
  videoSuitability: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0, index: true },
  recommendation: { type: String, enum: ['SKIP', 'CONSIDER', 'RECOMMENDED', 'TOP_PICK', 'PENDING'], default: 'PENDING' },
  topicHash: { type: String, index: true },
  normalizedTopic: { type: String, index: true },
  used: { type: Boolean, default: false },
  analyzedAt: { type: Date, default: null },
}, { timestamps: true });

trendTopicSchema.index({ publishedAt: -1 });
trendTopicSchema.index({ overallScore: -1 });

module.exports = mongoose.model('TrendTopic', trendTopicSchema);
