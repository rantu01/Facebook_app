const mongoose = require('mongoose');

const seoSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  keywordStrategy: { type: String, default: 'niche-relevant, no stuffing, max 8 keywords' },
  hashtagStrategy: { type: String, default: '3-6 niche hashtags, no irrelevant tags' },
  ctaStrategy: { type: String, default: 'single clear CTA, Bengali-friendly' },
}, { timestamps: true });

const contentSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  primaryNiche: { type: String, default: 'Artificial Intelligence' },
  keywords: { type: [String], default: ['AI', 'ChatGPT', 'Gemini', 'Robotics', 'Automation'] },
  excludedKeywords: { type: [String], default: ['Politics', 'Violence', 'Adult', 'Illegal content'] },
  targetAudience: { type: String, default: '18-35' },
  language: { type: String, default: 'Bengali' },
  tone: { type: String, default: 'Informative' },
  aspectRatio: { type: String, default: '9:16' },
  defaultDurationSec: { type: Number, default: 30 },
}, { timestamps: true });

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  siteName: { type: String, default: 'AI Content Autopilot' },
  timezone: { type: String, default: 'Asia/Dhaka' },
  storageProvider: { type: String, default: 'local' },
}, { timestamps: true });

module.exports = {
  SEOSettings: mongoose.model('SEOSettings', seoSettingsSchema),
  ContentSettings: mongoose.model('ContentSettings', contentSettingsSchema),
  SystemSettings: mongoose.model('SystemSettings', systemSettingsSchema),
};
