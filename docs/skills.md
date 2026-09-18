# Skills

Repo-local skills live under `.claude/skills/<name>/SKILL.md` — one file each, YAML frontmatter (`name`, `description`). `node tools/skill-context.js` remains the canonical startup dump; skills are topic-scoped context packs loaded on demand. Pick your path first (the table in `CLAUDE.md`), then load the matching primary skill.

Two consumption patterns (`CLAUDE.md`): **procedural** skills define gates that produce artifacts and must be INVOKED via the Skill tool; **reference** skills are lookup indices — file-read is sufficient.

## Available skills (13, as of 2026-09-18)

Procedural — invoke via the Skill tool:

- `wpforms-ae-build` — the After Effects build or twin of a film through the AE connector (`ae_*` tools), invoked before the first AE call: what the build takes from the repo (the approved storyboard as contract, real snapshots rastered at 2×, captured data, brand assets, the `tools/sfx` sound path) and what it bypasses (every HTML gate), the rig + stills gate before motion, the `execute_script` build-script pattern, the bridge rules, the manual checks, `aerender` + `ffprobe`, the 4K pass, handoff + lessons files. Added 2026-09-18 from three AE films; the connector's own skills cover AE craft, this one covers the repo side.
- `wpforms-ad-to-short` — a 9:16 (1080×1920) cut of an APPROVED 16:9 ad in a sibling `videos/<slug>-9x16/` folder: timeline, copy, SFX cues and bed verbatim; geometry only (stage flip with a literal `.stage` box, per-line type refit, horizontal groups → vertical stacks, a centred live-surface band + zoom floor for mixed films, remapped cursor paths, a re-pointed `qc-probe.mjs`, a dated `## Portrait cut` storyboard section). Branches on whether the ad has live `IframeManager` surfaces. Added 2026-09-14 from the two shipped cuts. Not the shorts-carve path and not the original-short path.
- `wpforms-storyboard` — the storyboard step for EVERY track (tutorial / ad-style / mixed / 9:16 short), invoked on any "storyboard …" ask: track detection (asks one question if the track is not stated), intake, concept divergence + the idea/copy gate, the storyboard with every required section including the camera plan (cadence and ease voice decided per film, with reasons — never a system number), the capability check against what the tool can execute, the stills-first look pass, and the approval handoff to the build skill. Full creative; writes storyboards, never film code. Added 2026-09-04 after the wpvibe ad shipped parked (v5) then dizzy (v6) with the storyboard step scattered across three skills.
- `wpforms-video` — tutorial path: intake, snapshot inventory, storyboarding, single-HTML authoring on the master timeline, narration, validation, review-URL handoff. Owns the storyboard-approval gate, the idea/copy + script gates, production-truth rules, the postIntro → chapters (no bookends) shape and the single-HTML sync contracts.
- `wpforms-marketing` — pure-editorial / ad-style / mixed films: path-decision gate, brand canonical, clone-and-customize first write (INV-16), the reference-driven replication recipe (2026-09-14: reference film → 3–5 fps sheets + 24 fps cut windows → scene map from one spine → tile cited per beat in the code → measured scale grammar → stills beside the donor → `qc-probe.mjs` on v1 → render + badged sheet handoff → audio last against the LUFS bar), atmospheric kit, blocks library, text-kit, the editorial / mixed film shapes.
- `wpforms-postintro` — designing, implementing, reviewing or debugging a postIntro concept beat: story-state length rule + multi-phase requirement, Story Proof, build order, canonical references, the chapter-1 handoff.
- `wpforms-motion-audit` — HARD GATE before any postIntro / cinematic / editorial beat is declared done; produces the S–F tier rating (file-read does not). Run on v1, after restructures, at handoff.
- `wpforms-video-polish` — polish an already-shipped single-HTML film without breaking it: backup-first → analyze → surgical batches → static verification → motion-audit if cinematic beats moved.
- `video-qc` — the cheap review / iterate loop against Umair's notes (the QC dashboard is the surface): minimal edits, literal verbs, state the target back, gate ledger populated, chips reported as not-broken — never as quality.
- `dev-advocacy-video` — the Rock 4 production line: picks the topic, drives it end-to-end through the skills above, renders, ships to Kacie, writes back to the wiki; owns the weekly 1 long-form + 2 carved shorts shape.
- `wpforms-machine-qc` — ADVISORY Gemini semantic pass on a rendered MP4 (`tools/machine-qc.js`, 24 fps static + agentic passes since 2026-09-08): run after every render/re-render alongside the gate-ledger tools, verify findings against source before acting; ~35% recall measured on the old 1 fps defaults, re-benchmark pending; never a gate, never replaces his visual QC.

Reference — file-read is sufficient (Skill-tool invocation optional):

- `wpforms-gsap-rules` — GSAP L0 discipline, L1 camera decomposition, the master-timeline + instrumentation contract, `pausableRaf`, Flip patterns, seek-render traps. Read before writing any timeline beat.
- `wpforms-primitives` — write-time lookup index for `motion-primitives.js`, `wpforms-interactions.js`, `iframe-helpers.js` (plus effects, instruments, shorts-kit). Read before writing any motion / cursor / camera / interaction code.

## Not skills

- `wpforms-transitions` — RETIRED 2026-08-22 with the engine. Cross-snapshot movement now lives in `wpforms-marketing`, *Snapshot transitions*; the boundary contract is measured by `tools/seam-gate.js`.
- Designer-grade pass (Emil Kowalski / Jakub Krehel / Jhey Tompkins) — file-read only: `.agents/skills/design-motion-principles/SKILL.md` + its `references/`. Installed outside `.claude/skills/`, so the Skill tool cannot invoke it and nothing fires it automatically.
