import crypto from 'node:crypto';
import { encryptSecret } from './crypto.js';
import { db } from './db.js';
import { env } from './config.js';
import { audit } from './audit.js';
import type { Provider } from './types.js';

export interface OAuthConnector {
  provider: Provider;
  buildAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<{accessToken: string; refreshToken?: string; expiresAt?: string; subject: string; scopes: string[]}>;
  revoke?(accessToken: string): Promise<void>;
}

export function issueState(subscriberId: string, provider: Provider) {
  const nonce = crypto.randomBytes(24).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ subscriberId, provider, nonce, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', env.SIGNWELL_PROFILE_JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState(state: string) {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw new Error('INVALID_STATE');
  const expected = crypto.createHmac('sha256', env.SIGNWELL_PROFILE_JWT_SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('INVALID_STATE');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {subscriberId:string;provider:Provider;iat:number};
  if (Date.now() - parsed.iat > 10 * 60_000) throw new Error('STATE_EXPIRED');
  return parsed;
}

export async function storeConnection(subscriberId: string, connector: OAuthConnector, token: Awaited<ReturnType<OAuthConnector['exchangeCode']>>) {
  const { data, error } = await db.from('oauth_connections').upsert({
    subscriber_id: subscriberId,
    provider: connector.provider,
    provider_subject: token.subject,
    scopes: token.scopes,
    access_token_enc: encryptSecret(token.accessToken),
    refresh_token_enc: token.refreshToken ? encryptSecret(token.refreshToken) : null,
    token_expires_at: token.expiresAt || null,
    status: 'active',
    revoked_at: null,
    last_error: null
  }, { onConflict: 'subscriber_id,provider' }).select('id').single();
  if (error) throw error;
  await audit({ actorType:'subscriber', actorId:subscriberId, subscriberId, action:'oauth.connected', resourceType:'oauth_connection', resourceId:data.id, purpose:'social_connection', metadata:{ provider: connector.provider, scopes: token.scopes }});
  return data;
}
