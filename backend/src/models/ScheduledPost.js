const mongoose = require('mongoose');

const scheduledPostSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
  facebookPageId: { type: String, required: true },
  scheduledAt: { type: Date, required: true, index: true },
  caption: { type: String, default: '' },
  status: { type: String, enum: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED'], default: 'SCHEDULED', index: true },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ScheduledPost', scheduledPostSchema);
