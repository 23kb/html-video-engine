# Phase G — Doc Staleness Audit

Audit of the 7 docs flagged by Umair, plus the cross-cutting "why doesn't flipBridge get prominent mention" question. Each doc is referenced from one or more skill bodies, so staleness here means agents land on outdated guidance.

Last refactor merge: `5a8eab3` (Phase G complete). Phases B/C/D/E.5/F/G changed: surface modes, flipBridge, registered timelines, frame driver, camera poses, blocks library, text-kit 24 presets, pause-manager + pausableRaf, scrubber, render tool, determinism linter, skill packaging.

---

## 1. `docs/current-workflow.md` — STALE (7 gaps)

Last touched 2026-04-29 (pre-Phase B). Referenced from `wpforms-video` skill.

**Wrong:**

- Line 20: "MP4 capture is external (OBS/ffmpeg)" — **factually wrong now.** Phase E.5 ships `tools/render.js` for in-repo MP4 export. Wall-clock + `--seek` modes documented in `docs/render.md`.

**Missing:**

- Protected core list (lines 47, 222-228) doesn't include Phase B-E.5 additions: `runtime/frame-driver.js`, `runtime/frame-adapter.js`, `runtime/shared-scene.js`, `runtime/camera-poses.js`, `runtime/pause-manager.js`.
- Per-Video Edits Allowed list (lines 176-185) doesn't mention `videos/_shared/blocks/` (Phase D), nor authorize the registerTimeline / pausableRaf / registerCameraPose author APIs.
- "What To Read First" (line 55) doesn't mention skills. Lists `current-workflow.md` itself + AGENTS/CLAUDE + authoring-api + postintro-patterns + video-production-templates. Skills (Phase F) and `docs/INDEX.md` (Phase G) are absent.
- No mention of `surface: 'editorial' | 'mixed'` (Phase C).
- No mention of `flipBridge` swap style (Phase C) — even though Phase 0 QC + the form-entries-guide migration shipped this.
- Token floor (line 248) says "use `legacy-manifest-skeleton.md` etc. as first copy targets." Fine, but no mention of `wpforms-video` SKILL as the canonical entry.

**Recommendation:** rewrite to a thin "the workflow loop" doc that defers to `wpforms-video/SKILL.md` for rules, OR delete and replace with a one-liner in `docs/INDEX.md` pointing at the skill. The skill's "Approach" section already encodes this workflow.

**Risk if left stale:** agents reading `wpforms-video` skill → "see also `docs/current-workflow.md`" → land on doc that says MP4 is external + lists wrong protected core. They write `runtime/pause-manager.js`-touching code thinking it's OK.

---

## 2. `docs/video-production-templates.md` — STALE (5 gaps)

Last touched 2026-04-29. Referenced from `wpforms-video` skill.

**Wrong:**

- Chapter Authoring Checklist line 167-170 (protected core list inside the checklist): same omission as #1. Missing Phase B-E.5 protected files.
- Same checklist lines 197-203 (validator notes): doesn't mention Phase F lints (audio-vs-duration, pausableRaf usage, registerTimeline paused-precondition, deterministic-logic).

**Missing:**

- Storyboard Approval Template (line 22) doesn't ask author to declare `surface:` mode (iframe / editorial / mixed) — important for marketing-mode videos.
- Storyboard Approval Template doesn't ask author to declare `swapStyle:` choice for cross-snapshot work (flipBridge vs morph vs cover).
- No checklist item for "registered timelines used appropriately" or "pausableRaf used in any author RAF loop." These are real Phase F lint surfaces.

**Recommendation:** keep this doc — it's still the storyboard template. Two surgical edits:
1. Add `surface:` and `swapStyle:` declarations to Storyboard Approval Template.
2. Update Chapter Authoring Checklist with current protected-core list + Phase F lints.

---

## 3. `docs/examples/legacy-manifest-skeleton.md` — MOSTLY OK (1 gap)

Referenced from `wpforms-video` and `wpforms-postintro` skills. Last touched 2026-04-29.

**Accurate:**

- `breakStyle: 'glide'`, `swapStyle: 'morph'` are still the locked manifest defaults (per Phase C decision: `morph` stays default; `flipBridge` is opt-in per chapter or via `manifest.defaults` override). ✓
- Intro/outro shape with `variant: "sullie-system"` and `subtitleVariants` array is current. ✓
- `coverColor`, `hud`, `narrationSpeed` fields are current. ✓

**Missing:**

- No mention of optional `surface: 'editorial' | 'mixed'` field (Phase C). New ad-style videos need it. Add as commented-out example.
- No mention that `swapStyle: 'flipBridge'` is recommended for cross-snapshot tutorials. The morph default is fine; agents should know flipBridge exists as the upgrade path.

**Recommendation:** add a "Phase C optional fields" comment block. Keep the skeleton itself unchanged (don't break the locked shape).

---

## 4. `docs/examples/legacy-chapter-skeleton.md` — MOSTLY OK (3 gaps)

Referenced from `wpforms-video` and `wpforms-postintro` skills.

**Accurate:**

- `breakStyle: 'glide'`, `swapStyle: 'morph'` match current defaults. ✓
- Allowed imports list is roughly correct. ✓
- "Default camera levels are 2.0–2.4" guidance is current. ✓

**Missing:**

- Allowed imports list (lines 58-65) doesn't mention `videos/_shared/effects.js` (Phase A) or `videos/_shared/blocks/` (Phase D).
- ctx helpers list doesn't mention Phase B/C/E.5 additions: `registerTimeline`, `registerCameraPose`, `pausableRaf`, `awaitTween`. Those are imported from `_shared/kit.js`, not flowed through ctx, but the skeleton doesn't show how to use them.
- Doesn't show camera pose name reference (`camera: 'focus'` vs `camera: { focus: sel.x, level: 1.18 }`).

**Recommendation:** add a second example block showing the modern-features form (registered timeline + camera pose + pausableRaf). Keep the simple example intact for first-time authors.

---

## 5. `docs/examples/legacy-audio-cued-skeleton.md` — MOSTLY OK (2 gaps)

Referenced from `wpforms-video` skill.

**Accurate:**

- `mode: 'audio-cued'` + `waitAt(t)` choreography is correct. ✓
- `breakStyle: 'soft-dolly'`, `swapStyle: 'cover'` are legal and used by some chapters. ✓

**Missing:**

- Could note that `swapStyle: 'flipBridge'` is the modern preferred alternative for the embedded `swapToSnapshot` example (line 41-46), since flipBridge eliminates the cream-bleed seam.
- Same effects.js / blocks / kit additions as #4.

**Recommendation:** one comment line near the swap example: "// Phase C: `swapToSnapshot` honors the chapter's `swapStyle`. For cross-snapshot beats, prefer `swapStyle: 'flipBridge'` to eliminate cream-bleed."

---

## 6. `docs/examples/choice-field-generate-choices-skeleton.md` — MOSTLY OK (2 gaps)

Referenced from `wpforms-video` skill.

**Accurate:**

- Mode/narration/transition shape is current. ✓
- The custom modal HTML pattern is correct (use real captured DOM). ✓

**Missing:**

- Line 52: `requestAnimationFrame(() => modal.classList.add('is-visible'))` — single-shot RAF for class toggle. Phase E.5 rule says all author RAF should use `pausableRaf`. **Edge case:** single-shot toggle ≠ render loop. The Phase F lint warns vs errors here. Worth a comment: `// Single-shot RAF for class toggle; render loops MUST use pausableRaf. See wpforms-gsap-rules.`
- `swapStyle: 'cover'` could note flipBridge alternative (same as #5).

**Recommendation:** two one-line comments on existing patterns. No structural changes.

---

## 7. `docs/wpforms-field-state-inventory.md` — STABLE (no update)

Referenced from `wpforms-video` skill.

Hand-maintained inventory of WPForms product UI states. Phases B-G touched the video-builder runtime, not WPForms product UI. **Inventory remains canonical and current as of 2026-04-29.** No update needed from refactor work.

The doc is queried via `tools/field-state.js`; it's not full-read in normal authoring. Skill bodies enforce this.

**Recommendation:** none. Keep as-is.

---

## Cross-cutting: why doesn't `flipBridge` get prominent mention?

Where flipBridge is mentioned (good):
- `wpforms-transitions/SKILL.md` ✓ extensively, with decision tree
- `wpforms-postintro/SKILL.md` (See Also)
- `wpforms-marketing/SKILL.md` (See Also)
- `CLAUDE.md` (where-topic-rules-live map only — points at `wpforms-transitions` skill)
- `docs/INDEX.md` (mention only)

Where it's NOT mentioned (the gap):
- **`wpforms-video/SKILL.md`** — the highest-traffic skill, the one agents load by default for tutorial work. Doesn't mention flipBridge at all.
- `docs/current-workflow.md` (stale, see #1)
- `docs/examples/legacy-manifest-skeleton.md` (#3)
- `docs/examples/legacy-chapter-skeleton.md` (#4)
- `docs/examples/legacy-audio-cued-skeleton.md` (#5)
- `docs/examples/choice-field-generate-choices-skeleton.md` (#6)
- `docs/video-production-templates.md` (#2)

**Why this is bad:** an agent working on a tutorial video loads `wpforms-video` (correct) and starts authoring. They run into a chapter that swaps snapshots. They see the legacy chapter skeleton with `swapStyle: 'morph'` and they go with that. Cream-bleed seam in production. The agent never had a reason to load `wpforms-transitions` because their task was "author a tutorial," not "configure transitions."

**Same pattern for other Phase B-E.5 features:**
- Registered timelines — only in `wpforms-gsap-rules`. Agent loads `wpforms-video` for a postIntro and doesn't know paused timelines exist.
- Camera poses — only in `wpforms-transitions`. Agents inline `level: 1.18, pad: 14` into every beat.
- Surface modes — only in `wpforms-marketing`. Tutorial authors don't see them.
- pausableRaf — only in `wpforms-gsap-rules`. Author writes raw `requestAnimationFrame` in a Three.js beat.
- Blocks library — only in `wpforms-marketing`. Tutorial postIntros re-implement code-cards.

**Fix:** add a "Modern features cheat sheet" section to `wpforms-video/SKILL.md` (and similar to `wpforms-postintro`). Each entry: one-line feature + when-to-reach-for-it + which skill to load for detail. Cross-pollinates feature awareness without duplicating content.

---

## Proposed Phase G.1 — fix the staleness

Single follow-up commit on `phase-g-skill-architecture` branch (before merge to main). Scope:

### G.1a — Modern Features Cheat Sheet in `wpforms-video/SKILL.md`

Add a new section after "Modes" (~line 116):

```markdown
## Modern Features Cheat Sheet

Phase B-E.5/F/G additions worth reaching for. Each links to its dedicated skill.

| Feature | When to reach for it | Skill |
|---|---|---|
| `swapStyle: 'flipBridge'` | Any cross-snapshot transition. Eliminates cream-bleed seam. | `wpforms-transitions` |
| `registerTimeline(tl, { id })` | PostIntros + scrubbable editorial beats; survives hidden-tab RAF | `wpforms-gsap-rules` |
| `registerCameraPose('focus', spec)` | Repeat camera framing across beats; cleaner than inline `level:` | `wpforms-transitions` |
| `pausableRaf(cb)` | **Required** for any author Three.js / render-loop in chapters | `wpforms-gsap-rules` |
| `surface: 'editorial' | 'mixed'` | Ad-style / marketing video, or hybrid postIntro | `wpforms-marketing` |
| `videos/_shared/blocks/` | Editorial chrome (code-card, mac-window, pill, arrow, route-line) | `wpforms-marketing` |
| `videos/_shared/effects.js` | Standard effects: highlightPulse, fieldBurst, labelReveal, popOutTilt, cardReflow | `wpforms-gsap-rules` |
| `text-kit.js` 24 presets | Hero text reveals (mask-reveal-up, spring-scale-in, focus-blur-resolve, ...) | `wpforms-marketing` |
| `tools/render.js` | In-repo MP4 export | `wpforms-transitions` |
| `tools/preview.js` /scrubber | Live-reload + pause/seek author UI | `wpforms-transitions` |
| `tools/lint-determinism.js` | Determinism check before commit | `wpforms-gsap-rules` |
```

### G.1b — `current-workflow.md` slim or replace

Two options:
- **Replace:** delete and add a one-liner in `docs/INDEX.md`: "the workflow lives in `wpforms-video/SKILL.md` Approach section."
- **Slim:** rewrite to ~30 lines pointing at skills, fix the MP4-is-external lie, fix protected core list.

Recommend **slim** (option 2). Some codex sessions are pinned to read this doc; deleting risks breaking them.

### G.1c — Skeletons additions

Each skeleton (`legacy-manifest-skeleton.md`, `legacy-chapter-skeleton.md`, `legacy-audio-cued-skeleton.md`, `choice-field-generate-choices-skeleton.md`) gets:

1. A "Phase B-E.5 optional additions" comment block near the top with: `surface:` (manifest), `registerTimeline`, `registerCameraPose`, `pausableRaf` (chapter), `swapStyle: 'flipBridge'` for cross-snapshot.
2. The "Allowed imports" list updated to include `effects.js` and `blocks/`.

Don't break the locked-shape body. Add via comments + extra example block.

### G.1d — `video-production-templates.md` two surgical edits

1. Storyboard Approval Template: add `surface:` and `swapStyle:` declarations (per chapter or in defaults).
2. Chapter Authoring Checklist: update protected-core list + add Phase F lint items (audio-vs-duration, pausableRaf usage, registerTimeline paused-precondition, deterministic-logic).

### G.1e — `wpforms-postintro/SKILL.md` — add modern-features pointers

Same shape as G.1a but scoped to postIntro-relevant features (registered timelines for postIntro choreography, blocks library for editorial chrome, text-kit for hero reveals, flipBridge if postIntro swaps snapshots mid-flight).

---

## Effort estimate

Per item:
- G.1a (cheat sheet): 1 edit, 15 min
- G.1b (workflow slim): 1 edit, 30 min
- G.1c (4 skeletons × 2 edits each): 8 edits, 30 min total
- G.1d (templates 2 edits): 2 edits, 15 min
- G.1e (postintro cheat sheet): 1 edit, 10 min

Total: ~12 small edits, < 2 hours of editorial work. Single commit on `phase-g-skill-architecture` branch.

---

## Risk if NOT fixed

Pretty real. Every Phase B-E.5 architectural win is opt-in by author awareness. If the docs/skills agents read upfront don't surface them, they're effectively shelfware. Specifically:

- **flipBridge unused** in new tutorials → cream-bleed seam reappears, undoing Phase C.
- **Registered timelines unused** in postIntros → hidden-tab GSAP hangs come back, undoing Phase B.
- **pausableRaf skipped** in new Three.js beats → scrubber can't pause them, undoing Phase E.5 for new work.
- **Camera poses unused** → inline `level: 1.18, pad: 14` proliferates, future authors fight with hard-coded numbers.
- **Surface modes unused** → next ad-style video reinvents the editorial fork instead of declaring `surface: 'editorial'`.

Phase G shipped the architectural inversion (CLAUDE.md slim + skills rich). Phase G.1 makes the architectural wins discoverable from inside the skills.

Recommend executing G.1 before merging `phase-g-skill-architecture` to main.
