const IORedis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let connection = null;

function getRedisConnection() {
  if (connection) return connection;
  if (!env.REDIS_URL) return null;
  try {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // Fail fast when Redis is down: don't queue commands forever,
      // stop retrying after a few attempts so callers can fall back.
      enableOfflineQueue: false,
      connectTimeout: 5000,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 300, 2000)),
    });
    connection.on('error', (e) => logger.error(`[ERROR] Redis error: ${e.message || e.code || e}`));
    return connection;
  } catch (e) {
    logger.error(`[ERROR] Redis init failed: ${e.message}`);
    return null;
  }
}

module.exports = { getRedisConnection };
