# Contributing

Short guide for human teammates working on this repo. Agents (Claude /
Codex) follow `CLAUDE.md` and `AGENTS.md` — those go deeper.

---

## Setup

```bash
git clone <repo-url>
cd <repo>
npm install
cp .env.example .env       # only needed for new captures
node serve.js              # http://localhost:4321
```

Open a video at `http://localhost:4321/scenes/player.html?video=<slug>`.

---

## How a video gets made

The system is intentionally human-in-the-loop. The flow is:

1. **Intake.** Topic, slug, audience, source links, must-show states.
2. **Inventory.** `node tools/list-snapshots.js [--search <q>]` to see
   what UI states already exist.
3. **Storyboard proposal.** Agent drafts angle, chapters, narration,
   postIntro concept, snapshot plan.
4. **STOP. Operator approves.** No chapter code before explicit sign-off.
5. **Capture missing snapshots.** `capture/capture.js` against your local
   WPForms install (uses `.env` creds).
6. **Build chapters.** Default mode is **legacy/effect**
   (`docs/examples/legacy-chapter-skeleton.md`). Descriptor mode is
   secondary and used only for simple beats.
7. **Render narration.** `node tts/generate.js --video <slug>`.
8. **Validate.** `node tools/validate-video.js <slug>` and
   `node tools/check-video-playback.js <slug>`.
9. **Hand off the playable URL.** Operator owns visual QC.
10. **Revise.** Scoped fixes only.

Don't skip step 4. Storyboard approval is the only thing standing between
"approved beats" and "fabricated WPForms UI."

---

## Authoring rules

**Default mode:** legacy/effect-mode chapters. Preserves topic-specific
postIntro animation, chapter-local HTML/CSS/SVG, precise effect
choreography, and `audio-cued` `waitAt(t)` timing.

**Three timing modes:**

- `per-beat-narration` — each beat has its own narration clip; runner
  waits for it. Default for tutorial chapters.
- `parallel` — one narration clip plays alongside timed beats.
- `audio-cued` — one narration clip with `waitAt(t)` inside one rich
  `effect()`. Use for precise timestamp choreography.

**PostIntro is required by default** — 8–15 seconds, ≥ 5 distinct
animation phases (mount, primary morph, payoff, secondary morph or label
reveal, exit/handoff). Topic-specific concept beat, not a second title
card. See `docs/postintro-patterns.md`.

**Production truth:**

- Real WPForms UI is the source of truth.
- Snapshots are base structural surfaces, not one snapshot per visible
  state.
- DOM-derived states are allowed when grounded by `tools/field-state.js`,
  real captured DOM, or `docs/wpforms-field-state-inventory.md`.
- No fabricated UI. No fake snapshot folders.

---

## Protected areas

Do not edit during normal video work:

- `engine/*`
- `runtime/player.js`, `chapter-runner.js`, `scene-helpers.js`,
  `transitions.js`
- `scenes/player.html`, `scenes/shared.js`
- Existing accepted video packages (scoped fixes are fine on request)
- Existing snapshots (capture new; do not edit captured DOM)

New files under `runtime/`, including unwired helper sketches, are
approval-gated. If a beat seems to need core, propose a video-local
helper first.

---

## Branching and PRs

- One feature/video per branch. Branch name: `video/<slug>` or
  `fix/<short-description>`.
- Run validation before opening a PR:
  ```bash
  node tools/validate-video.js <slug>
  node tools/check-video-playback.js <slug>
  ```
- Include the playable review URL in the PR description.
- Don't commit `.env`, `node_modules/`, `probe-out/`, `snapshot-backups/`,
  or `snapshots-published/` — all are gitignored.

---

## Where to find things

| Need | Read |
|---|---|
| Workflow overview | `docs/current-workflow.md` |
| Authoring contract (helpers, ctx, validators) | `docs/authoring-api.md` |
| Chapter shape | `docs/examples/legacy-chapter-skeleton.md` |
| PostIntro design | `docs/postintro-patterns.md` |
| Audio-cued timing | `docs/examples/legacy-audio-cued-skeleton.md` |
| Choice-field flow (Dropdown / Multi / Checkboxes) | `docs/examples/choice-field-generate-choices-skeleton.md` |
| Field-state inventory (large; query, don't full-read) | `docs/wpforms-field-state-inventory.md` via `node tools/field-state.js` |
| Storyboard / chapter / smoke checklists | `docs/video-production-templates.md` |
| Locked chapter interface | `docs/chapter-module-contract.md` |

---

## Tooling reference

```bash
node tools/skill-context.js                       # canonical context dump (agents read this)
node tools/list-snapshots.js [--for <slug>]       # snapshot inventory
node tools/field-state.js --field <name>          # query field-state inventory
node tools/inspect-snapshot.js <slug> --emit-selectors
node tools/verify-selectors.js <slug> [sel...]
node tools/validate-video.js <slug>               # static validator
node tools/check-video-playback.js <slug>         # non-visual smoke (exit 0 = clean)
node tts/generate.js --video <slug>               # render narration
node serve.js                                     # local server on :4321
```

---

## Asking for help

If a session feels off (agent skipping the storyboard gate, fabricating
UI, weakening postIntro, editing protected core), stop and re-ground in
`docs/current-workflow.md`. The operator manual files (`CLAUDE.md`,
`AGENTS.md`) explicitly forbid all four.
