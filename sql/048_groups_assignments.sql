-- ============================================================================
-- 048_groups_assignments.sql — CAPSTONE PLUS FOR GROUPS, PHASE 4:
--                              ASSIGNMENTS + GRADING MVP
--
-- STATUS: WRITTEN AND COMMITTED ON BRANCH `groups-assignments`. **NOT APPLIED ANYWHERE.**
--         Applying it needs Robbie's explicit word, after 033, 043, 045 and 047.
--         Rehearse on staging first. Local rehearsal (no account needed):
--           node scripts/groups/assignments-rls-test.mjs --local
--           node scripts/groups/assignments-rls-test.mjs --local --mutations
--
-- NUMBERING: 047 (groups foundations) is the last number taken (sql/README.md).
--
-- DEPENDS ON: 025 (has_role_at_least, app_setting_bool), 033 (churches),
--   043 (entitlements), 045, 047 (classes, class_staff, class_members,
--   is_class_staff / is_class_owner / is_class_member, class_end_ts), and the
--   live `profiles` table (display names in the gradebook).
--
-- PLAN: automation/manager/groups-feature-plan.md §1 D-F, §9, phase 4.
--   No invites/reminders (phase 3), no badge, no reviews, no rubric, no
--   resubmission, no select-all multiple choice, no matching (phase 9).
-- ============================================================================
--
-- WHAT THIS ADDS
-- ----------------------------------------------------------------------------
--   assignments                 per class: title, instructions, due_at, late
--                               policy, release policy, draft/published
--   assignment_readings         typed references (bible/place/site/person/
--                               topic/event) the app opens with ?open=kind:ref
--   assignment_questions        mc | tf | short | essay, points, options.
--                               NEVER the answer.
--   assignment_question_keys    the answers. NO client grant. Read only inside
--                               SECURITY DEFINER functions (staff RPCs and the
--                               grader).
--   assignment_submissions      one per student per assignment (single attempt)
--   assignment_answers          the student's answers + auto / manual points
--   assignment_grade_events     regrade audit: every score change, who, why
--   class_export_log            every gradebook CSV export
--
-- WHO CAN SEE WHAT
-- ----------------------------------------------------------------------------
--   NO CLIENT TABLE GRANT ON ANY TABLE HERE (revoke to zero, grant nothing).
--   RLS is on with no policy (deny-all) as a second wall. Every read and write
--   is an RPC that re-checks the caller. Why not table SELECT for students:
--   auto_points / is_correct on their own answers would tell a student which
--   answers are right before the teacher releases results — a key leak to the
--   rest of the class through one student. The RPCs redact instead.
--
--   anon                nothing (no EXECUTE on anything here).
--   outsider            nothing: every RPC answers not_found / 42501.
--   student (active)    published assignments of THEIR classes; their OWN
--                       submission; their score and feedback only once the
--                       teacher returns it (numbers only if scores_visible);
--                       correct answers only if the teacher chose to show them
--                       AND their submission is returned. Never another
--                       student's anything, never the roster, never a key.
--   former member       (left / removed) nothing in the app. Their submitted
--                       work is RETAINED for the class staff (see RETENTION).
--   class staff         their OWN class only (per class_id): assignments with
--                       keys, the gradebook, every SUBMITTED submission. NOT a
--                       student's unsubmitted draft (that is still theirs).
--   app owner (025)     nothing here. Not staff, so every RPC refuses. Support
--                       access is sql/050: the roster with a logged reason, and
--                       the gradebook grid (no answers or essays) ONLY under a
--                       time-limited grant the class owner gives.
--
-- EDIT RULES (no silent changing of graded work)
-- ----------------------------------------------------------------------------
--   * Questions, points and answer keys are LOCKED once any student has a
--     submission row (draft or submitted). To change them, Duplicate makes a
--     new draft copy — the "new version" — and the old one keeps its grades.
--   * Title, instructions, readings, due date and release settings stay
--     editable. is_late, late_days and the late penalty are SNAPSHOTTED onto
--     the submission when it is submitted, so changing the due date or the
--     penalty later never rewrites a grade already given.
--   * Every score change by staff writes assignment_grade_events (old, new,
--     actor, reason). Changing a score on work already RETURNED to the student
--     requires a reason.
--   * An assignment with submissions cannot be unpublished or deleted.
--
-- CLASS END (read-only archive)
--   Students: may read their own work; no saving, no submitting.
--   Staff: no creating/editing/publishing; grading and returning stay open for
--   30 days after the class ends (to finish marking the last essays); the
--   gradebook and CSV export stay readable while the class row exists.
--
-- RETENTION / DELETION (conservative option implemented; FOR COUNSEL, plan §12)
--   * Student deletes their account -> their submissions, answers and the grade
--     events about them CASCADE away immediately.
--   * Student leaves / is removed -> submitted work is RETAINED, visible to the
--     class staff only, marked "left" in the gradebook; NOT anonymised (a
--     teacher may need the record), NOT visible to the former member in-app.
--   * Class deleted -> everything cascades. A scheduled purge (class end + 90
--     days, plan §2) needs a scheduler this project does not have: DEFERRED.
--   * Teacher deletes their account -> assignments / grade events / export log
--     keep the rows, actor columns SET NULL.
--
-- CAPS: 200 assignments per class, 50 questions and 20 readings per
--   assignment, 2-8 options of <= 300 chars, <= 20 accepted answers of <= 200
--   chars, prompts <= 2000, instructions <= 10000, short answers <= 500,
--   essays <= 20000, feedback <= 5000, points 0-100 per question, <= 1000 per
--   assignment, one submission per student per assignment.
--
-- IDEMPOTENT: create ... if not exists; create or replace function; grants
--   re-applied. Safe to run twice (the rehearsal runs it twice).
--
-- REVERSAL (only before any real assignment exists):
--   drop table public.class_export_log, public.assignment_grade_events,
--     public.assignment_answers, public.assignment_submissions,
--     public.assignment_question_keys, public.assignment_questions,
--     public.assignment_readings, public.assignments;
--   drop function ... (every function created below).
-- ============================================================================

begin;

-- ============================================================================
-- 1. TABLES
-- ============================================================================
create table if not exists public.assignments (
  id                       uuid        primary key default gen_random_uuid(),
  class_id                 uuid        not null references public.classes(id) on delete cascade,
  title                    text        not null check (char_length(title) between 1 and 200),
  instructions             text        check (instructions is null or char_length(instructions) <= 10000),
  due_at                   timestamptz,
  accept_late              boolean     not null default true,
  late_penalty_pct_per_day integer     not null default 0 check (late_penalty_pct_per_day between 0 and 100),
  late_penalty_max_pct     integer     not null default 100 check (late_penalty_max_pct between 0 and 100),
  -- true: a fully auto-graded submission is returned (score visible) the
  -- moment it is submitted. false: the teacher returns it.
  auto_release             boolean     not null default false,
  -- after RETURN only: show the student the correct answers to auto-graded questions.
  show_correct_answers     boolean     not null default false,
  published_at             timestamptz,
  created_by               uuid        references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists assignments_class_idx on public.assignments (class_id, created_at);

create table if not exists public.assignment_readings (
  id            uuid    primary key default gen_random_uuid(),
  assignment_id uuid    not null references public.assignments(id) on delete cascade,
  ord           integer not null check (ord between 0 and 19),
  kind          text    not null check (kind in ('bible', 'place', 'site', 'person', 'topic', 'event')),
  ref           text    not null check (char_length(ref) between 1 and 200),
  label         text    check (label is null or char_length(label) <= 200),
  -- Same shapes as sql/046 study_collection_items: a canonical "Book C[:V[-V]]"
  -- for Scripture, the record's own id (src/data/*.ts) for everything else.
  constraint assignment_readings_ref_shape check (
    case kind
      when 'bible' then ref ~ '^[1-3]? ?[A-Za-z][A-Za-z ]{0,40} [0-9]{1,3}(:[0-9]{1,3}(-[0-9]{1,3})?)?$'
      else              ref ~ '^[a-z0-9][a-z0-9_-]{0,199}$'
    end),
  unique (assignment_id, ord)
);

create table if not exists public.assignment_questions (
  id            uuid    primary key default gen_random_uuid(),
  assignment_id uuid    not null references public.assignments(id) on delete cascade,
  ord           integer not null check (ord between 0 and 49),
  qtype         text    not null check (qtype in ('mc', 'tf', 'short', 'essay')),
  prompt        text    not null check (char_length(prompt) between 1 and 2000),
  -- mc only: 2-8 non-empty strings. Never the answer.
  options       jsonb   check (options is null or (jsonb_typeof(options) = 'array'
                                                  and jsonb_array_length(options) between 2 and 8)),
  points        integer not null check (points between 0 and 100),
  check ((qtype = 'mc') = (options is not null)),
  unique (assignment_id, ord)
);

-- The answers. Exactly one of the three is set, by question type.
create table if not exists public.assignment_question_keys (
  question_id      uuid    primary key references public.assignment_questions(id) on delete cascade,
  correct_choice   integer check (correct_choice is null or correct_choice between 0 and 7),
  correct_bool     boolean,
  accepted_answers text[]  check (accepted_answers is null
                                  or (cardinality(accepted_answers) between 1 and 20)),
  check (num_nonnulls(correct_choice, correct_bool, accepted_answers) = 1)
);

create table if not exists public.assignment_submissions (
  id               uuid         primary key default gen_random_uuid(),
  assignment_id    uuid         not null references public.assignments(id) on delete cascade,
  class_id         uuid         not null references public.classes(id) on delete cascade,
  user_id          uuid         not null references auth.users(id) on delete cascade,
  status           text         not null default 'draft' check (status in ('draft', 'submitted', 'returned')),
  started_at       timestamptz  not null default now(),
  saved_at         timestamptz  not null default now(),
  submitted_at     timestamptz,
  is_late          boolean      not null default false,
  late_days        integer      not null default 0 check (late_days >= 0),
  -- Snapshotted at submit from the assignment's policy (see EDIT RULES).
  late_penalty_pct integer      not null default 0 check (late_penalty_pct between 0 and 100),
  penalty_waived   boolean      not null default false,
  max_points       integer      check (max_points is null or max_points between 0 and 1000),
  raw_points       numeric(7,2),
  final_score      numeric(7,2),
  needs_grading    boolean      not null default false,
  feedback         text         check (feedback is null or char_length(feedback) <= 5000),
  returned_at      timestamptz,
  unique (assignment_id, user_id),
  check ((status = 'draft') = (submitted_at is null)),
  check ((status = 'returned') = (returned_at is not null))
);
create index if not exists assignment_submissions_class_idx on public.assignment_submissions (class_id, user_id);
create index if not exists assignment_submissions_user_idx on public.assignment_submissions (user_id);

create table if not exists public.assignment_answers (
  submission_id uuid         not null references public.assignment_submissions(id) on delete cascade,
  question_id   uuid         not null references public.assignment_questions(id) on delete cascade,
  choice        integer      check (choice is null or choice between 0 and 7),
  bool_value    boolean,
  text_value    text         check (text_value is null or char_length(text_value) <= 20000),
  auto_points   numeric(6,2),
  is_correct    boolean,
  manual_points numeric(6,2) check (manual_points is null or manual_points >= 0),
  feedback      text         check (feedback is null or char_length(feedback) <= 2000),
  primary key (submission_id, question_id)
);

create table if not exists public.assignment_grade_events (
  id            bigint       generated always as identity primary key,
  submission_id uuid         not null references public.assignment_submissions(id) on delete cascade,
  question_id   uuid         references public.assignment_questions(id) on delete set null,
  actor         uuid         references auth.users(id) on delete set null,
  kind          text         not null check (kind in ('answer', 'final', 'waive', 'return')),
  old_points    numeric(7,2),
  new_points    numeric(7,2),
  reason        text         check (reason is null or char_length(reason) <= 500),
  at            timestamptz  not null default now()
);
create index if not exists assignment_grade_events_sub_idx on public.assignment_grade_events (submission_id, at);

create table if not exists public.class_export_log (
  id        bigint      generated always as identity primary key,
  class_id  uuid        not null references public.classes(id) on delete cascade,
  actor     uuid        references auth.users(id) on delete set null,
  kind      text        not null check (kind in ('gradebook_csv')),
  at        timestamptz not null default now()
);


-- ============================================================================
-- 2. GRANTS: revoke to zero (sql/README.md: Supabase's default ACL grants every
--    new table to anon and authenticated). Then NOTHING is granted back.
-- ============================================================================
alter table public.assignments              enable row level security;
alter table public.assignment_readings      enable row level security;
alter table public.assignment_questions     enable row level security;
alter table public.assignment_question_keys enable row level security;
alter table public.assignment_submissions   enable row level security;
alter table public.assignment_answers       enable row level security;
alter table public.assignment_grade_events  enable row level security;
alter table public.class_export_log         enable row level security;

revoke all on public.assignments              from anon, authenticated, public;
revoke all on public.assignment_readings      from anon, authenticated, public;
revoke all on public.assignment_questions     from anon, authenticated, public;
revoke all on public.assignment_question_keys from anon, authenticated, public;
revoke all on public.assignment_submissions   from anon, authenticated, public;
revoke all on public.assignment_answers       from anon, authenticated, public;
revoke all on public.assignment_grade_events  from anon, authenticated, public;
revoke all on public.class_export_log         from anon, authenticated, public;
revoke all on sequence public.assignment_grade_events_id_seq from anon, authenticated, public;
revoke all on sequence public.class_export_log_id_seq        from anon, authenticated, public;


-- ============================================================================
-- 3. INTERNAL HELPERS (no client EXECUTE)
-- ============================================================================

-- Students may save and submit; staff may create and edit.
create or replace function public.class_is_open(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.classes c
     where c.id = p_class_id and c.status = 'active'
       and (c.ends_on is null or now() < public.class_end_ts(c.ends_on, c.time_zone)));
$$;

create or replace function public.class_is_editable(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.classes c
     where c.id = p_class_id and c.status in ('draft', 'active')
       and (c.ends_on is null or now() < public.class_end_ts(c.ends_on, c.time_zone)));
$$;

-- Grading and returning: while the class runs, and for 30 days after it ends.
create or replace function public.class_grading_open(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.classes c
     where c.id = p_class_id and c.status in ('draft', 'active', 'ended')
       and now() < coalesce(c.ended_at, public.class_end_ts(c.ends_on, c.time_zone), 'infinity'::timestamptz)
                   + interval '30 days');
$$;

-- Short-answer matching: case-insensitive, whitespace collapsed, a trailing
-- . ! or ? ignored. Nothing cleverer (no fuzzy match): a teacher who wants
-- "Paul" and "Saul of Tarsus" lists both.
create or replace function public.asg_norm(p text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select btrim(regexp_replace(regexp_replace(btrim(lower(coalesce(p, ''))), '\s+', ' ', 'g'), '[.!?]+$', ''));
$$;

-- Points in a payload: a number 0..max with at most two decimals, or null.
create or replace function public.asg_points(p jsonb, p_max numeric)
returns numeric
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v numeric;
begin
  if p is null or jsonb_typeof(p) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p) <> 'number' then
    raise exception 'bad_points: points must be a number' using errcode = '22023';
  end if;
  v := (p #>> '{}')::numeric;
  if v < 0 or v > p_max or v <> round(v, 2) then
    raise exception 'bad_points: points must be between 0 and % (two decimals at most)', p_max using errcode = '22023';
  end if;
  return v;
end;
$$;

-- Re-derives the totals of one submission from its answers and the penalty
-- snapshotted at submit. Never reads the assignment's CURRENT late policy.
create or replace function public.asg_recompute(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s     public.assignment_submissions%rowtype;
  v_raw   numeric;
  v_needs boolean;
  v_pct   integer;
begin
  select * into v_s from public.assignment_submissions where id = p_submission_id;
  if v_s.id is null or v_s.status = 'draft' then
    return;
  end if;
  select coalesce(sum(coalesce(an.manual_points, an.auto_points, 0)), 0),
         coalesce(bool_or(q.qtype = 'essay' and an.manual_points is null and an.auto_points is null), false)
    into v_raw, v_needs
    from public.assignment_questions q
    left join public.assignment_answers an on an.question_id = q.id and an.submission_id = v_s.id
   where q.assignment_id = v_s.assignment_id;
  v_pct := case when v_s.penalty_waived then 0 else v_s.late_penalty_pct end;
  update public.assignment_submissions
     set raw_points = v_raw,
         final_score = round(v_raw * (100 - v_pct) / 100.0, 2),
         needs_grading = v_needs
   where id = v_s.id;
end;
$$;

-- Validates and upserts a student's answers. p_answers: [{question_id, choice
-- | value | text}]. A question of another assignment, a wrong shape for the
-- question type, or an over-long text is refused (the whole call rolls back).
create or replace function public.asg_write_answers(p_submission_id uuid, p_assignment_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r      jsonb;
  v_q    public.assignment_questions%rowtype;
  v_qid  uuid;
  v_ch   integer;
  v_bool boolean;
  v_text text;
begin
  if p_answers is null or jsonb_typeof(p_answers) = 'null' then
    return;
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'bad_answers: expected a list of answers' using errcode = '22023';
  end if;
  if jsonb_array_length(p_answers) > 50 then
    raise exception 'too_many_answers: at most 50 answers' using errcode = '22023';
  end if;
  for r in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(r) <> 'object' then
      raise exception 'bad_answers: each answer must be an object' using errcode = '22023';
    end if;
    begin
      v_qid := (r ->> 'question_id')::uuid;
    exception when others then
      raise exception 'bad_answers: unknown question' using errcode = '22023';
    end;
    select * into v_q from public.assignment_questions where id = v_qid and assignment_id = p_assignment_id;
    if v_q.id is null then
      raise exception 'bad_answers: unknown question' using errcode = '22023';
    end if;
    v_ch := null; v_bool := null; v_text := null;
    if v_q.qtype = 'mc' then
      if r ? 'choice' and jsonb_typeof(r -> 'choice') <> 'null' then
        if jsonb_typeof(r -> 'choice') <> 'number' or (r ->> 'choice') !~ '^\d$' then
          raise exception 'bad_answers: choose one of the options' using errcode = '22023';
        end if;
        v_ch := (r ->> 'choice')::int;
        if v_ch >= jsonb_array_length(v_q.options) then
          raise exception 'bad_answers: choose one of the options' using errcode = '22023';
        end if;
      end if;
    elsif v_q.qtype = 'tf' then
      if r ? 'value' and jsonb_typeof(r -> 'value') <> 'null' then
        if jsonb_typeof(r -> 'value') <> 'boolean' then
          raise exception 'bad_answers: answer true or false' using errcode = '22023';
        end if;
        v_bool := (r ->> 'value')::boolean;
      end if;
    else
      if r ? 'text' and jsonb_typeof(r -> 'text') <> 'null' then
        if jsonb_typeof(r -> 'text') <> 'string' then
          raise exception 'bad_answers: expected text' using errcode = '22023';
        end if;
        v_text := r ->> 'text';
        if v_q.qtype = 'short' and char_length(v_text) > 500 then
          raise exception 'answer_too_long: short answers are 500 characters at most' using errcode = '22023';
        end if;
        if char_length(v_text) > 20000 then
          raise exception 'answer_too_long: answers are 20,000 characters at most' using errcode = '22023';
        end if;
      end if;
    end if;
    insert into public.assignment_answers (submission_id, question_id, choice, bool_value, text_value)
    values (p_submission_id, v_q.id, v_ch, v_bool, v_text)
    on conflict (submission_id, question_id) do update
      set choice = excluded.choice, bool_value = excluded.bool_value, text_value = excluded.text_value;
  end loop;
end;
$$;

-- The status a student (or the gradebook) sees.
create or replace function public.asg_status_label(p_status text, p_due timestamptz, p_late boolean)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select case
           when p_status = 'returned' then 'graded'
           when p_status = 'submitted' then case when p_late then 'late' else 'submitted' end
           when p_status = 'draft' then case when p_due is not null and now() > p_due then 'missing' else 'in_progress' end
           when p_due is not null and now() > p_due then 'missing'
           else 'not_started'
         end;
$$;


-- ============================================================================
-- 4. STAFF RPCs
-- ============================================================================

-- ---- save_assignment -------------------------------------------------------
-- Create (no id) or update (id) one assignment as a whole document. Always
-- saved unpublished on create; publish_assignment() publishes.
-- p: { id?, class_id, title, instructions, due_at (ISO or null), accept_late,
--      late_penalty_pct_per_day, late_penalty_max_pct, auto_release,
--      show_correct_answers,
--      readings?:  [{ kind, ref, label? }]                       (<= 20)
--      questions?: [{ type, prompt, points, options?, correct?, accepted? }] (<= 50)
--   mc: options [2..8 strings], correct = option index
--   tf: correct = true | false
--   short: accepted = [1..20 strings]
--   essay: nothing (graded by hand) }
-- `questions` may only be sent while the assignment is unlocked (no
-- submission rows); a locked assignment refuses it (assignment_locked).
-- ----------------------------------------------------------------------------
create or replace function public.save_assignment(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_class   uuid;
  v_id      uuid;
  v_old     public.assignments%rowtype;
  v_locked  boolean := false;
  v_title   text := btrim(coalesce(p ->> 'title', ''));
  v_instr   text := nullif(btrim(coalesce(p ->> 'instructions', '')), '');
  v_due     timestamptz;
  v_perday  integer;
  v_max     integer;
  r         jsonb;
  i         integer;
  v_qid     uuid;
  v_type    text;
  v_prompt  text;
  v_pts     integer;
  v_opts    jsonb;
  v_total   integer := 0;
  v_acc     text[];
  v_ref     text;
  v_kind    text;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'guest_account: create a free account first' using errcode = '42501';
  end if;
  if not (public.app_setting_bool('paid.groups_enabled', false) or public.has_role_at_least('owner', v_uid)) then
    raise exception 'groups_disabled: Capstone Plus for Groups is not available yet' using errcode = '42501';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'bad_request: expected an object' using errcode = '22023';
  end if;
  begin
    v_class := (p ->> 'class_id')::uuid;
    v_id := nullif(p ->> 'id', '')::uuid;
  exception when others then
    raise exception 'bad_request: bad id' using errcode = '22023';
  end;
  if not public.is_class_staff(v_class) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  if not public.class_is_editable(v_class) then
    raise exception 'class_closed: this class or group has ended' using errcode = '22023';
  end if;

  if char_length(v_title) not between 1 and 200 then
    raise exception 'title_required: give the assignment a title (up to 200 characters)' using errcode = '22023';
  end if;
  if v_instr is not null and char_length(v_instr) > 10000 then
    raise exception 'instructions_too_long: instructions are 10,000 characters at most' using errcode = '22023';
  end if;
  begin
    v_due := nullif(p ->> 'due_at', '')::timestamptz;
  exception when others then
    raise exception 'bad_due: the due date is not a date' using errcode = '22023';
  end;
  v_perday := coalesce(nullif(p ->> 'late_penalty_pct_per_day', '')::int, 0);
  v_max := coalesce(nullif(p ->> 'late_penalty_max_pct', '')::int, 100);
  if v_perday not between 0 and 100 or v_max not between 0 and 100 then
    raise exception 'bad_late_policy: penalties are 0 to 100 percent' using errcode = '22023';
  end if;

  if v_id is not null then
    select * into v_old from public.assignments where id = v_id for update;
    if v_old.id is null or v_old.class_id <> v_class then
      raise exception 'not_found' using errcode = '22023';
    end if;
    v_locked := exists (select 1 from public.assignment_submissions s where s.assignment_id = v_id);
    update public.assignments
       set title = v_title, instructions = v_instr, due_at = v_due,
           accept_late = coalesce((p ->> 'accept_late')::boolean, true),
           late_penalty_pct_per_day = v_perday, late_penalty_max_pct = v_max,
           auto_release = coalesce((p ->> 'auto_release')::boolean, false),
           show_correct_answers = coalesce((p ->> 'show_correct_answers')::boolean, false),
           updated_at = now()
     where id = v_id;
  else
    if (select count(*) from public.assignments where class_id = v_class) >= 200 then
      raise exception 'too_many_assignments: a class can have 200 assignments' using errcode = '22023';
    end if;
    insert into public.assignments (class_id, title, instructions, due_at, accept_late, late_penalty_pct_per_day,
                                    late_penalty_max_pct, auto_release, show_correct_answers, created_by)
    values (v_class, v_title, v_instr, v_due, coalesce((p ->> 'accept_late')::boolean, true), v_perday, v_max,
            coalesce((p ->> 'auto_release')::boolean, false), coalesce((p ->> 'show_correct_answers')::boolean, false),
            v_uid)
    returning id into v_id;
  end if;

  -- Readings (always editable).
  if p ? 'readings' then
    if jsonb_typeof(p -> 'readings') <> 'array' then
      raise exception 'bad_readings: expected a list' using errcode = '22023';
    end if;
    if jsonb_array_length(p -> 'readings') > 20 then
      raise exception 'too_many_readings: at most 20 readings' using errcode = '22023';
    end if;
    delete from public.assignment_readings where assignment_id = v_id;
    i := 0;
    for r in select value from jsonb_array_elements(p -> 'readings') loop
      v_kind := r ->> 'kind';
      v_ref := btrim(coalesce(r ->> 'ref', ''));
      if v_kind is null or v_kind not in ('bible', 'place', 'site', 'person', 'topic', 'event') then
        raise exception 'bad_reading: unknown kind of reading' using errcode = '22023';
      end if;
      if (v_kind = 'bible' and v_ref !~ '^[1-3]? ?[A-Za-z][A-Za-z ]{0,40} [0-9]{1,3}(:[0-9]{1,3}(-[0-9]{1,3})?)?$')
         or (v_kind <> 'bible' and v_ref !~ '^[a-z0-9][a-z0-9_-]{0,199}$') then
        raise exception 'bad_reading: that reading could not be found' using errcode = '22023';
      end if;
      insert into public.assignment_readings (assignment_id, ord, kind, ref, label)
      values (v_id, i, v_kind, v_ref, nullif(left(btrim(coalesce(r ->> 'label', '')), 200), ''));
      i := i + 1;
    end loop;
  end if;

  -- Questions (only while unlocked).
  if p ? 'questions' then
    if v_locked then
      raise exception 'assignment_locked: students have started this assignment, so its questions and answers are locked. Duplicate it to make a new version.'
        using errcode = '22023';
    end if;
    if jsonb_typeof(p -> 'questions') <> 'array' then
      raise exception 'bad_questions: expected a list' using errcode = '22023';
    end if;
    if jsonb_array_length(p -> 'questions') > 50 then
      raise exception 'too_many_questions: at most 50 questions' using errcode = '22023';
    end if;
    delete from public.assignment_questions where assignment_id = v_id;
    i := 0;
    for r in select value from jsonb_array_elements(p -> 'questions') loop
      v_type := r ->> 'type';
      v_prompt := btrim(coalesce(r ->> 'prompt', ''));
      if v_type is null or v_type not in ('mc', 'tf', 'short', 'essay') then
        raise exception 'bad_question: unknown question type' using errcode = '22023';
      end if;
      if char_length(v_prompt) not between 1 and 2000 then
        raise exception 'bad_question: question % needs a prompt (up to 2,000 characters)', i + 1 using errcode = '22023';
      end if;
      if coalesce(r ->> 'points', '') !~ '^\d{1,3}$' or (r ->> 'points')::int > 100 then
        raise exception 'bad_question: points are a whole number from 0 to 100' using errcode = '22023';
      end if;
      v_pts := (r ->> 'points')::int;
      v_total := v_total + v_pts;
      if v_total > 1000 then
        raise exception 'too_many_points: an assignment is worth 1,000 points at most' using errcode = '22023';
      end if;
      v_opts := null;
      if v_type = 'mc' then
        v_opts := r -> 'options';
        if v_opts is null or jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) not between 2 and 8
           or exists (select 1 from jsonb_array_elements(v_opts) o
                       where jsonb_typeof(o) <> 'string' or char_length(btrim(o #>> '{}')) not between 1 and 300) then
          raise exception 'bad_question: a multiple-choice question needs 2 to 8 options of up to 300 characters' using errcode = '22023';
        end if;
        select jsonb_agg(to_jsonb(btrim(o #>> '{}')) order by n) into v_opts
          from jsonb_array_elements(v_opts) with ordinality as t(o, n);
        if coalesce(r ->> 'correct', '') !~ '^\d$' or (r ->> 'correct')::int >= jsonb_array_length(v_opts) then
          raise exception 'bad_question: mark the correct option for question %', i + 1 using errcode = '22023';
        end if;
      elsif v_type = 'tf' then
        if jsonb_typeof(r -> 'correct') is distinct from 'boolean' then
          raise exception 'bad_question: mark true or false for question %', i + 1 using errcode = '22023';
        end if;
      elsif v_type = 'short' then
        if jsonb_typeof(r -> 'accepted') is distinct from 'array'
           or exists (select 1 from jsonb_array_elements(r -> 'accepted') a where jsonb_typeof(a) <> 'string') then
          raise exception 'bad_question: list the accepted answers for question %', i + 1 using errcode = '22023';
        end if;
        select array_agg(btrim(a #>> '{}') order by n) into v_acc
          from jsonb_array_elements(r -> 'accepted') with ordinality as t(a, n)
         where public.asg_norm(a #>> '{}') <> '';
        if coalesce(cardinality(v_acc), 0) not between 1 and 20
           or exists (select 1 from unnest(v_acc) x where char_length(x) > 200) then
          raise exception 'bad_question: question % needs 1 to 20 accepted answers of up to 200 characters', i + 1 using errcode = '22023';
        end if;
      end if;

      insert into public.assignment_questions (assignment_id, ord, qtype, prompt, options, points)
      values (v_id, i, v_type, v_prompt, v_opts, v_pts)
      returning id into v_qid;
      if v_type = 'mc' then
        insert into public.assignment_question_keys (question_id, correct_choice) values (v_qid, (r ->> 'correct')::int);
      elsif v_type = 'tf' then
        insert into public.assignment_question_keys (question_id, correct_bool) values (v_qid, (r ->> 'correct')::boolean);
      elsif v_type = 'short' then
        insert into public.assignment_question_keys (question_id, accepted_answers) values (v_qid, v_acc);
      end if;
      i := i + 1;
    end loop;
  end if;

  return jsonb_build_object('assignment_id', v_id, 'locked', v_locked);
end;
$$;

-- ---- publish_assignment ------------------------------------------------------
create or replace function public.publish_assignment(p_assignment_id uuid, p_publish boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_a public.assignments%rowtype;
begin
  select * into v_a from public.assignments where id = p_assignment_id for update;
  if v_a.id is null or not public.is_class_staff(v_a.class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  if not public.class_is_editable(v_a.class_id) then
    raise exception 'class_closed: this class or group has ended' using errcode = '22023';
  end if;
  if p_publish then
    update public.assignments set published_at = coalesce(published_at, now()), updated_at = now() where id = v_a.id;
  else
    if exists (select 1 from public.assignment_submissions where assignment_id = v_a.id) then
      raise exception 'has_submissions: students have started this assignment, so it cannot be unpublished' using errcode = '22023';
    end if;
    update public.assignments set published_at = null, updated_at = now() where id = v_a.id;
  end if;
end;
$$;

-- ---- delete_assignment -------------------------------------------------------
create or replace function public.delete_assignment(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_a public.assignments%rowtype;
begin
  select * into v_a from public.assignments where id = p_assignment_id for update;
  if v_a.id is null or not public.is_class_staff(v_a.class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  if exists (select 1 from public.assignment_submissions where assignment_id = v_a.id) then
    raise exception 'has_submissions: students have work in this assignment, so it cannot be deleted' using errcode = '22023';
  end if;
  delete from public.assignments where id = v_a.id;
end;
$$;

-- ---- duplicate_assignment: the "new version" path --------------------------
create or replace function public.duplicate_assignment(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_a   public.assignments%rowtype;
  v_new uuid;
  q     record;
  v_qid uuid;
begin
  select * into v_a from public.assignments where id = p_assignment_id;
  if v_a.id is null or not public.is_class_staff(v_a.class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  if not public.class_is_editable(v_a.class_id) then
    raise exception 'class_closed: this class or group has ended' using errcode = '22023';
  end if;
  if (select count(*) from public.assignments where class_id = v_a.class_id) >= 200 then
    raise exception 'too_many_assignments: a class can have 200 assignments' using errcode = '22023';
  end if;
  insert into public.assignments (class_id, title, instructions, due_at, accept_late, late_penalty_pct_per_day,
                                  late_penalty_max_pct, auto_release, show_correct_answers, created_by)
  values (v_a.class_id, left(v_a.title || ' (copy)', 200), v_a.instructions, v_a.due_at, v_a.accept_late,
          v_a.late_penalty_pct_per_day, v_a.late_penalty_max_pct, v_a.auto_release, v_a.show_correct_answers, auth.uid())
  returning id into v_new;
  insert into public.assignment_readings (assignment_id, ord, kind, ref, label)
    select v_new, ord, kind, ref, label from public.assignment_readings where assignment_id = v_a.id;
  for q in select * from public.assignment_questions where assignment_id = v_a.id order by ord loop
    insert into public.assignment_questions (assignment_id, ord, qtype, prompt, options, points)
    values (v_new, q.ord, q.qtype, q.prompt, q.options, q.points)
    returning id into v_qid;
    insert into public.assignment_question_keys (question_id, correct_choice, correct_bool, accepted_answers)
      select v_qid, k.correct_choice, k.correct_bool, k.accepted_answers
        from public.assignment_question_keys k where k.question_id = q.id;
  end loop;
  return v_new;
end;
$$;

-- ---- staff_assignment: the editor's view, keys included ----------------------
create or replace function public.staff_assignment(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_a public.assignments%rowtype;
begin
  select * into v_a from public.assignments where id = p_assignment_id;
  if v_a.id is null or not public.is_class_staff(v_a.class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'id', v_a.id, 'class_id', v_a.class_id, 'title', v_a.title, 'instructions', v_a.instructions,
    'due_at', v_a.due_at, 'accept_late', v_a.accept_late,
    'late_penalty_pct_per_day', v_a.late_penalty_pct_per_day, 'late_penalty_max_pct', v_a.late_penalty_max_pct,
    'auto_release', v_a.auto_release, 'show_correct_answers', v_a.show_correct_answers,
    'published_at', v_a.published_at,
    'locked', exists (select 1 from public.assignment_submissions s where s.assignment_id = v_a.id),
    'readings', coalesce((select jsonb_agg(jsonb_build_object('kind', r.kind, 'ref', r.ref, 'label', r.label) order by r.ord)
                            from public.assignment_readings r where r.assignment_id = v_a.id), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(jsonb_build_object(
                              'id', q.id, 'type', q.qtype, 'prompt', q.prompt, 'options', q.options, 'points', q.points,
                              'correct', case q.qtype when 'mc' then to_jsonb(k.correct_choice)
                                                      when 'tf' then to_jsonb(k.correct_bool) else null end,
                              'accepted', to_jsonb(k.accepted_answers)) order by q.ord)
                             from public.assignment_questions q
                             left join public.assignment_question_keys k on k.question_id = q.id
                            where q.assignment_id = v_a.id), '[]'::jsonb));
end;
$$;

-- ---- gradebook: every student x every published assignment, this class only --
create or replace function public.class_gradebook(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_class_staff(p_class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'students', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'display_name', p.display_name,
                                          'active', m.seat_state = 'active', 'left_at', m.left_at)
                       order by m.seat_state = 'active' desc, p.display_name nulls last, m.joined_at)
        from public.class_members m left join public.profiles p on p.id = m.user_id
       where m.class_id = p_class_id), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'due_at', a.due_at,
                                          'max_points', (select coalesce(sum(q.points), 0) from public.assignment_questions q
                                                          where q.assignment_id = a.id))
                       order by coalesce(a.due_at, a.published_at), a.created_at)
        from public.assignments a
       where a.class_id = p_class_id and a.published_at is not null), '[]'::jsonb),
    -- Drafts appear only as "in progress": their content is the student's.
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object(
               'assignment_id', s.assignment_id, 'user_id', s.user_id,
               'submission_id', case when s.status = 'draft' then null else s.id end,
               'status', public.asg_status_label(s.status, a.due_at, s.is_late),
               'is_late', s.is_late,
               'needs_grading', s.needs_grading,
               'final_score', case when s.status = 'draft' then null else s.final_score end,
               'max_points', s.max_points,
               'submitted_at', s.submitted_at))
        from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
       where s.class_id = p_class_id and a.published_at is not null), '[]'::jsonb));
end;
$$;

-- ---- staff_submission: one student's submitted work, with the answer key ----
create or replace function public.staff_submission(p_submission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_s public.assignment_submissions%rowtype;
begin
  select * into v_s from public.assignment_submissions where id = p_submission_id;
  if v_s.id is null or not public.is_class_staff(v_s.class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  if v_s.status = 'draft' then
    raise exception 'not_submitted: this work has not been submitted yet' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'id', v_s.id, 'assignment_id', v_s.assignment_id, 'user_id', v_s.user_id,
    'display_name', (select p.display_name from public.profiles p where p.id = v_s.user_id),
    'active', exists (select 1 from public.class_members m where m.class_id = v_s.class_id
                         and m.user_id = v_s.user_id and m.seat_state = 'active'),
    'status', v_s.status, 'submitted_at', v_s.submitted_at, 'returned_at', v_s.returned_at,
    'is_late', v_s.is_late, 'late_days', v_s.late_days, 'late_penalty_pct', v_s.late_penalty_pct,
    'penalty_waived', v_s.penalty_waived, 'max_points', v_s.max_points, 'raw_points', v_s.raw_points,
    'final_score', v_s.final_score, 'needs_grading', v_s.needs_grading, 'feedback', v_s.feedback,
    'grading_open', public.class_grading_open(v_s.class_id),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
               'question_id', q.id, 'type', q.qtype, 'prompt', q.prompt, 'options', q.options, 'points', q.points,
               'correct', case q.qtype when 'mc' then to_jsonb(k.correct_choice)
                                       when 'tf' then to_jsonb(k.correct_bool) else null end,
               'accepted', to_jsonb(k.accepted_answers),
               'choice', an.choice, 'value', an.bool_value, 'text', an.text_value,
               'auto_points', an.auto_points, 'is_correct', an.is_correct,
               'manual_points', an.manual_points, 'feedback', an.feedback) order by q.ord)
        from public.assignment_questions q
        left join public.assignment_question_keys k on k.question_id = q.id
        left join public.assignment_answers an on an.question_id = q.id and an.submission_id = v_s.id
       where q.assignment_id = v_s.assignment_id), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'question_id', e.question_id, 'old', e.old_points,
                                          'new', e.new_points, 'reason', e.reason, 'at', e.at,
                                          'by', (select p.display_name from public.profiles p where p.id = e.actor))
                       order by e.at, e.id)
        from public.assignment_grade_events e where e.submission_id = v_s.id), '[]'::jsonb));
end;
$$;

-- ---- grade_submission ---------------------------------------------------------
-- p: { answers?: [{ question_id, points (number|null = clear override), feedback? }],
--      feedback?: text, waive_late_penalty?: bool, reason?: text }
-- Every change of an answer's points and of the final score is logged. On work
-- already RETURNED a score change needs a reason (no silent regrade).
create or replace function public.grade_submission(p_submission_id uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_s      public.assignment_submissions%rowtype;
  v_q      public.assignment_questions%rowtype;
  v_an     public.assignment_answers%rowtype;
  r        jsonb;
  v_qid    uuid;
  v_new    numeric;
  v_old    numeric;
  v_reason text := nullif(left(btrim(coalesce(p ->> 'reason', '')), 500), '');
  v_fb     text;
  v_final  numeric;
  v_changed boolean := false;
begin
  select * into v_s from public.assignment_submissions where id = p_submission_id for update;
  if v_s.id is null or not public.is_class_staff(v_s.class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  if v_s.status = 'draft' then
    raise exception 'not_submitted: this work has not been submitted yet' using errcode = '22023';
  end if;
  if not public.class_grading_open(v_s.class_id) then
    raise exception 'grading_closed: grading closed 30 days after the class ended' using errcode = '22023';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'bad_request: expected an object' using errcode = '22023';
  end if;
  v_old := v_s.final_score;

  if p ? 'answers' then
    if jsonb_typeof(p -> 'answers') <> 'array' or jsonb_array_length(p -> 'answers') > 50 then
      raise exception 'bad_request: answers must be a list of at most 50' using errcode = '22023';
    end if;
    for r in select value from jsonb_array_elements(p -> 'answers') loop
      begin
        v_qid := (r ->> 'question_id')::uuid;
      exception when others then
        raise exception 'bad_request: unknown question' using errcode = '22023';
      end;
      select * into v_q from public.assignment_questions where id = v_qid and assignment_id = v_s.assignment_id;
      if v_q.id is null then
        raise exception 'bad_request: unknown question' using errcode = '22023';
      end if;
      insert into public.assignment_answers (submission_id, question_id) values (v_s.id, v_q.id)
      on conflict do nothing;
      select * into v_an from public.assignment_answers where submission_id = v_s.id and question_id = v_q.id for update;
      if r ? 'points' then
        v_new := public.asg_points(r -> 'points', v_q.points);
        if coalesce(v_new, v_an.auto_points) is distinct from coalesce(v_an.manual_points, v_an.auto_points) then
          v_changed := true;
          insert into public.assignment_grade_events (submission_id, question_id, actor, kind, old_points, new_points, reason)
          values (v_s.id, v_q.id, v_uid, 'answer', coalesce(v_an.manual_points, v_an.auto_points),
                  coalesce(v_new, v_an.auto_points), v_reason);
        end if;
        update public.assignment_answers set manual_points = v_new
         where submission_id = v_s.id and question_id = v_q.id;
      end if;
      if r ? 'feedback' then
        v_fb := nullif(btrim(coalesce(r ->> 'feedback', '')), '');
        if v_fb is not null and char_length(v_fb) > 2000 then
          raise exception 'feedback_too_long: feedback on one answer is 2,000 characters at most' using errcode = '22023';
        end if;
        update public.assignment_answers set feedback = v_fb where submission_id = v_s.id and question_id = v_q.id;
      end if;
    end loop;
  end if;

  if p ? 'feedback' then
    v_fb := nullif(btrim(coalesce(p ->> 'feedback', '')), '');
    if v_fb is not null and char_length(v_fb) > 5000 then
      raise exception 'feedback_too_long: feedback is 5,000 characters at most' using errcode = '22023';
    end if;
    update public.assignment_submissions set feedback = v_fb where id = v_s.id;
  end if;

  if p ? 'waive_late_penalty' and coalesce((p ->> 'waive_late_penalty')::boolean, false) is distinct from v_s.penalty_waived then
    update public.assignment_submissions set penalty_waived = coalesce((p ->> 'waive_late_penalty')::boolean, false)
     where id = v_s.id;
    insert into public.assignment_grade_events (submission_id, actor, kind, old_points, new_points, reason)
    values (v_s.id, v_uid, 'waive', case when v_s.penalty_waived then 1 else 0 end,
            case when v_s.penalty_waived then 0 else 1 end, v_reason);
    v_changed := true;
  end if;

  perform public.asg_recompute(v_s.id);
  select final_score into v_final from public.assignment_submissions where id = v_s.id;
  if v_final is distinct from v_old then
    insert into public.assignment_grade_events (submission_id, actor, kind, old_points, new_points, reason)
    values (v_s.id, v_uid, 'final', v_old, v_final, v_reason);
  end if;
  if v_s.status = 'returned' and v_changed and v_reason is null then
    raise exception 'reason_required: this work was already returned; say why the score is changing' using errcode = '22023';
  end if;
  return jsonb_build_object('final_score', v_final,
    'needs_grading', (select needs_grading from public.assignment_submissions where id = v_s.id));
end;
$$;

-- ---- return_submissions --------------------------------------------------------
-- Releases graded work to the student. p_submission_ids null = every fully
-- graded submission of the assignment. Work still needing grading is skipped.
create or replace function public.return_submissions(p_assignment_id uuid, p_submission_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_a public.assignments%rowtype;
  v_n integer;
begin
  select * into v_a from public.assignments where id = p_assignment_id;
  if v_a.id is null or not public.is_class_staff(v_a.class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  if not public.class_grading_open(v_a.class_id) then
    raise exception 'grading_closed: grading closed 30 days after the class ended' using errcode = '22023';
  end if;
  with done as (
    update public.assignment_submissions s
       set status = 'returned', returned_at = now()
     where s.assignment_id = v_a.id and s.status = 'submitted' and not s.needs_grading
       and (p_submission_ids is null or s.id = any (p_submission_ids))
    returning s.id, s.final_score
  ), logged as (
    insert into public.assignment_grade_events (submission_id, actor, kind, new_points)
    select d.id, auth.uid(), 'return', d.final_score from done d
    returning 1
  )
  select count(*) into v_n from logged;
  return v_n;
end;
$$;

-- ---- set_class_scores_visible (owner) -----------------------------------------
-- Church groups hide numbers by default (sql/047). Students then see
-- "Reviewed" and the feedback, never a number.
create or replace function public.set_class_scores_visible(p_class_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_class_owner(p_class_id) then
    raise exception 'not_class_owner: only the class''s teacher or leader can change that' using errcode = '42501';
  end if;
  update public.classes set scores_visible = coalesce(p_visible, false) where id = p_class_id;
end;
$$;

-- ---- log_gradebook_export -------------------------------------------------------
create or replace function public.log_gradebook_export(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_class_staff(p_class_id) then
    raise exception 'not_class_staff: only this class''s teacher or leader can do that' using errcode = '42501';
  end if;
  insert into public.class_export_log (class_id, actor, kind) values (p_class_id, auth.uid(), 'gradebook_csv');
end;
$$;


-- ============================================================================
-- 5. STUDENT RPCs (and the shared list)
-- ============================================================================

-- ---- class_assignments -----------------------------------------------------------
-- Staff: every assignment of the class with counts. Active member: published
-- assignments with THEIR OWN status (and score once returned, if scores show).
-- Anyone else: 42501.
create or replace function public.class_assignments(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_vis boolean;
begin
  if public.is_class_staff(p_class_id) then
    return jsonb_build_object('role', 'staff', 'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'title', a.title, 'due_at', a.due_at, 'published_at', a.published_at,
               'max_points', (select coalesce(sum(q.points), 0) from public.assignment_questions q where q.assignment_id = a.id),
               'questions', (select count(*) from public.assignment_questions q where q.assignment_id = a.id),
               'readings', (select count(*) from public.assignment_readings r where r.assignment_id = a.id),
               'submitted', (select count(*) from public.assignment_submissions s where s.assignment_id = a.id and s.status <> 'draft'),
               'to_grade', (select count(*) from public.assignment_submissions s where s.assignment_id = a.id and s.status = 'submitted' and s.needs_grading),
               'to_return', (select count(*) from public.assignment_submissions s where s.assignment_id = a.id and s.status = 'submitted' and not s.needs_grading),
               'locked', exists (select 1 from public.assignment_submissions s where s.assignment_id = a.id))
             order by coalesce(a.due_at, a.created_at), a.created_at)
        from public.assignments a where a.class_id = p_class_id), '[]'::jsonb));
  end if;
  if not public.is_class_member(p_class_id) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  select c.scores_visible into v_vis from public.classes c where c.id = p_class_id;
  return jsonb_build_object('role', 'member', 'scores_visible', v_vis, 'assignments', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id, 'title', a.title, 'due_at', a.due_at,
             'readings', (select coalesce(jsonb_agg(jsonb_build_object('kind', r.kind, 'ref', r.ref, 'label', r.label) order by r.ord), '[]'::jsonb)
                            from public.assignment_readings r where r.assignment_id = a.id),
             'status', public.asg_status_label(s.status, a.due_at, s.is_late),
             'is_late', coalesce(s.is_late, false),
             'final_score', case when s.status = 'returned' and v_vis then s.final_score end,
             'max_points', case when s.status = 'returned' and v_vis then s.max_points end)
           order by coalesce(a.due_at, a.published_at), a.created_at)
      from public.assignments a
      left join public.assignment_submissions s on s.assignment_id = a.id and s.user_id = v_uid
     where a.class_id = p_class_id and a.published_at is not null), '[]'::jsonb));
end;
$$;

-- ---- my_assignment ------------------------------------------------------------
-- One published assignment of the caller's class, for taking or reviewing.
-- NEVER includes a key, auto points or correctness before the teacher returns
-- the work; after return, numbers only if scores_visible, and correct answers
-- only if the teacher chose show_correct_answers.
create or replace function public.my_assignment(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_a   public.assignments%rowtype;
  v_c   public.classes%rowtype;
  v_s   public.assignment_submissions%rowtype;
  v_ret boolean;
  v_num boolean;
  v_key boolean;
begin
  select * into v_a from public.assignments where id = p_assignment_id;
  if v_a.id is null or v_a.published_at is null or not public.is_class_member(v_a.class_id) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  select * into v_c from public.classes where id = v_a.class_id;
  select * into v_s from public.assignment_submissions where assignment_id = v_a.id and user_id = v_uid;
  v_ret := v_s.status = 'returned';
  v_num := coalesce(v_ret and v_c.scores_visible, false);
  v_key := coalesce(v_ret and v_a.show_correct_answers, false);
  return jsonb_build_object(
    'id', v_a.id, 'class_id', v_a.class_id, 'kind', v_c.kind, 'class_name', v_c.name,
    'title', v_a.title, 'instructions', v_a.instructions, 'due_at', v_a.due_at, 'accept_late', v_a.accept_late,
    'late_penalty_pct_per_day', v_a.late_penalty_pct_per_day, 'late_penalty_max_pct', v_a.late_penalty_max_pct,
    'open', public.class_is_open(v_a.class_id),
    'readings', coalesce((select jsonb_agg(jsonb_build_object('kind', r.kind, 'ref', r.ref, 'label', r.label) order by r.ord)
                            from public.assignment_readings r where r.assignment_id = v_a.id), '[]'::jsonb),
    'submission', case when v_s.id is null then null else jsonb_build_object(
        'status', public.asg_status_label(v_s.status, v_a.due_at, v_s.is_late),
        'state', v_s.status, 'saved_at', v_s.saved_at, 'submitted_at', v_s.submitted_at, 'is_late', v_s.is_late,
        'returned_at', v_s.returned_at,
        'feedback', case when v_ret then v_s.feedback end,
        'final_score', case when v_num then v_s.final_score end,
        'max_points', case when v_num then v_s.max_points end,
        'late_penalty_pct', case when v_num and not v_s.penalty_waived then v_s.late_penalty_pct end) end,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'type', q.qtype, 'prompt', q.prompt, 'options', q.options, 'points', q.points,
               'choice', an.choice, 'value', an.bool_value, 'text', an.text_value,
               'earned', case when v_num then coalesce(an.manual_points, an.auto_points) end,
               'feedback', case when v_ret then an.feedback end,
               'correct', case when v_key and q.qtype = 'mc' then to_jsonb(k.correct_choice)
                               when v_key and q.qtype = 'tf' then to_jsonb(k.correct_bool) end,
               'accepted', case when v_key and q.qtype = 'short' then to_jsonb(k.accepted_answers) end)
             order by q.ord)
        from public.assignment_questions q
        left join public.assignment_question_keys k on k.question_id = q.id
        left join public.assignment_answers an on an.question_id = q.id and an.submission_id = v_s.id
       where q.assignment_id = v_a.id), '[]'::jsonb));
end;
$$;

-- Shared front half of save / submit: the caller, an open class, a published
-- assignment, and their own draft row (created on first save), locked.
create or replace function public.asg_my_draft(p_assignment_id uuid)
returns public.assignment_submissions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_a   public.assignments%rowtype;
  v_s   public.assignment_submissions%rowtype;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into v_a from public.assignments where id = p_assignment_id;
  if v_a.id is null or v_a.published_at is null or not public.is_class_member(v_a.class_id) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if not public.class_is_open(v_a.class_id) then
    raise exception 'class_closed: this class or group has ended, so work can no longer be changed' using errcode = '22023';
  end if;
  insert into public.assignment_submissions (assignment_id, class_id, user_id)
  values (v_a.id, v_a.class_id, v_uid)
  on conflict (assignment_id, user_id) do nothing;
  select * into v_s from public.assignment_submissions
   where assignment_id = v_a.id and user_id = v_uid for update;
  if v_s.status <> 'draft' then
    raise exception 'already_submitted: you have already handed this in' using errcode = '22023';
  end if;
  if v_a.due_at is not null and now() > v_a.due_at and not v_a.accept_late then
    raise exception 'past_due: this assignment is past due and no longer accepts work' using errcode = '22023';
  end if;
  return v_s;
end;
$$;

create or replace function public.save_assignment_draft(p_assignment_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s public.assignment_submissions%rowtype;
begin
  v_s := public.asg_my_draft(p_assignment_id);
  perform public.asg_write_answers(v_s.id, v_s.assignment_id, p_answers);
  update public.assignment_submissions set saved_at = now() where id = v_s.id;
  return jsonb_build_object('ok', true, 'saved_at', now());
end;
$$;

-- ---- submit_assignment: the grader. Keys are read HERE, server-side, and the
-- result is never returned unless the work is released at once.
create or replace function public.submit_assignment(p_assignment_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_s     public.assignment_submissions%rowtype;
  v_a     public.assignments%rowtype;
  v_now   timestamptz := now();
  v_late  boolean;
  v_days  integer := 0;
  v_pct   integer := 0;
  v_needs boolean;
begin
  v_s := public.asg_my_draft(p_assignment_id);
  select * into v_a from public.assignments where id = v_s.assignment_id;
  perform public.asg_write_answers(v_s.id, v_a.id, p_answers);

  -- Every question gets a row, so an unanswered one scores 0 rather than vanishing.
  insert into public.assignment_answers (submission_id, question_id)
    select v_s.id, q.id from public.assignment_questions q where q.assignment_id = v_a.id
  on conflict do nothing;

  update public.assignment_answers an
     set auto_points = case q.qtype
           when 'mc'    then case when an.choice is not null and an.choice = k.correct_choice then q.points else 0 end
           when 'tf'    then case when an.bool_value is not null and an.bool_value = k.correct_bool then q.points else 0 end
           when 'short' then case when public.asg_norm(an.text_value) <> ''
                                       and public.asg_norm(an.text_value) in (select public.asg_norm(x) from unnest(k.accepted_answers) x)
                                  then q.points else 0 end
           -- essays: blank scores 0; anything written waits for the teacher.
           else case when btrim(coalesce(an.text_value, '')) = '' then 0 else null end
         end,
         is_correct = case q.qtype
           when 'mc'    then coalesce(an.choice = k.correct_choice, false)
           when 'tf'    then coalesce(an.bool_value = k.correct_bool, false)
           when 'short' then public.asg_norm(an.text_value) <> ''
                             and public.asg_norm(an.text_value) in (select public.asg_norm(x) from unnest(k.accepted_answers) x)
           else null
         end
    from public.assignment_questions q
    left join public.assignment_question_keys k on k.question_id = q.id
   where an.submission_id = v_s.id and q.id = an.question_id;

  v_late := v_a.due_at is not null and v_now > v_a.due_at;
  if v_late then
    v_days := greatest(1, ceil(extract(epoch from (v_now - v_a.due_at)) / 86400.0)::int);
    v_pct := least(v_a.late_penalty_max_pct, v_a.late_penalty_pct_per_day * v_days);
  end if;

  update public.assignment_submissions
     set status = 'submitted', submitted_at = v_now, saved_at = v_now,
         is_late = v_late, late_days = v_days, late_penalty_pct = v_pct,
         max_points = (select coalesce(sum(q.points), 0) from public.assignment_questions q where q.assignment_id = v_a.id)
   where id = v_s.id;
  perform public.asg_recompute(v_s.id);

  select needs_grading into v_needs from public.assignment_submissions where id = v_s.id;
  if v_a.auto_release and not v_needs then
    update public.assignment_submissions set status = 'returned', returned_at = v_now where id = v_s.id;
  end if;
  return jsonb_build_object('ok', true, 'late', v_late,
                            'returned', v_a.auto_release and not v_needs);
end;
$$;


-- ============================================================================
-- 6. FUNCTION GRANTS — revoke all (PUBLIC gets EXECUTE by default; Supabase's
--    default ACL gives anon it too), then grant the client RPCs to
--    authenticated only. Helpers get nothing: they run inside the definer
--    functions above.
-- ============================================================================
revoke all on function public.class_is_open(uuid)                          from public, anon, authenticated;
revoke all on function public.class_is_editable(uuid)                      from public, anon, authenticated;
revoke all on function public.class_grading_open(uuid)                     from public, anon, authenticated;
revoke all on function public.asg_norm(text)                               from public, anon, authenticated;
revoke all on function public.asg_points(jsonb, numeric)                   from public, anon, authenticated;
revoke all on function public.asg_recompute(uuid)                          from public, anon, authenticated;
revoke all on function public.asg_write_answers(uuid, uuid, jsonb)         from public, anon, authenticated;
revoke all on function public.asg_status_label(text, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.asg_my_draft(uuid)                           from public, anon, authenticated;
revoke all on function public.save_assignment(jsonb)                       from public, anon, authenticated;
revoke all on function public.publish_assignment(uuid, boolean)            from public, anon, authenticated;
revoke all on function public.delete_assignment(uuid)                      from public, anon, authenticated;
revoke all on function public.duplicate_assignment(uuid)                   from public, anon, authenticated;
revoke all on function public.staff_assignment(uuid)                       from public, anon, authenticated;
revoke all on function public.class_gradebook(uuid)                        from public, anon, authenticated;
revoke all on function public.staff_submission(uuid)                       from public, anon, authenticated;
revoke all on function public.grade_submission(uuid, jsonb)                from public, anon, authenticated;
revoke all on function public.return_submissions(uuid, uuid[])             from public, anon, authenticated;
revoke all on function public.set_class_scores_visible(uuid, boolean)      from public, anon, authenticated;
revoke all on function public.log_gradebook_export(uuid)                   from public, anon, authenticated;
revoke all on function public.class_assignments(uuid)                      from public, anon, authenticated;
revoke all on function public.my_assignment(uuid)                          from public, anon, authenticated;
revoke all on function public.save_assignment_draft(uuid, jsonb)           from public, anon, authenticated;
revoke all on function public.submit_assignment(uuid, jsonb)               from public, anon, authenticated;

grant execute on function public.save_assignment(jsonb)                  to authenticated;
grant execute on function public.publish_assignment(uuid, boolean)       to authenticated;
grant execute on function public.delete_assignment(uuid)                 to authenticated;
grant execute on function public.duplicate_assignment(uuid)              to authenticated;
grant execute on function public.staff_assignment(uuid)                  to authenticated;
grant execute on function public.class_gradebook(uuid)                   to authenticated;
grant execute on function public.staff_submission(uuid)                  to authenticated;
grant execute on function public.grade_submission(uuid, jsonb)           to authenticated;
grant execute on function public.return_submissions(uuid, uuid[])        to authenticated;
grant execute on function public.set_class_scores_visible(uuid, boolean) to authenticated;
grant execute on function public.log_gradebook_export(uuid)              to authenticated;
grant execute on function public.class_assignments(uuid)                 to authenticated;
grant execute on function public.my_assignment(uuid)                     to authenticated;
grant execute on function public.save_assignment_draft(uuid, jsonb)      to authenticated;
grant execute on function public.submit_assignment(uuid, jsonb)          to authenticated;

commit;
