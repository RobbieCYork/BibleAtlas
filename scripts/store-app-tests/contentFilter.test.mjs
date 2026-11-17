import { load, check, done } from "./bundle.mjs";
const f = await load("src/lib/contentFilter.ts");
const bad = ["you are a fuck", "FUCK", "f.u.c.k you", "f u c k", "fuuuuck", "fvck".replace("v", "u"), "sh1t", "what a b1tch", "kill yourself now", "n1gger", "$hit", "a$$hole".replace("$$", "ss"), "mother-fucker", "go f-u-c-k yourself"];
const good = [
  "The cock crowed three times and Peter wept", "Go to hell, said no one; Sheol is not hell", "Dick Van Dyke", "Scunthorpe United", "Cummings family", "Assyria and Bathsheba",
  "John 3:16 and 1 Cor 13:4-7", "Psalm 119:105 $100 offering", "Hosea married a harlot as a sign", "class assignment", "the 3 shepherds", "Fagin's gang... Hancock", "grass", "passage", "Titus 2:3", "bastion", "For a bastard shall not enter the congregation (KJV Deut 23:2)", "the great whore that sitteth upon many waters (Rev 17:1 KJV)",
];
// A few of those good ones intentionally contain listed words only where unavoidable; tune expectations explicitly:
const knownBlocked = new Set();
for (const t of bad) check("blocks: " + t, f.checkContent(t).ok === false);
for (const t of good) { if (knownBlocked.has(t)) continue; check("allows: " + t, f.checkContent(t).ok === true); }
check("message differs for names", f.checkContent("fuck", "name").message.includes("name") && !f.checkContent("fuck").message.includes("name"));
check("empty is fine", f.checkContent("").ok && f.checkContent("   ").ok);
done();
