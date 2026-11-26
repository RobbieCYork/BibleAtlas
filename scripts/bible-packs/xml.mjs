// A small streaming XML reader, enough for the Bible source files (USFX, OSIS, Zefania) with no npm
// dependency. It reports what Nokogiri's SAX parser reports to bible-api.com's importer: element
// starts, element ends and character data. Comments, processing instructions, the doctype and CDATA
// sections produce no characters, exactly as there.

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeEntities(s) {
  return s.replace(/&([^;&\s]+);/g, (whole, name) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (name in NAMED) return NAMED[name];
    throw new Error(`unknown XML entity ${whole}`);
  });
}

const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>|<\/\s*([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/y;

export function parseXml(source, { start, end, text }) {
  // XML end-of-line normalisation: CRLF and lone CR become LF before anything is read.
  const xml = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  TOKEN.lastIndex = 0;
  let at = 0;
  while (at < xml.length) {
    TOKEN.lastIndex = at;
    const m = TOKEN.exec(xml);
    if (!m) throw new Error(`XML could not be read at character ${at}: ${JSON.stringify(xml.slice(at, at + 60))}`);
    at = TOKEN.lastIndex;
    if (m[1] !== undefined) end(m[1]);
    else if (m[2] !== undefined) {
      const attrs = {};
      for (const a of m[3].matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = decodeEntities(a[2] ?? a[3]);
      start(m[2], attrs);
      if (m[4]) end(m[2]);
    } else if (m[5] !== undefined) text(decodeEntities(m[5]));
  }
}
