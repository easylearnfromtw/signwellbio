import { db } from './db.js';
import { audit } from './audit.js';

const TABLES = ['recommendations','interest_vectors','observations','source_items','oauth_connections','communication_preferences','sensitive_vault','consents','identities'];

export async function eraseSubscriber(subscriberId:string) {
  await audit({actorType:'subscriber',actorId:subscriberId,subscriberId,action:'privacy.erase.requested',resourceType:'subscriber',resourceId:subscriberId});
  for (const table of TABLES) {
    const { error } = await db.from(table).delete().eq('subscriber_id', subscriberId);
    if (error) throw new Error(`ERASE_FAILED:${table}:${error.message}`);
  }
  const { error } = await db.from('subscribers').delete().eq('id', subscriberId);
  if (error) throw error;
  return {status:'erased'};
}
