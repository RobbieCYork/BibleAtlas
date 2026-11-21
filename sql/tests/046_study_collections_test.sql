-- ============================================================================
-- sql/tests/046_study_collections_test.sql — PROVES THE RULES OF sql/046.
--
-- Run as the database owner against a database with sql/025, sql/043 and
-- sql/046 applied (and the live `notes` table): a STAGING project, or the
-- local rehearsal
--   node scripts/study-collections/rls-test.mjs --local
-- NEVER against production: it inserts test accounts into auth.users. One
-- transaction, ends in ROLLBACK.
--
-- Every check is a DO block that RAISEs on failure and NOTICEs "PASS ..." on
-- success. The last notice is "ALL 046 CHECKS PASSED".
-- ============================================================================

begin;

--   ...21 reader A    ...22 reader B    ...23 owner
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000021', 'a46@test.invalid'),
  ('00000000-0000-4000-8000-000000000022', 'b46@test.invalid'),
  ('00000000-0000-4000-8000-000000000023', 'owner46@test.invalid');
insert into public.user_roles (user_id, role, note)
values ('00000000-0000-4000-8000-000000000023', 'owner', '046 test');

-- One verse note each.
insert into public.notes (id, user_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000021'),
  ('bbbbbbbb-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000022');

create or replace function pg_temp.become(p_role text, p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
end $$;

-- ------------------------------------------------ grants, as declared
do $$ begin
  if has_table_privilege('anon', 'public.study_collections', 'select')
     or has_table_privilege('anon', 'public.study_collection_items', 'select')
     or has_table_privilege('anon', 'public.study_collections', 'insert')
     or has_table_privilege('anon', 'public.study_collection_items', 'insert') then
    raise exception 'FAIL anon holds a privilege on a 046 table';
  end if;
  if has_table_privilege('authenticated', 'public.study_collections', 'truncate')
     or has_table_privilege('authenticated', 'public.study_collection_items', 'truncate')
     or has_table_privilege('authenticated', 'public.study_collections', 'references')
     or has_table_privilege('authenticated', 'public.study_collections', 'trigger') then
    raise exception 'FAIL authenticated holds truncate/references/trigger';
  end if;
  if has_column_privilege('authenticated', 'public.study_collections', 'user_id', 'update')
     or has_column_privilege('authenticated', 'public.study_collections', 'user_id', 'insert')
     or has_column_privilege('authenticated', 'public.study_collections', 'id', 'insert')
     or has_column_privilege('authenticated', 'public.study_collections', 'created_at', 'update')
     or has_column_privilege('authenticated', 'public.study_collection_items', 'user_id', 'insert')
     or has_column_privilege('authenticated', 'public.study_collection_items', 'user_id', 'update')
     or has_column_privilege('authenticated', 'public.study_collection_items', 'collection_id', 'update')
     or has_column_privilege('authenticated', 'public.study_collection_items', 'kind', 'update') then
    raise exception 'FAIL a client can write an identity column';
  end if;
  if has_function_privilege('anon', 'public.reorder_study_collection_items(uuid, uuid[])', 'execute') then
    raise exception 'FAIL anon can execute reorder_study_collection_items';
  end if;
  if not has_function_privilege('authenticated', 'public.reorder_study_collection_items(uuid, uuid[])', 'execute') then
    raise exception 'FAIL authenticated cannot execute reorder_study_collection_items';
  end if;
  raise notice 'PASS grants: anon nothing, no identity-column writes, no truncate';
end $$;

-- ------------------------------------------------ anon gets nothing
select pg_temp.become('anon', null);
set local role anon;
do $$ begin
  begin
    perform 1 from public.study_collections;
    raise exception 'FAIL anon could read study_collections';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.study_collections (title) values ('anon');
    raise exception 'FAIL anon could insert a collection';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reorder_study_collection_items(gen_random_uuid(), array[]::uuid[]);
    raise exception 'FAIL anon could call reorder';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anon gets nothing';
end $$;
reset role;

-- ------------------------------------------------ everyone_has_plus = true (ships true)
do $$ begin
  if not public.app_setting_bool('paid.everyone_has_plus', false) then
    raise exception 'FAIL setup: paid.everyone_has_plus should ship true';
  end if;
  raise notice 'PASS setup: everyone_has_plus ships true';
end $$;


-- B's collection, made as the database owner so its id is known (clients cannot choose ids).
insert into public.study_collections (id, user_id, title)
values ('cccccccc-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000022', 'B private');
insert into public.study_collection_items (collection_id, user_id, kind, ref_id, position)
values ('cccccccc-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000022', 'person', 'paul', 0);

-- A, a signed-in reader, builds a collection through the client grants only.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000021');
set local role authenticated;
do $$
declare
  c uuid;
  n int;
  k text;
begin
  insert into public.study_collections (title, description) values ('  Paul''s journeys  ', 'Places and people')
  returning id into c;
  if (select title from public.study_collections where id = c) <> 'Paul''s journeys' then
    raise exception 'FAIL title was not trimmed';
  end if;
  if (select user_id from public.study_collections where id = c) <> '00000000-0000-4000-8000-000000000021' then
    raise exception 'FAIL user_id did not default to auth.uid()';
  end if;

  insert into public.study_collection_items (collection_id, kind, ref_id, position) values
    (c, 'place',  'jerusalem', 0),
    (c, 'site',   'pool-of-siloam', 1),
    (c, 'person', 'paul', 2),
    (c, 'topic',  'baptism', 3),
    (c, 'event',  'council-of-nicaea', 4),
    (c, 'verse',  'John 3:16', 5),
    (c, 'verse',  '1 Corinthians 13:4-7', 6),
    (c, 'verse',  'Song of Solomon 2', 7),
    (c, 'note',   'aaaaaaaa-0000-4000-8000-0000000000a1', 8);
  select count(*) into n from public.study_collection_items where collection_id = c;
  if n <> 9 then raise exception 'FAIL expected 9 items, got %', n; end if;

  -- Bad shapes are refused by the CHECK.
  foreach k in array array['place|Jerusalem', 'person|../etc', 'verse|John', 'verse|<b>John 3:16</b>', 'note|not-a-uuid', 'event|']
  loop
    begin
      insert into public.study_collection_items (collection_id, kind, ref_id)
      values (c, split_part(k, '|', 1), split_part(k, '|', 2));
      raise exception 'FAIL accepted bad ref %', k;
    exception when check_violation then null;
    end;
  end loop;
  begin
    insert into public.study_collection_items (collection_id, kind, ref_id) values (c, 'church', 'x');
    raise exception 'FAIL accepted an unknown kind';
  exception when check_violation then null;
  end;

  -- Duplicates are refused.
  begin
    insert into public.study_collection_items (collection_id, kind, ref_id) values (c, 'person', 'paul');
    raise exception 'FAIL accepted a duplicate item';
  exception when unique_violation then null;
  end;

  -- Someone else's note cannot be referenced.
  begin
    insert into public.study_collection_items (collection_id, kind, ref_id) values (c, 'note', 'bbbbbbbb-0000-4000-8000-0000000000b1');
    raise exception 'FAIL referenced another account''s note';
  exception when foreign_key_violation then null;
  end;

  -- Over-long title / description.
  begin
    insert into public.study_collections (title) values (repeat('x', 121));
    raise exception 'FAIL accepted a 121-char title';
  exception when check_violation then null;
  end;
  begin
    insert into public.study_collections (title) values ('   ');
    raise exception 'FAIL accepted a blank title';
  exception when check_violation then null;
  end;
  begin
    insert into public.study_collections (title, description) values ('ok', repeat('x', 1001));
    raise exception 'FAIL accepted a 1001-char description';
  exception when check_violation then null;
  end;

  -- Rename works and bumps updated_at only via the trigger.
  update public.study_collections set title = 'Paul, renamed' where id = c;
  if (select title from public.study_collections where id = c) <> 'Paul, renamed' then
    raise exception 'FAIL rename did not apply';
  end if;

  -- Reorder: reverse it.
  n := public.reorder_study_collection_items(c,
         array(select id from public.study_collection_items where collection_id = c order by position desc));
  if n <> 9 then raise exception 'FAIL reorder touched % rows', n; end if;
  if (select ref_id from public.study_collection_items where collection_id = c order by position limit 1)
     <> 'aaaaaaaa-0000-4000-8000-0000000000a1' then
    raise exception 'FAIL reorder did not reverse';
  end if;
  raise notice 'PASS A creates, adds every kind, renames, reorders; bad refs, dupes, foreign notes, oversize refused';
end $$;

-- Isolation from B.
do $$
declare n int;
begin
  if exists (select 1 from public.study_collections where user_id <> auth.uid())
     or exists (select 1 from public.study_collection_items where user_id <> auth.uid()) then
    raise exception 'FAIL A can read another account''s rows';
  end if;
  -- An item claiming B's collection with A's (default) user_id: the composite FK refuses it.
  begin
    insert into public.study_collection_items (collection_id, kind, ref_id) values ('cccccccc-0000-4000-8000-0000000000b2', 'place', 'rome');
    raise exception 'FAIL A added to B''s collection';
  exception when foreign_key_violation then null;
  end;
  -- Naming user_id at all is not grantable.
  begin
    insert into public.study_collection_items (collection_id, user_id, kind, ref_id)
    values ('cccccccc-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000022', 'place', 'rome');
    raise exception 'FAIL A wrote user_id';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.study_collections set user_id = '00000000-0000-4000-8000-000000000022';
    raise exception 'FAIL A updated user_id';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.study_collection_items set collection_id = 'cccccccc-0000-4000-8000-0000000000b2';
    raise exception 'FAIL A updated collection_id';
  exception when insufficient_privilege then null;
  end;
  -- Updates / deletes / reorders aimed at B's rows touch nothing.
  update public.study_collections set title = 'pwned' where id = 'cccccccc-0000-4000-8000-0000000000b2';
  delete from public.study_collection_items where collection_id = 'cccccccc-0000-4000-8000-0000000000b2';
  delete from public.study_collections where id = 'cccccccc-0000-4000-8000-0000000000b2';
  n := public.reorder_study_collection_items('cccccccc-0000-4000-8000-0000000000b2',
         array(select id from public.study_collection_items));
  if n <> 0 then raise exception 'FAIL reorder of B''s collection touched % rows', n; end if;
  raise notice 'PASS A cannot see, join, move, rename, reorder or delete B''s rows';
end $$;
reset role;

do $$ begin
  if (select title from public.study_collections where id = 'cccccccc-0000-4000-8000-0000000000b2') <> 'B private'
     or (select count(*) from public.study_collection_items where collection_id = 'cccccccc-0000-4000-8000-0000000000b2') <> 1 then
    raise exception 'FAIL B''s rows changed';
  end if;
  raise notice 'PASS B''s rows intact';
end $$;

-- ------------------------------------------------ paywall ON: A has no entitlement
update public.app_settings set value = 'false'::jsonb where key = 'paid.everyone_has_plus';

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000021');
set local role authenticated;
do $$
declare
  c uuid;
  n int;
begin
  if public.has_entitlement('plus') then raise exception 'FAIL setup: A should not be entitled'; end if;
  select id into c from public.study_collections where title = 'Paul, renamed';
  if c is null then raise exception 'FAIL A lost read access to an existing collection without Plus'; end if;
  if (select count(*) from public.study_collection_items where collection_id = c) <> 9 then
    raise exception 'FAIL A lost read access to items without Plus';
  end if;

  begin
    insert into public.study_collections (title) values ('new without plus');
    raise exception 'FAIL created a collection without Plus';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.study_collection_items (collection_id, kind, ref_id) values (c, 'place', 'rome');
    raise exception 'FAIL added an item without Plus';
  exception when insufficient_privilege then null;
  end;
  update public.study_collections set title = 'renamed without plus' where id = c;
  if (select title from public.study_collections where id = c) <> 'Paul, renamed' then
    raise exception 'FAIL renamed without Plus';
  end if;
  n := public.reorder_study_collection_items(c, array(select id from public.study_collection_items where collection_id = c));
  if n <> 0 then raise exception 'FAIL reordered % rows without Plus', n; end if;

  -- Removing your own things never needs Plus.
  delete from public.study_collection_items where collection_id = c and kind = 'verse';
  get diagnostics n = row_count;
  if n <> 3 then raise exception 'FAIL could not remove own items without Plus (% removed)', n; end if;
  raise notice 'PASS without Plus: read and remove own rows, no create / add / rename / reorder';
end $$;
reset role;

-- Owner comps A: writes work again with the switch still off.
insert into public.entitlements (user_id, entitlement, source, expires_at, note)
values ('00000000-0000-4000-8000-000000000021', 'plus', 'comp', now() + interval '1 day', '046 test');

select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000021');
set local role authenticated;
do $$ begin
  insert into public.study_collections (title) values ('with a comp');
  raise notice 'PASS with an entitlement row A can create again';
end $$;
reset role;

-- The owner is always entitled but still cannot read A's private rows.
select pg_temp.become('authenticated', '00000000-0000-4000-8000-000000000023');
set local role authenticated;
do $$ begin
  if exists (select 1 from public.study_collections) or exists (select 1 from public.study_collection_items) then
    raise exception 'FAIL the owner can read other accounts'' collections';
  end if;
  insert into public.study_collections (title) values ('owner''s own');
  raise notice 'PASS the owner sees only their own collections';
end $$;
reset role;

-- ------------------------------------------------ caps
do $$
declare c uuid;
begin
  -- 100 collections per account (A already has 2: 'Paul, renamed' and 'with a comp').
  insert into public.study_collections (user_id, title)
  select '00000000-0000-4000-8000-000000000021', 'cap ' || g from generate_series(1, 98) g;
  begin
    insert into public.study_collections (user_id, title) values ('00000000-0000-4000-8000-000000000021', 'one too many');
    raise exception 'FAIL a 101st collection was accepted';
  exception when program_limit_exceeded then null;
  end;

  -- 500 items per collection.
  select id into c from public.study_collections where title = 'cap 1';
  insert into public.study_collection_items (collection_id, user_id, kind, ref_id, position)
  select c, '00000000-0000-4000-8000-000000000021', 'place', 'p-' || g, g from generate_series(1, 500) g;
  begin
    insert into public.study_collection_items (collection_id, user_id, kind, ref_id)
    values (c, '00000000-0000-4000-8000-000000000021', 'place', 'p-501');
    raise exception 'FAIL a 501st item was accepted';
  exception when program_limit_exceeded then null;
  end;
  raise notice 'PASS caps: 100 collections per account, 500 items per collection';
end $$;

-- ------------------------------------------------ account deletion cascades
do $$ begin
  delete from auth.users where id = '00000000-0000-4000-8000-000000000021';
  if exists (select 1 from public.study_collections where user_id = '00000000-0000-4000-8000-000000000021')
     or exists (select 1 from public.study_collection_items where user_id = '00000000-0000-4000-8000-000000000021') then
    raise exception 'FAIL deleting the account left collection rows behind';
  end if;
  if (select count(*) from public.study_collection_items where user_id = '00000000-0000-4000-8000-000000000022') <> 1 then
    raise exception 'FAIL deleting A touched B''s rows';
  end if;
  -- Deleting a collection takes its items with it.
  delete from public.study_collections where id = 'cccccccc-0000-4000-8000-0000000000b2';
  if exists (select 1 from public.study_collection_items where collection_id = 'cccccccc-0000-4000-8000-0000000000b2') then
    raise exception 'FAIL deleting a collection left its items';
  end if;
  raise notice 'PASS account deletion and collection deletion cascade';
end $$;

do $$ begin raise notice 'ALL 046 CHECKS PASSED'; end $$;

rollback;
