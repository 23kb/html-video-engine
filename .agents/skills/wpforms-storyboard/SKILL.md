---
name: wpforms-storyboard
description: "Use whenever Umair says 'storyboard …' in any form — 'storyboard tutorial', 'storyboard about 3 new ad style videos', 'storyboard about wpforms x claude through wpvibe angle', 'storyboard a video for this doc', 'new storyboard', 'angle for X', 'camera plan for X'. Owns the WHOLE storyboard step for every track (tutorial / ad-style editorial / mixed / 9:16 short): track detection (asks ONE question when the track is not stated), intake, concept divergence + the idea/copy gate, the storyboard with every required section INCLUDING the camera plan (cadence + ease voice declared per film, with reasons), the capability check against what this tool can actually execute, the stills-first look pass, and the approval handoff to the build skill. FULL CREATIVE: this skill decides cadence, ease voice, shot vocabulary and movement budget per film — it never falls back on a system number. It writes storyboards, never film code. Triggers: storyboard, storyboarding, angle, camera plan, shot list, new video."
---

# WPForms Storyboard — one skill owns the storyboard, for every track

**Why this exists (2026-09-04).** The storyboard step used to be scattered across
`wpforms-video` (tutorial gate), `wpforms-marketing` (editorial gate), `dev-advocacy-video`
(shorts) and the format doc. Each session wrote the sections it remembered. The first WPVibe ad
shipped with a shot list and no camera: five framings in 44 seconds, one 23.7-second hold, and
five QC rounds that changed what was on screen without ever touching how it was seen. The fix
over-corrected into 25 landings in 41 seconds — "making me dizzy" — because a rule supplied the
cadence instead of the storyboard. Umair's ruling: *"the cadence has to be set by the
storyboarding skill, because videos will have and should have different cadence"* and *"the
storyboarding skill for editorial and shorts videos should be full creative."* This is that skill.

**What it does:** turns a one-line ask into an approved `videos/<slug>/storyboard.md` that the
build skill can execute as a literal contract (G1–G3).
**What it never does:** write film code, capture snapshots, render, or invent a cadence.

## Step 0 — Track (ask ONE question if it is not stated)

Umair states the track. Parse it from the ask:

| Ask contains | Track | Build skill after approval |
|---|---|---|
| "tutorial", "how-to", "walkthrough", "for this doc" (a how-to doc) | **Tutorial** — real product UI, narration-driven, 1920×1080, real-Kacie bookends stitched at delivery | `wpforms-video` |
| "ad", "ad style", "ad-style", "marketing", "launch", "announcement", "promo", "spot" | **Ad-style** — editorial, music + SFX; becomes **Mixed** the moment a real capture of the feature exists (real UI is mandatory then) | `wpforms-marketing` |
| "short", "shorts", "9:16", "vertical", "reel" | **Short** — 1080×1920 portrait, ≤60s, an ad-style spot that teaches, carved from a long-form where one exists | `dev-advocacy-video` (shorts branch) |
| "9:16 of the ad", "vertical cut of <ad slug>", "make the ad a short", "portrait version" | **Ad → Short** — a finished 16:9 ad re-cut to 1080×1920 in a sibling `<slug>-9x16/` folder; the ad's storyboard is the source, this skill writes only the portrait deltas (scene map rows kept/dropped, camera plan re-declared for the portrait crop) | `wpforms-ad-to-short` |
| none of the above | **ASK**, exactly: *"Which track — tutorial (real product UI, narrated), ad-style / editorial, or a 9:16 short?"* Then stop until answered. Never guess a track from the subject. |

Batch asks ("storyboard about 3 new ad style videos") mean N separate storyboards, each with its
own divergence, angle approval and slug. Do not ship three shades of one idea.

Subject forms and where product truth lives:

- **A feature** ("entry exports") → `docs/product-truth/<feature>.md` if present, else the wpforms.com doc (WebFetch) and write the note during intake (UI-derived facts get an `UNVERIFIED` marker).
- **A doc** ("for this doc" + URL or path) → read it end to end; the task walk in the doc IS the chapter list for a tutorial.
- **An angle** ("wpforms x claude through wpvibe") → the brief + backlog in `umair-wiki/video/wpvibe-social-push.md`; the abilities doc (`wpforms.com/docs/using-wpforms-with-ai-assistants`) is product truth — approval before execution, documented abilities only.
- **No subject** ("storyboard tutorial") → offer the top three from `docs/ga4-video-priorities/README.md` and ask which. Do not pick silently.

## Step 1 — Intake (read before inventing)

In this order, with the tools — never a full read of a snapshot `index.html` (G4):

1. **Product truth** for every claim, value, metric name and ability limit (above).
2. **Snapshot inventory:** `node tools/list-snapshots.js --search <q>` — what real UI exists. A state that appears on two surfaces (builder canvas AND published form) needs a capture per surface; enumerate **state × surface**. Status each: `exists` / `DOM-derived` / `NEEDS CAPTURE` / `ASK USER`. Hidden panels a snapshot carries: `outline.md` "Panels & modals" — mark in/out of scope.
3. **Can the beat DRIVE the UI?** `node tools/field-state.js --interactivity <field>` — handlers are added per video; a beat that toggles an option needs one to exist.
4. **Real references, not adjectives.** Every editorial-composition beat cites a real frame: a reference film's contact sheet (Shipper, Codex, x.ai, Google Pics tiles), a house S/A-tier film, or a snapshot region. "Make it Apple-like" is not a reference.
   **Ad-style films are reference replicas (2026-09-14).** When a reference film is declared, the
   storyboard TRANSCRIBES it — it does not invent and then cite:
   - Make the reference addressable first: contact sheets at **3–5 fps** into
     `videos/<slug>/reference-frames/` (denser where the motion is) + a full-res frame per pivotal
     moment; then **24 fps windows of 0.3 s around every cut** (`ffmpeg -ss <cut-0.05> -t 0.34 -vf
     fps=24,tile=4x2`) before the seam ledger — at 4 fps every 1–7-frame dissolve reads as a hard
     cut and the film ships blinks (`cgw` 11). 4 fps = composition; 24 fps = transitions.
     **Reference analysis is a skill:** run the `reference-motion-spec` worker inside the `video-pipeline` skill (open its `SKILL.md`) on the mp4 (sheets, 24 fps
     strips, seam ledger, camera plan) and consume its `motion-spec.json` + `brief-generic.md`
     as the reference input here; the scene map and the seam ledger copy from them, tile cites included.
   - **One spine reference.** Write a `## Scene map` in the donor's order — one row per donor
     SCENE (composition, framing, transition type, duration) and the WPForms content that replaces
     the donor's. A citation names a **scene**, never a **phase**: "rows stack in, 0.25 s each" is
     portable to any composition and proves nothing about it. A second donor only where the spine
     has no scene, said so in the row; a row that cannot say "this is the donor's shot, reframed
     with our content" is an invention and gets an `OVERRIDE` line, not a citation (`wcr` — eleven
     donors, a 3×3 wall none of them contain, −5/10).
   - **Measure the scale grammar off the frames.** Per landing: zoom = subject height ÷ frame
     height → stage zoom; the reference's camera VERB (track / cut / hold); one measured subject box
     in stage px, from which fill OR zoom is derived and the other is the check. Fill and zoom
     columns written by feel disagree with each other (`cja` 1, 4). A fixed camera is a valid plan
     when the row says why (`itf`).
   - The tile citation is carried per beat into the film's code (`// ref B-6 -> B-8`) by the
     build skill — the storyboard's beat rows name the tile so it can be.
5. **Existing kit for this shape:** `docs/authoring-prompts/` (e.g. `builder-frontend-split.md` for tweak-builder-watch-frontend tutorials), `docs/postintro-patterns.md`, the ad-format menu below.
6. **Length + audio mode defaults** (override with a reason): tutorial 60–120s narrated; ad 25–45s, no VO (typed copy carries it — Shipper/Codex grammar), VO on request; short ≤60s, narration pins beat durations.

## Step 2 — Concept divergence + the idea/copy gate (in chat, wait for yes/no)

Never self-approve an angle. A directive naming a subject authorizes the storyboard work, never the
angle, script or caption copy (two films scratched on idea with green gates — `cad` 9 / `scs` 9).

1. Generate 3–5 random alphanumeric seed strings; derive one distinct creative direction from each
   (texture, rhythm, metaphor, structure). At least one is deliberately ambitious (genre borrow,
   unexpected structure, visual conceit). Tutorials: the teachable promise is doc-derived; diverge
   on the HOOK and the postIntro concept.
2. Send Umair: the angle in one paragraph, the literal copy as plain text (hook line, every
   on-screen caption / claim, outro line; tutorials: hook + postIntro concept options + one-line
   chapter angles), and for a batch the N angles side by side. For shorts: the PROBLEM the short
   solves, in one sentence, first.
3. Wait. "Sounds good" is not approval. Edits come back as the final copy; re-confirm changes.

## Step 3 — What this tool can execute (the capability map)

Storyboard only what the build can do, and name it. Every beat row cites a primitive, effect,
interaction or surface from this map; anything else is `Custom` — a flag that names where it
would come from, or asks.

### Surfaces

| Surface | What it is | Limits that shape shots |
|---|---|---|
| **Real UI** (all tracks) | Captured snapshots mounted through `IframeManager` at native 1280×720; live DOM you can mutate in place (`gsap.set`/tweens on iframe nodes, CSS injection), type into (`typeIntoIframeInput`), scroll (`paneScrollTo`, `pageCenter`), swap between (`ifm.swap`, crossfade, preload first); real hidden UI (popovers, modals) toggled open | Content below 720px needs a scroll-then-frame; never a CSS filter over the iframe (blur) — grade with veils; never `scalePush` the iframe; never swap iframes to show a state — mutate the one you have; a `position:fixed` modal cannot ride a camera zoom |
| **Lifted fragments** (ad / mixed / short) | `liftComposite` copies real DOM pieces out of a snapshot onto editorial ground as floating cards (the WPVibe form, entries rows) — real, cited `// SOURCE: products/<key>/snapshots/…` | Geometry pseudos only (icon-font glyphs render as tofu); staged pre-states (a required star removed, a toggle off) are `OVERRIDE` items the storyboard lists |
| **Two-panel mirror** (tutorial) | `BuilderFrontendSplit` — builder left, published form right, option changes mirrored live (`frontend.js` must be included in the frontend snapshot) | Single-field tutorials; see `docs/authoring-prompts/builder-frontend-split.md` |
| **Editorial DOM** (ad / mixed) | The single-HTML ad skeleton: claims, cards, chips, atmosphere, everything inside `#lens` (the stage camera) | Brand orange `#E27730` primary; purple is AI-feature accent only; WPForms capitalized; invented chrome (a Claude window, a chip tray) is an `OVERRIDE` item Umair approves with the copy |
| **Portrait stage** (short) | 1080×1920; the camera CROPS the desktop raster, never shrinks it; zoom band 1.78–2.0; a framed subject is at most ~607 logical px wide; no vertical pan (scroll the doc instead); top/bottom zones 0–300 / 1500–1920 are brand ground or an instrument dock (`mountSurround`) | Frame cells, never full-width rows; field-center rule ±80px |

### Camera — what the frame can do, per surface

**On real UI** (iframe camera, poses measured by `cameraToElement` with `fill` / `pad`, clamped at the doc edge):

- `flyToElement` — the standard framed move: ONE blended tween, translation on the land ease with a zoom dip inside it. `gcFramed` = fly + glide + click. `flyCentered` for dead-center.
- `cinematicFlight` — 5-phase: anticipation nudge → outbound scale dip → inbound → land-hold → optional micro-zoom (`continuous: true` for one unbroken arc). `figjamFlight` — zoom out, traverse, zoom in (two things on one canvas). `focusStationOverview`.
- `punchIn` / `punchToRegion` (frame a GROUP) / `whipPan` (lateral, constant zoom) / `settle` (the consequence hold: slow push + ring pulse + cursor already approaching) — shorts-kit, portrait band by default, `minZoom`/`maxZoom` override on landscape.
- Framing thresholds that read as "close": inputs 3.0+, buttons 3.2+, cards 2.8+ (a whole panel at 2.5× still reads wide). A translate over ~250px needs a scale arc. Consecutive flights ladder the zoom monotonically; never fire a flight another can overwrite.
- Any narrated/highlighted field sits dead-center (±80px); change the content (hide columns, scroll) when the clamp forbids it.

**On editorial DOM** (`makeStageCamera` in the ad skeleton — `#lens`, transform-only, zoom 1.0–2.2, literal `at:` times, pose-logged):

- Framing presets: `move` (any pose), `punch` (close on a subject), `macro` (tight, the "seen close" shot), `whip` (lateral at the current zoom), `pullBack` (wide or medium), `drift` (slow push that carries a hold — not a landing), `cut` (a change the camera does not make: a veil, an end card).
- **Ease voices** — the storyboard names the film default and per-move overrides: `anticipate` (pull away 6%, then drive, soft landing — the AE shape), `glide` (one calm arc; felt, not seen), `snap` (launch, snap-stop; lands on an SFX hit), `punch` (crouch toward, overshoot landing; the most energetic — sparingly). Anticipate is one voice, not the only one.
- Atmosphere, veils, grain and the end card live OUTSIDE `#lens` and do not zoom.

**Cannot:** vertical pan in portrait; zoom past 2.2 on DOM without softening; a camera on a
`position:fixed` element; smooth motion through a snapshot swap (preload + crossfade, or cut on
peak velocity).

### Cursor, typing, interaction (real UI)

`Cursor` (glide / click / hover / drag, anti-frenzy), `clickRipple`, `glideClick` / `glideToText`
(text-anchored for SaaS captures with hashed classes), `caretType` (editorial typing),
`typeIntoIframeInput` (real inputs), `popOut` (lift a real element into 2.5D), `fieldStaggerReveal`,
`statusPillMorph`, `markerSweep`, `cleanFastRejoin` (exit with blur), `mountSullieBug`.
WPForms admin/builder interactions that exist as one call: `navAddNewForm`, `selectTemplate`,
`navWPFormsSidebarMenu`, `openFormInList`, `dragFieldToForm` (ghost-carry + FLIP drop, `camera:
'follow'`), `openFieldOptions`, `setFieldLabel`, `setNameFormat`, `toggleEmailConfirmation`,
`addNotification`, `editNotificationName`, `setNotificationSendTo`, `setNotificationSubject`,
`setNotificationMessage`, `openSmartTagPicker` / `insertSmartTag`, `selectFromDropdown` (faux
overlay — native `<select>` cannot be opened), `toggleSettingControl`, `duplicateNotificationBlock`,
`setNotificationActive`, `collapseNotificationBlock`, `expandSettingsSection`,
`addConditionalLogicRule`, `navBuilderSidebar`, `openSettingsTab`. Anything else on real UI is DOM
puppetry the build writes by hand — say so in the row.

### Editorial motion vocabulary (ad / mixed / postIntro)

- **Effects** (`videos/_shared/effects/`): text — `mountTextStackFromRight`, `mountTextLetterMaskDomino`, `mountTextCenterOutRoll`, `mountTextDescramble`, `mountTextDupWordMask`, `mountPhraseChain` (3-phrase claim chain ending on a live word); ad surfaces — `mountTaskQueue` (agent works a checklist), `mountSkeletonToLive` (skeleton → real fields on the same coordinates), `mountOdometer` (numbers that LAND), `mountStatCountUp` (numbers that tick), `mountLogoWall` (caller supplies real marks), `mountQuoteCard`; cards — `mountCardsSpreadFan`, `mountCardsFlyInStack`; `mountConstellationPhyllotaxisBloom`; `mountGlassCard` (needs a rich moving world behind it); `mountWaveformBars` + `pulseEmphasis`; seams — `mountWashVeil` / `washTransition` / `unparkGroup` (`effects/seams.js`); `mountEndCard` (house outro: real Sullie + wordmark + CTA + URL). Each mount parks hidden until its beat. Ground assumption per effect (light vs dark) is in `effects/README.md`.
- **Text-kit** (24 presets): mask-reveal-up, top-down-letters, per-character-rise, focus-blur-resolve, soft-blur-in, spring-scale-in, micro-scale-fade, type-out-typewriter, glitch-resolve, shutter-bars, zoom-blur-in, wave-rise, cascade-from-edge, letter-flip, slide-mask-left/right, gradient-wipe, bounce-in-letters, elastic-scale-in, chromatic-shift, magnetic-snap, paragraph-stagger, word-by-word-emphasis, liquid-morph. Never a plain opacity fade on a headline.
- **Blocks:** `mountCodeCard`, `mountMacWindow`, `mountPhoneFrame`, `mountPill`, `mountStatusPill`, `mountArrow`, `mountRouteLine`, `mountTerminal`.
- **Instruments** (`instruments.js`, proven on shorts): `valueRoll`, `sheenSweep`, `stateChip`, `routeChip`, `scanline`, `raceLane` (the race 2-up), `browserShell`. Shorts-kit extras: `slamKeyword`, `stampDown`, `shakeNo`, `nodYes`, `staggerPopNamed`, `bandJolt`, `dropCatch`.
- **Atmosphere:** grain, `gradientSweep`, `parallaxPair`, `scalePush` (editorial layers only), `darkBackdrop`; per-beat bed swaps; ambient blobs. Ad-energy beats hold via consequence, never idle breathing; explainer beats may breathe.
- **Eases:** `whipSettle`, `heldSnap` (xai E1–E4), `recoil`, `resolve`, the camera voices above, `glassSpringEase`. Flip for same-node shape morphs (the morph chain).
- **Ad formats on the menu:** race 2-up (`raceLane`, ours finishes first — the lag is the argument); cinematic 2-shot cold open (2s wide premise → hard cut → 2s close with our UI alive; third-party footage needs a RIGHTS CHECK); mid-film brand pivot (logo pop → divider draw → feature icon → title card) as the product-arrival moment; storyboard-strip format is PARKED — never scope it.
- **PostIntro** (tutorial / optional short): species 1 morph-chain, species 2 illustrated montage — proposed through `wpforms-postintro`'s Story Proof with 2–3 distinct options, each phase naming a reference frame or effect list.

### Sound, narration, bookends

- **Narration:** `narration.js` `beat()` / `say()` / word-timed captions; ElevenLabs (Kacie voice) for finals, Voicebox for drafts; DUR tables are voice-coupled (measured, never hand-estimated). Tutorials and shorts are narration-driven; ads carry copy as typed/animated text and take VO only on request.
- **Sound:** SFX rig with a SEMANTIC palette (`assets/sfx/` — click only where a click happens, pop on a bubble, stamp on a slam; shimmers and riser-whooshes were rejected by ear; **tick sounds are banned in every film — never plan, place or generate one** (rejected 2026-09-17, files deleted 2026-09-18); sheen sweeps ≤2 per film; cue levels copy a measured reference — `tools/sfx/CONTEXT.md` § Reference-copy recipe); BGM added at render. Ad mix: music-forward, no sidechain ducking, shaped arcs, 0.6–1.7s fade or hard-out. Tutorial bed 0.17 / 0.12 ducked.
- **Bookends:** tutorial = real Kacie intro + outro stitched at delivery (no in-film cards; Sullie lives inside the film via postIntro or brand bug); short = animated sting (`mountShortIntro`, owns the hook text) + end card (`mountShortOutro`); ad = animated Sullie-assembly sting opens, `mountEndCard` closes.

### Needs approval or is off the table

Native `<select>` (faux overlay instead) · a fixed modal under a camera zoom · any invented UI fragment (needs `// OVERRIDE: <approval>` — list it in the storyboard) · fake WPForms UI, ever · mockups when a real capture exists (max C in audit) · invented template names/thumbnails (fetch `https://wpforms.com/templates/api/get/`) · a synthetic talking head (parked) · third-party footage without a rights check · purple as primary · a stage below 1920×1080 (portrait 1080×1920 is the one exception).

**Discovery when the map is silent:** `node tools/skill-context.js`, the `wpforms-primitives` skill, `videos/_shared/effects/README.md`, the QC pages `videos/_qc-effects/`, `_qc-primitives/`, `_qc-interactions/`.

## Step 4 — Write the storyboard (`videos/<slug>/storyboard.md`)

Only after the angle and copy are approved. Agree the slug first. Sections, in order; the
"required" column is per track (T = tutorial, A = ad/mixed, S = short):

| Section | T | A | S | What it holds |
|---|---|---|---|---|
| Status + assignment | ✓ | ✓ | ✓ | `DRAFT — awaiting storyboard approval`; who asked, for what channel; track, stage, target length, audio mode |
| Angle + audience (approved) | ✓ | ✓ | ✓ | The approved paragraph verbatim. Shorts: the problem sentence first |
| Literal copy (approved) | ✓ | ✓ | ✓ | Hook / captions / claims / outro exactly as approved; tutorials: narration drafts per chapter (in the beats table) |
| Product truth + snapshot plan | ✓ | ✓ | ✓ | Claims sourced; snapshots as state × surface with statuses; hidden-panel inventory in/out of scope; interactivity confirmed; captures needed listed |
| Morph chain | postIntro only | ✓ | opt | Host element `#id`, identity arc table, continuity contract (`docs/storyboard-format-morph-chain-2026-05-10.md`) |
| **Scene map** (reference-driven) | — | ✓ when a reference film is declared | ✓ when carved from an ad (`wpforms-ad-to-short`) | Spine reference named (file path); one row per donor scene in donor order: donor t-range, composition, framing, transition (from the 24 fps read), duration → our content; tile ids per row; `OVERRIDE` on any row that is not a donor shot. **Plus an in-beat motion ledger per scene** (2026-09-14, `wcr` v2): every thing that MOVES inside the donor scene — what, from which frame to which, continuous or discrete, the ease shape read off the frames (launch fast / long settle = `whipSettle`; hold-whip-stop = `heldSnap`), what streams — and our equivalent for each. A donor scene whose subject is alive (text streaming, a label cycling, a card settling) gets a substitute that is alive the same way; a static snapshot in a live donor scene is where "like the reference but not good" comes from |
| Rules for the whole run + hero beat | ✓ | ✓ | ✓ | Literal invariants (G1 contracts); the one beat that carries the film, built first; current + reserved vectors |
| PostIntro story | ✓ | — | if triggered | The approved Story Proof phase table (`wpforms-postintro`); shorts state which trigger applies or that the short opens on the UI |
| Beats | ✓ | ✓ | ✓ | One row per beat: t, ground/surface, action, copy or narration, DOM mutation named (a beat whose answer is "the camera moves" is not a product beat); tutorials walk the task end to end and END on the payoff on a real frontend surface |
| Seam ledger | ✓ | ✓ | ✓ | One row per cut: exit vector, entry vector, carrier, technique; ≤2 transition families |
| Shot list | ✓ | ✓ | ✓ | One row per beat KEY (must match the film's `beat()` keys or `tl.addLabel` names): subject & hero frame / surround (portrait) / named vocabulary / transformation / carriers; composition map |
| **Camera plan** | ✓ | ✓ | ✓ | Header: `Cadence:` (seconds per landing + the WHY), `Max hold:`, `Ease voice:` (film default + overrides), `Landings:` + zoom range. Then one row per landing: t, subject, fill or zoom (a number), voice + duration in, hold, what carries the hold. Format and voices: the format doc's *Camera plan* section |
| Look gate | — | ✓ | ✓ | Per editorial-composition beat: the cited reference frame (sheet + tile) or "stills pass" — never an adjective |
| Capability check | ✓ | ✓ | ✓ | Every primitive / effect / interaction named in the rows resolves to Step 3; `Custom` entries name where they would come from, or ask |
| OVERRIDE items | ✓ | ✓ | ✓ | Invented chrome, staged pre-states, fragment presentation, co-brand assets, no-VO — approved with the copy |
| Build order + handoff | ✓ | ✓ | ✓ | Skeleton clone committed unmodified → stills → hero beat → rest → gates; which skill builds |

### The camera plan is a creative decision — how this skill makes it

There is no default cadence. Decide from the film, and write the reason on the `Cadence:` line:

- **What stays, what switches?** A film whose UI stays the same (one chat window, one form) is a
  *considered* camera: few landings, on story turns only, with `drift` and the subject's own motion
  carrying the holds. A montage that changes subject every beat is a *dense* camera: a landing
  per subject change, `snap` on the SFX hits. Shorts: narration pins the beat durations; the
  camera lands where the narration turns, never on a timer.
- **Where is the payoff seen close?** At least one macro on the thing the film is about, at a zoom
  that reads as close (DOM ≥1.8; real UI per the framing thresholds). Then decide how many other
  close shots the story earns. One, for a UI-stays film, is often right.
- **Every landing has a cause** written in its row (typing starts, a button is pressed, a state
  lands, a reply streams). A landing with no cause is deleted.
- **Voice from the film's temperature:** `anticipate` for considered moves (the frame takes a
  breath); `glide` when the camera should be felt not seen; `snap` for montage and SFX hits;
  `punch` rarely. A repeated task template (type → dots → reply → payoff ×N) changes at least one
  landing per repeat, or the row says why the repetition is the point.
- **Two receipts to keep both poles in view:** wpvibe v5 (5 framings / 44s, 23.7s hold — dead)
  and wpvibe v6 (25 landings / 41s — "dizzy"). Neither cadence came from the storyboard.
- The plan is written on paper first. Camera code is written FROM it, never the reverse; a plan
  derived from code afterwards is the defect this skill exists to prevent. `composition-scan`
  judges the built film against the `Cadence:` and `Max hold:` lines — the numbers here are the
  contract the tool enforces.

## Step 5 — Stills before motion (offer it; required for pure-editorial)

After the storyboard is approved: the build skill clones the skeleton and commits it unmodified
(`git add -f`, INV-16), authors each composition beat's key frame as a static state, and
`node tools/storyboard-sheet.js <slug>` tiles a badged contact sheet for Umair's eye. The look is
approved on stills; motion follows. The storyboard names which beats get a stills pass (every
editorial-composition beat on the ad path; the hero + payoff on tutorials and shorts).

## Step 6 — Approval and handoff

- Explicit "approved" / "yes" / "go" on the storyboard, section by section where he comments.
  "Sounds good" is not approval. Changes are re-confirmed as the final word.
- After approval the storyboard is a literal contract: G1 (preserve the user's verb), G2 (state the
  target back), G3 (surgical edits). The build skill takes over: `wpforms-video` (tutorial),
  `wpforms-marketing` (ad / mixed), `dev-advocacy-video` shorts branch. Hand them the file path
  and the hero beat.
- **A QC round that changes what fills the frame re-opens the camera plan** — the storyboard is
  amended (dated) before the code is. The wpvibe storyboard stopped describing its film at v4;
  the 24s core shipped unplanned.
- Async-approver clause (only when Umair has explicitly ordered the finished deliverable and is
  unreachable): write the artifact, mark it `AUTO-APPROVED-BY-DIRECTIVE (review on return)`,
  surface it FIRST in the handoff. It never covers the angle, script or copy.

## Anti-patterns this skill exists to stop (receipts)

- A shot list with no camera plan — every row a mid-shot, "9 compositions" nobody measured (`wva` 1).
- A cadence taken from a rule or a tool band instead of decided for the film (`wva` 7).
- One ease for everything, or "anticipate" as the only voice (`wva` 8).
- A camera plan written from the code after the fact (`wva` 9).
- An angle inferred from a subject directive and self-approved (`cad` 9, `scs` 9).
- Adjective references ("Apple-like") instead of a cited frame (round-2 B4, acceptance E-1).
- Mock UI when a real capture exists; invented template names; purple as primary.
- A tutorial that ends on Save instead of the payoff on a real frontend surface (`cpa` 16, `cad` 11).
- A storyboard that goes stale after a QC round and is never amended (`wva` 3).
- A reference-driven film cited by PHASE instead of SCENE — an original concept wearing a citation jacket; passed every gate, scored −5/10 (`wcr`).
- Transitions read from a 4 fps strip; the seam ledger says "cut" where the reference dissolves over 3 frames (`cgw` 11).
- Fill and zoom columns written by feel, disagreeing with each other; `snap` written over a shot the reference TRACKS (`cja` 1, 4).
- Numbered section headings or "1.75 seconds" on the `Cadence:` line — the parsers want `## Camera plan` and `1.75s`; an approved plan reported UNDECLARED (`cja` 11).
- A camera plan whose rows exceed its own `Max hold:` — sum the rows; write the landings from the beats table's verbs (press / lands / arrives), not the shot list's subjects (`wvb` 6, 7).

## References

- `docs/storyboard-format-morph-chain-2026-05-10.md` — the section formats (morph chain, rules, seam ledger, shot list, **camera plan + ease voices**)
- `docs/ad-camera-gap-analysis-2026-09-03.md` — why the camera plan exists; both failure poles
- `docs/rulebook.md` — §1 intake, §4 camera, §6 motion, §9 process; receipt keys
- `wpforms-postintro` — Story Proof; `wpforms-primitives` — the library index; `videos/_shared/effects/README.md`
- `docs/vertical-shorts.md` — portrait geometry; `docs/authoring-prompts/` — reusable briefs
