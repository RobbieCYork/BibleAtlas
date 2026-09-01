# Capstone Bible — To Do

Running list of open items. Newest context at the top of each section.

---

## Needs your decision

- [ ] **Mobile text size — 3 diagnostic questions.** Fully quit the installed app from the app switcher and relaunch, then: (1) tap A+ four times — does the **percentage readout itself** change to 160%? (2) does the text **column get narrower** as size goes up — same words per line, just fatter letters? (3) installed app or Safari tab, and does the other behave differently? Answers decide which iOS-only path to chase. A latent bug that would produce exactly this symptom was already fixed (`8ea570e`), so it may already be resolved.
- [ ] **Instagram `@capstonebible`** — still not created. Needs you (account creation requires setting a password). Handle was confirmed available. Everything after that — bio, category, linking to the FB page — is ready to go.
- [ ] **Timeline lanes** — World History and Other Religions are still their own lanes. Merge them into the main lane too, or leave them? One-line change either way.
- [ ] **Tab bar** — Timeline, Games and Notes have no other mobile entry point, so hiding one makes it unreachable until re-enabled in Settings. Fine as-is (Reset is one tap), or should those three be non-hideable?
- [ ] **Map water labels** — sea/lake names are still warm brown ink, not blue. Period-correct for a hand-tinted map, but a one-line change if you want them in the water family.
- [ ] **Olive grove share image** — the one image where compression is visibly working hard (dense foliage forced quality down to 54). Re-roll for a cleaner composition?
- [ ] **Comments** — can be neither edited nor deleted anywhere in the app (no UI, no UPDATE/DELETE policy on `post_comments`). Deletion is arguably the bigger gap. Queue it?
- [ ] **Posts** — after publishing, only the body text can be edited. Photos, video, tags and public/private can't be changed.

## Known bugs

- [ ] **Linker treats any digit-containing phrase as a verse reference.** `computeLinkAnnotations` — so a timeline title like "The Great Schism of 1054" renders as a verse link that would fire a scripture lookup on the title. Worked around in the new articles, not fixed.
- [ ] **Council of Nicaea is categorised `biblical`, not `church`** in the timeline data, so it renders among the Scripture marks. Likely other post-apostolic events are mis-tagged the same way — worth a data pass.
- [ ] **Reading Plans is nearly unreachable.** The plan list only renders on the empty welcome screen (gated on no book open), but returning readers get their chapter restored and new visitors land on Matthew 1 — so that screen essentially never appears. Six plans most users will never find. Suggested fix: a persistent chip in the Bible toolbar.
- [ ] **POI trivia questions are all hardcoded `testament: "new"`**, so Old Testament-era sites land in the New Testament preset.
- [ ] **Role-question distractors are drawn from all topic roles**, so "What best describes 'The Temple'?" can offer "Pre-Israelite Inhabitants of the Promised Land" — implausible rather than wrong. Pre-existing.

## Enhancements

- [ ] **Articles for archaeological finds** — locations, discoveries and papyri mentioned in the archaeology sections should have their own articles. (Last remaining item from the 16-item list; the rest are shipped.)
- [ ] **Share backgrounds — `landscape` category has only 2.** Needs a batch: fields, storm skies, sunrise over ocean, lakes beyond the alpine one. Generation degraded badly mid-run last time, so this is a fresh-session job.
- [ ] **Timeline events can't carry clickable sources.** `TimelineEvent` has no `sources` field — only `externalRefs: string[]`, and zero of its 174 citation strings are URLs. `TimelineEventPanel` already has URL-detection code that never fires. ~15 lines to add, mirrors four existing panels, unlocks citations for all 356 events. Highest value per hour of anything on this list.
- [ ] **`SourceCitation` has no `note` field**, so a peer-reviewed article looks identical to a Britannica entry.
- [ ] **Articles has no header search** — it searches in-panel only. Separate gap if you expected one there.
- [ ] **Timeline on small screens** — the merged lane falls back to numbered cluster badges at default zoom on a 375px phone, where the old biblical-only lane sometimes fit individual labels. Tap-to-zoom works, but it's a real difference. Raising `MAX_EVENT_ROWS` trades it for a taller scrolling lane.

## Housekeeping

- [ ] **Verify `admin@capstonebible.com` is actually live** — GoDaddy showed "Hang tight, we're setting up your email account" when it was created.
- [ ] **Buy `capstonebible.org`** defensively (~$15-20/yr, redirect to .com) — flagged early, never done.
- [ ] **Rename the GitHub repo** `RobbieCYork/BibleAtlas` → something matching the brand. Cosmetic.
- [ ] **Untracked files sitting in the repo root** — `AUDIT_FIXES_README.md`, `Bible_Atlas_Full_Audit.docx`, `claude_code_handoff.json`, and four `brand-*.png` source images (~6MB). Commit them or delete them; they've been skipped by every agent all session.
- [ ] **`Bible Timeline/christian-history-atlas`** is dead weight — that app was merged into the main timeline long ago. Archive or delete.
- [ ] **Install Xcode** (App Store, then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`). Without it the iOS Simulator is unavailable, which is why mobile-only bugs keep needing your phone to verify.

## Parked

- [ ] **Scholarly papers / in-app source texts.** Research is done and saved — since the app will be commercial: host from Wikisource only; CCEL and New Advent are link-only; avoid papalencyclicals.net (in-copyright translations). Best lay-facing link target is Christian History Magazine.
