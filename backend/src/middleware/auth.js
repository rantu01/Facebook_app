const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { fail } = require('../utils/apiResponse');

function signAdmin(admin) {
  return jwt.sign({ sub: String(admin._id), role: admin.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function authRequired(req, res, next) {
  try {
    const token = req.cookies?.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return fail(res, 'Not authenticated', 'UNAUTHENTICATED', 401);
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.admin = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return fail(res, 'Session expired', 'UNAUTHENTICATED', 401);
  }
}

function adminOnly(req, res, next) {
  if (req.admin?.role !== 'ADMIN') return fail(res, 'Admin only', 'FORBIDDEN', 403);
  return next();
}

module.exports = { signAdmin, authRequired, adminOnly };
