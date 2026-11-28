-- ============================================================================
-- 056_groups_add_member_consent.sql — A GROUP CAN ONLY ADD YOUR FRIENDS, AND
--                                     NEVER ACROSS A BLOCK
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration.
--         Apply it BEFORE SOCIAL_CONNECTIONS_ENABLED (src/lib/features.ts) is
--         set back to true. Run it once, by hand:
--           psql "$SUPABASE_DB_URL" -f sql/056_groups_add_member_consent.sql
--         or paste it into the Supabase project's SQL Editor. One transaction;
--         safe to re-run (CREATE OR REPLACE + idempotent grants).
--
-- NUMBERING: 055 is report screenshots (055_report_screenshots.sql);
--            056 is the next free number.
--            Append-only — see sql/README.md.
-- ============================================================================
--
-- WHAT IS WRONG (read-only against production, 2026-11-28)
-- ----------------------------------------------------------------------------
-- Group membership has no insert policy; it is written only by SECURITY
-- DEFINER functions. Two of them add ANOTHER person with no consent check:
--
--   add_group_member(p_group_id, p_member_id)
--     checks only is_group_admin(p_group_id) — the caller is an admin of the
--     group. Nothing about p_member_id: not a friendship, not a block.
--   create_group(p_name, p_description, p_member_ids uuid[])
--     inserts every id in p_member_ids as a member. Checks only that the
--     caller is not a guest.
--
-- So any signed-in account can create a group (its name and description are
-- the caller's own text, up to 80 / 300 characters) and put any account in it
-- whose id it knows, including an account that has BLOCKED it. The victim can
-- leave; the caller can add them again, indefinitely. A block stops a friend
-- request (friend_requests_block_insert), a direct message
-- (messages_block_insert) and hides the blocked person's group messages from
-- the blocker (group_messages_block_filter) — but it does not stop this, and a
-- group's own name and description are not a reportable moderation target
-- (moderation_target_owner knows post, post_comment, note, note_comment,
-- message, group_message, profile). Ids are not secret: an invite link carries
-- the inviter's id, and find_user_id_by_email / find_user_by_contact return
-- one (the lookups refuse across a block, but an id learned before the block
-- keeps working here).
--
-- The app's own UI makes the no-consent add an everyday path, not just an API
-- trick: GroupsPanel's "Add member" box looks a stranger up by email or phone
-- and calls add_group_member on the result.
--
-- WHAT THIS DOES
-- ----------------------------------------------------------------------------
--   add_group_member: the caller must be a group admin (unchanged), a real
--     account (not a guest), and an accepted FRIEND of p_member_id, with no
--     block between them in either direction.
--   create_group: every id in p_member_ids must pass the same friend + no-block
--     test, checked BEFORE anything is inserted, so a bad list creates nothing.
--     Duplicates and the caller's own id are ignored, as before.
--   Both pin search_path (the rest of the unpinned group functions are
--   sql/034's job) and stop being EXECUTE-able by anon / PUBLIC.
--
-- People who are not your friends still join a group the consenting way that
-- already exists: an invite link or public-group search -> request_to_join_group
-- -> an admin approves (respond_to_join_request). Those two are unchanged.
--
-- WHAT IT DOES NOT CHANGE
-- ----------------------------------------------------------------------------
--   * No table, column, policy or row. Existing memberships stay exactly as
--     they are (production today: 1 group).
--   * Function signatures and return types are identical, so the app needs no
--     change to keep working. The ONE visible effect: "Add member" by email /
--     phone now fails for someone who is not your friend. The app branch that
--     switches Social back on changes that message to say so.
--
-- ROLLBACK
-- ----------------------------------------------------------------------------
--   The previous bodies are reproduced verbatim at the bottom of this file,
--   commented out. Running them restores the old (unsafe) behaviour.
-- ============================================================================

begin;

create or replace function public.add_group_member(p_group_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not public.is_group_admin(p_group_id) then
    raise exception 'Only group admins can add members' using errcode = '42501';
  end if;
  if p_member_id is null or p_member_id = v_me then
    raise exception 'member_invalid: no account was named' using errcode = '22023';
  end if;
  if public.is_blocked_between(v_me, p_member_id) or not public.is_friend(p_member_id) then
    raise exception 'not_friend: you can only add your friends to a group; others can join with an invite link'
      using errcode = '42501';
  end if;
  insert into public.group_members (group_id, user_id, role) values (p_group_id, p_member_id, 'member')
  on conflict do nothing;
end;
$function$;

create or replace function public.create_group(p_name text, p_description text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_me uuid := auth.uid();
  new_group_id uuid;
  mid uuid;
begin
  if v_me is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Guests cannot create groups' using errcode = '42501';
  end if;

  -- Validate the whole list first: a list with one non-friend creates nothing.
  foreach mid in array coalesce(p_member_ids, '{}'::uuid[]) loop
    if mid is not null and mid <> v_me
       and (public.is_blocked_between(v_me, mid) or not public.is_friend(mid)) then
      raise exception 'not_friend: you can only add your friends to a group; others can join with an invite link'
        using errcode = '42501';
    end if;
  end loop;

  insert into public.groups (name, description, created_by)
  values (p_name, nullif(trim(p_description), ''), v_me)
  returning id into new_group_id;
  insert into public.group_members (group_id, user_id, role) values (new_group_id, v_me, 'owner');
  foreach mid in array coalesce(p_member_ids, '{}'::uuid[]) loop
    if mid is not null and mid <> v_me then
      insert into public.group_members (group_id, user_id, role) values (new_group_id, mid, 'member')
      on conflict do nothing;
    end if;
  end loop;
  return new_group_id;
end;
$function$;

revoke execute on function public.add_group_member(uuid, uuid) from public, anon;
revoke execute on function public.create_group(text, text, uuid[]) from public, anon;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;
grant execute on function public.create_group(text, text, uuid[]) to authenticated;

commit;

-- ============================================================================
-- VERIFY (read-only, after applying)
-- ----------------------------------------------------------------------------
--   select proname, array_to_string(proconfig, ','),
--          has_function_privilege('anon', oid, 'EXECUTE') as anon_x,
--          has_function_privilege('authenticated', oid, 'EXECUTE') as auth_x,
--          pg_get_functiondef(oid) like '%is_friend%' as checks_friend
--   from pg_proc
--   where pronamespace = 'public'::regnamespace
--     and proname in ('add_group_member', 'create_group');
--   -- expect: search_path=public, pg_temp | false | true | true  (both rows)
-- ============================================================================

-- ============================================================================
-- ROLLBACK — the production bodies as read on 2026-11-28 (do not run unless
-- deliberately restoring the old behaviour):
--
-- create or replace function public.add_group_member(p_group_id uuid, p_member_id uuid)
--  returns void language plpgsql security definer as $function$
-- begin
--   if not public.is_group_admin(p_group_id) then
--     raise exception 'Only group admins can add members';
--   end if;
--   insert into public.group_members (group_id, user_id, role) values (p_group_id, p_member_id, 'member')
--   on conflict do nothing;
-- end;
-- $function$;
--
-- create or replace function public.create_group(p_name text, p_description text, p_member_ids uuid[])
--  returns uuid language plpgsql security definer as $function$
-- declare
--   new_group_id uuid;
--   mid uuid;
-- begin
--   if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
--     raise exception 'Guests cannot create groups';
--   end if;
--   insert into public.groups (name, description, created_by)
--   values (p_name, nullif(trim(p_description), ''), auth.uid())
--   returning id into new_group_id;
--   insert into public.group_members (group_id, user_id, role) values (new_group_id, auth.uid(), 'owner');
--   foreach mid in array p_member_ids loop
--     if mid <> auth.uid() then
--       insert into public.group_members (group_id, user_id, role) values (new_group_id, mid, 'member')
--       on conflict do nothing;
--     end if;
--   end loop;
--   return new_group_id;
-- end;
-- $function$;
--
-- grant execute on function public.add_group_member(uuid, uuid) to public, anon;
-- grant execute on function public.create_group(text, text, uuid[]) to public, anon;
-- ============================================================================
