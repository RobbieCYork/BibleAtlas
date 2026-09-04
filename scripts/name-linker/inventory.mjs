#!/usr/bin/env node
// What the linker knows, and what it registers but can never reach.
//
//   node scripts/name-linker/inventory.mjs           counts + the unreachable keys
//   node scripts/name-linker/inventory.mjs --all     every key and what it resolves to
//
// A key is UNREACHABLE when feeding the linker that exact string back does not produce a
// whole-string match. That happens when the name contains punctuation the `\b` word boundaries in
// NAME_PATTERN cannot sit against — most often a closing bracket, e.g. "Nathan (Prophet)". Such a
// key is dead weight: it is in the data, it looks like it works, and it can never fire.

import { loadLinker } from "./loadLinker.mjs";

const showAll = process.argv.includes("--all");
const { computeLinkAnnotations, locations, pois, people, topics, timelineEvents } = await loadLinker();

const raw = [];
const push = (n, id, kind) => raw.push({ name: n, id, kind });
locations.forEach((l) => { push(l.name, l.id, "location"); (l.alternateNames ?? []).forEach((a) => push(a, l.id, "location")); });
pois.forEach((p) => { push(p.name, p.id, "poi"); (p.alternateNames ?? []).forEach((a) => push(a, p.id, "poi")); });
people.forEach((p) => { push(p.name, p.id, "person"); (p.alternateNames ?? []).forEach((a) => push(a, p.id, "person")); });
topics.forEach((t) => { push(t.name, t.id, "topic"); (t.alternateNames ?? []).forEach((a) => push(a, t.id, "topic")); });
timelineEvents.forEach((e) => push(e.title, e.id, "timeline"));

const keys = new Map();
for (const r of raw) if (!keys.has(r.name.toLowerCase())) keys.set(r.name.toLowerCase(), r);

const dead = [];
const live = [];
for (const r of keys.values()) {
  const anns = computeLinkAnnotations(r.name);
  const whole = anns.find((a) => a.start === 0 && a.end === r.name.length);
  (whole ? live : dead).push({ ...r, resolvesTo: whole?.id ?? null, resolvedKind: whole?.kind ?? null });
}

console.log(`records:   ${locations.length} locations, ${pois.length} POIs, ${people.length} people, ` +
  `${topics.length} topics, ${timelineEvents.length} timeline events`);
console.log(`raw name entries: ${raw.length}   distinct lookup keys: ${keys.size}`);
console.log(`reachable: ${live.length}   UNREACHABLE: ${dead.length}\n`);

const byKind = {};
for (const d of dead) (byKind[d.kind] ??= []).push(d);
for (const kind of Object.keys(byKind).sort()) {
  console.log(`--- unreachable ${kind} (${byKind[kind].length}) ---`);
  for (const d of byKind[kind]) console.log(`  ${JSON.stringify(d.name).padEnd(52)} ${d.id}`);
  console.log("");
}

if (showAll) {
  console.log("--- every reachable key ---");
  for (const l of live.sort((a, b) => a.name.localeCompare(b.name))) {
    const redirected = l.resolvesTo !== l.id ? `   (shadowed; declared ${l.id})` : "";
    console.log(`  ${l.name.padEnd(44)} ${l.resolvedKind}\t${l.resolvesTo}${redirected}`);
  }
}
