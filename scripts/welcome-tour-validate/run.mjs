#!/usr/bin/env node
/**
 * Does the welcome tour still describe the app? Runs inside `vite build` and by hand:
 *
 *   npm run validate:welcome-tour
 *
 * `tsc -b` already refuses a feature flag, code switch, menu destination, My Notes tab or Articles
 * section with no coverage entry (the tables at the foot of src/data/welcomeTour.ts). This covers
 * what types cannot see:
 *   1. every coverage entry and step points at a step that exists;
 *   2. every highlight anchor is still put on an element by a component;
 *   3. the on-screen wording each step quotes is still in the file it names;
 *   4. every row of the main menus and the account menu carries a `data-menu` key that the tour
 *      covers, so a new hand-written row cannot slip past.
 *
 * It does not type-check and does not run the app. `npm run build` and the harness script
 * scripts/signed-in-harness/examples/welcome-tour.mjs answer those.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { loadTour } from "./load.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const faults = [];
const fault = (message) => faults.push(message);
const squash = (s) => s.replace(/\s+/g, " ");
const read = (file) => readFileSync(join(ROOT, "src", file), "utf8");

const tour = await loadTour(ROOT);
const { TOUR_STEPS: steps, TOUR_ANCHORS, TOUR_PLACEHOLDERS, MENU_COVERAGE } = tour;

// 1. Steps and coverage.
const ids = steps.map((s) => s.id);
for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) fault(`two steps share the id "${id}"`);
for (const table of ["FEATURE_COVERAGE", "SWITCH_COVERAGE", "MENU_COVERAGE", "NOTES_TAB_COVERAGE", "ARTICLE_SECTION_COVERAGE"]) {
  for (const [key, value] of Object.entries(tour[table])) {
    if (typeof value === "string") {
      if (!ids.includes(value)) fault(`${table}.${key} names step "${value}", which does not exist`);
    } else if (!(value.skip ?? value.off)?.trim()) fault(`${table}.${key} is excluded without a reason`);
  }
}
// A feature said to be covered by a step must be one that step actually waits for.
for (const [key, id] of Object.entries(tour.FEATURE_COVERAGE)) {
  const s = steps.find((x) => x.id === id);
  if (!s) continue;
  const named = [...(s.features ?? []), ...(s.anyFeature ?? []), ...(s.extras ?? []).flatMap((e) => e.anyFeature)];
  if (!named.includes(key)) fault(`FEATURE_COVERAGE.${key} names step "${id}", but that step never checks the flag`);
}
for (const s of steps) {
  const text = [s.title, s.body, ...(s.extras ?? []).map((e) => e.text)].join(" ");
  for (const [, name] of text.matchAll(/\{(\w+)\}/g))
    if (!TOUR_PLACEHOLDERS.includes(name)) fault(`step "${s.id}" uses the unknown placeholder {${name}}`);
}

// 2. Anchors.
const componentFiles = ["App.tsx", ...readdirSync(join(ROOT, "src/components")).filter((f) => f.endsWith(".tsx") && f !== "WelcomeTour.tsx").map((f) => `components/${f}`)];
const components = componentFiles.map(read).join("\n");
const anchorValues = Object.values(TOUR_ANCHORS);
for (const [key, value] of Object.entries(TOUR_ANCHORS))
  if (!components.includes(`data-tour={TOUR_ANCHORS.${key}}`)) fault(`no component carries data-tour={TOUR_ANCHORS.${key}} (anchor "${value}")`);
if (!read("components/MobileTabBar.tsx").includes("data-tour={tabAnchor(key)}")) fault("MobileTabBar.tsx no longer puts data-tour={tabAnchor(key)} on its buttons");
for (const s of steps)
  for (const a of [...(s.anchors?.phone ?? []), ...(s.anchors?.desktop ?? [])])
    if (!anchorValues.includes(a) && !(a.startsWith("tab-") && a.slice(4) in MENU_COVERAGE)) fault(`step "${s.id}" rings "${a}", which is not an anchor`);

// 3. Quoted wording.
for (const s of steps) {
  for (const { file, text } of s.names ?? []) {
    if (!existsSync(join(ROOT, "src", file))) fault(`step "${s.id}" names src/${file}, which does not exist`);
    else if (!squash(read(file)).includes(squash(text))) fault(`step "${s.id}" relies on \`${text}\`, which is no longer in src/${file}`);
  }
}

// 4. Menu rows.
const MENUS = [
  { file: "components/MobileNavMenu.tsx", rows: ["mobile-nav-menu-item"] },
  { file: "components/PanelMenu.tsx", rows: ["panel-menu-link", "panel-menu-item"] },
  { file: "components/AuthButton.tsx", rows: ["auth-menu-item", "auth-identity-link"] },
  { file: "components/MobileTabBar.tsx", rows: ["mobile-tab"] },
];
for (const { file, rows } of MENUS) {
  const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let seen = 0;
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const get = (name) => attrs.find((a) => a.name.getText(sf) === name)?.initializer;
      const classes = (get("className")?.getText(sf) ?? "").split(/[^\w-]+/);
      if (rows.some((r) => classes.includes(r))) {
        seen++;
        const menu = get("data-menu");
        const at = `${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
        if (!menu) fault(`${at} is a menu row with no data-menu key. Add one, and cover it in MENU_COVERAGE (src/data/welcomeTour.ts).`);
        else if (ts.isStringLiteral(menu) && !(menu.text in MENU_COVERAGE)) fault(`${at} data-menu="${menu.text}" has no entry in MENU_COVERAGE`);
        // data-menu={key}: the key's type is one MENU_COVERAGE is checked against by tsc.
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!seen) fault(`${file}: found no menu rows (${rows.join(", ")}). Update MENUS in scripts/welcome-tour-validate/run.mjs.`);
}

if (faults.length) {
  console.error(`welcome-tour-validate: ${faults.length} fault(s)\n  - ${faults.join("\n  - ")}`);
  console.error("The welcome tour is src/data/welcomeTour.ts. Update it in the same change as the app.");
  process.exit(1);
}
if (!quiet) console.log(`welcome-tour-validate ok: ${steps.length} steps, ${anchorValues.length} anchors, ${steps.flatMap((s) => s.names ?? []).length} quoted strings`);
