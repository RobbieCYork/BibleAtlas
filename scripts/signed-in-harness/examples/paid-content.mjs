/**
 * Capstone Plus phase 1 (sql/043, src/lib/paidContent.ts, PaidTeaser.tsx) on all five article kinds.
 *
 *   node scripts/paid-content/split.mjs          # writes the seed this script serves as content_paid
 *   PAID_CONTENT_SOURCE=server node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *     --script scripts/signed-in-harness/examples/paid-content.mjs
 *   (also --persona owner, guest, signedout; and without PAID_CONTENT_SOURCE for the bundle build)
 *
 * The fake backend serves `content_paid` rows from scripts/paid-content/out/content_paid.json — the
 * real generated seed — and answers has_entitlement() the way sql/043 would for the case under test.
 *
 * member / owner, entitled (the phase-1 switch ON):
 *   every article renders its paid sections and NO teaser; in a server build one has_entitlement call
 *   and content_paid reads by primary key; in a bundle build no request to either at all.
 *   DUMP=/path.json writes each article panel's outerHTML so builds can be diffed byte-for-byte.
 * member, gated (switch OFF, no entitlement): PaidTeaser at the cut in every article, the Bible
 *   references list still there, no paid text anywhere in the panel, no content_paid request, nothing
 *   wider than the viewport — in every skin (SKINS=...), light and dark. Screenshots per skin.
 * member, table missing (migration unapplied): "couldn't be loaded" + Try again, which recovers.
 * guest / signedout: the sign-in gate, and not one request for paid content.
 *
 * What this cannot prove: the real RLS (sql/tests/043_paid_content_test.sql does), real auth.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MODE = process.env.PAID_CONTENT_SOURCE || JSON.parse(fs.readFileSync(path.join(REPO, "paid-content.config.json"), "utf8")).appSource;
const SKINS = (process.env.SKINS ?? "default,sticker,clarity,midnight,sage,skyreader,trailhead,highlighter").split(",");

const ARTICLES = [
  { kind: "topic", id: "demons", name: "Demons" },
  { kind: "person", id: "abraham", name: "Abraham" },
  { kind: "place", id: "jerusalem", name: "Jerusalem" },
  { kind: "site", id: "caesarea-maritima", name: "Caesarea Maritima" },
  { kind: "event", id: "bib-prim-creation", name: "Creation of the Heavens and Earth" },
];

const SEED = JSON.parse(fs.readFileSync(path.join(REPO, "scripts/paid-content/out/content_paid.json"), "utf8"));
const bodyOf = (kind, id) => SEED.find((r) => r.kind === kind && r.id === id)?.body;

/** The one free lead line a gated place/site shows by design (paidContentSpec placeLead/siteLead):
 * a place's first notable fact, the first ~140 characters of a site's description. */
function freeLead(kind, id) {
  const b = bodyOf(kind, id);
  if (kind === "place") return b?.history?.notableFacts?.[0] ?? "";
  if (kind === "site") return (b?.description ?? "").replace(/\s+/g, " ").slice(0, 120);
  return "";
}

/** Long paid sentences from the record, to prove they are NOT on screen when gated (minus the lead). */
function paidSample(kind, id) {
  const b = bodyOf(kind, id);
  const strings = [];
  (function walk(v) {
    if (typeof v === "string") strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  })(b);
  const lead = freeLead(kind, id);
  return strings
    .filter((s) => s.length > 60 && !/^https?:/.test(s))
    .filter((s) => !(lead && (s === lead || lead.startsWith(s.replace(/\s+/g, " ").slice(0, 40)))))
    .map((s) => s.slice(0, 40));
}

async function openByExactName(h, name) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  if (phone) await h.click({ css: ".mobile-tab", text: "Articles" });
  else if (!(await h.exists(".articles-search input"))) {
    await h.click('[aria-label^="Menu"]');
    await h.click({ css: ".panel-menu-item", text: "Articles" });
    await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  }
  await h.type(".articles-search input", name);
  await h.sleep(250);
  const index = await h.evaluate(
    (n) => [...document.querySelectorAll(".articles-result-row")].findIndex((r) => r.querySelector(".articles-result-name")?.textContent.trim() === n),
    name,
  );
  if (index < 0) throw new Error(`no Articles row named exactly "${name}"`);
  await h.click(".articles-result-row", { index });
  await h.waitFor(".article-head");
}

/** Wait until the panel is no longer in its loading state (max ~5s). */
async function settle(h) {
  for (let i = 0; i < 50; i++) {
    if (!(await h.exists(".paid-teaser--loading"))) return;
    await h.sleep(100);
  }
}

const readPanel = (h) =>
  h.evaluate(() => {
    const head = document.querySelector(".article-head");
    const panel = head?.closest(".location-panel");
    if (!panel) return null;
    const vw = window.innerWidth;
    const teaser = panel.querySelector(".paid-teaser");
    const tr = teaser?.getBoundingClientRect();
    const tooWide = [...panel.querySelectorAll("*")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
    }).length;
    return {
      html: panel.outerHTML,
      text: panel.innerText,
      teaser: teaser ? { cls: teaser.className, h4: teaser.querySelector("h4")?.innerText ?? null, text: teaser.innerText, left: tr.left, right: tr.right, width: tr.width } : null,
      verseList: !!panel.querySelector(".verse-list:not(.quote-list)"),
      scriptureRefs: [...panel.querySelectorAll(".sources-section h4")].some((x) => x.innerText.trim().toLowerCase() === "references"),
      historySections: panel.querySelectorAll(".history-section .history-field h4, .archaeology-section, .extra-biblical-section").length,
      lastIsReadToggle: panel.lastElementChild?.classList.contains("article-mark-read") ?? false,
      docOverflow: document.documentElement.scrollWidth - vw,
      panelOverflow: panel.scrollWidth - panel.clientWidth,
      tooWide,
      vw,
    };
  });

const paidRequests = (h, from = 0) => {
  const r = h.requests.slice(from);
  return {
    rows: r.filter((x) => x.path.startsWith("/rest/v1/content_paid")),
    ent: r.filter((x) => x.path.startsWith("/rest/v1/rpc/has_entitlement")),
  };
};

async function entitled(h, label) {
  h.section(`${label}: entitled (phase-1 switch ON), ${MODE} build`);
  h.backend.setTable("content_paid", SEED);
  h.backend.setRpc("has_entitlement", () => true);
  const dump = {};
  for (const art of ARTICLES) {
    await h.reload();
    await h.sleep(700);
    const mark = h.requests.length;
    await openByExactName(h, art.name);
    await settle(h);
    await h.sleep(300);
    const s = await readPanel(h);
    const req = paidRequests(h, mark);
    dump[`${art.kind}:${art.id}`] = s.html;
    h.assert(!s.teaser, `${art.kind} ${art.name}: no teaser, full article shown`);
    h.assert(s.historySections > 0 || art.kind === "event", `${art.kind}: paid sections rendered (${s.historySections} headed blocks)`);
    const sample = paidSample(art.kind, art.id)[0];
    h.assert(!sample || s.text.includes(sample.slice(0, 25)) || s.html.includes(sample.slice(0, 25)), `${art.kind}: paid text on screen ("${sample?.slice(0, 25)}…")`);
    h.assert(s.lastIsReadToggle, `${art.kind}: "Mark this article as read" is still the last thing`);
    if (MODE === "server") {
      h.assert(req.rows.length === 1 && req.rows[0].path.includes(`kind=eq.${art.kind}`) && req.rows[0].path.includes(art.id),
        `${art.kind}: one content_paid read by primary key (${req.rows.map((r) => r.path).join(" | ")})`);
      h.assert(req.ent.length <= 1, `${art.kind}: at most one has_entitlement call (${req.ent.length})`);
    } else {
      h.assert(req.rows.length === 0 && req.ent.length === 0, `${art.kind}: bundle build asks the server nothing (${req.rows.length} rows, ${req.ent.length} rpc)`);
    }
    h.assert(s.docOverflow <= 0, `${art.kind}: no horizontal page scroll (${s.docOverflow}px)`);
  }
  if (process.env.DUMP) {
    fs.writeFileSync(process.env.DUMP, JSON.stringify(dump, null, 1));
    console.log(`  dumped ${Object.keys(dump).length} panels to ${process.env.DUMP}`);
  }
}

async function gated(h) {
  h.backend.setRpc("has_entitlement", () => false);
  h.backend.setTable("content_paid", []); // what RLS returns to a non-entitled reader
  for (const theme of ["light", "dark"]) {
    for (const skin of SKINS) {
      h.section(`member: gated (switch OFF), skin ${skin}, ${theme}, ${h.viewport}`);
      await h.evaluate(([sk, th]) => {
        try {
          if (sk === "default") localStorage.removeItem("app-skin");
          else localStorage.setItem("app-skin", sk);
          localStorage.setItem("app-theme", th);
        } catch {}
      }, [skin, theme]);
      for (const art of ARTICLES) {
        // Skins are long runs; check every article in default/light and the two most different
        // articles (topic with facts, event with references) everywhere else.
        if (!(skin === "default" && theme === "light") && !["topic", "event", "place"].includes(art.kind)) continue;
        await h.reload();
        await h.sleep(700);
        const mark = h.requests.length;
        await openByExactName(h, art.name);
        await settle(h);
        await h.sleep(250);
        const s = await readPanel(h);
        const req = paidRequests(h, mark);
        const skinNow = await h.evaluate(() => document.documentElement.getAttribute("data-skin"));
        const tag = `${art.kind} [${skin}/${theme}]`;
        h.assert(skin === "default" ? skinNow === null : skinNow === skin, `${tag}: skin applied (${skinNow})`);
        h.assert(!!s.teaser && !/loading|message/.test(s.teaser.cls) && s.teaser.h4?.toLowerCase() === "continue with capstone plus",
          `${tag}: upgrade teaser at the cut ("${s.teaser?.h4}")`);
        h.assert(/coming soon/i.test(s.teaser?.text ?? ""), `${tag}: no dead Upgrade button in phase 1 (says coming soon)`);
        const leaked = paidSample(art.kind, art.id).filter((x) => s.text.includes(x.slice(0, 30)) || s.html.includes(x.slice(0, 30)));
        h.assert(leaked.length === 0, `${tag}: no paid text in the panel (${leaked.length} leaked${leaked.length ? `: "${leaked[0]}"` : ""})`);
        if (art.kind === "event") h.assert(s.scriptureRefs, `${tag}: Scripture references still free`);
        else if (art.kind !== "site") h.assert(s.verseList, `${tag}: Bible references list still free`);
        h.assert(req.rows.length === 0, `${tag}: no content_paid request when not entitled (${req.rows.length})`);
        h.assert(s.teaser && s.teaser.left >= 0 && s.teaser.right <= s.vw + 0.5, `${tag}: teaser inside the viewport (${s.teaser?.left?.toFixed(0)}–${s.teaser?.right?.toFixed(0)} of ${s.vw})`);
        h.assert(s.docOverflow <= 0 && s.panelOverflow <= 0, `${tag}: no horizontal overflow (page ${s.docOverflow}px, panel ${s.panelOverflow}px)`);
        h.assert(s.lastIsReadToggle, `${tag}: read checkbox still last`);
        if (skin === "default" && theme === "light") {
          await h.evaluate(() => document.querySelector(".paid-teaser")?.scrollIntoView({ block: "center", behavior: "instant" }));
          await h.sleep(200);
          await h.screenshot(`gated-${art.kind}-${skin}-${theme}.png`);
        } else if (art.kind === "topic") {
          await h.evaluate(() => document.querySelector(".paid-teaser")?.scrollIntoView({ block: "center", behavior: "instant" }));
          await h.sleep(200);
          await h.screenshot(`gated-${art.kind}-${skin}-${theme}.png`);
        }
      }
    }
  }
  await h.evaluate(() => {
    try {
      localStorage.removeItem("app-skin");
      localStorage.setItem("app-theme", "light");
    } catch {}
  });
}

async function unavailable(h) {
  h.section("member: entitled but content_paid missing (migration unapplied) -> message + Try again");
  h.backend.setRpc("has_entitlement", () => true);
  h.backend.setTable("content_paid", SEED);
  h.backend.setTableError("content_paid", { status: 404, code: "42P01", message: 'relation "public.content_paid" does not exist' });
  await h.reload();
  await h.sleep(700);
  await openByExactName(h, "Demons");
  await settle(h);
  let s = await readPanel(h);
  h.assert(s.teaser?.cls.includes("paid-teaser--message") && /couldn't be loaded/.test(s.teaser.text), `message shown ("${s.teaser?.text.replace(/\s+/g, " ")}")`);
  h.backend.setTableError("content_paid", null);
  await h.click({ css: ".paid-teaser-button", text: "Try again" });
  await settle(h);
  await h.sleep(300);
  s = await readPanel(h);
  h.assert(!s.teaser && s.historySections > 0, "Try again recovers and renders the article");
}

export default async function (h) {
  if (h.persona === "guest" || h.persona === "signedout") {
    h.section(`${h.persona}: never reaches an article, never asks for paid content`);
    await h.sleep(1500);
    const gate = await h.exists(".auth-gate, .auth-card, form");
    h.assert(gate, "sign-in gate shown");
    const req = paidRequests(h, 0);
    h.assert(req.rows.length === 0 && req.ent.length === 0, `no content_paid / has_entitlement requests (${req.rows.length}, ${req.ent.length})`);
    return;
  }
  await entitled(h, h.persona);
  if (MODE === "server" && h.persona === "member") {
    await gated(h);
    await unavailable(h);
  }
}
