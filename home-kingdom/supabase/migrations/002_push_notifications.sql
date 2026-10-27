-- =============================================================================
-- Home Kingdom: push notifications.
-- Only the server (Vercel function /api/push, using the direct database
-- connection) reads or writes these tables. Phones have no access at all.
-- =============================================================================

-- One row per phone that turned notifications on.
create table public.hk_push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.hk_profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  tz         text not null default 'UTC',
  created_at timestamptz not null default now()
);
create index hk_push_subscriptions_profile_idx on public.hk_push_subscriptions (profile_id);

-- Each event is announced at most once.
create table public.hk_push_log (
  event   text not null,
  ref_id  uuid not null,
  sent_at timestamptz not null default now(),
  primary key (event, ref_id)
);

-- Server-only settings (the push signing keys live here).
create table public.hk_private_settings (
  key   text primary key,
  value text not null
);

alter table public.hk_push_subscriptions enable row level security;
alter table public.hk_push_log enable row level security;
alter table public.hk_private_settings enable row level security;

revoke all on public.hk_push_subscriptions, public.hk_push_log, public.hk_private_settings
  from public, anon, authenticated;
