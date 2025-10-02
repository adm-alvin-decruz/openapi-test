const crypto = require('crypto');
const ALG = process.env.AES_ALGORITHM || 'aes-256-gcm';

function getKey() {
  const hex = process.env.AES_SECRET_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('AES_SECRET_KEY must be 64 hex chars for AES-256-GCM');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as base64url: iv.tag.ciphertext
  return [iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

function decrypt(token) {
  const [ivB64, tagB64, dataB64] = String(token).split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid format');
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encrypt, decrypt };
