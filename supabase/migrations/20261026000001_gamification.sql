-- =====================================================================
-- Levi Reward Bucks — gamification
--   * Levels + XP   (XP is computed from the ledger, never stored)
--   * A pet dino that grows with what Levi saves (never shrinks or gets sad)
--   * Weekly missions that pay a small bonus when completed
--   * New celebration kinds: level, pet, mission
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
alter table public.celebrations drop constraint if exists celebrations_kind_check;
alter table public.celebrations add constraint celebrations_kind_check
  check (kind in ('achievement', 'goal', 'streak', 'savings', 'level', 'pet', 'mission'));

-- Per-child game state that is NOT money: what has already been celebrated,
-- and the pet's name.
create table if not exists public.child_progress (
  child_id               uuid primary key references public.profiles(id) on delete cascade,
  level_celebrated       int not null default 1,
  pet_stage_celebrated   int not null default 0,
  pet_name               text not null default 'Rex' check (length(trim(pet_name)) between 1 and 20),
  updated_at             timestamptz not null default now()
);

create table if not exists public.missions (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  title         text not null check (length(trim(title)) between 1 and 60),
  icon          text not null default '🎯',
  kind          text not null check (kind in ('category_days', 'save_amount', 'earn_amount', 'earn_count')),
  target        int not null check (target between 1 and 1000),
  category      text,
  reward_bucks  int not null default 2 check (reward_bucks between 0 and 100),
  reward_xp     int not null default 10 check (reward_xp between 0 and 500),
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists missions_family_idx on public.missions(family_id);

create table if not exists public.mission_completions (
  id              uuid primary key default gen_random_uuid(),
  mission_id      uuid not null references public.missions(id) on delete cascade,
  child_id        uuid not null references public.profiles(id) on delete cascade,
  week_key        text not null,
  xp              int not null default 0,
  transaction_id  uuid references public.transactions(id),
  completed_at    timestamptz not null default now(),
  unique (mission_id, child_id, week_key)
);

-- ---------------------------------------------------------------------
-- Levels and pet stages (single source of truth; the app only displays them)
-- ---------------------------------------------------------------------
create or replace function public.level_info(p_xp int) returns jsonb
language sql immutable as $$
  with levels(level, title, emoji, min_xp) as (values
    (1, 'Penny Rookie',     '🪙', 0),
    (2, 'Coin Collector',   '🥉', 25),
    (3, 'Smart Saver',      '🐷', 60),
    (4, 'Budget Builder',   '🧱', 110),
    (5, 'Money Planner',    '🗺️', 180),
    (6, 'Junior Banker',    '🏦', 270),
    (7, 'Savings Hero',     '🦸', 380),
    (8, 'Treasure Keeper',  '💎', 520),
    (9, 'Finance Wizard',   '🧙', 700),
    (10, 'Money Master',    '👑', 920)
  ),
  cur as (select * from levels where min_xp <= greatest(p_xp, 0) order by level desc limit 1),
  nxt as (select * from levels where min_xp > greatest(p_xp, 0) order by level limit 1)
  select case
    when p_xp >= 920 then
      -- After level 10 every 300 XP is another "Money Legend" level.
      jsonb_build_object(
        'level', 10 + (p_xp - 920) / 300, 'title', case when p_xp >= 1220 then 'Money Legend' else 'Money Master' end,
        'emoji', case when p_xp >= 1220 then '🌟' else '👑' end,
        'min_xp', 920 + ((p_xp - 920) / 300) * 300, 'next_xp', 920 + ((p_xp - 920) / 300 + 1) * 300,
        'next_title', 'Money Legend')
    else
      (select jsonb_build_object('level', cur.level, 'title', cur.title, 'emoji', cur.emoji,
              'min_xp', cur.min_xp, 'next_xp', nxt.min_xp, 'next_title', nxt.title)
       from cur, nxt)
  end;
$$;

create or replace function public.pet_info(p_saved int) returns jsonb
language sql immutable as $$
  with stages(stage, name, emoji, min_saved) as (values
    (0, 'Egg',          '🥚', 0),
    (1, 'Hatchling',    '🦎', 20),
    (2, 'Little Dino',  '🦕', 60),
    (3, 'Big Dino',     '🦖', 150),
    (4, 'Mighty Dragon','🐉', 300)
  ),
  cur as (select * from stages where min_saved <= greatest(p_saved, 0) order by stage desc limit 1),
  nxt as (select * from stages where min_saved > greatest(p_saved, 0) order by stage limit 1)
  select jsonb_build_object('stage', cur.stage, 'name', cur.name, 'emoji', cur.emoji, 'min_saved', cur.min_saved,
           'next_saved', (select min_saved from nxt), 'next_name', (select name from nxt), 'next_emoji', (select emoji from nxt))
  from cur;
$$;

-- Non-reversed ledger rows for one child.
create or replace function public.live_transactions(p_child_id uuid)
returns setof public.transactions language sql stable as $$
  select t.* from public.transactions t
  where t.child_id = p_child_id and t.type <> 'reversal'
    and not exists (select 1 from public.transactions r where r.reverses_transaction_id = t.id);
$$;

-- Bucks ever put into savings (transfers in + bonuses paid into savings). Never goes down.
create or replace function public.lifetime_saved(p_child_id uuid) returns int
language sql stable as $$
  select coalesce(sum(savings_delta), 0)::int from public.live_transactions(p_child_id)
  where type = 'transfer_to_savings' or (type = 'bonus' and savings_delta > 0);
$$;

-- XP = Bucks earned + Bucks saved + mission XP.
create or replace function public.child_xp(p_child_id uuid) returns int
language sql stable as $$
  select (
    coalesce((select sum(available_delta + savings_delta) from public.live_transactions(p_child_id)
              where type in ('earn', 'bonus')), 0)
  + coalesce((select sum(savings_delta) from public.live_transactions(p_child_id)
              where type = 'transfer_to_savings'), 0)
  + coalesce((select sum(xp) from public.mission_completions where child_id = p_child_id), 0)
  )::int;
$$;

-- ---------------------------------------------------------------------
-- Missions
-- ---------------------------------------------------------------------
create or replace function public.family_week_start(p_family_id uuid) returns timestamptz
language sql stable as $$
  select date_trunc('week', public.family_now(p_family_id))
         at time zone coalesce((select timezone from public.settings where family_id = p_family_id), 'UTC');
$$;

create or replace function public.mission_value(p_mission public.missions, p_child_id uuid, p_since timestamptz) returns int
language sql stable as $$
  select case p_mission.kind
    when 'category_days' then (
      select count(distinct (t.created_at at time zone coalesce(s.timezone, 'UTC'))::date)::int
      from public.live_transactions(p_child_id) t
      left join public.settings s on s.family_id = t.family_id
      where t.type = 'earn' and t.category = p_mission.category and t.created_at >= p_since)
    when 'save_amount' then (
      select coalesce(sum(savings_delta), 0)::int from public.live_transactions(p_child_id)
      where type = 'transfer_to_savings' and created_at >= p_since)
    when 'earn_amount' then (
      select coalesce(sum(available_delta), 0)::int from public.live_transactions(p_child_id)
      where type = 'earn' and created_at >= p_since)
    when 'earn_count' then (
      select count(*)::int from public.live_transactions(p_child_id)
      where type = 'earn' and created_at >= p_since)
    else 0
  end;
$$;

create or replace function public.mission_progress(p_child_id uuid) returns jsonb
language plpgsql stable as $$
declare
  v_family uuid;
  v_since timestamptz;
  v_key text;
begin
  select family_id into v_family from public.profiles where id = p_child_id;
  v_since := public.family_week_start(v_family);
  v_key := to_char(public.family_now(v_family), 'IYYY-"W"IW');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'title', m.title, 'icon', m.icon, 'kind', m.kind, 'category', m.category,
      'target', m.target, 'reward_bucks', m.reward_bucks, 'reward_xp', m.reward_xp,
      'progress', least(public.mission_value(m, p_child_id, v_since), m.target),
      'done', exists (select 1 from public.mission_completions c
                      where c.mission_id = m.id and c.child_id = p_child_id and c.week_key = v_key))
      order by m.sort_order, m.created_at)
    from public.missions m where m.family_id = v_family and m.active), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- After every money movement: finish missions, then celebrate new levels
-- and pet stages. A transaction-local flag stops it re-entering itself when
-- it pays a mission bonus.
-- ---------------------------------------------------------------------
create or replace function public.check_progress(p_child_id uuid) returns void
language plpgsql as $$
declare
  v_family uuid;
  v_since timestamptz;
  v_key text;
  m public.missions;
  v_completion uuid;
  v_txn public.transactions;
  p public.child_progress;
  v_level jsonb;
  v_pet jsonb;
begin
  if coalesce(current_setting('lrb.in_progress', true), '') = '1' then
    return;
  end if;
  perform set_config('lrb.in_progress', '1', true);

  select family_id into v_family from public.profiles where id = p_child_id and role = 'child';
  if v_family is null then
    perform set_config('lrb.in_progress', '', true);
    return;
  end if;

  insert into public.child_progress (child_id) values (p_child_id) on conflict do nothing;

  -- 1. Weekly missions
  v_since := public.family_week_start(v_family);
  v_key := to_char(public.family_now(v_family), 'IYYY-"W"IW');
  for m in select * from public.missions where family_id = v_family and active order by sort_order loop
    if public.mission_value(m, p_child_id, v_since) >= m.target then
      v_completion := null;
      insert into public.mission_completions (mission_id, child_id, week_key, xp)
      values (m.id, p_child_id, v_key, m.reward_xp)
      on conflict do nothing
      returning id into v_completion;
      if v_completion is not null then
        if m.reward_bucks > 0 then
          v_txn := public.post_transaction(p_child_id, 'bonus', m.reward_bucks, 0, 'mission',
            'Mission: ' || m.title, 'Weekly mission complete', null, 'System');
          update public.mission_completions set transaction_id = v_txn.id where id = v_completion;
        end if;
        perform public.add_celebration(p_child_id, 'mission', '🎯 Mission complete!',
          m.title || case when m.reward_bucks > 0 then ' · +' || m.reward_bucks || ' Bucks' else '' end
          || case when m.reward_xp > 0 then ' · +' || m.reward_xp || ' XP' else '' end, m.icon);
      end if;
    end if;
  end loop;

  -- 2. Level ups and pet growth (only ever celebrated going up)
  select * into p from public.child_progress where child_id = p_child_id for update;
  v_level := public.level_info(public.child_xp(p_child_id));
  if (v_level->>'level')::int > p.level_celebrated then
    perform public.add_celebration(p_child_id, 'level',
      '⬆️ Level ' || (v_level->>'level') || '!', 'You are now a ' || (v_level->>'title') || '!', v_level->>'emoji');
    update public.child_progress set level_celebrated = (v_level->>'level')::int, updated_at = now()
     where child_id = p_child_id;
  end if;

  v_pet := public.pet_info(public.lifetime_saved(p_child_id));
  if (v_pet->>'stage')::int > p.pet_stage_celebrated then
    perform public.add_celebration(p_child_id, 'pet',
      '🐣 ' || p.pet_name || ' grew!', p.pet_name || ' is now a ' || (v_pet->>'name') || '. Saving made it grow!', v_pet->>'emoji');
    update public.child_progress set pet_stage_celebrated = (v_pet->>'stage')::int, updated_at = now()
     where child_id = p_child_id;
  end if;

  perform set_config('lrb.in_progress', '', true);
end $$;

-- post_transaction: unchanged except for the progress check at the end.
create or replace function public.post_transaction(
  p_child_id         uuid,
  p_type             text,
  p_available_delta  int,
  p_savings_delta    int,
  p_category         text,
  p_description      text,
  p_note             text default null,
  p_created_by       uuid default null,
  p_created_by_label text default 'System',
  p_goal_id          uuid default null,
  p_reward_id        uuid default null,
  p_reverses_id      uuid default null
) returns public.transactions
language plpgsql as $$
declare
  v_account public.accounts;
  v_available int;
  v_savings int;
  v_allocated int;
  v_row public.transactions;
begin
  select * into v_account from public.accounts where child_id = p_child_id for update;
  if not found then
    raise exception 'That child does not have an account.';
  end if;

  if coalesce(trim(p_description), '') = '' then
    raise exception 'Please add a description.';
  end if;

  select coalesce(sum(available_delta), 0), coalesce(sum(savings_delta), 0)
    into v_available, v_savings
  from public.transactions where account_id = v_account.id;

  v_available := v_available + coalesce(p_available_delta, 0);
  v_savings   := v_savings   + coalesce(p_savings_delta, 0);

  if v_available < 0 then
    raise exception 'Not enough Bucks available. This would leave % Bucks.', v_available;
  end if;
  if v_savings < 0 then
    raise exception 'Not enough Bucks in savings. This would leave % Bucks.', v_savings;
  end if;

  v_allocated := public.allocated_to_goals(p_child_id);
  if coalesce(p_savings_delta, 0) < 0 and v_savings < v_allocated then
    raise exception '% Bucks in savings are set aside for goals. Take Bucks out of a goal first.', v_allocated;
  end if;

  insert into public.transactions (
    family_id, account_id, child_id, type, available_delta, savings_delta,
    category, description, note, reward_id, goal_id, reverses_transaction_id,
    created_by, created_by_label)
  values (
    v_account.family_id, v_account.id, p_child_id, p_type,
    coalesce(p_available_delta, 0), coalesce(p_savings_delta, 0),
    p_category, trim(p_description), nullif(trim(coalesce(p_note, '')), ''),
    p_reward_id, p_goal_id, p_reverses_id,
    p_created_by, coalesce(p_created_by_label, 'System'))
  returning * into v_row;

  if p_type = 'earn' then
    perform public.touch_streak(p_child_id, p_category);
  end if;

  perform public.evaluate_achievements(p_child_id);
  perform public.check_progress(p_child_id);
  return v_row;
end $$;

-- Everything the game screens need in one call.
create or replace function public.child_game(p_child_id uuid) returns jsonb
language plpgsql stable as $$
declare
  v_xp int := public.child_xp(p_child_id);
  v_saved int := public.lifetime_saved(p_child_id);
begin
  return jsonb_build_object(
    'xp', v_xp,
    'level', public.level_info(v_xp),
    'lifetime_saved', v_saved,
    'pet', public.pet_info(v_saved),
    'pet_name', coalesce((select pet_name from public.child_progress where child_id = p_child_id), 'Rex'),
    'last_saved_at', (select max(created_at) from public.live_transactions(p_child_id)
                      where type = 'transfer_to_savings'),
    -- Happy if something was saved in the last 7 days; otherwise just "waiting" (never sad).
    'pet_happy', coalesce((select max(created_at) > now() - interval '7 days' from public.live_transactions(p_child_id)
                           where type = 'transfer_to_savings'), false),
    'missions', public.mission_progress(p_child_id));
end $$;

-- ---------------------------------------------------------------------
-- Starter missions for every family, and progress rows for every child
-- (set to their current level/stage so nobody gets a pile of old celebrations).
-- ---------------------------------------------------------------------
insert into public.missions (family_id, title, icon, kind, target, category, reward_bucks, reward_xp, sort_order)
select f.id, x.title, x.icon, x.kind, x.target, x.category, x.reward_bucks, x.reward_xp, x.sort_order
from public.families f
cross join (values
  ('Read on 3 days',          '📚', 'category_days', 3, 'reading',    3, 15, 1),
  ('Schoolwork on 4 days',    '✏️', 'category_days', 4, 'schoolwork', 3, 15, 2),
  ('Save 10 Bucks',           '🐷', 'save_amount',  10, null,         2, 20, 3),
  ('Earn Bucks 6 times',      '⭐', 'earn_count',    6, null,         2, 10, 4)
) as x(title, icon, kind, target, category, reward_bucks, reward_xp, sort_order)
where not exists (select 1 from public.missions m where m.family_id = f.id);

insert into public.child_progress (child_id, level_celebrated, pet_stage_celebrated)
select p.id,
       (public.level_info(public.child_xp(p.id))->>'level')::int,
       (public.pet_info(public.lifetime_saved(p.id))->>'stage')::int
from public.profiles p
where p.role = 'child'
on conflict (child_id) do nothing;

-- New children get starter progress too.
create or replace function public.create_child(p_family_id uuid, p_name text, p_emoji text)
returns public.profiles language plpgsql as $$
declare
  p public.profiles;
begin
  insert into public.profiles (family_id, role, display_name, avatar_emoji, sort_order)
  values (p_family_id, 'child', trim(p_name), coalesce(nullif(p_emoji, ''), '🙂'),
          (select coalesce(max(sort_order), 0) + 1 from public.profiles where family_id = p_family_id))
  returning * into p;
  insert into public.accounts (family_id, child_id) values (p_family_id, p.id);
  insert into public.child_progress (child_id) values (p.id);
  return p;
end $$;

-- ---------------------------------------------------------------------
-- Same lockdown as the core schema.
-- ---------------------------------------------------------------------
alter table public.child_progress       enable row level security;
alter table public.missions             enable row level security;
alter table public.mission_completions  enable row level security;

revoke all on public.child_progress, public.missions, public.mission_completions from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant all on public.child_progress, public.missions, public.mission_completions to service_role;
grant execute on all functions in schema public to service_role;
