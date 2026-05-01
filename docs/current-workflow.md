# Current Workflow

Last updated: 2026-04-29

This is the single entry point for a new session building a WPForms tutorial
video in this repo, and the intended starting point for a future shipped
skill. Read this first. Do not reread long planning docs to recover context.

The user should be able to ask naturally: "make a WPForms AI video about
<topic>." They should not need to remind the agent not to edit core files or
not to invent product UI. The workflow and authoring API carry those rules.

Every normal video includes a topic-specific postIntro by default. PostIntro is
a main feature of the tool, not optional decoration and not a second title card.

## What This Tool Is Now

A guided HTML video builder. The agent stages exact WPForms UI inside a
Mac-framed iframe, layers narration + cinematic moments, and hands the user a
playable URL for visual QC. MP4 capture is external (OBS/ffmpeg).

It is **not** a fully autonomous "doc URL → video" generator anymore. Don't try
to revive that path.

## Production Truth Rules

Non-negotiable framing for every video session.

- Real WPForms UI is product truth.
- Use real captured snapshots as base structural surfaces.
- Do not fabricate product-looking WPForms HTML or fake snapshot
  folders to skip a capture step.
- Snapshots are not required for every final visible state. Many
  states should be produced through DOM prep, prep ops, runtime
  verbs, cloned real DOM, product-truth snippets, or transient
  overlays/controls that are either product-derived or clearly
  marked as staged visual aids.
- Use DOM staging when `node tools/field-state.js --field <name>` (or a
  captured DOM snippet) proves the state can be derived from a real base. New
  snapshots are needed only when the base structure is missing, broken, or not
  truthfully derivable from existing DOM.
- Document staged states in the storyboard and final summary: name
  the base snapshot and what was staged on top. Write a persistent
  handoff doc only if the user asks for one.
- Normal video work must not touch protected core
  (`engine/*`, `runtime/player.js`, `runtime/chapter-runner.js`,
  `runtime/scene-helpers.js`, `runtime/transitions.js`,
  `scenes/shared.js`, `scenes/player.html`, existing accepted video
  packages, snapshots). New files under `runtime/` are also
  approval-gated even when unwired.
- If a video seems to need core edits, **stop and ask** whether the
  behavior is reusable. Prefer a video-local legacy/effect implementation
  first; propose a reusable helper only when repeated need proves it.

## What To Read First (in order)

1. This file.
2. The operator manual for your agent:
   - Codex sessions → `AGENTS.md`
   - Claude sessions → `CLAUDE.md` (if present)
   Both cover the same ground (directory map, three modes, learnings). Read
   whichever matches your runtime; don't read both.
3. `docs/authoring-api.md` — public authoring contract. New videos are
   legacy/effect-mode by default; descriptor mode remains supported for simple
   closed-vocabulary chapters when it does not weaken the approved beat.
   Start from the legacy copy targets in `docs/examples/` before opening any
   accepted video package.
4. `docs/postintro-patterns.md` — what a postIntro is, proven examples, and
   how to invent a topic-specific concept beat without copying a title card.
5. `docs/video-production-templates.md` — storyboard template, chapter
   checklist, snapshot checklist, token budget, smoke spec, and optional
   handoff template.

On-demand only:

- `node tools/field-state.js --field <name> [--section <name>] [--summary]`
  when deciding whether a field state can be DOM-derived from a real base
  snapshot. The source inventory remains canonical, but do not full-read it by
  default.
- `docs/two-video-pattern-audit.md` when comparing against older proven
  production patterns.
- Accepted reference packages only after you can name the exact implementation
  pattern you need. Use them as evidence/debug material, not normal startup
  reading and not design source material. Legacy-first skeletons are the
  default copy targets for new videos.
- Stage plans such as `docs/stage-4-core-api-plan.md` or Stage 5/6 planning
  docs only when the user asks for governance/history.

If a session needs more than that to start, the workflow has drifted.

## What Not To Use As Guidance

Do not use historical planning docs as guidance. If a doc is not in the read
list above, treat it as on-demand reference only unless the user asks for it.
Do not use `CONTINUE.md`.

When in doubt, prefer this doc + your agent's operator manual +
`docs/authoring-api.md` + `docs/postintro-patterns.md`.

## The Guided Workflow

The user gives a topic, rough direction, and source URLs/docs. They do **not**
write a storyboard. The agent runs this loop:

1. **Intake.** Capture topic, slug, source links, any constraints (length,
   tone, must-show states). Run `node tools/skill-context.js` once at the
   start of a new video session if it has not already been pasted into context.
2. **Inventory first.** Before a video package exists, run
   `node tools/list-snapshots.js` or `node tools/list-snapshots.js --search <topic>`
   to find reusable UI states. After manifest/chapters exist, run
   `node tools/list-snapshots.js --for <slug>` to cross-reference the video
   package against `snapshots/` and flag missing states. See snapshot checklist
   in `docs/video-production-templates.md`. Use
   `node tools/inspect-snapshot.js <snapshot> --emit-selectors` and
   `node tools/verify-selectors.js <snapshot> ...` for selector work instead of
   opening runtime internals.

   Use the normal `builder-field-options-*` snapshots as base structural
   surfaces. Future videos should compose clean base snapshots with
   DOM-derived states when product-truth evidence from
   `node tools/field-state.js --field <name>` or real captured DOM supports
   the change. Recapture only if a structural base is genuinely missing.

   Use the scripts to find relevant snapshots before declaring one missing.
   One negative result is not proof. If `list-snapshots.js --search <term>`
   returns nothing, try `field-state.js --search`, broaden the search term, or
   run `inspect-snapshot.js` against a related capture. You have to try the
   scripts to know what is actually available — only fall back to `ASK USER`
   or `NEEDS CAPTURE` after that.
3. **Source research.** Read the supplied docs/pages. Don't crawl the repo
   broadly — this is the biggest token leak.
4. **Storyboard + narration proposal.** Use the storyboard template. Cover
   angle, postIntro concept, chapter list, narration drafts, snapshot needs
   (existing vs missing-needs-capture vs DOM-staged overlay). PostIntro must be
   a real concept beat that previews the video's idea. Do not copy an existing
   product-specific cinematic by style; reuse one only when its semantics match
   the new topic.
5. **STOP. Wait for user approval.** Do not start building.
6. **Capture missing states.** If exact UI is missing, capture from the live
   site or ask the user. Never fabricate a product-looking snapshot folder.

   Raw captures can contain live source domain, local OS paths, and real
   submitter/customer data. If a dirty capture will be shared with the team,
   sanitize and verify it before promotion. Do not create fake cleaned
   snapshots by hand.
7. **Build the first draft in validated slices.** After explicit storyboard
   approval, build toward a full first draft using legacy/effect-mode by
   default unless the storyboard names a simple descriptor-safe reason. Validate
   internally after meaningful slices. Stop early only for visual-risk review,
   a capture/API gap, protected-core pressure, or user-requested slice review.
8. **TTS.** Render narration via `tts/generate.js` into
   `videos/<slug>/narration/`. Don't ask the user to render audio.
9. **Validate.** Run `node tools/validate-video.js <slug>` (errors block,
   warnings surface things to confirm) and
   `node tools/check-video-playback.js <slug> [--chapter <id>]` for the
   non-visual smoke. Both are the gates before review.
10. **Review.** Provide chapter URLs + full video URL. User owns visual QC.
    These are playable HTML review URLs, not MP4 exports. MP4 capture remains
    external, but the agent must still hand over the full player URL and useful
    chapter-only URLs.
11. **Revise scoped.** Make narrow fixes only. Don't rewrite chapters during QC.
12. **Final summary.** Keep it concise. Write `docs/<slug>-handoff.md` only if
    the user asks for a persistent handoff doc.

## Storyboard Approval — Hard Rules

- No implementation or TTS before storyboard approval. Snapshot inventory
  happens before approval; capture only if needed to verify feasibility, or
  if the user approves the capture list.
- No chapter code, no narration mp3s, no DOM prep until the storyboard is
  approved.
- Approval is explicit. "Looks good" or similar from the user. Don't infer it.
- If the user pivots after approval, restart at step 4 for the affected
  slice — don't silently re-plan.

## Per-Video Edits Allowed

- `videos/<slug>/manifest.json`
- `videos/<slug>/chapters/*.js` and `videos/<slug>/chapters/_selectors.js`
- `videos/<slug>/narration/*.txt` and rendered `*.mp3`
- `videos/<slug>/storyboard.md` (optional)
- `docs/<slug>-handoff.md` only if the user asks for a persistent handoff doc
- New snapshot folders under `snapshots/` only when capturing real UI
- A new `runtime/cinematic-<name>.js` only if a postIntro archetype is
  intentionally being promoted. Flag it, don't sneak it in.

## PostIntro Rules

- Required by default for normal videos unless the user explicitly asks to skip
  it.
- Must be an original topic-specific concept beat, not a duplicate intro/title
  card.
- Existing runtime cinematics may be referenced for implementation patterns,
  but must not be copied for design inspiration when their product story does
  not match. The three canonical postIntros are WPForms AI
  `rough-thought-to-draft`, Checkboxes `one-answer-enough`, and Notifications
  `form-to-inbox` — each is product-specific and only reusable when the new
  topic's semantics actually match.
- If no existing semantic match exists, create the postIntro as a video-local
  legacy/effect chapter by default. Descriptor verbs are acceptable only when
  they preserve the approved concept. If the concept needs richer
  HTML/CSS/SVG/GSAP animation, build it with an approved video-local surface or
  ask to promote a reusable runtime cinematic. The canonical postIntros prove
  this repo can do that level of animation.
- Expect visual QC on ambitious postIntros. Revise timing, framing, morphs, and
  payoff states after review; do not downgrade the storyboard to a simple UI
  focus/title beat.
- Field videos should usually begin in real WPForms UI by adding or selecting
  the field from the builder sidebar, unless the user says the field is already
  present.
- Choice-field videos (`Dropdown`, `Multiple Choice`, `Checkboxes`) should show
  the AI 'Generate Choices' button by default: button, modal, generated options,
  and insertion/apply result. If the modal is missing, use a real capture or
  product-derived snippet; do not invent it.

## What Not To Touch

Normal video work must not edit:

- `engine/*`
- `runtime/player.js`
- `runtime/chapter-runner.js`
- `runtime/scene-helpers.js`
- `runtime/transitions.js`
- `scenes/shared.js`
- `scenes/player.html`
- existing accepted video packages and reference baselines
- shared transition/snapshot/camera internals
- existing chapter files in other videos' packages

If a beat truly needs a new core helper, surface it as a maintainer change
proposal. Don't quietly patch core to unblock one beat.

## Reference Packages

Accepted video packages are on-demand evidence/debug material. Do not read them
during normal startup. New videos are legacy/effect-mode by default. Open an
accepted package only after you can name the exact implementation pattern you
need, such as timestamp-locked narration actions, `waitAt(t)`, mid-effect
choreography, a choice-field DOM-helper behavior, snapshot-swap sequence,
narrationSpeed use, focusPull clipping pattern, or an outcome-before-controls
walkthrough. Treat reference packages as evidence, not design source material.

For postIntro design, start with `docs/postintro-patterns.md`. Product-specific
runtime cinematics are not generic inspiration; reuse one only when its product
semantics match the new topic.

## Token / Cost Floor

Cost is a product requirement. The full checklist is in
`docs/video-production-templates.md` (Token Budget Checklist). The shortest
version:

- Don't grep the whole repo. Read named files.
- Run `node tools/skill-context.js` once at session start, then use targeted
  docs/tools from that output.
- Use `docs/examples/legacy-manifest-skeleton.md`,
  `docs/examples/legacy-chapter-skeleton.md`,
  `docs/examples/legacy-postintro-effect-skeleton.md`, and
  `docs/examples/legacy-audio-cued-skeleton.md` as the first copy targets.
- Read accepted reference packages only after naming the exact implementation
  pattern needed.
- Don't run visual QC unless asked.
- Build toward the approved first draft; stop early only for real gates.
- Don't build fake snapshots to skip a capture step.
- Don't reread historical plan docs to reorient — read this file.
