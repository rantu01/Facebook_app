const mongoose = require('mongoose');

const jobLogSchema = new mongoose.Schema({
  jobId: { type: String, required: true, index: true },
  queue: { type: String, required: true, index: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', default: null },
  status: { type: String, enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'cancelled'], default: 'waiting', index: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  error: { type: String, default: '' },
  payload: { type: Object, default: {} },
}, { timestamps: true });

jobLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('JobLog', jobLogSchema);
