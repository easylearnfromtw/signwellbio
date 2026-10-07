import { db } from './db.js';
import type { Purpose } from './types.js';

export async function requireConsent(subscriberId: string, purpose: Purpose): Promise<void> {
  const { data, error } = await db
    .from('consents')
    .select('granted,withdrawn_at')
    .eq('subscriber_id', subscriberId)
    .eq('purpose', purpose)
    .eq('granted', true)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.granted) throw new Error(`CONSENT_REQUIRED:${purpose}`);
}
