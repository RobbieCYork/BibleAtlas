// Parser and pack checks on small invented snippets (no Bible text).  npm run test:bible-packs

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { bsbText, osis, usfx, zefania } from "./parsers.mjs";
import { BOOKS, gitBlobSha1, group, sha256, writePack } from "./pack.mjs";

const at = (rows) => rows.map((r) => `${r.book} ${r.chapter}:${r.verse} ${JSON.stringify(r.text)}`);

test("usfx: footnotes and cross references are left out, inner line breaks kept, apocrypha skipped", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>\r\n<usfx><book id="FRT"><p>front</p></book>
<book id="GEN"><h>Genesis</h><c id="1" /><p><v id="1" />Alpha<f caller="+"><fr>1:1 </fr><ft>note</ft></f> beta &amp; <w s="H1">gamma</w>.\r\n<ve /></p>
<q><v id="2" />Line one,</q>\r\n<q>line two.<x><xt>ref</xt></x><ve /></q></book>
<book id="TOB"><c id="1" /><v id="1" />skip<ve /></book></usfx>`;
  assert.deepEqual(at(usfx(xml)), ['1 1:1 "Alpha beta & gamma."', '1 1:2 "Line one,\\nline two."']);
});

test("osis: milestone and wrapping verses, notes left out", () => {
  const xml = `<?xml version="1.0"?><osis><osisText><div type="book" osisID="Ps"><chapter osisID="Ps.1">
<verse osisID="Ps.1.1" sID="Ps.1.1"/><w lemma="x">Alpha</w> <transChange type="added">is</transChange> beta<note type="study">margin</note>.<verse eID="Ps.1.1"/>
<verse osisID="Ps.1.2">Gamma <divineName>Delta</divineName>.</verse> outside
</chapter></div></osisText></osis>`;
  assert.deepEqual(at(osis(xml)), ['19 1:1 "Alpha is beta."', '19 1:2 "Gamma Delta."']);
});

test("zefania: text inside nested tags is kept, books numbered", () => {
  const xml = `<?xml version="1.0"?><XMLBIBLE><INFORMATION><format>Zefania XML Bible Markup Language</format></INFORMATION>
<BIBLEBOOK bnumber="66" bname="Revelation"><CHAPTER cnumber="1"><VERS vnumber="1">  Alpha <STYLE css="i">beta</STYLE>&#8217;s. </VERS></CHAPTER></BIBLEBOOK></XMLBIBLE>`;
  assert.deepEqual(at(zefania(xml)), ['66 1:1 "Alpha beta’s."']);
});

test("bsb text: notices kept aside, empty rows reported, names mapped", () => {
  const src = "A notice line\r\nVerse\tText\r\nPsalm 1:1\tAlpha “beta”.\r\nSong of Songs 1:1\tGamma\r\nMatthew 1:2\t\r\n";
  const r = bsbText(src, BOOKS.map((b) => b.name));
  assert.deepEqual(at(r.verses), ['19 1:1 "Alpha “beta”."', '22 1:1 "Gamma"']);
  assert.deepEqual(r.empty, ["Matthew 1:2"]);
  assert.equal(r.notices.length, 2);
});

const whole = () => BOOKS.flatMap((b, i) => Array.from({ length: b.chapters }, (_, c) => ({ book: i + 1, chapter: c + 1, verse: 1, text: "x" })));

test("a pack must be complete, ordered and free of markup", () => {
  assert.throws(() => group("t", whole().slice(1)), /has no verses/);
  assert.throws(() => group("t", [...whole(), { book: 66, chapter: 22, verse: 1, text: "again" }]), /out of order/);
  assert.throws(() => group("t", whole().map((v, i) => (i ? v : { ...v, text: "<b>x</b>" }))), /markup/);
});

test("pack files match the catalog, and the version follows the text", () => {
  const dir = mkdtempSync(join(tmpdir(), "bible-pack-test."));
  try {
    const a = writePack(dir, "web", whole());
    const bytes = readFileSync(join(dir, "web", "01.json"));
    assert.equal(sha256(bytes), a.books[0].sha256);
    assert.equal(bytes.length, a.books[0].bytes);
    assert.equal(a.books.length, 66);
    assert.equal(writePack(dir, "web", whole()).version, a.version);
    assert.notEqual(writePack(dir, "web", whole().map((v) => ({ ...v, text: "y" }))).version, a.version);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("git blob checksum matches git's", () => {
  assert.equal(gitBlobSha1(Buffer.from("hello\n")), "ce013625030ba8dba906f756967f9e9ca394464a");
});
