# Chapter module contract

The interface the runtime (this project) expects from a chapter module.
Locked 2026-04-20 between the snapshots-beats authoring side and the
video-html-only runtime side. Do not change without coordinating both.

> **No-assumption snapshot rule (2026-04-24).** Chapter authoring never
> assumes snapshot DOM. Required before writing selectors:
> 1. read the snapshot's `catalog.md` (or run
>    `node tools/inspect-snapshot.js <snapshot>` until phase 6 makes
>    catalogs mandatory);
> 2. resolve every selector against that output;
> 3. treat any unresolved selector or assumed UI state as a **hard
>    error**, not a TODO. The resolver will refuse to emit the chapter.
>
> **Author-mode scope rule.** In normal author mode, chapter work only
> writes/updates files under `videos/<slug>/`. Edits to `engine/`,
> `runtime/`, `scenes/`, or `capture/` are a separate system-change
> track that needs explicit sign-off — they are not inside author mode.
>
> **Canvas / chart fidelity.** Beats targeting `<canvas>` or live charts
> require either a paired rendered image or a snapshot variant with
> baked pixels. Raw captured HTML is insufficient because canvases
> capture empty.
>
> **Editorial text.** Pixel Point `animate-text` is the approved
> text-animation subsystem. See `docs/phase-5-verbs.md` for the
> proposed editorial verbs (`animateText`, `captionLine`, `eyebrow`,
> `calloutLabel`). Do not roll bespoke text animations.
>
> **Authoring boundary / product truth (Stage 4a, 2026-04-29).**
> - Chapter modules describe video behavior. They do not patch core.
> - Chapters may use descriptors, prep ops, and `ctx` helpers to produce
>   truthful DOM-derived states on top of real base snapshots.
> - Chapter modules must not directly import from `runtime/`, `engine/`,
>   or `scenes/` except the approved contract files/patterns already
>   documented above (e.g. `./_selectors*.js`, the `defineChapter` import
>   from `/runtime/chapter-api.js`). Everything else flows through `ctx`.
> - `docs/wpforms-field-state-inventory.md` is product-truth evidence
>   for field-state DOM changes. Cite the relevant section when staging
>   a derived state.
> - If a chapter needs repeated behavior not exposed via `ctx`, prep ops,
>   or descriptor verbs, **stop**. Propose a reusable helper or
>   descriptor in `docs/stage-4-core-api-plan.md` instead of editing
>   core. Approval is required before any new shared helper file lands.
>
> **Phase 7 input contract (2026-04-25).** The upstream input to a
> chapter module is `videos/<slug>/brief.md`. Its schema, required
> front matter, body shapes for `mode: doc` / `mode: steps`,
> `## Clarifications` format, and validation rules are specified in
> `docs/brief-schema.md`. The no-assumption snapshot rule applies
> upstream of the brief too: every snapshot named in a brief must
> already have a `catalog.md` on disk before authoring begins.

> **Phase 2 update (2026-04-23).** `defineChapter()` + step-level
> `narration:` is the canonical shape for every new chapter. The older
> `mode: 'parallel'|'audio-cued'|'per-beat-narration'` shape documented
> below still plays (via `runtime/player.js`) so existing videos keep
> running, but it's frozen — no new chapters should use it. See
> **`defineChapter` shape — phase 2 canonical form** below for the
> target shape and the migration rules.

## `defineChapter` shape — phase 2 canonical form

```js
// videos/<slug>/chapters/cff-chapter-3.js
import { defineChapter } from '/runtime/chapter-api.js';
import sel from './_selectors/cff-chapter-3.js';

export default defineChapter({
  slug: 'cff-chapter-3',
  title: 'Name the form',
  snapshot: 'builder-empty-canvas',
  chapter: 'setup',                    // camera-continuity tag
  prep: [                              // declarative form (preferred); see docs/dom-prep.md
    { op: 'applyDefaultForm', keepIds: [1, 2, 4] },
  ],
  // …or, for cases the op vocabulary doesn't cover, the JS escape hatch:
  // prep: async (doc) => { /* one-time DOM seed */ },

  steps: [
    {
      id: 'focus-name',
      do: 'focus',
      target: sel.formNameInput,
      fill: 0.55,
      narration: 'cff-chapter-3-focus-name',   // per-beat clip
    },
    {
      id: 'type-name',
      do: 'typeInto',
      target: sel.formNameInput,
      text: 'Simple Contact Form',
      narration: 'cff-chapter-3-type-name',
    },
  ],
});
```

### Step-level narration rules

- `narration:` on a step is a clip slug resolved against
  `videos/<slug>/narration/<slug>.mp3`. The runner plays it at step
  entry (parallel with the camera move, BGM ducks) and **blocks on
  `ended` after `postHold`** before advancing — beats never race past
  the voice.
- File convention: `<chapter-slug>-<beat-id>.txt` / `.mp3`. Matches the
  `--beat <chapter>:<beat>` re-render flag in `tts/generate.js`.
- Chapter-level `narration:` and step-level `narration:` are **mutually
  exclusive** in one chapter. `defineChapter()` throws if both are set.
- **6-second beat cap.** No beat runs longer than ~6s of animation with
  a single `narration:` clip. If a beat needs more, split it into two
  beats with their own clips. The resolver enforces this at validation
  time (phase 7).

### TTS partial re-render

```bash
node tts/generate.js --video <slug> --chapter cff-chapter-3
node tts/generate.js --video <slug> --beat cff-chapter-3:type-name
```

The first form renders every `cff-chapter-3*.txt`; the second renders
exactly one file. Use after editing a single narration line so the TTS
pipeline doesn't re-run the whole video.

### Migration from mode-based chapters

| Old shape                                  | New shape                                              |
|--------------------------------------------|--------------------------------------------------------|
| `mode: 'parallel'` + one chapter `narration` | `defineChapter({ ..., narration: 'chapter-slug' })` (chapter-level still works) |
| `mode: 'per-beat-narration'` + per-beat `narration` | `steps: [{ ..., narration: '<chapter>-<beat>' }, ...]` |
| `mode: 'audio-cued'` with `waitAt(t)` in `effect()` | Split into N smaller beats each with its own clip; no `waitAt` |
| `effect: async (ctx) => {...}` closures    | `do: '<verb>'` + verb-specific fields (closed vocabulary) |
| `camera: { focus, level, pad }`            | `target: '<sel>'` + `fill:` on the step                |
| `overlays: [...]`                          | `do: 'highlight'` or verb-integrated highlight         |

When migrating: pick one snapshot, list the beats in order, assign each
a verb + `target` + optional narration clip. Drop the 6s cap — split
anything longer. Old files under `videos/<slug>/chapters/*.js` using
the mode shape keep running via `runtime/player.js`; the phase-3 work
retires that orchestrator once all videos are migrated.

---

## Legacy (mode-based) shape — frozen

The sections below describe the pre-phase-2 authoring contract. Kept
for reference because existing videos (`form-notifications`, parts of
`creating-first-form`) still use it. **Do not write new chapters in
this shape.**

## File layout for a video

```
videos/<video-slug>/
  manifest.json           # chapter order + intro/outro text + teaser choice
  chapters/
    <chapter-id>.js       # one file per chapter
  narration/
    *.mp3                 # per-chapter or per-beat narration clips
```

## Chapter module shape

Every file in `chapters/` is an ES module with these exports:

```js
// chapters/fields.js

// Snapshot slug to load for this chapter. Omit to inherit from prior chapter.
export const snapshot = 'builder-settings-notifications';

// Authoring pattern. One of:
//   'parallel'            — one narration covers the whole chapter; beats run
//                           concurrent with audio. Fastest to author.
//   'per-beat-narration'  — each beat has its own narration clip; next beat
//                           waits for the current beat's audio to end.
//   'audio-cued'          — one long narration; beat effect uses waitAt(t)
//                           to sync cursor/DOM actions to spoken words.
export const mode = 'per-beat-narration';

// Narration slug — only used when mode === 'parallel' or 'audio-cued'.
// In 'per-beat-narration', each beat carries its own `narration`.
export const narration = 'fields';

// Optional one-time DOM seeding before beats run. Use for resetting toggle
// state, hiding elements that should animate in, etc.
export const setup = async (doc) => { /* ... */ };

// Default export: the beats array.
export default [ /* beats */ ];
```

## Beat shape

```js
{
  id: 'any-string',                // for logs
  chapter: 'section-name',         // same chapter = smooth pan; different = dolly transition
  narration: 'fields-1',           // only for mode='per-beat-narration'

  camera: {
    focus: '#sel' | ['#a','#b'],   // frame the union of these
    level: 2.2,                    // zoom level, 1 = full iframe
    pad: 14,                       // padding around focus
    noScroll: false,               // skip scrollIntoView
  },

  spotlight: '#sel',               // dim everything else
  overlays: [
    { highlight: '#sel', label: 'Text', pad: 10 },
    { highlights: ['#a','#b'], label: 'Both' },
    { pointer: '#sel', direction: 'down', label: 'Here', size: 28, gap: 8 },
  ],

  labelDwell: 1.5,                 // hold label before effect (seconds)
  keepLabels: true,                // don't auto-clear labels before effect

  effect: async (ctx) => { /* see context shape below */ },

  duration: 0.2,                   // trailing dwell after effect
  transition: 'hard-cut',          // force snap instead of pan/dolly
}
```

## Effect context

Chapter modules never import from `shared.js` or `engine/` directly. They
receive everything they need through the context argument:

```js
effect: async ({
  cursor,         // cursor.moveTo(sel), cursor.click(), cursor.park({x,y}), cursor.hide()
  doc,            // iframe.contentDocument — for direct DOM access
  sleep,          // (ms) => Promise
  type,           // typewriter helper
  zoomTo,         // mid-effect re-framing: await zoomTo([sel], { level, pad, smooth, noScroll })
  highlight,      // add highlight mid-effect: await highlight([sel], { label })
  clearLabels,    // remove current labels without clearing spotlight
  clearSpot,      // lift spotlight dim
  waitAt,         // ONLY in mode='audio-cued': await waitAt(5.5) syncs to audio.currentTime
}) => { ... }
```

This keeps chapter modules portable: no import paths to maintain, trivially
testable with a mock context, and the runtime can evolve context internals
without breaking modules.

## Manifest shape

```json
{
  "slug": "form-notifications",
  "intro":  { "eyebrow": "WPForms Tutorial", "title": "Form Notifications", "subtitle": "..." },
  "outro":  { "title": "You're all set.", "subtitle": "Learn more at wpforms.com/docs" },
  "teaser": "form-to-inbox",
  "chapters": [
    "entry", "fields", "smart-tags", "advanced", "managing", "conditional-logic"
  ]
}
```

Chapters are listed in play order. Each name maps to `chapters/<name>.js`.

## Ownership split

| Piece                                    | Owner     |
|------------------------------------------|-----------|
| Snapshots pool (`/snapshots/`)           | runtime   |
| Capture pipeline (`/capture/`)           | runtime   |
| Engine (`/engine/`)                      | runtime   |
| `scenes/shared.js` (primitives + polish) | runtime   |
| Intro / outro title cards (GSAP)         | runtime   |
| Welcome teaser                           | runtime   |
| Mac frame, clip-path, watermark          | runtime   |
| BGM orchestration                        | runtime   |
| Start gate                               | runtime   |
| Chapter modules + narration text         | authoring |
| Manifest for a given video               | authoring |

Authoring = the conversation with the user that produces beats. Runtime =
everything this project wraps those beats with to produce the final video.

## Rules

- Selectors stay in chapter modules. Never in `engine/`.
- If a WPForms DOM pattern recurs across videos, promote the helper
  function into `engine/wpforms.js` — not the selector.
- One chapter = one camera thought. Beats within a chapter share camera
  language (smooth pan). Chapter breaks trigger the dolly-out-in.
- Chapter modules import NOTHING. All dependencies arrive via context.
