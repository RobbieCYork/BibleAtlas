-- ============================================================================
-- Public/private groups + "Search Groups" — mirrors sql/010_find_by_name.sql's
-- discoverable-by-name pattern, but for groups instead of profiles. A public
-- group can be found by name via find_public_groups_by_name() and joined the
-- same way an invite link already works (request_to_join_group(), which
-- doesn't care how the caller learned the group's id — no changes needed
-- there). Private (the default) groups stay invite-link-only, same as today.
--
-- Note: groups/group_members/group_join_requests/group_messages predate this
-- repo's tracked sql/ migrations (created directly via the Supabase SQL
-- editor) — this file only adds to that existing schema, it doesn't recreate
-- it from scratch.
--   psql "$SUPABASE_DB_URL" -f sql/014_groups_public_search.sql
-- ============================================================================

alter table groups
  add column if not exists is_public boolean not null default false;

-- Recreated (not create-or-replace) because the return shape is changing —
-- Postgres won't let a plain CREATE OR REPLACE add a column to an existing
-- function's RETURNS TABLE.
drop function if exists list_my_groups();

create function list_my_groups()
returns table (
  group_id uuid,
  name text,
  description text,
  is_public boolean,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count integer,
  my_role text
)
language sql
stable
security definer
as $$
  select
    g.id,
    g.name,
    g.description,
    g.is_public,
    lm.body,
    lm.created_at,
    lm.sender_id,
    coalesce((
      select count(*)::integer from group_messages m2
      where m2.group_id = g.id
        and m2.sender_id <> auth.uid()
        and m2.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    ), 0),
    gm.role
  from groups g
  join group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  left join group_message_reads r on r.group_id = g.id and r.user_id = auth.uid()
  left join lateral (
    select body, created_at, sender_id from group_messages m
    where m.group_id = g.id
    order by created_at desc
    limit 1
  ) lm on true;
$$;

grant execute on function list_my_groups() to authenticated;

-- Public groups the caller isn't already in, matching by name — same shape of query as
-- find_users_by_display_name(), just for groups. member_count is informational (shown in the search
-- results row) so a searcher can tell a group's actually active before requesting to join.
create or replace function find_public_groups_by_name(query text)
returns table (id uuid, name text, description text, member_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.description,
    (select count(*)::integer from group_members gm where gm.group_id = g.id)
  from groups g
  where g.is_public = true
    and g.name ilike '%' || query || '%'
    and not exists (select 1 from group_members gm2 where gm2.group_id = g.id and gm2.user_id = auth.uid())
  order by g.name
  limit 20;
$$;

grant execute on function find_public_groups_by_name(text) to authenticated;
