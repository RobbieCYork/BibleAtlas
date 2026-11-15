/** Opens each game from Game Center under a skin and lists text under 3:1 contrast (dark-on-dark check).
 *  SKINS=midnight node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script this */
const SKINS = (process.env.SKINS ?? "midnight").split(",");
export default async function (h) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  for (const skin of SKINS) {
    await h.evaluate((s) => { try { localStorage.setItem("app-skin", s); } catch {} }, skin);
    await h.reload(); await h.sleep(1500);
    const names = [];
    for (let i = 0; i < 12; i++) {
      await h.reload(); await h.sleep(1200);
      if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
      else { await h.click('[aria-label^="Menu"]'); await h.sleep(250); await h.click({ css: ".panel-menu-link, .panel-menu-item", text: "Games" }); await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); }
      await h.sleep(900);
      const cards = await h.evaluate(() => [...document.querySelectorAll("button, [role=button]")].filter((b) => b.querySelector("h3, strong, .game-card-title") || /game|card/i.test(b.className)).filter((b) => b.getClientRects().length && b.innerText.length > 20).map((b) => b.innerText.split("\n")[0]));
      if (i >= cards.length) break;
      const name = cards[i]; names.push(name);
      await h.click({ css: "button, [role=button]", text: name }); await h.sleep(1200);
      const low = await h.evaluate(() => {
        const parse = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
        const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = parse(cs.backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
        const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const t = (n.textContent ?? "").trim(); const el = n.parentElement; if (t.length < 2 || !el.getClientRects().length) continue;
          const cs = getComputedStyle(el); const bg = bgOf(el); const fg = parse(cs.color); if (!bg || fg.length < 3) continue;
          const a = L(fg), b = L(bg), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          if (r < 3) out.push({ t: t.slice(0, 24), cls: el.className.toString().slice(0, 30), r: +r.toFixed(2) });
        }
        return out.slice(0, 6);
      });
      console.log(`  [${skin}] game "${name}": ${low.length ? JSON.stringify(low) : "no text under 3:1"}`);
      await h.screenshot(`${skin}-game${i}-${phone ? "phone" : "desktop"}.png`);
    }
    h.assert(names.length > 0, `${skin}: opened ${names.length} games`);
  }
}
