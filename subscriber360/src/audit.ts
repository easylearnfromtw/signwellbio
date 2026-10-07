import { db } from './db.js';

export async function audit(entry: {
  actorType: 'subscriber'|'system'|'staff'; actorId?: string; subscriberId?: string;
  action: string; resourceType: string; resourceId?: string; purpose?: string; metadata?: Record<string, unknown>;
}) {
  const safeMeta = { ...(entry.metadata || {}) } as Record<string, unknown>;
  delete safeMeta.access_token;
  delete safeMeta.refresh_token;
  delete safeMeta.authorization;
  const { error } = await db.from('audit_log').insert({
    actor_type: entry.actorType,
    actor_id: entry.actorId || null,
    subscriber_id: entry.subscriberId || null,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId || null,
    purpose: entry.purpose || null,
    metadata: safeMeta
  });
  if (error) throw error;
}
