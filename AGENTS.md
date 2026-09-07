# Working in this repo

> **Before anything else — you report to Bob.**
>
> This repo is one level below the Capstone Bible project root. If you were opened directly in
> `capstone-bible/`, or you are running in an isolated git worktree, you may not have loaded the
> project's master prompt. Read it now:
> `/Users/robbieyork/Documents/Claude/Projects/Capstone Bible/CLAUDE.md`
>
> The rule you are most likely to be missing: **any time work fails, runs partially, gets blocked,
> or turns up something a human has to decide, write an escalation file to**
> `/Users/robbieyork/Documents/Claude/Projects/Capstone Bible/automation/manager-inbox/new/`
> **before you finish.** Format is in that folder's `README.md`. Bob relays it to Robbie; a message
> in a session nobody reopens does not survive. Never report to Robbie directly.

Four things here will lie to you, and one thing will silently destroy other
people's work. Most of them have actually happened here, repeatedly; the rest
are one trusting run away.

## `tsc --noEmit` does not tell you whether the build passes

This project builds with `tsc -b` and project references. `--noEmit` bypasses
that and reports **zero errors on a tree that does not compile**. An agent once
pushed a broken commit to a live site because it trusted a clean `--noEmit`.

Always:

    npm run build     # exit 0, no exceptions

## `npm run test:linker` is not a build check either

The name linker's regression suite (`scripts/name-linker/`) loads the real
`verseAnnotations.ts` and the real data files by bundling them with rolldown,
the bundler Vite already ships. rolldown **strips TypeScript types without
checking them**. The suite therefore goes green on a tree that does not
compile.

It is the `--noEmit` trap from the other side: that one type-checks without
building, this one builds without type-checking. Neither tells you the app
compiles. `cases: 91 passed` and three unchanged snapshots mean the linker
still resolves names the way it did — a real and valuable thing to know, and
not this one.

Both, in that order, every time you touch `verseAnnotations.ts` or the data
files feeding it:

    npm run test:linker    # did any links move?
    npm run build          # does it compile? exit 0, no exceptions

The linker's own `scripts/name-linker/README.md` has said this since the
harness was written. It was reported once as having been written *here*, in
this file, when it had not been — which is its own reminder that a claim a
check exists is not the check existing.

## A verification worktree that shares `node_modules` shares `.tsbuildinfo` too

Same class of lie as `--noEmit`, one level further out: the build *runs*, exits
0, and never compiles a line.

`tsc -b` is incremental. Both project references write their state into
`node_modules/.tmp/` (`tsBuildInfoFile` in `tsconfig.app.json` and
`tsconfig.node.json`), which is *inside* `node_modules`. So the symlink in the
recipe below — the one that exists to save you an install in the throwaway
worktree - also hands `tsc -b` the build info from the tree you just built. It
reads it, decides both projects are up to date, and skips the type check
entirely. What you get back is a green build of nothing.

The tell is the clock. A real check of this project takes about 6.2s; the false
pass comes back in about 0.49s. If your verification build was suspiciously
fast, it did not happen.

Delete the build info first, every time — with `find`, not a glob:

    find /tmp/verify/node_modules/.tmp -name '*.tsbuildinfo' -delete

**Not `rm -f .../*.tsbuildinfo`.** This file used to say that, and it is a trap
under zsh: an unmatched glob is an *error*, not an empty argument list, so when
there is no build info to delete the command fails, `&&` short-circuits, and
the build you chained after it never runs. An agent read the resulting silence
as a pass and spent the next hour testing a stale bundle. `find -delete`
succeeds on nothing.

Note the path: it is the shared file you are deleting, through the symlink, so
the next build in the main tree is a full one as well. That is the intended
behaviour — do not "fix" it by pointing `tsBuildInfoFile` somewhere outside
`node_modules`, which would only move the shared state, and do not skip the
delete because the worktree looks clean. The whole point of the verification
build is that you do not trust what you think is in there.

## Committing with a pathspec ignores the index

`git commit -F msg -- <files>` commits the **working tree** state of those
paths, not what you staged. With more than one person or agent in the tree,
that quietly swallows their in-progress edits into your commit. It has happened
here more than once, including a case where the swallowed hunk took two
adjacent declarations with it and pushed a commit that did not compile.

Stage into a scratch index and commit with **no pathspec**:

    export GIT_INDEX_FILE=$(mktemp)
    git read-tree HEAD
    git apply --cached path/to/your.patch      # only your hunks
    git commit -F msg                          # no pathspec
    unset GIT_INDEX_FILE

Then **check the real index**. A scratch-index commit leaves the real one
pointing at the pre-change blob, so `git status` shows `MM` and the next
pathspec-less commit reverts you. Refresh only your paths:

    git add -- <your files>

Verify before pushing, every time:

    git show --stat            # only your files?
    git status --short         # anyone else's work still intact?

## Screenshots of this app go stale

Elements on their own compositor layers — scroll containers, the marker
overlay, the timeline canvas — have repeatedly rendered stale content in
screenshots while the DOM was provably correct. A screenshot is a hint, not
evidence. Cross-check with `javascript_tool` against the live DOM.

`javascript_tool` immediately after `location.reload()` can also read a stale
execution context. Let the page settle.

The timeline does not initialise in a backgrounded tab at all — its sizing
depends on rendering steps the browser freezes there. Verify it against a
static `vite preview` of the production build, not the shared dev server,
which hot-reloads under whoever else is working.

## A hidden tab renders no frames, so smooth scrolling does not happen at all

This is not throttling and it is not slowness. A backgrounded tab produces no
animation frames, and every animated scroll is driven by them. So
`scrollIntoView({ behavior: "smooth" })`, `scrollTo({ behavior: "smooth" })` and
anything built on them **do not move the container by a single pixel** while the
tab is hidden. `behavior: "instant"` still works, because it needs no frames.

Read `scrollTop` after one of those calls in a background tab and you get `0` —
the same `0` that broken code returns. An agent spent most of a run on that and
came close to rewriting scroll handling that was working the whole time. The same
mechanism eats anything else you step frame by frame: a `requestAnimationFrame`
loop in a hidden tab never reaches its next iteration, so a measurement helper
built around one simply hangs until the tool times out.

Before you trust any scroll measurement:

    document.visibilityState        // "hidden" means the number below is meaningless

Then either front the tab, or measure with an instant scroll — the thing you
usually need to know is whether the right element got targeted, and an instant
scroll answers that just as well.

Note what this does *not* excuse: the `--disable-background-timer-throttling`
flags in the harness section below are about timers running slowly. This is about
frames not existing, and those flags do not bring them back.

## There is a browser harness in the repo — you do not need tooling in your session

`scripts/stale-deploy-harness/` drives the real Google Chrome on this machine
over the DevTools Protocol with **no npm dependencies** (Node 24 ships a global
`WebSocket`, which is all CDP needs). Read its README. "No browser tooling was
available in my session" is not a reason to ship something unverified; it is a
reason to run this.

It exists to reproduce a stale deploy — HTML whose hashed assets 404 — and it is
what verifies the recovery listener at the top of `index.html`. `drive-chrome.mjs`
on its own will open any URL, including a `vite preview`, and evaluate JavaScript
in it.

**Prefer the server's request log to anything the page tells you.** The section
above says a screenshot is a hint; that goes for in-page measurement too. A
measurement of a `<select>`'s usable width, taken inside the page, once left out
the native dropdown arrow — it agreed with the screenshot, and it put a clipping
regression in front of real users for twenty minutes. A request log observed from
outside the browser has neither failure mode.

Three things about driving Chrome here that have each cost real time:

**`--window-size` is silently floored at 500px wide in headless Chrome on macOS.**
Ask for 375 and you get a 500px render cropped to look narrow, so a mobile layout
bug either hides or is invented. Use CDP `Emulation.setDeviceMetricsOverride`
instead — `drive-chrome.mjs --viewport 375x667` does exactly that, and reports
`window.innerWidth: 375` where the default run reports 756. Measure with
`getBoundingClientRect` in the page rather than trusting the window.

**Never `pkill -f "vite preview"`, `pkill -f chrome`, or anything like them.**
Several agents work in this tree at once and that pattern matches their processes
too. It has taken other people's servers down mid-verification more than once in a
single evening. Kill the PID you started, or kill by port. `run.sh` allocates both
its ports and uses a fresh `mktemp` Chrome profile for the same reason.

**A backgrounded headless tab still throttles timers.** If you are measuring
anything time-based — a retry cadence, a debounce — pass
`--disable-background-timer-throttling --disable-renderer-backgrounding
--disable-backgrounding-occluded-windows`, as `run.sh` does.

## Verify the commit, not the working tree

A working tree that builds proves nothing about what you committed, especially
after filtering hunks. Check the commit out somewhere clean and build that:

    git worktree add /tmp/verify <sha> --detach
    ln -s "$PWD/node_modules" /tmp/verify/node_modules
    find /tmp/verify/node_modules/.tmp -name '*.tsbuildinfo' -delete
    (cd /tmp/verify && npm run build)                   # ~6.2s. ~0.5s means it skipped
    git worktree remove /tmp/verify --force

The `find -delete` is not optional and it is not tidiness — see the
`.tsbuildinfo` section above, including why it is `find` and not `rm -f` with a
glob. The symlink on the line before it is what makes it necessary.
