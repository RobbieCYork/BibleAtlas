-- ============================================================================
-- 046_study_collections.sql — CAPSTONE PLUS: STUDY COLLECTIONS
--
-- STATUS: WRITTEN AND COMMITTED ON BRANCH `plus-study-collections` (cut from
--         `paid-payments`). **NOT APPLIED ANYWHERE.** Applying it to production
--         needs Robbie's explicit word, like every migration since 033.
--         Rehearse on staging first. Local proof:
--             node scripts/study-collections/rls-test.mjs --local
--
-- NUMBERING: 044 (admin invites) and 045 (Stripe billing) are taken
--            (sql/README.md). 046 is the next free number.
--
-- DEPENDS ON:
--   025 — has_role_at_least(), app_settings, app_setting_bool()   (applied)
--   043 — has_entitlement('plus')                                  (NOT applied)
--   the live `notes` table (sql/000_baseline.sql) — read by the item trigger
-- Apply 043 first. Does NOT depend on 045: has_entitlement() is defined in 043
-- and 045 only adds another way to earn a row in `entitlements`.
-- ============================================================================
--
-- WHAT THIS IS
-- ----------------------------------------------------------------------------
-- A Study Collection is a reader's own named, ordered list of things from
-- around the app: places and sites on the map, people, topics, timeline
-- events, Bible verse references, and the reader's own verse notes. Item
-- references are (kind, ref_id):
--     place / site / person / topic / event  ref_id = the record's own `id`
--                                            from src/data/*.ts — the same
--                                            permanent id as the public URL
--                                            and as article_reads (sql/041)
--     verse                                  ref_id = "Book C" or "Book C:V"
--                                            or "Book C:V-W" (e.g. "John 3:16")
--     note                                   ref_id = public.notes.id (uuid) of
--                                            a note THIS reader owns
-- The record ids live in TypeScript, not in the database, so only their SHAPE
-- is checked here. A note reference is checked for ownership by a trigger.
--
-- TIERING (paid-tier plan; Robbie approved Study Collections as Plus)
-- ----------------------------------------------------------------------------
--   * CREATING or CHANGING anything (insert, update, reorder) needs
--     has_entitlement('plus'). While app_settings 'paid.everyone_has_plus' is
--     true (sql/043 ships it true) that is every signed-in account.
--   * READING and DELETING your own collections never needs Plus. A reader
--     whose subscription lapses keeps seeing what they built and can remove
--     it; we do not hold someone's own study notes hostage. (Same principle as
--     the free notes backup in plus-split-proposal.md.)
--   * Nobody can read anyone else's rows. There is no sharing in this file.
--     A read-only share link is deliberately phase 2 (see the bottom).
--
-- SECURITY SHAPE (same rules as sql/041, sql/043)
-- ----------------------------------------------------------------------------
--   * RLS on both tables. REVOKE ALL from anon, authenticated and PUBLIC first
--     (Supabase's default ACL grants new tables full CRUD to both client
--     roles — sql/README.md), then grant back only what a policy uses, with
--     COLUMN-level insert/update grants so a client can never write user_id,
--     id or a timestamp directly.
--   * user_id defaults to auth.uid(). The policies also require it.
--   * Items carry user_id too and reference (collection_id, user_id) as a
--     composite foreign key, so an item can only ever sit in a collection
--     owned by the same account. No policy needs a subquery on the other
--     table (and no 42P17 recursion is possible).
--   * Caps, to stop abuse: 100 collections per account, 500 items per
--     collection, title <= 120 chars, description <= 1000. Enforced by
--     BEFORE INSERT triggers that take a transaction-scoped advisory lock, so
--     two concurrent inserts cannot both slip under the cap.
--   * Every function: `set search_path = public, pg_temp`, EXECUTE revoked
--     from PUBLIC and anon. The trigger functions are SECURITY DEFINER (they
--     count rows and read `notes`); the reorder RPC is SECURITY INVOKER so the
--     table policies apply to it unchanged.
--   * Policies wrap the entitlement as `(select public.has_entitlement('plus'))`
--     so it is evaluated once per statement.
--
-- ACCOUNT DELETION
-- ----------------------------------------------------------------------------
-- Both tables reference auth.users(id) ON DELETE CASCADE, and items also
-- cascade from their collection. Deleting a user (the delete-account Edge
-- Function, or the dashboard's Delete User) removes everything here with no
-- extra step — the sql/029 rule: no NO ACTION foreign key to auth.users.
-- The test file proves it.
--
-- IDEMPOTENT: create ... if not exists; policies dropped-if-exist then created;
-- create or replace function; triggers dropped-if-exist then created;
-- grants/revokes repeat cleanly. Safe to run twice.
--
-- REVERSAL (destroys every collection):
--   drop table public.study_collection_items, public.study_collections;
--   drop function public.study_collections_before_insert(),
--                 public.study_collection_items_before_insert(),
--                 public.study_collections_touch(),
--                 public.reorder_study_collection_items(uuid, uuid[]);
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- study_collections — one row per named collection.
-- ----------------------------------------------------------------------------
create table if not exists public.study_collections (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  title       text        not null check (char_length(btrim(title)) between 1 and 120),
  description text        check (description is null or char_length(description) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Target of the items' composite foreign key.
  constraint study_collections_id_user_key unique (id, user_id)
);

create index if not exists study_collections_user_idx on public.study_collections (user_id, created_at);

alter table public.study_collections enable row level security;
revoke all on public.study_collections from anon, authenticated, public;

drop policy if exists study_collections_select_own on public.study_collections;
create policy study_collections_select_own on public.study_collections
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists study_collections_insert_plus on public.study_collections;
create policy study_collections_insert_plus on public.study_collections
  as permissive for insert to authenticated
  with check (user_id = auth.uid() and (select public.has_entitlement('plus')));

drop policy if exists study_collections_update_plus on public.study_collections;
create policy study_collections_update_plus on public.study_collections
  as permissive for update to authenticated
  using (user_id = auth.uid() and (select public.has_entitlement('plus')))
  with check (user_id = auth.uid() and (select public.has_entitlement('plus')));

-- Deleting your own collection never needs Plus.
drop policy if exists study_collections_delete_own on public.study_collections;
create policy study_collections_delete_own on public.study_collections
  as permissive for delete to authenticated
  using (user_id = auth.uid());

grant select, delete on public.study_collections to authenticated;
grant insert (title, description) on public.study_collections to authenticated;
grant update (title, description) on public.study_collections to authenticated;


-- ----------------------------------------------------------------------------
-- study_collection_items — the ordered contents of a collection.
-- ----------------------------------------------------------------------------
create table if not exists public.study_collection_items (
  id            uuid        primary key default gen_random_uuid(),
  collection_id uuid        not null,
  user_id       uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  kind          text        not null check (kind in ('place', 'site', 'person', 'topic', 'event', 'verse', 'note')),
  ref_id        text        not null check (char_length(ref_id) between 1 and 200),
  position      integer     not null default 0 check (position between 0 and 100000),
  added_at      timestamptz not null default now(),
  constraint study_collection_items_ref_shape check (
    case kind
      when 'verse' then ref_id ~ '^[1-3]? ?[A-Za-z][A-Za-z ]{0,40} [0-9]{1,3}(:[0-9]{1,3}(-[0-9]{1,3})?)?$'
      when 'note'  then ref_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      else              ref_id ~ '^[a-z0-9][a-z0-9_-]{0,199}$'
    end
  ),
  constraint study_collection_items_collection_fkey
    foreign key (collection_id, user_id)
    references public.study_collections (id, user_id) on delete cascade,
  constraint study_collection_items_unique_ref unique (collection_id, kind, ref_id)
);

create index if not exists study_collection_items_order_idx on public.study_collection_items (collection_id, position);
create index if not exists study_collection_items_user_idx on public.study_collection_items (user_id);

alter table public.study_collection_items enable row level security;
revoke all on public.study_collection_items from anon, authenticated, public;

drop policy if exists study_collection_items_select_own on public.study_collection_items;
create policy study_collection_items_select_own on public.study_collection_items
  as permissive for select to authenticated
  using (user_id = auth.uid());

drop policy if exists study_collection_items_insert_plus on public.study_collection_items;
create policy study_collection_items_insert_plus on public.study_collection_items
  as permissive for insert to authenticated
  with check (user_id = auth.uid() and (select public.has_entitlement('plus')));

drop policy if exists study_collection_items_update_plus on public.study_collection_items;
create policy study_collection_items_update_plus on public.study_collection_items
  as permissive for update to authenticated
  using (user_id = auth.uid() and (select public.has_entitlement('plus')))
  with check (user_id = auth.uid() and (select public.has_entitlement('plus')));

drop policy if exists study_collection_items_delete_own on public.study_collection_items;
create policy study_collection_items_delete_own on public.study_collection_items
  as permissive for delete to authenticated
  using (user_id = auth.uid());

grant select, delete on public.study_collection_items to authenticated;
grant insert (collection_id, kind, ref_id, position) on public.study_collection_items to authenticated;
grant update (position) on public.study_collection_items to authenticated;


-- ----------------------------------------------------------------------------
-- Caps and checks. SECURITY DEFINER so the count sees every row of the
-- account regardless of who is asking, and so `notes` can be read.
-- ----------------------------------------------------------------------------
create or replace function public.study_collections_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is null then
    raise exception 'user required' using errcode = '23502';
  end if;
  new.title := btrim(new.title);
  perform pg_advisory_xact_lock(hashtextextended('study_collections:' || new.user_id::text, 0));
  if (select count(*) from public.study_collections c where c.user_id = new.user_id) >= 100 then
    raise exception 'study collection limit reached (100 per account)' using errcode = '54000';
  end if;
  return new;
end;
$$;

create or replace function public.study_collection_items_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('study_collection_items:' || new.collection_id::text, 0));
  if (select count(*) from public.study_collection_items i where i.collection_id = new.collection_id) >= 500 then
    raise exception 'study collection item limit reached (500 per collection)' using errcode = '54000';
  end if;
  -- A note reference must be a note this same account owns. (A malformed id is
  -- left for the CHECK constraint, which runs after BEFORE triggers.)
  if new.kind = 'note'
     and new.ref_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and not exists (select 1 from public.notes n where n.id = new.ref_id::uuid and n.user_id = new.user_id) then
    raise exception 'note not found' using errcode = '23503';
  end if;
  return new;
end;
$$;

create or replace function public.study_collections_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.title := btrim(new.title);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists study_collections_before_insert on public.study_collections;
create trigger study_collections_before_insert
  before insert on public.study_collections
  for each row execute function public.study_collections_before_insert();

drop trigger if exists study_collections_touch on public.study_collections;
create trigger study_collections_touch
  before update on public.study_collections
  for each row execute function public.study_collections_touch();

drop trigger if exists study_collection_items_before_insert on public.study_collection_items;
create trigger study_collection_items_before_insert
  before insert on public.study_collection_items
  for each row execute function public.study_collection_items_before_insert();

-- Trigger functions are never called directly.
revoke all on function public.study_collections_before_insert() from public, anon, authenticated;
revoke all on function public.study_collection_items_before_insert() from public, anon, authenticated;
revoke all on function public.study_collections_touch() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- reorder_study_collection_items(collection, ids in order) — one statement
-- instead of one PATCH per item. SECURITY INVOKER: the update policy above
-- (own rows, Plus) applies exactly as it does to a plain UPDATE. Ids that are
-- not in that collection, or not the caller's, are silently not touched.
-- Returns the number of rows renumbered.
-- ----------------------------------------------------------------------------
create or replace function public.reorder_study_collection_items(p_collection_id uuid, p_item_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  if p_item_ids is null or cardinality(p_item_ids) > 500 then
    raise exception 'between 0 and 500 ids' using errcode = '22023';
  end if;
  update public.study_collection_items i
     set position = o.ord - 1
    from unnest(p_item_ids) with ordinality as o(item_id, ord)
   where i.id = o.item_id
     and i.collection_id = p_collection_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.reorder_study_collection_items(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_study_collection_items(uuid, uuid[]) to authenticated;

commit;

-- ============================================================================
-- PHASE 2, NOT IN THIS FILE: a read-only share link.
-- The safe shape, when it is wanted: a `share_token` (random, 128-bit,
-- nullable, OFF by default) on study_collections plus a SECURITY DEFINER
-- `get_shared_collection(token)` that returns title, description and ONLY the
-- public kinds (place, site, person, topic, event, verse) — never `note`
-- items, which point at private notes — and no user id. No table policy would
-- change. Not built now because it widens who can read a row, and that is a
-- decision for Robbie, not a side effect of this feature.
-- ============================================================================
