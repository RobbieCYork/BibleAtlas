# Working in this repo

Two things here will lie to you, and one thing will silently destroy other
people's work. All three have actually happened, repeatedly.

## `tsc --noEmit` does not tell you whether the build passes

This project builds with `tsc -b` and project references. `--noEmit` bypasses
that and reports **zero errors on a tree that does not compile**. An agent once
pushed a broken commit to a live site because it trusted a clean `--noEmit`.

Always:

    npm run build     # exit 0, no exceptions

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
    (cd /tmp/verify && npm run build)
    git worktree remove /tmp/verify --force
