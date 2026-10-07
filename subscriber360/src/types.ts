export type Provider = 'google' | 'youtube' | 'threads' | 'instagram' | 'facebook' | 'signwell';
export type Purpose = 'newsletter_service' | 'personalization' | 'social_connection' | 'ai_analysis' | 'crm_communication';

export interface OAuthConnection {
  id: string;
  subscriberId: string;
  provider: Provider;
  providerSubject: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'expired' | 'error';
}

export interface NormalizedObservation {
  subscriberId: string;
  source: Provider;
  sourceItemId?: string;
  eventType: string;
  topic?: string;
  value?: number;
  occurredAt: string;
  provenance: {
    providerObjectId?: string;
    sourceUrl?: string;
    fetchedAt: string;
    consentVersion: string;
    purpose: Purpose;
  };
}

export interface TopicEvidence {
  topic: string;
  score: number;
  confidence: number;
  sources: Array<{source: Provider; contribution: number; occurredAt: string}>;
}
