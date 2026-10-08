const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true }, // gemini | facebook | tts ...
  model: { type: String, default: '' },
  operation: { type: String, required: true, index: true },
  tokens: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
  latencyMs: { type: Number, default: 0 },
  error: { type: String, default: '' },
}, { timestamps: true });

apiUsageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('APIUsage', apiUsageSchema);
