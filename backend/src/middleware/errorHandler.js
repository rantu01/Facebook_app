const env = require('../config/env');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  logger.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${err.message}`);
  if (!env.isProd && status >= 500) {
    return res.status(status).json({ success: false, message: err.message || 'Internal error', code, details: null });
  }
  const message = status >= 500 ? 'Something went wrong' : (err.message || 'Request failed');
  return res.status(status).json({ success: false, message, code, details: err.details || null });
}

function notFound(req, res) {
  return res.status(404).json({ success: false, message: 'Not found', code: 'NOT_FOUND', details: null });
}

module.exports = { errorHandler, notFound };
