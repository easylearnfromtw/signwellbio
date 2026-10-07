import crypto from 'node:crypto';
import { env } from './config.js';

const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY_B64, 'base64');
if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY_B64 must decode to exactly 32 bytes');

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
}

export function decryptSecret(packed: string): string {
  const raw = Buffer.from(packed, 'base64url');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
