const mongoose = require('mongoose');

const publishedPostSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', index: true },
  scheduledPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledPost', default: null },
  facebookPageId: { type: String, required: true },
  facebookPostId: { type: String, default: '', index: true },
  facebookVideoId: { type: String, default: '' },
  caption: { type: String, default: '' },
  publishedAt: { type: Date, default: null, index: true },
  permalink: { type: String, default: '' },
  status: { type: String, enum: ['PUBLISHED', 'FAILED'], default: 'PUBLISHED' },
  errorMessage: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PublishedPost', publishedPostSchema);
