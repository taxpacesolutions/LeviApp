-- Run after supabase_mock.sql, the migration and seed.sql. Every check raises on failure.
\set ON_ERROR_STOP on
insert into auth.users values
  ('11111111-1111-1111-1111-111111111111', 'jess@example.com', now()),
  ('22222222-2222-2222-2222-222222222222', 'mariano@example.com', now()),
  ('33333333-3333-3333-3333-333333333333', 'stranger@example.com', now()),
  ('44444444-4444-4444-4444-444444444444', 'Mariano.Unconfirmed@example.com', null);
select public.hk_set_hero_email('jessica', 'Jess@Example.com');
select public.hk_set_hero_email('mariano', 'mariano@example.com');

create function pg_temp.as_user(p uuid) returns void language sql as
  $$ select set_config('request.jwt.claim.sub', p::text, false) $$;
create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as
  $$ begin if not coalesce(ok, false) then raise exception 'FAILED: %', msg; end if; raise notice 'ok: %', msg; end $$;
grant execute on all functions in schema pg_temp to authenticated;

set role authenticated;

-- Outsider: confirmed email that isn't a hero sees nothing and can do nothing.
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.check(public.hk_whoami() is null, 'outsider is not linked');
select pg_temp.check((select count(*) from public.hk_projects) = 0, 'outsider sees no projects');
select pg_temp.check((select count(*) from public.hk_profiles) = 0, 'outsider sees no profiles');
select pg_temp.check((select count(*) from public.hk_campfire_questions) = 0, 'outsider sees no questions');
do $$ begin
  insert into public.hk_projects (title) values ('hack');
  raise exception 'FAILED: outsider insert allowed';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: outsider insert blocked (%)', sqlerrm;
end $$;
do $$ begin
  perform public.hk_contribute(1);
  raise exception 'FAILED: outsider rpc allowed';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: outsider rpc blocked (%)', sqlerrm;
end $$;

-- Unconfirmed email can't claim a hero.
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select pg_temp.check(public.hk_whoami() is null, 'unconfirmed login is not linked');

-- Jessica links (email match is case-insensitive) and sees the seed.
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.check(public.hk_whoami()->>'hero' = 'jessica', 'jessica linked');
select pg_temp.check((select count(*) from public.hk_projects) = 15, '15 starter projects');
select pg_temp.check((select count(*) from public.hk_tasks where status = 'completed') = 0, 'no task pre-completed');
select pg_temp.check((select count(*) from public.hk_campfire_questions) >= 12, 'questions visible');

-- Direct balance tampering is impossible.
do $$ begin
  update public.hk_profiles set gold = 99999;
  raise exception 'FAILED: gold update allowed';
exception when insufficient_privilege then raise notice 'ok: gold column protected';
end $$;
do $$ begin
  update public.hk_households set treasury_gold = 99999;
  raise exception 'FAILED: treasury update allowed';
exception when insufficient_privilege then raise notice 'ok: treasury protected';
end $$;
do $$ begin
  insert into public.hk_ledger (household_id, profile_id, kind, gold_delta) select household_id, id, 'task', 500 from public.hk_profiles limit 1;
  raise exception 'FAILED: ledger insert allowed';
exception when insufficient_privilege then raise notice 'ok: ledger protected';
end $$;
do $$ begin
  update public.hk_tasks set status = 'completed';
  raise exception 'FAILED: task status update allowed';
exception when insufficient_privilege then raise notice 'ok: task status only via function';
end $$;
-- Jessica can't rename Mariano.
update public.hk_profiles set display_name = 'X' where hero = 'mariano';
select pg_temp.check((select display_name from public.hk_profiles where hero = 'mariano') = 'Mariano', 'cannot edit partner profile');

-- Complete a Jessica task -> she gets 10 gold / 10 xp once, however often it's toggled.
reset role;
create temp table t_pick as select id from public.hk_tasks t where t.assignee = 'jessica' and size = 'small' order by id limit 1;
grant select on t_pick to authenticated;
set role authenticated;
select public.hk_set_task_status((select id from t_pick), 'completed');
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 10, 'task paid 10 gold');
select public.hk_set_task_status((select id from t_pick), 'pending');
select public.hk_set_task_status((select id from t_pick), 'completed');
select public.hk_set_task_status((select id from t_pick), 'pending');
select public.hk_set_task_status((select id from t_pick), 'completed');
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 10, 'toggling never duplicates gold');
select pg_temp.check((select xp from public.hk_profiles where hero = 'jessica') = 10, 'toggling never duplicates xp');
select pg_temp.check((select tasks_completed from public.hk_profiles where hero = 'jessica') = 1, 'task counted once');
select pg_temp.check(exists (select 1 from public.hk_achievements a join public.hk_profiles p on p.id = a.profile_id
                             where p.hero = 'jessica' and key = 'first_task'), 'first_task achievement');

-- Shared task pays both heroes once each.
select public.hk_set_task_status((select id from public.hk_tasks t where t.assignee = 'both' and size = 'medium' order by id limit 1), 'completed');
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 35, 'shared task paid jessica');
select pg_temp.check((select gold from public.hk_profiles where hero = 'mariano') = 25, 'shared task paid mariano');

-- Completing a project pays once and unlocks its decoration.
select public.hk_complete_project((select id from public.hk_projects where unlock_key = 'garden'));
select public.hk_set_project_status((select id from public.hk_projects where unlock_key = 'garden'), 'in_progress');
select public.hk_complete_project((select id from public.hk_projects where unlock_key = 'garden'));
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 185, 'project paid 150 once');
select pg_temp.check((select count(*) from public.hk_unlocks where key = 'garden') = 1, 'garden unlocked');

-- Treasury contribution, never negative.
select public.hk_contribute(100);
select pg_temp.check((select treasury_gold from public.hk_households) = 100, 'treasury got 100');
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 85, 'jessica paid 100');
do $$ begin
  perform public.hk_contribute(1000);
  raise exception 'FAILED: overdraft allowed';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: cannot go negative (%)', sqlerrm;
end $$;

-- Virtual purchase: instant, once.
select public.hk_buy((select id from public.hk_shop_items where unlock_key = 'mailbox'), 'self');
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 55, 'mailbox cost 30');
do $$ begin
  perform public.hk_buy((select id from public.hk_shop_items where unlock_key = 'mailbox'), 'self');
  raise exception 'FAILED: bought twice';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: decoration only once (%)', sqlerrm;
end $$;

-- Real reward needing approval: no gold moves until the partner approves.
select public.hk_buy((select id from public.hk_shop_items where title like 'Elegir la película%'), 'self');
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 55, 'request does not deduct');
do $$ begin
  perform public.hk_decide_redemption((select id from public.hk_redemptions where status = 'requested'), true);
  raise exception 'FAILED: self-approval allowed';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: cannot approve own request (%)', sqlerrm;
end $$;

-- Mariano approves -> 40 gold leaves Jessica; approving again fails.
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check(public.hk_whoami()->>'hero' = 'mariano', 'mariano linked');
select public.hk_decide_redemption((select id from public.hk_redemptions where status = 'requested'), true);
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 15, 'approval deducted 40');
do $$ begin
  perform public.hk_decide_redemption((select id from public.hk_redemptions where title like 'Elegir la película%'), true);
  raise exception 'FAILED: double approval';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: cannot approve twice (%)', sqlerrm;
end $$;
select public.hk_complete_redemption((select id from public.hk_redemptions where title like 'Elegir la película%'));
select pg_temp.check((select status from public.hk_redemptions where title like 'Elegir la película%') = 'completed', 'reward completed');

-- Treasury spending on a real reward always needs the other's OK.
select public.hk_buy((select id from public.hk_shop_items where title like 'Desayuno%'), 'treasury');
select pg_temp.check((select treasury_gold from public.hk_households) = 100, 'treasury request does not deduct');

-- Approval that can't be afforded fails cleanly.
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.hk_buy((select id from public.hk_shop_items where title like 'Salida especial%'), 'self');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
do $$ begin
  perform public.hk_decide_redemption((select id from public.hk_redemptions where title like 'Salida especial%'), true);
  raise exception 'FAILED: unaffordable approval';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: unaffordable approval refused (%)', sqlerrm;
end $$;
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 15, 'balance untouched');

-- Comments, acknowledgements, campfire.
insert into public.hk_comments (kind, body) values ('appreciation', '¡Gracias por todo!');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.hk_ack_comment((select id from public.hk_comments limit 1));
select pg_temp.check((select acknowledged_at is not null from public.hk_comments limit 1), 'comment acknowledged');
insert into public.hk_campfire_answers (question_id, answer) select id, 'Aprender a tocar guitarra' from public.hk_campfire_questions order by sort limit 1;
insert into public.hk_campfire_marks (question_id, saved) select id, true from public.hk_campfire_questions order by sort limit 1
  on conflict (household_id, question_id) do update set saved = excluded.saved, question_id = excluded.question_id;
select pg_temp.check((select count(*) from public.hk_campfire_marks) = 1, 'campfire mark saved');
do $$ begin
  insert into public.hk_campfire_answers (question_id, answer, profile_id)
    select q.id, 'fake', p.id from public.hk_campfire_questions q, public.hk_profiles p where p.hero = 'mariano' limit 1;
  raise exception 'FAILED: answered as partner';
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok: cannot answer as partner (%)', sqlerrm;
end $$;

-- Create a quest with tasks and delete it; gold already earned stays.
insert into public.hk_projects (kind, title, assignee, reward_gold, reward_xp) values ('coop', 'Planear una cita', 'both', 75, 50);
insert into public.hk_tasks (project_id, title) select id, 'Elegir comida' from public.hk_projects where title = 'Planear una cita';
select pg_temp.check((select household_id from public.hk_tasks where title = 'Elegir comida') is not null, 'task gets household');
select public.hk_complete_project((select id from public.hk_projects where title = 'Planear una cita'));
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 90, 'coop quest paid 75');
delete from public.hk_projects where title = 'Planear una cita';
select pg_temp.check((select gold from public.hk_profiles where hero = 'jessica') = 90, 'gold kept after delete');

reset role;
select 'ALL TESTS PASSED' as result;
