const crypto = require('crypto');

function normalizeTopic(title = '') {
  return String(title).toLowerCase().replace(/[^a-z0-9\u0980-\u09FF\s]/gi, '').replace(/\s+/g, ' ').trim();
}

function topicHash(title = '') {
  return crypto.createHash('sha256').update(normalizeTopic(title)).digest('hex').slice(0, 32);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoff(attempt, baseMs = 2000, maxMs = 60000) {
  return Math.min(maxMs, baseMs * 2 ** attempt) + Math.floor(Math.random() * 500);
}

function isTransientError(err) {
  const msg = String(err && (err.message || err.code || err)).toLowerCase();
  return /429|rate.?limit|timeout|econn|etimedout|503|502|500|network|temporar/.test(msg);
}
function isAuthError(err) {
  const msg = String(err && (err.message || err.code || err) + ' ' + (err.status || '')).toLowerCase();
  return /401|403|invalid.?token|unauthor|expired.?token|oauth/.test(msg);
}

module.exports = { normalizeTopic, topicHash, clamp, sleep, backoff, isTransientError, isAuthError };
