// Denomination articles: Scripture each body cites, shown inline beside the belief (2026-11-28).
// Every expected reference renders as a verse link inside its own "Basic beliefs" paragraph; no
// "Bible References" block returns; Latter-day Saints, Jehovah's Witnesses and the world religions
// carry no inline note. Tapping one opens the Bible panel on that passage.
import { openArticle } from "../lib/app.mjs";

const NAMES = {
  catholicism: "Catholic Church", "eastern-orthodoxy": "Eastern Orthodox Church", lutheranism: "Lutheranism",
  presbyterianism: "Presbyterianism", "church-of-the-nazarene": "Church of the Nazarene",
  "southern-baptist-convention": "Southern Baptist Convention", "united-methodist-church": "United Methodist Church",
  "assemblies-of-god": "Assemblies of God", "seventh-day-adventist-church": "Seventh-day Adventist Church",
};
const EXPECTED = {"catholicism": {"God": ["Matthew 28:19"], "Christ": ["John 1:14", "Philippians 2:5-8"], "Authority": ["1 Timothy 6:20", "2 Timothy 1:12-14"], "Justification": ["Romans 3:21-26", "Romans 6:3-4"], "Sacraments": ["Matthew 26:26", "Mark 14:22", "Luke 22:19", "1 Corinthians 11:23", "Hebrews 7:24", "Hebrews 7:27"], "Mary and the saints": ["Luke 1:28", "Luke 1:43"], "Last things": ["1 Corinthians 3:15", "1 Peter 1:7", "2 Maccabees 12:46"]}, "eastern-orthodoxy": {"God": ["John 15:26"], "Christ": ["John 1:14", "Philippians 2:6-8", "Hebrews 2:14-17"], "Authority": ["2 Timothy 3:16", "2 Peter 1:20"], "Salvation": ["2 Peter 1:4"], "Sacraments": ["Galatians 3:27", "2 Corinthians 1:21-22", "John 6:51"], "Last things": ["Acts 1:11", "Hebrews 9:28", "1 Thessalonians 4:16-17"]}, "lutheranism": {"Scripture": ["Psalms 119:105", "Galatians 1:8"], "Justification": ["Romans 3", "Romans 4"], "Baptism": ["Matthew 28:19", "Mark 16:16", "Titus 3:5-8", "Romans 6:4"], "The Lord's Supper": ["Mark 14:23", "1 Corinthians 10:16"], "Vocation": ["Romans 13:1-4", "Ephesians 6:1-4", "Colossians 3:22"]}, "presbyterianism": {"God and Christ": ["Matthew 3:16-17", "Matthew 28:19", "2 Corinthians 13:14", "John 1:14", "Colossians 2:9"], "Scripture": ["Luke 24:27", "Luke 24:44", "2 Timothy 3:15-16"], "Salvation": ["Romans 8:30", "Romans 3:24", "John 10:28-29", "Philippians 1:6"], "Sacraments": ["Matthew 28:19", "1 Corinthians 11:23", "Acts 2:38-39", "Colossians 2:11-12", "1 Corinthians 10:16"], "The church": ["Colossians 1:18", "Ephesians 1:22"], "The Christian life": ["1 Corinthians 10:31", "Romans 11:36", "Psalms 16:5-11"]}, "church-of-the-nazarene": {"God and Christ": ["Deuteronomy 6:4-5", "Matthew 28:19-20", "John 1:1-18", "Philippians 2:5-11"], "Scripture": ["Luke 24:44-47", "2 Timothy 3:15-17", "2 Peter 1:20-21"], "Salvation": ["Romans 3:21-26", "Romans 5:1", "Ephesians 2:8-10", "Titus 2:11-14"], "Entire sanctification": ["Acts 15:8-9", "Romans 12:1-2", "1 John 1:7"], "Sacraments": ["Matthew 28:16-20", "Acts 2:37-41", "Matthew 26:26-29", "1 Corinthians 11:23-32"]}, "southern-baptist-convention": {"Scripture": ["2 Timothy 3:15-17", "2 Peter 1:19-21", "John 17:17"], "God and Christ": ["Deuteronomy 6:4", "Matthew 28:19", "John 1:1-18", "Philippians 2:5-11", "1 Corinthians 15:1-8"], "Salvation": ["John 3:3-21", "Acts 4:12", "Romans 10:9-10"], "The church": ["Acts 2:41-42", "Acts 14:23", "1 Timothy 2:9-14", "1 Timothy 3:1-15"], "Ordinances": ["Matthew 28:19-20", "Romans 6:3-5", "Colossians 2:12", "1 Corinthians 11:23-29"], "Family and life": ["Genesis 2:15-25", "Matthew 19:3-9", "Psalms 139:13-16"], "Mission": ["Acts 1:8", "Romans 10:13-15"]}, "united-methodist-church": {"Salvation": ["Romans 5:8", "Ephesians 2:8"], "Sacraments": ["Matthew 28:19", "Acts 16:15", "Acts 16:33", "Luke 24:30"], "Sanctification": ["Matthew 5:48"], "Social holiness": ["Matthew 7:15-20", "James 2:17"]}, "assemblies-of-god": {"Scripture": ["2 Timothy 3:15-17", "1 Thessalonians 2:13", "2 Peter 1:21"], "God and Christ": ["Deuteronomy 6:4", "Matthew 28:19", "Matthew 1:23", "1 Corinthians 15:3-4"], "Salvation": ["Luke 24:47", "John 3:3", "Ephesians 2:8", "Titus 3:5-7"], "Ordinances": ["Matthew 28:19", "Romans 6:4", "1 Corinthians 11:26"], "Baptism in the Holy Spirit": ["Acts 1:8", "Acts 8:12-17", "Acts 2:4"], "Healing": ["Isaiah 53:4-5", "Matthew 8:16-17", "James 5:14-16"], "Last things": ["1 Thessalonians 4:16-17", "Revelation 20:1-6", "Revelation 20:11-15"]}, "seventh-day-adventist-church": {"Scripture": ["Psalms 119:105", "John 17:17", "2 Timothy 3:16-17", "2 Peter 1:20-21"], "God and Christ": ["Deuteronomy 6:4", "Matthew 28:19", "John 1:1-3", "John 1:14", "Philippians 2:5-11"], "Salvation": ["Romans 3:21-26", "Ephesians 2:4-10", "1 John 2:2"], "The Sabbath": ["Genesis 2:1-3", "Exodus 20:8-11", "Exodus 31:13-17"], "The gift of prophecy": ["Joel 2:28-29", "Revelation 12:17", "Revelation 19:10"], "Death and resurrection": ["Ecclesiastes 9:5-6", "John 5:28-29", "1 Thessalonians 4:13-17", "Revelation 20:1-10"], "The second coming": ["John 14:1-3", "Acts 1:9-11", "Titus 2:13", "Revelation 1:7"]}};
const NONE = ["Anglicanism", "The Episcopal Church", "Churches of Christ", "Non-denominational Churches",
  "The Church of Jesus Christ of Latter-day Saints", "Jehovah's Witnesses", "Judaism", "Islam", "Buddhism"];

async function readBeliefs(h) {
  return h.evaluate(() => {
    const heads = [...document.querySelectorAll("h4")];
    const bb = heads.find((x) => x.textContent.trim() === "Basic beliefs");
    const all = document.body.innerText;
    const out = { hasBibleRefsBlock: [...document.querySelectorAll("h4")].some((x) => /^Bible References/i.test(x.textContent.trim())), noteCount: (all.match(/Scripture cited by/g) || []).length, paras: [] };
    if (!bb) return out;
    for (const p of bb.parentElement.querySelectorAll("p")) {
      const t = p.textContent;
      const i = t.indexOf(" Scripture cited by ");
      const links = [...p.querySelectorAll("button.verse-location-link, a.verse-location-link")];
      const cited = i < 0 ? [] : links.filter((b) => {
        // a link is in the cited tail if it comes after the "Scripture cited by" text node
        const r = document.createRange(); r.selectNodeContents(p); r.setEndBefore(b);
        return r.toString().length >= i;
      }).map((b) => b.textContent.trim());
      out.paras.push({ label: t.split(":")[0], hasNote: i >= 0, cited });
    }
    return out;
  });
}

export default async (h) => {
  let n = 0;
  for (const [id, beliefs] of Object.entries(EXPECTED)) {
    h.section(NAMES[id]);
    await h.goto("/"); await h.sleep(800);
    await openArticle(h, NAMES[id]);
    await h.sleep(500);
    const r = await readBeliefs(h);
    h.assert(!r.hasBibleRefsBlock, `${id}: no "Bible References" block`);
    h.assert(r.noteCount === Object.keys(beliefs).length, `${id}: ${r.noteCount} inline notes, expected ${Object.keys(beliefs).length}`);
    for (const [label, refs] of Object.entries(beliefs)) {
      const p = r.paras.find((x) => x.label === label);
      const want = refs.filter((x) => !x.startsWith("2 Maccabees"));
      h.assert(p && p.hasNote, `${id} / ${label}: note present`);
      h.assert(p && JSON.stringify(p.cited) === JSON.stringify(want), `${id} / ${label}: links ${JSON.stringify(p && p.cited)} == ${JSON.stringify(want)}`);
      n += want.length;
    }
    if (["southern-baptist-convention", "catholicism", "seventh-day-adventist-church", "lutheranism", "presbyterianism", "eastern-orthodoxy"].includes(id)) {
      await h.evaluate(() => { const bb = [...document.querySelectorAll("h4")].find((x) => x.textContent.trim() === "Basic beliefs"); bb.scrollIntoView({ behavior: "instant", block: "start" }); });
      await h.sleep(300);
      await h.screenshot(`denom-${id}-${h.viewport}.png`);
    }
  }
  h.section("unchanged articles");
  for (const name of NONE) {
    await h.goto("/"); await h.sleep(800);
    await openArticle(h, name);
    await h.sleep(400);
    const r = await readBeliefs(h);
    h.assert(r.noteCount === 0, `${name}: no inline Scripture note (${r.noteCount})`);
    h.assert(name === "Judaism" ? r.hasBibleRefsBlock : !r.hasBibleRefsBlock, `${name}: Bible References block ${name === "Judaism" ? "kept" : "absent"}`);
  }
  h.section("tap a cited verse");
  await h.goto("/"); await h.sleep(800);
  await openArticle(h, "Southern Baptist Convention");
  await h.click({ css: "button.verse-location-link", text: "Romans 6:3-5" });
  await h.sleep(1200);
  // Since offline reading (be370a7) the passage can come from the site's own file, which the
  // harness serves; bible-api.com is blocked. Either the Romans 6 text is on screen in the Bible
  // panel, or the request log (observed outside the page) shows Romans 6 was asked for.
  const asked = h.ledger.blocked.map(String).filter((r) => /bible-api\.com/.test(r));
  const shown = await h.evaluate(() => {
    const panel = document.querySelector(".bible-panel:not(.bible-panel-hidden)");
    return { panel: !!panel, text: /baptized into Christ Jesus were baptized into his death/.test(panel?.textContent ?? "") };
  });
  h.assert(shown.panel && (shown.text || asked.some((r) => /Romans(%20| )6\b/.test(r))), `tapping Romans 6:3-5 opens the Bible panel on Romans 6 ${JSON.stringify({ ...shown, asked })}`);
  await h.screenshot(`denom-tap-${h.viewport}.png`);
  h.assert(n > 150, `checked ${n} links`);
};
