const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'EDITOR'], default: 'ADMIN' },
  name: { type: String, default: 'Admin' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

adminSchema.methods.toSafeJSON = function () {
  return { id: String(this._id), email: this.email, role: this.role, name: this.name, active: this.active, createdAt: this.createdAt };
};

module.exports = mongoose.model('Admin', adminSchema);
