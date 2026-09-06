# Stale-deploy harness

Reproduces, locally and on demand, the one production failure that takes the whole
app down: **the edge serving an `index.html` whose hashed assets no longer exist.**

A Node server hands out a real built `dist/index.html` while 404ing the files under
`/assets/` that it names. Real Google Chrome, headless, is pointed at it over the
DevTools Protocol. What the browser does next — how many times it re-requests the
document, and how far apart — is recorded **by the server**, not by the page.

This is what verifies the recovery listener at the top of `index.html`. That listener
is the only thing standing between a stale edge node and a blank white page, it runs
before any application code exists, and it cannot be exercised from a test that does
not involve a browser and a genuine 404.

## Why the request log is the point

**The server's request log is the evidence. Everything the page reports is
corroboration.** That ordering is not fussiness; it is what this repo has learned the
hard way.

On 2026-09-06 alone, in one working session across several agents:

- **Screenshots of this app lied twice.** Elements on their own compositor layers —
  scroll containers, the marker overlay, the timeline canvas — rendered stale content
  in screenshots while the DOM was provably correct. `AGENTS.md` has warned about this
  for a while; it still cost time twice in one night.
- **An in-page measurement lied once, and shipped.** A measurement of a `<select>`'s
  usable width, taken inside the page, left out the native dropdown arrow. It looked
  right, it agreed with the screenshot, and it put a clipping regression in front of
  real users for twenty minutes.

A request log has none of those failure modes. `GET /` arrived at 2717ms is a fact
about what the browser did, observed from outside the browser. It cannot be a stale
layer, and it cannot be a measurement that quietly omits something. When the page and
the request log disagree, the request log is right.

## What it does and does not do

It serves one built `dist/` directory and 404s the hashed assets in it. That is all
it does. It is not a test runner, it has no assertions, and it knows nothing about
this app beyond the `cb:asset-recovery` key it reports for convenience. You read the
output and decide.

`drive-chrome.mjs` is the half that generalises: it opens a URL in the real Chrome on
this machine and evaluates JavaScript in it, over CDP, with **no npm dependencies at
all** — Node 24 ships a global `WebSocket`, which is everything CDP needs. Point it at
a `vite preview` and it works the same way. Deliberately no package was added: a
verification tool that drags in a dependency tree is one people skip.

Requires Node 24+ and Google Chrome at `/Applications/Google Chrome.app`.

## Running it

Build first — the harness serves a real build, not source:

```bash
npm run build
./scripts/stale-deploy-harness/run.sh dist never 30000
```

Three runs cover the recovery listener's behaviour:

```bash
# 1. Assets never come back. Tests the retry cap and the give-up screen.
./scripts/stale-deploy-harness/run.sh dist never 30000

# 2. Assets return after 5s, mid-backoff. Tests recovery and the counter reset.
./scripts/stale-deploy-harness/run.sh dist 5000 20000

# 3. sessionStorage throws (private mode, cookies off). Must not reload AT ALL —
#    this is the path where an unbounded retry becomes an infinite reload loop.
./scripts/stale-deploy-harness/run.sh dist never 20000 --block-storage
```

Run 1 produces a request log like this (favicons and the manifest elided), and the
shape of it is the result:

```
     0ms  200  /
    10ms  404  /assets/index-DFManRhn.js
    11ms  404  /assets/index-DRRwXqrB.css
  2180ms  200  /
  8203ms  200  /
 23231ms  200  /
              <- and then nothing for the rest of the run
```

Four document loads: the first plus three reloads, 2.17s / 6.02s / 15.02s after each
failure, and then it stops. The stopping is as important as the retrying — if the edge
is still stale after three tries, a fourth is a reload loop, which is worse than
standing still.

Run 2 ends with `rootChildren: 1` and `counter: null` — React mounted, and the attempt
count was cleared so the next deploy starts from a full budget. Run 3 shows a single
`GET /` and nothing after it.

## Ports and cleanup

Both ports are allocated, never hardcoded, and the Chrome profile is a fresh
`mktemp` directory. `run.sh` kills the two PIDs it started and nothing else.

**Do not add a `pkill` to this script.** Several agents work in this repo at the same
time; `pkill -f "vite preview"` has already taken other people's servers down mid-run
more than once. Kill by PID or by port, always.
