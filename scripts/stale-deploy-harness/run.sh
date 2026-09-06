#!/bin/bash
# Wires the server and the driver together for one run, on ports nobody else is
# using, and cleans up only the two processes it started.
#
#   ./run.sh <dist-dir> [heal-after-ms|never] [watch-ms] [extra drive-chrome args...]
#
#   ./run.sh dist never 30000                 # assets never come back: tests the cap
#   ./run.sh dist 5000 20000                  # assets return after 5s: tests recovery
#   ./run.sh dist never 20000 --block-storage # private mode: must not reload at all
#
# Both ports are allocated rather than hardcoded, and the Chrome profile is a
# fresh mktemp dir. Several agents work in this repo at once; a fixed port or a
# shared profile takes someone else's run down with yours.
#
# NOTE the cleanup: it kills $SERVER_PID and $CHROME_PID, nothing else. Never
# reach for `pkill -f chrome` or `pkill -f vite` here — see AGENTS.md.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="${1:?usage: ./run.sh <dist-dir> [heal-after-ms|never] [watch-ms] [drive-chrome args...]}"
HEAL="${2:-never}"
WATCH="${3:-30000}"
shift 3 2>/dev/null || shift $#

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Google Chrome not found at $CHROME"; exit 1; }

PROFILE="$(mktemp -d /tmp/stale-deploy-chrome.XXXXXX)"
SERVER_LOG="$(mktemp /tmp/stale-deploy-server.XXXXXX)"

cleanup() {
  [ -n "${CHROME_PID:-}" ] && kill "$CHROME_PID" 2>/dev/null
  [ -n "${SERVER_PID:-}" ] && kill -TERM "$SERVER_PID" 2>/dev/null
  rm -rf "$PROFILE"
}
trap cleanup EXIT

node "$HERE/serve-stale-deploy.mjs" "$DIST" --heal-after "$HEAL" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 40); do
  PORT="$(sed -n 's/^READY \([0-9]*\)$/\1/p' "$SERVER_LOG")"
  [ -n "$PORT" ] && break
  sleep 0.25
done
[ -n "${PORT:-}" ] || { echo "server did not start"; cat "$SERVER_LOG"; exit 1; }

# --remote-debugging-port=0 lets Chrome pick; it writes the real port into the
# profile dir. Asking for a fixed port is how you collide with another agent.
"$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --disable-background-timer-throttling --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --user-data-dir="$PROFILE" --remote-debugging-port=0 about:blank > /dev/null 2>&1 &
CHROME_PID=$!

for _ in $(seq 1 60); do
  [ -s "$PROFILE/DevToolsActivePort" ] && break
  sleep 0.25
done
CDP_PORT="$(head -1 "$PROFILE/DevToolsActivePort" 2>/dev/null)"
[ -n "$CDP_PORT" ] || { echo "Chrome did not open a debugging port"; exit 1; }

node "$HERE/drive-chrome.mjs" --url "http://127.0.0.1:$PORT/" --cdp-port "$CDP_PORT" \
  --watch-ms "$WATCH" "$@"
DRIVER_STATUS=$?

kill $CHROME_PID 2>/dev/null
kill -TERM $SERVER_PID 2>/dev/null
sleep 1

echo
echo "======== SERVER REQUEST LOG (the evidence) ========"
grep -v '^---REQUESTS---$' "$SERVER_LOG" | grep -v '^\[{'
rm -f "$SERVER_LOG"
exit $DRIVER_STATUS
