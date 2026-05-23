import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
    issuer: 'casa-garcia',
    audience: 'casa-garcia-app',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: 'casa-garcia',
    audience: 'casa-garcia-app',
  });
}

/**
 * Refresh tokens: generamos un string aleatorio y guardamos su SHA-256 en BD.
 * No usamos JWT para refresh para poder revocarlos uno a uno.
 */
export function generateRefreshToken() {
  // 64 bytes → 86 chars base64url (suficiente entropía)
  return crypto.randomBytes(64).toString('base64url');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + config.jwt.refreshTtlDays);
  return d;
}
