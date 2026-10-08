const mongoose = require('mongoose');

const automationSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  enabled: { type: Boolean, default: false },
  videosPerDay: { type: Number, default: 2, min: 1, max: 10 },
  researchTime: { type: String, default: '06:00' },
  generationStart: { type: String, default: '06:15' },
  postingTimes: { type: [String], default: ['10:00', '20:00'] },
  timezone: { type: String, default: 'Asia/Dhaka' },
  lastResearchAt: { type: Date, default: null },
  status: { type: String, default: 'IDLE' },
}, { timestamps: true });

module.exports = mongoose.model('AutomationSettings', automationSchema);
