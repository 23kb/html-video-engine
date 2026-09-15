---
name: wpforms-marketing
description: "Use BEFORE starting any pure-editorial, ad-style, marketing, announcement, release, launch, or mixed WPForms video — owns the path-decision gate, brand canonical, clone-and-customize first-write rule (INV-16), atmospheric kit, blocks library, text-kit, and the editorial / mixed film shapes. 3 sessions authored from blank files despite clone-first rule; all needed manual rescue. Triggers: ad-style video, marketing video, release video, announcement video, launch video, editorial video, pure editorial, mixed surface, atmospheric, hero lockup. For tutorial videos showing real product UI, use wpforms-video instead."
---

# WPForms Marketing / Ad-Style Videos

The repo has three authoring paths (see `AGENTS.md` for the full table):

1. **Tutorial** — real WPForms product UI in an iframe (covered by `wpforms-video`).
2. **Pure editorial / ad-style** — single self-contained HTML, no engine. First write = the `docs/examples/single-html-ad-skeleton.html` clone (INV-16), customized toward the house style references. Covered here.
3. **Mixed** — editorial chrome composited over real product UI in ONE single-HTML film (`IframeManager` beneath the editorial layer). Covered here.

This skill covers paths 2 and 3.

## Snapshot transitions (successor to the retired transitions system)

Cross-snapshot movement is now one of two patterns:

1. **`await ifm.swap('<slug>')`** — `IframeManager` crossfades the iframe to another captured snapshot (a compact mirror of the old engine's swap-fast). This is how multi-page tutorials move between admin screens: one tutorial swaps 5×, one short 3×.
2. **One continuous timeline** — editorial and mixed films stay inside one snapshot (or pure DOM) and morph within it; plan those morphs in the storyboard's morph-chain section (`docs/storyboard-format-morph-chain-2026-05-10.md`).

Boundary rules (measured by `tools/seam-gate.js`, enforced at review):

- The exit should *cause* the next entrance — velocity-match across every cut.
- No dead exits, no dead entries; `dead-time.js` flags holds over ~1s.
- Preload the next snapshot before swapping; never `swap()` at an arbitrary seek position (the validator warns).

## Read the rulebook first

`docs/rulebook.md` — IF/THEN rows, every one a defect that shipped and cost a
rebuild. The sections that bite this path hardest:

- **4. Camera & framing** — under-shooting, slide-projector translates, the
  velocity dip at every `figjamFlight` phase boundary
- **6. Motion & dead time** — the largest section, and where an ad-style film
  earns or loses its tier
- **5. Portrait (9:16) geometry** — if this is a short
- **9. Process & handoff** — two rejections means change the CONCEPT

Rows marked `WISH` fire nothing. Those are the ones you have to remember.

## ⛔ HARD RULE — motion-graphics density is the mandate; real UI when it exists

Two things an ad-style video MUST be, revised 2026-07-13 after the FA clean-room ad scored **4/10 — "too basic, worse than HyperFrames"**:

### 1. It must be a MOTION-GRAPHICS piece, not a kinetic-type card.

The failure that earns a low score is a basic piece: one text effect, a couple fades, mock tiles. An ad is judged on motion design. Before calling any ad-style build done, it must visibly use **most of** this vocabulary — not one token from it:

- **Effects library (`videos/_shared/effects/`)** — text reveals (`mountTextStackFromRight`, `mountTextLetterMaskDomino`, `mountTextCenterOutRoll`), card layouts (`mountCardsSpreadFan`, `mountCardsFlyInStack`), constellations (`mountConstellationPhyllotaxisBloom`). If the storyboard names a motion archetype not yet promoted, **promote a matching effect into `videos/_shared/effects/`** rather than hand-rolling or skipping it. Using one effect when the piece has five beats is the 4/10 failure.
- **Text animations** — `text-kit.js` (24 pixel-point presets) or the effects text reveals. Never a plain opacity fade on a headline.
- **Real transitions between scenes** — morphs (Flip / same-node shape tween), camera flights (`cinematicFlight` / `figjamFlight` / `flyToElement`), wipes, mask reveals. Hard cuts and cross-fades alone are a fail. **Each camera move is the L1 cinematic decomposition at premium timing (~0.5–1.3s per move, eased, no jerks)** — Umair reviewed a fast "whip" pass as "too fast, not smooth" (v3→v4, 2026-07-13); that ruling is about the SMOOTHNESS of a move, never about how often the frame changes. Re-scoped 2026-09-03: "land-and-HOLD" was read as "park the stage" and the first WPVibe ad shipped 5 framings in 44s. The frame re-frames every ≤4s (see *Ad camera doctrine* below); each re-frame is still a decomposed, eased move.
- **Atmospheric kit** (`atmospheric.js`) — grain, sweep, parallax, scale-push, dark backdrop, per-beat atmosphere swaps.
- **SFX** — the cue rig must be wired (punchy-clean, ad-energy per `[[feedback_sfx_ad_energy]]`), landing on the motion beats.

If you finish an ad and it used one effect and some fades, it is not done — go back to the vocabulary.

Two R&D teardowns extend it: `docs/hyperframes-seam-grammar-rnd-2026-09-03.md` (seam recipes — paste-ready GSAP for scene cuts; prove video-local first, promote to `videos/_shared/` on second use) and `docs/xai-voice-motion-rnd-2026-09-02.md` (technique catalog T1–T12 for ad beats + the E1–E4 ease table, registered in `videos/_shared/effects/xai-eases.js`). Caveat: the zoom-through seam's `filter: blur` never sits over a live iframe (R6 — grade with veils; camera animates transform only).

### 2. When the feature has real captured UI, SHOW THE REAL UI — never a mockup.

Superseded rule: the old "pure motion, no real product UI in pass 1" ban produced kit-built mock stat tiles standing in for the real analytics dashboard. **Wrong.** Umair (2026-07-13): *"when there is a real UI to show in an ad-style video, there should be real product UI, real iframes or whatever — real UI, not a mockup."*

- If a real snapshot of the feature exists (or can be captured), mount it (`IframeManager` + the snapshot) and move the camera across the REAL product (`flyToElement` / `cinematicFlight`). The editorial motion graphics compose **around and into** the real UI — e.g. an editorial number flies in and hands off (Flip / position morph) into the real stat card on the real dashboard.
- Kit-built mock cards (`mountCardsSpreadFan` defaults, hand-drawn tiles) are only for concepts with **no** real UI (a pre-release feature, an abstract idea). Never as a stand-in when the real capture is sitting in `snapshots/`.
- This makes most feature ads **mixed films** (real iframe + editorial layer above, one single-HTML file). That is now the expected shape, not an exception. Importing `IframeManager` in an ad is correct, not a smell.

**The one guardrail from the old rule that still holds:** do not let the real UI turn the ad into a literal walkthrough. The editorial motion still drives; the real UI is the payoff the motion resolves into. And per `[[feedback_mixed_surface_scalepush_pitfall]]`: never `scalePush` the iframe (it steamrolls camera tweens) — use `flyToElement`/`cinematicFlight` camera moves on the iframe and keep `scalePush` for editorial-only layers.

**HARD RULE — never CSS-`filter` over a real-UI iframe (it blurs the whole frame).** Grades, tints, temperature grades, brightness dips over real product UI = translucent **veil overlays**, NEVER an animated `filter` on `#stage`/the camera element or any node that contains the iframe. Chromium rasterizes the iframe through the filter compositing pipeline and visibly **blurs the real UI** — even at neutral filter values, even when the filter is on an *ancestor* rather than the iframe itself. `will-change: transform, filter` on the camera pins the same raster. This is the sibling trap to `scalePush` above; it directly cost a QC round on one launch film (first build graded via `filter` on `#stage` → blurry dashboard). **The camera element animates `transform` only — no `will-change: filter`, no animated `filter`.** The veil recipe:

- **Temperature / tint** → a `div` above the iframe with a background color + animated `opacity` (warm `rgba(255,214,150,·)` radial, cold `rgba(86,96,114,·)`).
- **Desaturation / B&W** → a gray `div` with `mix-blend-mode: saturation`.
- These composite over the iframe pixels without re-rasterizing them → the UI stays sharp.
- Filters are fine on **editorial-only** layers (text, atmospheric divs) that don't sit above a live iframe.

Veils done right animate `opacity`/`autoAlpha`, never `filter`; the camera element animates `transform` only. See `[[reference_iframe_filter_blur]]`.

### 3. The snapshot is a LIVE DOM — its elements ARE the motion graphics (the USP)

Umair rated this **11/10** (form analytics ad v3/v4, 2026-07-13). A screen-recording competitor cannot do any of it. The technique catalog, proven in production:

- **Assembly:** `gsap.set` real iframe-doc elements hidden after load, then choreograph them in one-by-one (cards fly in as 3D objects with `transformPerspective`, table rows domino, chrome drops in). Parent-page GSAP tweens same-origin iframe nodes directly.
- **Live count-ups on real values:** mutate the value's **first text node** (`[...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim())`), never `textContent` — nested links (e.g. the Set Goal anchor inside the stat value) survive. Counters END at the captured values (production truth).
- **Real hidden UI:** toggle captured-but-hidden popovers/modals (`aria-hidden` + `display`), cascade their real rows, type into real inputs (`typeIntoIframeInput`), click real buttons.
- **Off-plane lifts:** `popOut` clones a real element into 2.5D above the page (the goal-arrow money shot).
- **Before/after:** two real captures of the same screen (e.g. `admin-forms-overview` vs `-analytics`) = an honest "what's new" transformation.
- **Real-to-editorial handoffs:** real rows burst outward INTO an editorial effect (constellation) with matched velocity.

### 4. Async real-UI flows: CHAIN them + mark() the boundaries

Fixed-time `tl.call()` cues for multi-second async UI flows WILL desync (caught twice by smoke's glide-warns). Chain the flows (`introFlow().then(dashboardFlow).then(...)`), push `__sched` marks at each boundary, **measure with a headless run**, and align the master timeline's fixed beats to the measured numbers. The ad skeleton carries the `mark()` helper.

### 5. Every effect mount is PARKED until its beat — and probe it

Assume effects mount their text/content VISIBLE (center-out-roll and letter-mask-domino both do). `gsap.set(fx.el, { autoAlpha: 0 })` every mount at build; reveal with a `tl.set` at its beat. Verify with a scene-isolation probe (sample computed opacity of every scene host at 6–8 timestamps headlessly) — the "jumbled frame" bug shipped because nothing checked cross-scene visibility.

### 6. Sound levels that actually work (measured, fa-retest)

Music bed at **−24dB gain was inaudible** (mix RMS −35dB); **−11dB reads clearly** (mix RMS ≈ −27dB). SFX between −16 and −21dB. Verify with `ffmpeg -af astats` on the muxed file — a silent BGM is a mechanical defect, not a taste call. Palette is SEMANTIC: a real click sound only where a click happens, popover-open on popovers, counter-roll under count-ups — never generic whoosh-everything.

**Workflow:** 🛑 **idea/copy gate** (the one-paragraph angle + the literal hook / captions / outro line to Umair or the review channel for a yes/no BEFORE authoring — a directive naming a subject authorizes the build, never the angle; rulebook §9, receipts `cad` 9 / `road` 2 / `lf` 7) → storyboard (motion beats named by intent + which real snapshots appear + the morph/transition between each) → **look gate per beat (below)** → compose effects + text-kit + real iframe camera into the master timeline → **motion-audit gate (A/S required)** → render with SFX.

### 7. Look gate: EVERY editorial-composition beat, not just the declared hero

Before motion work, each editorial-composition beat needs **either a cited
reference frame OR a `storyboard-sheet.js` stills pass** — the same gate that
was previously required only for the hero beat. Acceptance 2026-08-23 (E-1):
one ad's b1 shipped as a 90%-empty dark bed composed by
vocabulary checklist — validator and smoke were green, and Umair's verdict was
"EXTREMELY poor… don't you have any taste." The hero-only gate is exactly how
it slipped: only b4 was declared hero, so only b4 got eyes. These gates
substitute for the agent's missing eye; a beat without a reference frame or a
stills look is a beat nobody has ever *seen*.

## Concept divergence — run BEFORE the idea/copy gate (added 2026-09-02)

The documented editorial failure is idea, not execution: two films scratched in one QC round, both carrying Tier A + green gates, both rejected on IDEA (`cad` 9 / `scs` 9). Models converge on the safe average concept by default. Push out of it at ideation, where risk costs one message — never at build time. Source: Anshu Chimala, "How to turn your AI into a world-class designer" (Lenny's Newsletter); adopted 2026-09-02.

1. **Seed-string divergence.** Before writing angle options, generate 3–5 random alphanumeric strings and derive one distinct creative direction from each (interpret the string freely — texture, rhythm, metaphor, structure). The strings are throwaway; the point is that each direction starts from a different arbitrary anchor instead of all regressing to the same center.
2. **At least one deliberately ambitious option.** The angle options sent through the idea/copy gate must include one wild/specific direction (genre borrow, unexpected structure, visual conceit) beside the safe one — never three shades of the same safe idea. The downstream gates (skeleton clone, brand canonical, morph-chain storyboard, look gate, motion audit) catch anything unshippable, so ideation can afford the risk.

Umair still picks — this changes what he picks FROM, not who decides. Ideation-only: once the angle is approved it is a literal contract (G1–G3); no creative reinterpretation at build time.

## Ad-path rulings (U3/U4/U6/U7/U8, 2026-09-03)

- **Opening:** ad-style videos OPEN with the **animated Sullie-assembly sting** — never static. Tutorials are excluded: Kacie opens those.
- **Product arrival:** the **mid-film brand pivot** is the standard product-arrival moment (logo pop → divider draw → feature icon join → feature title card; brand orange reserved as the pivot signal — see `wpforms-postintro` "Species 2" for the grammar).
- **Ad-format menu additions:**
  - **Race 2-up** — two synced panels running the same task, ours finishes first, persistent labels on both panels. The lag IS the argument.
  - **Cinematic 2-shot cold open** — 2s wide absurd-premise scene → hard cut → 2s close-up with the product UI ALIVE in-shot; VO hook question; zero titles. Production (U7): reuse licensed/owned footage or the reference asset with OUR UI screen-replaced via a timeline-driven `<video>` layer + perspective overlay. **RIGHTS CHECK required before shipping any third-party footage** — the reference asset is another brand's footage.
- **Ad MIX doctrine (U4 — ad path adopts the measured profile):** music-forward; bed at program level; **NO sidechain ducking** — drop the arrangement under VO instead; shaped loudness arcs; endings = 0.6–1.7s fade to true silence or hard-out. Numbers: `tools/sfx/CONTEXT.md` "Measured sound bar". Tutorial/postIntro bed defaults stay 0.17/0.12 (U5).
- **Storyboard-strip format** (persistent top strip of board thumbnails stepping per scene cut, film below): approved at 1920×1080 but **PARKED (U6) — build LAST; do not scope it into builds.**

## Ad camera doctrine (2026-09-03 — `docs/ad-camera-gap-analysis-2026-09-03.md`)

The first WPVibe ad went through five QC rounds — real Codex UI, real fragments, locale fixes, HD render — and still read as dull. Every change was about WHAT was on screen; nothing touched HOW it was framed: 5 framings in 44s, a 23.7s hold, camera scale 1.00–1.04. The references (Shipper, Codex) re-frame every 1–2s and swing from a full window to a button filling 40% of the frame. Four rules, all mandatory for the ad path:

1. **The host stays, the frame moves.** "The camera follows the morph host" means re-frame the SAME host — punch to the control in use, macro on the payoff, whip to the reply, pull back to establish — not park on it. At least one landing every 4s; zoom range wide (1.0) to close (≥1.8 on a payoff); every move caused by an event.
2. **Camera plan before motion work.** The storyboard carries `## Camera plan` (`docs/storyboard-format-morph-chain-2026-05-10.md`): one row per landing, numeric fill, verb + duration in, hold length, what carries the hold. A row without a number, or a hold over 4s, is not approved. Any QC change to what fills the frame re-opens it.
3. **Use the stage camera.** Editorial DOM has no iframe for `flyToElement` to drive — `makeStageCamera` (ad skeleton; proven video-local on the first WPVibe ad, promote on second use) wraps the editorial layer in a transform-only `#lens` with `punch / macro / whip / pullBack / drift / cut`, decomposed by construction and pose-logged for `composition-scan`. Do not invent a zoom wrapper.
4. **Compression pass before any carrier is added.** Thinking dots ≤0.5s, post-payoff dwell ≤0.8s before the next trigger, and a repeated task template (type → dots → stream → payoff ×N) changes at least one landing per repeat. Carriers fill holds; the first question is whether the hold should exist.

Gate: `node tools/composition-scan.js <slug>` (static — reads the literal `at:` times; run before any browser) and `--play` (measured) both PASS on the ad band before the motion audit; the audit caps a parked stage at B.

## Editorial named-effects library (pass-1 vocabulary)

For pass-1 motion, **pick from `videos/_shared/effects/`** before writing custom GSAP. The vocabulary covers the most common editorial archetypes:

- **Text reveals:** `mountTextStackFromRight`, `mountTextLetterMaskDomino`, `mountTextCenterOutRoll`
- **Card layouts:** `mountCardsSpreadFan`, `mountCardsFlyInStack`
- **Constellations:** `mountConstellationPhyllotaxisBloom`
- **Glass surfaces:** `mountGlassCard` (+ `glassSpringEase`) — frosted-glass/holographic style (approved 2026-09-02). Needs a rich world MOVING behind it; sheen sweeps slow liquid (1.5s `sine.inOut`, never sub-1s); never over a real-UI iframe region that must stay readable.
Each returns `{ el, tweenInto(tl, opts), dispose() }`. See `videos/_shared/effects/README.md` for the full vocabulary table + parameters. QC harness at `videos/_qc-effects/index.html`.

If the storyboard names a motion archetype not yet in the library, promote it to `videos/_shared/effects/` per the README's "Adding a new effect" instructions, then use it.

## REQUIRED references — clone, do not invent

Before writing any editorial or mixed single-HTML film, **load these**:

**Product truth for claims/values:** check `docs/product-truth/<feature>.md` (FIX-5 fa-retest) before putting any feature claim, metric name, or number on screen; when the note is missing and the source doc is reachable, write it during intake — UI-derived semantics get an `UNVERIFIED` marker.

### Canonical clone-and-customize templates

For pure-editorial videos, START FROM THE SKELETON — do not author from scratch (see INV-16):

**⚠ Playback/instrumentation contract (FIX-2, fa-retest 2026-07-13):** first write = copy `docs/examples/single-html-ad-skeleton.html` — it bakes in AUTOPLAY + `__T0/__sched/__done/__dur`, onComplete end bookkeeping, `?scene=` review wiring, and the SFX-rig/BGM-disabled conventions. **The older style references predate that contract** (click-to-start, no instrumentation — smoke/render can't drive a raw clone of one). Take VOCABULARY from them — atmosphere beds, ease voices, SFX cue placement, masked-reveal idiom — but never their playback block.

The clone-and-customize rule (INV-16): copy the skeleton (`docs/examples/single-html-ad-skeleton.html`), commit the unmodified clone FIRST, then bring in content + brand + the motion vocabulary from the house style references. Three failed editorial attempts all skipped this and tried to invent from scratch.

### Brand canonical

Do NOT invent brand details. Use the canonical brand tokens and assets:

- `--wpf-orange #E27730` (primary), `--wpf-ai-purple` (AI-feature accent ONLY, never primary), `--wpf-blue`, OS font stack
- Real Sullie + loading visuals + AI 3-dot spinner SVGs

**Anti-pattern caught in audit:** purple `#7a30e2` declared as primary brand. WRONG. Purple is AI-feature-only. Primary is orange.

### Templates API (for "show 200+ templates" beats)

`https://wpforms.com/templates/api/get/` returns real WPForms templates. Fetch it directly — the Phase 5e cache helper and its `templates.js` companion are both gone from the repo (verified 2026-08-20 by `tools/lint-doc-refs.js`). Do NOT invent template names + thumbnails.

### Audit gates — MUST run before handoff

- `wpforms-motion-audit` skill — score every postIntro/cinematic/editorial beat S-F tier. Tier A or higher is merge bar.
- Designer-grade pass (Emil Kowalski / Jakub Krehel / Jhey Tompkins): file-read `.agents/skills/design-motion-principles/SKILL.md` + its `references/` — it is NOT Skill-tool invocable (installed outside `.Codex/skills/`), and nothing fires it automatically (FIX-8).

**Async-approver clause:** if the user has explicitly ordered the finished deliverable and is unavailable to approve mid-run, the storyboard/brief gates convert to: write the artifact to disk, mark it `AUTO-APPROVED-BY-DIRECTIVE (review on return)`, proceed, and surface it FIRST in the handoff. Do not improvise a different self-override.

**What the clause does NOT cover (ruled 2026-08-28, receipts `cad` 9 / `scs` 9 — two films scratched in one QC round, both self-approved this way, both rejected on IDEA not execution):**

- A directive that names a **subject** ("1 ad style — just anything, not QR") authorizes the BUILD. It never authorizes the **angle**, the **script**, or the **caption copy**. Converting a subject assignment into an angle waiver is the single most expensive mistake in this skill's history.
- When the approver IS reachable, there is no clause to invoke. Send two things and wait: the angle in one paragraph, and the literal copy (hook line, every caption, outro line) as plain text. That review costs one message and has caught what 31s of finished film could not.
- **Green gates are not an approval substitute.** Both scratched films carried motion-audit Tier A, dead-time in band, narration-qc PASS, validator 0 err. The battery measures execution; nothing in it measures whether the idea was worth executing. Never present chips as evidence a film is good — only that it is not broken.
- Ad-specific, from the same round: if the film's thesis is a **state change in the product**, a real surface must SHOW that change (`cad` 11 — a whole "$48 → $38.40" premise ran on editorial numerals with zero `frontend-*` surfaces, and read as a con). And a beat whose job is "here is the surface" opens on an **establishing pose** (whole-panel, fill ≤0.8) before any detail crop — a mounted snapshot is not a shown screen (`cad` 10).

### Editorial storyboard format

Editorial storyboards MUST include a **morph-chain section** per `docs/storyboard-format-morph-chain-2026-05-10.md` (which also carries the "Rules for the whole run" invariants list, the hero-beat call, and the **seam ledger** — one row per cut: exit vector, entry vector, carrier, technique; ≤2 transition families per film). Without it, editorial videos default to state-table compositions and fail.

All new single-HTML films (editorial included) also carry the **`## Shot list` section** from the same doc (ruled 2026-08-22): one row per beat — hero frame / surround / named vocabulary / DOM transformation / carriers — plus the film-level composition count. `validate-singlehtml` WARNs on beat↔row parity gaps; `tools/composition-scan.js` measures the count after the build. **Ad-style films additionally carry `## Camera plan`** (ruled 2026-09-03): one row per landing with a numeric fill and a hold ≤4s — the shot list says what is on screen, the camera plan says how it is seen, and the shot list alone produced a parked stage.

**Current + reserved vectors (round-2 B1, 2026-08-08):** the storyboard names the film's dominant direction (its *current* — e.g. "Current: LEFT") and reserves off-current vectors for specific meanings ("Z-pull only for the big reveal, upward only for the thesis beat"). A reserved vector is spent once; spending it twice dilutes the meaning it bought.

**Reference as design law (round-2 B4):** at intake, get a REAL visual reference — a snapshot region, a competitor/launch-film still, a Figma community file, a named template frame — instead of an adjective. "Make it Apple-like" gets you a guess; a handed frame is a contract. **EVERY editorial-composition beat’s visual reference is REQUIRED for pure-editorial films** (acceptance E-1, 2026-08-23: a hero-only gate let b1 ship as a 90%-empty dark bed). Each composition beat gets a cited reference frame OR a storyboard-sheet stills pass before any motion work — no exceptions. If no reference exists, the design-pass stills below become mandatory before any timeline work.

**Stills-first option:** the look can be approved on stills before motion work — author each beat's key frame as a static state in the cloned skeleton, then `node tools/storyboard-sheet.js <slug>` tiles a badged contact sheet (timeline labels or `--beats`) for Umair to approve. The sheet is an artifact for his eye, never something a session interprets. For pure-editorial, prefer locking the look BEFORE timeline work (static states first, motion second) — five static rejections cost less than one motion rebuild.

### Motion primitives library (`videos/_shared/motion-primitives.js`)

Required reading alongside the templates and brand. The library is the executable form of the camera / cursor / typing / field-reveal / brand-anchor / exit vocabulary that editorial winners share:

- Camera: `cinematicFlight`, `figjamFlight`, `focusStationOverview`
- Cursor: `Cursor` class (glide / click / hover / drag with anti-frenzy guards)
- Text: `caretType`, `statusPillMorph`, `markerSweep`
- Field: `fieldStaggerReveal`
- Brand: `mountSullieBug`
- Exit: `cleanFastRejoin`
- Highlight: `popOut`

QC: `videos/_qc-primitives/index.html`. Lookup: load `wpforms-primitives` skill. **The 3 failed editorial attempts each re-implemented one or more of these from scratch and re-introduced the bug they exist to fix.**

### WPForms interactions library (`videos/_shared/wpforms-interactions.js`)

For mixed films that drive real WPForms admin / builder UI under the editorial overlay: use the Wave 1 interaction methods (`navAddNewForm`, `selectTemplate`, `navWPFormsSidebarMenu`, `openFormInList`, `dragFieldToForm`, `openFieldOptions`, `navBuilderSidebar`, `openSettingsTab`) plus the `IframeManager` helper. Don't hand-roll click + glide + snapshot-swap sequences in mixed editorial scenes — the library is grounded in real selectors and handles the crossfade with no flash-guard cover needed.

## Composition Patterns

Ad-style videos compose multiple editorial layers into a deliberate timeline. The capability kits exist to make this fast.

### Blocks Library

`videos/_shared/blocks/` provides parent-document editorial blocks (mounted above the iframe, or stand-alone in a pure-editorial film). Each returns `{ el, dispose, tweenInto?(tl, opts) }`:

- **`mountCodeCard`** — terminal-style code card with syntax highlight, traffic lights.
- **`mountMacWindow`** — macOS browser/app frame with traffic-light controls.
- **`mountPhoneFrame`** — mobile device frame for phone-screenshot beats.
- **`mountPill`** — labeled rounded badge for tags / states / metrics.
- **`mountArrow`** — animated arrow connector between two points (DrawSVG-backed).
- **`mountRouteLine`** — curved path between elements (MotionPath-backed).
- **`mountTerminal`** — terminal output styling.

```js
// videos/<slug>/index.html — inside the module script
import { mountCodeCard } from '/videos/_shared/blocks/code-card.js';
// gsap global arrives via <script src="/vendor/gsap/3.15.0/gsap.min.js"></script> above this module
const card = mountCodeCard({
  parent: stage,                                   // defaults to document.body
  title: 'curl wpforms.test/wp-json/wpforms/v1/forms',
  code: '...', language: 'bash',
  x: 120, y: 120, width: 640,
});

const tl = gsap.timeline({ paused: true });        // the film's master, or a child nested into it
card.tweenInto(tl, { position: 0, duration: 0.6 });
// ... compose with other tweenInto calls; the master is exposed as window.__tl
// and driven by play() — see wpforms-gsap-rules (master timeline + instrumentation) ...
```

**Blocks never read iframe DOM.** They live in the parent document above the iframe (or stand alone). See `docs/blocks.md`.

### Atmospheric Kit

`videos/_shared/atmospheric.js` provides additive ambient layers — grain, sweep, parallax pair, scale push, dark backdrop. Each has `tweenInto(tl, opts)`:

- **`grain`** — Mulberry32-seeded film grain canvas (~2-3% opacity, draw-once).
- **`gradientSweep`** — diagonal CSS gradient panned across.
- **`parallaxPair`** — two stacked image layers, opposite scale/translate.
- **`scalePush`** — wrapper element scale 1 → 1.02 over 3-4s. "No frozen pixels."
- **`darkBackdrop`** — dimming layer.

```js
import { atmospheric } from '/videos/_shared/atmospheric.js';

const tl = gsap.timeline({ paused: true });
atmospheric.grain.mount(stage);
atmospheric.gradientSweep.mount(stage);
atmospheric.scalePush.tweenInto(tl, { duration: 4, position: 0 });
```

**Use sparingly on routine cursor+click tutorial beats** — atmospheric layers distract from the lesson. Best fit: postIntros, title cards, ad-mode compositions, transformation interstitials.

### Text Kit

`videos/_shared/text-kit.js` provides 24 Pixel-Point-style text reveal presets via `mountTextReveal(text, { preset, ...opts })`. Presets include: mask-reveal-up, top-down-letters, focus-blur-resolve, spring-scale-in, soft-blur-in, per-character-rise, micro-scale-fade, and 17 more.

```js
import { mountTextReveal } from '/videos/_shared/text-kit.js';

const reveal = mountTextReveal('WPForms 2.0', {
  preset: 'spring-scale-in',
  fontSize: '120px',
  fontWeight: 900,
});
stage.appendChild(reveal.el);

const tl = gsap.timeline({ paused: true });
reveal.tweenInto(tl, { position: 0.4, duration: 0.8 });
```

Uses vendored `SplitText` when loaded. Deterministic DOM fallback when not.

## Composition Pattern: Build → Breathe → Resolve

A common phase structure for ad-style beats (≥3s). Document it in beat comments, don't enforce.

- **Build** (0-30% of beat) — entrance animations, layers fade/cascade in
- **Breathe** (30-70%) — hold the visual; let it land. **Two modes by pacing** (D1 ruling 2026-08-07, ratified by Umair 2026-08-08; see `docs/video-system-improvements-2026-08-06.md` §6):
  - **Explainer-paced beats** (viewer must read the thing; narration-timed): ambient motion is fine (parallax, scale push, grain pulse).
  - **Ad-energy spots** (≤60s, no narration dependence): **no pure idle** — no floating, breathing, or waiting between beats. Hold via *consequence* instead: a settle with a cast shadow, a fill still sweeping, the cursor already approaching the next trigger. If nothing in the beat is causing anything, shorten the beat.
  - **Micro-tutorial shorts** (Umair ruling 2026-08-08): a hybrid — "an ad-style spot that teaches." Narration pins beat *durations*, but the pixels follow the ad-energy rule: no pure idle within a hold; hold via consequence. The one exception is a **reading hold** (viewer must read a panel to follow along), capped ~1.5-2s. Shorts-side detail in `dev-advocacy-video`.
- **Resolve** (70-100%) — payoff cue (label flip, color shift) → exit (blur out, velocity-matched translate). The exit should *cause* the next beat's entrance — see *Snapshot transitions* above.

**How to hold without idling (the D1 recipe, round-2 B2 — for ad-energy spots):** "no pure idle" is achieved by overlap, not by adding motion:

1. **Overlap ignition** — an element is still finishing its grow (e.g. scale 1 → 1.05 over ~0.9s) when it starts to leave; the next entrance ignites before the previous exit resolves.
2. **Anticipation crouch** — before a launch: `scaleY` to ~0.93, stretch to ~1.05, then fire. Pin the bottom edge by compensating y against the scale explicitly — `y += h/2 · (1 − scaleY)` — `transformOrigin` alone visibly moves the bottom edge.
3. **Data bleeds into the exit** — counters still counting, bars still growing when the crouch starts. Nothing completes and *then* transitions.
4. Exit and entry ride the **same axis, same direction, mirrored eases** (`power4.in` out, `power4.out` in) — never in the same place at once.

The test: nothing in the scene ever reaches zero speed. That's the difference between a beat that reads shipped and one that reads cheap.

## Ease Vocabulary

| Motion type | Recommended ease |
|---|---|
| Entrances | `back.out(1.4)`, `expo.out`, `power3.out` |
| Ambient / breathing | `sine.inOut` — explainer-paced beats only; banned in ad-energy spots (D1, see Breathe above) |
| Pulses | `yoyo: true, repeat: 1, ease: sine.inOut` |
| Exits | `power2.in` + `filter: blur(20-30px)` + optional velocity-matched translate |
| Mechanical / stop motion | `power4.out` or stepped easing via `CustomEase` |

## Measured craft rules (round-2 B6, 2026-08-08)

- **Accent contrast is measured per ground, per beat.** The payoff word in `--wpf-orange` must be contrast-checked against the actual ground of the beat where it lands — a brand accent can measure ~2:1 on the wrong plate and stop reading as an accent at all. Adapt **value, never hue** (the "two greens" pattern: same hue, one step deeper on light grounds). Flag the measured ratio in the beat comment when you adapt.
- **Copy changes are choreography changes.** Any typed/displayed copy on a measured beat (wrap-driven box growths, width-fitted headlines, scramble pools) re-checks line width and wrap points BEFORE the new wording is trusted — a line one word from wrapping breaks the measured structure silently. This is the visual half of the "DUR tables are voice-coupled" rule.
- **Exits leave the frame; the frame edge does the hiding.** Cursors and text that exit go fully off-frame mid-motion — no opacity fades mid-frame on exiting elements. A mid-frame fade kills the velocity the seam needs (boundary contract) and reads as the element giving up.
- **Every ad-style PRODUCT beat names the DOM mutation it performs** (mp 0, fix-round B6): a beat whose answer is "the camera moves" is not a product beat — realness is the state change, earned on camera, never pre-baked into the capture (the wallpaper root failure cost two QC rounds).

## Output Checklist

Before declaring an ad-style video done:

- [ ] Idea/copy gate passed: the angle paragraph + literal copy went out for a yes/no BEFORE authoring (never self-approved on a subject directive)
- [ ] Uses blocks from `videos/_shared/blocks/` rather than re-implementing chrome
- [ ] Text reveals use `text-kit.js` presets, not hand-rolled
- [ ] Atmospheric layers (grain, sweep, scale push) used where motion density helps; not over-layered on every beat
- [ ] Build-breathe-resolve phase structure for beats ≥3s
- [ ] `## Camera plan` in the storyboard; `composition-scan <slug>` static PASS before motion work, `--play` PASS before handoff (ad band: ≥1 landing / 3s, holds ≤4s, zoom range ≥0.8)
- [ ] Compression pass done: dots ≤0.5s, post-payoff dwell ≤0.8s, repeated task templates re-framed per repeat
- [ ] Final beat has a real exit (blur out, velocity-matched translate, fade-to-black) — not a hard cut
- [ ] Every timeline rides the ONE master (`window.__tl`, paused, driven through `play()`); nested children un-paused after `add()` (see `wpforms-gsap-rules`)
- [ ] If using Three.js, render loops use `pausableRaf` (see `wpforms-gsap-rules`)
- [ ] Validators + smoke + render-tool MP4 export all pass

## References (loaded on demand)

- `docs/blocks.md` — Read for the full blocks library API and tweenInto contract.
- `docs/text-kit.md` — Read for the 24-preset text-reveal API.

- `docs/postintro-patterns.md` — Read when the marketing video is a hybrid (postIntro + walkthrough) — postIntro rules apply.

- `docs/render.md` -- Read when running MP4 renders (tools/render-singlehtml-audio.js).

- `docs/storyboard-format-morph-chain-2026-05-10.md` — Morph-chain storyboard section authoring contract.

## Granular craft references

- `docs/atmospheric-composition.md` — Read when picking grain / sweep / parallax / scale-push and layering them.
- `docs/color-palette.md` — Read for the canvas-void / cyan / violet / amber accent palette used in editorial videos.
- `docs/title-card-voice.md` — Historical (manifest-era intro/outro cards, superseded); its hero-title shape and CTA-tone rules still read for ad-style end cards.
- `docs/beat-pacing.md` — Read for Build → Breathe → Resolve phase structure in 3-12s editorial beats.
- `docs/camera-lensing.md` — Read when the editorial composition uses iframe geometry (mixed films).

## See Also

- `wpforms-primitives` — `motion-primitives.js` + `wpforms-interactions.js` lookup. Editorial compositions pull cursor / camera / typing / field-reveal / brand-anchor / exit straight from here.
- `wpforms-video` — for tutorial-mode work (the other half of the dual mandate).
- `wpforms-postintro` — postIntros often share patterns with ad-style work.
- `wpforms-gsap-rules` — the master-timeline contract + `pausableRaf` are how editorial beats become scrubbable.
