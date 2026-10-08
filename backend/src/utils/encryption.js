const crypto = require('crypto');
const env = require('../config/env');

function key() {
  return crypto.createHash('sha256').update(String(env.TOKEN_ENCRYPTION_KEY)).digest();
}
function encryptToken(plain) {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}
function decryptToken(payload) {
  if (!payload) return '';
  if (!String(payload).startsWith('v1:')) return String(payload); // legacy plain fallback (will be re-encrypted on save)
  const [, ivB, tagB, encB] = String(payload).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB, 'base64')), decipher.final()]).toString('utf8');
}
module.exports = { encryptToken, decryptToken };
