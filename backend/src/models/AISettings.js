const mongoose = require('mongoose');

const aiSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  model: { type: String, default: 'gemini-3.8-flash' },
  videoModel: { type: String, default: 'veo-3.0-generate-001' },
  temperature: { type: Number, default: 0.7 },
  maxVideosPerDay: { type: Number, default: 2 },
  maxVideoGenerationsPerDay: { type: Number, default: 4 },
  maxAiRequestsPerDay: { type: Number, default: 100 },
  geminiConfigured: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('AISettings', aiSettingsSchema);
