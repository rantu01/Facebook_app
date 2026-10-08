const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const env = require('./config/env');
const api = require('./routes/api');
const fb = require('./controllers/facebookController');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true }));

  app.get('/health', (req, res) => res.json({ success: true, data: { ok: true, time: new Date().toISOString() } }));
  // Public OAuth callback (Meta redirects here, no JWT cookie)
  app.get('/api/facebook/oauth/callback', fb.callback);

  app.use('/api', api);
  // serve local storage files
  const storageDir = path.resolve(__dirname, '..', '..', 'storage');
  app.use('/storage', express.static(storageDir));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
