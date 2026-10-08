// Vercel serverless entry: `vercel.json` routes everything here.
// NOTE: serverless functions have strict timeouts and ephemeral disk, so this
// is suitable for the API + short AI calls. Long jobs (Veo polling over
// minutes, FFmpeg assembly) need a long-running host (VPS / Render / Railway).
// USE_QUEUE=false (inline mode) is required on Vercel — there is no worker process.
const mongoose = require('mongoose');
const { createApp } = require('../src/app');
const env = require('../src/config/env');
const { ensureSeedAdmin } = require('../src/controllers/authController');

let app = null;

module.exports = async function handler(req, res) {
  if (!app) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    await ensureSeedAdmin().catch(() => {});
    app = createApp();
  }
  return app(req, res);
};
