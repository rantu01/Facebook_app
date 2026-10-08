const mongoose = require('mongoose');

const musicAssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filePath: { type: String, required: true },
  duration: { type: Number, default: 0 },
  volume: { type: Number, default: 0.15, min: 0, max: 1 },
  category: { type: String, default: 'general' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('MusicAsset', musicAssetSchema);
