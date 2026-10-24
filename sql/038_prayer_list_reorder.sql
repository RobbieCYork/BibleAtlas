-- 038_prayer_list_reorder.sql
--
-- Manual ordering for the Prayer List (sql/037), so a reader can move an item up or down to
-- prioritize it instead of always seeing newest-first.
--
-- NOT APPLIED. Committed only — needs Robbie's explicit word, same as every migration since 033.
--
-- ── THE BACKFILL CHANGES NO READER'S LIST ────────────────────────────────────────────────────────
-- `row_number() over (order by answered asc, created_at desc)` is the exact ordering
-- PrayerListView.tsx used before this column existed. Every existing row gets the sort_order that
-- reproduces its current position, so applying this migration alone moves nothing on screen —
-- only a later drag/tap does. Unanswered and answered items are numbered from the same sequence
-- (not restarted per group) on purpose: the app orders by (answered, sort_order) together, and two
-- independent sequences would tie on the group boundary the first time one group changed length.
--
-- ── WHY A PLAIN INTEGER, NOT FRACTIONAL RANKS ─────────────────────────────────────────────────────
-- A personal prayer list is a handful to a few dozen rows, never thousands, so there is no
-- reordering-performance case for the fractional/"lexorank" tricks that avoid renumbering — the
-- client renumbers the whole visible group on every move (0..n-1) and that is cheap at this size.
-- A plain integer is easier to read in a support query and cannot accumulate the floating-point
-- creep fractional ranks eventually need a rebalance for.
--
-- ── NO POLICY OR GRANT CHANGES ────────────────────────────────────────────────────────────────────
-- RLS on `prayer_items` is row-level (`auth.uid() = user_id`), not column-level, so a new column
-- needs no new policy. sql/037's `grant ... update on public.prayer_items to authenticated` already
-- covers every column of a row the policy lets the caller touch, this one included.

alter table public.prayer_items add column sort_order integer;

update public.prayer_items
set sort_order = ranked.rn
from (
  select id, row_number() over (order by answered asc, created_at desc) as rn
  from public.prayer_items
) as ranked
where public.prayer_items.id = ranked.id;

alter table public.prayer_items alter column sort_order set not null;
alter table public.prayer_items alter column sort_order set default 0;

-- Matches the query shape fetchEntries() actually runs: filtered to one user, ordered by
-- (answered, sort_order).
create index prayer_items_user_sort_idx on public.prayer_items using btree (user_id, answered, sort_order);
