const mongoose = require('mongoose');

const facebookPageSchema = new mongoose.Schema({
  pageId: { type: String, required: true, unique: true, index: true },
  pageName: { type: String, required: true },
  category: { type: String, default: '' },
  accessTokenEnc: { type: String, required: true, select: false },
  tokenExpiresAt: { type: Date, default: null },
  status: { type: String, enum: ['CONNECTED', 'EXPIRED', 'REVOKED', 'DISCONNECTED'], default: 'CONNECTED' },
  connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  lastPublishedAt: { type: Date, default: null },
  meta: { type: Object, default: {} },
}, { timestamps: true });

facebookPageSchema.methods.toSafeJSON = function () {
  return {
    id: String(this._id), pageId: this.pageId, pageName: this.pageName, category: this.category,
    status: this.status, tokenExpiresAt: this.tokenExpiresAt, lastPublishedAt: this.lastPublishedAt,
    connected: this.status === 'CONNECTED', createdAt: this.createdAt, updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('FacebookPage', facebookPageSchema);
