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

Delete the build info first, every time:

    rm -f /tmp/verify/node_modules/.tmp/*.tsbuildinfo

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

## Verify the commit, not the working tree

A working tree that builds proves nothing about what you committed, especially
after filtering hunks. Check the commit out somewhere clean and build that:

    git worktree add /tmp/verify <sha> --detach
    ln -s "$PWD/node_modules" /tmp/verify/node_modules
    rm -f /tmp/verify/node_modules/.tmp/*.tsbuildinfo   # or tsc -b skips everything
    (cd /tmp/verify && npm run build)                   # ~6.2s. ~0.5s means it skipped
    git worktree remove /tmp/verify --force

The `rm` is not optional and it is not tidiness — see the `.tsbuildinfo`
section above. The symlink on the line before it is what makes it necessary.
