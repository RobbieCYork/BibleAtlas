#!/usr/bin/env node
/**
 * Report-a-Problem screenshot fidelity on a REAL WebKit: the iOS Simulator (Safari and the
 * home-screen app). No npm dependencies.
 *
 *   node scripts/capture-fidelity/serve.mjs --port 4391 --out <dir> [--persona member]
 *
 * One HTTP server on 127.0.0.1 (the Simulator shares the Mac's loopback) that:
 *   - serves a production build made with VITE_CAPTURE_PROBE=1 and VITE_SUPABASE_URL pointing at
 *     ITSELF, so the bundle contains no real Supabase URL and every auth/rest call lands here;
 *   - answers /auth/v1, /rest/v1 and /functions/v1 from the signed-in harness's fake backend;
 *   - injects a fake persona session into index.html (the home-screen app has its own storage, so it
 *     has to be seeded from the page it loads, not from Safari);
 *   - saves every capture the probe POSTs to /__capture as <n>-<label>-capture.jpg plus a JSON line
 *     in captures.jsonl. GET /__label?l=<name> sets the label for the next capture.
 * External hosts (map tiles, bible-api.com) are NOT blocked here: the Simulator reaches them as any
 * visitor's phone would. The real Supabase host cannot be reached because it is not in the bundle.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, existsSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createBackend } from "../signed-in-harness/lib/backend.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const port = Number(arg("--port", "4391"));
const persona = arg("--persona", "member");
const out = resolve(arg("--out", mkdtempSync(join(tmpdir(), "capture-fidelity."))));
mkdirSync(out, { recursive: true });
const origin = `http://127.0.0.1:${port}`;

let dist = arg("--dist");
if (!dist) {
  dist = join(mkdtempSync(join(tmpdir(), "capture-fidelity-dist.")), "dist");
  process.stdout.write("building probe bundle... ");
  const b = spawnSync(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "build", "--outDir", dist, "--emptyOutDir"], {
    cwd: ROOT, encoding: "utf8",
    env: { ...process.env, VITE_SUPABASE_URL: origin, VITE_SUPABASE_ANON_KEY: "harness-fake-anon-key", VITE_CAPTURE_PROBE: "1" },
  });
  if (b.status !== 0) { console.error((b.stdout + b.stderr).slice(-2000)); process.exit(1); }
  console.log("done");
}

const backend = createBackend({ persona });
const STORAGE_KEY = `sb-${new URL(origin).hostname.split(".")[0]}-auth-token`;
const seed = `<script>(function(){try{if(!localStorage.getItem(${JSON.stringify(STORAGE_KEY)})){localStorage.setItem('bible-atlas-remember-me','true');localStorage.setItem(${JSON.stringify(STORAGE_KEY)},${JSON.stringify(JSON.stringify(backend.session))});}}catch(e){}})()</script>`;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };

let label = "unlabelled";
let fire = false;
let n = 0;
const body = (req) => new Promise((res) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => res(Buffer.concat(c))); });

createServer(async (req, res) => {
  const u = new URL(req.url, origin);
  try {
    if (u.pathname === "/__label") {
      label = (u.searchParams.get("l") || "unlabelled").replace(/[^\w.-]/g, "_");
      if (u.searchParams.get("fire") === "1") fire = true;
      res.end(`label=${label}\n`);
      return;
    }
    if (u.pathname === "/__trigger") {
      res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" });
      res.end(fire ? "1" : "0");
      fire = false;
      return;
    }
    if (u.pathname === "/__capture" && req.method === "POST") {
      const buf = await body(req);
      const meta = Object.fromEntries(u.searchParams);
      const name = `${String(++n).padStart(2, "0")}-${label}`;
      if (buf.length) writeFileSync(join(out, `${name}-capture.jpg`), buf);
      appendFileSync(join(out, "captures.jsonl"), JSON.stringify({ name, at: new Date().toISOString(), bytes: buf.length, ...meta }) + "\n");
      console.log(`capture ${name}: ${buf.length} bytes sync=${meta.sync}ms total=${meta.total}ms standalone=${meta.standalone} ${meta.error ?? ""}`);
      res.end("ok");
      return;
    }
    if (/^\/(auth|rest|functions|storage)\/v1\//.test(u.pathname)) {
      const b = await body(req);
      const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
      const r = await backend.handle({ method: req.method, url: u.href, headers, body: b.length ? b.toString("utf8") : undefined });
      res.writeHead(r.status, r.headers);
      res.end(r.body ?? "");
      return;
    }
    let p = normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(dist, p);
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
      const idx = join(file, "index.html");
      file = existsSync(idx) && idx.startsWith(dist) && p !== "/" ? idx : join(dist, "index.html");
    }
    let data = readFileSync(file);
    if (file === join(dist, "index.html")) data = Buffer.from(data.toString("utf8").replace("<head>", `<head>${seed}`));
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
}).listen(port, "127.0.0.1", () => console.log(`serving ${origin}  persona=${persona}  captures -> ${out}  pid=${process.pid}`));
