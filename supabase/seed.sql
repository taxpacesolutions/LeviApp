-- =====================================================================
-- Sample data so the app works immediately.
--   Family:  "Our Family"
--   Parent:  "Mom" (linked to the first Supabase Auth user who signs in)
--   Child:   Levi
--   PIN:     1234  (you'll be asked to change it)
--
-- Final balances: Available 20, Savings 40 (10 free + 30 set aside for LEGO).
-- =====================================================================

do $$
declare
  v_family uuid := '00000000-0000-0000-0000-000000000001';
  v_parent uuid := '00000000-0000-0000-0000-000000000002';
  v_levi   uuid := '00000000-0000-0000-0000-000000000010';
  v_acct   uuid := '00000000-0000-0000-0000-000000000011';
  v_lego   uuid := '00000000-0000-0000-0000-000000000020';
  v_small  uuid := '00000000-0000-0000-0000-000000000031';
  v_txn    uuid;
  d        timestamptz := date_trunc('day', now()) + interval '17 hours';
begin
  if exists (select 1 from public.families where id = v_family) then
    raise notice 'Seed data already present, skipping.';
    return;
  end if;

  insert into public.families (id, name) values (v_family, 'Our Family');

  insert into public.settings (family_id, parent_pin_hash, pin_is_default, parent_title, timezone)
  values (v_family, extensions.crypt('1234', extensions.gen_salt('bf', 10)), true, 'Mom', 'America/New_York');

  insert into public.profiles (id, family_id, role, display_name, avatar_emoji, sort_order)
  values (v_parent, v_family, 'parent', 'Mom', '👩', 0),
         (v_levi,   v_family, 'child',  'Levi', '🦖', 1);

  insert into public.accounts (id, family_id, child_id) values (v_acct, v_family, v_levi);

  -- Rewards ------------------------------------------------------------
  insert into public.rewards (id, family_id, name, description, cost, icon, sort_order) values
    (gen_random_uuid(), v_family, 'Choose Dessert',   'Pick tonight''s dessert.',               10,  '🍨', 1),
    (gen_random_uuid(), v_family, 'Movie Night',      'You pick the movie. Popcorn included!',  15,  '🎬', 2),
    (gen_random_uuid(), v_family, 'Extra Game Time',  '30 more minutes of game time.',          20,  '🎮', 3),
    (gen_random_uuid(), v_family, 'Choose Dinner',    'You pick what the family eats.',         25,  '🍕', 4),
    (v_small,           v_family, 'Small Toy',        'A small toy from the store.',            50,  '🧸', 5),
    (gen_random_uuid(), v_family, 'Special Outing',   'A trip somewhere fun with Mom.',         75,  '🎡', 6),
    (gen_random_uuid(), v_family, '$5 Spending Money','Five real dollars to spend.',            100, '💵', 7);

  -- Goal ---------------------------------------------------------------
  insert into public.goals (id, family_id, child_id, name, target_amount, icon, sort_order)
  values (v_lego, v_family, v_levi, 'LEGO Set', 100, '🧱', 1);

  -- Achievements -------------------------------------------------------
  insert into public.achievements (family_id, code, name, description, icon, rule_type, threshold, category, sort_order) values
    (v_family, 'first_10',          'First 10 Bucks',     'Earn your first 10 Bucks.',              '💰', 'lifetime_earned', 10,  null,         1),
    (v_family, 'saved_25',          'Saved 25 Bucks',     'Have 25 Bucks in savings.',              '🐷', 'savings_balance', 25,  null,         2),
    (v_family, 'saved_50',          'Saved 50 Bucks',     'Have 50 Bucks in savings.',              '🏦', 'savings_balance', 50,  null,         3),
    (v_family, 'saved_100',         'Saved 100 Bucks',    'Have 100 Bucks in savings.',             '💎', 'savings_balance', 100, null,         4),
    (v_family, 'streak_7',          '7-Day Streak',       'Earn Bucks for the same thing 7 days in a row.', '🔥', 'streak_days', 7, null,      5),
    (v_family, 'reading_champion',  'Reading Champion',   'Earn Bucks for reading 10 times.',       '📚', 'category_count', 10,  'reading',    6),
    (v_family, 'homework_hero',     'Homework Hero',      'Finish schoolwork 10 times.',            '✏️', 'category_count', 10,  'schoolwork', 7),
    (v_family, 'super_helper',      'Super Helper',       'Help the family 10 times.',              '🦸', 'category_count', 10,  'helping',    8),
    (v_family, 'first_reward',      'First Reward',       'Buy your first reward.',                 '🎁', 'rewards_redeemed', 1, null,        9),
    (v_family, 'savings_superstar', 'Savings Superstar',  'Reach a savings goal.',                  '🌟', 'goals_completed', 1,  null,        10),
    (v_family, 'earned_100',        '100 Bucks Club',     'Earn 100 Bucks in total.',               '🚀', 'lifetime_earned', 100, null,       11);

  -- Savings bonus rule (off until a parent turns it on) -----------------
  insert into public.savings_bonus_rules (family_id, enabled, bonus_type, percent, flat_amount, min_balance, frequency)
  values (v_family, false, 'percent', 5, 5, 0, 'monthly');

  -- Ledger (inserted directly so dates can be in the past) -------------
  insert into public.transactions (family_id, account_id, child_id, type, available_delta, savings_delta, category, description, note, created_by, created_by_label, created_at) values
    (v_family, v_acct, v_levi, 'adjustment',  35, 10, 'adjustment', 'Starting balance',   'Welcome to Reward Bucks!', v_parent, 'Mom', d - interval '10 days'),
    (v_family, v_acct, v_levi, 'earn',         5,  0, 'reading',    'Reading',            null,                       v_parent, 'Mom', d - interval '8 days'),
    (v_family, v_acct, v_levi, 'earn',         5,  0, 'schoolwork', 'Finished schoolwork',null,                       v_parent, 'Mom', d - interval '7 days'),
    (v_family, v_acct, v_levi, 'earn',        10,  0, 'helping',    'Helped family',      'Carried in the groceries', v_parent, 'Mom', d - interval '6 days'),
    (v_family, v_acct, v_levi, 'spend',       -5,  0, 'reward',     'Small reward',       null,                       v_parent, 'Mom', d - interval '5 days');

  insert into public.transactions (family_id, account_id, child_id, type, available_delta, savings_delta, category, description, goal_id, created_by, created_by_label, created_at)
  values (v_family, v_acct, v_levi, 'transfer_to_savings', -30, 30, 'goal', 'Saved for LEGO Set', v_lego, v_parent, 'Mom', d - interval '4 days')
  returning id into v_txn;

  insert into public.goal_contributions (goal_id, child_id, amount, transaction_id, created_by, created_by_label, created_at)
  values (v_lego, v_levi, 30, v_txn, v_parent, 'Mom', d - interval '4 days');

  -- Unlock whatever the sample history already earns (First 10 Bucks, Saved 25)
  perform public.evaluate_achievements(v_levi);
end $$;
