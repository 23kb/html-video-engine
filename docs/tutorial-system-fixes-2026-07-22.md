# Tutorial-side system fixes — from the entry-automation build (2026-07-22)

Scope: **tutorial pipeline only** (Umair: marketing side is fine). Every item below is friction actually hit while building `videos/entry-automation/` end-to-end (storyboard → captures → author → 3 QC rounds). Ordered by expected payoff; each item is self-contained.

**This is a LIVING BACKLOG with a two-session contract (Umair, 2026-07-22):**
- The **video session** (working `videos/entry-automation/ISSUES.md`) fixes the video video-locally and APPENDS new system findings here (dated, symptom → root cause → fix format) — it does not execute this file.
- The **system session** executes this file **only after the entry-automation video has completely shipped** (check the wiki in-flight entry at `C:\Users\PC\Desktop\umair-wiki\video\ideas.md` — topic moved to "Shipped" — or Umair confirms). Use the shipped video as the regression fixture: after each change, `validate-singlehtml` + `smoke-singlehtml` on entry-automation must stay green WITHOUT editing the video.
- **P1-9 (Chatterbox) is DEAD** — superseded 2026-07-22 by ElevenLabs + Kacie voice ID (see ISSUES.md issue 4). Do not build it.

---

## P0 — direct causes of QC iterations this run

### 1. ✅ DONE 2026-07-23 — Capture serializer drops property-level state (checked / value / selected)
**Shipped:** pre-serialize bake pass in `capture/capture.js` (input value/checked → attributes, select option → `selected`, textarea → textContent; password/file inputs excluded). Proven by a new 8-check property-bake gate in `tools/__tests__/capture-hardening.test.js` (19/19) + a live throwaway capture against sullies-bakery (sandboxed `WP_SNAPSHOT_ROOT`).
**Symptom:** every JS-driven state set during capture steps (`input.value = …`, `radio.click()`, `select.value + change`) vanished from the serialized HTML — the DOM attribute never updates. Cost: the name-overlay capture showed the default task name instead of the typed one; the export radio serialized unchecked; the Google account `<option selected>` was lost. Every one needed a per-video runtime re-derivation helper (`checkExportRadio`, `prepGdriveDoc`, …).
**Fix:** in `capture/capture.js`, run a pre-serialize bake pass in the page: for every `input`, `setAttribute('value', el.value)` + `checked` → attribute; for `select`, set `selected` attribute on the current option; `textarea` → textContent. ~15 lines, fixes every future addon capture.

### 2. ✅ DONE 2026-07-23 — `trim-builder-markup.js` strips live AJAX-rendered addon sections
**Shipped:** (a) over-trim guard in `tools/trim-builder-markup.js` — chrome removals (help/wpfooter/mceu/off-canvas panels) are SKIPPED loudly when their chunk contains load-bearing addon markers (`wpforms-entry-automation*`, `wpforms-builder-entity-connection*`, `wpforms-builder-inner-provider*`, provider connections); fields-only whole-panel drops deliberately bypass the guard. (b) Loud output: every removal prints its root open-tag signature; stripped panel ids listed. (c) `capture.js` records `waitFor` in meta.json; `post-capture.js` re-verifies it headless after the pipeline and FAILS (exit 1) if the anchor is gone; `--no-trim` flag added. Tests: `tools/__tests__/trim-guard.test.js` (13/13) + 2 new gates in `post-capture-pipeline.test.js` (16/16). Guard fires on zero existing snapshots (pure tripwire).
**Symptom (two hits):** (a) the Add New Connection button (`.wpforms-builder-inner-provider-connection-add`) survived capture but was gone after post-capture — masked a real product-truth question for an hour; (b) the gdrive-signin task block came out with its `.wpforms-builder-settings-block-content` inline-`display:none` (collapsed), so the sign-in button had zero layout at runtime → silent glide no-op.
**Fix:** teach the trimmer that server-AJAX-rendered addon sections inside the ACTIVE settings section are load-bearing: allowlist `.wpforms-entry-automation-*`, `.wpforms-builder-entity-connection*`, provider inner sections — or add `--no-trim` to `tools/post-capture.js` and print WHAT was removed (count + selectors) so stripping is visible instead of silent. Bonus: post-capture should re-verify the capture plan's `waitFor` selector still resolves after trimming and FAIL loudly if not.

### 3. ✅ DONE 2026-07-23 — No measured-duration tool for narration → DUR desync class
**Shipped:** `tools/measure-narration.js <slug> [--settle 0.4]` — ffprobes every `narration/*.mp3`, prints per-clip measured + settled values and the ready-to-paste `const DUR = {...}` block (scene-ordered, chapter-grouped, intro/postintro first, outro last; exit 1 on any probe failure so a bad clip can't silently drop out). Verified: reproduces the shipped entry-automation DUR table exactly (21/21 keys byte-identical values).
**Symptom:** the DUR table is hand-copied from TTS console output (+0.4s settle). ch4's "audio and steps not in sync" QC round traces to hand-estimated durations + motion overruns.
**Fix:** `tools/measure-narration.js <slug>` — ffprobe every `narration/*.mp3`, print the ready-to-paste `const DUR = {...}` block (duration + 0.4, keys sorted by scene). One command after every `tts/generate.js` run.

### 4. ✅ DONE 2026-07-23 — Beat motion-overrun is invisible until Umair's eye catches it
**Shipped:** shared `beat()` in `videos/_shared/narration.js` now records `window.__beatStats[key] = { motionS, durS, overrun }` when the motion settles (fire-and-forget, same shape as the entry-automation video-local wrapper, never affects beat timing); `tools/smoke-singlehtml.js` WARNS on any beat whose motion resolved > DUR + 0.5s, naming the beat with motion-vs-clip seconds. New `?overrun=1` mini-video fixture mode + Gate 5 in `smoke-singlehtml.test.js` (19/19); `narration-hardened.test.js` still 20/20 (frozen-RAF safe).
**Symptom:** the ch3 "view jumps to top" bug = a beat's fire-and-forget motionFn outliving its narration clip, its trailing `camReset` firing during the NEXT beat's scroll. Nothing static catches this.
**Fix:** instrument the shared `beat()` in `videos/_shared/narration.js`: record `motionMs` vs `durMs` per beat into `window.__beatStats`; `tools/smoke-singlehtml.js` then WARNS on any beat whose motion resolved > DUR + 0.5s. Turns a whole QC-round class into a static failure.

## P1 — pipeline gaps that cost time this run

### 5. ✅ DONE 2026-07-23 — Missing single-HTML tutorial skeleton (skill contract broken)
**Shipped:** `docs/examples/single-html-tutorial-skeleton.html` promoted from the shipped entry-automation video (content stripped to TODO/CHANGE-ME placeholders; keeps hardened say/beat + DUR contract, `swapPrepared` with post-settle re-prep, `iqVisible`, `showSettingsSection`, fly/camReset pair (withTimeout-wrapped), framed-action contract (`awaitLayout`/`inCameraView`/`gcFramed`/`ddFramed`), scene-review wiring, START_SNAPSHOT + SCENE_PREP convention, top-strip chapter pill, 1720×868 mac frame with ×1.246377 slot wrapper, full instrumentation, text-kit outro). Also restored from git (clean-room branch objects): `videos/switch-to-wpforms-entry-importer/index.html`, `videos/form-analytics-complete-guide/index.html` (both validate 0 errors), and `docs/examples/single-html-postintro-skeleton.html`. `skeletons.test.js` 21/21 and `narration-hardened.test.js` 20/20 are green again (both were crashing on the missing files).
**Symptom:** `wpforms-video` says "First write = copy the skeleton: `docs/examples/single-html-tutorial-skeleton.html`" — the file does not exist. Also `videos/form-analytics-complete-guide/index.html` and `videos/switch-to-wpforms-entry-importer/index.html` are deleted from the working tree (folders + narration remain); FA was recovered from git object `27c8743` this run.
**Fix:** promote the current `videos/entry-automation/index.html` (post-QC) into `docs/examples/single-html-tutorial-skeleton.html` (strip content, keep: hardened say/beat + DUR contract, swapPrepared, iqVisible, showSettingsSection, fly/camReset pair, scene-review wiring, top-strip chapter card, 1720×868 mac frame, instrumentation). Restore or explicitly tombstone the two missing reference index.html files.

### 6. ✅ DONE 2026-07-23 — New-plugin asset leakage → snapshot 404s
**Shipped:** (a) asset localizer in `capture/capture.js` — every same-host `url()` ref in inlined stylesheets AND in emitted `assets/*.css` files that isn't already pooled gets fetched via the logged-in page context and rewritten into `assets/` (root-relative `/wpforms/...` refs were escaping both the pooled-asset rewrite and the host-kill regexes); CSS-file refs rewrite to pooled sibling filenames and force-emit. (b) `tools/lint-snapshot-assets.js <slug>` — serves the repo root, loads the snapshot headless, FAILS on any 4xx/5xx asset request; wired into post-capture as step 8b. Proof: fresh throwaway capture of the EA builder settings page (the exact 30-404 page class) → localizer pooled 197 out-of-snapshot assets → lint: zero failed requests. Negative proof: synthetic dangling-ref snapshot fails the lint with the offending URLs listed.
**Symptom:** 30 console 404s on first smoke: per-snapshot `assets/*.css` resolving `../webfonts/fa-*.woff2` (needs `snapshots/<slug>/webfonts/`), root-absolute `/wpforms/assets/images/builder/*.svg` and `/images/integrations/ai/*.svg` (new plugin CSS), `snapshots/images/cross.svg`. Hand-fixed this run by mirroring at repo root (`wpforms/assets/images/builder/`, `images/integrations/ai/`, `snapshots/images/`) + copying woff2s per snapshot.
**Fix:** (a) capture.js asset-localizer: also fetch url() refs that resolve OUTSIDE the snapshot folder and rewrite them into `assets/`; (b) until then, a `tools/lint-snapshot-assets.js` that loads a snapshot headless and lists 404s — post-capture step 8.

### 7. ✅ DONE 2026-07-23 — capture.js credentials come from a stale `.env`, not `tools/sites.json`
**Shipped:** `node capture/capture.js --site sullies-bakery ...` reads url/adminUser/adminPass from `tools/sites.json`; env vars stay as per-field overrides; unknown site names and TODO-placeholder entries error with the available site list. Proven live: the P1-6 throwaway capture ran entirely via `--site sullies-bakery` with no WP_* env.
**Symptom:** first capture run failed on login — `.env` `WP_URL` points at `newsite.local`; the canonical registry (`tools/sites.json`, used by site-eval/preflight) already has sullies-bakery + creds. Run-long env prefixes everywhere.
**Fix:** `capture.js --site sullies-bakery` reads sites.json (env vars stay as override).

### 8. ✅ DONE 2026-07-23 — Non-WP snapshots have no registration path
**Shipped:** `tools/capture-external.js <url> <slug> [--wait-url <regex>] [--wait-for <sel>] [--viewport WxH] [--shows/--topics/--category]` — generalizes `capture/_tmp/grab-google-oauth.js`: scripts/noscript/iframes stripped, external CSS inlined as `<style>`, images inlined as data URIs, `<base>` tag removed (the preview-ws CORS noise cause), charset ensured, meta.json written, self-registers in `snapshots/index.json` (category `external`; `_`/`zz-` slugs skip). `--wait-url` handles middleware redirect flows (the google-drive-connect pattern). Proven: example.com + the real accounts.google.com sign-in page both freeze self-contained and pass `lint-snapshot-assets` with zero failed requests; registration entry verified then test artifacts removed.
**Symptom:** the google-oauth-signin freeze (external page, made with a one-off Playwright script) failed `validate-singlehtml` until hand-added to `snapshots/index.json`; it has no catalog/outline and post-capture would mangle it.
**Fix:** either a `tools/register-snapshot.js <slug> --category external --shows "…"` helper, or generalize `capture/_tmp/grab-google-oauth.js` into `tools/capture-external.js <url> <slug>` (scripts stripped, css+img inlined, base-tag removed — the base-tag caused preview-ws CORS noise this run) that registers itself. Addon tutorials will need OAuth/consent pages again (Dropbox, Google Sheets, Slack…).

### 9. Chatterbox (Kacie voice) integration — queued tool work
State: skill folder at `C:\Users\PC\Downloads\chatterbox-voice-clone-skill` (nested 3 deep; skill expects `~/.claude/skills/chatterbox-voice-clone/`). No venv on this machine yet, no `voices/kacie.wav` (Umair must supply). Skill is Mac-flavored — Windows adaptation needed: `~/.chatterbox-env/Scripts/python.exe`, device `cuda`/`cpu` (not `mps`), `setup.sh` → manual pip steps. Then either wire as a `tts/generate.js` backend (per dev-advocacy skill: three fetch calls — n/a here, it's local python; write a `--engine chatterbox` path that shells out per line) or run the skill's per-line loop and drop WAV→mp3 into `narration/`. **Do outside a video slot.**

## P2 — skill-text updates (dev-advocacy-video + wpforms-video)

### 10. ✅ DONE 2026-07-23 — Standing rulings from this run — bake into `dev-advocacy-video/SKILL.md`
**Shipped:** all six rulings baked into `.claude/skills/dev-advocacy-video/SKILL.md` (postIntro MUST + full multi-animation rule; OAuth/connect flows in scope with `tools/capture-external.js` pointer; top-of-stage chapter pill; mac body ≈ 90% stage width with exact numbers; TTS-spelling pass; outro full doc URL). Also: blog-voice + `<break>` pause markup in the narration bullet; the Narration section rewritten around the shipped `--engine elevenlabs` + `ELEVENLABS_VOICE_ID_KACIE` + `measure-narration` re-measure rule. Companion contracts (field-attention, camera-follows-cursor/framed-actions, SCENE_PREP, measured DUR) added to `wpforms-video` SKILL.md as "Single-HTML sync contracts" + a single-HTML Output Checklist.
- **PostIntro is a MUST for rock tutorials** — Umair overruled the skill's "default: skip" (2026-07-22). Replace that bullet: postIntro required, built to the full multi-animation rule; the concept still gets ruled at the storyboard gate.
- **Connect/OAuth flows are IN scope** for addon tutorials — if the doc walks through connecting an account, the video shows it (real sign-in state + frozen real OAuth page; never fabricate). This run's ch3 rework exists because I scoped it out.
- **Chapter headings live in a top-of-stage pill**, not centered over the UI.
- **Product UI fills the frame** — mac body ≈ 90% stage width (1720×868 for 1380×668 captures, same aspect, ×1.246 upscale); the 71%-width frame read as "too small" at first QC.
- **Narration TTS-spelling pass** before `tts/generate.js`: URLs → "WPForms dot com", initialisms spaced ("F T P", "A M"). Cheap lint idea: grep `narration/*.txt` for `\.(com|org)\b|http` and warn.
- **Outro card carries the doc's full URL as text** (e.g. `https://wpforms.com/docs/entry-automation-addon/`) — distribution target is the doc.

### 11. ✅ DONE 2026-07-23 — Doc-staleness feedback loop (free doc-QA for Umair)
**Shipped:** dev-advocacy-video ship checklist step 3 now reads: log doc↔product divergences into `docs/product-truth/<feature>.md` and TELL UMAIR, with the EA account-dropdown divergence cited as precedent.
This run found live-plugin behavior diverging from the doc: with Google Drive already authorized, the EA editor renders the account dropdown directly — the doc's "click Add New Connection" step doesn't occur (server render, addon v2.0-era). Add one line to the dev-advocacy ship checklist: *"log any doc↔product divergences found while building into `docs/product-truth/<feature>.md` and tell Umair"* — he owns the docs; each video doubles as a doc audit. (This divergence is already noted in `docs/product-truth/entry-automation.md` — flag it when updating the EA doc with the video embed.)

### 12. Preview-server ownership on :4321
`smoke-singlehtml`'s `ensureServer` leaves a node process owning :4321 that `.claude/launch.json` `preview_start` then refuses to adopt ("not a preview server"). Unify: either smoke reuses `tools/preview.js`, or launch.json gains the smoke server, or document "smoke first, then URLs just work."

---

## State pointers for the next session
- Video: `videos/entry-automation/index.html` (backup: `index.before-qc-2026-07-22.backup.html`) — QC round 3 done, all validators/smokes green, __dur 187s. Umair's eye is the next gate.
- Wiki in-flight: `C:\Users\PC\Desktop\umair-wiki\video\ideas.md` (stage + remaining steps).
- Site state to eventually restore: Drive connection label swapped to `sullie@sulliesbakery.com` (original in site option `ea_video_gdrive_label_backup`); provider backup copy in `ea_video_gdrive_provider_backup` (already restored, kept as safety); seeded form 1725 + 36 entries + active task are load-bearing for recaptures — do not delete until the video ships.

---

## 2026-07-22 (QC r4 video session) — appended findings

### 13. IframeManager viewport≠iframeSize upscale path silently broken (issue-1 root cause)
**Symptom:** constructing `IframeManager` with `viewport: 1720×832, iframeSize: 1380×668` displays the iframe at NATIVE 1380×668, centered — the cream `#F4F1EC` slot background shows as a band inside the mac body. Every prior pilot used viewport===iframeSize, so the upscale path was never exercised.
**Root cause:** `_origin` centers `physical × baseScale` (= iframeSize) inside the viewport; no fit-scale is ever composed into `_baseScale`/`_cameraTransform`/`iframePointToStage`/`cameraToElement`/settle-mode.
**Fix (video-local this run):** slot back to 1:1 1380×668 + static `scale(1.246377)` wrapper on `.iframe-stage` (cursor + highlights mount inside → all slot-local coords ride the transform). **Systemic:** either implement fit-scale properly across the 5 coordinate paths, or `throw` in the constructor when viewport≠iframeSize with a pointer at the wrapper-scale pattern.

### 14. ✅ DONE 2026-07-23 — smoke-singlehtml should FAIL on unresolved targets by default (issue-3 acceptance)
**Shipped:** glide-warns now FAIL smoke by default; `--no-strict-glide` downgrades to ⚠ (`--strict-glide` kept as accepted no-op). Gate 4 of `smoke-singlehtml.test.js` rewritten for the new contract. Entry-automation fixture passes the strict default (zero glide-warns at baseline). Note: the second half of #14 (video-local `gcFramed`/`ddFramed` emitting `[glideClick]`-prefixed warns) is part of #15 (helper promotion), still open.
**Symptom:** r3 shipped with ch3-2's sign-in click silently no-opping — cursor+camera at page top while TTS said "Continue with Google". Helpers warn+continue; smoke passes green.
**Fix:** make `--strict-glide` the DEFAULT (opt out with `--no-strict-glide`), and have the video-local framed-action helpers (`gcFramed`/`ddFramed`, see #15) warn with the `[glideClick]` prefix so the existing regex catches them. Proven this run: strict smoke caught a real ch1-2→ch2-1 overrun cascade pre-QC.

### 15. Promote the framed-action contract into iframe-helpers.js
**Symptom:** camera and cursor can diverge from the narrated action after swaps/section changes (Umair MUST FIX, issue 3): targets resolve null/zero-layout mid-crossfade, `gc()`/`fly()` fail soft, cursor glides to stale coords while the camera never moves.
**Fix:** promote this run's video-local helpers into `videos/_shared/iframe-helpers.js`: `awaitLayout(target, timeout)` (poll until laid out), `inCameraView(el)`, `gcFramed` (awaitLayout → scroll once → fly-if-outside-frame → glideClick with `scroll:false` — the double-scroll cost ~0.7s/action and caused the overrun in #14), `ddFramed` (same for faux-dropdown picks). Also promote the `swapPrepared` post-await re-prep (prep must be idempotent; re-run after the swap settles kills the pre-reveal race class) — candidate: `IframeManager.swapPrepared(slug, prep, opts)`.

### 16. ✅ DONE 2026-07-23 — Scene-vs-full-run parity needs a first-class SCENE_PREP convention (issue 2)
**Shipped:** SCENE_PREP baked as a REQUIRED sibling of START_SNAPSHOT in the `wpforms-video` sync contracts AND in the promoted skeleton (worked example); the `beat()` motion-vs-DUR instrumentation is now in shared `videos/_shared/narration.js` (see #4) so every video gets overrun evidence for free.
**Symptom:** `?scene=chX` runs open on snapshot defaults while full runs carry accumulated property-level puppetry (radio checked, selects picked, inputs typed) — Umair flagged ch2 "different than the ch2 played in index.html", other chapters too.
**Fix:** the `SCENE_PREP` map pattern (one idempotent function per scene replaying prior chapters' visible state, applied right after `ifm.load`) worked here — bake it into the wpforms-video skill as a REQUIRED sibling of `START_SNAPSHOT`, and add the `beat()` motion-vs-DUR instrumentation (`window.__beatStats`, implemented video-locally this run) into `videos/_shared/narration.js` so every video gets overrun evidence for free (this IS P0-4, proven).

## 2026-07-23 (system session) — execution summary

Executed per the two-session contract (video shipped 2026-07-22). **DONE: #1 #2 #3 #4 #5 #6 #7 #8 #10 #11 #14 #16** — see per-item notes. **#9 skipped (DEAD).** Regression fixture held: `validate-singlehtml entry-automation` 0/0 and `smoke-singlehtml entry-automation --seconds 240` PASS (21 cues, no glide-warns under the new strict default, 17 instrumented beats within DUR+0.5s) with zero edits to the video. One caveat from this session: the 240s fixture smoke is contention-sensitive — a run overlapping other Playwright work falsely failed (9 cues in 288s); re-run on an idle machine passed. Run it alone.

**Test-suite state after this session (`node tools/__tests__/run-all.js`): 16/19 files pass.** The suite was at 13/19 when the session started (narration-hardened + skeletons crashed on the lost clean-room files — fixed by #5's restores; docs-adoptions fixed by restoring `capture/capture-library.md` + `docs/product-truth/form-analytics.md` from the clean-room stash and correcting CLAUDE.md's "auto-triggers" claim, FIX-8/FIX-20 class). The 3 remaining failures are pre-existing and OUT of tutorial-side scope:
- `no-total-endcheck.test.js` + `validate-singlehtml.test.js` (Gate 4): **klaviyo-bridge-2** still has its `if (t > TOTAL)` end-check at line 2921 — the FIX-3 repair was committed only on the orphaned `test/fa-clean-room-2026-07-13` branch (`afa6de0`). Bridge-2 is the accepted marketing-side core reference; restoring its fixed index.html from that branch is a one-command decision for Umair, not this session's.
- `generate-snapshot-outline.test.js` (12 KB cap): the six `builder-settings-entry_automation*` outlines run 12.4–12.5 KB because the video session's snapshots skipped the builder trim (dry-run shows −62.3 KB each available). Trimming them touches the shipped video's load-bearing snapshots — deferred until recaptures are no longer needed (site-state note below).

**Still open (not in the session's ordered scope):**
- **#12** preview-server ownership on :4321 — untouched.
- **#13** IframeManager viewport≠iframeSize upscale — documented (skeleton + skill warn against it); the systemic fix (fit-scale across 5 coordinate paths, or a constructor throw) needs a decision on whether a throw could break existing videos.
- **#15** promote `awaitLayout`/`inCameraView`/`gcFramed`/`ddFramed` + `swapPrepared` into `videos/_shared/iframe-helpers.js` / `IframeManager` — the contracts are in the skill + skeleton (video-local), library promotion still pending. The `[glideClick]`-prefix warn convention is baked into the skeleton copies.

---

### 17. ElevenLabs TTS backend shipped; Chatterbox (#9) is DEAD
**Status:** `tts/generate.js --engine elevenlabs` shipped this run (key from env/.env; voice = `--voice` flag or `ELEVENLABS_VOICE_ID_KACIE`, hard error when unresolved; model default `eleven_multilingual_v2` — honors `<break time="0.6s" />` + punctuation pacing; direct mp3, `ffprobe` duration in the log — partially covers P0-3). Entry #9 (Chatterbox): **DEAD per Umair 2026-07-22**, do not build. Remaining: `ELEVENLABS_VOICE_ID_KACIE` pending from Umair; after the final-voice render, re-measure DUR + retime (durations WILL shift between voices — the DUR table is voice-coupled, which is the strongest argument for the P0-3 measure-narration tool).
