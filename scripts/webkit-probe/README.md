# WebKit probe

Runs a page in **WebKit** — Safari's engine — on this machine, and evaluates JavaScript in it.
No Xcode, no simulator, no npm dependency: `swiftc` from the Command Line Tools, `WebKit.framework`
from the macOS SDK, one file.

```sh
cd scripts/webkit-probe
swiftc -O probe.swift -o probe

# in another shell, from the repo root, against a PRODUCTION build (not the shared dev server):
npm run build && npx vite preview --port 4318 --strictPort

./probe http://localhost:4318/ measure-text-scale.js
```

## Why this exists

The stale-deploy harness next door drives **Chrome**. Chrome cannot answer WebKit questions, and
this repo has now shipped two wrong diagnoses of the same iOS text-size bug for exactly that
reason — one of them a runtime probe that measured correctly on every engine reachable from this
machine and then went inert on the owner's phone.

WebKit on macOS is not WebKit on iOS. It has no iOS text autosizing, so it cannot reproduce the
iOS-only half of a bug. What it **does** share is all of WebKit's style plumbing, and that is
usually where the misreading is.

## The thing it has already caught, which you should not have to learn twice

`getComputedStyle()` in WebKit reports lengths in *unzoomed* units: it divides a font-size by the
element's effective zoom before handing it back. Measured here, with `zoom: 1.45` on an ancestor
and glyphs that correctly took the zoom:

| what you read                     | what it says | what it means |
|-----------------------------------|--------------|---------------|
| `getComputedStyle(el).fontSize`   | `15px`       | rendered 21.75px — the 1.45 was divided back out |
| `getComputedStyle(el).zoom`       | `1`          | says nothing about the ancestor; `zoom` is not inherited |

So on iOS, a `.bible-verses` reporting `10.344828px` under `--text-scale: 1.45` was **not** text
being shrunk by 1.45. It was text rendering at `10.344828 x 1.45 = 15px` — the unscaled size,
frozen, because the glyphs never received the zoom at all. And a reported `zoom` of `1` was not
evidence that the ancestor's zoom was missing.

Two readings, both true, both meaning something other than what they look like. Before you build a
theory on a number out of Web Inspector, come here and find out what that number is measuring.

## Writing a probe file

The file is evaluated as an expression and whatever it returns is printed, so wrap it in an IIFE
and return a string — `JSON.stringify(..., null, 1)` reads well in a terminal.

`measure-text-scale.js` is the one kept in the repo. It builds the reader's real class chain
(`.app-body > .bible-panel > .bible-panel-scroll > .bible-verses > p`) against the shipped
stylesheet, walks `--text-scale` through 1 / 1.45 / 0.8 / 1.8, and reports both the computed
font-size and the **rendered advance width of a ruler span** at each. Keep that second number in
any probe you write: a computed font-size is a report, and this file exists because reports about
font size are the thing that lied. An advance width is a measurement of ink.

Expected output after the text-size rewrite (see "Global text size" in `src/App.css`), with the
reader signed out and the chain injected: `.bible-verses` at 15px, **21.75px**, **12px**, 27px,
and the ruler tracking it — 263.63 -> 382.27 -> 210.91 -> 474.53 at the default font stack.

## What it cannot do

- It cannot reproduce iOS text autosizing, so it cannot prove a fix on iOS. It can prove the fix
  does not *depend* on anything engine-specific, which is the property to design for.
- It cannot sign in. The reader is behind the auth gate, so a probe reaches `.auth-gate` for real
  and reaches the reading panels only by building their class chain against the real stylesheet.
- It renders a window. Do not run it expecting a headless process.
