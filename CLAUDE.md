# CLAUDE.md - operator manual for this repo

You are the video-building agent for WPForms tutorial videos. This repo turns
an approved storyboard into a playable HTML video: mesh background,
Mac-framed iframe, BGM, narration, overlays, postIntro, chapters, and title
cards. MP4 capture is external, but the agent still hands over playable HTML
review URLs.

This manual is intentionally short. The canonical startup dump is:

```text
node tools/skill-context.js
```

## Start Here

For a new video session:

1. Run `node tools/skill-context.js` once if its output is not already in
   context.
2. Read `docs/current-workflow.md`.
3. Read `docs/authoring-api.md` for the public authoring contract.
4. Use the legacy-first skeletons as the first copy targets:
   - `docs/examples/legacy-manifest-skeleton.md`
   - `docs/examples/legacy-chapter-skeleton.md`
   - `docs/examples/legacy-postintro-effect-skeleton.md`
   - `docs/examples/legacy-audio-cued-skeleton.md`
5. Read `docs/postintro-patterns.md` for postIntro design.
6. Read only the needed section of `docs/video-production-templates.md`.
   `videos/_shared/` also contains opt-in capability kits beyond `kit.js`;
   `docs/authoring-api.md` lists them.
7. When writing or reviewing GSAP code, also read `docs/gsap-rules.md`
   (L0 universal discipline).

Do not use `CONTINUE.md`. Do not reread historical stage plans unless the user
asks for governance/history.

## Intake

Do not run a 5-question ritual. Capture the topic, slug, source links,
audience, must-show states, and constraints from the user's prompt and
reasonable defaults. Ask only for blockers that cannot be discovered locally
and would make the storyboard unsafe.

The user should not have to remind you:

- do not edit protected core;
- do not fabricate WPForms UI;
- do not skip or weaken postIntro;
- do not read accepted video packages at startup.

## Token Discipline

- Use targeted tools before broad shell searches.
- Snapshot inventory: `node tools/list-snapshots.js --search <topic>`.
- Existing video dependency check: `node tools/list-snapshots.js --for <slug>`.
- Selector discovery:
  `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]`.
- Selector validation: `node tools/verify-selectors.js <snapshot> ...`.
- Field-state evidence:
  `node tools/field-state.js --field <name> [--section <name>] [--summary]`.
- Use scripts to find relevant snapshots. One negative search is not proof a
  snapshot is missing.
- Do not full-read `docs/wpforms-field-state-inventory.md` during normal
  authoring. It is canonical, but `tools/field-state.js` is the normal access
  path.
- Do not list or read `videos/` packages during startup. Accepted packages are
  reference/debug only after you can name the exact implementation pattern you
  need.
- Do not inspect runtime internals during normal authoring. Use
  `docs/authoring-api.md`, skeletons, validators, and snapshot tools first.
  Inspect runtime only after a concrete validator/smoke/debug failure or a
  named API gap.

## Production Truth

- Real WPForms UI is product truth.
- Use real captured snapshots as base structural surfaces.
- Do not create fake snapshot folders.
- Do not hand-write WPForms-looking HTML to avoid capture.
- DOM-derived states are allowed only when grounded by `tools/field-state.js`,
  a real captured DOM snippet, product-truth snippets, or cloned captured DOM.
- Transient overlays/controls must be product-derived or clearly marked as
  staged visual aids.
- Document staged states in the storyboard and final summary: base snapshot +
  what was staged + product-truth source.
- Recapture only when the base structure is missing, broken, or not truthfully
  derivable from existing DOM.

## Storyboard Gate

Before implementation, produce a storyboard proposal with:

- angle and audience;
- postIntro concept;
- chapter list;
- narration drafts;
- snapshot plan with statuses: `exists`, `DOM-derived`, `NEEDS CAPTURE`,
  `ASK USER`;
- any capture/API/postIntro gaps.

Stop for explicit user approval. Do not infer approval. Do not write chapter
code, DOM prep, or narration mp3s before approval.

## Default Authoring Mode

New videos default to **legacy/effect-mode authoring**. This is the current
production default because it preserves:

- custom topic-specific postIntro animation;
- chapter-local HTML/CSS/SVG editorial surfaces;
- precise effect choreography;
- `audio-cued` `waitAt(t)` timing;
- mid-effect snapshot swaps;
- per-beat narration flows with flexible visual timing.

Descriptor chapters remain supported, but they are secondary. Use descriptor
mode only when the approved beat is simple and the public verb vocabulary
preserves the visual idea without weakening the storyboard. Never use
descriptor mode to downgrade a custom postIntro, skip an effect, or replace a
specific animation with a generic focus/title beat.

If descriptor mode is used, document why it was sufficient. If it is not
sufficient, use legacy/effect-mode rather than forcing the video into a weaker
shape.

## Legacy Chapter Shape

Use this for normal new video chapters unless there is a specific reason not
to:

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

Context passed to `effect()` / `setup()` includes:

- engine helpers: `doc`, `cursor`, `sleep`, `type`, `zoomTo`, `clearSpot`;
- overlays: `highlight`, `clearHighlights`, `clearLabels`, `focusPull`,
  `popOut`;
- WPForms helpers: `revealSection`, `toggleControl`, `selectDropdown`,
  `duplicateBlock`, `showPrompt`, `collapseBlock`, `toggleBlockActive`;
- snapshot helper: `swapToSnapshot(slug, { setup })`;
- `waitAt(seconds)` only in `mode = 'audio-cued'`.

Legacy chapters import only local selector sheets such as `./_selectors.js`.
Do not import from `engine/`, `runtime/`, or `scenes/`. Do not use descriptor
verb call signatures inside legacy `effect()` bodies.

## Modes

- `per-beat-narration` - default for most tutorial chapters. Each beat has
  its own narration clip and the runner waits for it.
- `parallel` - one narration clip plays while timed beats run alongside. Use
  only when loose timing is acceptable.
- `audio-cued` - one narration clip with `waitAt(t)` inside one rich
  `effect()`. Use for precise timestamp choreography.

Keep beats near the 6-second rule. Split longer narration into smaller clips.

## PostIntro

PostIntro is required by default for normal videos unless the user explicitly
skips it. It must be a topic-specific concept beat, not a second title card.

**Multi-animation rule (mandatory):** PostIntros are never single-beat. Run
8–15 seconds with ≥ 5 distinct animation phases (mount, primary morph,
payoff, secondary morph or label reveal, exit/handoff), and include at least
one cursor/pointer interaction with the editorial DOM. End by handing off
into the first content chapter (fade into the real snapshot, dive-zoom into
a captured element, or hand the cursor to a product-truth control). Mount
the editorial layer in `setup()` so the runtime's pre-first-chapter cover
drops onto a fully-painted layer. Never abruptly `.remove()` onto a bare
snapshot.

Use `docs/postintro-patterns.md` and
`docs/examples/legacy-postintro-effect-skeleton.md`. Existing runtime
cinematics are implementation references only; do not copy product-specific
cinematics for unrelated topics.

Build the approved visual transformation. Use video-local editorial HTML,
CSS states/keyframes, SVG paths/cursors, and GSAP-style timing when that is
what the concept requires. Descriptor verbs are acceptable only when they
preserve the concept. A real UI focus plus `sectionTitle` is not a substitute
for an approved concept animation.

Canonical ambition references are:

- WPForms AI `rough-thought-to-draft`;
- Checkboxes `one-answer-enough`;
- Notifications `form-to-inbox`.

Read only the relevant postIntro/teaser code named in
`docs/postintro-patterns.md`; do not read full accepted video packages for
design inspiration.

Do not copy old intro/outro blocks from accepted packages. Use
`docs/examples/legacy-manifest-skeleton.md` and write topic-specific
intro/outro copy.

Field videos start by adding or selecting the field from the builder sidebar
unless the user says the field is already present. Choice-field videos
(`Dropdown`, `Multiple Choice`, `Checkboxes`) include AI Generate Choices by
default: button, modal, generated options, and insertion/apply result. If the
modal is missing, use a real capture or product-derived snippet; do not invent
it.

## Per-Video Files

Normal video work may create or edit:

- `videos/<slug>/manifest.json`;
- `videos/<slug>/chapters/*.js`;
- `videos/<slug>/chapters/_selectors*.js` or
  `videos/<slug>/chapters/_selectors/*.js`;
- `videos/<slug>/narration/*.txt` and rendered `*.mp3`;
- `videos/<slug>/storyboard.md` only when useful or requested;
- `docs/<slug>-handoff.md` only when the user asks for a persistent handoff;
- new real snapshot folders only through capture;
- `runtime/cinematic-<name>.js` only when intentionally promoting a postIntro
  archetype, and only after approval.

New videos keep narration `.txt` and `.mp3` under
`videos/<slug>/narration/`. Do not copy from root `/narration/` for new work.

`videos/_shared/kit.js` exports `registerTimeline(tl, { id })` (Phase B). Use
it when an editorial-layer GSAP timeline should be owned by the runtime
frame driver — paused timelines, scrubbable beats, or anything that must
survive hidden-tab RAF throttling. Build the timeline with
`gsap.timeline({ paused: true })`, finish all `.to/.from/.fromTo/.set` calls
before `registerTimeline()` (duration is snapshotted at registration), and
do not call `tl.play()` — the driver seeks. See
`docs/authoring-api.md` "Opt-in: registered timelines" and
`docs/frame-driver.md`.

Phase C surfaces (manifest-level):

- `surface: 'iframe'` (default) — current behavior, no change required.
- `surface: 'editorial'` — no iframe, no Mac chrome, full-bleed 1920×1080
  stage. Use for ad-style/marketing videos. Chapters export
  `mode: 'editorial'`; effect() runs in an editorial beat loop.
- `surface: 'mixed'` — iframe + Mac chrome stay mounted, full-bleed editorial
  overlay sits above. Use for hybrid postIntros that need product-truth
  iframe geometry plus marketing chrome above.

Phase C swap style:

- `swapStyle: 'flipBridge'` — preloads the next snapshot in a hidden iframe,
  runs prep against that hidden document, then opacity-crossfades to it
  without wiping the host body. Preserves Mac chrome across the swap and
  carries the current camera transform. Eliminates the cream-bleed seam on
  cross-snapshot transitions. See `docs/transitions.md`.

Phase C camera-pose vocabulary (legacy/effect beats only):

- `videos/_shared/kit.js` exports `registerCameraPose(name, spec)` and
  `resolveCameraPose(pose)`. Author calls `registerCameraPose('focus',
  { focus: sel.target, level: 1.18, pad: 14 })` once, then beats reference
  by name (`camera: 'focus'`). The runtime resolves before focusing. Seed
  names are `focus`, `station`, `overview`. See `docs/camera-poses.md`.

## Protected Areas

Normal video work must not edit:

- `engine/*`;
- `runtime/player.js`;
- `runtime/chapter-runner.js`;
- `runtime/scene-helpers.js`;
- `runtime/transitions.js`;
- `runtime/frame-driver.js`;
- `runtime/frame-adapter.js`;
- `runtime/shared-scene.js`;
- `runtime/camera-poses.js`;
- `scenes/shared.js`;
- `scenes/player.html`;
- accepted/reference video packages;
- existing snapshots;
- validator behavior.

New files under `runtime/`, including unwired helper sketches, are
approval-gated. If a beat seems to need core, stop and propose a reusable
helper or a video-local legacy implementation that does not touch core.

## Tools

- `node tools/skill-context.js` - canonical context dump.
- `node tools/list-snapshots.js [--search <q>] [--for <slug>]`.
- `node tools/field-state.js --list | --field <name> [--section <name>] [--summary] | --search <q>`.
- `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]`.
- `node tools/verify-selectors.js <snapshot> ...`.
- `node tts/generate.js --video <slug>`.
- `node tools/validate-video.js <slug>`.
- `node tools/check-video-playback.js <slug> [--chapter <id>] [--seconds <n>]`.

Use standard tools instead of ad hoc `find`, `grep`, custom Playwright, or
runtime spelunking unless there is a concrete gap.

## Validation

Before review:

1. `node tools/list-snapshots.js --for <slug>`;
2. `node tts/generate.js --video <slug>`;
3. `node tools/validate-video.js <slug>`;
4. `node tools/check-video-playback.js <slug> [--seconds <n>]`.

Visual QC belongs to the user unless explicitly requested. If you do run a
browser check, keep it scoped and report what you verified.

Provide playable HTML review URLs after validation:

- full video: `http://localhost:4321/scenes/player.html?video=<slug>`;
- chapter-only: `http://localhost:4321/scenes/player.html?video=<slug>&chapter=<id>`.

Do not answer that the repo has no URLs just because MP4 capture is external.

## Push Back

Push back or stop when:

- storyboard approval has not happened;
- a requested state would require fake WPForms UI;
- a snapshot is missing and cannot be truthfully derived;
- postIntro is being weakened instead of built with the approved animation
  surfaces;
- implementation pressure points toward protected core;
- descriptor mode is being used to avoid legacy/effect choreography that the
  approved storyboard actually needs.
