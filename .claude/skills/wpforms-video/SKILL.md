---
name: wpforms-video
description: Use when starting or working on any WPForms tutorial video — intake, snapshot inventory, storyboarding, manifest/chapter authoring, narration, validation, review-URL handoff. Covers default legacy/effect-mode authoring, chapter shapes, modes (per-beat-narration / parallel / audio-cued), production-truth rules, and the storyboard-approval gate. For postIntro design specifically, use wpforms-postintro. For GSAP code use wpforms-gsap-rules. For ad-style/marketing videos use wpforms-marketing. For transitions use wpforms-transitions.
---

# WPForms Tutorial Video

You are the video-building agent for WPForms tutorial videos. The repo turns an approved storyboard into a playable HTML video with mesh background, Mac-framed iframe, BGM, narration, overlays, postIntro, chapters, and title cards. MP4 capture is external; the deliverable is a playable HTML review URL.

## Approach

For a new video session, work in this order. Don't skip steps.

1. **Intake** — capture topic, slug, source links, audience, must-show states, constraints. From the user's prompt and reasonable defaults. Don't run a 5-question ritual; ask only blockers.
2. **Snapshot inventory** — `node tools/list-snapshots.js --search <topic>`. Identify which snapshots exist vs need capture vs need DOM-derivation.
3. **Storyboard proposal** — angle, postIntro concept, chapter list, narration drafts, snapshot plan with statuses.
4. **🛑 STORYBOARD GATE** — see HARD-GATE below.
5. **Implement** — manifest + chapter files + selectors + narration `.txt`. Use legacy/effect-mode by default.
6. **Validate** — `tools/validate-video.js` then `tools/check-video-playback.js`.
7. **Handoff** — playable URL: `http://localhost:4321/scenes/player.html?video=<slug>`. Visual QC is the user's, not yours.

## 🛑 HARD-GATE: Storyboard Approval

**Before writing ANY chapter code, DOM prep, or rendering narration mp3s, the user MUST have approved a storyboard proposal in this exact shape:**

- Angle and audience
- PostIntro concept (topic-specific, not a default editorial template)
- Chapter list with one-line angle each
- Narration drafts per chapter
- Snapshot plan with statuses: `exists`, `DOM-derived`, `NEEDS CAPTURE`, `ASK USER`
- Capture / API / postIntro gaps explicitly listed

**If you have not received an explicit "approved" / "yes" / "go" from the user, STOP.** Implicit approval is not approval. "Sounds good" is not approval. The user's storyboard reply must directly address each section above before you proceed. If the user changes anything, re-confirm the change is the final word before writing code.

This gate exists because the first cut of every video that skipped it became a "PowerPoint" — generic chapter shapes, fake UI, weak postIntro. See `docs/postintro-patterns.md` and `analysis-quality-and-transitions.md` §1.

## Production Truth

Real WPForms UI is product truth. Do not fabricate.

- Use real captured snapshots as base structural surfaces.
- Do not create fake snapshot folders. Capture what is missing.
- Do not hand-write WPForms-looking HTML to avoid capture.
- DOM-derived states are allowed only when grounded by `node tools/field-state.js`, real captured DOM snippets, or cloned captured DOM.
- Document staged states in the storyboard and final summary: base snapshot + what was staged + product-truth source.
- Recapture only when the base structure is missing, broken, or not truthfully derivable.

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

**New videos default to legacy/effect-mode authoring.** It preserves: custom topic-specific postIntro animation, chapter-local HTML/CSS/SVG editorial surfaces, precise effect choreography, `audio-cued waitAt(t)` timing, mid-effect snapshot swaps, per-beat narration flexibility.

Descriptor chapters (`runtime/chapter-api.js defineChapter`) remain supported for closed-vocabulary beats only. **Never use descriptor mode to downgrade a custom postIntro, skip an effect, or replace a specific animation with a generic focus/title beat.** If descriptor is sufficient, document why. If not, use legacy/effect.

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

- [ ] `node tools/validate-video.js <slug>` exits 0
- [ ] `node tools/check-video-playback.js <slug> --seconds 30` exits 0 with `sceneBooted=true`, no boot/page/console errors
- [ ] All narration `.mp3` files exist under `videos/<slug>/narration/` (run `node tts/generate.js --video <slug>` if missing)
- [ ] PostIntro renders 8-15s with ≥5 phases (see `wpforms-postintro` skill)
- [ ] Storyboard staged states are documented in the final summary
- [ ] Provided playable HTML URL: `http://localhost:4321/scenes/player.html?video=<slug>`
- [ ] (User runs visual QC; you don't)

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

- `wpforms-postintro` — postIntro design + multi-animation rule + canonical references.
- `wpforms-gsap-rules` — GSAP L0 discipline + registered timelines + pausableRaf.
- `wpforms-transitions` — transition vocabulary, swap styles, camera poses.
- `wpforms-marketing` — editorial surface mode + ad-style composition.
