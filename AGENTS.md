# AGENTS.md — operator manual for this repo

## ⛔ Anti-patterns — DO NOT do these (9-line catalog)

These patterns have repeatedly caused regressions in past video builds. Re-read this list before each beat:

1. **DO NOT** hand-mount a cursor element (`<div class="cursor">` + `gsap.to(cursorEl, ...)`). Use `Cursor` from `motion-primitives.js`.
2. **DO NOT** single-tween a camera move (`tl.to(camera, {x, y, scale})`). Slide-projector failure mode. Use `cinematicFlight` / `figjamFlight` / `focusStationOverview`; for editorial DOM with no iframe under it, the ad skeleton's `makeStageCamera` (`punch / macro / whip / pullBack / drift / cut`, decomposed by construction). **And DO NOT park it or busy it:** an ad or short re-frames the same host at the cadence and in the ease voice its storyboard's `## Camera plan` declares — a creative call per film, never a system number (wva, 2026-09-03/04).
3. **DO NOT** use a native `<select>` for an editorial dropdown — it can't be opened by JS. Use the faux-overlay pattern from `selectFromDropdown` in `wpforms-interactions.js`.
4. **DO NOT** mount overlays as iframe SIBLINGS painting over the iframe. Inject into iframe DOM directly, OR mount in the parent doc using `elementToStageCoords` for positioning.
5. **DO NOT** swap iframes to show state changes. Keep the same live iframe; mutate its DOM in place.
6. **DO NOT** invent UI fragments (chips, result cards, payoff overlays) without explicit user approval. Every inline UI fragment needs a `// SOURCE: products/<key>/snapshots/<name>/...` snapshot citation OR `// OVERRIDE: <user approval>` annotation in the code itself. See INV-15.
7. **DO NOT** ship a postIntro / cinematic / editorial beat without invoking `wpforms-motion-audit` (Skill tool) and recording the tier rating.
8. **DO NOT** first-write `videos/<slug>/index.html` from a blank file — any path. First write = the path's skeleton clone: pure-editorial / ad / mixed → `cp docs/examples/single-html-ad-skeleton.html videos/<slug>/index.html`; tutorial → `docs/examples/single-html-tutorial-skeleton.html`; 9:16 short → the portrait short skeleton. Commit the unmodified clone, THEN customize it toward the house style references — those predate the playback/instrumentation contract and are never the first write. See INV-16 (amended 2026-08-28).
9. **DO NOT** set a new pilot's stage to anything less than 1920×1080. Lower stage resolutions (1280 / 1440 / 1600) cause snapshot compression that reads as blur. See INV-1. **Exception — 9:16 vertical shorts:** a `1080×1920` stage is a different native, not a smaller one, and is correct for the shorts path. Clone the portrait short skeleton and read `docs/vertical-shorts.md` before touching portrait geometry. Do not "fix" a portrait stage back to 1920×1080.

**Anti-patterns #1, #2, #3, and the `repeat:-1` determinism rule are now hard-gated at write-time** by the `tools/hooks/video-guard.js` PreToolUse hook (wired in `.Codex/settings.json`). It scans every Edit/Write to a `videos/<slug>/` file and BLOCKS the edit if it spots a hand-mounted cursor, a single-tween camera, a native `<select>`, or `repeat:-1`. It additionally WARNS (allow + context) on two heuristics: #4 iframe-sibling overlay mounts (parent-doc append + absolute positioning with no `elementToStageCoords`/`contentDocument`) and #6 invented UI fragments (`chip`/`result-card`/`payoff` with no `// SOURCE: products/<key>/snapshots/...` cite). To ship a deliberate exception, put `// OVERRIDE: <reason>` (or `lint-allow: <rule-id>`) on the offending line. The same hook warns when you `Read` a ~1 MB snapshot `index.html` (see G4 below).

## ⛔ Instruction-fidelity gates — why videos took 7 iterations instead of 2

These four rules exist because past video builds repeatedly failed plain-English instructions, each failure costing a full rebuild + feedback + re-QC round-trip. Root cause every time: **the agent substituted its own short-circuit for explicit guidance.** Treat these as hard rules, not defaults.

### G1 — Preserve the user's literal verb. Never silently substitute.

When the user uses a motion verb, implement that verb. Do not translate it into "the cleanest thing that's geometrically convenient."

| User says | Implement as | NOT as |
|---|---|---|
| **zoom** | camera transform (scale + translate) on the iframe/stage wrapper — `cinematicFlight` / `cameraToElement` | a content morph or cross-fade |
| **morph** | the *same* DOM element changes shape (size/position/radius tween, or Flip) | a cross-fade between two different elements |
| **move** | tween x/y | a fade-and-reappear |
| **click** | `Cursor.click()` on the real target node | a visual flash with no cursor |
| **type** | `caretType` (editorial) / `typeIntoIframeInput` (real input) | opacity-stagger on char spans |
| **fade** | `autoAlpha` tween | display toggle |

If the literal verb is genuinely hard to implement (e.g. a `position:fixed` modal can't ride a camera zoom), **say so and ask what visual experience they want — do not substitute and ship.** "I'll note it as an open question" is NOT a valid escape hatch from an explicit instruction.

### G2 — State the target back, with evidence, before writing animation code.

When the user points at "a part of the UI" — especially if they name a CSS class or ID — that name is a **contract**, not fuzzy English.

1. Find the **exact** class/ID in the snapshot DOM (via `inspect-snapshot.js --emit-selectors` or grep), not a best-guess English match.
2. State it back before coding: *"Morph target is `.wpforms-ai-chat-message-input`; the rest of `.wpforms-smart-edit-modal-body` fades out. Confirming."* If wrong, the user corrects in one line — no code wasted.
3. Build **only** the named element's transform. Surrounding elements get their own treatment (fade / stay / exit) but they DO NOT morph.

The confirmation check is "does my plan map to a specific named element in the snapshot?" — not "do I think I understood?" Verbally agreeing ("makes sense?") then misimplementing is the exact failure this prevents.

### G3 — Surgical edits when iterating, not full-file rewrites.

After feedback, fix the ONE thing called out. Do not rewrite the whole file because the architecture feels wrong. Per-iteration full-file rewrites (v2/v3/v4 each a ~30k-token rewrite) were the single biggest cost sink in past builds. If a rewrite is genuinely required, state why and confirm before doing it. (Project-specific edge of global AGENTS.md §3 "Surgical Changes.")

### G4 — Never `Read` a snapshot `index.html` for selectors. Use the tools.

Snapshot `index.html` files are often ~1 MB — reading one burns context for nothing. To find selectors / structure / field-state, use:

- `node tools/inspect-snapshot.js <slug> --emit-selectors [--filter <text>]`
- `node tools/verify-selectors.js <slug> ...`
- `node tools/field-state.js --field <name> [--summary]`

Full-read the raw markup only when you genuinely need it (rare). The `video-guard` hook warns on raw snapshot reads as a backstop.

This manual is intentionally short. **Topic-scoped rules live in skills**, not here. The first thing to do in any session is identify which video path you're on — that decides which skills load.

## Pick your path FIRST

Four paths. Pick before loading any topic skill. **Also pick the aspect ratio:** landscape 1920×1080 is the default; 9:16 vertical (1080×1920) applies to the Shorts path below and is the only case where a non-1920×1080 stage is correct.

| Path | Use when | Architecture | Primary skill | Audit gate |
|---|---|---|---|---|
| **Short (9:16)** | YouTube/Facebook Shorts, ≤60s, one tiny task, real UI. An **ad-style spot that teaches** (charter 2026-08-13): full kinetic on real UI, animated Sullie bookends (never static; Kacie bookends/postIntro still long-form-only), full ad sound. Default mode for the 2 shorts/week cadence; carved out of that week's long-form, never an independent build | Single-HTML portrait — clone the portrait short skeleton, 1080×1920 stage, camera CROPS the desktop raster (never shrinks it). Motion vocabulary: `videos/_shared/shorts-kit.js`. Mechanics: `docs/vertical-shorts.md` | `dev-advocacy-video` (shorts branch) + `wpforms-video` | `wpforms-motion-audit` mandatory — the bookends are editorial beats, every short has them |
| **Tutorial** | Real product UI, narration-driven, viewer learns a workflow | Single-HTML — `videos/<slug>/index.html` + master `gsap.timeline({paused:true})` + `IframeManager` + `Cursor` + `WPFormsInteractions` + `videos/_shared/narration.js`. (The legacy engine/manifest path was retired 2026-08-22.) | `wpforms-video` | `wpforms-motion-audit` for any postIntro/cinematic beat |
| **Pure editorial / ad-style** | No real product UI, motion-heavy, ad/announcement piece | Single self-contained HTML, vendored GSAP. Clone `docs/examples/single-html-ad-skeleton.html`. | `wpforms-marketing` | `wpforms-motion-audit` mandatory; morph-chain storyboard section required per `docs/storyboard-format-morph-chain-2026-05-10.md` |
| **Mixed** (editorial chrome + real product UI) | Hybrid: real product geometry beneath editorial chrome | One single-HTML film: editorial DOM composited over iframe surfaces | `wpforms-marketing` | `wpforms-motion-audit` mandatory |

If the user's request is ambiguous, ask **one question**: "Tutorial showing real product UI workflow, or editorial / ad-style piece?" (And if it's for Shorts, say so — that changes the stage, not just the crop.) Then pick the path. Do not build a tutorial without the tutorial libraries (`IframeManager` + `Cursor` + `WPFormsInteractions` in the tutorial skeleton); do not mount an iframe stack for pure-editorial work.

## Five libraries — use these, don't reinvent

For any motion / camera / cursor / typing / field-reveal / brand-anchor / WPForms interaction / iframe-glue / split-screen-mirror / named-effect work, the executable code **already exists** in `videos/_shared/`. Reach for the library first. Inventing a new approximation is a recurring failure mode that re-opens bugs the library already fixed (cursor frenzy, caret drift, slide-projector cameras, snapshot-swap cream-flash).

- **`motion-primitives.js`** — animation kit: cameras (`cinematicFlight`, `figjamFlight`, `focusStationOverview`), `Cursor` class (glide / click / hover / drag), text (`caretType`, `statusPillMorph`, `markerSweep`), reveal (`popOut`, `fieldStaggerReveal`), brand (`mountSullieBug`, `cleanFastRejoin`), utils (`boundedRepeats`, `mulberry32`). Full when-to-use in `wpforms-primitives` skill. QC at `videos/_qc-primitives/index.html`.
- **`wpforms-interactions.js`** — WPForms admin/builder interactions: `navAddNewForm`, `selectTemplate`, `openSettingsTab`, `addNotification`, `insertSmartTag`, `selectFromDropdown`, `addConditionalLogicRule`, `dragFieldToForm`, plus the `IframeManager` helper (native 1280×720 mount, engine-pattern camera transform, `pointer-events: none` guard). Full list in `wpforms-primitives` skill. QC at `videos/_qc-interactions/index.html`.
- **`iframe-helpers.js`** — defensive-pattern glue: `glideClick` (scrollIntoView + glide + click in one call), `findInIframeByText` / `glideToText` for SaaS captures with content-hashed class names (Klaviyo `.sc-jTrPJq`, Mailchimp, Stripe). Use whenever class names won't survive a re-capture.
- **`builder-frontend-split.js`** — split-screen authoring helper for "tweak the builder, watch the frontend mirror live" tutorial shape. `BuilderFrontendSplit` class mounts two `IframeManager`s side-by-side, auto-bridges builder→frontend `wpf:field-state` messages, exposes `fadeInFrontend / fadeOutFrontend / isolateFrontend / showAllFrontend / setFieldState`. Mirror works because `products/wpforms/snapshots/_shared/interactivity.js` broadcasts every option change and `products/wpforms/snapshots/_shared/frontend.js` applies the change to frontend DOM. **`frontend.js` is NOT auto-injected** — a frontend snapshot needs a hand-added `<script src="../_shared/frontend.js"></script>` before `</body>` or its handlers never run and the snapshot is silently inert (rf 11). Skeleton at `videos/_examples/builder-frontend-split-skeleton/index.html`. QC harness at `videos/_qc-frontend-mirror/index.html`.
- **`effects/`** — named-effect vocabulary of ported GSAP effects. Each effect is a `mountFoo({...})` function returning `{ el, tweenInto(tl, opts), dispose() }`. Current vocabulary: `mountTextStackFromRight`, `mountTextLetterMaskDomino`, `mountTextCenterOutRoll`, `mountCardsSpreadFan`, `mountCardsFlyInStack`, `mountConstellationPhyllotaxisBloom`. **Use this for editorial / ad-style motion BEFORE writing custom GSAP** — the vocabulary covers text reveals, card layouts, and constellations. Full table in `videos/_shared/effects/README.md`. QC at `videos/_qc-effects/index.html`. To add a new effect, promote a port per the README instructions.

**Load the `wpforms-primitives` skill BEFORE writing motion / cursor / interaction code.** The skill is the per-primitive when-to-use index. Scanning the QC pages above is the fastest way to confirm a primitive matches your need before authoring.

**Hard rule:** if you're about to write `gsap.to(cursor, ...)` or hand-mount a cursor element, stop and use the `Cursor` class. If you're about to write a click-Add-New-Form sequence, stop and call `navAddNewForm()`. If you're about to mount two `<iframe>`s side-by-side and bridge messages between them, stop and use `BuilderFrontendSplit`.

## Authoring prompt templates

`docs/authoring-prompts/` holds reusable copy-paste-then-fill-the-blanks briefs for kicking off new video sessions. Currently:

- `builder-frontend-split.md` — single-field tutorial with builder left + frontend mirror right (Checkbox / Date / Rating / etc.).

When a fresh session asks "make a video about X", check this folder first — if a matching template exists, the storyboard / surface plan / constraints are already drafted. Catalog will grow; see `docs/authoring-prompts/README.md` for the TODO list of kinds still to write.

## ⛔ Two consumption patterns — match the skill type

**Procedural skills** (`wpforms-video`, `wpforms-marketing`, `wpforms-postintro`, `wpforms-motion-audit`) define gates that produce artifacts (tier rating, storyboard approval, multi-animation rule check). **Invoke via the Skill tool — file-read is NOT sufficient.** Reading the rubric ≠ running the scorer.

**Reference skills** (`wpforms-primitives`, `wpforms-gsap-rules`) are lookup indices + rules references. **File-read IS sufficient.** Skill tool invocation is optional. But you still have to READ them at the right moment — `wpforms-primitives` before writing motion code, `wpforms-gsap-rules` before timeline work.

Same applies to `docs/video-architecture-invariants-2026-05-12.md` — pure reference, read inline.

Non-negotiable invocations for tutorial / postIntro / cinematic / editorial work:
- `wpforms-storyboard` whenever the ask is "storyboard …" — it owns the storyboard for every track and hands the approved file to the build skill
- `wpforms-video` at session start for tutorial path
- `wpforms-marketing` at session start for editorial / ad-style path
- `wpforms-postintro` before designing any postIntro
- `wpforms-gsap-rules` before writing any timeline beat (registered timelines, pausableRaf, boundedRepeats)
- **`wpforms-primitives` BEFORE writing any motion code** — WRITE-TIME gate, not a lookup-when-you-think-of-it reference. Sessions that skip it hand-roll approximations of existing primitives.
- **`wpforms-motion-audit` on the v1 build AND before final handoff** — HARD GATE. Applies to v1 review, major restructures, and final handoff. Must record tier S/A/B/C/D/F.

## Topic skills (load AFTER picking a path)

- `wpforms-storyboard` — **the storyboard step for every track** (tutorial / ad / mixed / short): track detection (asks one question if unstated), intake, concept divergence + idea/copy gate, the full storyboard including the camera plan (cadence + ease voice decided per film, with reasons), capability check, stills-first pass, approval handoff. Invoke whenever Umair says "storyboard …". Writes storyboards, never film code
- `wpforms-video` — tutorial authoring, intake, storyboard gate, default authoring mode
- `wpforms-postintro` — postIntro design + multi-animation rule + morph-chain integration
- `wpforms-gsap-rules` — GSAP L0 discipline + camera-decomposition rules + designer principles (Emil / Krehel / Jhey)
- `wpforms-marketing` — editorial / ad-style surfaces + blocks + atmospheric kit + brand canonical + **the reference-driven replication recipe** (reference film → frames → scene map → tile cited per beat in code → probe on v1 → badged-sheet handoff; 2026-09-14)
- `wpforms-ad-to-short` — a 9:16 cut of an APPROVED ad into `videos/<slug>-9x16/`: timeline / copy / cues / bed verbatim, geometry only (stage flip, per-line type refit, stacks, the live-surface band for mixed films, remapped cursor, re-pointed probe). Not the carve path, not the portrait short skeleton path
- `wpforms-ae-build` — the After Effects build or twin of a film through the AE connector (`ae_*`): the approved storyboard as contract, real snapshots rastered at 2×, the rig + stills gate before motion, the `execute_script` build pattern, the bridge rules, `aerender` + `ffprobe`, the shared `tools/sfx` sound path. The connector's own skills cover AE craft; this one covers the repo side
- `wpforms-primitives` — lookup index for `videos/_shared/motion-primitives.js` (cameras / cursor / typing / field-reveal / brand-anchor / exit) and `videos/_shared/wpforms-interactions.js` (Wave 1 standard interactions). Reach here BEFORE writing any new GSAP cursor / camera / interaction code.
- `wpforms-motion-audit` — score animations and camera moves S–F tier with hard-rule calibration. Run before any postIntro/cinematic handoff.
- `wpforms-video-polish` — polish an existing already-shipped video without breaking it. Backup-first → analyze → surgical edits in batches of 5–10 → static verification → motion-audit if cinematic touched. NOT for new authoring, NOT for debug. Includes 8 canonical polish patterns.

Plus the designer-grade pass (file-read, NOT a Skill-tool gate):
- Emil Kowalski / Jakub Krehel / Jhey Tompkins designer-grade audit — file-read `.agents/skills/design-motion-principles/SKILL.md` + its `references/`. It is installed outside `.Codex/skills/`, so the Skill tool cannot invoke it and nothing fires it automatically. Complements `wpforms-motion-audit`.

## Brand canonical source

Use the real WPForms brand assets. Do not invent.

- Brand usage doc + anti-patterns — read it before any brand work
- CSS tokens: `--wpf-orange #E27730` primary, `--wpf-ai-purple` AI-feature-only
- Real Sullie + loading visuals + AI 3-dot spinner — never redraw them
- Real templates API: `https://wpforms.com/templates/api/get/` — fetch it directly; the old cache helper is gone

## Start Here

1. **Read `docs/rulebook.md`.** ~240 IF/THEN rows, every one a defect that shipped, was measured, and cost a rebuild. Read it before the first beat, not after the first rejection. The rows marked `WISH` fire nothing — those only work if you remember them.
2. Run `node tools/skill-context.js` once per session if not in context (it summarises the rulebook live, so the two can't drift).
3. **Pick your path** (table above). Load the matching primary skill.
4. For repo-wide context (boot order, protected core, validation), this file is canonical.
5. For topic content (postIntro shape, GSAP rules, etc.), read the skill — not this file.

`docs/INDEX.md` is a one-line-per-doc index. Use it to find the right doc fast.

## Token Discipline

- Use targeted tools before broad shell searches.
- Snapshot inventory: `node tools/list-snapshots.js [--search <q>] [--for <slug>]`.
- **Snapshot packs live in `products/<key>/snapshots/`** — WPForms is `products/wpforms/snapshots/` (moved from `snapshots/` on 2026-09-23), then `products/wp-mail-smtp/`, `products/sugar-calendar/`, …. Every snapshot tool defaults to WPForms; `VIDEO_PRODUCT=<key>` points it at another pack (`VIDEO_PRODUCT=sugar-calendar node tools/list-snapshots.js`). Film URLs: `/products/<key>/snapshots/<slug>/index.html`; `IframeManager` defaults to the WPForms pack, pass `snapshotBase` for another. Old films that still say `/snapshots/<slug>/` keep loading — the repo servers map that URL onto the WPForms pack.
- Selector discovery: `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]`.
- Selector validation: `node tools/verify-selectors.js <snapshot> ...`.
- Field-state evidence: `node tools/field-state.js --field <name> [--summary]`. **Do not full-read** `docs/wpforms-field-state-inventory.md` (132 KB).
- Do not list or read `videos/` packages during startup. Open another video package only to debug, after you can name the exact pattern you need.
- Do not inspect shared-library internals during normal authoring. Use the relevant skill, skeletons, validators, snapshot tools first. Inspect `videos/_shared/` internals only after a concrete validator/smoke/debug failure.

## Protected Areas

Normal video work must NOT edit:

- `videos/_shared/*` libraries (motion-primitives, wpforms-interactions, narration, iframe-helpers, effects, blocks, shorts-kit) — propose additions; don’t rewrite
- existing `products/<key>/snapshots/**` captures (every product, WPForms included) including their `_shared` assets (capture new ones; never edit captured DOM)
- validation/QC tooling behavior: `tools/validate-singlehtml.js`, `tools/smoke-singlehtml.js`, `tools/lint-determinism.js`, `capture/capture.js`
- shipped videos except scoped fixes requested in review

Shared helpers are promotion-gated: prove video-local first, promote into `videos/_shared/` on second use.

## Per-Video Files

Normal video work may create or edit:

- `videos/<slug>/index.html` (the whole film)
- `videos/<slug>/narration/*.txt` and rendered `*.mp3`
- `videos/<slug>/storyboard.md` (optional; **required** with morph-chain section if editorial — see `docs/storyboard-format-morph-chain-2026-05-10.md`)
- `docs/<slug>-handoff.md` (only when user asks for a persistent handoff)
- new real snapshot folders **only through snapshot capture** (`capture/capture.js`, never fabricate)

For pure-editorial work, the per-video files shrink to a single `videos/<slug>/index.html` plus optional `storyboard.md`. No manifest, no chapter modules, no narration system, no engine boot.


## Determinism

Film code must be deterministic — frame-stepped QC probes (`qc-probe.mjs`) jump to specific timestamps and assert state; non-deterministic code makes those checks unreproducible. Four rules: no `Date.now()` outside player driver, no unseeded `Math.random()` (use `mulberry32(seed)`), no `fetch()` at runtime (preload), no `repeat: -1` (use `boundedRepeats(cycle, visible)`). **Canonical source: INV-9** in `docs/video-architecture-invariants-2026-05-12.md`.

Static check: `node tools/lint-determinism.js [--all]`. See `docs/deterministic-logic.md` for rationale and `docs/deterministic-logic-findings.md` for known existing warnings (logged, not migrated).

## Tools

**Vocabulary — two opposite operations. Never let the bare word "capture" stand alone (rf 7):**

- **snapshot capture** — `capture/capture.js`, freezes a live page into a static fossil. **FIRST** step of a build.
- **MP4 render** — `tools/render-singlehtml-audio.js`, turns a finished HTML film into video. **LAST** step.

"Capture the video" is never an instruction to screen-record the real site. That path produces something video-shaped and bypasses every gate in every skill.

- `node capture/capture.js [--site <name>] --variants <plan.json>` — **snapshot capture**: live page → static snapshot folder. Lives in `capture/`, not `tools/`. Plan schema + eval/waitFor steps: `capture/capture-library.md`
- `node tools/capture-gates.js <slug> ...` — post-capture quality gates (geometry / paint diff / locale / admin chrome / stacking). Report-only; a paint WARN is cleared by LOOKING at the two PNGs or fixing the capture, never by explaining it (rf 9)
- `node tools/preflight-site.js` — pre-capture site check (wp-cli boot, WPForms active, admin login, TTS)
- `node tools/site-eval.js "<php>" [--as-admin]` — wp-cli `eval` wrapper for the LocalWP test sites. **Every staging write needs `--as-admin` and a read-back**: wp-cli boots with no current user, so a WPForms write API fails its capability check and returns `false` — identical to "nothing needed writing". Assert on the value you read back, never on the return value (rf 8)
- `node tools/skill-context.js` — canonical startup context dump
- `node tools/list-snapshots.js [--search <q>] [--for <slug>]` — snapshot inventory
- `node tools/fix-mojibake.js <file> [--write]` — repair UTF-8-read-as-cp1252 text (`â€"` → `—`); `list-snapshots.js` warns when `index.json` needs it
- `node tools/lint-doc-refs.js [--skip-videos]` — do the paths our docs and skills cite still exist? A skill named a reference film that was gone and the session leaned on it anyway (rf-video 3). Report-only; gitignored scratch docs are excluded
- `node tools/field-state.js --field <name> [--summary] | --search <q> | --interactivity [filter]` — field-state query; `--interactivity` lists the transitions `products/<key>/snapshots/_shared/interactivity.js` actually registers, so "can this beat drive the UI?" is answerable at storyboard time (rf 4)
- `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]` — selector emit
- `node tools/verify-selectors.js <snapshot> ...` — selector validate
- `node tts/generate.js --video <slug>` — render narration mp3s
- `node tools/measure-narration.js <slug>` — ffprobe narration mp3s → ready-to-paste `const DUR = {...}` block (run after EVERY tts render; DUR is voice-coupled)
- `node tools/lint-snapshot-assets.js <slug>` — headless 404 check on a snapshot's asset requests (post-capture step 8b)
- `node tools/capture-external.js <url> <slug>` — freeze a non-WP page (OAuth/consent screens) into a self-registered display-only snapshot
- `node tools/validate-singlehtml.js <slug>` — static validator for single-HTML videos (tutorial new-work, editorial, shorts); includes DUR-drift check
- `node tools/smoke-singlehtml.js <slug> [--seconds <n>]` — non-visual smoke for single-HTML videos
- `node tools/render-html.js <slug> --duration <seconds> [--fps 30] [--out path]` — single-HTML editorial → MP4 (no engine)
- `node tools/render-singlehtml-audio.js <slug> [--bgm <path>|none] [--resolution WxH]` — single-HTML → MP4 **with narration + ducked BGM**; this is the renderer the tutorials and shorts actually ship through. Resolution defaults to the video's own `.stage` box (`tools/stage-size.js`), so a 9:16 short renders 1080×1920 with no flag — see `docs/vertical-shorts.md`
- `node tools/stitch.js videos/<slug>.video.json [--no-render] [--xfade <s>] [--dry-run]` — render pieces + ffmpeg-concat **real-Kacie intro + HTML body + real-Kacie outro** into one MP4 (delivery shape since 2026-07-23; HF bookends superseded — recording spec `docs/kacie-intro-outro-recording-spec.md`, flow in `dev-advocacy-video` step 5b)
- `node tools/keyframes.js <video.mp4> [--frames 16 --cols 4]` — contact-sheet grid from an MP4 for visual QC handoff; each tile carries a burned-in `#N t.ts` badge and the tile→timestamp map prints to stdout, so "frame 7" feedback resolves to an exact second
- `node tools/dead-time.js <video.mp4 | slug> [--min-run 0.3] [--fail-over 1.0]` — full-track frame-diff scan of a render: reports runs of no-change frames with the pause-test taxonomy (comma ≤0.45s / borderline / PLANNING BUG >1s); the measured form of the D1 idle-motion rule, also catches frozen-video render defects; report-only. A PLANNING BUG is WITHHELD when full-res freezedetect or a quadrant re-measure disagrees — at 270px the meter cannot see small-area motion (rf-weight 28)
- **`smoke-singlehtml`, `dead-time` and `seam-gate` hold an advisory lock and refuse to start while another one runs** (`tools/headless-lock.js`, `--force` overrides). Concurrent headless runs make the sampler read a timeline going backwards, and the failure looks like the film's fault (rf-video 25). A timing failure is re-run alone before it is believed
- `node tools/sfx/onset.mjs <file|dir>` — SFX head-silence probe (first sample >5% of peak): a click with a late onset fires frames late no matter how well the cue is placed; prints trim `-ss` suggestions. Cue-placement rules in `tools/sfx/CONTEXT.md`
- `node tools/storyboard-sheet.js <slug> [--beats t1,t2,...]` — PRE-render stills sheet: seeks a paused single-HTML film to each beat mark (timeline labels or `--beats`), screenshots the stage, tiles with badges — look-approval on stills before motion work
- `node tools/seam-gate.js <slug> [--cuts t1,t2,...]` — measures exit/entry velocity (px/s) at each cut of a single-HTML film; warns on dead exits/entries and velocity mismatches (the transitions boundary contract, measured); report-only
- `node tools/machine-qc.js <slug | path.mp4> [--mode both|static|agentic] [--fps 24] [--res high|low] [--focus "..."] [--no-report]` — ADVISORY Gemini semantic QC pass on a rendered MP4: a 24 fps high-resolution static pass + an agentic navigation pass, merged (frame-edge crops, endings, on-screen text, blinks/pop-ins/cursor jumps, narration + SFX timing); writes the `machineQc` advisory chip; never a gate, never feeds the dashboard dot. Stage + triage contract: `wpforms-machine-qc` skill. Needs `GEMINI_API_KEY` in `.env`; no headless lock; ~400k tokens per 30–40 s film
- `node tools/capture-brand.js <url> <slug>` — pull a PARTNER brand's real assets (logo SVGs, icons, palette, fonts) from its site into `videos/<slug>/assets/brand/` with provenance; for integration videos only — WPForms' own brand assets are never pulled this way
- `node tools/preview.js [--video <slug>] [--port 4321]` — live-reload + scrubber; also serves the QC dashboard index route (`/__qc/videos.json`)
- **QC dashboard** — `http://localhost:4321/tools/qc-dashboard/` (needs `tools/preview.js` running): per-video gate chips, render playback with dead-time bands + seam-cut ticks, in-browser filmstrip (vendored Mediabunny decodes the mp4 client-side), and timestamped feedback notes with a copy-for-chat export. Reads `videos/<slug>/qc-report.json`
- `node tools/lib/qc-report.js <slug> --set motionAudit.tier=A | --show` — per-video `qc-report.json` gate ledger the dashboard reads. `dead-time.js`, `seam-gate.js`, `narration-qc.js`, `machine-qc.js` write their sections automatically; `validate-singlehtml.js` / `smoke-singlehtml.js` write theirs only with the opt-in `--report` flag (default behavior unchanged)
- `node tools/lint-determinism.js [--all] [--video <slug>]` — determinism check
- `node tools/post-capture.js <slug> [--keep-fields 1,2,3]` — MANDATORY after every new capture: field trim (opt-in) + builder markup trim + CSS dedup + catalog regen, so snapshots are born lean
- `npm run lint` — composes `validate-singlehtml.js --all` + `lint-determinism.js --all`

Use standard tools instead of ad hoc `find`, `grep`, custom Playwright, or runtime spelunking unless there is a concrete gap.

## Validation

Before review handoff:

1. `node tools/list-snapshots.js --for <slug>`
2. `node tts/generate.js --video <slug>`
3. Static validator — `node tools/validate-singlehtml.js <slug> --report`
4. Smoke - `node tools/smoke-singlehtml.js <slug> --seconds 30 --report`
5. **For postIntro/cinematic/editorial beats:** ask `wpforms-motion-audit` skill to score them. Tier A or higher is the merge bar; anything B or below needs a fix or an explicit override. Record it: `node tools/lib/qc-report.js <slug> --set motionAudit.tier=<tier>`
6. **Populate the rest of the gate ledger** so the QC dashboard's chips are truthful — an empty chip means "not measured" and wastes Umair's review pass. Run one at a time (headless lock): `narration-qc.js <slug>`, `dead-time.js <slug>` (shorts: also `--crop 1080:1200:0:300`), `seam-gate.js <slug>`. Then `machine-qc.js <slug>` (advisory, no lock — see `wpforms-machine-qc` skill; verify findings against source before acting, re-run after every re-render).

Visual QC belongs to the user unless explicitly requested. If you do run a browser check, keep it scoped and report what you verified.

Provide playable review URLs after validation — **both**, complete and copy-pasteable:

- **Render QC (the QC surface)** — `http://localhost:4321/tools/qc-dashboard/#<slug>`; needs `node tools/preview.js --no-open` running. Umair's notes come back as a timestamped block; each line is one report worked in timestamp order. Contract: `video-qc` skill + `docs/qc-dashboard.md`
- **Film scrub** — `http://localhost:4321/videos/<slug>/index.html`

Never re-paste raw tool stdout into a handoff — the chips carry it. Summarize what the gates measured in one line. A re-render invalidates every chip; re-run the gates rather than letting a stale chip stand.

## Push Back

Stop and push back when:

- Storyboard approval has not happened — see `wpforms-video` skill HARD-GATE
- Editorial storyboard lacks the morph-chain section — see `docs/storyboard-format-morph-chain-2026-05-10.md`
- A requested state would require fake WPForms UI
- A snapshot is missing and cannot be truthfully derived
- PostIntro is being weakened instead of built with approved animation surfaces — see `wpforms-postintro` skill
- Implementation pressure points toward protected core
- A custom postIntro or a specific approved animation is being downgraded to a generic focus/title beat (the retired descriptor-mode failure — the rule survives)
- An editorial build is being authored from scratch instead of cloned from its skeleton (`docs/examples/single-html-ad-skeleton.html`)
- Purple is being used as primary brand (it's AI-feature-only — `--wpf-orange #E27730` is primary)

## Where Topic Rules Live (Quick Map)

Don't look here for these — load the skill instead:

| Topic | Skill |
|---|---|
| Path selection / intake / storyboard gate / production truth / legacy chapter shape / modes | `wpforms-video` |
| PostIntro multi-animation rule / build order / canonical references / morph-chain | `wpforms-postintro` |
| GSAP L0 discipline / camera-decomposition / registered timelines / `pausableRaf` / Flip patterns / designer principles | `wpforms-gsap-rules` |
| `surface: 'editorial' / 'mixed'` / blocks library / atmospheric kit / text-kit / hero composition / brand canonical | `wpforms-marketing` |
| Motion S–F tier scoring / hard-rule calibration / pre-handoff gate | `wpforms-motion-audit` |
| Motion-primitives + wpforms-interactions library lookup (per-primitive when-to-use, signatures, QC status) | `wpforms-primitives` |
| Polish an existing video (timing / easing / typography / handoffs) without breaking it | `wpforms-video-polish` |
| 9:16 cut of an approved ad (band, type refit, stacks, probe re-point) | `wpforms-ad-to-short` |
| After Effects build or twin (bridge rules, raster pipeline, render recipe, phase gates) | `wpforms-ae-build` |
| Designer-grade audit (Emil Kowalski / Jakub Krehel / Jhey Tompkins) | file-read `.agents/skills/design-motion-principles/SKILL.md` + `references/` (not Skill-tool invocable) |

Skills are at `.Codex/skills/<name>/SKILL.md`. Each is a single file with YAML frontmatter (`name`, `description`).
