/**
 * Serves a built `dist/` the way a stale Vercel edge node serves it: the HTML is
 * handed out intact while the hashed files under /assets/ that it names return 404.
 *
 * That is the exact production failure this exists to reproduce — see
 * scripts/stale-deploy-harness/README.md and the comment above the recovery
 * listener in index.html.
 *
 * Every request is logged to stdout with a millisecond offset from the first one.
 * That log is the point of the whole harness: it is a record of what the browser
 * actually asked for and when, taken outside the page, so it cannot be wrong about
 * the page the way a screenshot or an in-page measurement can.
 *
 *   node serve-stale-deploy.mjs <dist-dir> [--heal-after <ms>|never] [--port <n>]
 *
 *   --heal-after   ms after the first request at which /assets/ starts returning
 *                  200 again, emulating fresh HTML reaching the edge. Default
 *                  "never", which is what you want for testing a retry cap.
 *   --port         default 0, meaning the OS picks a free one. Leave it alone
 *                  unless you need a fixed port: a hardcoded port collides with
 *                  the other agents working in this repo.
 *
 * Prints "READY <port>" once listening. Send SIGTERM for a JSON summary.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

const DIST = process.argv[2];
if (!DIST || DIST.startsWith('--')) {
  console.error('usage: node serve-stale-deploy.mjs <dist-dir> [--heal-after <ms>|never] [--port <n>]');
  process.exit(2);
}
const healRaw = arg('--heal-after', 'never');
const HEAL_AFTER_MS = healRaw === 'never' ? Infinity : Number(healRaw);
const PORT = Number(arg('--port', 0));

const CONTENT_TYPES = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.html': 'text/html; charset=utf-8',
};

let firstRequestAt = null;
const requests = [];

const server = createServer(async (req, res) => {
  const now = Date.now();
  if (firstRequestAt === null) firstRequestAt = now;
  const offset = now - firstRequestAt;
  const path = normalize(req.url.split('?')[0]);
  let status;

  if (path === '/' || path === '/index.html') {
    // Always served, always fresh — the stale-HTML case is that this document
    // survives while the files it names do not.
    status = 200;
    res.writeHead(200, { 'content-type': CONTENT_TYPES['.html'], 'cache-control': 'no-store' });
    res.end(await readFile(`${DIST}/index.html`));
  } else if (path.startsWith('/assets/') && offset < HEAL_AFTER_MS) {
    status = 404;
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('gone');
  } else {
    // Everything else (including /assets/ once healed) comes from dist if it is
    // there. A 404 here is honest: the file genuinely is not in the build.
    try {
      const body = await readFile(`${DIST}${path}`);
      status = 200;
      res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      status = 404;
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('gone');
    }
  }

  requests.push({ offset, path, status });
  console.log(`${String(offset).padStart(6)}ms  ${status}  ${path}`);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`READY ${server.address().port}`);
});

process.on('SIGTERM', () => {
  console.log('---REQUESTS---');
  console.log(JSON.stringify(requests));
  process.exit(0);
});
