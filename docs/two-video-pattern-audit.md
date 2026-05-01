# Two-Video Pattern Audit

Last updated: 2026-04-29

Reference videos:

- Checkboxes: `videos/a-complete-guide-to-the-checkboxes-field/`
- WPForms AI: `videos/build-forms-faster-with-wpforms-ai/`

Primary handoffs:

- `docs/checkboxes-rescue-handoff.md`
- `docs/wpforms-ai-guided-handoff.md`

## Audit Purpose

This is a system audit, not a polish list for either video.

The goal is to learn what the tool actually became after two guided videos and
decide what should be preserved, simplified, archived, or turned into the
internal skill workflow.

Do not use this document to chase small visual bugs in Checkboxes or WPForms
AI. Those videos are references for learning.

## What Repeated Across Both Videos

- The successful workflow was guided, not autonomous:
  topic/source material -> agent researches -> storyboard/narration proposal ->
  user approval -> implementation -> user visual QC -> scoped revisions.
- The user should not provide a full storyboard. The agent should create the
  first storyboard after reading the source docs, repo handoffs, and relevant
  snapshots.
- PostIntro works best as a short animated proof of value before entering the
  product UI. It should teach the "why" quickly, not become a full tutorial.
- Real WPForms UI must remain the product truth. The best chapters use exact
  captured snapshots plus DOM staging, not generic recreated UI.
- Clean builder state matters. Generic builder chapters should remove addon
  cruft and show a purposeful form, usually Name, Email, Message, plus the
  topic field.
- Narration must be beat-sized and synced to action. Long narration makes the
  scene feel slow even when the visual idea is good.
- Chapter URLs are essential for user QC. They should skip intro, postIntro,
  and outro.
- Final recording manifests should disable the HUD with `"hud": false`.
- Handoff docs are necessary. They prevent the next session from repeating the
  same mistakes and capture the product-specific decisions.
- Token cost is now a product constraint. WPForms AI consumed essentially a
  full Pro-plan session, mostly because of over-exploration, fake-snapshot
  detours, repeated custom smoke checks, and uncertainty about which UI states
  needed capture versus DOM staging.

## What Was One-Off Or Custom

- Checkboxes needed a product-use-case postIntro:
  `runtime/cinematic-one-answer-enough.js`.
- WPForms AI needed a different postIntro pattern:
  rough thought -> AI prompt -> generated draft.
- Checkboxes relied heavily on choice-field DOM helpers:
  labels, checked defaults, icon choices, image choices, column layout.
- WPForms AI relied heavily on snapshot swaps across real generated states and
  AI prompt/answer surfaces.
- Some WPForms AI overlay states can be staged over a real snapshot when the
  base UI is exact and the supplied modal HTML/classes are product-derived.
  That is different from fabricating a whole fake snapshot.

## Proven Runtime Pieces

Keep these. They are now part of the guided video system:

- `defineChapter`/chapter modules as the guided chapter contract.
- Manifest-driven intro, postIntro, chapters, outro.
- Sullie-system title cards for intro/outro.
- Voicebox TTS under `videos/<slug>/narration/`.
- `manifest.hud: false` for final recording.
- `mountAnimateText` / pixel-point mask reveal for cinematic text callouts.
- DOM prep operations for cleaning and staging real WPForms UI.
- `focusPull`, especially after being constrained inside `.stage`.
- Paper-cover snapshot handoffs when a morph/crossfade reads like a reload.
- `swapToSnapshot()` for chapter-local state progression when a chapter needs
  to move through exact captured states.
- `manifest.narrationSpeed` support when narration pacing needs a global trim.

## PostIntro Patterns Worth Keeping

Keep postIntro as a first-class concept, but with strict constraints:

- It must be short, usually 10-15 seconds.
- It should explain the feature's value visually before the product tutorial.
- It should use strong motion and a clear transformation, not static cards.
- It should not become a second full tutorial.
- It can be custom per video, but reusable archetypes should emerge from real
  examples.

Current archetypes:

- `one-answer-enough`: shows a limitation, then the feature solves it.
- `rough-thought-to-draft`: turns an imperfect idea into an AI-generated draft.

Future archetypes should be added only after they are proven in a real video.

## Snapshot And UI Truth Rules

The biggest system lesson is this:

Exact product UI is the core promise.

Rules:

- Check existing snapshots before creating anything new.
- If exact UI state is missing, capture it or ask the user for it.
- Do not create product-looking fake snapshot folders from scratch.
- DOM staging is allowed when it mutates exact captured UI or overlays a
  product-derived modal/pattern on top of an exact captured base state.
- Cleanup should preserve expected visible product state. It should hide cruft,
  not blank the useful preview.
- Capture/inventory work must happen before chapter implementation, not during
  late debugging.

## Workflow That Should Become The Skill

The internal skill should follow this sequence:

1. Ask for topic, rough direction, and source links/docs.
2. Research the sources and repo references.
3. Inspect available snapshots and identify missing states.
4. Propose angle, postIntro concept, chapter storyboard, and narration.
5. Wait for user approval.
6. Capture/request missing exact UI states.
7. Build manifest, narration files, chapters, and any needed cinematic.
8. Generate TTS.
9. Run static validation and one standard non-visual smoke.
10. Provide chapter URLs and full video URL.
11. Let the user perform visual QC.
12. Make scoped revisions.
13. Update a video-specific handoff doc.

The skill should explicitly say:

- The first run is not expected to be perfect.
- The user guides the result through QC.
- The system's job is to make exact UI staging fast and repeatable.

## Stale Or Risky Areas To Archive Or Mark Historical

These should not be deleted blindly, but they should stop steering new work:

- Old source/doc-to-video generator paths.
- Old `source.md` article-summary assumptions.
- Stale continuation docs that tell sessions to audit unrelated old plans.
- Legacy video packages that are useful only as visual references.
- Any docs that imply the user must provide a full storyboard.

Recommended action:

- Create an archive/historical section in docs.
- Add a clear "current workflow" pointer to the root docs.
- Keep old files accessible, but prevent fresh sessions from treating them as
  the active plan.

## What To Simplify Next

Simplification should be careful and boring. The tool broke when it tried to
be too clever.

Priorities:

- Make the current guided workflow obvious from one doc.
- Add a standard new-video checklist.
- Add a standard handoff template.
- Add a standard non-visual smoke command wrapper.
- Add token/cost guardrails to the workflow.
- Make snapshot inventory/capture checks a required early step.
- Separate "exact UI staging helpers" from one-off chapter code.
- Mark old automation as experimental/historical instead of letting it compete
  with the guided path.
- Separate stable core runtime from normal per-video authoring so teammates do
  not edit shared files for every video.
- Design the GitHub/Supabase distribution model before code cleanup goes too
  far: GitHub for stable code/skill/docs, remote object storage for large
  snapshots/assets, local workspace for authoring/playback unless a hosted
  render service is explicitly built.
- Treat Supabase as backend services, not as the whole runtime. It can provide
  Postgres, Auth, Storage, and Edge Functions for small server-side tasks, but
  heavy browser playback/rendering should stay local-first or move to a
  separate hosted frontend/render service later.

## What Not To Refactor Yet

Do not rewrite the whole runtime.

Do not remove:

- HTML-video approach.
- PostIntro system.
- Sullie intro/outro.
- Exact snapshot-based UI staging.
- DOM manipulation helpers that proved useful.
- Guided chapter files.
- User visual QC loop.

Do not attempt Supabase snapshot distribution yet. It may be useful later, but
the local guided workflow should be made clear and stable first.

Do not refactor in a way that assumes every teammate will directly edit core
runtime files. The desired final workflow is per-video packages plus stable
shared helpers.

## Recommended Next Work

1. Create a concise current-workflow doc for new sessions.
2. Create a video handoff template.
3. Create a snapshot inventory/capture checklist.
4. Create a standard playback smoke script.
5. Create a token-budget checklist for guided video sessions.
6. Create a skill/deployment architecture note covering GitHub, Supabase,
   local cache, and the "no normal core edits" rule.
7. Mark stale docs/plans as historical.
8. Then draft the internal skill instructions from the workflow, not from the
   old automation plan.

Only after these documentation and workflow cleanups should code refactoring
begin.
