import bcrypt from 'bcrypt';
import { config } from '../config/env.js';

export function hashPassword(plain) {
  return bcrypt.hash(plain, config.bcrypt.cost);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
