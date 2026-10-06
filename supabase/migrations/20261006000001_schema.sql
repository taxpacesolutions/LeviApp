-- =====================================================================
-- Levi Reward Bucks — core schema
--
-- Design notes
--  * Multi-family / multi-child from day one. Nothing is hard-coded to Levi.
--  * Money is NEVER stored as an editable balance. Balances are computed
--    from the append-only `transactions` ledger (see `account_balances`).
--  * Every transaction carries an `available_delta` and a `savings_delta`
--    so a single row can describe a transfer between the two buckets.
--  * Transactions cannot be updated or deleted (trigger). Mistakes are fixed
--    with `reversal` or `adjustment` rows, which leaves a full audit trail.
--  * All money movement goes through `post_transaction()`, which locks the
--    child's account row and refuses anything that would go negative.
--  * The browser never talks to these tables. The Next.js server uses the
--    service-role key; RLS is enabled with no public policies and anon /
--    authenticated roles have no privileges.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Families, people, accounts
-- ---------------------------------------------------------------------
create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our Family',
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  role          text not null check (role in ('parent', 'child')),
  display_name  text not null check (length(trim(display_name)) between 1 and 40),
  avatar_emoji  text not null default '🙂',
  -- Parent profiles are linked to a Supabase Auth user on first sign-in.
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  -- Optional: only this email may claim an unclaimed parent profile.
  invite_email  text,
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index profiles_family_idx on public.profiles(family_id);

create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  child_id    uuid not null unique references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
create table public.settings (
  family_id               uuid primary key references public.families(id) on delete cascade,
  parent_pin_hash         text not null,
  pin_is_default          boolean not null default true,
  pin_failed_attempts     int not null default 0,
  pin_locked_until        timestamptz,
  parent_title            text not null default 'Mom',      -- used for "Ask Mom"
  timezone                text not null default 'America/New_York',
  parent_session_minutes  int not null default 30 check (parent_session_minutes between 1 and 720),
  earn_presets            int[] not null default '{1,2,5,10}',
  streak_categories       text[] not null default '{schoolwork,reading,chores}',
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------
create table public.rewards (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  child_id     uuid references public.profiles(id) on delete cascade, -- null = every child
  name         text not null check (length(trim(name)) between 1 and 60),
  description  text not null default '',
  cost         int not null check (cost > 0 and cost <= 100000),
  icon         text not null default '🎁',
  image_url    text,
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index rewards_family_idx on public.rewards(family_id);

create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  child_id       uuid not null references public.profiles(id) on delete cascade,
  name           text not null check (length(trim(name)) between 1 and 60),
  target_amount  int not null check (target_amount > 0 and target_amount <= 100000),
  icon           text not null default '🎯',
  image_url      text,
  target_date    date,
  status         text not null default 'active' check (status in ('active', 'paused', 'completed')),
  completed_at   timestamptz,
  purchased_at   timestamptz,   -- goal Bucks were spent on the real thing
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index goals_child_idx on public.goals(child_id);

create table public.transactions (
  id                       uuid primary key default gen_random_uuid(),
  seq                      bigserial not null unique,  -- stable ordering for running balances
  family_id                uuid not null references public.families(id) on delete cascade,
  account_id               uuid not null references public.accounts(id) on delete cascade,
  child_id                 uuid not null references public.profiles(id) on delete cascade,
  type                     text not null check (type in (
                             'earn', 'spend', 'transfer_to_savings', 'transfer_from_savings',
                             'bonus', 'adjustment', 'reversal')),
  available_delta          int not null default 0,
  savings_delta            int not null default 0,
  category                 text,
  description              text not null,
  note                     text,
  reward_id                uuid references public.rewards(id) on delete set null,
  goal_id                  uuid references public.goals(id) on delete set null,
  reverses_transaction_id  uuid unique references public.transactions(id),
  created_by               uuid references public.profiles(id) on delete set null,
  created_by_label         text not null default 'System',
  created_at               timestamptz not null default now(),

  constraint txn_nonzero check (available_delta <> 0 or savings_delta <> 0),
  constraint txn_sane check (abs(available_delta) <= 100000 and abs(savings_delta) <= 100000),
  constraint txn_shape check (
    case type
      when 'earn' then available_delta > 0 and savings_delta = 0
      when 'spend' then (available_delta < 0 and savings_delta = 0)
                     or (available_delta = 0 and savings_delta < 0)
      when 'transfer_to_savings' then savings_delta > 0 and available_delta = -savings_delta
      when 'transfer_from_savings' then available_delta > 0 and savings_delta = -available_delta
      when 'bonus' then available_delta >= 0 and savings_delta >= 0
      when 'reversal' then reverses_transaction_id is not null
      else true
    end
  )
);
create index transactions_account_idx on public.transactions(account_id, created_at, seq);
create index transactions_child_type_idx on public.transactions(child_id, type);

create or replace function public.forbid_transaction_changes() returns trigger
language plpgsql as $$
begin
  raise exception 'Transactions are permanent. Use a reversal or an adjustment instead.';
end $$;

create trigger transactions_are_append_only
  before update or delete on public.transactions
  for each row execute function public.forbid_transaction_changes();

create table public.goal_contributions (
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null references public.goals(id) on delete cascade,
  child_id         uuid not null references public.profiles(id) on delete cascade,
  amount           int not null check (amount <> 0),
  transaction_id   uuid references public.transactions(id),
  note             text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_by_label text not null default 'System',
  created_at       timestamptz not null default now()
);
create index goal_contributions_goal_idx on public.goal_contributions(goal_id);

-- ---------------------------------------------------------------------
-- Requests from the child (parent approves / declines)
-- ---------------------------------------------------------------------
create table public.redemption_requests (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  child_id        uuid not null references public.profiles(id) on delete cascade,
  reward_id       uuid references public.rewards(id) on delete set null,
  reward_name     text not null,
  reward_icon     text not null default '🎁',
  cost            int not null check (cost > 0),
  status          text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  requested_at    timestamptz not null default now(),
  decided_at      timestamptz,
  decided_by      uuid references public.profiles(id) on delete set null,
  decision_note   text,
  transaction_id  uuid references public.transactions(id)
);
create index redemption_requests_child_idx on public.redemption_requests(child_id, status);

create table public.transfer_requests (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  child_id        uuid not null references public.profiles(id) on delete cascade,
  direction       text not null default 'to_savings' check (direction in ('to_savings')),
  amount          int not null check (amount > 0 and amount <= 100000),
  goal_id         uuid references public.goals(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  requested_at    timestamptz not null default now(),
  decided_at      timestamptz,
  decided_by      uuid references public.profiles(id) on delete set null,
  decision_note   text,
  transaction_id  uuid references public.transactions(id)
);
create index transfer_requests_child_idx on public.transfer_requests(child_id, status);

-- ---------------------------------------------------------------------
-- Achievements, streaks, celebrations
-- ---------------------------------------------------------------------
create table public.achievements (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  code         text not null,
  name         text not null,
  description  text not null default '',
  icon         text not null default '⭐',
  rule_type    text not null check (rule_type in (
                 'lifetime_earned', 'savings_balance', 'category_count',
                 'streak_days', 'rewards_redeemed', 'goals_completed', 'manual')),
  threshold    int not null default 1 check (threshold >= 0),
  category     text,
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  unique (family_id, code)
);

create table public.user_achievements (
  id              uuid primary key default gen_random_uuid(),
  achievement_id  uuid not null references public.achievements(id) on delete cascade,
  child_id        uuid not null references public.profiles(id) on delete cascade,
  unlocked_at     timestamptz not null default now(),
  awarded_by      uuid references public.profiles(id) on delete set null,
  unique (achievement_id, child_id)
);

create table public.streaks (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references public.profiles(id) on delete cascade,
  category       text not null,
  current_count  int not null default 0,
  longest_count  int not null default 0,
  last_date      date,
  updated_at     timestamptz not null default now(),
  unique (child_id, category)
);

create table public.celebrations (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('achievement', 'goal', 'streak', 'savings')),
  title       text not null,
  message     text not null default '',
  emoji       text not null default '🎉',
  created_at  timestamptz not null default now(),
  seen_at     timestamptz
);
create index celebrations_unseen_idx on public.celebrations(child_id) where seen_at is null;

-- ---------------------------------------------------------------------
-- Savings bonus ("interest")
-- ---------------------------------------------------------------------
create table public.savings_bonus_rules (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  child_id       uuid references public.profiles(id) on delete cascade, -- null = every child
  enabled        boolean not null default false,
  bonus_type     text not null default 'percent' check (bonus_type in ('percent', 'flat')),
  percent        numeric(5,2) not null default 5 check (percent >= 0 and percent <= 100),
  flat_amount    int not null default 5 check (flat_amount >= 0 and flat_amount <= 10000),
  min_balance    int not null default 0 check (min_balance >= 0),
  frequency      text not null default 'monthly' check (frequency in ('weekly', 'monthly')),
  enabled_since  timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.savings_bonus_awards (
  id              uuid primary key default gen_random_uuid(),
  rule_id         uuid not null references public.savings_bonus_rules(id) on delete cascade,
  child_id        uuid not null references public.profiles(id) on delete cascade,
  period_key      text not null,
  period_start    timestamptz not null,
  period_end      timestamptz not null,
  min_balance     int not null,
  amount          int not null default 0,
  transaction_id  uuid references public.transactions(id),
  created_at      timestamptz not null default now(),
  unique (rule_id, child_id, period_key)
);

-- ---------------------------------------------------------------------
-- Views (security_invoker so they never bypass RLS)
-- ---------------------------------------------------------------------
create view public.account_balances with (security_invoker = true) as
select a.id as account_id,
       a.child_id,
       a.family_id,
       coalesce(sum(t.available_delta), 0)::int as available,
       coalesce(sum(t.savings_delta), 0)::int   as savings
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create view public.transaction_ledger with (security_invoker = true) as
select t.*,
       (sum(t.available_delta) over w)::int as available_after,
       (sum(t.savings_delta)   over w)::int as savings_after,
       exists (select 1 from public.transactions r where r.reverses_transaction_id = t.id) as is_reversed
from public.transactions t
window w as (partition by t.account_id order by t.created_at, t.seq rows unbounded preceding);

create view public.goal_progress with (security_invoker = true) as
select g.*,
       coalesce((select sum(c.amount) from public.goal_contributions c where c.goal_id = g.id), 0)::int as saved
from public.goals g;

-- =====================================================================
-- Functions
-- =====================================================================

-- Local "today" for a family (streaks / weeks follow the family's timezone)
create or replace function public.family_now(p_family_id uuid) returns timestamp
language sql stable as $$
  select now() at time zone coalesce(
    (select timezone from public.settings where family_id = p_family_id), 'UTC');
$$;

-- Savings Bucks set aside for goals that have not been bought yet
create or replace function public.allocated_to_goals(p_child_id uuid) returns int
language sql stable as $$
  select coalesce(sum(c.amount), 0)::int
  from public.goal_contributions c
  join public.goals g on g.id = c.goal_id
  where g.child_id = p_child_id and g.purchased_at is null;
$$;

create or replace function public.add_celebration(
  p_child_id uuid, p_kind text, p_title text, p_message text, p_emoji text
) returns void language sql as $$
  insert into public.celebrations (child_id, kind, title, message, emoji)
  values (p_child_id, p_kind, p_title, coalesce(p_message, ''), coalesce(p_emoji, '🎉'));
$$;

-- ---------------------------------------------------------------------
-- Streaks: called for every 'earn' transaction
-- ---------------------------------------------------------------------
create or replace function public.touch_streak(p_child_id uuid, p_category text) returns void
language plpgsql as $$
declare
  v_family uuid;
  v_today date;
  v_tracked text[];
  s public.streaks;
  v_new int;
begin
  select family_id into v_family from public.profiles where id = p_child_id;
  select streak_categories into v_tracked from public.settings where family_id = v_family;
  if p_category is null or not (p_category = any(coalesce(v_tracked, '{}'))) then
    return;
  end if;

  v_today := public.family_now(v_family)::date;

  insert into public.streaks (child_id, category) values (p_child_id, p_category)
  on conflict (child_id, category) do nothing;

  select * into s from public.streaks
  where child_id = p_child_id and category = p_category for update;

  if s.last_date = v_today then
    return;                               -- already counted today
  elsif s.last_date = v_today - 1 then
    v_new := s.current_count + 1;         -- kept it going
  else
    v_new := 1;                           -- fresh start (no penalty, no shame)
  end if;

  update public.streaks
     set current_count = v_new,
         longest_count = greatest(longest_count, v_new),
         last_date = v_today,
         updated_at = now()
   where id = s.id;

  if v_new in (3, 5, 7, 10, 14, 21, 30, 50, 75, 100) then
    perform public.add_celebration(
      p_child_id, 'streak',
      '🔥 ' || v_new || '-day streak!',
      'You did ' || replace(p_category, '_', ' ') || ' ' || v_new || ' days in a row. Awesome!',
      '🔥');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------
create or replace function public.evaluate_achievements(p_child_id uuid) returns int
language plpgsql as $$
declare
  v_family uuid;
  a record;
  v_value int;
  v_unlocked int := 0;
begin
  select family_id into v_family from public.profiles where id = p_child_id;

  for a in
    select ach.* from public.achievements ach
    where ach.family_id = v_family and ach.active and ach.rule_type <> 'manual'
      and not exists (select 1 from public.user_achievements ua
                      where ua.achievement_id = ach.id and ua.child_id = p_child_id)
    order by ach.sort_order
  loop
    v_value := case a.rule_type
      when 'lifetime_earned' then (
        select coalesce(sum(t.available_delta + t.savings_delta), 0)
        from public.transactions t
        where t.child_id = p_child_id and t.type in ('earn', 'bonus')
          and not exists (select 1 from public.transactions r where r.reverses_transaction_id = t.id))
      when 'savings_balance' then (
        select coalesce(sum(t.savings_delta), 0) from public.transactions t where t.child_id = p_child_id)
      when 'category_count' then (
        select count(*) from public.transactions t
        where t.child_id = p_child_id and t.type = 'earn' and t.category = a.category
          and not exists (select 1 from public.transactions r where r.reverses_transaction_id = t.id))
      when 'streak_days' then (
        select coalesce(max(s.longest_count), 0) from public.streaks s
        where s.child_id = p_child_id and (a.category is null or s.category = a.category))
      when 'rewards_redeemed' then (
        select count(*) from public.redemption_requests rr
        where rr.child_id = p_child_id and rr.status = 'approved')
      when 'goals_completed' then (
        select count(*) from public.goals g
        where g.child_id = p_child_id and g.completed_at is not null)
      else 0
    end;

    if v_value >= a.threshold then
      insert into public.user_achievements (achievement_id, child_id)
      values (a.id, p_child_id) on conflict do nothing;
      perform public.add_celebration(p_child_id, 'achievement', '⭐ New badge!', a.name, a.icon);
      v_unlocked := v_unlocked + 1;
    end if;
  end loop;

  return v_unlocked;
end $$;

-- ---------------------------------------------------------------------
-- THE one place money moves.
-- Locks the account, validates, inserts, then updates streaks/badges.
-- ---------------------------------------------------------------------
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
  v_old_savings int;
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

  v_old_savings := v_savings;
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
  return v_row;
end $$;

-- ---------------------------------------------------------------------
-- Parent: earn / deduct / bonus
-- ---------------------------------------------------------------------
create or replace function public.earn_bucks(
  p_child_id uuid, p_amount int, p_category text, p_description text,
  p_note text, p_created_by uuid, p_created_by_label text, p_is_bonus boolean default false
) returns public.transactions language plpgsql as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than 0.';
  end if;
  return public.post_transaction(
    p_child_id, case when p_is_bonus then 'bonus' else 'earn' end,
    p_amount, 0, p_category, p_description, p_note, p_created_by, p_created_by_label);
end $$;

create or replace function public.deduct_bucks(
  p_child_id uuid, p_amount int, p_category text, p_description text,
  p_note text, p_created_by uuid, p_created_by_label text, p_as_adjustment boolean default false
) returns public.transactions language plpgsql as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than 0.';
  end if;
  return public.post_transaction(
    p_child_id, case when p_as_adjustment then 'adjustment' else 'spend' end,
    -p_amount, 0, p_category, p_description, p_note, p_created_by, p_created_by_label);
end $$;

-- ---------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------
create or replace function public.refresh_goal_status(p_goal_id uuid) returns void
language plpgsql as $$
declare
  g public.goal_progress;
begin
  select * into g from public.goal_progress where id = p_goal_id;
  if not found then return; end if;

  if g.saved >= g.target_amount and g.status <> 'completed' then
    update public.goals
       set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
     where id = g.id;
    perform public.add_celebration(g.child_id, 'goal', '🎉 Goal reached!',
      'You saved ' || g.target_amount || ' Bucks for ' || g.name || '!', g.icon);
    perform public.evaluate_achievements(g.child_id);
  elsif g.saved < g.target_amount and g.status = 'completed' and g.purchased_at is null then
    update public.goals set status = 'active', updated_at = now() where id = g.id;
  end if;
end $$;

-- Put Bucks toward a goal.
--   p_source = 'available' : moves Bucks from Available into Savings (transaction) and earmarks them
--   p_source = 'savings'   : earmarks Bucks that are already in Savings (no money moves)
create or replace function public.contribute_to_goal(
  p_goal_id uuid, p_amount int, p_source text,
  p_created_by uuid, p_created_by_label text, p_note text default null
) returns uuid language plpgsql as $$
declare
  g public.goal_progress;
  v_savings int;
  v_txn public.transactions;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than 0.';
  end if;
  select * into g from public.goal_progress where id = p_goal_id;
  if not found then raise exception 'Goal not found.'; end if;
  if g.purchased_at is not null then raise exception 'This goal is already finished.'; end if;
  if g.saved + p_amount > g.target_amount then
    raise exception 'That is more than this goal needs. It only needs % more Bucks.', g.target_amount - g.saved;
  end if;

  perform 1 from public.accounts where child_id = g.child_id for update;

  if p_source = 'available' then
    v_txn := public.post_transaction(g.child_id, 'transfer_to_savings', -p_amount, p_amount,
      'goal', 'Saved for ' || g.name, p_note, p_created_by, p_created_by_label, g.id);
  elsif p_source = 'savings' then
    select coalesce(sum(savings_delta), 0) into v_savings
      from public.transactions where child_id = g.child_id;
    if v_savings - public.allocated_to_goals(g.child_id) < p_amount then
      raise exception 'Only % free Bucks in savings.', v_savings - public.allocated_to_goals(g.child_id);
    end if;
  else
    raise exception 'Unknown source.';
  end if;

  insert into public.goal_contributions (goal_id, child_id, amount, transaction_id, note, created_by, created_by_label)
  values (g.id, g.child_id, p_amount, v_txn.id, p_note, p_created_by, p_created_by_label);

  perform public.refresh_goal_status(g.id);
  return v_txn.id;  -- null when earmarking existing savings
end $$;

-- Un-earmark Bucks from a goal (they stay in Savings).
create or replace function public.withdraw_from_goal(
  p_goal_id uuid, p_amount int, p_created_by uuid, p_created_by_label text, p_note text default null
) returns void language plpgsql as $$
declare
  g public.goal_progress;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than 0.';
  end if;
  select * into g from public.goal_progress where id = p_goal_id;
  if not found then raise exception 'Goal not found.'; end if;
  if g.purchased_at is not null then raise exception 'This goal is already finished.'; end if;
  if p_amount > g.saved then
    raise exception 'This goal only has % Bucks.', g.saved;
  end if;
  insert into public.goal_contributions (goal_id, child_id, amount, note, created_by, created_by_label)
  values (g.id, g.child_id, -p_amount, coalesce(p_note, 'Moved back to free savings'), p_created_by, p_created_by_label);
  perform public.refresh_goal_status(g.id);
end $$;

-- Spend the goal's Bucks on the real thing.
create or replace function public.purchase_goal(
  p_goal_id uuid, p_created_by uuid, p_created_by_label text
) returns public.transactions language plpgsql as $$
declare
  g public.goal_progress;
  v_txn public.transactions;
begin
  select * into g from public.goal_progress where id = p_goal_id;
  if not found then raise exception 'Goal not found.'; end if;
  if g.purchased_at is not null then raise exception 'This goal is already finished.'; end if;
  if g.saved <= 0 then raise exception 'This goal has no Bucks yet.'; end if;

  perform 1 from public.accounts where child_id = g.child_id for update;
  -- Release the earmark first so post_transaction sees the Bucks as spendable.
  update public.goals
     set purchased_at = now(), status = 'completed',
         completed_at = coalesce(completed_at, now()), updated_at = now()
   where id = g.id;

  v_txn := public.post_transaction(g.child_id, 'spend', 0, -g.saved, 'goal',
    'Bought ' || g.name, null, p_created_by, p_created_by_label, g.id);
  return v_txn;
end $$;

-- ---------------------------------------------------------------------
-- Transfers between Available and Savings (parent)
-- ---------------------------------------------------------------------
create or replace function public.transfer_bucks(
  p_child_id uuid, p_direction text, p_amount int, p_note text,
  p_created_by uuid, p_created_by_label text
) returns public.transactions language plpgsql as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than 0.';
  end if;
  if p_direction = 'to_savings' then
    return public.post_transaction(p_child_id, 'transfer_to_savings', -p_amount, p_amount,
      'savings', 'Moved to savings', p_note, p_created_by, p_created_by_label);
  elsif p_direction = 'from_savings' then
    return public.post_transaction(p_child_id, 'transfer_from_savings', p_amount, -p_amount,
      'savings', 'Moved out of savings', p_note, p_created_by, p_created_by_label);
  end if;
  raise exception 'Unknown direction.';
end $$;

-- ---------------------------------------------------------------------
-- Corrections: reversal / correction / set balances
-- ---------------------------------------------------------------------
create or replace function public.reverse_transaction(
  p_transaction_id uuid, p_reason text, p_created_by uuid, p_created_by_label text
) returns public.transactions language plpgsql as $$
declare
  t public.transactions;
  v_txn public.transactions;
  v_take int;
  c record;
begin
  select * into t from public.transactions where id = p_transaction_id;
  if not found then raise exception 'Transaction not found.'; end if;
  if t.type = 'reversal' then raise exception 'A reversal cannot be reversed. Add an adjustment instead.'; end if;
  if exists (select 1 from public.transactions where reverses_transaction_id = t.id) then
    raise exception 'This transaction was already reversed.';
  end if;
  if exists (select 1 from public.goals where id = t.goal_id and purchased_at is not null)
     and t.type = 'transfer_to_savings' then
    raise exception 'The goal was already bought. Add an adjustment instead.';
  end if;

  perform 1 from public.accounts where id = t.account_id for update;

  -- Undo goal earmarks tied to this transaction first, so savings are free to move back.
  for c in select * from public.goal_contributions where transaction_id = t.id loop
    -- only un-earmark what is still in the goal (some may have been moved out already)
    v_take := least(c.amount, (select saved from public.goal_progress where id = c.goal_id));
    if v_take > 0 then
      insert into public.goal_contributions (goal_id, child_id, amount, note, created_by, created_by_label)
      values (c.goal_id, c.child_id, -v_take, 'Reversed', p_created_by, p_created_by_label);
    end if;
  end loop;

  -- Un-buying a goal: re-open it so the refunded savings are earmarked again.
  if t.type = 'spend' and t.goal_id is not null and t.savings_delta < 0 then
    update public.goals set purchased_at = null, updated_at = now() where id = t.goal_id;
  end if;

  v_txn := public.post_transaction(t.child_id, 'reversal', -t.available_delta, -t.savings_delta,
    t.category, 'Reversed: ' || t.description,
    coalesce(nullif(trim(p_reason), ''), 'Correction'),
    p_created_by, p_created_by_label, t.goal_id, t.reward_id, t.id);

  for c in select distinct goal_id from public.goal_contributions where transaction_id = t.id loop
    perform public.refresh_goal_status(c.goal_id);
  end loop;

  return v_txn;
end $$;

-- Edit = reverse the original + post a corrected copy. Both stay in the ledger.
create or replace function public.correct_transaction(
  p_transaction_id uuid, p_new_amount int, p_new_category text, p_new_description text,
  p_reason text, p_created_by uuid, p_created_by_label text
) returns public.transactions language plpgsql as $$
declare
  t public.transactions;
  v_sign int;
begin
  select * into t from public.transactions where id = p_transaction_id;
  if not found then raise exception 'Transaction not found.'; end if;
  if t.type not in ('earn', 'spend', 'bonus', 'adjustment') or t.goal_id is not null then
    raise exception 'This kind of transaction can only be reversed, not edited.';
  end if;
  if t.savings_delta <> 0 then
    raise exception 'Savings transactions can only be reversed, not edited.';
  end if;
  if p_new_amount is null or p_new_amount <= 0 then
    raise exception 'Amount must be more than 0.';
  end if;

  v_sign := sign(t.available_delta);
  perform public.reverse_transaction(t.id, coalesce(p_reason, 'Edited'), p_created_by, p_created_by_label);
  return public.post_transaction(t.child_id, t.type, v_sign * p_new_amount, 0,
    coalesce(nullif(p_new_category, ''), t.category),
    coalesce(nullif(trim(p_new_description), ''), t.description),
    'Corrected entry' || coalesce(': ' || nullif(trim(p_reason), ''), ''),
    p_created_by, p_created_by_label, null, t.reward_id);
end $$;

-- Set balances to exact numbers by posting adjustment(s). Nothing is erased.
create or replace function public.set_balances(
  p_child_id uuid, p_available int, p_savings int, p_reason text,
  p_created_by uuid, p_created_by_label text
) returns void language plpgsql as $$
declare
  v_avail int;
  v_sav int;
begin
  if p_available < 0 or p_savings < 0 then
    raise exception 'Balances cannot be negative.';
  end if;
  perform 1 from public.accounts where child_id = p_child_id for update;
  select available, savings into v_avail, v_sav from public.account_balances where child_id = p_child_id;

  if p_available = v_avail and p_savings = v_sav then
    raise exception 'Balances are already set to those numbers.';
  end if;

  perform public.post_transaction(p_child_id, 'adjustment',
    p_available - v_avail, p_savings - v_sav, 'adjustment',
    'Balance adjustment', coalesce(nullif(trim(p_reason), ''), 'Balance reset by parent'),
    p_created_by, p_created_by_label);
end $$;

-- ---------------------------------------------------------------------
-- Child requests
-- ---------------------------------------------------------------------
create or replace function public.request_redemption(p_child_id uuid, p_reward_id uuid)
returns public.redemption_requests language plpgsql as $$
declare
  r public.rewards;
  v_family uuid;
  v_available int;
  v_pending int;
  v_req public.redemption_requests;
begin
  select family_id into v_family from public.profiles where id = p_child_id and role = 'child';
  select * into r from public.rewards
   where id = p_reward_id and family_id = v_family and active
     and (child_id is null or child_id = p_child_id);
  if not found then raise exception 'That reward is not available.'; end if;

  perform 1 from public.accounts where child_id = p_child_id for update;
  select available into v_available from public.account_balances where child_id = p_child_id;
  select coalesce(sum(cost), 0) into v_pending from public.redemption_requests
   where child_id = p_child_id and status = 'pending';

  if v_available - v_pending < r.cost then
    raise exception 'You need % more Bucks for this.', r.cost - (v_available - v_pending);
  end if;

  insert into public.redemption_requests (family_id, child_id, reward_id, reward_name, reward_icon, cost)
  values (v_family, p_child_id, r.id, r.name, r.icon, r.cost)
  returning * into v_req;
  return v_req;
end $$;

create or replace function public.decide_redemption(
  p_request_id uuid, p_approve boolean, p_note text, p_decided_by uuid, p_decided_by_label text
) returns public.redemption_requests language plpgsql as $$
declare
  req public.redemption_requests;
  v_txn public.transactions;
begin
  select * into req from public.redemption_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if req.status <> 'pending' then raise exception 'This request was already handled.'; end if;

  if p_approve then
    -- status first so "First Reward Redeemed" sees it during evaluation
    update public.redemption_requests
       set status = 'approved', decided_at = now(), decided_by = p_decided_by, decision_note = p_note
     where id = req.id;
    v_txn := public.post_transaction(req.child_id, 'spend', -req.cost, 0, 'reward',
      req.reward_name, p_note, p_decided_by, p_decided_by_label, null, req.reward_id);
    update public.redemption_requests set transaction_id = v_txn.id where id = req.id returning * into req;
  else
    update public.redemption_requests
       set status = 'declined', decided_at = now(), decided_by = p_decided_by, decision_note = p_note
     where id = req.id returning * into req;
  end if;
  return req;
end $$;

create or replace function public.request_transfer(p_child_id uuid, p_amount int, p_goal_id uuid)
returns public.transfer_requests language plpgsql as $$
declare
  v_family uuid;
  v_available int;
  v_pending int;
  v_req public.transfer_requests;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Pick how many Bucks to save.'; end if;
  select family_id into v_family from public.profiles where id = p_child_id and role = 'child';
  if v_family is null then raise exception 'Child not found.'; end if;
  if p_goal_id is not null and not exists (
      select 1 from public.goals where id = p_goal_id and child_id = p_child_id and purchased_at is null) then
    raise exception 'Goal not found.';
  end if;

  perform 1 from public.accounts where child_id = p_child_id for update;
  select available into v_available from public.account_balances where child_id = p_child_id;
  select coalesce(sum(amount), 0) into v_pending from public.transfer_requests
   where child_id = p_child_id and status = 'pending';
  if v_available - v_pending < p_amount then
    raise exception 'You only have % Bucks to move right now.', greatest(v_available - v_pending, 0);
  end if;

  insert into public.transfer_requests (family_id, child_id, amount, goal_id)
  values (v_family, p_child_id, p_amount, p_goal_id) returning * into v_req;
  return v_req;
end $$;

create or replace function public.decide_transfer(
  p_request_id uuid, p_approve boolean, p_note text, p_decided_by uuid, p_decided_by_label text
) returns public.transfer_requests language plpgsql as $$
declare
  req public.transfer_requests;
  v_txn public.transactions;
  v_txn_id uuid;
begin
  select * into req from public.transfer_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if req.status <> 'pending' then raise exception 'This request was already handled.'; end if;

  if p_approve then
    if req.goal_id is not null then
      v_txn_id := public.contribute_to_goal(req.goal_id, req.amount, 'available',
        p_decided_by, p_decided_by_label, coalesce(p_note, 'Requested by child'));
    else
      v_txn := public.transfer_bucks(req.child_id, 'to_savings', req.amount,
        coalesce(p_note, 'Requested by child'), p_decided_by, p_decided_by_label);
      v_txn_id := v_txn.id;
    end if;
    update public.transfer_requests
       set status = 'approved', decided_at = now(), decided_by = p_decided_by,
           decision_note = p_note, transaction_id = v_txn_id
     where id = req.id returning * into req;
  else
    update public.transfer_requests
       set status = 'declined', decided_at = now(), decided_by = p_decided_by, decision_note = p_note
     where id = req.id returning * into req;
  end if;
  return req;
end $$;

-- ---------------------------------------------------------------------
-- Savings Bonus — applied lazily (idempotent per period) whenever the app
-- loads, so no cron job is required. Looks at the PREVIOUS full period and
-- uses the LOWEST savings balance during it ("keep it saved all month").
-- ---------------------------------------------------------------------
create or replace function public.apply_due_savings_bonuses(p_child_id uuid) returns int
language plpgsql as $$
declare
  v_family uuid;
  v_tz text;
  v_local timestamp;
  rule public.savings_bonus_rules;
  v_cur_start timestamp;
  v_prev_start timestamp;
  v_key text;
  v_ws timestamptz;
  v_we timestamptz;
  v_start_bal int;
  v_min int;
  v_amount int;
  v_award_id uuid;
  v_txn public.transactions;
  v_count int := 0;
begin
  select family_id into v_family from public.profiles where id = p_child_id and role = 'child';
  if v_family is null then return 0; end if;
  select timezone into v_tz from public.settings where family_id = v_family;
  v_tz := coalesce(v_tz, 'UTC');
  v_local := now() at time zone v_tz;

  for rule in
    select * from public.savings_bonus_rules
    where family_id = v_family and enabled and (child_id is null or child_id = p_child_id)
  loop
    if rule.frequency = 'monthly' then
      v_cur_start := date_trunc('month', v_local);
      v_prev_start := v_cur_start - interval '1 month';
      v_key := to_char(v_prev_start, 'YYYY-MM');
    else
      v_cur_start := date_trunc('week', v_local);
      v_prev_start := v_cur_start - interval '7 days';
      v_key := to_char(v_prev_start, 'IYYY-"W"IW');
    end if;

    v_we := v_cur_start at time zone v_tz;
    v_ws := greatest(v_prev_start at time zone v_tz, rule.enabled_since);
    if rule.enabled_since >= v_we then
      continue;  -- rule did not exist during the previous period
    end if;

    if exists (select 1 from public.savings_bonus_awards
               where rule_id = rule.id and child_id = p_child_id and period_key = v_key) then
      continue;
    end if;

    select coalesce(sum(savings_delta), 0) into v_start_bal
      from public.transactions where child_id = p_child_id and created_at < v_ws;

    select least(v_start_bal, coalesce(min(run), v_start_bal)) into v_min
    from (
      select v_start_bal + sum(savings_delta) over (order by created_at, seq) as run
      from public.transactions
      where child_id = p_child_id and created_at >= v_ws and created_at < v_we
    ) s;

    if v_min < rule.min_balance then
      v_amount := 0;
    elsif rule.bonus_type = 'percent' then
      v_amount := round(v_min * rule.percent / 100.0);
    else
      v_amount := rule.flat_amount;
    end if;

    insert into public.savings_bonus_awards (rule_id, child_id, period_key, period_start, period_end, min_balance, amount)
    values (rule.id, p_child_id, v_key, v_ws, v_we, v_min, v_amount)
    on conflict do nothing
    returning id into v_award_id;

    if v_award_id is not null and v_amount > 0 then
      v_txn := public.post_transaction(p_child_id, 'bonus', 0, v_amount, 'savings_bonus',
        'Savings Bonus', 'For keeping ' || v_min || ' Bucks saved (' || v_key || ')',
        null, 'System');
      update public.savings_bonus_awards set transaction_id = v_txn.id where id = v_award_id;
      perform public.add_celebration(p_child_id, 'savings', '🐷 Savings Bonus!',
        'You earned ' || v_amount || ' Bucks for saving!', '🐷');
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Parent PIN (bcrypt via pgcrypto) with lockout after 5 wrong tries
-- ---------------------------------------------------------------------
-- security definer so the bcrypt functions in the `extensions` schema are always reachable;
-- execute is revoked from anon/authenticated below, so only the server can call these.
create or replace function public.verify_parent_pin(p_family_id uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  s public.settings;
begin
  select * into s from public.settings where family_id = p_family_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_settings'); end if;

  if s.pin_locked_until is not null and s.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'locked_until', s.pin_locked_until);
  end if;

  if s.parent_pin_hash = extensions.crypt(coalesce(p_pin, ''), s.parent_pin_hash) then
    update public.settings set pin_failed_attempts = 0, pin_locked_until = null where family_id = p_family_id;
    return jsonb_build_object('ok', true, 'pin_is_default', s.pin_is_default);
  end if;

  if s.pin_failed_attempts + 1 >= 5 then
    update public.settings
       set pin_failed_attempts = 0, pin_locked_until = now() + interval '5 minutes'
     where family_id = p_family_id;
    return jsonb_build_object('ok', false, 'locked_until', now() + interval '5 minutes');
  end if;

  update public.settings set pin_failed_attempts = pin_failed_attempts + 1 where family_id = p_family_id;
  return jsonb_build_object('ok', false, 'attempts_left', 5 - (s.pin_failed_attempts + 1));
end $$;

create or replace function public.set_parent_pin(p_family_id uuid, p_new_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_new_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must be 4 to 8 digits.';
  end if;
  update public.settings
     set parent_pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 10)),
         pin_is_default = false, pin_failed_attempts = 0, pin_locked_until = null, updated_at = now()
   where family_id = p_family_id;
end $$;

-- ---------------------------------------------------------------------
-- Family bootstrap helpers
-- ---------------------------------------------------------------------
-- Link a signed-in Supabase user to a parent profile. Returns the profile.
create or replace function public.claim_parent_profile(p_auth_user_id uuid, p_email text)
returns public.profiles language plpgsql as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where auth_user_id = p_auth_user_id;
  if found then return p; end if;

  select * into p from public.profiles
   where role = 'parent' and auth_user_id is null and active
     and (invite_email is null or lower(invite_email) = lower(p_email))
   order by (invite_email is null), created_at   -- exact email invites win
   limit 1
   for update skip locked;
  if not found then return null; end if;

  update public.profiles set auth_user_id = p_auth_user_id where id = p.id returning * into p;
  return p;
end $$;

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
  return p;
end $$;

-- Weekly numbers + streaks for dashboards, in the family's timezone.
create or replace function public.child_overview(p_child_id uuid) returns jsonb
language plpgsql stable as $$
declare
  v_family uuid;
  v_tz text;
  v_week_start timestamptz;
  v_today date;
  v_result jsonb;
begin
  select family_id into v_family from public.profiles where id = p_child_id;
  select coalesce(timezone, 'UTC') into v_tz from public.settings where family_id = v_family;
  v_tz := coalesce(v_tz, 'UTC');
  v_week_start := date_trunc('week', now() at time zone v_tz) at time zone v_tz;
  v_today := (now() at time zone v_tz)::date;

  with wk as (
    select t.* from public.transactions t
    where t.child_id = p_child_id and t.created_at >= v_week_start and t.type <> 'reversal'
      and not exists (select 1 from public.transactions r where r.reverses_transaction_id = t.id)
  )
  select jsonb_build_object(
    'available', b.available,
    'savings', b.savings,
    'allocated', public.allocated_to_goals(p_child_id),
    'week_earned', (select coalesce(sum(available_delta + savings_delta), 0) from wk where type in ('earn', 'bonus')),
    'week_spent',  (select coalesce(-sum(available_delta + savings_delta), 0) from wk where type = 'spend'),
    'week_saved',  (select coalesce(sum(savings_delta), 0) from wk where type in ('transfer_to_savings', 'transfer_from_savings')),
    'week_top_category', (select category from wk where type = 'earn' and category is not null
                          group by category order by sum(available_delta) desc, count(*) desc limit 1),
    'lifetime_earned', (select coalesce(sum(t.available_delta + t.savings_delta), 0) from public.transactions t
                        where t.child_id = p_child_id and t.type in ('earn', 'bonus')
                          and not exists (select 1 from public.transactions r where r.reverses_transaction_id = t.id)),
    'streaks', coalesce((select jsonb_agg(jsonb_build_object(
                 'category', s.category,
                 'current', case when s.last_date >= v_today - 1 then s.current_count else 0 end,
                 'longest', s.longest_count,
                 'done_today', s.last_date = v_today) order by s.category)
               from public.streaks s where s.child_id = p_child_id), '[]'::jsonb),
    'pending_redemptions', (select count(*) from public.redemption_requests where child_id = p_child_id and status = 'pending'),
    'pending_transfers',   (select count(*) from public.transfer_requests where child_id = p_child_id and status = 'pending'),
    'pending_redemption_total', (select coalesce(sum(cost), 0) from public.redemption_requests where child_id = p_child_id and status = 'pending'),
    'pending_transfer_total', (select coalesce(sum(amount), 0) from public.transfer_requests where child_id = p_child_id and status = 'pending')
  ) into v_result
  from public.account_balances b where b.child_id = p_child_id;

  return v_result;
end $$;

-- =====================================================================
-- Lock everything down. Only the server (service_role) may touch data.
-- =====================================================================
alter table public.families              enable row level security;
alter table public.profiles              enable row level security;
alter table public.accounts              enable row level security;
alter table public.settings              enable row level security;
alter table public.rewards               enable row level security;
alter table public.goals                 enable row level security;
alter table public.transactions          enable row level security;
alter table public.goal_contributions    enable row level security;
alter table public.redemption_requests   enable row level security;
alter table public.transfer_requests     enable row level security;
alter table public.achievements          enable row level security;
alter table public.user_achievements     enable row level security;
alter table public.streaks               enable row level security;
alter table public.celebrations          enable row level security;
alter table public.savings_bonus_rules   enable row level security;
alter table public.savings_bonus_awards  enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
