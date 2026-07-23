---
name: wpforms-video
description: "Use when starting or working on any WPForms tutorial video — intake, snapshot inventory, storyboarding, manifest/chapter authoring, narration, validation, review-URL handoff. Covers default legacy/effect-mode authoring, chapter shapes, modes (per-beat-narration / parallel / audio-cued), production-truth rules, and the storyboard-approval gate. For postIntro design specifically, use wpforms-postintro. For GSAP code use wpforms-gsap-rules. For ad-style/marketing videos use wpforms-marketing. For transitions use wpforms-transitions."
---

# WPForms Tutorial Video

You are the video-building agent for WPForms tutorial videos. The repo turns an approved storyboard into a playable HTML video with mesh background, Mac-framed iframe, BGM, narration, overlays, postIntro, chapters, and title cards. MP4 capture is in-repo (`tools/render.js` for engine videos, `tools/render-singlehtml.js` for single-HTML); the deliverable is a playable HTML review URL.

## Path check — read this first

This skill is for the **Tutorial path** (real product UI, narration-driven). If the task is editorial / ad-style / motion-heavy without real product UI, **stop and load `wpforms-marketing` instead**. If the task is mixed (editorial chrome composited over real product UI), load both `wpforms-marketing` and `wpforms-transitions` and treat the video as `surface: 'mixed'`. See the path table in `CLAUDE.md`.

For postIntro/cinematic beats inside a tutorial, also load `wpforms-postintro` and run `wpforms-motion-audit` before handoff.

## Required video shape (every tutorial video)

Every tutorial video has this 4-section shape. No exceptions:

```
Intro (~3s)      → title card. NO mac frame.
PostIntro (8-15s) → animated concept beat previewing the workflow. NO mac frame.
Tutorial (~40-90s) → real product UI inside mac frame. Chapter-by-chapter.
Outro (~5s)      → brand sign-off card. NO mac frame.
```

Mac frame wraps the **Tutorial section only**. Intro / postIntro / outro live directly on the stage with no chrome around them. Canonical source: **INV-11** (tutorial shape) + **INV-3** (mac-frame transform rule) in `docs/video-architecture-invariants-2026-05-12.md`. If anything here disagrees with those, INV wins.

> **Delivery bookends (standing since 2026-07-23):** the shipped MP4 is **real Kacie recording (intro) → postIntro → Tutorial → real Kacie recording (outro) → HTML outro card**. Author the HTML shape above unchanged (review URL still plays it), but know that at stitch time her real intro supersedes the HTML intro title card — the intro card's Sullie/wordmark duty moves to a short brand sting or bug overlay (per-storyboard call), and the HTML outro card SURVIVES as the end card (doc-URL + Sullie rules unchanged). `narration/intro.txt` / `outro.txt` double as Kacie's reading scripts — write them to be spoken to camera. Spec + intake + stitch + seam-QC flow: `docs/kacie-intro-outro-recording-spec.md` and `dev-advocacy-video` step 5b. No synthetic/avatar face anywhere (parked — `tools/avatar/README.md`).

PostIntro is NOT optional. It is the difference between "PowerPoint" and "tutorial." See `wpforms-postintro` skill for the multi-animation rule + canonical references. The first cut of every tutorial that skipped a real postIntro became generic — see `docs/winning-pattern-analysis-2026-05-10.md` §C.

### Intro / outro / title-card production rules (brand + reveals)

These three were the editorial defects in the EEI one-shot (ISSUES.md #2/#3/#4). Bake them in:

1. **Intro and outro carry the real WPForms wordmark lockup** — import `assets/wordmark.svg` (repo-root, single-path 520×160; recolor via `color` / `fill`). Don't ship a text-only eyebrow, and don't hand-rebuild the wordmark from `<span>`s. A Sullie mascot moment (`assets/sullie.png`, or `reference/wpforms-brand/assets/sullie-master.svg`) is a valid alternative lockup when the brief calls for the character. (WPForms is always capitalized in any recreated wordmark text.)
2. **Title cards use a real text reveal, not a hand opacity fade.** Don't `gsap.to(card, { opacity })`. The repo's reveal libraries apply to tutorial intro/outro/chapter title cards, not just editorial: `videos/_shared/text-kit.js` (24 Pixel-Point presets — `mountTextReveal(text, { preset }).tweenInto(tl)`) or `videos/_shared/effects/` reveals. For a two-tone accent title (one word in orange), use `effects/mountTextStackFromRight` with its per-word `highlight` map (e.g. `{ with: 'orange', you: 'orange' }`).
3. **Don't default to the cream atmosphere.** `--wpf-bg-cream` reads as generic "AI default" when every video reaches for it. Pick a backdrop that fits the topic — the editorial reference (`reference/html-templates/editorial-reference-36s.html`) ships `.atmo-white / -purple / -cyan / -peach / -saturated`. Cream is one option, not the default.

## Approach

For a new video session, work in this order. Don't skip steps.

1. **Intake** — capture topic, slug, source links, audience, must-show states, constraints. From the user's prompt and reasonable defaults. Don't run a 5-question ritual; ask only blockers. **Check `docs/product-truth/<feature>.md` first** (FIX-5 fa-retest): if the source doc is reachable, WRITE/refresh that note during intake (metric/feature definitions with a source line); if unreachable, derive definitions from snapshots and mark them `UNVERIFIED` in the note — narration definitions must never be silent guesses.
2. **Snapshot inventory** — `node tools/list-snapshots.js --search <topic>`. Identify which snapshots exist vs need capture vs need DOM-derivation.
3. **Storyboard proposal** — angle, postIntro concept, chapter list, narration drafts, snapshot plan with statuses.
4. **🛑 STORYBOARD GATE** — see HARD-GATE below.
5. **Implement** — manifest + chapter files + selectors + narration `.txt`. Use legacy/effect-mode by default.
6. **Validate** — `tools/validate-video.js` then `tools/check-video-playback.js`.
7. **Handoff** — playable URL: `http://localhost:4321/scenes/player.html?video=<slug>`. Visual QC is the user's, not yours.

## ⛔ Skill invocation is non-negotiable

**This skill must be INVOKED (via the Skill tool), not just read inline.** Reading `.claude/skills/wpforms-video/SKILL.md` as a markdown file does not trigger this skill's gates. Use `/wpforms-video` or programmatic Skill invocation at session start when working on tutorial video work.

The Klaviyo tutorial v11 (2026-05-12) was built without invoking this skill OR wpforms-motion-audit OR wpforms-postintro. The postIntro went through 12 iterations without ever being formally scored. The author's own retro: "going straight from CLAUDE.md → codex prompt → code was efficient but bypassed the skill system entirely." Don't repeat that.

Sessions working from a detailed codex prompt file (`docs/codex-prompts/*.md`) MUST still invoke:
- This skill (`wpforms-video`) at session start
- `wpforms-postintro` before designing any postIntro morph chain
- `wpforms-gsap-rules` before writing any timeline beat
- `wpforms-motion-audit` before declaring postIntro / cinematic done (HARD GATE)
- `wpforms-primitives` before building any new helper to check if it already exists

The prompt is the brief. The skills are the gates. Both apply.

## 🛑 HARD-GATE: Storyboard Approval

**Before writing ANY chapter code, DOM prep, or rendering narration mp3s, the user MUST have approved a storyboard proposal in this exact shape:**

- Angle and audience
- PostIntro concept (topic-specific, not a default editorial template)
- Chapter list with one-line angle each
- Narration drafts per chapter
- Snapshot plan with statuses: `exists`, `DOM-derived`, `NEEDS CAPTURE`, `ASK USER`
- **Snapshot-state inventory** (FIX-7 fa-retest): list the hidden panels / modals / popovers each chosen snapshot carries (outline.md "Panels & modals" section + `(hidden)` annotations) and mark each in-scope or out-of-scope. A captured state the storyboard never mentions is how the clean-room rebuild silently dropped the Ask-WPForms-AI chapter its predecessor had.
- Capture / API / postIntro gaps explicitly listed

**If you have not received an explicit "approved" / "yes" / "go" from the user, STOP.** Implicit approval is not approval. "Sounds good" is not approval. The user's storyboard reply must directly address each section above before you proceed. If the user changes anything, re-confirm the change is the final word before writing code.

This gate exists because the first cut of every video that skipped it became a "PowerPoint" — generic chapter shapes, fake UI, weak postIntro. See `docs/postintro-patterns.md` and `docs/winning-pattern-analysis-2026-05-10.md` §C.

**Async-approver clause:** if the user has explicitly ordered the finished deliverable and is unavailable to approve mid-run, approval-shaped steps (storyboard approval, B-tier override) convert to: write the artifact to disk, mark it `AUTO-APPROVED-BY-DIRECTIVE (review on return)`, proceed, and surface it FIRST in the handoff. Do not improvise a different self-override.

## Tutorial narrative principles

These are storyboard / narration principles, not architecture rules. Apply during the storyboard proposal step.

### Start at the user's natural entry point

A tutorial should begin where the user actually lands when they want to do this task — not in the middle of the workflow. For a "connect Klaviyo" tutorial, the viewer's natural landing page is "WPForms → All Forms" (where they already are), not "Settings → Integrations" (where they're going). Show the navigation from natural-entry to feature, even if it takes one extra beat.

Why this matters: viewers who land mid-flow have to mentally reconstruct "how did I get here?" before they can follow. Starting at the entry point removes that cognitive load and signals "this is what your screen looks like right now."

Source: Klaviyo tutorial v4 build (2026-05-12) — v3 jumped into Settings; v4 added the All Forms beat as Step 1 and the tutorial read significantly clearer.

**🛑 Nav-fidelity hard check (narration ≠ visuals).** When narration names a navigation path — "open WPForms → Tools → Import Entries", "go to Settings → Integrations" — you MUST **show** that path: glide+click the real nav control, then `ifm.swap('<destination-snapshot>')` (or drive the snapshot's interactivity). NEVER load the destination snapshot directly while the narration describes navigating to it — that makes the spoken words and the screen disagree. This is the exact EEI #10 defect: `setup` loaded `admin-tools-import-entries` directly and ch1 just clicked the form already on screen, so the narrated "open WPForms → Tools → Import Entries" was never shown. The fix loaded `admin-forms-overview` (the natural entry), clicked **Tools** in `#adminmenu`, then `ifm.swap('admin-tools-import-entries')`. The snapshot's `outline.md` lists which nav links exist and which are HAND-BROWSE-ONLY (the `ifm.swap()` target to use). Driving real navigation is the load-bearing reason snapshots are interactive — honor it. (No static hook enforces this — it's a whole-file narration↔nav relationship the per-edit `video-guard` can't see; this skill rule is the gate.)

### Snapshot capture viewport standard

When capturing new snapshots via SingleFile (or any capture tool), **use a 1380×668 browser viewport** to match our stage's mac-body inner dimensions exactly. Capture-viewport mismatch causes layout-rerender drift inside the iframe (content reflows when its viewport doesn't match capture width).

Klaviyo dashboard was captured at 1513-1624 wide; our slot is 1380. Result: content reflowed and selectors that were valid at capture time drifted slightly. Standardize at the slot dimensions and the captured layout renders identically in the video.

For WPForms admin captures (where we own the live plugin), this also means: `Local By Flywheel` browser → window resize to 1380×668 before clicking SingleFile.

Source: Klaviyo session retro 2026-05-12.

### When to skip skill-context.js boot dump

`node tools/skill-context.js` is helpful for fresh sessions exploring the repo cold. For CONTINUATION sessions where the prompt names the path/files in scope (e.g., Codex executor prompts at `docs/codex-prompts/`), the boot dump is noise. The author can go directly from CLAUDE.md → the prompt → the code.

Rule: run `skill-context.js` only when you don't already know which path / files you're working on. If the user (or prompt) said "work on this file" or "continue this video," skip it.

Source: Klaviyo session retro 2026-05-12.

### Real captured snapshot + inline DOM = state variants

A single captured snapshot can demonstrate MULTIPLE visual states by toggling inline DOM after the swap. This is a powerful authoring technique for showing alternatives (action variants, configuration options, before/after) without capturing one snapshot per state.

**This is a WPForms-wide convention, not Klaviyo-specific.** The structure `[wpforms-builder-provider]-actions-data` + `[wpforms-builder-provider]-action-description` is shared across Mailchimp, Constant Contact, ActiveCampaign, Stripe (one-time/recurring), notifications (conditional rules), and any other multi-action provider/payment surface. The variant-data lookup table is provider-specific but the technique is identical. Author per provider; don't wrap in a library function — the data variation is too high.

Example from Klaviyo tutorial:

```js
// Swap to the real Connection settings panel (default state: Create / Update Profile)
await ifm.swap('builder-providers-klaviyo-connection');

// Then cycle through 3 Action variants using inline DOM puppetry —
// no additional snapshot needed.
async function showActionVariant(value, descriptionText) {
  const doc = ifm.doc();
  // Set the visible dropdown value
  const dropdown = doc.querySelector('#wpforms-providers-klaviyo-action');
  dropdown.value = value;
  // Replace the inner fields HTML to match
  const fieldsHost = doc.querySelector('.wpforms-builder-klaviyo-provider-actions-data');
  fieldsHost.innerHTML = VARIANT_FIELDS_HTML[value];
  // Show the matching description paragraph
  doc.querySelectorAll('.wpforms-builder-klaviyo-action-description').forEach(el => {
    el.style.display = el.dataset.action === value ? 'block' : 'none';
  });
}
await showActionVariant('unsubscribe', '...');
await wait(2);
await showActionVariant('remove_from_list', '...');
```

When to use this: tutorials demonstrating "this dropdown has 3 options, each does X / Y / Z." Capturing 3 separate snapshots for 3 nearly-identical states is wasteful and creates selector drift between captures. One real snapshot + inline DOM keeps the field IDs stable and the layout pixel-identical across variants.

When NOT to use this: when the variants change layout structurally (different fields, different containers). Then capture each as a real snapshot.

Aligned with INV-7 (library is reference, inline DOM is normal). The inline DOM is per-video, not promoted to library — it's specific to this video's narrative.

Source: Klaviyo tutorial v4 build (2026-05-12) — Action To Perform variant cycling in Chapter 5.

## Production Truth

Real WPForms UI is product truth. Do not fabricate.

- Use real captured snapshots as base structural surfaces.
- Do not create fake snapshot folders. Capture what is missing.
- Do not hand-write WPForms-looking HTML to avoid capture.
- DOM-derived states are allowed only when grounded by `node tools/field-state.js`, real captured DOM snippets, or cloned captured DOM.
- Document staged states in the storyboard and final summary: base snapshot + what was staged + product-truth source.
- Recapture only when the base structure is missing, broken, or not truthfully derivable.
- **Provider/addon videos — promote-to-top standing rule:** everywhere a provider list appears on camera (Marketing panel, Settings → Integrations, addons grid), stage the featured provider at the TOP of the list before capture/beat — viewers should never watch a scroll-hunt for the subject of the video.
- **Confirm a provider's INTERNAL slug from the site, not the DOM:** `node tools/site-eval.js "print_r(get_option('wpforms_providers'));"` — one command; DOM-grepping a capture for the slug is slower and can lie (SendGrid retro dev-fix #5).

**WRONG — invented dropdown markup:**
```js
// Don't write this. There's no snapshot for it; it's invented.
host.innerHTML = `<div class="wpforms-dropdown-open">
  <div>Option 1</div><div>Option 2</div>
</div>`;
```

**RIGHT — DOM-derived from product truth:**
```js
// Open the real dropdown using the puppetry helper, grounded in
// docs/wpforms-field-state-inventory.md (queried via tools/field-state.js).
await selectDropdown(sel.dropdownField, { pick: { type: 'option', label: 'Urgent' } });
```

## Default Authoring Mode

**NEW tutorial videos default to single-HTML authoring** — one `videos/<slug>/index.html` file with a master `gsap.timeline({ paused: true })` composing from `IframeManager` + `Cursor` + `WPFormsInteractions` + `videos/_shared/narration.js`. No engine, no manifest, no per-chapter `.js` modules. Reference pilots: `videos/make-field-required-single-html/`, `videos/klaviyo-quick-connect/`, `videos/wpforms-notifications-promise/`. See `docs/video-architecture-invariants-2026-05-12.md` for the 11 hard rules (INV-1 through INV-11) that govern single-HTML authoring.

**First write = copy the skeleton.** `cp docs/examples/single-html-tutorial-skeleton.html videos/<slug>/index.html` — it has the compliance baked in (hardened beat/say wrappers, instrumentation contract, ?scene= review wiring, native-res stage, onComplete end bookkeeping). Rules-in-prose lose to whatever the last-read reference did; the skeleton doesn't.

**Hardened awaits (INV-17):** the master flow must NEVER await a raw GSAP tween — an RAF-throttled tab (hidden tab, in-app Browser pane) freezes the ticker and deadlocks the video. Use the shared `say` / `beat` / `hideCaption` from `videos/_shared/narration.js` (setTimeout-resolved, `__sched` built in, motionFn fire-and-forget); keep tween-backed motion inside a beat's motionFn; wrap any top-level awaited primitive in `withTimeout(promise, seconds)` (same module). Reference impl: `videos/form-analytics-complete-guide/index.html`.

**LEGACY 12-video set stays on engine path frozen.** The legacy/effect-mode authoring (`manifest.json` + `chapters/*.js` modules + `surface: 'iframe'`) is preserved for those existing videos. Do NOT migrate them. Engine + runtime stays load-bearing for legacy support.

When working on a legacy video chapter, follow the legacy chapter shape below. When building a new tutorial video, follow the single-HTML pattern + the Intro → PostIntro → Tutorial → Outro shape (INV-11) and write inline DOM puppetry for one-off interactions (INV-7).

### Per-scene review URLs (`?scene=`) — single-HTML

A single-HTML video plays one async `play()` timeline, so a reviewer otherwise has to watch the whole thing to check one scene. Wire the `?scene=<id>` affordance so Umair can view a single scene in isolation. **Review-only — the MP4 render runs the full timeline** (`tools/render-html.js` never sets `?scene=`), so it never changes the deliverable.

Use the shared helper `videos/_shared/scene-review.js` — don't re-roll the param parsing:

```js
import { reviewScene } from '/videos/_shared/scene-review.js';
async function play() {
  const review = reviewScene();
  // isolate an early scene + HOLD on its payoff (skip its exit fade):
  if (review.is('postintro')) { await runPostIntro({ isolate: true }); return; }
  // skip the preroll (intro + postintro) when a chapter is requested:
  if (!review.matches(/^ch\d+$/)) { /* intro */ /* postintro */ }
  // run setup + chapters, stopping after the requested one:
  showChapter(1, '…'); await beat('ch1', /* … */); if (review.stopAfter('ch1')) return;
  showChapter(2, '…'); await beat('ch2', /* … */); if (review.stopAfter('ch2')) return;
}
```

Review URLs: `http://localhost:<port>/videos/<slug>/index.html?scene=postintro` (or `?scene=ch1`, `?scene=ch2`, …). Hand these to Umair per scene during QC (see the `video-qc` skill). Reference impl: `videos/switch-to-wpforms-entry-importer/index.html` (ISSUES.md #9, #10).

### Single-HTML sync contracts (entry-automation QC rounds, 2026-07-22/23)

These four contracts came out of the entry-automation QC rounds — each one converts a class of "Umair's eye caught it" bugs into structure. The skeleton carries all of them; keep them when customizing.

1. **Camera follows the cursor — framed actions only.** Every cursor action lands INSIDE the current camera frame: `awaitLayout(target)` (targets can lay out a frame or two late after swaps) → ONE scroll → `fly()` only when the target is outside the frame → glide+click with `scroll:false` (a second scroll costs ~0.7s/action and pushes beats past their DUR). `camReset()` BEFORE any action outside the current frame — the camera must never trail the cursor or reset mid-next-beat. An unresolved target is a BUG: warn with the `[glideClick]` prefix; `smoke-singlehtml` FAILS on those warns by default.
2. **Field-attention contract.** When narration names a UI element ("smart tags", "Increment File Name"), the `hi()` highlight lands ON that phrase — time it inside the beat's motionFn to the clip's cadence, not at beat entry. The viewer's eye must be ON the thing being named while it's named.
3. **SCENE_PREP is a REQUIRED sibling of START_SNAPSHOT.** A `?scene=chX` run must open on the SAME visible state the full run has accumulated by that point: one idempotent prep function per scene replaying prior chapters' property-level puppetry, applied right after `ifm.load`. Full runs carry state; snapshots don't.
4. **DUR is measured, never estimated.** After every `tts/generate.js` run: `node tools/measure-narration.js <slug>` → paste the emitted block. Voice-coupled; re-measure on every re-render. The shared `beat()` records `window.__beatStats` (motion-vs-DUR per beat) and `smoke-singlehtml` warns on any beat whose motion outlives its clip by > 0.5s — fix the overrun, don't ignore the warn.

Descriptor chapters (`runtime/chapter-api.js defineChapter`) remain supported in legacy videos for closed-vocabulary beats only. **Never use descriptor mode to downgrade a custom postIntro, skip an effect, or replace a specific animation with a generic focus/title beat.** If descriptor is sufficient, document why. If not, use legacy/effect.

## Legacy Chapter Shape

```js
import sel from './_selectors.js';

export const snapshot = 'builder-settings-notifications';
export const mode = 'per-beat-narration'; // 'parallel' | 'audio-cued'
export const breakStyle = 'soft-dolly';
export const swapStyle = 'cover';

export async function setup(ctx) {
  // Optional one-time DOM staging, grounded in real product truth.
}

export default [
  {
    id: 'beat-id',
    chapter: 'camera-group',
    camera: { focus: sel.target, level: 1.18, pad: 14, noScroll: false },
    overlays: [{ highlight: sel.target, label: 'Clear label' }],
    narration: 'beat-id',
    effect: async ({ cursor, sleep, highlight, clearHighlights }) => {
      await highlight([sel.target], { label: 'Clear label' });
      await sleep(500);
      await clearHighlights();
    },
    duration: 0.2,
  },
];
```

`effect()` / `setup()` ctx provides:

- Engine: `doc`, `cursor`, `sleep`, `type`, `zoomTo`, `clearSpot`
- Overlays: `highlight`, `clearHighlights`, `clearLabels`, `focusPull`, `popOut`
- WPForms helpers: `revealSection`, `toggleControl`, `selectDropdown`, `duplicateBlock`, `showPrompt`, `collapseBlock`, `toggleBlockActive`
- Snapshot: `swapToSnapshot(slug, { setup })`
- `waitAt(seconds)` only in `mode = 'audio-cued'`

Legacy chapters import only local selector sheets (`./_selectors.js`). Do not import from `engine/`, `runtime/`, or `scenes/`. Do not use descriptor verb call signatures inside `effect()` bodies.

## Modes

- **`per-beat-narration`** (default for tutorial chapters) — each beat has its own narration clip; runner waits for it to end.
- **`parallel`** — one narration clip plays while timed beats run alongside. Use only when loose timing is acceptable.
- **`audio-cued`** — one narration clip with `waitAt(t)` inside one rich `effect()`. Use for precise timestamp choreography.

Keep beats near the **6-second rule**. Split longer narration into smaller clips.

## Standard Interactions — use the library, don't hand-roll

Tutorial chapters that include standard WPForms navigation flows (Add New Form, Select Template, Open in builder, Open Settings tab, Drag field, Open Field Options) should call into **`videos/_shared/wpforms-interactions.js`** rather than hand-writing the click + glide + swap + wait sequence. Each method (`navAddNewForm()`, `selectTemplate(slug)`, `openFormInList(formId)`, `navBuilderSidebar(section)`, `openSettingsTab(tab)`, `dragFieldToForm(slug)`, `openFieldOptions(fieldId)`) is grounded in real captured selectors, drives a `Cursor` from `motion-primitives.js`, and crossfades snapshots when needed. The matching Wave 1 sub-interactions (`setFieldLabel`, `setNameFormat`, `toggleEmailConfirmation`) handle the inline-mirror updates so the canvas re-renders live.

Load `wpforms-primitives` skill for the full per-method lookup before composing a chapter that does anything click-or-drag-shaped. The engine `ctx.cursor` and the library `Cursor` are different objects — pick one per beat, don't mix.

## Modern Features Cheat Sheet

Modern features worth reaching for. Each links to its dedicated skill or doc. **Most of these aren't surfaced in the legacy skeletons** — load the relevant skill to use them.

| Feature | When to reach for it | Skill |
|---|---|---|
| `swapStyle: 'flipBridge'` | Any cross-snapshot transition. Eliminates the cream-bleed seam from `morph`/`cover`/`fast`. | `wpforms-transitions` |
| `registerTimeline(tl, { id })` | PostIntros + scrubbable editorial beats. Survives hidden-tab RAF throttling. | `wpforms-gsap-rules` |
| `registerCameraPose(name, spec)` | Repeat camera framing across beats. Cleaner than inline `level: 1.18, pad: 14`. | `wpforms-transitions` |
| `pausableRaf(cb)` | **Required** for any author Three.js / render-loop in a chapter. Vanilla `requestAnimationFrame` won't honor scrubber pause. | `wpforms-gsap-rules` |
| `surface: 'editorial'` / `'mixed'` | Ad-style / marketing video, or hybrid postIntro that needs full-bleed editorial DOM | `wpforms-marketing` |
| `videos/_shared/blocks/` | Editorial chrome (code-card, mac-window, phone-frame, pill, arrow, route-line, terminal). Don't re-implement per video. | `wpforms-marketing` |
| `videos/_shared/effects.js` | Standard registered effects: `highlightPulse`, `fieldBurst`, `labelReveal`, `popOutTilt`, `cardReflow`. Call by name. | `wpforms-gsap-rules` |
| `text-kit.js` 24 presets | Hero text reveals (mask-reveal-up, spring-scale-in, focus-blur-resolve, ...). 24 Pixel-Point presets. | `wpforms-marketing` |
| `videos/_shared/atmospheric.js` | Marketing-mode helpers: grain, gradient sweep, parallax pair, scale push, dark backdrop. Use sparingly on tutorial beats; right at home in postIntros + ad-style chapters. | `wpforms-marketing` |
| `tools/render.js` | In-repo MP4 export. Wall-clock for tutorials, `--seek` for editorial. | `wpforms-transitions` |
| `tools/preview.js` `/scrubber` | Live-reload + pause/seek author UI for QC | `wpforms-transitions` |
| `tools/lint-determinism.js` | Pre-commit determinism check (no `Date.now`, no unseeded `Math.random`, no `fetch`). | `wpforms-gsap-rules` |
| `awaitTween(tween)` | Hidden-tab-safe `await` on a fire-and-forget tween. Replaces `eventCallback('onComplete', resolve)`. | `wpforms-gsap-rules` |

**Default-but-recommended-upgrade:** the locked manifest defaults are still `breakStyle: 'glide'` and `swapStyle: 'morph'` for back-compat. For new videos with cross-snapshot work, override to `swapStyle: 'flipBridge'` per chapter or in `manifest.defaults`.

## Token Discipline

Use targeted tools before broad shell searches:

- `node tools/list-snapshots.js [--search <q>] [--for <slug>]` — snapshot inventory.
- `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]` — selector discovery.
- `node tools/verify-selectors.js <snapshot> ...` — selector validation.
- `node tools/field-state.js --field <name> [--summary]` — field-state evidence (don't full-read `docs/wpforms-field-state-inventory.md` directly).

**Never:**

1. Full-read `docs/wpforms-field-state-inventory.md` during normal authoring (it's 132 KB; query via `field-state.js`).
2. List or read `videos/` packages at startup. Accepted packages are reference/debug only after you can name the exact pattern needed.
3. Inspect runtime internals during normal authoring. Use `docs/authoring-api.md`, skeletons, validators, snapshot tools first.
4. Read CLAUDE.md as a substitute for this skill. CLAUDE.md is the operator manual; this skill is the authoring contract.

## Output Checklist

Before declaring a video done and handing off the review URL:

**Single-HTML videos (the default for new tutorials):**

- [ ] `node tools/validate-singlehtml.js <slug>` exits 0
- [ ] `node tools/smoke-singlehtml.js <slug> --seconds <__dur + slack>` exits 0 — strict-glide is the DEFAULT (unresolved cursor targets fail); check the beat-overrun warns too
- [ ] All narration `.mp3` files exist; DUR block pasted from `node tools/measure-narration.js <slug>` (never hand-estimated)
- [ ] PostIntro renders 8-15s with ≥5 phases (see `wpforms-postintro` skill)
- [ ] Storyboard staged states are documented in the final summary
- [ ] Provided playable HTML URL: `http://localhost:4321/videos/<slug>/index.html` (+ per-scene `?scene=` URLs)
- [ ] (User runs visual QC; you don't)

**Legacy engine videos:**

- [ ] `node tools/validate-video.js <slug>` exits 0
- [ ] `node tools/check-video-playback.js <slug> --seconds 30` exits 0 with `sceneBooted=true`, no boot/page/console errors
- [ ] All narration `.mp3` files exist under `videos/<slug>/narration/` (run `node tts/generate.js --video <slug>` if missing)
- [ ] Provided playable HTML URL: `http://localhost:4321/scenes/player.html?video=<slug>`

## Push-Back Triggers

Stop and push back when:

- Storyboard approval has not happened (HARD-GATE above).
- A requested state would require fake WPForms UI.
- A snapshot is missing and cannot be truthfully derived.
- PostIntro is being weakened instead of built with approved animation surfaces.
- Implementation pressure points toward protected core (`engine/*`, `runtime/player.js`, `runtime/chapter-runner.js`, `runtime/scene-helpers.js`, `runtime/transitions.js`, `runtime/frame-driver.js`, `runtime/frame-adapter.js`, `runtime/shared-scene.js`, `runtime/camera-poses.js`, `runtime/pause-manager.js`, `scenes/shared.js`, `scenes/player.html`).
- Descriptor mode is being used to avoid legacy/effect choreography that the approved storyboard actually needs.

## References (loaded on demand)

- `docs/authoring-api.md` — Read for the full public authoring contract: manifest schema, chapter exports, descriptor mode, transitions, validator behavior. Reference doc; this skill body has the high-frequency subset.
- `docs/postintro-patterns.md` — Read when designing or implementing a postIntro. Owned by the `wpforms-postintro` skill.
- `docs/current-workflow.md` — Read when onboarding to the repo for the first time, or when something in the workflow feels off and you need to compare to the canonical sequence.
- `docs/video-production-templates.md` — Read only the section needed (storyboard / chapter / snapshot checklist / token budget / smoke spec).
- `docs/examples/legacy-manifest-skeleton.md` — Read when starting a new manifest. First copy target.
- `docs/examples/legacy-chapter-skeleton.md` — Read when starting a new legacy/effect chapter. First copy target.
- `docs/examples/legacy-audio-cued-skeleton.md` — Read when authoring an `audio-cued` chapter (single narration with `waitAt(t)`).
- `docs/examples/choice-field-generate-choices-skeleton.md` — Read for choice-field videos (Dropdown, Multiple Choice, Checkboxes) that include AI Generate Choices.
- `docs/wpforms-field-state-inventory.md` — Canonical reference only. **Do not full-read.** Query via `node tools/field-state.js --field <name>`.
- `CLAUDE.md` — Operator manual (boot order, protected core, validation commands, push-back triggers). Read for repo-wide rules; this skill owns video-authoring rules.

## Granular references (load on demand for the specific topic)

- `docs/cursor-choreography.md` — Read when authoring any cursor move beyond a single click. `glideTo via:` is under-used.
- `docs/narration-writing.md` — Read when writing narration `.txt` files. Voice + sentence shape + verb-coupling rules.
- `docs/beat-pacing.md` — Read when a beat feels long or rushed; covers the 6-second rule and split heuristics.
- `docs/camera-lensing.md` — Read when picking `level:` for a beat. `1.0 / 1.18 / 2.2 / 2.4` reading guide.
- `docs/stage-css.md` — Read when an editorial overlay leaks Mac chrome / mesh-bg / watermark. Z-stack reference.
- `docs/color-palette.md` — Read when adding any color to editorial chrome. Brand orange placement rules.
- `docs/audio-mastering.md` — Read when tuning narration / BGM / SFX levels.
- `docs/selector-hygiene.md` — Read when selectors break or `_selectors.js` needs refactor.
- `docs/title-card-voice.md` — Read when writing intro/outro `subtitleVariants` and CTA copy.

## See Also

- `wpforms-primitives` — lookup index for `motion-primitives.js` + `wpforms-interactions.js`. Reach here before writing standard click/drag/glide sequences.
- `wpforms-postintro` — postIntro design + multi-animation rule + canonical references.
- `wpforms-gsap-rules` — GSAP L0 discipline + registered timelines + pausableRaf.
- `wpforms-transitions` — transition vocabulary, swap styles, camera poses.
- `wpforms-marketing` — editorial surface mode + ad-style composition.
