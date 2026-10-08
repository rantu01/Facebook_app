const bcrypt = require('bcryptjs');
const Joi = require('joi');
const Admin = require('../models/Admin');
const { signAdmin } = require('../middleware/auth');
const { ok, fail } = require('../utils/apiResponse');
const env = require('../config/env');

const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(6).required() });

async function ensureSeedAdmin() {
  const count = await Admin.countDocuments();
  if (count === 0 && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await Admin.create({ email: env.ADMIN_EMAIL.toLowerCase(), passwordHash: hash, role: 'ADMIN', name: 'Admin' });
  }
}

async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return fail(res, 'Validation failed', 'VALIDATION_ERROR', 422, error.details.map((d) => d.message));
    const admin = await Admin.findOne({ email: value.email.toLowerCase(), active: true });
    if (!admin) return fail(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401);
    const match = await bcrypt.compare(value.password, admin.passwordHash);
    if (!match) return fail(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401);
    const token = signAdmin(admin);
    res.cookie('token', token, {
      httpOnly: true, secure: env.isProd, sameSite: env.isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 3600 * 1000, path: '/',
    });
    return ok(res, { admin: admin.toSafeJSON() });
  } catch (e) { return next(e); }
}

async function me(req, res, next) {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return fail(res, 'Not found', 'NOT_FOUND', 404);
    return ok(res, { admin: admin.toSafeJSON() });
  } catch (e) { return next(e); }
}

async function logout(req, res) {
  res.clearCookie('token', { path: '/' });
  return ok(res, { loggedOut: true });
}

module.exports = { login, me, logout, ensureSeedAdmin };
