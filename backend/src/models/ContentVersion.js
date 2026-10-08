const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
  version: { type: Number, required: true },
  field: { type: String, required: true }, // script | video | voice | seo | caption ...
  snapshot: { type: Object, default: {} },
  note: { type: String, default: '' },
}, { timestamps: true });

versionSchema.index({ contentId: 1, version: -1 });

module.exports = mongoose.model('ContentVersion', versionSchema);
