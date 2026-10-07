import { db } from './db.js';
import { env } from './config.js';
import { requireConsent } from './consent.js';
import type { NormalizedObservation } from './types.js';

const blockedInferencePatterns = [
  /political_(party|leaning|affiliation)/i,
  /diagnos(is|e|ed)/i,
  /mental_(health|state|illness)/i,
  /race|ethnic|religion|sexual_orientation/i
];

export function sanitizeObservation(o: NormalizedObservation): NormalizedObservation | null {
  const label = `${o.eventType} ${o.topic || ''}`;
  if (blockedInferencePatterns.some(r=>r.test(label))) return null;
  return o;
}

export async function ingest(observations: NormalizedObservation[]) {
  const rows = [] as any[];
  for (const raw of observations) {
    const o = sanitizeObservation(raw);
    if (!o) continue;
    await requireConsent(o.subscriberId, o.provenance.purpose);
    rows.push({
      subscriber_id:o.subscriberId, source:o.source, source_item_id:o.sourceItemId||null,
      event_type:o.eventType, topic:o.topic||null, numeric_value:o.value??null,
      occurred_at:o.occurredAt, source_url:o.provenance.sourceUrl||null,
      fetched_at:o.provenance.fetchedAt, consent_version:o.provenance.consentVersion || env.CONSENT_VERSION,
      purpose:o.provenance.purpose, payload_redacted:{}
    });
  }
  if (!rows.length) return { inserted:0 };
  const { error } = await db.from('observations').insert(rows);
  if (error) throw error;
  return { inserted:rows.length };
}
