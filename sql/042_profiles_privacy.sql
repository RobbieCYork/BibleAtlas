-- ============================================================================
-- 042_profiles_privacy.sql — PROFILES ARE OWNER-ONLY; OTHERS GET A MASKED CARD
--
-- STATUS: WRITTEN AND COMMITTED. **NOT APPLIED TO PRODUCTION.**
--         Applying it needs Robbie's explicit word, same as every migration
--         since 033. Not auto-applied by anything in this repo — run it once,
--         by hand, AFTER the app change on branch `profiles-privacy-fix` is
--         live (see DEPLOY ORDER below):
--           psql "$SUPABASE_DB_URL" -f sql/042_profiles_privacy.sql
--         or paste it into the Supabase project's SQL Editor.
--
-- NUMBERING: 041 is the last written; 042 is the next free number.
--            Append-only — see sql/README.md.
-- ============================================================================
--
-- WHAT WAS WRONG (verified read-only against production, 2026-11-09)
-- ----------------------------------------------------------------------------
-- 1. profiles: the only permissive SELECT policy was
--      profiles_select_own_or_related
--        auth.uid() = id
--        OR EXISTS (friend_requests in EITHER direction, ANY status)
--    RLS is row-level, so "related" meant the WHOLE row: email, phone,
--    birthday, relationship status, location, work, education, and every
--    field the owner had switched to private in profile_visibility. The
--    toggles were honoured only by FriendProfileView's rendering; every
--    caller fetched select("*").
--    Anyone signed in can INSERT a friend request to anyone
--    (friend_requests_insert_own only checks sender_id = auth.uid()), and a
--    pending request was enough. So: any signed-in account could read any
--    other account's private profile fields by sending it a friend request.
--
-- 2. friend_requests itself let "accepted" be forged, which matters because
--    accepted is what this file — and messages_insert_friends_only — trust:
--      * INSERT did not constrain status, so a sender could insert
--        status = 'accepted' and be "friends" with anyone, no consent.
--      * UPDATE was granted on every column to the receiver, whose WITH CHECK
--        is only auth.uid() = receiver_id, so a receiver could rewrite
--        sender_id to anyone and set status = 'accepted'.
--    Production had 6 rows, all accepted, all with responded_at set (the
--    app's accept path sets it) — no sign either was used.
--
-- 3. find_user_id_by_email(text) and find_user_by_contact(text) were
--    EXECUTE-able by anon (and PUBLIC), so anyone holding the public anon key
--    could test whether an email or phone number has an account. A guest
--    ("Continue as Guest") session is role `authenticated`, so revoking anon
--    alone would leave the same hole one signInAnonymously() call away; the
--    functions now also answer NULL to anonymous sessions. Neither is called
--    from any signed-out or guest screen (only FriendsPanel, GroupsPanel and
--    ChurchPanel, all real-account-only). is_display_name_available() IS
--    called signed-out by sign-up and is deliberately left alone.
--
-- WHAT THIS DOES
-- ----------------------------------------------------------------------------
--   A. my_relation_to(target)  — 'self' | 'friend' | 'pending' | 'declined'
--      | NULL, for the CALLER only (no viewer argument, so it cannot be used
--      to ask about two other people). NULL if blocked either way or the
--      profile does not exist.
--   B. get_profile_cards(ids uuid[]) — the one way to read someone else's
--      profile. Same column names and types as profiles, masked per row:
--        self      everything
--        friend    id, display_name, avatar_url, email, church,
--                  church_website, favorite_verse, bio, created_at,
--                  profile_visibility; phone and the 15 "About me" fields
--                  ONLY where profile_visibility->>key is true;
--                  chapter_read_reset and discoverable_by_name never
--        pending   id, display_name, avatar_url — nothing else
--        declined / stranger / blocked   no row at all
--      Email stays visible to accepted friends because 50 of 71 accounts
--      have no display name yet and email is what their friends see them as
--      (displayFor()). It is never shown to a pending requester.
--   C. profiles SELECT becomes owner-only. profiles_block_filter (restrictive)
--      is untouched.
--   D. moderation_target_owner()'s 'profile' branch asked "can the caller see
--      this profiles row" — which C turns into "is it you". It now asks
--      my_relation_to() instead: any relation, not blocked, exactly the set
--      the old row policy allowed. Every other branch is byte-for-byte the
--      live definition. Reporting a friend or a pending requester keeps
--      working.
--   E. friend_requests: a restrictive INSERT policy pins new rows to
--      status = 'pending' with no responded_at; UPDATE is narrowed to the two
--      columns the app writes (status, responded_at) — the sql/024 `messages`
--      precedent. sender_id/receiver_id can no longer be rewritten.
--   F. find_user_id_by_email / find_user_by_contact: anonymous sessions get
--      NULL; EXECUTE revoked from PUBLIC and anon, granted to authenticated;
--      search_path pinned (sql/034 would pin the same value later; harmless).
--
-- NOTHING IS WIDENED. Every change removes access or keeps it equal. The new
-- functions are revoked from PUBLIC/anon and granted to authenticated only
-- (sql/035, sql/039, sql/041 pattern).
--
-- DEPLOY ORDER (users must never see a broken screen)
-- ----------------------------------------------------------------------------
--   1. Ship the app change (branch profiles-privacy-fix). Its fetchProfileCards()
--      calls get_profile_cards and, while that function does not exist yet
--      (PostgREST PGRST202), falls back to the old profiles select("*"). So
--      it works before AND after this file.
--   2. Apply this file.
--   3. Tighten the Privacy Policy wording (src/data/legalDocuments.ts §4).
--   Applying this file BEFORE step 1 would blank friend names, request
--   names and friend profiles for anyone on the old bundle until they reload
--   onto the new one. Not data loss, but do it in this order.
--
-- ROLLBACK (restores the old, leaky behaviour exactly)
-- ----------------------------------------------------------------------------
--   drop policy if exists "profiles_select_own" on public.profiles;
--   create policy "profiles_select_own_or_related" on public.profiles for select
--     using ((auth.uid() = id) or exists (select 1 from friend_requests fr
--       where (fr.sender_id = auth.uid() and fr.receiver_id = profiles.id)
--          or (fr.receiver_id = auth.uid() and fr.sender_id = profiles.id)));
--   drop policy if exists "friend_requests_insert_pending_only" on public.friend_requests;
--   grant update on public.friend_requests to anon, authenticated;
--   grant execute on function public.find_user_id_by_email(text), public.find_user_by_contact(text) to anon;
--   (moderation_target_owner: re-run its definition from sql/028.)
--
-- IDEMPOTENT: create or replace; drop policy if exists then create;
-- revoke/grant are naturally repeatable. Safe to run twice.
-- ============================================================================

begin;

-- ---------------------------------------------------------------- A
create or replace function public.my_relation_to(p_target uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null or p_target is null then null
    when not exists (select 1 from public.profiles where id = p_target) then null
    when public.is_blocked_between(auth.uid(), p_target) then null
    when p_target = auth.uid() then 'self'
    else (
      select case
               when bool_or(fr.status = 'accepted') then 'friend'
               when bool_or(fr.status = 'pending')  then 'pending'
               when bool_or(fr.status = 'declined') then 'declined'
             end
      from public.friend_requests fr
      where (fr.sender_id = auth.uid() and fr.receiver_id = p_target)
         or (fr.receiver_id = auth.uid() and fr.sender_id = p_target)
    )
  end;
$$;

comment on function public.my_relation_to(uuid) is
  'The CALLER''s relationship to one profile: self | friend | pending | declined | NULL (none, blocked, or no such profile). No viewer argument on purpose. See sql/042.';

revoke all on function public.my_relation_to(uuid) from public, anon;
grant execute on function public.my_relation_to(uuid) to authenticated;

-- ---------------------------------------------------------------- B
create or replace function public.get_profile_cards(p_ids uuid[])
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  phone text,
  display_name text,
  avatar_url text,
  church text,
  favorite_verse text,
  bio text,
  chapter_read_reset text,
  location text,
  birthday date,
  relationship_status text,
  hobbies text,
  work_experience text,
  education text,
  favorite_band text,
  favorite_song text,
  favorite_tv_shows text,
  favorite_movies text,
  favorite_team_football text,
  favorite_team_basketball text,
  favorite_team_baseball text,
  favorite_team_hockey text,
  favorite_team_soccer text,
  profile_visibility jsonb,
  discoverable_by_name boolean,
  church_website text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with r as (
    select p.*, public.my_relation_to(p.id) as rel
    from public.profiles p
    where p.id = any (p_ids)
  ), v as (
    select r.*,
           (r.rel = 'self') as is_self,
           (r.rel in ('self', 'friend')) as is_close
    from r
    where r.rel in ('self', 'friend', 'pending')
  )
  select
    v.id,
    case when v.is_close then v.email end,
    case when v.is_close then v.created_at end,
    case when v.is_self or (v.is_close and v.profile_visibility->'phone' = 'true'::jsonb) then v.phone end,
    v.display_name,
    v.avatar_url,
    case when v.is_close then v.church end,
    case when v.is_close then v.favorite_verse end,
    case when v.is_close then v.bio end,
    case when v.is_self then v.chapter_read_reset end,
    case when v.is_self or (v.is_close and v.profile_visibility->'location' = 'true'::jsonb) then v.location end,
    case when v.is_self or (v.is_close and v.profile_visibility->'birthday' = 'true'::jsonb) then v.birthday end,
    case when v.is_self or (v.is_close and v.profile_visibility->'relationship_status' = 'true'::jsonb) then v.relationship_status end,
    case when v.is_self or (v.is_close and v.profile_visibility->'hobbies' = 'true'::jsonb) then v.hobbies end,
    case when v.is_self or (v.is_close and v.profile_visibility->'work_experience' = 'true'::jsonb) then v.work_experience end,
    case when v.is_self or (v.is_close and v.profile_visibility->'education' = 'true'::jsonb) then v.education end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_band' = 'true'::jsonb) then v.favorite_band end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_song' = 'true'::jsonb) then v.favorite_song end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_tv_shows' = 'true'::jsonb) then v.favorite_tv_shows end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_movies' = 'true'::jsonb) then v.favorite_movies end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_team_football' = 'true'::jsonb) then v.favorite_team_football end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_team_basketball' = 'true'::jsonb) then v.favorite_team_basketball end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_team_baseball' = 'true'::jsonb) then v.favorite_team_baseball end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_team_hockey' = 'true'::jsonb) then v.favorite_team_hockey end,
    case when v.is_self or (v.is_close and v.profile_visibility->'favorite_team_soccer' = 'true'::jsonb) then v.favorite_team_soccer end,
    case when v.is_close then v.profile_visibility end,
    case when v.is_self then v.discoverable_by_name end,
    case when v.is_close then v.church_website end
  from v;
$$;

comment on function public.get_profile_cards(uuid[]) is
  'The only way to read someone else''s profile. Owner: full row. Accepted friend: public fields + whatever profile_visibility allows. Pending request (either direction): id, display_name, avatar_url. Anyone else, or blocked: no row. See sql/042.';

revoke all on function public.get_profile_cards(uuid[]) from public, anon;
grant execute on function public.get_profile_cards(uuid[]) to authenticated;

-- ---------------------------------------------------------------- C
drop policy if exists "profiles_select_own_or_related" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  as permissive for select
  using (auth.uid() = id);

-- ---------------------------------------------------------------- D
-- Identical to the live definition (sql/028) except the 'profile' branch.
create or replace function public.moderation_target_owner(p_target_kind text, p_target_id uuid)
returns uuid
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_owner uuid;
begin
  if p_target_id is null then
    return null;
  end if;
  case p_target_kind
    when 'post'          then select p.user_id   into v_owner from posts p          where p.id = p_target_id;
    when 'post_comment'  then select c.author_id into v_owner from post_comments c   where c.id = p_target_id;
    when 'note'          then select n.user_id   into v_owner from notes n           where n.id = p_target_id;
    when 'note_comment'  then select c.author_id into v_owner from note_comments c   where c.id = p_target_id;
    when 'message'       then select m.sender_id into v_owner from messages m        where m.id = p_target_id;
    when 'group_message' then select m.sender_id into v_owner from group_messages m  where m.id = p_target_id;
    when 'profile'       then
      -- profiles is owner-only since sql/042; "can you see it" is now "are you related".
      if public.my_relation_to(p_target_id) is not null then
        v_owner := p_target_id;
      end if;
    else return null;
  end case;
  return v_owner;
end;
$function$;

-- ---------------------------------------------------------------- E
drop policy if exists "friend_requests_insert_pending_only" on public.friend_requests;
create policy "friend_requests_insert_pending_only" on public.friend_requests
  as restrictive for insert
  with check (status = 'pending' and responded_at is null);

revoke update on public.friend_requests from anon, authenticated;
grant update (status, responded_at) on public.friend_requests to authenticated;

-- ---------------------------------------------------------------- F
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.profiles
  where email = lower(lookup_email)
    and auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and not public.is_blocked_between(auth.uid(), id)
  limit 1;
$$;

create or replace function public.find_user_by_contact(query text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.profiles
  where (email = lower(query) or (phone is not null and phone = query))
    and auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and not public.is_blocked_between(auth.uid(), id)
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public, anon;
revoke all on function public.find_user_by_contact(text)  from public, anon;
grant execute on function public.find_user_id_by_email(text) to authenticated;
grant execute on function public.find_user_by_contact(text)  to authenticated;

commit;

-- ============================================================================
-- VERIFY (read-only) after applying:
--   select policyname, permissive, qual from pg_policies
--    where schemaname = 'public' and tablename = 'profiles';
--     -> profiles_block_filter (RESTRICTIVE), profiles_select_own (auth.uid() = id),
--        profiles_update_own. No profiles_select_own_or_related.
--   select p.oid::regprocedure, p.proacl, p.proconfig from pg_proc p
--    where p.proname in ('find_user_id_by_email','find_user_by_contact',
--                        'get_profile_cards','my_relation_to');
--     -> no anon=X and no bare =X (PUBLIC) in proacl; search_path pinned.
--   select column_name from information_schema.column_privileges
--    where table_name = 'friend_requests' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE';
--     -> responded_at, status
-- ============================================================================
