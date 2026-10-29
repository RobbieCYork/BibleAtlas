/**
 * The fake Supabase. A pure function from (method, url, headers, body) to a response, over
 * in-memory state. It never touches the network. Covers the three surfaces the app uses:
 *   /auth/v1/*       user, token (refresh + password), signup (anonymous), logout
 *   /rest/v1/<t>     a small PostgREST: select with eq/neq/in/is/gt/gte/lt/lte, order, limit,
 *                    offset, count; insert / upsert / patch / delete against in-memory rows
 *   /rest/v1/rpc/<f> named handlers (below). An unknown rpc answers 204 and is logged as a GAP.
 * Anything else (functions, storage, realtime) answers an empty success and is logged as a GAP.
 *
 * Every request is logged with how it was handled: "fixture" (served from seeded data),
 * "stateful" (a write or a stateful rpc), or "gap" (nobody wrote a fixture for it - the agent
 * should read the gap list and decide whether the check needs one).
 */
import { PERSONAS, personaSession, personaUser } from "./personas.mjs";
import { FEATURE_KEYS, defaultTables } from "./fixtures.mjs";

const json = (status, body, headers = {}) => ({ status, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? "" : JSON.stringify(body) });
const err = (status, code, message) => json(status, { code, message, details: null, hint: null });

const ROLE_RANK = { user: 0, advisor: 1, administrator: 2, owner: 3 };

export function createBackend({ persona, overrides = {} }) {
  let me = persona ? PERSONAS[persona] : null;
  const tables = structuredClone(defaultTables(me));
  for (const [t, rows] of Object.entries(overrides.tables ?? {})) tables[t] = structuredClone(rows);

  const log = { requests: [], gaps: [], writes: [], audit: [], preflights: 0 };
  let session = me ? personaSession(me) : null;
  let seq = 1000;

  const myRank = () => ROLE_RANK[me?.role ?? "user"] ?? 0;

  /** rpc name -> (args) => value | {status, body} | throws {code,message}. Replaceable per run. */
  const rpcs = {
    current_user_is_owner: () => me?.role === "owner",
    current_user_role: () => me?.role ?? null,
    has_role_at_least: ({ p_role }) => myRank() >= (ROLE_RANK[p_role] ?? 99),
    is_admin: () => !!me?.admin,
    is_display_name_available: () => true,
    set_feature_stage: ({ p_feature, p_live }) => {
      if (me?.role !== "owner") throw { status: 403, code: "42501", message: "only the owner can change a feature's stage" };
      const row = tables.feature_release.find((r) => r.feature === p_feature);
      if (!row) throw { status: 400, code: "22023", message: `unknown feature: ${p_feature}` };
      const at = new Date().toISOString();
      const entry = { feature: p_feature, from_live: row.live, to_live: !!p_live, changed_by: me.id, changed_at: at };
      row.live = !!p_live;
      row.updated_at = at;
      row.updated_by = me.id;
      log.audit.push(entry);
      (tables.feature_release_log ??= []).push(entry);
      return { feature: p_feature, live: !!p_live, updated_at: at };
    },
    increment_reading_time: () => null,
    analytics_track: () => null,
    count_unread_group_messages: () => 0,
    count_pending_group_join_requests: () => 0,
    admin_overview: () => ({
      users_total: 120, users_registered: 80, users_anonymous: 40, users_new_24h: 2, users_new_7d: 9, users_new_30d: 31,
      active_24h: 14, active_7d: 55, active_30d: 90, sessions_24h: 30, sessions_7d: 200, events_total: 5000, analytics_since: "2026-08-01T00:00:00Z",
    }),
    admin_daily_activity: () => [],
    admin_feature_usage: () => [],
    admin_feature_breakdown: () => [],
    admin_engagement: () => ({ sessions: 0, bounces: 0, median_seconds: null, mean_seconds: null, p90_seconds: null, total_seconds: 0, sessions_per_user: 0, returning_users: 0 }),
    admin_content_counts: () => ({}),
    admin_recent_public_content: () => [],
    admin_list_users: () => [],
    admin_guest_summary: () => ({ total: 0, new_24h: 0, new_7d: 0, new_30d: 0, first_seen: null, newest_seen: null, active_24h: 0, active_7d: 0, last_active_at: null, guests_with_sessions: 0, guests_before_analytics: 0, sessions_total: 0, sessions_seconds_total: 0, median_session_seconds: null, returning_guests: 0, days: [], recent_sessions: [] }),
    // Array-returning rpcs the app destructures; empty is the honest default.
    list_my_groups: () => [], list_my_churches: () => [], list_my_blocks: () => [], list_user_roles: () => [],
    report_counts: () => ({ untriaged: 0, new: 0, triaged: 0, total: 0 }),
    moderation_queue: () => [], moderation_history: () => [], moderation_counts: () => ({}),
    find_users_by_display_name: () => [], find_public_groups_by_name: () => [],
  };
  for (const [name, value] of Object.entries(overrides.rpc ?? {})) rpcs[name] = () => value;

  // --- PostgREST filtering ---------------------------------------------------------------
  const coerce = (v) => (v === "null" ? null : v === "true" ? true : v === "false" ? false : v);
  const eq = (a, b) => String(a) === String(b);
  function matches(row, key, expr) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) return true;
    const dot = expr.indexOf(".");
    if (dot < 0) return true;
    let op = expr.slice(0, dot);
    let val = expr.slice(dot + 1);
    let neg = false;
    if (op === "not") { neg = true; const d2 = val.indexOf("."); op = val.slice(0, d2); val = val.slice(d2 + 1); }
    const cell = row[key];
    let r;
    switch (op) {
      case "eq": r = eq(cell, val); break;
      case "neq": r = !eq(cell, val); break;
      case "is": r = cell === coerce(val) || (val === "null" && cell == null); break;
      case "in": r = val.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).some((x) => eq(cell, x)); break;
      case "gt": r = cell > val; break; case "gte": r = cell >= val; break;
      case "lt": r = cell < val; break; case "lte": r = cell <= val; break;
      case "ilike": case "like": r = new RegExp("^" + val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i").test(String(cell ?? "")); break;
      default: r = true; // or=, cs=, ov=... are not modelled: they do not filter. Noted in the README.
    }
    return neg ? !r : r;
  }
  const selectRows = (rows, params) => {
    let out = rows.filter((row) => [...params.entries()].every(([k, v]) => matches(row, k, v)));
    const order = params.get("order");
    if (order) {
      const [col, dir] = order.split(",")[0].split(".");
      out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1));
    }
    const total = out.length;
    const off = Number(params.get("offset") ?? 0);
    const lim = params.get("limit");
    out = out.slice(off, lim ? off + Number(lim) : undefined);
    return { out, total, off };
  };

  function handleRest(method, path, params, headers, bodyText) {
    const table = path.replace(/^\/rest\/v1\//, "");
    if (table.startsWith("rpc/")) return handleRpc(table.slice(4), bodyText, method, params);
    const rows = (tables[table] ??= []);
    const known = table in defaultTables(me) || (overrides.tables && table in overrides.tables) || rows.length > 0;
    const prefer = headers["prefer"] ?? "";
    const wantsObject = /vnd\.pgrst\.object/.test(headers["accept"] ?? "");
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    const reply = (list, status = 200, total) => {
      const range = `${list.length ? `0-${list.length - 1}` : "*"}/${total ?? list.length}`;
      if (wantsObject) {
        if (list.length !== 1) return err(406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
        return json(status, list[0], { "content-range": range });
      }
      return json(status, list, { "content-range": range });
    };
    if (method === "GET" || method === "HEAD") {
      const { out, total } = selectRows(rows, params);
      log.requests.at(-1).how = known ? "fixture" : "gap";
      if (!known) log.gaps.push(`GET ${table}`);
      if (method === "HEAD") return { status: 200, headers: { "content-range": `*/${total}` }, body: "" };
      return reply(out, 200, total);
    }
    log.requests.at(-1).how = "stateful";
    const returnRep = /return=representation/.test(prefer);
    if (method === "POST") {
      const incoming = (Array.isArray(body) ? body : [body]).map((r) => ({ id: r.id ?? `00000000-0000-4000-9000-${String(seq++).padStart(12, "0")}`, created_at: new Date().toISOString(), ...r }));
      const upsert = /resolution=(merge|ignore)-duplicates/.test(prefer);
      for (const r of incoming) {
        const at = upsert ? rows.findIndex((x) => x.id === r.id) : -1;
        if (at >= 0) rows[at] = { ...rows[at], ...r }; else rows.push(r);
      }
      log.writes.push({ table, op: upsert ? "upsert" : "insert", rows: incoming });
      return returnRep ? reply(incoming, 201) : { status: 201, headers: {}, body: "" };
    }
    if (method === "PATCH") {
      const hit = rows.filter((row) => [...params.entries()].every(([k, v]) => matches(row, k, v)));
      hit.forEach((r) => Object.assign(r, body));
      log.writes.push({ table, op: "update", rows: hit });
      return returnRep ? reply(hit) : { status: 204, headers: {}, body: "" };
    }
    if (method === "DELETE") {
      const hit = rows.filter((row) => [...params.entries()].every(([k, v]) => matches(row, k, v)));
      tables[table] = rows.filter((r) => !hit.includes(r));
      log.writes.push({ table, op: "delete", rows: hit });
      return returnRep ? reply(hit) : { status: 204, headers: {}, body: "" };
    }
    return err(405, "405", "method not allowed");
  }

  function handleRpc(fn, bodyText) {
    const args = bodyText ? JSON.parse(bodyText) : {};
    const h = rpcs[fn];
    const rec = log.requests.at(-1);
    if (!h) {
      rec.how = "gap";
      log.gaps.push(`RPC ${fn}`);
      return { status: 204, headers: {}, body: "" };
    }
    rec.how = fn === "set_feature_stage" ? "stateful" : "fixture";
    try {
      const v = h(args);
      return v === undefined || v === null ? json(200, null) : json(200, v);
    } catch (e) {
      if (e && e.code) return err(e.status ?? 400, e.code, e.message);
      throw e;
    }
  }

  function handleAuth(method, path, params, bodyText) {
    const rec = log.requests.at(-1);
    rec.how = "fixture";
    if (path === "/auth/v1/user") {
      if (!me) return err(401, "401", "no session");
      return json(200, personaUser(me));
    }
    if (path === "/auth/v1/token") {
      const grant = params.get("grant_type");
      if (grant === "refresh_token" || grant === "password") {
        const p = me ?? PERSONAS.member; // signing in from the signed-out screen becomes the member
        session = personaSession(p);
        return json(200, session);
      }
    }
    if (path === "/auth/v1/signup") {
      const guest = PERSONAS.guest;
      session = personaSession(guest);
      return json(200, session);
    }
    if (path === "/auth/v1/logout") return { status: 204, headers: {}, body: "" };
    if (path === "/auth/v1/settings") return json(200, { external: {}, disable_signup: false, mailer_autoconfirm: true });
    rec.how = "gap";
    log.gaps.push(`AUTH ${method} ${path}`);
    return json(200, {});
  }

  /** Entry point. `req` = { method, url, headers (lower-cased), body }. */
  function handle(req) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") { log.preflights++; return { status: 204, headers: {}, body: "" }; }
    const rec = { method: req.method, path: u.pathname + (u.search ? u.search.slice(0, 120) : ""), how: "gap" };
    log.requests.push(rec);
    if (u.pathname.startsWith("/auth/v1/")) return handleAuth(req.method, u.pathname, u.searchParams, req.body);
    if (u.pathname.startsWith("/rest/v1/")) return handleRest(req.method, u.pathname, u.searchParams, req.headers, req.body);
    log.gaps.push(`${req.method} ${u.pathname}`);
    return u.pathname.startsWith("/storage/v1/") ? json(404, { error: "not_found", message: "harness: no storage" }) : json(200, {});
  }

  return {
    handle,
    log,
    tables,
    rpcs,
    get session() { return session; },
    get persona() { return me; },
    /** Become someone else, keeping everything else the run has changed (feature stages, writes). */
    setPersona(name) {
      me = name === "signedout" ? null : PERSONAS[name];
      if (me === undefined) throw new Error(`unknown persona ${name}`);
      session = me ? personaSession(me) : null;
      const fresh = defaultTables(me);
      tables.admin_users = fresh.admin_users;
      tables.profiles = fresh.profiles;
      return session;
    },
    /** Replace a table's rows at run time (from a check script). */
    setTable: (name, rows) => { tables[name] = structuredClone(rows); },
    /** Replace or add an rpc handler at run time: setRpc("list_my_groups", () => [...]). */
    setRpc: (name, fn) => { rpcs[name] = typeof fn === "function" ? fn : () => fn; },
    featureKeys: FEATURE_KEYS,
  };
}
