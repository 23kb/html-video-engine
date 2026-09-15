# Storyboard Format — Morph Chain Section

Adds a **morph chain** declaration to the editorial storyboard format. Drives Phase 4 of `editorial-direction-audit-2026-05-10.md` (deleted 2026-08-22 — git history).

## Why this exists

Per `winning-pattern-analysis-2026-05-10.md` (deleted 2026-08-22 — git history), the single biggest authoring-shape variable separating winning from failed editorial videos is **identity continuity across time**:

> Winners have a single morphing element that carries viewer attention across beats — one winner's `#cta` morphs Button → Input → Sullie pill → Chat panel over 12s. Failures stage a fresh composition per beat. Tables and per-beat storyboards cannot encode this — they encode states, not connecting tissue.

Per-beat storyboard tables describe **states**. Editorial videos that read as cinematic require **morph chains** — a host DOM element transforms its content/role across beats while its identity (the `id` and visual continuity) persists. The viewer's eye stays anchored.

Without this declared up-front, Claude (and any author) defaults to staging fresh compositions per beat, which produces state-table editorial — exactly the failure mode of two early AI editorial films and the Anthropic-mimicry pattern.

## What a morph chain is

A **morph chain** is one DOM element that takes on multiple visual identities across beats while preserving its `id` and (usually) position/scale envelope. Example, verbatim from the code comment that flags the pattern in a winning film:

> `Button → Input row → Sullie pill → Chat panel`

That's four visual states for `#cta` across approximately 12 seconds (beats spanning ~0.0–12.0s). The element's `id` stays `#cta`. Its CSS classes, child content, and dimensions morph. Viewer's eye is anchored throughout.

The morph chain element is the **protagonist**. Other beat-local content (typography, atmosphere, transitions in/out) supports it but doesn't compete with it.

## When required vs. optional

| Video type | Morph chain |
|---|---|
| Pure editorial / ad-style | **Required** — without one, the video reads as state-table |
| Mixed (`surface: 'mixed'`) | **Recommended** — apply to the editorial chrome that wraps real product UI |
| Tutorial (engine + chapters) | **Optional** — narration carries identity continuity in tutorials; morph chains apply to postIntro/cinematic beats only |

For tutorials, the equivalent of identity continuity is the **narration spine + cursor**. The tutorial engine handles this implicitly via the chapter-runner's beat sequencing. Tutorial chapters do NOT need explicit morph-chain declarations.

## Storyboard format addition

Editorial storyboards must include this section, near the top, **before** any beat-by-beat table:

```markdown
## Morph chain

**Host element:** `#<id>`

**Identity arc** (states from beat 1 to last beat):

| Beat | Visual state | Mechanism |
|---|---|---|
| 1 | <state name> | <how it appears — initial mount, fade-in, etc.> |
| 2 | <state name> | <transition mechanism — Flip morph, transform tween, content swap> |
| 3 | <state name> | <...> |

**Continuity contract:**
- The `id` does NOT change across the chain.
- The element stays mounted; transforms accumulate, content swaps inside.
- Atmospheric and typographic beat content supports the morph host, never competes for focus.
- Camera moves anchor on the morph host's bounding box, not on arbitrary stage coordinates.
```

If a video has more than one morph host (rare; consider whether you actually need two), declare each as a separate "Morph chain" subsection and explain how they relate temporally (sequential, overlapping, parent-child).

### Rules for the whole run (invariants)

Alongside the morph chain, editorial storyboards should carry a short **"Rules for the whole run"** list — invariants that hold across every beat, stated up front (adopted 2026-08, `docs/video-system-improvements-2026-08-06.md` A2). Examples of the shape:

- the paragraph never re-lays-out; content swaps happen in place
- from beat 3 onward the camera only zooms in
- brand orange is reserved for the CTA; nothing else uses it
- the host element never leaves frame

Each line is a **G1-level literal contract**: implement it exactly, and if one turns out to be genuinely hard, say so and ask — do not silently relax it. Also name the **hero beat** (the one scene that carries the film): it gets built first, at the highest fidelity, and absorbs the revision budget.

### Seam ledger (required for editorial storyboards, adopted 2026-08-08 — round-2 B1)

Below the beat table, the storyboard carries a **ledger**: one row per cut, filled in before build. This is the boundary contract (`wpforms-marketing`, *Snapshot transitions* — successor to the retired `wpforms-transitions` skill) in checklist form — a cut whose row can't be filled honestly is a slide change, and the *beat* gets fixed before any transition style is picked.

```markdown
## Seam ledger

| # | Cut (~t) | Exit (vector) | Entry (vector) | Carrier | Technique |
|---|---|---|---|---|---|
| 1 | ~16s | Z-pull (shrink) | Z-pull (into grid slot) | chat window card | inverse zoom-through |
| 2 | ~23s | left | left | headline word | cut-the-curve |

Transition vocabulary: zoom-through (Z), cut-the-curve (left/up). 2 families ✓.
```

- **Carrier** = the element that physically crosses or causes the cut. Every row needs one.
- **Family budget:** ≤2 transition families per film; a third needs a stated reason. Variety comes from vectors and carriers, not techniques.
- **Current + reserved vectors:** name the film's dominant direction (its *current*, e.g. LEFT), and reserve off-current vectors for specific meanings ("Z-pull only for the big reveal, upward only for the thesis beat"). One direction per chain — a chain of beats advancing in one direction keeps that sign for every hand-off in it.
- Aim the carrier's **peak velocity at the seam frame** — cutting on the fastest frame of a move is free momentum. `tools/seam-gate.js` measures what actually landed.

### Shot list (required for all new single-HTML films, ruled 2026-08-22 — C-SPEC C1)

Payoffs are *authored* (compose, place instruments, choose the frame) while teaching beats were *delegated to the camera* — fly, ring, caption. The shot list is the missing authoring step: one row per beat, written at storyboard time, reviewed inside the existing storyboard-approval gate. No new ceremony — one more section in an artifact that is already approved.

```markdown
## Shot list

Compositions: 8 planned (see map). Longest hold: b3 ≈ 5s.

| beat | subject & hero frame | surround (9:16) | vocabulary | transformation (DOM) | carriers |
|---|---|---|---|---|---|
| b1 | Protection toggle GROUP fills width, row dead-center | brand ground, title pill | punchIn, settle | — (orientation beat) | camera land, ring pop, band jitter @2s |
| b2 | seconds field at 2.0 zoom, label left | ground + GATE chip docked | gc, typeIntoIframeInput | input value 2→5 retyped | type keystrokes, stamp |

Composition map: b1+b2 share the settings-panel composition; b3 is new; …
```

Slot semantics:

- **subject & hero frame** — one concrete line: what fills the frame, at what scale, what is cropped away. (Layout-before-animation, in one cell.)
- **surround** — portrait only: what occupies the 0–300 / 1500–1920 zones (brand ground default; instrument dock opt-in — `mountSurround` in `shorts-kit.js`). Landscape films write "—".
- **vocabulary** — named primitives/effects/instruments only (`wpforms-primitives`, `videos/_shared/instruments.js`, `effects/README.md`). "Custom" is allowed but is a flag, not a default.
- **transformation** — the DOM mutation this beat performs, named. `"—"` is legal only for declared orientation/payoff-dwell beats; **"the camera moves" is not a transformation** (mp 0).
- **carriers** — the area-visible events that carry any hold ≥2s (the carrier law).
- **Composition count + map** — film-level: how many distinct compositions, which beats share one. `tools/composition-scan.js` measures this number after the build (shorts band 6–8/≤6s; long-form 12–18/≤10s provisional).

**Enforcement:** `tools/validate-singlehtml.js` parses the film's `beat()`/`vo()` keys and WARNs on any key with no shot-list row and on any row with an empty transformation cell. WARN this season; flips to ERROR after two films ship with shot lists (ruled 2026-08-22). Films storyboarded before 2026-08-22 are grandfathered (one notice line, no per-beat noise).

A film with a postIntro also carries the approved Story Proof phase table under a `## PostIntro story` heading (`wpforms-postintro`) — the same phase-table shape scoped to postIntro phases; the shot list's postIntro row just points at it.

### Camera plan (required for ad-style and shorts films — adopted 2026-09-03, recalibrated 2026-09-04)

The shot list says what is on screen. The camera plan says how it is SEEN — and it is the section whose absence produced a parked stage: the first WPVibe ad's shot list had a "subject & hero frame" column that read "window center, 880px wide" on every row, so every row was the same mid-shot, the storyboard self-reported "9 compositions" that nobody measured, and when the v4 QC round replaced the chips with a persistent two-panel window nothing re-opened the storyboard — from v4 on, the 24s core had no plan at all. Written BEFORE motion work — paper → stills sheet → approval → code, never derived from code after the fact (the v6 plan was, and it came back "dizzy") — and re-opened whenever a QC round changes what fills the frame.

**The storyboarding pass is full creative.** The skill writing the storyboard DECIDES, per film and with reasons, the cadence, the ease voice, the shot vocabulary and the movement budget. There are no default numbers to fall back on: a film whose UI stays the same (wpvibe: one chat window, one form) is storyboarded with few, considered moves on story turns; a montage that switches subjects is storyboarded dense. The reviewer approves the numbers with the storyboard, and the tools measure the film against THOSE numbers.

```markdown
## Camera plan

Cadence: ~1 landing / 6s — the UI stays the same throughout (one window, one form); the camera moves only when the story turns, never on a timer.
Max hold: 9s (the end card: 6s)
Ease voice: anticipate (glide on the two pull-backs)
Landings: 7 (+ opening frame). Zoom range 1.0–1.8.

| t | subject (what fills the frame) | fill / zoom | move in | hold | what carries the hold |
|---|---|---|---|---|---|
| 0.0 | the two claim lines, wide | 1.0 | opening frame | 3.6s | claim type-on, underline draw |
| 3.6 | the window as it rises, whole | fill 0.8 → ~1.3 | anticipate 0.8s | 4.8s | typing, send pulse |
| 8.4 | the permission card | fill 0.6 → 1.6 | anticipate 0.7s | 3.1s | cursor glide, click, tick |
```

Header lines (all required — `composition-scan` reads `Cadence:` and `Max hold:` and measures the film against them; a plan without them reports UNDECLARED):

- **Cadence** — seconds per landing, with the WHY in the same line (video type: what stays, what switches). This is the storyboard's creative call; the tool checks the film honoured it (landings may run 0.6–1.5× the declared spacing).
- **Max hold** — the longest a single framing may stand in this film (the end card may be stated separately; the first number is the one read).
- **Ease voice** — the film default from the four voices below, plus any per-move overrides. Anticipate is one voice, not the only one.
- **Landings / Zoom range** — the movement budget, so a build that adds moves is visibly off-plan.

Slot semantics:

- **subject** — what fills the frame, in words a stranger could point at. Never "the window" a second time without naming which part of it.
- **fill / zoom** — a NUMBER: the subject's share of the frame's shorter side, or a fixed zoom. A row without a number is not approved.
- **move in** — the voice and its duration (`anticipate 0.8s`, `glide 1.0s`, `snap 0.5s`, `punch 0.6s`), or `cut` for a composition change the camera does not make (a veil, a card). `drift` is not a landing; it is what carries a long hold.
- **hold** — until the next landing. Over the declared max hold = the row is rejected.
- **what carries the hold** — the subject motion that keeps the frame alive (typing, dots, stream, ring, sheen): the D1 rule in one cell.

**Ease voices** (registered in the stage camera; the AE-style vocabulary Umair asked for on 2026-09-04):

| voice | shape | use when |
|---|---|---|
| `anticipate` | pull slightly AWAY from the target (6% of the travel, 1% zoom dip), then drive on a fast-start / soft-landing curve | the default for considered moves on story turns — the frame "takes a breath" before it goes |
| `glide` | one calm arc, translate and zoom on different `inOut` curves | films whose UI stays put; the camera should be felt, not seen |
| `snap` | launch (30% of the travel) then snap-stop | montage cuts, lateral re-frames, anything that lands on an SFX hit |
| `punch` | crouch TOWARD the target, overshoot landing | the most energetic voice — sparingly; at a dense cadence it read as "dizzy" |

Approval blocks on: a missing Cadence / Max hold / Ease voice line; a missing fill number; a row whose hold exceeds the declared max; a plan that contradicts its own cadence; two consecutive rows with the same subject at the same zoom; a repeated task template (type → dots → stream → payoff ×N) whose rows repeat the previous task's framing verbatim without a reason. `tools/composition-scan.js` static mode reads the film's literal `at:` times (planned — run it before any browser); `--play` reads the pose log (measured); both judge against the declared cadence and write the `compositionScan` chip.

**The literal verbs exist.** Editorial DOM gets `makeStageCamera` (shipped in `docs/examples/single-html-ad-skeleton.html`; first used video-local on the first WPVibe ad; promote to `videos/_shared/` on second use). A pose is `{zoom, tx, ty}` on a transform-only `#lens` wrapper; framing presets (`move / punch / macro / whip / pullBack`) say WHAT the frame becomes, the voice (`voice:` per move, film default from the plan) says HOW it gets there; every voice is decomposed, so anti-pattern #2 is satisfied by construction. Mixed films keep `flyToElement` / `cinematicFlight` for the iframe layer and the stage camera for the editorial layer above it. Shorts declare the same header in their storyboard (`dev-advocacy-video`, `docs/vertical-shorts.md`) and drive `shorts-kit`'s `punchIn / whipPan` at that cadence.

## Mechanics — how to author for it

### 1. ID stability

Pick the `id` early. Keep it. Never re-mount the element with a new id mid-video.

```html
<div id="cta">…</div>
```

### 2. Content morphs, not element swaps

Inside `#cta`, the inner HTML can change radically (button label → input field → pill content → chat panel rows). The container element stays.

GSAP Flip is the canonical mechanism for repositioning + reshape morphs:

```js
const flipState = Flip.getState('#cta, #cta *', { props: 'opacity, color, backgroundColor' });
// ... mutate DOM inside #cta ...
Flip.from(flipState, { duration: 0.8, ease: 'power2.inOut' });
```

For content-only changes without dimensional morph, plain `innerHTML` + opacity tween works.

### 3. Scale envelope as continuity cue

The element's bounding box changes, but the **camera anchors on it**. This means:
- Camera-pose pose targets the morph host (`focus: '#cta'`), not stage coordinates.
- Element position relative to the viewport stays approximately constant — viewer feels anchored.

### 4. Single timeline, parallel tracks

The morph chain choreography lives in a master timeline. Other beat content (atmosphere, typography, transitions) runs as parallel tracks on the same timeline, not as separate beats with hard cuts between them.

```js
const tl = gsap.timeline();
tl.add(morphHostTimeline(), 0);          // identity-continuity track
tl.add(atmosphereTimeline(), 0);         // parallel atmosphere
tl.add(typographyTimeline(), 0);         // parallel typography
```

### 5. Camera as observer, not director — and the frame keeps moving (amended 2026-09-03)

The camera follows the morph host. It does NOT cut to staged compositions. Camera moves are continuous with the morph chain — they pan, push in, scale, but always with the host as the anchor.

This is the difference between editorial cinematic motion and slide-projector editorial. The former camera observes one host; the latter cuts between staged compositions.

**"Follow" was read as "park."** The first WPVibe ad, v5, obeyed this section to the letter and shipped 5 framings in 44s, one 23.7s hold on a two-panel layout, camera scale 1.00–1.04 — Umair: "the animations weren't there, motion design non-existent" (`docs/ad-camera-gap-analysis-2026-09-03.md`). Two different things had one name:

- **Composition cut** — a NEW subject in a NEW layout with no carrier. The slide-projector failure. Still banned.
- **Re-frame** — the SAME host seen from a new distance: punch to the control being used, macro on the payoff, whip to the reply, pull back to the establishing pose. The reference films (Shipper, Codex) do this every 1–2s. **Required.**

Rule: **the host stays, the frame moves — at the cadence THIS film's storyboard declares.** Cadence is a creative decision made per film, never a system number (Umair, 2026-09-04, after the v6 camera pass over-corrected into 25 landings in 41s: "making me dizzy … our UI had to stay the same so too much motion made little sense here"). A film whose UI stays the same — one chat window, one form — wants few, considered moves on story turns. A montage that switches subjects wants a dense one. Every move is caused by an event (typing starts, a button is pressed, a state lands), and the ease voice is declared alongside the cadence. A re-frame anchors on the host or on the thing the host just changed — that is what keeps it "continuous with the morph chain." The section below makes it a storyboard artifact.

## Example morph chains worth modeling

These are the canonical patterns:

### Single host — `#cta`: Button → Input → Sullie pill → Chat

Four-state chain over ~12s. Each transition uses a different mechanism (button-to-input is dimensional Flip morph; input-to-pill is content swap inside the pill container; pill-to-chat is Flip with content multiplication).

### Typography-as-host (multiple)

This 36s video doesn't have a single dominant morph host. Each beat has its own typographic host that morphs internally (caret-typing → typed text → input morph in beats 1-3; phone composition continuity in beats 4, 5, 12). For a 36s editorial with high beat density, multiple per-beat-internal morph chains are acceptable.

### Landscape + foreground twin chains

Background landscape (pixel-art) is a static persistent host; foreground hero element morphs across beats. Two co-existing chains.

## Anti-patterns (rejected by `wpforms-motion-audit` skill)

- **No morph chain declared in storyboard.** Editorial videos without an explicit morph chain in the storyboard get scored C or worse before the build even starts.
- **Element re-mounting between beats.** `<div id="cta">…</div>` in beat 1 is removed; a new `<div id="cta">…</div>` is mounted in beat 2. Breaks identity continuity. Fix: keep the element mounted; mutate inside.
- **Camera cutting to staged compositions instead of following the host.** This is the slide-projector failure mode. Fix: every camera pose anchors on the morph host's bounding box.
- **Parked stage.** The opposite failure, just as fatal: one host, one mid-shot, 40 seconds — only the content inside it changes (the first WPVibe ad, v5: 5 framings, a 23.7s hold). A storyboard with no `## Camera plan` section, or a camera plan with no declared cadence, scores B or worse before the build starts. Fix: declare the cadence and re-frame the same host at it.
- **Busy stage.** The over-correction: a system-imposed cadence instead of the film's own (the same ad, v6: 25 landings in 41s on a film whose UI never changes — "making me dizzy"). Cadence is declared per film by the storyboard, with the reason. A camera plan written FROM the code after the fact is the same defect in paper form.
- **Multiple competing protagonists.** Two morph hosts at same prominence at same time. Viewer's eye splits, identity continuity is destroyed. Fix: stagger them temporally, or subordinate one as supporting cast.

## Cross-references

- `docs/editorial-direction-audit-2026-05-10.md` (deleted 2026-08-22 — git history) — Phase 4 in the master plan
- `docs/winning-pattern-analysis-2026-05-10.md` (deleted 2026-08-22 — git history) — full identity-continuity analysis
- `.claude/skills/wpforms-motion-audit/references/score-examples.md` — auditor scores tied to morph-chain presence

## What this changes

When `wpforms-marketing` skill is updated in Phase 5 (deferred), it must require this section in any editorial storyboard. Until then, this doc is the explicit authoring contract — storyboards that lack a morph chain section are out of scope for editorial authoring on this repo.
