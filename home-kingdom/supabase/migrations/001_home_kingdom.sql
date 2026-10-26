-- =============================================================================
-- Home Kingdom: database schema, security rules and reward logic.
--
-- Security model
--   * Every table has Row Level Security. A signed-in user only sees rows of the
--     household their hero profile belongs to. Anyone else sees nothing.
--   * A login becomes a hero only if its *confirmed* email matches the email
--     stored on that hero (see hk_set_hero_email at the bottom).
--   * Gold, XP, the treasury, the ledger, achievements, unlocks and reward
--     approvals can't be written directly. They change only through the
--     hk_* functions below, which run checks inside one database transaction.
--   * Each task / project pays its reward at most once (rewarded_at flag plus a
--     unique index on the ledger), so toggling a task never duplicates gold.
--
-- All names start with hk_ so this can live next to other apps in one project.
-- =============================================================================

-- ---------------------------------------------------------------- tables -----

create table public.hk_households (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default 'Nuestro Reino' check (char_length(name) between 1 and 60),
  treasury_gold integer not null default 0 check (treasury_gold >= 0),
  -- Default rewards used when creating new tasks and quests (editable in Settings).
  settings      jsonb not null default '{
    "small_gold": 10, "small_xp": 10,
    "medium_gold": 25, "medium_xp": 20,
    "large_gold": 50, "large_xp": 40,
    "project_gold": 150, "project_xp": 100,
    "coop_gold": 75, "coop_xp": 50
  }'::jsonb,
  created_at    timestamptz not null default now()
);

create table public.hk_profiles (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.hk_households(id) on delete cascade,
  hero            text not null check (hero in ('jessica', 'mariano')),
  user_id         uuid unique references auth.users(id) on delete set null,
  email           text,
  display_name    text not null check (char_length(display_name) between 1 and 40),
  role_title      text not null default '' check (char_length(role_title) <= 40),
  avatar          jsonb not null default '{}'::jsonb,
  lang            text not null default 'es' check (lang in ('es', 'en')),
  gold            integer not null default 0 check (gold >= 0),
  xp              integer not null default 0 check (xp >= 0),
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  created_at      timestamptz not null default now(),
  unique (household_id, hero)
);
create unique index hk_profiles_email_idx on public.hk_profiles (lower(email));

-- Helper functions used by the security rules. They run with owner rights so the
-- rules can look up the caller's household without recursion.
create function public.hk_my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.hk_profiles where user_id = auth.uid()
$$;

create function public.hk_my_profile() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.hk_profiles where user_id = auth.uid()
$$;

create table public.hk_projects (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.hk_my_household() references public.hk_households(id) on delete cascade,
  kind         text not null default 'main' check (kind in ('main', 'coop')),
  title        text not null check (char_length(title) between 1 and 120),
  description  text not null default '' check (char_length(description) <= 1000),
  assignee     text not null default 'both' check (assignee in ('jessica', 'mariano', 'both')),
  status       text not null default 'not_started' check (status in ('not_started', 'in_progress', 'paused', 'completed')),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  target_date  date,
  budget       numeric(12, 2) check (budget >= 0),
  reward_gold  integer not null default 150 check (reward_gold between 0 and 1000),
  reward_xp    integer not null default 100 check (reward_xp between 0 and 1000),
  unlock_key   text,
  icon         text not null default 'scroll',
  archived     boolean not null default false,
  sort         integer not null default 0,
  completed_at timestamptz,
  rewarded_at  timestamptz,
  created_by   uuid default public.hk_my_profile() references public.hk_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index hk_projects_household_idx on public.hk_projects (household_id);

create table public.hk_tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.hk_households(id) on delete cascade,
  project_id   uuid not null references public.hk_projects(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 160),
  notes        text not null default '' check (char_length(notes) <= 1000),
  assignee     text not null default 'both' check (assignee in ('jessica', 'mariano', 'both')),
  status       text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  size         text not null default 'small' check (size in ('small', 'medium', 'large')),
  due_date     date,
  reward_gold  integer not null default 10 check (reward_gold between 0 and 500),
  reward_xp    integer not null default 10 check (reward_xp between 0 and 500),
  sort         integer not null default 0,
  completed_by uuid references public.hk_profiles(id) on delete set null,
  completed_at timestamptz,
  rewarded_at  timestamptz,
  created_by   uuid default public.hk_my_profile() references public.hk_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index hk_tasks_project_idx on public.hk_tasks (project_id);
create index hk_tasks_household_idx on public.hk_tasks (household_id);

-- Every change to gold or XP is written here (append-only).
-- profile_id null = the shared treasury.
create table public.hk_ledger (
  id           bigint generated always as identity primary key,
  household_id uuid not null references public.hk_households(id) on delete cascade,
  profile_id   uuid references public.hk_profiles(id) on delete cascade,
  kind         text not null check (kind in ('task', 'project', 'coop', 'purchase', 'contribution')),
  gold_delta   integer not null default 0,
  xp_delta     integer not null default 0,
  shared       boolean not null default false,
  source_id    uuid,
  note         text not null default '',
  created_by   uuid references public.hk_profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index hk_ledger_household_idx on public.hk_ledger (household_id, created_at desc);
-- Second safety net against duplicate rewards: one award per source per hero.
create unique index hk_ledger_award_once on public.hk_ledger (kind, source_id, profile_id)
  where kind in ('task', 'project', 'coop');

create table public.hk_shop_items (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null default public.hk_my_household() references public.hk_households(id) on delete cascade,
  category          text not null check (category in ('virtual', 'real')),
  title             text not null check (char_length(title) between 1 and 80),
  description       text not null default '' check (char_length(description) <= 300),
  icon              text not null default 'gift',
  price             integer not null check (price between 1 and 100000),
  requires_approval boolean not null default true,
  unlock_key        text,
  active            boolean not null default true,
  sort              integer not null default 0,
  created_by        uuid default public.hk_my_profile() references public.hk_profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  check (category = 'real' or unlock_key is not null)
);

-- requested -> approved (gold is paid here) -> completed
--           -> declined / cancelled (no gold moves)
create table public.hk_redemptions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.hk_households(id) on delete cascade,
  item_id      uuid references public.hk_shop_items(id) on delete set null,
  title        text not null,
  category     text not null check (category in ('virtual', 'real')),
  price        integer not null check (price >= 0),
  pay_from     text not null check (pay_from in ('self', 'treasury')),
  requested_by uuid not null references public.hk_profiles(id) on delete cascade,
  status       text not null check (status in ('requested', 'approved', 'completed', 'declined', 'cancelled')),
  decided_by   uuid references public.hk_profiles(id) on delete set null,
  decided_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index hk_redemptions_household_idx on public.hk_redemptions (household_id, created_at desc);

-- Things that appear in the pixel kingdom.
create table public.hk_unlocks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.hk_households(id) on delete cascade,
  key          text not null,
  source       text not null check (source in ('project', 'shop')),
  source_id    uuid,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (household_id, key)
);

create table public.hk_achievements (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.hk_households(id) on delete cascade,
  profile_id   uuid not null references public.hk_profiles(id) on delete cascade,
  key          text not null,
  earned_at    timestamptz not null default now(),
  unique (profile_id, key)
);

-- Campfire: built-in questions have household_id null.
create table public.hk_campfire_questions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid default public.hk_my_household() references public.hk_households(id) on delete cascade,
  category     text not null check (category in ('know', 'appreciation', 'dreams', 'communication')),
  text_es      text not null check (char_length(text_es) between 1 and 300),
  text_en      text not null default '' check (char_length(text_en) <= 300),
  sort         integer not null default 0,
  created_at   timestamptz not null default now()
);

create table public.hk_campfire_answers (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.hk_my_household() references public.hk_households(id) on delete cascade,
  question_id  uuid not null references public.hk_campfire_questions(id) on delete cascade,
  profile_id   uuid not null default public.hk_my_profile() references public.hk_profiles(id) on delete cascade,
  answer       text not null check (char_length(answer) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create table public.hk_campfire_marks (
  household_id uuid not null default public.hk_my_household() references public.hk_households(id) on delete cascade,
  question_id  uuid not null references public.hk_campfire_questions(id) on delete cascade,
  saved        boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (household_id, question_id)
);

-- Short notes: project comments, questions, help requests, appreciation, ideas.
create table public.hk_comments (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null default public.hk_my_household() references public.hk_households(id) on delete cascade,
  project_id      uuid references public.hk_projects(id) on delete cascade,
  task_id         uuid references public.hk_tasks(id) on delete cascade,
  author          uuid not null default public.hk_my_profile() references public.hk_profiles(id) on delete cascade,
  kind            text not null default 'note' check (kind in ('note', 'question', 'help', 'appreciation', 'suggestion')),
  body            text not null check (char_length(body) between 1 and 1000),
  acknowledged_by uuid references public.hk_profiles(id) on delete set null,
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now()
);
create index hk_comments_household_idx on public.hk_comments (household_id, created_at desc);

-- -------------------------------------------------------------- triggers -----

create function public.hk_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger hk_projects_touch before update on public.hk_projects
  for each row execute function public.hk_touch();
create trigger hk_tasks_touch before update on public.hk_tasks
  for each row execute function public.hk_touch();
create trigger hk_marks_touch before update on public.hk_campfire_marks
  for each row execute function public.hk_touch();

-- A task always belongs to its project's household (the app never sends it).
create function public.hk_task_household() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select household_id into new.household_id from public.hk_projects where id = new.project_id;
  return new;
end $$;
create trigger hk_tasks_household before insert or update of project_id on public.hk_tasks
  for each row execute function public.hk_task_household();

-- A comment on a task/project must belong to the same household.
create function public.hk_comment_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.task_id is not null then
    select project_id into new.project_id from public.hk_tasks
      where id = new.task_id and household_id = new.household_id;
    if new.project_id is null then raise exception 'not_found'; end if;
  elsif new.project_id is not null and not exists (
    select 1 from public.hk_projects where id = new.project_id and household_id = new.household_id) then
    raise exception 'not_found';
  end if;
  return new;
end $$;
create trigger hk_comments_check before insert on public.hk_comments
  for each row execute function public.hk_comment_check();

-- Campfire answers and marks must point to a question this household can see.
create function public.hk_campfire_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.hk_campfire_questions
                 where id = new.question_id
                   and (household_id is null or household_id = new.household_id)) then
    raise exception 'not_found';
  end if;
  return new;
end $$;
create trigger hk_answers_check before insert or update on public.hk_campfire_answers
  for each row execute function public.hk_campfire_check();
create trigger hk_marks_check before insert or update on public.hk_campfire_marks
  for each row execute function public.hk_campfire_check();

-- ---------------------------------------------------------- achievements -----

create function public.hk_level(p_xp integer) returns integer
language sql immutable as $$
  select case when p_xp >= 1500 then 5 when p_xp >= 700 then 4
              when p_xp >= 300 then 3 when p_xp >= 100 then 2 else 1 end
$$;

create function public.hk_grant_achievements(p_profile uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p           public.hk_profiles;
  v_projects  integer;
  v_shared    integer;
  v_rewards   integer;
  v_given     integer;
  v_answers   integer;
begin
  select * into p from public.hk_profiles where id = p_profile;
  if not found then return; end if;

  select count(*) filter (where kind in ('project', 'coop')),
         count(*) filter (where shared and kind in ('task', 'project', 'coop')),
         coalesce(-sum(gold_delta) filter (where kind = 'contribution'), 0)
    into v_projects, v_shared, v_given
    from public.hk_ledger where profile_id = p.id;
  select count(*) into v_rewards from public.hk_redemptions
    where requested_by = p.id and status in ('approved', 'completed');
  select count(*) into v_answers from public.hk_campfire_answers where profile_id = p.id;

  insert into public.hk_achievements (household_id, profile_id, key)
  select p.household_id, p.id, a.key
  from (values
    ('first_task',    p.tasks_completed >= 1),
    ('tasks_10',      p.tasks_completed >= 10),
    ('tasks_25',      p.tasks_completed >= 25),
    ('tasks_50',      p.tasks_completed >= 50),
    ('tasks_100',     p.tasks_completed >= 100),
    ('first_project', v_projects >= 1),
    ('projects_3',    v_projects >= 3),
    ('projects_10',   v_projects >= 10),
    ('teamwork_1',    v_shared >= 1),
    ('teamwork_10',   v_shared >= 10),
    ('level_3',       public.hk_level(p.xp) >= 3),
    ('level_5',       public.hk_level(p.xp) >= 5),
    ('first_reward',  v_rewards >= 1),
    ('generous',      v_given >= 100),
    ('campfire_1',    v_answers >= 1),
    ('campfire_10',   v_answers >= 10)
  ) as a(key, ok)
  where a.ok
  on conflict (profile_id, key) do nothing;
end $$;

create function public.hk_ledger_achievements() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is not null then perform public.hk_grant_achievements(new.profile_id); end if;
  return null;
end $$;
create trigger hk_ledger_achievements after insert on public.hk_ledger
  for each row execute function public.hk_ledger_achievements();

create function public.hk_answer_achievements() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.hk_grant_achievements(new.profile_id);
  return null;
end $$;
create trigger hk_answer_achievements after insert on public.hk_campfire_answers
  for each row execute function public.hk_answer_achievements();

create function public.hk_redemption_achievements() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.hk_grant_achievements(new.requested_by);
  return null;
end $$;
create trigger hk_redemption_achievements after insert or update of status on public.hk_redemptions
  for each row execute function public.hk_redemption_achievements();

-- ------------------------------------------------------------ app actions ----

-- The caller's hero profile, or an error if this login isn't one of the heroes.
create function public.hk_me() returns public.hk_profiles
language plpgsql stable security definer set search_path = public as $$
declare p public.hk_profiles;
begin
  select * into p from public.hk_profiles where user_id = auth.uid();
  if not found then raise exception 'not_a_member'; end if;
  return p;
end $$;

-- Called right after sign-in. Links the login to its hero the first time, using
-- the confirmed email stored on the hero. Returns null for anyone else.
create function public.hk_whoami() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p       public.hk_profiles;
  v_email text;
begin
  if auth.uid() is null then return null; end if;
  select * into p from public.hk_profiles where user_id = auth.uid();
  if not found then
    select email into v_email from auth.users
      where id = auth.uid() and email_confirmed_at is not null;
    if v_email is null then return null; end if;
    update public.hk_profiles set user_id = auth.uid()
      where lower(email) = lower(v_email) and user_id is null
      returning * into p;
    if p.id is null then return null; end if;
  end if;
  return jsonb_build_object('profile_id', p.id, 'hero', p.hero, 'household_id', p.household_id);
end $$;

-- Pays a reward to one hero, once per source. Returns the award or null.
create function public.hk_award(p_household uuid, p_hero text, p_kind text, p_source uuid,
                                p_gold integer, p_xp integer, p_shared boolean, p_by uuid,
                                p_count_task boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_profile uuid; v_id bigint;
begin
  select id into v_profile from public.hk_profiles where household_id = p_household and hero = p_hero;
  if v_profile is null then return null; end if;
  insert into public.hk_ledger (household_id, profile_id, kind, gold_delta, xp_delta, shared, source_id, created_by)
    values (p_household, v_profile, p_kind, p_gold, p_xp, p_shared, p_source, p_by)
    on conflict do nothing
    returning id into v_id;
  if v_id is null then return null; end if;
  update public.hk_profiles
    set gold = gold + p_gold, xp = xp + p_xp,
        tasks_completed = tasks_completed + case when p_count_task then 1 else 0 end
    where id = v_profile;
  -- The ledger trigger ran before the balance changed; check achievements again.
  perform public.hk_grant_achievements(v_profile);
  return jsonb_build_object('hero', p_hero, 'gold', p_gold, 'xp', p_xp);
end $$;

create function public.hk_heroes(p_assignee text) returns text[]
language sql immutable as $$
  select case p_assignee when 'both' then array['jessica', 'mariano'] else array[p_assignee] end
$$;

-- One tap: complete / reopen / start a task. Rewards are paid the first time
-- a task is completed and never again, however often it's toggled.
create function public.hk_set_task_status(p_task uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me       public.hk_profiles := public.hk_me();
  t        public.hk_tasks;
  v_hero   text;
  v_award  jsonb;
  v_awards jsonb := '[]'::jsonb;
begin
  if p_status not in ('pending', 'in_progress', 'completed') then raise exception 'bad_status'; end if;
  select * into t from public.hk_tasks where id = p_task and household_id = me.household_id for update;
  if not found then raise exception 'not_found'; end if;
  if t.status = p_status then return jsonb_build_object('awards', v_awards); end if;

  if p_status = 'completed' then
    update public.hk_tasks set status = 'completed', completed_by = me.id, completed_at = now(),
                               rewarded_at = coalesce(rewarded_at, now())
      where id = t.id;
    if t.rewarded_at is null then
      foreach v_hero in array public.hk_heroes(t.assignee) loop
        v_award := public.hk_award(t.household_id, v_hero, 'task', t.id, t.reward_gold, t.reward_xp,
                                   t.assignee = 'both', me.id, true);
        if v_award is not null then v_awards := v_awards || v_award; end if;
      end loop;
    end if;
    update public.hk_projects set status = 'in_progress'
      where id = t.project_id and status = 'not_started';
  else
    update public.hk_tasks set status = p_status, completed_by = null, completed_at = null where id = t.id;
    update public.hk_projects set status = 'in_progress', completed_at = null
      where id = t.project_id and status in ('completed', 'not_started');
  end if;
  return jsonb_build_object('awards', v_awards);
end $$;

-- Finish a main quest (or a cooperative quest). Pays once and unlocks its
-- kingdom decoration.
create function public.hk_complete_project(p_project uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me       public.hk_profiles := public.hk_me();
  pr       public.hk_projects;
  v_hero   text;
  v_award  jsonb;
  v_awards jsonb := '[]'::jsonb;
  v_unlock text;
begin
  select * into pr from public.hk_projects where id = p_project and household_id = me.household_id for update;
  if not found then raise exception 'not_found'; end if;
  if pr.status = 'completed' then return jsonb_build_object('awards', v_awards); end if;

  update public.hk_projects set status = 'completed', completed_at = now(),
                                rewarded_at = coalesce(rewarded_at, now())
    where id = pr.id;
  if pr.rewarded_at is null then
    foreach v_hero in array public.hk_heroes(pr.assignee) loop
      v_award := public.hk_award(pr.household_id, v_hero,
                                 case pr.kind when 'coop' then 'coop' else 'project' end,
                                 pr.id, pr.reward_gold, pr.reward_xp, pr.assignee = 'both', me.id, false);
      if v_award is not null then v_awards := v_awards || v_award; end if;
    end loop;
  end if;
  if pr.unlock_key is not null then
    insert into public.hk_unlocks (household_id, key, source, source_id)
      values (pr.household_id, pr.unlock_key, 'project', pr.id)
      on conflict (household_id, key) do nothing
      returning key into v_unlock;
  end if;
  return jsonb_build_object('awards', v_awards, 'unlock', v_unlock);
end $$;

-- Not started / in progress / paused (and reopening a completed quest).
create function public.hk_set_project_status(p_project uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.hk_profiles := public.hk_me();
begin
  if p_status not in ('not_started', 'in_progress', 'paused') then raise exception 'bad_status'; end if;
  update public.hk_projects set status = p_status, completed_at = null
    where id = p_project and household_id = me.household_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Move some of my gold into the shared treasury.
create function public.hk_contribute(p_amount integer) returns void
language plpgsql security definer set search_path = public as $$
declare me public.hk_profiles := public.hk_me();
begin
  if p_amount is null or p_amount <= 0 then raise exception 'bad_amount'; end if;
  update public.hk_profiles set gold = gold - p_amount where id = me.id and gold >= p_amount;
  if not found then raise exception 'insufficient_gold'; end if;
  update public.hk_households set treasury_gold = treasury_gold + p_amount where id = me.household_id;
  insert into public.hk_ledger (household_id, profile_id, kind, gold_delta, created_by, note)
    values (me.household_id, me.id, 'contribution', -p_amount, me.id, 'to_treasury'),
           (me.household_id, null, 'contribution', p_amount, me.id, 'from_' || me.hero);
end $$;

-- Internal: take gold from a hero or the treasury. Never goes below zero.
create function public.hk_pay(p_household uuid, p_payer uuid, p_from text, p_amount integer,
                              p_redemption uuid, p_title text, p_by uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_from = 'self' then
    update public.hk_profiles set gold = gold - p_amount where id = p_payer and gold >= p_amount;
    if not found then raise exception 'insufficient_gold'; end if;
    insert into public.hk_ledger (household_id, profile_id, kind, gold_delta, source_id, note, created_by)
      values (p_household, p_payer, 'purchase', -p_amount, p_redemption, p_title, p_by);
  else
    update public.hk_households set treasury_gold = treasury_gold - p_amount
      where id = p_household and treasury_gold >= p_amount;
    if not found then raise exception 'insufficient_treasury'; end if;
    insert into public.hk_ledger (household_id, profile_id, kind, gold_delta, source_id, note, created_by)
      values (p_household, null, 'purchase', -p_amount, p_redemption, p_title, p_by);
  end if;
end $$;

-- Shop. Kingdom decorations unlock at once. Real-life rewards that need the
-- other hero's OK (and anything paid from the treasury) wait for approval;
-- no gold moves until then.
create function public.hk_buy(p_item uuid, p_pay_from text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     public.hk_profiles := public.hk_me();
  it     public.hk_shop_items;
  v_red  uuid;
  v_wait boolean;
begin
  if p_pay_from not in ('self', 'treasury') then raise exception 'bad_source'; end if;
  select * into it from public.hk_shop_items
    where id = p_item and household_id = me.household_id and active;
  if not found then raise exception 'not_found'; end if;

  if it.category = 'virtual' then
    perform pg_advisory_xact_lock(hashtext(me.household_id::text || it.unlock_key));
    if exists (select 1 from public.hk_unlocks where household_id = me.household_id and key = it.unlock_key) then
      raise exception 'already_owned';
    end if;
    insert into public.hk_redemptions (household_id, item_id, title, category, price, pay_from, requested_by,
                                       status, decided_by, decided_at, completed_at)
      values (me.household_id, it.id, it.title, it.category, it.price, p_pay_from, me.id,
              'completed', me.id, now(), now())
      returning id into v_red;
    perform public.hk_pay(me.household_id, me.id, p_pay_from, it.price, v_red, it.title, me.id);
    insert into public.hk_unlocks (household_id, key, source, source_id)
      values (me.household_id, it.unlock_key, 'shop', it.id);
    return jsonb_build_object('status', 'completed', 'unlock', it.unlock_key, 'redemption', v_red);
  end if;

  v_wait := it.requires_approval or p_pay_from = 'treasury';
  if not v_wait then
    -- Fail early with a clear message instead of creating a request.
    if p_pay_from = 'self' and me.gold < it.price then raise exception 'insufficient_gold'; end if;
  end if;
  insert into public.hk_redemptions (household_id, item_id, title, category, price, pay_from, requested_by, status,
                                     decided_by, decided_at)
    values (me.household_id, it.id, it.title, it.category, it.price, p_pay_from, me.id,
            case when v_wait then 'requested' else 'approved' end,
            case when v_wait then null else me.id end,
            case when v_wait then null else now() end)
    returning id into v_red;
  if not v_wait then
    perform public.hk_pay(me.household_id, me.id, p_pay_from, it.price, v_red, it.title, me.id);
  end if;
  return jsonb_build_object('status', case when v_wait then 'requested' else 'approved' end, 'redemption', v_red);
end $$;

-- The *other* hero approves or declines. Approval is when the gold is paid.
create function public.hk_decide_redemption(p_redemption uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  me public.hk_profiles := public.hk_me();
  r  public.hk_redemptions;
begin
  select * into r from public.hk_redemptions
    where id = p_redemption and household_id = me.household_id for update;
  if not found then raise exception 'not_found'; end if;
  if r.status <> 'requested' then raise exception 'already_decided'; end if;
  if r.requested_by = me.id then raise exception 'cannot_approve_own'; end if;
  if p_approve then
    perform public.hk_pay(r.household_id, r.requested_by, r.pay_from, r.price, r.id, r.title, me.id);
  end if;
  update public.hk_redemptions
    set status = case when p_approve then 'approved' else 'declined' end,
        decided_by = me.id, decided_at = now()
    where id = r.id;
end $$;

create function public.hk_cancel_redemption(p_redemption uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me public.hk_profiles := public.hk_me();
begin
  update public.hk_redemptions set status = 'cancelled', decided_at = now()
    where id = p_redemption and household_id = me.household_id
      and requested_by = me.id and status = 'requested';
  if not found then raise exception 'not_found'; end if;
end $$;

-- Mark a paid real-life reward as enjoyed / done.
create function public.hk_complete_redemption(p_redemption uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me public.hk_profiles := public.hk_me();
begin
  update public.hk_redemptions set status = 'completed', completed_at = now()
    where id = p_redemption and household_id = me.household_id and status = 'approved';
  if not found then raise exception 'not_found'; end if;
end $$;

create function public.hk_ack_comment(p_comment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me public.hk_profiles := public.hk_me();
begin
  update public.hk_comments set acknowledged_by = me.id, acknowledged_at = now()
    where id = p_comment and household_id = me.household_id
      and author <> me.id and acknowledged_at is null;
end $$;

-- Admin only (SQL editor / setup script): which email belongs to which hero.
create function public.hk_set_hero_email(p_hero text, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.hk_profiles
    set email = nullif(lower(trim(p_email)), ''),
        user_id = case when lower(coalesce(email, '')) = lower(trim(p_email)) then user_id else null end
    where hero = p_hero;
end $$;

-- ------------------------------------------------------- row level security --

alter table public.hk_households         enable row level security;
alter table public.hk_profiles           enable row level security;
alter table public.hk_projects           enable row level security;
alter table public.hk_tasks              enable row level security;
alter table public.hk_ledger             enable row level security;
alter table public.hk_shop_items         enable row level security;
alter table public.hk_redemptions        enable row level security;
alter table public.hk_unlocks            enable row level security;
alter table public.hk_achievements       enable row level security;
alter table public.hk_campfire_questions enable row level security;
alter table public.hk_campfire_answers   enable row level security;
alter table public.hk_campfire_marks     enable row level security;
alter table public.hk_comments           enable row level security;

-- Read: only your own household.
create policy hk_read on public.hk_households   for select to authenticated using (id = public.hk_my_household());
create policy hk_read on public.hk_profiles     for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_projects     for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_tasks        for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_ledger       for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_shop_items   for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_redemptions  for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_unlocks      for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_achievements for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_campfire_questions for select to authenticated
  using ((household_id is null and public.hk_my_household() is not null) or household_id = public.hk_my_household());
create policy hk_read on public.hk_campfire_answers for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_campfire_marks   for select to authenticated using (household_id = public.hk_my_household());
create policy hk_read on public.hk_comments         for select to authenticated using (household_id = public.hk_my_household());

-- Write: only inside your household (and only the columns granted below).
create policy hk_update on public.hk_households for update to authenticated
  using (id = public.hk_my_household()) with check (id = public.hk_my_household());
create policy hk_update on public.hk_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy hk_insert on public.hk_projects for insert to authenticated with check (household_id = public.hk_my_household());
create policy hk_update on public.hk_projects for update to authenticated
  using (household_id = public.hk_my_household()) with check (household_id = public.hk_my_household());
create policy hk_delete on public.hk_projects for delete to authenticated using (household_id = public.hk_my_household());

create policy hk_insert on public.hk_tasks for insert to authenticated with check (household_id = public.hk_my_household());
create policy hk_update on public.hk_tasks for update to authenticated
  using (household_id = public.hk_my_household()) with check (household_id = public.hk_my_household());
create policy hk_delete on public.hk_tasks for delete to authenticated using (household_id = public.hk_my_household());

create policy hk_insert on public.hk_shop_items for insert to authenticated with check (household_id = public.hk_my_household());
create policy hk_update on public.hk_shop_items for update to authenticated
  using (household_id = public.hk_my_household()) with check (household_id = public.hk_my_household());
create policy hk_delete on public.hk_shop_items for delete to authenticated using (household_id = public.hk_my_household());

create policy hk_update on public.hk_unlocks for update to authenticated
  using (household_id = public.hk_my_household()) with check (household_id = public.hk_my_household());

create policy hk_insert on public.hk_campfire_questions for insert to authenticated with check (household_id = public.hk_my_household());
create policy hk_delete on public.hk_campfire_questions for delete to authenticated using (household_id = public.hk_my_household());

create policy hk_insert on public.hk_campfire_answers for insert to authenticated
  with check (household_id = public.hk_my_household() and profile_id = public.hk_my_profile());
create policy hk_update on public.hk_campfire_answers for update to authenticated
  using (profile_id = public.hk_my_profile()) with check (profile_id = public.hk_my_profile());
create policy hk_delete on public.hk_campfire_answers for delete to authenticated using (profile_id = public.hk_my_profile());

create policy hk_insert on public.hk_campfire_marks for insert to authenticated with check (household_id = public.hk_my_household());
create policy hk_update on public.hk_campfire_marks for update to authenticated
  using (household_id = public.hk_my_household()) with check (household_id = public.hk_my_household());

create policy hk_insert on public.hk_comments for insert to authenticated
  with check (household_id = public.hk_my_household() and author = public.hk_my_profile());
create policy hk_delete on public.hk_comments for delete to authenticated using (author = public.hk_my_profile());

-- -------------------------------------------------------------- privileges ---
-- Start from nothing, then allow exactly what the app needs. Columns such as
-- gold, xp, status, rewarded_at or treasury_gold are deliberately missing:
-- only the functions above can change them.

revoke all on public.hk_households, public.hk_profiles, public.hk_projects, public.hk_tasks,
              public.hk_ledger, public.hk_shop_items, public.hk_redemptions, public.hk_unlocks,
              public.hk_achievements, public.hk_campfire_questions, public.hk_campfire_answers,
              public.hk_campfire_marks, public.hk_comments
  from public, anon, authenticated;

grant select on public.hk_households, public.hk_profiles, public.hk_projects, public.hk_tasks,
                public.hk_ledger, public.hk_shop_items, public.hk_redemptions, public.hk_unlocks,
                public.hk_achievements, public.hk_campfire_questions, public.hk_campfire_answers,
                public.hk_campfire_marks, public.hk_comments
  to authenticated;

grant update (name, settings) on public.hk_households to authenticated;
grant update (display_name, role_title, avatar, lang) on public.hk_profiles to authenticated;

grant insert (kind, title, description, assignee, priority, target_date, budget, reward_gold, reward_xp,
              unlock_key, icon, sort) on public.hk_projects to authenticated;
grant update (title, description, assignee, priority, target_date, budget, reward_gold, reward_xp,
              icon, archived, sort) on public.hk_projects to authenticated;
grant delete on public.hk_projects to authenticated;

grant insert (project_id, title, notes, assignee, size, due_date, reward_gold, reward_xp, sort)
  on public.hk_tasks to authenticated;
grant update (title, notes, assignee, size, due_date, reward_gold, reward_xp, sort)
  on public.hk_tasks to authenticated;
grant delete on public.hk_tasks to authenticated;

grant insert (category, title, description, icon, price, requires_approval, sort) on public.hk_shop_items to authenticated;
grant update (title, description, icon, price, requires_approval, active, sort) on public.hk_shop_items to authenticated;
grant delete on public.hk_shop_items to authenticated;

grant update (enabled) on public.hk_unlocks to authenticated;

grant insert (category, text_es, text_en) on public.hk_campfire_questions to authenticated;
grant delete on public.hk_campfire_questions to authenticated;
grant insert (question_id, answer) on public.hk_campfire_answers to authenticated;
grant update (answer) on public.hk_campfire_answers to authenticated;
grant delete on public.hk_campfire_answers to authenticated;
grant insert (question_id, saved, completed_at) on public.hk_campfire_marks to authenticated;
grant update (question_id, saved, completed_at) on public.hk_campfire_marks to authenticated;

grant insert (project_id, task_id, kind, body) on public.hk_comments to authenticated;
grant delete on public.hk_comments to authenticated;

-- Functions: lock everything down, then open the app actions to signed-in users.
revoke execute on function
  public.hk_my_household(), public.hk_my_profile(), public.hk_touch(), public.hk_task_household(),
  public.hk_comment_check(), public.hk_campfire_check(), public.hk_level(integer),
  public.hk_grant_achievements(uuid), public.hk_ledger_achievements(), public.hk_answer_achievements(),
  public.hk_redemption_achievements(), public.hk_me(), public.hk_whoami(),
  public.hk_award(uuid, text, text, uuid, integer, integer, boolean, uuid, boolean), public.hk_heroes(text),
  public.hk_set_task_status(uuid, text), public.hk_complete_project(uuid),
  public.hk_set_project_status(uuid, text), public.hk_contribute(integer),
  public.hk_pay(uuid, uuid, text, integer, uuid, text, uuid), public.hk_buy(uuid, text),
  public.hk_decide_redemption(uuid, boolean), public.hk_cancel_redemption(uuid),
  public.hk_complete_redemption(uuid), public.hk_ack_comment(uuid), public.hk_set_hero_email(text, text)
  from public, anon, authenticated;

grant execute on function
  public.hk_my_household(), public.hk_my_profile(), public.hk_whoami(),
  public.hk_set_task_status(uuid, text), public.hk_complete_project(uuid),
  public.hk_set_project_status(uuid, text), public.hk_contribute(integer), public.hk_buy(uuid, text),
  public.hk_decide_redemption(uuid, boolean), public.hk_cancel_redemption(uuid),
  public.hk_complete_redemption(uuid), public.hk_ack_comment(uuid)
  to authenticated;

-- --------------------------------------------------------------- realtime ----
-- Lets both phones see changes within a second or two.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['hk_households', 'hk_profiles', 'hk_projects', 'hk_tasks', 'hk_ledger',
                             'hk_shop_items', 'hk_redemptions', 'hk_unlocks', 'hk_achievements',
                             'hk_campfire_questions', 'hk_campfire_answers', 'hk_campfire_marks', 'hk_comments']
    loop
      execute format('alter publication supabase_realtime add table public.%I', t);
    end loop;
  end if;
end $$;
