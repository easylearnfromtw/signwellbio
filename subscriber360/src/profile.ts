import { db } from './db.js';
import { env } from './config.js';
import type { Provider, TopicEvidence } from './types.js';

const SOURCE_WEIGHT: Record<Provider, number> = {
  signwell: 1.0,
  google: 0.6,
  youtube: 0.72,
  threads: 0.72,
  instagram: 0.68,
  facebook: 0.65
};
const EVENT_WEIGHT: Record<string, number> = {
  explicit_preference: 2.5,
  save: 1.7,
  share: 1.6,
  reply: 1.35,
  click: 1.0,
  article_read: 1.2,
  newsletter_click: 1.25,
  page_view: 0.45,
  dismiss: -1.6,
  unsubscribe_topic: -2.5
};
const HALF_LIFE_DAYS = 45;
const LAMBDA = Math.log(2) / HALF_LIFE_DAYS;

function ageDays(iso: string) { return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86400000); }
function decay(iso:string) { return Math.exp(-LAMBDA * ageDays(iso)); }
function sigmoid(x:number) { return 1/(1+Math.exp(-x)); }

export function scoreTopic(rows: Array<{source:Provider;event_type:string;topic:string;occurred_at:string;numeric_value:number|null}>): TopicEvidence[] {
  const acc = new Map<string,{raw:number;support:number;sources:TopicEvidence['sources']}>();
  for (const r of rows) {
    if (!r.topic) continue;
    const base = EVENT_WEIGHT[r.event_type] ?? 0.5;
    const source = SOURCE_WEIGHT[r.source] ?? 0.5;
    const intensity = Math.min(2, Math.max(0.25, Math.abs(r.numeric_value ?? 1)));
    const contribution = base * source * intensity * decay(r.occurred_at);
    const x = acc.get(r.topic) || {raw:0,support:0,sources:[]};
    x.raw += contribution;
    x.support += Math.abs(contribution);
    x.sources.push({source:r.source,contribution,occurredAt:r.occurred_at});
    acc.set(r.topic,x);
  }
  return [...acc.entries()].map(([topic,x])=>({
    topic,
    score: Math.max(0, Math.min(1, sigmoid(x.raw - 0.8))),
    confidence: Math.max(0, Math.min(1, 1-Math.exp(-x.support/3))),
    sources: x.sources.sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)).slice(0,8)
  })).sort((a,b)=>b.score-a.score);
}

export async function rebuildProfile(subscriberId:string) {
  const { data, error } = await db.from('observations')
    .select('source,event_type,topic,occurred_at,numeric_value')
    .eq('subscriber_id', subscriberId)
    .not('topic','is',null)
    .gte('occurred_at', new Date(Date.now()-365*86400000).toISOString());
  if (error) throw error;
  const topics = scoreTopic((data || []) as any);
  const { error:upsertError } = await db.from('interest_vectors').upsert({
    subscriber_id:subscriberId,
    model_version:env.PROFILE_MODEL_VERSION,
    vector:Object.fromEntries(topics.map(t=>[t.topic,{score:t.score,confidence:t.confidence}])),
    evidence:topics.slice(0,30),
    updated_at:new Date().toISOString()
  }, {onConflict:'subscriber_id'});
  if (upsertError) throw upsertError;
  return topics;
}
