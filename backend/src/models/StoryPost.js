const mongoose = require('mongoose');

const storySettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  enabled: { type: Boolean, default: false },
  // story = Gemini text post to Page feed; video = generate video via content pipeline
  mode: { type: String, enum: ['story', 'video'], default: 'story' },
  postingTimes: { type: [String], default: ['10:00', '20:00'] },
  timezone: { type: String, default: 'Asia/Dhaka' },
  facebookPageId: { type: String, default: '' },
  niche: { type: String, default: '' }, // blank = use Content Settings niche
}, { timestamps: true });

const storyPostSchema = new mongoose.Schema({
  type: { type: String, enum: ['story', 'video'], required: true },
  text: { type: String, default: '' },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', default: null },
  facebookPageId: { type: String, default: '' },
  facebookPostId: { type: String, default: '' },
  slot: { type: String, default: '', index: true }, // YYYY-MM-DD HH:mm — prevents double-posting a slot
  status: { type: String, enum: ['PUBLISHED', 'QUEUED', 'FAILED'], default: 'PUBLISHED', index: true },
  error: { type: String, default: '' },
}, { timestamps: true });

storyPostSchema.index({ createdAt: -1 });

module.exports = {
  StorySettings: mongoose.model('StorySettings', storySettingsSchema),
  StoryPost: mongoose.model('StoryPost', storyPostSchema),
};
