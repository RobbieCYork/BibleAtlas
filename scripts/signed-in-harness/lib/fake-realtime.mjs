/**
 * A small stand-in for Supabase Realtime, shared by several harness pages, so multiplayer rooms can
 * be checked: channel join/leave, presence (track + sync), broadcast between pages, and a "this table
 * changed" push for postgres_changes. The page's WebSocket to the fake host is replaced in-page and
 * its frames travel over a CDP binding, so nothing touches the network.
 *
 * It speaks the client's protocol (vsn 2.0.0). It does NOT model Realtime authorization, rate limits,
 * reconnects or message loss.
 */
const SHIM = `(() => {
  const Real = window.WebSocket;
  const socks = new Map(); let n = 0;
  class Fake {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    constructor(url) {
      this.url = url; this.readyState = 0; this.binaryType = "arraybuffer"; this.bufferedAmount = 0;
      this.id = Date.now() + "-" + (++n); socks.set(this.id, this);
      setTimeout(() => { this.readyState = 1; this.onopen && this.onopen({}); }, 20);
    }
    send(data) {
      const frame = typeof data === "string" ? { text: data } : { bin: btoa(String.fromCharCode(...new Uint8Array(data))) };
      window.__rtSend(JSON.stringify({ sock: this.id, ...frame }));
    }
    close() { this.readyState = 3; socks.delete(this.id); window.__rtSend(JSON.stringify({ sock: this.id, closed: true })); this.onclose && this.onclose({ code: 1000 }); }
    addEventListener() {} removeEventListener() {}
  }
  window.__rtDeliver = (id, text) => { const s = socks.get(id); s && s.onmessage && s.onmessage({ data: text }); };
  window.WebSocket = function (url, p) { return String(url).includes("/realtime/v1/") ? new Fake(url) : new Real(url, p); };
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
})()`;

export function createFakeRealtime() {
  /** topic -> Map(connKey -> {tab, sock, key, meta, bindings}) */
  const topics = new Map();
  const log = [];
  let ref = 0;
  const deliver = (m, frame) =>
    m.tab.send("Runtime.evaluate", { expression: `window.__rtDeliver && window.__rtDeliver(${JSON.stringify(m.sock)}, ${JSON.stringify(JSON.stringify(frame))})` }).catch(() => {});
  const members = (topic) => topics.get(topic) ?? topics.set(topic, new Map()).get(topic);

  const drop = (topic, connKey) => {
    const all = members(topic);
    const m = all.get(connKey);
    if (!m) return;
    all.delete(connKey);
    if (m.meta) for (const other of all.values()) deliver(other, [null, null, topic, "presence_diff", { joins: {}, leaves: { [m.key]: { metas: [m.meta] } } }]);
  };

  const onFrame = (tab, tabNo, msg) => {
    const f = JSON.parse(msg);
    const connKey = `${tabNo}:${f.sock}`;
    if (f.closed) { for (const t of topics.keys()) drop(t, connKey); return; }
    let joinRef, msgRef, topic, event, payload;
    if (f.text) [joinRef, msgRef, topic, event, payload] = JSON.parse(f.text);
    else {
      const b = Buffer.from(f.bin, "base64"); // kind 3: user broadcast push
      const [, jl, rl, tl, el, ml] = b;
      let o = 7;
      const take = (len) => b.subarray(o, (o += len)).toString("utf8");
      joinRef = take(jl); msgRef = take(rl); topic = take(tl);
      const userEvent = take(el); take(ml);
      event = "broadcast";
      payload = { type: "broadcast", event: userEvent, payload: JSON.parse(b.subarray(o).toString("utf8")) };
    }
    const me = { tab, sock: f.sock };
    const ok = (response = {}) => deliver(me, [joinRef, msgRef, topic, "phx_reply", { status: "ok", response }]);
    log.push({ tab: tabNo, topic, event, payload });
    if (event === "heartbeat") return ok();
    if (event === "phx_join") {
      const bindings = (payload.config?.postgres_changes ?? []).map((b) => ({ ...b, id: ++ref }));
      const m = { ...me, key: payload.config?.presence?.key || connKey, meta: null, bindings };
      members(topic).set(connKey, m);
      ok({ postgres_changes: bindings });
      if (payload.config?.presence?.enabled) {
        const state = {};
        for (const o of members(topic).values()) if (o.meta) (state[o.key] ??= { metas: [] }).metas.push(o.meta);
        deliver(m, [null, null, topic, "presence_state", state]);
      }
      return;
    }
    if (event === "phx_leave") { ok(); drop(topic, connKey); return; }
    const m = members(topic).get(connKey);
    if (!m) return;
    if (event === "presence" && payload.event === "track") {
      ok();
      const old = m.meta;
      m.meta = { ...payload.payload, phx_ref: `p${++ref}` };
      const diff = { joins: { [m.key]: { metas: [m.meta] } }, leaves: old ? { [m.key]: { metas: [old] } } : {} };
      for (const o of members(topic).values()) deliver(o, [null, null, topic, "presence_diff", diff]);
      return;
    }
    if (event === "broadcast") {
      for (const [k, o] of members(topic)) if (k !== connKey) deliver(o, [null, null, topic, "broadcast", payload]);
    }
  };

  let tabs = 0;
  return {
    log,
    /** Install on a harness tab (before it loads the app). */
    async attach(tab) {
      const tabNo = ++tabs;
      await tab.send("Runtime.enable");
      await tab.send("Runtime.addBinding", { name: "__rtSend" });
      tab.on("Runtime.bindingCalled", (p) => { if (p.name === "__rtSend") onFrame(tab, tabNo, p.payload); });
      await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: SHIM });
      return { disconnect() { for (const t of topics.keys()) for (const k of [...members(t).keys()]) if (k.startsWith(`${tabNo}:`)) drop(t, k); } };
    },
    /** Tell every page watching `table` that it changed (the app refetches on any change). */
    tableChanged(table) {
      for (const [topic, all] of topics) for (const m of all.values()) {
        const ids = m.bindings.filter((b) => b.table === table).map((b) => b.id);
        if (ids.length) deliver(m, [null, null, topic, "postgres_changes", { ids, data: { type: "UPDATE", schema: "public", table, commit_timestamp: new Date().toISOString(), columns: [], record: {}, old_record: {}, errors: null } }]);
      }
    },
    presence(topic) { return [...(topics.get(`realtime:${topic}`)?.values() ?? [])].map((m) => m.meta).filter(Boolean); },
  };
}
