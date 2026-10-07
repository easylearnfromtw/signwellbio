-- SIGN WELL Subscriber 360 foundation, 2026-09-30
-- Run in Supabase/PostgreSQL after legal review of enabled data categories.
create extension if not exists pgcrypto;

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email_hash text unique,
  display_name text,
  locale text default 'zh-TW',
  timezone text default 'Asia/Taipei',
  status text not null default 'active' check (status in ('active','unsubscribed','erasure_pending','erased')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists identities (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  email_enc text,
  display_name text,
  avatar_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique(provider, provider_subject)
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  purpose text not null check (purpose in ('newsletter_service','personalization','social_connection','ai_analysis','crm_communication')),
  granted boolean not null,
  consent_version text not null,
  notice_snapshot jsonb not null default '{}'::jsonb,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists consents_lookup on consents(subscriber_id,purpose,created_at desc);

create table if not exists oauth_connections (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  scopes text[] not null default '{}',
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active','revoked','expired','error')),
  last_synced_at timestamptz,
  last_error text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subscriber_id,provider)
);

create table if not exists source_items (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  provider text not null,
  provider_object_id text,
  object_type text not null,
  source_url text,
  raw_payload_redacted jsonb not null default '{}'::jsonb,
  content_hash text,
  fetched_at timestamptz not null default now(),
  purpose text not null,
  consent_version text not null,
  retention_until timestamptz,
  unique(subscriber_id,provider,provider_object_id,object_type)
);

create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  source text not null,
  source_item_id uuid references source_items(id) on delete set null,
  event_type text not null,
  topic text,
  numeric_value double precision,
  occurred_at timestamptz not null,
  source_url text,
  fetched_at timestamptz not null default now(),
  consent_version text not null,
  purpose text not null,
  payload_redacted jsonb not null default '{}'::jsonb,
  retention_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists observations_profile_idx on observations(subscriber_id,occurred_at desc);
create index if not exists observations_topic_idx on observations(subscriber_id,topic) where topic is not null;

create table if not exists interest_vectors (
  subscriber_id uuid primary key references subscribers(id) on delete cascade,
  model_version text not null,
  vector jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists communication_preferences (
  subscriber_id uuid primary key references subscribers(id) on delete cascade,
  explicit jsonb not null default '{}'::jsonb,
  inferred_non_sensitive jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists newsletter_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id) on delete cascade,
  campaign_id text not null,
  article_id text,
  event_type text not null check(event_type in ('delivered','opened','clicked','dismissed','unsubscribed')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  campaign_id text not null,
  item_id text not null,
  rank integer not null,
  score double precision not null,
  explanation jsonb not null default '{}'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now()
);

-- Sensitive vault is intentionally isolated. Only user-supplied/confirmed records belong here.
create table if not exists sensitive_vault (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  category text not null,
  ciphertext text not null,
  user_verified boolean not null default false,
  consent_id uuid not null references consents(id) on delete restrict,
  purpose text not null,
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  actor_type text not null,
  actor_id text,
  subscriber_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text,
  purpose text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists audit_subscriber_idx on audit_log(subscriber_id,occurred_at desc);

create table if not exists retention_jobs (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id) on delete cascade,
  target_table text not null,
  action text not null check(action in ('delete','anonymize','expire_token')),
  execute_after timestamptz not null,
  status text not null default 'pending' check(status in ('pending','running','done','failed')),
  last_error text,
  created_at timestamptz not null default now()
);

-- Default-deny RLS for any direct client access. Backend service-role bypasses RLS.
alter table subscribers enable row level security;
alter table identities enable row level security;
alter table consents enable row level security;
alter table oauth_connections enable row level security;
alter table source_items enable row level security;
alter table observations enable row level security;
alter table interest_vectors enable row level security;
alter table communication_preferences enable row level security;
alter table newsletter_events enable row level security;
alter table recommendations enable row level security;
alter table sensitive_vault enable row level security;
alter table audit_log enable row level security;
alter table retention_jobs enable row level security;

-- Do not create permissive public policies here. Add authenticated self-read policies only
-- after auth.uid() is reliably mapped to subscribers.id in your deployment.
