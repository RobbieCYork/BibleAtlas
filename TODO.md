# Capstone Bible — To Do

Running list of open items. Newest context at the top of each section.

---

## 🔴 Blocking new signups right now

The whole site now requires an account and email confirmation is on, so these two
settings are the difference between people getting in and not. Existing accounts
still log in fine; it is new signups that are dead.

- [ ] **Fix the confirmation link's destination.** Supabase → Authentication → URL
  Configuration. Set Site URL to `https://capstonebible.com` and add it to Redirect
  URLs. Measured: confirmation emails currently link to `bible-atlas-alpha.vercel.app`,
  a dead Vercel preview, because the live domain isn't on the allow-list. Anyone who
  signs up right now can never reach the app. ~60 seconds.
- [ ] **Wire up real SMTP.** Supabase → Authentication → SMTP Settings, with Resend,
  Postmark or SendGrid (free tiers are far above this app's needs). Measured: the
  built-in sender allows roughly **one confirmation email per 3 minutes, project-wide**
  — the first test signup got a 429, and five back-to-back all did. Mail also comes
  from `noreply@mail.app.supabase.io` via shared infrastructure, so SPF/DKIM can never
  align with capstonebible.com and it will keep landing in spam. Verifying the domain
  with a provider fixes the rate limit and the alignment together. ~20 minutes.
  (Delivery speed itself is fine — 10 seconds when not throttled.)

## Needs your decision

- [ ] **Instagram `@capstonebible`** — still not created. Needs you (account creation requires setting a password). Handle was confirmed available. Everything after that — bio, category, linking to the FB page — is ready to go.
- [ ] **Tab bar** — Timeline, Games and Notes have no other mobile entry point, so hiding one makes it unreachable until re-enabled in Settings. Fine as-is (Reset is one tap), or should those three be non-hideable?
- [ ] **Olive grove share image** — the one image where compression is visibly working hard (dense foliage forced quality down to 54). Re-roll for a cleaner composition?
- [ ] **Posts** — after publishing, only the body text can be edited. Photos, video, tags and public/private can't be changed.

## Known bugs

- [ ] **Council of Nicaea is categorised `biblical`, not `church`** in the timeline data, so it renders among the Scripture marks. Likely other post-apostolic events are mis-tagged the same way — worth a data pass.
- [ ] **POI trivia questions are all hardcoded `testament: "new"`**, so Old Testament-era sites land in the New Testament preset.
- [ ] **Role-question distractors are drawn from all topic roles**, so "What best describes 'The Temple'?" can offer "Pre-Israelite Inhabitants of the Promised Land" — implausible rather than wrong. Pre-existing.

## Enhancements

- [ ] **Share backgrounds — `landscape` category has only 2.** Needs a batch: fields, storm skies, sunrise over ocean, lakes beyond the alpine one. Generation degraded badly mid-run last time, so this is a fresh-session job.
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
