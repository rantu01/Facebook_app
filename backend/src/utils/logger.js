const winston = require('winston');
const env = require('../config/env');

const SENSITIVE = [/api[_-]?key/i, /token/i, /secret/i, /password/i, /authorization/i];

function redact(obj) {
  try {
    const s = JSON.stringify(obj);
    const out = s; // winston handles objects; we scrub in format below
    return out;
  } catch { return '[unserializable]'; }
}

const logger = winston.createLogger({
  level: env.isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      let m = String(message);
      // basic redaction of long tokens in message
      m = m.replace(/(EAAB\w{10,})/g, '[REDACTED_FB_TOKEN]');
      m = m.replace(/(AIza\w{10,})/g, '[REDACTED_GEMINI_KEY]');
      const keys = Object.keys(meta || {});
      let metaStr = '';
      if (keys.length) {
        const safe = {};
        for (const k of keys) {
          if (SENSITIVE.some((re) => re.test(k))) safe[k] = '[REDACTED]';
          else safe[k] = meta[k];
        }
        metaStr = ` ${JSON.stringify(safe)}`;
      }
      return `${timestamp} [${level.toUpperCase()}] ${m}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
