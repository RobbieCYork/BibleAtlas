/**
 * Worked example (b): the compact article header from commit 6b1290d on the Demons topic - one row,
 * icon-only Back, centred title, no "Concept" pill - in light and dark at 375px and 1280px.
 *   node scripts/signed-in-harness/run.mjs --persona member --script scripts/signed-in-harness/examples/article-header-compact.mjs
 */
import { openArticle } from "../lib/app.mjs";

const COMBOS = [
  { w: 375, h: 667, theme: "light" }, { w: 375, h: 667, theme: "dark" },
  { w: 1280, h: 800, theme: "light" }, { w: 1280, h: 800, theme: "dark" },
];

export default async function (h) {
  for (const { w, h: ht, theme } of COMBOS) {
    const tag = `${w}px ${theme}`;
    h.section(`Demons article, ${tag}`);
    await h.setViewport(w, ht);
    await h.setTheme(theme);
    await h.reload();
    await h.sleep(800);
    await openArticle(h, "Demons");

    const m = await h.evaluate(() => {
      const head = document.querySelector(".article-head");
      const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
      const back = head.querySelector(".back-btn");
      const h2 = head.querySelector("h2");
      const range = document.createRange(); range.selectNodeContents(h2);
      const textBox = range.getBoundingClientRect();
      const close = head.querySelector('[aria-label="Close article"]');
      const panel = head.closest(".person-panel");
      const pillTexts = [...panel.querySelectorAll("*")].filter((e) => e.children.length === 0 && /^concept$/i.test((e.textContent ?? "").trim()));
      return {
        theme: document.documentElement.dataset.theme,
        innerWidth: window.innerWidth,
        head: rect(head), back: back ? { ...rect(back), text: back.innerText.trim(), aria: back.getAttribute("aria-label"), icon: back.classList.contains("back-btn--icon") } : null,
        title: h2.innerText.trim(), titleCx: textBox.x + textBox.width / 2, titleCy: textBox.y + textBox.height / 2,
        close: close ? rect(close) : null,
        conceptPills: pillTexts.length, tierTags: panel.querySelectorAll(".person-tier-tag").length,
        subtitle: head.querySelector(".article-head-sub")?.innerText.trim() ?? null,
      };
    });

    h.assert(m.theme === theme && m.innerWidth === w, `emulation took: data-theme=${m.theme}, innerWidth=${m.innerWidth}`);
    h.assert(m.title === "Demons", `title is "${m.title}"`);
    h.assert(m.back?.icon && m.back.text === "" && m.back.aria === "Back" && m.back.w >= 40, `Back is icon-only: no visible text, aria-label "${m.back?.aria}", ${m.back?.w}px wide`);
    h.assert(Math.abs(m.titleCx - m.head.cx) <= 2, `title centred on the row (text centre ${m.titleCx.toFixed(1)} vs row centre ${m.head.cx.toFixed(1)})`);
    h.assert(m.head.h <= 80, `header is one row (${m.head.h.toFixed(0)}px tall incl. the muted subtitle "${m.subtitle}")`);
    // On a phone the Details tab has its own way out (Back / the tab bar), so no Close is drawn there.
    h.assert(w < 768 ? m.close === null : m.close && Math.abs(m.close.cy - m.back.cy) <= 2,
      w < 768 ? "phone: no Close button (Back is the way out)" : "Close and Back share one row");
    h.assert(m.conceptPills === 0 && m.tierTags === 0, `no Concept pill (${m.conceptPills}) and no tier tags (${m.tierTags}) in the article`);
    console.log("  screenshot (a hint, not evidence):", await h.screenshot(`demons-${w}-${theme}.png`));
  }
}
