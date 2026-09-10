-- 029 — Foreign-key hygiene so deleting an account cannot be blocked by a finished game.
--
--   psql "$SUPABASE_DB_URL" -f sql/029_account_deletion_fk_hygiene.sql
--
-- ── WHAT IS WRONG TODAY ────────────────────────────────────────────────────────────────────────
-- Every reference to auth.users in this schema says what should happen when the account goes:
-- `on delete cascade` for rows the account owns, `on delete set null` for rows that merely point at
-- it (sql/019's analytics tables, sql/025's granted_by/resolved_by/assigned_to). Two do not:
--
--     game_rooms.winner_id          uuid references auth.users(id)      -- sql/001
--     saving_peter_rooms.winner_id  uuid references auth.users(id)      -- sql/011
--
-- A foreign key with no ON DELETE clause is NO ACTION, which is RESTRICT with a delay. So an account
-- that ever won a multiplayer room that still exists cannot be deleted at all: the delete raises
-- 23503 and the whole thing fails. Nobody hit it because nothing in this codebase could delete an
-- account until now — the capability needs the service_role key, which src/lib/adminApi.ts explains
-- was deliberately kept out of the client.
--
-- ── WHY THIS MIGRATION IS NOT WHAT MAKES DELETION WORK ─────────────────────────────────────────
-- The Edge Function (supabase/functions/delete-account/index.ts) already nulls both columns before
-- it touches auth.users, so in-app account deletion works with or without this file. What it does
-- NOT cover is every OTHER route to the same delete — the "Delete user" button in the Supabase
-- dashboard, a future admin tool, a support request run by hand in psql. Those go straight at
-- auth.users and hit the restrict.
--
-- So this is defence in depth on a constraint that is simply wrong, not a dependency of the feature.
-- Applying it changes no data: `winner_id` is already nullable in both tables, both are already
-- indexed by their primary key, and rewriting a foreign key does not touch a row.
--
-- ── WHY SET NULL AND NOT CASCADE ───────────────────────────────────────────────────────────────
-- Cascading would delete the ROOM because one of its players closed their account — taking the game
-- away from everybody else who was in it. The room is shared; only the name on the trophy belongs to
-- the person leaving. Null is what "this game was won by an account that no longer exists" looks
-- like, and it is the same answer sql/019 already gives for analytics: keep the history, drop the
-- attribution.

begin;

-- Dropped by DISCOVERY, not by guessed name. `drop constraint if exists game_rooms_winner_id_fkey`
-- looks right and fails silently if Postgres happened to name the constraint anything else — and a
-- silent failure here would leave the old NO ACTION key in place beside the new one, which is worse
-- than not running the migration at all: the restrict would still fire and the table would now carry
-- two foreign keys on the same column. So every foreign key on `winner_id` that points at auth.users
-- is found and dropped whatever it is called.
do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and a.attname = 'winner_id'
      and c.conrelid in ('game_rooms'::regclass, 'saving_peter_rooms'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end
$$;

alter table game_rooms
  add constraint game_rooms_winner_id_fkey
  foreign key (winner_id) references auth.users(id) on delete set null;

alter table saving_peter_rooms
  add constraint saving_peter_rooms_winner_id_fkey
  foreign key (winner_id) references auth.users(id) on delete set null;

commit;

-- Verification — both rows should read 'n' (SET NULL). Anything else, and this did not take:
--
--   select conrelid::regclass as tbl, conname, confdeltype
--   from pg_constraint
--   where conname in ('game_rooms_winner_id_fkey', 'saving_peter_rooms_winner_id_fkey');
--
-- confdeltype: 'a' = NO ACTION (the bug this fixes), 'n' = SET NULL (what this installs),
-- 'c' = CASCADE, 'r' = RESTRICT.
