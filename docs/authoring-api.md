# Authoring API

Public, author-facing contract for WPForms tutorial videos in this
repo. Source of truth for chapter shape, step shape, transitions,
overlays, and the verb catalog. Reflects current code in
`runtime/player.js`, `runtime/chapter-runner.js`, `runtime/verbs.js`,
and `runtime/transitions.js` as of 2026-04-29.

This doc is the public contract. For normal video work, pair it with
`docs/current-workflow.md` and `docs/postintro-patterns.md`; stage plans are
governance/history only.

For new video authoring, start from the legacy-first skeletons in
`docs/examples/`:

- `docs/examples/legacy-manifest-skeleton.md`
- `docs/examples/legacy-chapter-skeleton.md`
- `docs/examples/legacy-postintro-effect-skeleton.md`
- `docs/examples/legacy-audio-cued-skeleton.md`

Use this full API when a skeleton leaves a question open. Do not inspect old
video packages during startup.

## 1. Production-Truth Rules

Non-negotiable. Restated from `docs/current-workflow.md`. They apply to every
video and every chapter authored against this API.

- Real WPForms UI is product truth.
- Do not fabricate WPForms-looking HTML.
- Do not create fake snapshot folders to skip a capture step.
- Do not capture every tiny state. Many states are produced through
  DOM prep, prep ops, runtime verbs, cloned real DOM, or
  product-truth snippets when the existing base structure supports
  it.
- New snapshots are required only when the base product structure
  is missing, broken, or cannot be truthfully derived from existing
  DOM.
- Use `node tools/field-state.js --field <name>` as the normal
  access path for field-state product-truth evidence. The source
  inventory remains canonical, but do not full-read it during normal
  authoring.
- Document staged states in the storyboard and final summary: name
  the base snapshot used and what was staged on top. Write a
  persistent handoff doc only if the user asks for one.
- Normal video work must not edit protected core (`engine/*`,
  `runtime/player.js`, `runtime/chapter-runner.js`,
  `runtime/scene-helpers.js`, `runtime/transitions.js`,
  `scenes/shared.js`, `scenes/player.html`, existing accepted video
  packages, snapshots). New files under `runtime/` are also
  approval-gated even when unwired.
- Transient overlays and controls used inside a beat must be
  either product-derived (cloned from real captured DOM or from
  product-truth snippets) or clearly marked in storyboard/final
  summary as staged visual aids. They must not pose as captured
  product UI.
- If a video appears to need core edits, stop and ask whether the
  behavior is reusable. Prefer a video-local legacy/effect implementation
  first; propose a reusable helper only when repeated need proves it.

## 2. Two Supported Authoring Paths

This repo ships two supported authoring paths. Both run today via
the same URL surface (`/scenes/player.html?video=<slug>`). The
entry shell in `scenes/player.html` checks each manifest chapter
with `isChapterDescriptor` and dispatches:

- all-descriptor video → `runtime/chapter-runner.js` `runChain`
- any legacy/mode chapter present → `runtime/player.js` `playVideo`
- empty `manifest.chapters` (intro/outro-only previews) → `playVideo`

### 2.1 Legacy effect-mode (default for new videos)

`export const snapshot/mode/narration/setup` + `export default [
beats ]` with `effect()` closures. Three modes: `parallel`,
`audio-cued` (with `waitAt(t)`), `per-beat-narration`.

Legacy effect-mode is the default authoring path for new videos. It is
the right path for topic-specific postIntro animation, chapter-local
HTML/CSS/SVG editorial surfaces, precise effect choreography,
per-beat narration, `audio-cued` timing, and mid-effect snapshot
swaps.

Use it when:

- A beat needs `audio-cued` `waitAt(t)` choreography (no
  descriptor equivalent today).
- A beat needs mid-effect coordinated `swapToSnapshot(slug, {
  setup })` (a player.js-only ctx verb whose closest descriptor
  analogue, the `snapshotSwap` verb, runs at chapter granularity,
  not mid-effect).
- The descriptor verb vocabulary doesn't cover the beat without weakening it.

For a copyable starting point, use
`docs/examples/legacy-chapter-skeleton.md`,
`docs/examples/legacy-postintro-effect-skeleton.md`, and
`docs/examples/legacy-audio-cued-skeleton.md` before opening any
accepted video package.

### 2.2 Descriptor mode (secondary supported path)

`defineChapter({...})` + closed-vocabulary verbs. Use this only when
the approved beat is simple and the existing verbs in `runtime/verbs.js`
preserve the visual idea without weakening choreography or postIntro.
The validator surfaces which active videos use this mode.

Descriptor mode does **not** mean mandatory migration of existing
videos. Existing legacy effect-mode videos remain supported.

For a copyable descriptor reference, use
`docs/examples/descriptor-chapter-skeleton.md` after confirming the
beat is descriptor-safe.

If descriptor mode cannot express the beat, use legacy/effect-mode
rather than authoring around the gap, fabricating UI, or declaring the
beat impossible.

## 3. Manifest

```jsonc
{
  "slug": "<slug>",
  "primarySnapshot": "<snapshot-slug>",          // optional; first snapshot to preload
  "coverColor": "#FAF6EF",                        // optional CSS color
  "hud": false,                                   // false for final recording
  "narrationSpeed": 1,                            // optional, 0.85–1.25 soft range
  "bgm": "default",                               // false to silence; object for opts
  "defaults": {
    "breakStyle": "glide",                        // see §5
    "swapStyle":  "morph"                         // see §5
  },
  "intro":      { /* title-card opts */ },
  "postIntro":  { "kind": "...", "narration": "...", "opts": {...} },
  "teaser":     "<teaser-name>",                  // optional
  "chapters":   [ "chapter-slug", "..." ],        // play order
  "extras":     [ "..." ],                        // optional, never played
  "outro":      { /* title-card opts */ }
}
```

The validator (`tools/validate-video.js`) checks `manifest.chapters`
as the source of truth for what plays. Files under `extras` or
stray files in `chapters/` are not played and are not classified.

### 3.1 PostIntro contract

`postIntro` is required by default for normal videos unless the user explicitly
asks to skip it. Treat it as a topic-specific concept beat, not a second title
card.

Existing `runtime/cinematic-*` modules are implementation references, not a
design library to copy from. Reuse an existing `kind` only when its product
semantics match the new topic. For example, the Checkboxes postIntro is not a
Dropdown postIntro just because the animation is polished.

If no existing cinematic matches, build the postIntro as a video-local
legacy/effect chapter by default. Descriptor verbs are acceptable only when they
preserve the approved concept. If the current public API cannot express the
concept, stop with a postIntro API gap note instead of deleting postIntro or
substituting a title-card-style scene.

Field videos should usually begin by adding or selecting the field from the
builder sidebar unless the user says the field already exists. Choice-field
videos (`Dropdown`, `Multiple Choice`, `Checkboxes`) should include AI Generate
Choices by default: trigger button, modal, generated choices, and insertion /
apply result using real captured UI or product-derived snippets.

## 4. Descriptor Chapter Shape (secondary)

Descriptor chapters are supported but are not the default for new videos. Use
them only when the closed vocabulary preserves the approved beat. Do not use
descriptor mode to weaken custom postIntro animation, timestamp choreography,
or mid-effect interactions.

```js
import { defineChapter } from '/runtime/chapter-api.js';
import sel from './_selectors/<chapter>.js';

export default defineChapter({
  slug: 'chapter-id',
  title: 'Headline for HUD',
  snapshot: 'builder-empty-canvas',
  chapter: 'camera-tag',          // continuity grouping

  breakStyle: 'glide',            // optional — see §5
  swapStyle:  'morph',            // optional — see §5

  prep: [                         // declarative; runs UNDER cover
    { op: 'applyDefaultForm', keepIds: [1, 2, 4] },
    { op: 'stripQuizEnabled' },
  ],

  // Either chapter-level narration OR step-level narration —
  // never both. defineChapter() throws on both.
  narration: 'chapter-id',        // optional chapter-level clip slug

  steps: [
    {
      id: 'unique-id',
      label: 'HUD label',         // optional; defaults to id
      do: 'verbName',             // from runtime/verbs.js — see §10
      target: sel.formNameInput,
      fill: 0.55,                 // higher = tighter framing
      noScroll: false,
      preHold: 0,                 // ms before verb runs
      postHold: 0,                // ms after verb resolves
      narration: 'chapter-id-unique-id',  // per-step clip
      after: [{ op: 'setFieldLabel', id: 1, label: 'Name' }],
      // verb-specific fields (text, instruction, direction, hold, …)
    },
  ],
});
```

### 4.1 `chapter` tag (camera continuity)

Every step inherits the chapter's `chapter` tag unless it sets its
own. Steps that share a tag pan smoothly between targets; a tag
change triggers `runChapterBreak(breakStyle)`.

### 4.2 Narration

- Chapter-level `narration: 'slug'` — single clip plays for the
  whole chapter; BGM ducks; runner waits on `ended`.
- Step-level `narration: 'slug'` — per-step clip; runner blocks
  on `ended` after `postHold` before advancing.
- Files at `videos/<slug>/narration/<key>.mp3` (and `.txt`).
- The two are mutually exclusive per chapter.
- 6-second beat cap holds: split anything longer into beats with
  their own clips.

### 4.3 `prep` and `after`

`prep:` (chapter-level or on a `snapshotSwap` step) is a
declarative array of ops or a function escape hatch. It runs under
cover by default.

`after:` (per step) is a declarative array of ops that runs after
the verb resolves. Use for intentional payoff DOM (set a field
label, apply icon choices, toggle column count, mark required).

Op vocabulary lives in `runtime/prep-ops.js` and is mirrored in the
validator. Current ops:

| Op | Required | Optional |
|---|---|---|
| `removeAdminBar` | — | — |
| `removeBuilderCruft` | — | — |
| `applyDefaultForm` | — | `keepIds`, `labels`, `formName` |
| `hideFields` | `ids` | — |
| `setFormName` | `name` | — |
| `setFieldLabel` | `id`, `label` | — |
| `setChoiceLabels` | `fieldId`, `labels` | — |
| `setCheckedChoices` | `fieldId`, `indexes` | — |
| `stripQuizEnabled` | — | — (migration debt) |
| `activateFieldOptionGroup` | `fieldId` + one of `controlName`/`group` | — |
| `setChoiceLayout` | `fieldId`, `value` (`"1"`,`"2"`,`"3"`,`"inline"`) | — |
| `applyIconChoices` | `fieldId` | `glyph` |
| `applyIconChoicesV2` | `fieldId` | `glyph`, `iconStyle`, `color`, `size`, `style` |
| `applyImageChoices` | `fieldId` | — |
| `setHideLabel` | `fieldId`, `hidden` | — |
| `setRequired` | `fieldId`, `on` | — |

Authors do not write raw DOM mutations in chapter modules. If a
needed payoff is missing, propose the op rather than inlining it.
Production-truth rules apply: any DOM-derived state must be
grounded in real captured DOM, product-truth snippets, or
`docs/wpforms-field-state-inventory.md`.

### 4.4 Selectors and provenance

Authors write selectors in a `_selectors/<chapter>.js` sheet using
the tagged-object shape `{ sel: '#x', src: 'catalog.md#anchor' }`,
or inline in chapter steps with a trailing `// src: …` comment.

Every selector must resolve against the chapter snapshot's
`catalog.md`. The validator hard-errors on unresolved selectors.

## 5. Transitions

### 5.1 Supported style sets

- `breakStyle` — fires on chapter-tag break inside the same
  snapshot. Supported values: `glide`, `hold`, `soft-dolly`,
  `dolly`, `whip`.
- `swapStyle` — fires on snapshot change. Supported values:
  `cover`, `fast`, `morph`, `push`, `whip`. `paper-cover` is
  accepted only as a legacy alias at the manifest layer; it is not
  a runtime style.

### 5.2 Resolution order — actual current behavior per runner

The two runners do not currently resolve transition styles
identically. Aligning them is a future approval-gated runtime
change. Do not assume a unified order.

**`runtime/player.js` (legacy/effect path):** chapter loop
resolves per chapter with the order:

```
URL override (?breakStyle= / ?swapStyle=)
  → chapter export (export const breakStyle / swapStyle)
  → manifest.defaults.<style>
  → runtime default ('dolly' for break; null/legacy paper-cover
    for swap when no swapStyle is configured)
```

**`runtime/chapter-runner.js` (descriptor path):** `runChain`
merges any URL override into `manifest.defaults` at boot, then
`runChapters` resolves:

```
descriptor export (desc.breakStyle / desc.swapStyle)
  → URL-merged manifest.defaults.<style>
  → runtime default ('dolly' for break, 'cover' for swap)
```

When a descriptor declares its own style, that wins over the URL
override on the chapter-runner path. URL override only takes
effect if the descriptor leaves the style null.

Authors targeting a specific transition style should set the
chapter-level `breakStyle` / `swapStyle` (descriptor) or
`export const breakStyle` / `export const swapStyle` (legacy) and
treat the URL override as a QC/lab knob, not a contract.

## 6. `snapshotSwap` (descriptor)

```js
{
  id: 'swap-to-generated',
  do: 'snapshotSwap',
  snapshot: 'wpforms-ai-builder-feedback-generated',
  swapStyle: 'morph',                                   // optional
  prep: [{ op: '…' }],                                  // optional
  activateSection: 'general',                           // optional
}
```

Runtime contract (`scene-helpers.swapSnapshot`):

1. `installFlashGuard()` — head-level CSS hides iframe + chrome
   through the body-wipe.
2. body-wipe `loadSnapshot(slug)` + per-snapshot `applySanitize`.
3. Re-mount mesh, mac-chrome, watermark, overlay styles.
4. Run `prep` (under cover).
5. Resolve via `runSwapTransition(style, doSwap)`.
6. `removeFlashGuard()`.

The same lifecycle runs for chapter-boundary snapshot changes
(when the next descriptor's `snapshot` differs from the previous
chapter's). Mid-effect `swapToSnapshot(slug, { setup })` on the
legacy runner is a separate authoring path and remains supported.

## 7. Camera / Focus

- `step.target` (selector or array) + `step.fill` + `step.noScroll`.
  Runner owns the camera move.
- Same `chapter` tag → smooth pan; new `chapter` tag →
  `runChapterBreak(breakStyle)`.
- `fill` — higher value = tighter framing (target occupies a
  larger fraction of the viewport).
- Authors do not call `zoomTo()` from descriptor chapter code.

Builder snapshots: keep `camera.level ≥ 1.0`. The validator warns
on builder beats below `1.0` because anything below exposes the
Mac-frame chrome around the iframe.

## 8. Overlays / Helpers

Closed vocabulary, all author-facing through verbs. Stage 5c-1
invariant: `installOverlayStyles()` runs after every body-wipe so
designed glass-style highlights/labels render on both runners.

| Verb | Required | Optional |
|---|---|---|
| `highlight` | `target` (or `highlights: [...]`) | `label`, `padX`, `padY`, `hold` |
| `popOut` | `target` | `tilt`, `lift`, `riseMs`, `holdMs`, `fallMs`, `hideOriginal` |
| `focusPull` | `target` | `blur`, `riseMs`, `holdMs`, `fallMs` |
| `tiltFocus` | `target` | `tiltY`, `riseMs`, `holdMs`, `fallMs` |
| `lineDraw` | `d` | `stroke`, `width`, `duration`, `holdMs`, `vw`, `vh`, `zIndex`, `autoDismiss` |
| `sectionTitle` | `title` | `eyebrow`, `holdMs`, `fadeInMs`, `fadeOutMs`, `accent`, `underline`, `underlineD`, `underlineWidth`, `underlineDuration` |

`focusPull` appends inside `.stage` so the Mac-frame clip-path
constrains it (Stage 5c-1 invariant). Stage highlights respect
the same clipping.

The Stage 5c-3 deferral stands: composition (decoupling
`cameraTarget` / `cursorTarget` / `highlightTarget`, asymmetric
`padX`/`padY` through `engine.highlight`) is not pre-built. If a
future video proves the need, propose it.

## 9. Editorial Text Verbs

Runtime-owned overlay chrome — never writes snapshot DOM. Theme
config in `runtime/animate-text.js`.

| Verb | Default preset | Default position | Required |
|---|---|---|---|
| `animateText` | top-down-letters | top-center | `text` |
| `eyebrow` | focus-blur-resolve | top-center | `text` |
| `captionLine` | mask-reveal-up | bottom-center | `text` |
| `calloutLabel` | spring-scale-in | anchor-relative | `text`, `anchor` |

`calloutLabel` is the only anchor-relative verb. The other three
have fixed preset positions; per-beat overrides allowed via
`preset`, `role`, `position`, `color`, `stagger`, `hold`,
`autoExit`.

## 10. Verb Catalog

Closed vocabulary in `runtime/verbs.js`. Each verb runs after the
runner has focused on `step.target` (when present) and has
resolved every selector in `SELECTOR_FIELDS`
(`target`, `from`, `to`, `highlightTarget`) — except verbs that
repurpose those names as state enums (e.g. `toggle.to: 'on'|'off'`)
or that are listed in `SKIP_PRE_RESOLVE`.

### 10.1 Pure camera / hold

- `focus` — settle beat; runner already focused. Optional: `hold`.
- `hold` — sleep. Optional: `ms` (default 800).

### 10.2 Cursor / type / click

- `typeInto` — typewriter into an input. Required: `target`,
  `text`. Optional: `label`, `cps`, `perCharMs`, `clear`,
  `filter` (sidebar-search filter id).
- `clickOn` — cursor click. Required: `target`. Optional:
  `instruction`, `direction`, `label`, `dispatch`, `magnetic`,
  `postHold`, `hideCursor`, `openFieldOptions` (id; mirrors
  WPForms canvas field selection), `mirrorHold`.
- `hover` — glide cursor and apply `.active`. Required: `target`.
  Optional: `wait`, `activeClass`, `hold`.
- `dragGrab` — visual drag. Required: `from`, `to`. Optional:
  `wait`, `rotate`, `ghostMaxPx`, `ghostScale`, `revealAt`,
  `reveal`, `revealDisplay`, `endRing`, `hideCursor`.
- `scroll` — eased rAF scroll inside the iframe. Optional:
  `distance` (default 1800), `duration` (default 10000).

### 10.3 Snapshot / state

- `snapshotSwap` — see §6.
- `injectField` — required: `harvestFrom`, `fieldType`. Optional:
  `containerSel`, `newId`. (Phase-6 deprecation candidate;
  validator warns / errors per baseline.)

### 10.4 WPForms UI patterns

- `openDropdown` — visual click to open a dropdown. Required:
  `target`. Optional: `direction`, `dispatch`, `instruction`,
  `postHold`.
- `selectOption` — pick `value` inside dropdown at `target`.
  Required: `target`, `value`. Optional: `label`, `dispatch`,
  `instruction`, `postHold`.
- `selectFauxDropdown` — native `<select>` via faux overlay.
  Required: `target`, `pick`. Optional: `direction`, `openDelay`,
  `pickDelay`, `postHold`.
- `switchTab` — Required: `target`. Optional: `panel`,
  `dispatch`, `instruction`, `postHold`, `hideCursor`,
  `mirrorHold`. Built-in mirror for settings-sidebar and
  field-option-group toggles.
- `toggle` — flip a `wpforms-toggle-control`. Required:
  `target`. Optional: `to: 'on'|'off'` (state enum, not selector),
  `dispatch`, `instruction`, `label`, `postHold`.
- `expandAccordion` / `collapseAccordion` — Required: `target`.
  Optional: `body` (override inner panel selector), `dispatch`,
  `instruction`, `postHold`.
- `openModal` — required: `modal` (selector that must resolve in
  the snapshot — no fabrication). Optional: `from` (trigger
  click), `label`, `dispatch`, `postHold`.
- `dismissModal` — required: `target` (close button). Optional:
  `modal` (override container), `dispatch`, `instruction`,
  `postHold`.
- `iconPickerOpen` — required: `target` or `from`. Optional:
  `direction`, `instruction`, `label`, `dispatch`, `magnetic`,
  `holdMs`. Mounts runtime-owned demo modal.
- `revealSection` — required: `selector`. Optional: `fade`,
  `postHold`.
- `activatePanel` — required: `panel` (e.g. `'settings'`).
  Optional: `target` (visual click), `direction`, `instruction`,
  `dispatch`, `section`, `postHold`, `hideCursor`.
- `notificationAdd` — combined Add-Notification flow. Optional:
  `from`, `block`, `title`, `placeholder`, `name`, `direction`,
  `expanded`, `fade`, `postHold`, `hideCursor`, `backdropColor`.
- `blockClone` — required: `block`. Optional: `from`, `name`,
  `direction`, `expanded`, `fade`, `postHold`.
- `blockCollapseToggle` — required: `block`. Optional: `from` /
  `target`, `to: 'expanded'|'collapsed'`, `direction`, `postHold`.
- `blockToggleActive` — required: `block`. Optional:
  `to: 'active'|'inactive'`, `postHold`.
- `smartTagInsert` — required: `target` (smart-tag wrap), `pick`.
  Optional: `direction`, `replaceChips`, `openDelay`, `pickDelay`,
  `closeDelay`, `postHold`.
- `enableConditionalLogic` — required: `target` (toggle wrap),
  `rule`. Optional: `fade`, `postHold`.
- `prompt` — runtime-owned modal. Optional: `title`,
  `placeholder`, `text`, `backdropColor`, `openDelay`,
  `typeDelay`, `confirmDelay`, `postHold`.
- `toast` — runtime-owned overlay. Required: `text`. Optional:
  `variant`, `duration`, `anchor`.

### 10.5 Editorial / overlay

See §8 (overlays/helpers) and §9 (editorial text).

### 10.6 Selector resolution and fabrication guards

- Selector fields: `target`, `from`, `to`, `highlightTarget`
  (plus `anchor` for `calloutLabel`, `modal` for `openModal`).
- The runner resolves each present selector against the current
  snapshot before dispatching. A missing selector is a hard error.
- `openModal.modal` must already exist in the snapshot — no
  fabricated modal HTML. If the snapshot does not ship the modal,
  capture a modal-bearing snapshot first; do not invent one.

## 11. Legacy Effect-Mode Authoring (default for new videos)

For new work, prefer legacy/effect-mode unless the beat is clearly
descriptor-safe. This is the default path for strong postIntros,
chapter-local editorial animation, audio-cued timing, mid-effect
snapshot choreography, and effects that need flexible code.

### 11.1 Chapter shape

```js
import sel from './_selectors.js';

export const snapshot = 'snapshot-slug';
export const mode = 'per-beat-narration';   // or 'parallel' | 'audio-cued'
export const narration = 'chapter-key';     // for parallel + audio-cued
export const breakStyle = 'glide';          // optional
export const swapStyle  = 'morph';          // optional

export async function setup(ctx) { /* one-time DOM seeding */ }

export default [
  {
    id: 'beat-id',
    chapter: 'camera-tag',
    camera:   { focus: sel.target, level: 1.18, pad: 14, noScroll: false },
    spotlight: sel.spotlight,
    overlays: [{ highlight: sel.target, label: 'Click here', pad: 10 }],
    labelDwell: 1.5,
    keepLabels: true,
    narration: 'beat-id',                   // for per-beat-narration
    effect: async (ctx) => { /* see §11.2 */ },
    duration: 0.2,
    transition: 'hard-cut',                 // optional, force snap
  },
];
```

### 11.2 Effect context

Beats receive an enriched ctx; chapters never import from `engine/`,
`scenes/`, or `runtime/` directly:

```js
effect: async ({
  doc, cursor, sleep, type, zoomTo, clearSpot,
  highlight, clearHighlights, clearLabels,
  focusOn, popOut, focusPull,
  revealSection, toggleControl, selectDropdown,
  duplicateBlock, showPrompt, collapseBlock, toggleBlockActive,
  swapToSnapshot,         // mid-effect snapshot swap
  waitAt,                 // ONLY in mode='audio-cued'
}) => { ... }
```

`swapToSnapshot(slug, { setup })` runs the same paper-cover or
swapStyle-routed lifecycle as a chapter-boundary swap; the
optional `setup` runs under cover before the cover drops.

`waitAt(t)` resolves when narration `audio.currentTime >= t`. Only
available in `audio-cued` mode.

### 11.3 Mode notes

- `parallel` — narration plays once; beats run alongside on their
  own `duration` timing.
- `audio-cued` — single rich `effect()` keyed to `waitAt(t)`
  timestamps inside one narration clip. No descriptor equivalent.
- `per-beat-narration` — each beat carries its own narration
  clip; runner blocks on the clip ending after the beat's
  `duration` / `postHold`.

The chapter-module-contract still applies: chapter modules import
nothing from `engine/`, `scenes/`, or `runtime/` except the
allowlisted `/runtime/chapter-api.js`. All helpers flow through
ctx.

Chapter modules may also import from `videos/_shared/kit.js` for
universal video-author helpers (vendored GSAP loader, scene layer
/ cursor / font helpers, text splitting, click ripple, iframe
transform helpers, clone-from-iframe). Per-video `_kit.js` files
remain allowed for video-specific helpers. When a video is
accepted, review its `_kit.js` and lift any reusable helpers into
`videos/_shared/kit.js`. See `docs/chapter-module-contract.md` →
"Shared video-author kit" for details.

### Capability kits

- `videos/_shared/atmospheric.js` (`../../_shared/atmospheric.js`) provides marketing-mode helpers: grain, sweep, parallax pair, scale push, and dark backdrop. Compose each helper into the caller's master timeline with `tweenInto(tl, opts)`.
- `videos/_shared/text-kit.js` (`../../_shared/text-kit.js`) provides pixel-point-style text reveals with seven presets. Compose each reveal into the caller's master timeline with `tweenInto(tl, opts)`.
- `videos/_shared/lottie-kit.js` (`../../_shared/lottie-kit.js`) embeds Lottie animations for editorial bumpers, stings, badges, and micro-illustrations. Use it when the asset is editorial chrome above the WPForms surface.
- `videos/_shared/three-kit.js` (`../../_shared/three-kit.js`) provides Three.js scene helpers for editorial 3D layers. It stays separate so non-3D videos do not load Three.js.
- `videos/_shared/effects.js` (`../../_shared/effects.js`) registers a shared `gsap.registerEffect()` library: `highlightPulse`, `fieldBurst`, `labelReveal`, `popOutTilt`, `cardReflow`. Import once at module top, `await effectsReady`, then call `gsap.effects.<name>(target, opts)`. See `docs/effects-library.md` for per-effect API.

`videos/_shared/kit.js` also exports two Phase A helpers:

- `awaitTween(tween, { duration, fallbackMs })` — fire-and-forget wrapper that resolves on `setTimeout(duration*1000)` instead of GSAP's RAF-driven `onComplete`. Use this anywhere a tween must complete in a hidden tab or headless render (RAF is throttled and `onComplete` never fires).
- `withGsapContext(fn, scope)` — `gsap.context()` wrapper returning `{ ctx, revert }` for consistent chapter-swap cleanup.

### Opt-in: registered timelines

Phase B adds `registerTimeline(tl, { id })` from `videos/_shared/kit.js`.
Use it when an editorial-layer GSAP timeline should be owned by the runtime
frame driver:

```js
import { loadGsap, registerTimeline } from '../../_shared/kit.js';

const gsap = await loadGsap();
const tl = gsap.timeline({ paused: true });
tl.to(card, { opacity: 1, y: 0, duration: 0.45 });
registerTimeline(tl, { id: 'video-slug:chapter:beat' });
```

Requirements:

- Create the timeline with `gsap.timeline({ paused: true })`.
- Do not call `tl.play()`. The frame driver seeks it from registration time.
- IDs must be unique within the active postIntro/chapter scope.
- GSAP callbacks fire during `tl.seek(t, false)`, so side-effect callbacks
  must be idempotent.

`awaitTween()` and `registerTimeline()` coexist. Use `awaitTween()` for
fire-and-forget wall-clock tweens where the author owns timing directly:
one-shot SFX-synced animations, narration-cued effects, or legacy beats that
do not need a seekable surface. Use `registerTimeline()` for paused timelines
the runtime should drive: multi-phase postIntros, scrubbable editorial beats,
and animations that must survive hidden-tab RAF throttling.

`loadGsap()` accepts opt-in plugin flags: `flip` and `motionPath` default true; `splitText`, `morphSVG`, `drawSVG`, `customEase`, `gsDevTools`, `motionPathHelper` default false. Plugins are vendored under `/vendor/gsap/3.15.0/`. Webflow released all GSAP plugins as free in April 2025 — use them.

GSAP code in any of these kits or in chapter `effect()` bodies must follow `docs/gsap-rules.md` (L0 discipline rules).

## 12. Validator

`tools/validate-video.js` is the static gate for chapter
provenance, prep-op shape, manifest schema, snapshot existence,
and per-video authoring mode classification.

The classifier emits **INFO only** by default. Every active video
gets one `authoring mode: …` summary line, plus one
`audio-cued inventory: …` line when any active chapter declares
`mode: 'audio-cued'`. Default runs are baseline-preserving.

Opt-in `--strict-authoring` may promote the mixed-mode case and
the audio-cued case from INFO to warning, for migration
discussions.

`--report` is unrelated to this block — it is the existing flag
that surfaces full untouched-legacy warnings.

Run on both reference videos before/after any change touching
authoring or runtime:

```
node tools/validate-video.js a-complete-guide-to-the-checkboxes-field
node tools/validate-video.js build-forms-faster-with-wpforms-ai
node tools/check-video-playback.js a-complete-guide-to-the-checkboxes-field --seconds 90
node tools/check-video-playback.js build-forms-faster-with-wpforms-ai --seconds 90
```

## 13. Pointers

- Workflow entry point: `docs/current-workflow.md`
- New-video skeletons:
  `docs/examples/legacy-manifest-skeleton.md`,
  `docs/examples/legacy-chapter-skeleton.md`,
  `docs/examples/legacy-postintro-effect-skeleton.md`,
  `docs/examples/legacy-audio-cued-skeleton.md`
- PostIntro design guidance: `docs/postintro-patterns.md`
- Locked authoring contract: `docs/chapter-module-contract.md`
- Production-truth field-state evidence:
  `docs/wpforms-field-state-inventory.md`
- Governance/history only:
  `docs/stage-5d-public-authoring-api-plan.md`,
  `docs/stage-5-runtime-transition-rd-plan.md`,
  `docs/stage-4-core-api-plan.md`
