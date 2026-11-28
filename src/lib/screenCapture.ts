/**
 * A picture of the screen, taken the instant a reader asks to report a problem.
 *
 * A web page cannot take an operating-system screenshot (getDisplayMedia asks the reader to pick a
 * screen, and iOS has none), so this RE-RENDERS the page: it copies the live document, inlines the
 * stylesheets, fonts and images it was drawn with, wraps it in an SVG <foreignObject>, and lets the
 * browser rasterise that onto a canvas. No library: everything here is the platform.
 *
 * TWO PHASES, and the split is the point.
 *
 * 1. `beginScreenCapture()` is SYNCHRONOUS and must be called inside the tap handler, before any
 *    state change opens the report sheet. It freezes what is on screen right now: a deep clone of
 *    the document (so an open menu is still open in it), every scroll position, every form field's
 *    current value, and a pixel copy of every <canvas> and <video>. MapLibre's WebGL canvas is
 *    cleared after each frame is presented, so the map registers a redraw hook
 *    (`registerCanvasRedraw`) and is redrawn synchronously immediately before its pixels are copied.
 *
 * 2. The returned promise does the slow part afterwards, while the report sheet is already open:
 *    fetching fonts and images as data: URLs, serialising, rasterising and encoding. Nothing in it
 *    reads the live page again, so whatever the reader does next cannot leak into the picture.
 *
 * WHY THE STYLESHEETS ARE INLINED, NOT EVERY ELEMENT'S COMPUTED STYLE (the usual library approach):
 * reading getComputedStyle for each of several thousand nodes costs hundreds of milliseconds on a
 * phone and would have to happen in phase 1. The app's CSS is all same-origin, so its rules can be
 * read directly. What the SVG image cannot evaluate the way the page did is resolved here instead:
 *   - @media rules are evaluated against the LIVE window (matchMedia) and flattened, so
 *     display-mode: standalone, hover/pointer, prefers-* and widths all match the real page.
 *   - env(safe-area-inset-*) is replaced by the measured inset (an image has no safe area).
 *   - :root is rewritten to html (inside a foreignObject, :root is the <svg>).
 *   - animations and transitions are switched off so nothing renders at frame zero.
 * External resources never load inside an SVG image, and a cross-origin one would taint the canvas,
 * so every url() and <img> is either embedded as a data: URL or dropped. Only resources the page
 * actually loaded (Resource Timing) are fetched, so twenty page-background photographs are not
 * downloaded to draw the one on screen.
 *
 * WHAT IT CANNOT SHOW: the on-screen keyboard, the status bar and anything else the operating system
 * draws; native <select> pickers and date pickers; hover and focus rings. Those are not in the DOM.
 */

type Timings = { syncMs: number; totalMs: number; phases: Record<string, number> };

export interface ScreenCapture {
  blob: Blob;
  /** CSS pixels of the visual viewport that was captured. */
  width: number;
  height: number;
  /** Device pixels of the image. */
  pixelWidth: number;
  pixelHeight: number;
  timings: Timings;
  /** Things that were left out and why, for the record and for honest reporting. */
  notes: string[];
}

export interface PendingCapture {
  /** Resolves with the image, or rejects (never hangs past `timeoutMs`). */
  result: Promise<ScreenCapture>;
  /** How long the synchronous freeze took, in ms. This is the only part a reader could feel. */
  syncMs: number;
}

const XHTML = "http://www.w3.org/1999/xhtml";
const MAX_SCALE = 2;
const FETCH_TIMEOUT_MS = 4000;
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/* ------------------------------------------------------------------------------------------------ */
/* Resource tracking: which url()s the page has actually loaded.                                      */

const loadedUrls = new Set<string>();
let installed = false;

/** Start remembering which resources the page loads. Call once, early (main.tsx). Cheap: one
 * PerformanceObserver that keeps same-origin URLs only. */
export function installScreenCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    performance.setResourceTimingBufferSize?.(2000);
  } catch {
    /* not supported */
  }
  const keep = (name: string) => {
    if (name.startsWith(location.origin)) loadedUrls.add(name);
  };
  try {
    for (const e of performance.getEntriesByType("resource")) keep(e.name);
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) keep(e.name);
    }).observe({ type: "resource", buffered: true });
  } catch {
    /* no Resource Timing: every same-origin url() is treated as used (see wasLoaded) */
  }
}

function wasLoaded(abs: string): boolean {
  if (!installed || loadedUrls.size === 0) return true;
  return loadedUrls.has(abs);
}

/* ------------------------------------------------------------------------------------------------ */
/* Canvas redraw hooks (MapLibre).                                                                   */

const redrawHooks = new Set<() => void>();

/** A WebGL canvas without preserveDrawingBuffer is blank to drawImage once its frame has been
 * presented. Register a function that redraws it synchronously (MapLibre: `map.redraw()`); it runs
 * immediately before the canvas is copied. Returns the unregister function. */
export function registerCanvasRedraw(fn: () => void): () => void {
  redrawHooks.add(fn);
  return () => redrawHooks.delete(fn);
}

/* ------------------------------------------------------------------------------------------------ */

function measureSafeArea(): Record<"top" | "right" | "bottom" | "left", number> {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return out;
}

const ENV_RE = /(?:env|constant)\(\s*safe-area-inset-(top|right|bottom|left)\s*(?:,\s*[^()]*(?:\([^()]*\)[^()]*)*)?\)/g;
function replaceEnv(css: string, safe: Record<string, number>): string {
  return css.replace(ENV_RE, (_m, side: string) => `${safe[side] ?? 0}px`);
}

type Frozen = {
  clone: HTMLElement;
  vw: number;
  vh: number;
  vv: { x: number; y: number; w: number; h: number };
  scrollX: number;
  scrollY: number;
  scale: number;
  safe: Record<string, number>;
  cssChunks: { text: string; base: string }[];
  scrolled: { el: HTMLElement; x: number; y: number }[];
  remove: Element[];
  syncPhases: Record<string, number>;
  images: { el: Element; url: string; attr: "src" | "href" }[];
  canvases: { el: Element; copy: HTMLCanvasElement | null; w: number; h: number }[];
  bodyBg: string;
  notes: string[];
};

/** Walk a stylesheet's rules, flattening @media against the live window. */
function collectRules(rules: CSSRuleList, out: string[], notes: string[]): void {
  for (const rule of Array.from(rules)) {
    if (typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule) {
      let match = false;
      try {
        match = window.matchMedia(rule.media.mediaText).matches;
      } catch {
        match = false;
      }
      if (match) collectRules(rule.cssRules, out, notes);
      continue;
    }
    if (typeof CSSImportRule !== "undefined" && rule instanceof CSSImportRule) {
      try {
        if (rule.styleSheet && (!rule.media.mediaText || window.matchMedia(rule.media.mediaText).matches))
          collectRules(rule.styleSheet.cssRules, out, notes);
      } catch {
        notes.push("an imported stylesheet could not be read");
      }
      continue;
    }
    // @supports / @layer / @container keep their blocks but may hold @media inside.
    const grouping = rule as CSSRule & { cssRules?: CSSRuleList };
    if (
      grouping.cssRules &&
      ((typeof CSSSupportsRule !== "undefined" && rule instanceof CSSSupportsRule) ||
        (typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule))
    ) {
      const head = rule.cssText.slice(0, rule.cssText.indexOf("{"));
      const inner: string[] = [];
      collectRules(grouping.cssRules, inner, notes);
      out.push(`${head}{${inner.join("\n")}}`);
      continue;
    }
    out.push(rule.cssText);
  }
}

/** Phase 1. Synchronous. Throws only on a truly broken environment; callers catch. */
function freeze(): Frozen {
  const notes: string[] = [];
  const t0 = performance.now();
  const syncPhases: Record<string, number> = {};
  const mark = (k: string) => (syncPhases[k] = Math.round((performance.now() - t0) * 10) / 10);
  const vvp = window.visualViewport;
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = window.innerHeight;
  const vv = vvp
    ? { x: vvp.offsetLeft, y: vvp.offsetTop, w: vvp.width, h: vvp.height }
    : { x: 0, y: 0, w: vw, h: vh };
  const safe = measureSafeArea();

  // Redraw WebGL canvases so their buffers hold the current frame, then copy pixels right away.
  for (const fn of redrawHooks) {
    try {
      fn();
    } catch {
      notes.push("a map could not be redrawn for the capture");
    }
  }

  mark("redrawn");
  const liveRoot = document.documentElement;
  const clone = liveRoot.cloneNode(true) as HTMLElement;
  mark("cloned");
  const live = liveRoot.querySelectorAll("*");
  const copy = clone.querySelectorAll("*");
  const remove: Element[] = [];
  const images: Frozen["images"] = [];
  const canvases: Frozen["canvases"] = [];
  const scrolled: { el: HTMLElement; x: number; y: number }[] = [];
  const n = Math.min(live.length, copy.length);
  if (live.length !== copy.length) notes.push("the page changed while it was being copied");

  for (let i = 0; i < n; i++) {
    const L = live[i] as HTMLElement;
    const C = copy[i] as HTMLElement;
    const tag = L.localName;
    switch (tag) {
      case "script":
      case "noscript":
      case "template":
      case "link":
      case "style":
      case "meta":
      case "base":
        remove.push(C);
        continue;
      case "canvas":
      case "video": {
        const r = L.getBoundingClientRect();
        let pix: HTMLCanvasElement | null = null;
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) {
          try {
            const src = L as HTMLCanvasElement | HTMLVideoElement;
            const w = tag === "canvas" ? (src as HTMLCanvasElement).width : (src as HTMLVideoElement).videoWidth;
            const h = tag === "canvas" ? (src as HTMLCanvasElement).height : (src as HTMLVideoElement).videoHeight;
            if (w > 0 && h > 0) {
              pix = document.createElement("canvas");
              pix.width = w;
              pix.height = h;
              pix.getContext("2d")!.drawImage(src, 0, 0, w, h);
            }
          } catch {
            pix = null;
            notes.push(`a ${tag} could not be copied`);
          }
        }
        canvases.push({ el: C, copy: pix, w: r.width, h: r.height });
        break;
      }
      case "iframe": {
        const r = L.getBoundingClientRect();
        canvases.push({ el: C, copy: null, w: r.width, h: r.height });
        notes.push("an embedded frame is shown blank");
        break;
      }
      case "img": {
        const img = L as HTMLImageElement;
        const url = img.currentSrc || img.src;
        C.removeAttribute("srcset");
        C.removeAttribute("sizes");
        C.removeAttribute("loading");
        if (url) images.push({ el: C, url, attr: "src" });
        break;
      }
      case "source":
        if (L.parentElement?.localName === "picture") remove.push(C);
        break;
      case "image": {
        // SVG <image>
        const href = L.getAttribute("href") ?? L.getAttribute("xlink:href");
        if (href && !href.startsWith("data:")) images.push({ el: C, url: new URL(href, document.baseURI).href, attr: "href" });
        break;
      }
      case "input": {
        const inp = L as unknown as HTMLInputElement;
        if (inp.type === "checkbox" || inp.type === "radio") {
          if (inp.checked) C.setAttribute("checked", "");
          else C.removeAttribute("checked");
        } else if (inp.type !== "password" && inp.type !== "file") {
          C.setAttribute("value", inp.value);
        } else if (inp.type === "password") {
          C.setAttribute("value", inp.value ? "••••••••" : "");
        }
        break;
      }
      case "textarea":
        C.textContent = (L as unknown as HTMLTextAreaElement).value;
        break;
      case "select": {
        const sel = L as unknown as HTMLSelectElement;
        const opts = C.querySelectorAll("option");
        Array.from(sel.options).forEach((o, k) => {
          if (o.selected) opts[k]?.setAttribute("selected", "");
          else opts[k]?.removeAttribute("selected");
        });
        break;
      }
      case "dialog": {
        if ((L as HTMLDialogElement).open) {
          let modal = false;
          try {
            modal = L.matches(":modal");
          } catch {
            /* old engine */
          }
          if (modal) {
            // The top layer does not exist in the copy: put it on top by hand, where it was.
            const r = L.getBoundingClientRect();
            C.style.setProperty("position", "fixed", "important");
            C.style.setProperty("left", `${r.left}px`, "important");
            C.style.setProperty("top", `${r.top}px`, "important");
            C.style.setProperty("margin", "0", "important");
            C.style.setProperty("z-index", "2147483647", "important");
          }
        }
        break;
      }
    }
    if (L.scrollTop || L.scrollLeft) scrolled.push({ el: C, x: L.scrollLeft, y: L.scrollTop });
    if (C.hasAttribute("style")) {
      const s = C.getAttribute("style")!;
      if (s.includes("env(") || s.includes("constant(")) C.setAttribute("style", replaceEnv(s, safe));
    }
  }

  mark("walked");
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  return {
    clone,
    vw,
    vh,
    vv,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    scale: Math.min(window.devicePixelRatio || 1, MAX_SCALE),
    safe,
    cssChunks: [],
    scrolled,
    remove,
    syncPhases,
    images,
    canvases,
    bodyBg,
    notes,
  };
}

/** Phase 2a: tidy the copy and read the stylesheets. Runs after the tap handler has returned. The
 * stylesheets are read here rather than in phase 1 because walking every rule is the slowest part
 * of the freeze on WebKit, and nothing a tap does changes them in a way the picture can show: the
 * report sheet's own CSS may arrive, but the sheet is not in the copy. */
function prepare(f: Frozen): void {
  // A scroll position does not survive cloning, and an SVG image cannot scroll. Shift each scrolled
  // container's content by its offset instead (the individual `translate` property composes with any
  // existing transform, so it does not overwrite one).
  for (const { el, x, y } of f.scrolled) {
    for (const child of Array.from(el.childNodes)) {
      let target: HTMLElement;
      if (child.nodeType === 1) target = child as HTMLElement;
      else if (child.nodeType === 3 && child.textContent?.trim()) {
        const span = document.createElementNS(XHTML, "span") as HTMLElement;
        el.replaceChild(span, child);
        span.appendChild(child);
        target = span;
      } else continue;
      const prev = target.style.getPropertyValue("translate");
      const [px = "0px", py = "0px"] = prev && prev !== "none" ? prev.split(/\s+/) : [];
      target.style.setProperty("translate", `calc(${px} - ${x}px) calc(${py} - ${y}px)`);
    }
  }
  for (const el of f.remove) el.remove();
  // Comments add nothing to a picture, and one containing "--" is not well-formed XML.
  const comments: Node[] = [];
  const cw = document.createTreeWalker(f.clone, NodeFilter.SHOW_COMMENT);
  while (cw.nextNode()) comments.push(cw.currentNode);
  for (const c of comments) c.parentNode?.removeChild(c);

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.disabled) continue;
      if (sheet.media?.mediaText && !window.matchMedia(sheet.media.mediaText).matches) continue;
      const out: string[] = [];
      collectRules(sheet.cssRules, out, f.notes);
      f.cssChunks.push({ text: out.join("\n"), base: sheet.href ?? document.baseURI });
    } catch {
      f.notes.push("a stylesheet from another site could not be read");
    }
  }

}

/* ------------------------------------------------------------------------------------------------ */
/* Phase 2b. Asynchronous; never touches the live page.                                               */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

const dataUrlCache = new Map<string, Promise<string | null>>();

function fetchAsDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return Promise.resolve(url);
  let p = dataUrlCache.get(url);
  if (!p) {
    p = (async () => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
      try {
        const sameOrigin = new URL(url, location.href).origin === location.origin;
        const res = await fetch(url, {
          mode: sameOrigin ? "same-origin" : "cors",
          credentials: sameOrigin ? "same-origin" : "omit",
          cache: "force-cache",
          signal: ctl.signal,
        });
        if (!res.ok) return null;
        return await blobToDataUrl(await res.blob());
      } catch {
        return null;
      } finally {
        clearTimeout(t);
      }
    })();
    // Fonts and app images are reused across captures; failures are not cached.
    p.then((v) => {
      if (v === null) dataUrlCache.delete(url);
    });
    dataUrlCache.set(url, p);
  }
  return p;
}

const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

async function inlineCss(chunks: Frozen["cssChunks"], safe: Record<string, number>, notes: string[]): Promise<string> {
  const wanted = new Map<string, string>(); // raw -> absolute, per chunk handled below
  const jobs: Promise<void>[] = [];
  const resolved = new Map<string, string>(); // absolute -> replacement
  const texts = chunks.map(({ text, base }) => {
    return text.replace(URL_RE, (_m, _q, raw: string) => {
      if (raw.startsWith("data:") || raw.startsWith("#")) return `url("${raw}")`;
      let abs: string;
      try {
        abs = new URL(raw, base).href;
      } catch {
        return "none";
      }
      wanted.set(raw, abs);
      return `url("\u0000${abs}\u0000")`;
    });
  });
  for (const abs of new Set(wanted.values())) {
    if (!wasLoaded(abs)) {
      resolved.set(abs, "");
      continue;
    }
    jobs.push(
      fetchAsDataUrl(abs).then((d) => {
        resolved.set(abs, d ?? "");
        if (!d) notes.push(`could not embed ${abs.replace(location.origin, "")}`);
      }),
    );
  }
  await Promise.all(jobs);
  let css = texts
    .join("\n")
    .replace(/url\("\u0000([^\u0000]*)\u0000"\)/g, (_m, abs: string) => {
      const d = resolved.get(abs);
      return d ? `url("${d}")` : "none";
    });
  // Inside <foreignObject>, :root is the <svg>. The app hangs its theme variables off :root.
  css = css.replace(/:root\b/g, "html");
  css = replaceEnv(css, safe);
  // Frame zero of an animation is not what the reader saw; the end state usually is.
  css +=
    "\n*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" +
    // A picture renders classic scrollbars where the reader's screen had overlay ones (iOS, macOS)
    // or none at all; leave them out rather than invent them.
    "\n*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}";
  return css;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("the page could not be drawn as an image"));
    img.src = src;
  });
}

function canvasToBlob(c: HTMLCanvasElement, type: string, q: number): Promise<Blob> {
  return new Promise((res, rej) => {
    try {
      c.toBlob((b) => (b ? res(b) : rej(new Error("the image could not be encoded"))), type, q);
    } catch (e) {
      rej(e);
    }
  });
}

async function render(f: Frozen, t0: number, phases: Record<string, number>): Promise<Omit<ScreenCapture, "timings">> {
  const mark = (k: string) => (phases[k] = Math.round(performance.now() - t0));
  prepare(f);
  mark("prepared");

  // Images and canvases first (in parallel with CSS).
  const imgJobs = f.images.map(async ({ el, url, attr }) => {
    const d = await fetchAsDataUrl(url);
    if (!d) f.notes.push(`an image from ${new URL(url, location.href).host} could not be embedded`);
    el.setAttribute(attr, d ?? TRANSPARENT_PIXEL);
  });
  for (const { el, copy, w, h } of f.canvases) {
    const img = document.createElementNS(XHTML, "img") as HTMLImageElement;
    for (const a of Array.from(el.attributes)) if (a.name !== "width" && a.name !== "height") img.setAttribute(a.name, a.value);
    let src = TRANSPARENT_PIXEL;
    if (copy) {
      try {
        src = copy.toDataURL("image/png");
      } catch {
        f.notes.push("a canvas drawn from another site could not be included");
      }
    }
    img.setAttribute("src", src);
    img.style.setProperty("width", `${w}px`);
    img.style.setProperty("height", `${h}px`);
    el.replaceWith(img);
  }
  const [css] = await Promise.all([inlineCss(f.cssChunks, f.safe, f.notes), Promise.all(imgJobs)]);
  mark("embedded");

  // Build the document.
  const head = f.clone.querySelector("head") ?? f.clone.insertBefore(document.createElementNS(XHTML, "head"), f.clone.firstChild);
  const style = document.createElementNS(XHTML, "style");
  style.textContent = css;
  head.appendChild(style);
  if (f.scrollX || f.scrollY) {
    const body = f.clone.querySelector("body") as HTMLElement | null;
    body?.style.setProperty("translate", `${-f.scrollX}px ${-f.scrollY}px`);
  }
  f.clone.style.setProperty("width", `${f.vw}px`);
  f.clone.style.setProperty("height", `${f.vh}px`);
  f.clone.style.setProperty("overflow", "hidden");
  const xhtml = new XMLSerializer().serializeToString(f.clone);
  mark("serialised");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f.vw}" height="${f.vh}" viewBox="0 0 ${f.vw} ${f.vh}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  let img: HTMLImageElement;
  try {
    img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  } catch (e) {
    // Say why, if the reason is malformed markup (the common one).
    const perr = new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror");
    throw perr ? new Error(`the page could not be drawn as an image: ${perr.textContent?.slice(0, 300)}`) : e;
  }
  try {
    await img.decode();
  } catch {
    /* onload already fired */
  }
  mark("decoded");

  const s = f.scale;
  const out = document.createElement("canvas");
  out.width = Math.round(f.vv.w * s);
  out.height = Math.round(f.vv.h * s);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = f.bodyBg && f.bodyBg !== "rgba(0, 0, 0, 0)" ? f.bodyBg : "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  const draw = () => ctx.drawImage(img, -f.vv.x * s, -f.vv.y * s, f.vw * s, f.vh * s);
  draw();
  // WebKit can rasterise an SVG image before the data: images inside it have decoded; the second
  // draw a frame later picks them up. Harmless elsewhere.
  await new Promise((r) => setTimeout(r, 60));
  draw();
  mark("drawn");

  const blob = await canvasToBlob(out, "image/jpeg", 0.88);
  mark("encoded");
  return {
    blob,
    width: Math.round(f.vv.w),
    height: Math.round(f.vv.h),
    pixelWidth: out.width,
    pixelHeight: out.height,
    notes: f.notes,
  };
}

/** Freeze the screen now (synchronously) and render it in the background. Call from the tap
 * handler BEFORE opening the report sheet. Never throws: a failure comes back as a rejection. */
export function beginScreenCapture(timeoutMs = 10000): PendingCapture {
  const t0 = performance.now();
  let frozen: Frozen;
  try {
    frozen = freeze();
  } catch (e) {
    const syncMs = performance.now() - t0;
    return { syncMs, result: Promise.reject(e instanceof Error ? e : new Error(String(e))) };
  }
  const syncMs = Math.round((performance.now() - t0) * 10) / 10;
  const phases: Record<string, number> = { ...Object.fromEntries(Object.entries(frozen.syncPhases).map(([k, v]) => [`sync.${k}`, v])), frozen: Math.round(syncMs) };
  const result = new Promise<ScreenCapture>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the screenshot took too long")), timeoutMs);
    // Yield first, so the report sheet's render is not queued behind any of this.
    setTimeout(() => {
      render(frozen, t0, phases).then(
        (r) => {
          clearTimeout(timer);
          resolve({ ...r, timings: { syncMs, totalMs: Math.round(performance.now() - t0), phases } });
        },
        (e) => {
          clearTimeout(timer);
          reject(e instanceof Error ? e : new Error(String(e)));
        },
      );
    }, 0);
  });
  return { result, syncMs };
}
