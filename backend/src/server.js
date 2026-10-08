const env = require('./config/env');
const { createApp } = require('./app');
const { connectDB } = require('./config/db');
const { ensureSeedAdmin } = require('./controllers/authController');
const { startSchedulers } = require('./services/scheduler/automation');
const logger = require('./utils/logger');

async function main() {
  await connectDB(env.MONGODB_URI);
  await ensureSeedAdmin();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`[INFO] Backend listening on :${env.PORT} (tz=${env.TIMEZONE})`);
  });
  // Schedulers run in backend too (single-instance safe); worker handles heavy jobs.
  startSchedulers();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
