---
name: wpforms-postintro
description: "Use when designing, implementing, reviewing, or debugging a WPForms postIntro concept beat. Covers the story-state length rule + multi-phase requirement, build order (shared vocabulary first, video-local GSAP on the master timeline, promote on second use), canonical reference cinematics (rough-thought-to-draft, one-answer-enough, form-to-inbox), the chapter-1 handoff (no bare-snapshot blink), and HTML/CSS/SVG/GSAP video-local surfaces. Triggers on any 'postIntro', 'concept beat', 'opening beat', or 'after the sting' work."
---

# WPForms PostIntro

PostIntro is a short animated proof of value that runs before the product walkthrough — it is the FIRST frame of a tutorial (no title card precedes it since the 2026-08-28 bookends ruling; Kacie's recording is stitched in front) and follows the sting on a short. It teaches the *why* before the user enters WPForms UI. It runs until the message is explained — story states, not seconds (see rule 1 below; ruled 2026-08-22).

It is **not**: a second title card, a copied cinematic from another topic, a full tutorial chapter, or a generic decoration layer.

## 🎓 Tutorial branch — read this BEFORE assuming a tutorial needs a postIntro

Added 2026-08-28 after Umair's QC note on one tutorial: *"I feel like postIntro is not clear for tutorials — Codex is not clear about it."* He was right. Everything below this section was written for editorial / announcement films, and applying it unchanged to a tutorial produced a botched beat neither of us could map to a rule (receipt `cpa` 13–14).

⚠️ **Correction 2026-08-28:** an earlier version of this section said a tutorial postIntro is "optional and the default answer is a short one or none at all." **That was wrong and contradicted a standing ruling.** Umair overruled the old "default: skip" on 2026-07-22 — **a postIntro is MANDATORY for rock tutorials** (`dev-advocacy-video`: "mandatory presence, negotiable content"). What is under-specified is the CONTENT, never the presence. Corrected here rather than left standing, per the rule that a stale sentence beside a live one reads as an exception.

**Presence by path:**

| Path | postIntro |
|---|---|
| **Tutorial** | **MANDATORY** (Umair 2026-07-22). Presence is settled; content is the open question. |
| **Short** | **OPTIONAL** (Umair 2026-08-28). Include one only when the storyboard idea is strong enough to deserve it, OR the story needs help being set up / the problem needs help being explained. Otherwise cut straight into the UI. The storyboard states which trigger applies. |
| **Editorial / ad** | Governed by `wpforms-marketing`, not this table. |

So for a tutorial the question is never *whether* — it is *what*. Two things that are settled about the content:

1. **The premise must be a problem the viewer RECOGNISES**, never a demonstration of something impossible. Test: would a real user say "yes, that happens to me"? *"A text box can't hold a file"* fails it (receipt `fuf` 4, rejected: *"lol seriously"*); *"you're chasing attachments over email"* passes.
2. **A clean minimal explainer is a legitimate shape** — title + diagram + bullets, narration-led, no cursor — with the multi-animation rule waived. Record the waiver explicitly when taken.

⚠️ **The rest is genuinely open and needs Umair, not a self-serve answer.** Six films reviewed on 2026-08-28 that carried a postIntro drew six postIntro notes — a 100% flag rate, including four films that otherwise passed with no defects. He has raised "postIntro capability" as a standing tool-level ask and said *"it's all about storyboarding."* Do not self-approve a tutorial postIntro concept while that is unresolved; put the premise to him in one sentence first.

**If you build one, it carries a composition line, not just a phase table.** The phase table below audits MOTION only; it says nothing about the frame, which is how one tutorial shipped six valid phases playing out in the bottom eighth of an empty stage. State before building:

- **Where the subject sits and what fraction of frame it fills.** Bottom-anchored cards on an empty stage read as broken. `tools/composition-scan.js` measures occupancy — run it on the postIntro, not just the film body.
- **Which snapshot its product identity cites.** A mock WPForms form must cite a real snapshot the way any other UI fragment does (anti-pattern #6). "Doesn't look like a WPForms form" was a QC note, and it was a sourcing failure, not a styling one.
- **Its narration register.** Tutorial voice is warm and educational, purpose before mechanic. See the script rules in `wpforms-video`.

## ⛔ Skill must be INVOKED, not just read

This skill defines the multi-animation rule + the morph-chain requirement that species-1 postIntros are scored against (species 2 — illustrated montage — has its own gate profile below; the species is chosen at the storyboard gate). **Use the Skill tool to invoke it** at the start of any postIntro design work. Reading the markdown file inline ≠ running the skill.

Sign-off requirement: every postIntro is run through `wpforms-motion-audit` (Skill tool) before declaring it done. Tier B or below requires fix or explicit user override. The Klaviyo tutorial v11 postIntro went through 12 iterations without ever being scored — don't repeat that.

## 🛑 HARD-GATE: Multi-Animation Rule (Mandatory) — SPECIES 1 (morph-chain) gate profile

**Species scoping (U1 ruling 2026-09-03): there are now TWO postIntro species, chosen at the storyboard gate.** The eight points below are the gate profile for **species 1 — morph-chain** (the existing shape; unchanged for videos that pick it). **Species 2 — illustrated montage** has its own gate profile (section below); the morph-chain (#5), cursor (#3), and demonstrate-don't-illustrate (#6) rules bind species 1 only. The story-state length rule (#1), stakes-before-relief (#7), and the handoff rule (#4) apply to both species.

**Every species-1 postIntro MUST hit all eight of these. The user will reject postIntros that feel like a single fade-in.**

1. **Length — the story-state rule** (ruled 2026-08-22; replaces the old "8-15s. Not 4. Not 20." gate). A postIntro runs until the message is explained — and "explained" is measured in **story states, not seconds**. Every phase must change a state a viewer can name: the problem appears, the stakes land, the feature enters, the resolution shows. When the last state has landed, the postIntro is over. Holds that exist to fit audio are defects: **beat length is the budget; narration is written to it** (sfb 36) — shorts and long-form both. No fixed second-count in either direction: the canonical long-form references happen to sit 8-15s; an approved 4.8s shorts cold open is the prototype.
2. **At least 5 distinct animation phases long-form; at least 3 on shorts.** Examples: mount, primary morph, payoff, secondary morph or label reveal, exit/handoff. A fade-in + fade-out is **not** five phases. A phase whose "what changes" cell would be empty or repeat the previous phase is cut before build.
3. **At least one cursor or pointer interaction with the editorial DOM** (click, hover, drag, type) on long-form; **optional on shorts** (ruled 2026-08-22). Without it a long-form postIntro feels like a slide, not a scene.
4. **Hands off into the first content chapter** — fade into the real snapshot, dive-zoom into a captured element, or hand the cursor to a product-truth control. Never abruptly `.remove()` the editorial layer onto a bare snapshot.
5. **Identity continuity via a morph chain** — one DOM element carries viewer attention through the phases, morphing in content/scale/role while preserving its `id`. The canonical example morphs one `#cta` element Button → Input → Sullie pill → Chat panel over 12 seconds. Per `docs/storyboard-format-morph-chain-2026-05-10.md` — the storyboard MUST declare the morph chain as its own section.
6. **Demonstrate, never illustrate** (ruled 2026-08-22). The fix visibly causes the resolution, on camera, in one continuous read. Litmus at proposal time: *point at the frame where the mechanism acts.* If no single frame shows cause meeting effect, the concept is illustration — the anti-spam nested-rectangles failure mode (illustrate = dead, demonstrate = alive; a custom CSS tutorial's v4 real-form-plus-code-editor is the passing model).
7. **Stakes before relief** (ruled 2026-08-22). The problem must read as a problem — red wash, failed state, the Bot leaning in — before the feature enters. A viewer who can't say what's at stake at the entrance beat has been shown a features list, not a story.
8. **The carrier law applies inside postIntros** (ruled 2026-08-22). An area-visible event at least every ~2s, where area is a fraction of the FRAME (sfb 8/17/29/31 — proven four times). Micro-motion — blinks, 30px gestures — does not carry; washes, lunges, slams, and camera moves do.

The validator does not enforce these rules. You enforce them. If the storyboard approved a postIntro that doesn't hit all eight, push back at storyboard stage. If implementation is drifting toward 3 phases or a state-table-of-beats, stop.

## 🛑 Pre-Handoff Audit Gate

Before declaring a postIntro done, **run `wpforms-motion-audit` skill** on the postIntro block of `videos/<slug>/index.html`. Tier A or higher is the merge bar; B or below needs a fix or explicit user override. The audit checks: multi-phase camera decomposition, atmosphere-swap discipline, identity-continuity host, zoom levels, easings, automatic-ceiling triggers (heavy blur exits, dead-air holds, `repeat: -1`).

Designer-grade pass (Emil Kowalski / Jakub Krehel / Jhey Tompkins): file-read `.agents/skills/design-motion-principles/SKILL.md` + its `references/` — NOT Skill-tool invocable (installed outside `.Codex/skills/`); nothing fires it automatically.

**Async-approver clause:** if the user has explicitly ordered the finished deliverable and is unavailable to approve mid-run, approval-shaped steps (concept sign-off, B-tier override) convert to: write the artifact to disk, mark it `AUTO-APPROVED-BY-DIRECTIVE (review on return)`, proceed, and surface it FIRST in the handoff. Do not improvise a different self-override.

## Design Rules

**First write = copy the skeleton.** `docs/examples/single-html-postintro-skeleton.html` pre-declares the named CustomEases (logo-arrival / pi-flight / pi-pulse from approved references), pre-wires statusPillMorph/caretType/Cursor, and carries a stable-id morph-chain host with phase comments. Past first-writes that started blank shipped stock-only easings + hand-rolled label swaps and paid an audit iteration (FA #18, SendGrid [P6]).

- Start from the current topic's product problem.
- Show a clear before → after, limitation → solution, or messy → polished transformation.
- The implemented visuals must match the approved visual transformation. **Do not** replace an approved concept with a weaker related UI highlight while keeping the narration conceptual.
- Use real WPForms product truth when product UI appears in the postIntro. Editorial elements (chips, abstract shapes, conceptual cards) can be invented as long as they read as editorial, not as fake product chrome.
- Keep narration tight. The postIntro narration should be a single clip written to the beat's length (beat length is the budget; narration is written to it), not split across many small ones.

## Story Proof (Pre-Code)

Before any DOM/CSS authoring, surface a **Story Proof** for approval — the Transformation Proof, extended with the slots that make "plain" visible before code (motion-design round 2026-08-17, ruled 2026-08-22). It must:

1. Pick the single closest canonical reference by semantic match. If nothing is close, say that explicitly and name the primitive you are borrowing.
2. State in 2-4 lines the concrete physical morph or rebuild the postIntro will perform: what changes shape, structure, position, or relationship. Do not list phases or only what appears/disappears.

**Anti-pattern:** a polished static card with inner states fading/toggling is not a transformation.

3. **Offer 2–3 options, ALWAYS — not only after a rejection** (ccs 20/A17): the custom-css postIntro v4 passed FIRST-build after exactly this proposal shape; v1–v3 all failed without it, and the success had options on the first ask. Options-with-costs is the gate, not a courtesy. **And the options must be genuinely distinct (added 2026-09-02):** derive each from a different anchor (seed-string trick: random alphanumeric string → interpreted creative direction) and make at least one deliberately ambitious — three shades of one safe idea is the divergence failure the option format exists to prevent. Downstream gates catch unshippable; ideation affords the risk. Source: Anshu Chimala (Lenny's Newsletter).
4. **A named reference frame or effect-vocabulary list per phase** (ccs 14/A13): the hero-reference gate extends to postIntros — a real frame or a named `videos/_shared/effects/` entry per phase at proposal time; an adjective is not a reference.

### The option format

Each option carries these slots (the phase table satisfies items 2 and 4 above per phase — one format, filled once):

```
### Option <n> — <working title>
Logline:        <who> has <problem>; <feature> enters; <what resolves>.
Cast & props:   Bot (role, or "no"), Sullie (role, or "no"), editorial props named
Morph host:     <the one element that threads the phases (gate rule 5)>
Phase table:
  | # | ~s | what physically changes (nameable state) | vocabulary (named) | hero frame (one concrete line) |
  |---|----|------------------------------------------|--------------------|--------------------------------|
Real UI:        snapshot <slug>, pre-scrolled to <element>; state change: <verb> — or "none"
Cost:           S/M/L, with each genuinely new piece named
Constraints:    <hard constraints stated — what the option cannot show and why>
```

Slot rules:

- **"What physically changes" must name a state a viewer could name.** "Camera moves to X" is not a state change (mp 0 — same test, extended into the postIntro). A phase whose cell is empty or repeats the previous one is cut before build — this is where "not one frame longer" is actually enforced, the cheapest gate in the pipeline (ccs 20).
- **"Vocabulary" cells name existing primitives/effects** (from `wpforms-primitives`, `videos/_shared/effects/README.md`, or `shorts-kit.js`). "Custom" is allowed but is a cost line, not a default.
- **"Hero frame" is one concrete visual sentence per phase** — the slot that would have killed the "ladder" concept at proposal time (nobody could have written a hero-frame line for a gray rectangle without hearing how it sounded).
- **Cast is Bot + Sullie + abstract staging** (ruled 2026-08-22: no recurring human character, no desk scene). Sullie only from the real asset; editorial props are invented freely as long as they read editorial, never fake product chrome.
- **No pattern gallery** (standing ruling): the artifact is slots, not finished postIntros. This skill supplies ingredients — cast, vocabulary index, staging primitives — never answers. Do not accumulate example Story Proofs here.

After approval, copy the chosen option's phase table into `videos/<slug>/storyboard.md` under a `## PostIntro story` heading (sibling of the morph-chain section for editorial films), so the build and QC rounds carry the contract in-repo.

Treat this proof note like a tiny storyboard gate: show it inline and wait for explicit approval before authoring starts. Do not create a separate file unless the user asks (the async-approver clause above applies to the Story Proof exactly as it did to the Transformation Proof).

## Build Order

A postIntro is authored directly in the film's single HTML — video-local GSAP on the master timeline (`gsap.timeline({ paused: true })`, exposed as `window.__tl`), painted on the `.postintro-stage` layer the tutorial skeleton reserves (`docs/examples/single-html-tutorial-skeleton.html`; block-level copy target: `docs/examples/single-html-postintro-skeleton.html`). Evaluate in this order; stop at the first that fits:

1. **Reuse the shared vocabulary first** — `videos/_shared/effects/` (named text / card / constellation effects), `videos/_shared/motion-primitives.js` (`Cursor`, `caretType`, `statusPillMorph`, `markerSweep`, `fieldStaggerReveal`, `cinematicFlight`), `videos/_shared/blocks/`, `text-kit.js`. The xAI technique catalog (`docs/xai-voice-motion-rnd-2026-09-02.md` T1–T12 + `effects/xai-eases.js`) and the seam grammar (`docs/hyperframes-seam-grammar-rnd-2026-09-03.md`) are approved capability vocabulary for postIntro beats — same caveat: zoom-through blur never over a live iframe. The Story Proof's vocabulary cells name these. Do NOT copy an unrelated topic's cinematic because the motion looks good — topic semantics must match.
2. **Video-local GSAP for the rest** — the morph chain, the concept-specific choreography, the handoff into chapter 1. Lives in `videos/<slug>/index.html`; no core edits.
3. **Promote only on the second use** — when a postIntro mechanism repeats across films, propose promoting it into `videos/_shared/` (library promotion rules; explicit user approval). Never pre-promote.

Retired 2026-08-22, recorded so the vocabulary stops leaking back: `manifest.postIntro.kind`, the legacy video-local concept chapter, `defineChapter` descriptor chapters, `runtime/cinematic-*.js`. None exist; do not write to them.

## Handoff into chapter 1 (no bare-snapshot blink)

The old runtime boot-flash survives the retirement in a smaller shape. In a single-HTML tutorial the `.mac-frame` starts at opacity 0 and the base snapshot loads AFTER the postIntro, so a bare snapshot can only flash when the postIntro's exit clears the editorial layer before the next frame has painted. Two rules: (1) park the editorial layer's initial state at parse (CSS or `gsap.set`) so its first frame is fully painted — never mount it lazily inside the first phase; (2) ease the layer out with `autoAlpha` over 300–500ms (the skeleton's `runPostIntro` does this), never `el.remove()` it — and when the handoff dives into a captured element, preload that snapshot (`ifm.load()`) during the postIntro and overlap the exit with the mac-frame entrance or a veil so one side is always painted.

## Canonical References

Read **only** the cinematic whose semantics match your concept. Do not read all three for design inspiration; that produces frankenstein postIntros.

- **Rough-thought-to-draft concept** — Read when the concept is *messy idea → polished output* or *generative AI*. ~15.2s, 5 phases (source removed 2026-08-22; recover via git history): type messy idea → erase + retype clean prompt → compress to chip → thinking → form draft reveal.- **One-answer-enough concept** — Read when the concept is *limitation → richer answer* or *radio→checkbox morph* style. ~14s, 6 phases (source `runtime/cinematic-one-answer-enough.js` removed 2026-08-22; recover via git history): form mount → cursor → radio click → radio→checkbox morph → multi-select payoff → exit.- **Notifications `form-to-inbox` teaser** — HISTORICAL (its source `scenes/notifications-combined.html` was removed 2026-08-22; recover via git history, do not look for it on disk). The concept for *form submission → email landing*: ~12s, multi-phase: browser chrome → form fill → click → Gmail slide-in → email ping.
Other accepted package postIntros are not canonical references; treat them as historical, not design inspiration.

---

## 📐 Species 2 — illustrated montage (RULED 2026-09-03)

**Live gate profile** (U1–U3 rulings). The species is chosen at the storyboard gate; the morph-chain species and its eight-point profile stay unchanged for videos that pick species 1. Morph-chain / cursor / demonstrate-don't-illustrate rules do NOT bind this species.

1. **Cold open** — no sting, no title slate; straight into a fully-illustrated metaphor scene.
2. **2–5 scenes, 4–9s each, ONE narration idea per scene.** Joined by hard cuts or 0.5–1s whiteout washes.
3. **Ambient density:** ≥5 concurrently looping SEEDED props per scene (`mulberry32` + phase stagger, `boundedRepeats` — never `repeat:-1`).
4. **Composition thresholds:** prop cluster ≥70% frame width / ≥60% height; background carries ≥2 treatment layers (blob wash / foliage / icon constellation); no empty quadrant.
5. **Stakes scene LAST**, immediately before the pivot (warning accents, frustration pose cycle).
6. **Brand orange is reserved as the pivot signal** — pastel palette everywhere else.
7. **Pivot = the brand-pivot grammar:** logo pop → divider draw → feature icon join → feature title card (the verbatim pivot line rides it: *"This is where the [X] Add-on by WPForms comes in"*).
8. **Characters** — the reusable flat-vector rigs (U2: to be built with the first montage video, then reused across films) or Bot/Sullie. The no-humans ruling is lifted for montage scenes.
9. **Real UI only after the pivot.**

Production model: a **reusable scene LIBRARY** — whole scenes reused verbatim across videos — not bespoke hero morphs per film.

---

## Motion Primitives — compose from these, do not reinvent

Every postIntro should compose from `videos/_shared/motion-primitives.js`. The library was built precisely to give each postIntro phase a canonical implementation:

| PostIntro phase | Primitive to reach for |
|---|---|
| Cursor mount + glide/click/hover/drag (Multi-Animation rule #3) | `Cursor` class — built-in anti-frenzy guards, squash+ripple click, ghost-clone drag |
| Letter-by-letter typing (e.g. AI prompt input) | `caretType` — scalar-tween + innerHTML mutation, avoids the caret-drift bug |
| Status / progress label morphing (Thinking → Filling → Done) | `statusPillMorph` |
| Marker / highlighter sweep on key text | `markerSweep` |
| Field cascade (AI generation, template apply) | `fieldStaggerReveal` |
| Multi-phase camera move into / out of the editorial layer | `cinematicFlight` (intra-snapshot) or `figjamFlight` (inter-snapshot reveal) |
| Brand anchor (Sullie) persisting across the handoff | `mountSullieBug` |
| Exit back to overview before chapter 1 takes over | `cleanFastRejoin` (no blur smear, 0.35s scale-1.02 exit) |

Hand-rolling any of these in a postIntro re-introduces the bugs they exist to fix. `wpforms-motion-audit` HARD RULE 3 caps re-invented primitives at tier B regardless of other criteria.

Load `wpforms-primitives` skill for the full lookup (signatures, QC statuses, line citations).

## Video-Local Surfaces

For the video-local part of a postIntro (build-order step 2), the practical tools are:

- **HTML** for editorial objects: cards, chips, small forms, lists, inboxes, menus, labels. Product-looking HTML must be cloned from real captured DOM or based on product-truth snippets — see `wpforms-video` skill's Production Truth section.
- **CSS** for layout, opacity, transforms, keyframes, easing, masks, before/after states. Prefer `transform`/`opacity` animation (compositor-friendly).
- **SVG** for arrows, paths, rings, connectors, marker strokes, line-draw (vendored `DrawSVG` / `MotionPath`; `mountArrow` / `mountRouteLine` in the blocks library).
- **GSAP timelines** for complex timing. **Build ONE master timeline (`gsap.timeline({ paused: true })`), exposed via the `__tl/__T0/__sched/__done/__dur` globals** so renderers and probes drive it. See `wpforms-gsap-rules` skill.
- **Blocks library** at `videos/_shared/blocks/`: `mountCodeCard`, `mountMacWindow`, `mountPhoneFrame`, `mountPill`, `mountArrow`, `mountRouteLine`, `mountTerminal`. See `wpforms-marketing` skill.

## Modern Features for PostIntros

Modern features especially relevant for postIntro authoring. Reach for these when the concept needs richer choreography than the skeleton stub shows.

| Feature | When to use | Skill |
|---|---|---|
| Master timeline + `__tl/__T0/__sched/__done/__dur` | Multi-phase postIntro choreography as a child timeline nested into the film's master (un-pause after `add()`); probes and renderers seek/drive the master. | `wpforms-gsap-rules` |
| `pausableRaf(cb)` | **Required** if the postIntro has a Three.js scene or any `requestAnimationFrame` render loop (inline 7-line shape in `wpforms-gsap-rules`). | `wpforms-gsap-rules` |
| Cross-snapshot handoff at postIntro end | One timeline, or `ifm.swap()` crossfade — see `wpforms-marketing`, *Snapshot transitions*. | `wpforms-marketing` |
| `videos/_shared/blocks/` | Editorial chrome inside the postIntro (mac-window, code-card, phone-frame, pill). Don't re-implement these per postIntro. | `wpforms-marketing` |
| `videos/_shared/text-kit.js` (24 presets) | Hero text reveals inside the postIntro (mask-reveal-up, spring-scale-in, focus-blur-resolve). | `wpforms-marketing` |
| `videos/_shared/atmospheric.js` | Grain / sweep / parallax / scale-push for ad-style postIntros. Use sparingly on tutorial postIntros. | `wpforms-marketing` |

## Required Shape (Quick Reference)

**Species 1 (morph-chain) shape.** For species 2 see the "Species 2 — illustrated montage" gate profile; the story-state, stakes, and handoff lines below apply to both.

- Runs until the message is explained — story states, not seconds; no fixed second-count (ruled 2026-08-22)
- ≥5 distinct animation phases long-form / ≥3 on shorts
- ≥1 cursor or pointer interaction with editorial DOM (long-form; optional on shorts)
- Demonstrates, never illustrates — one frame shows cause meeting effect, on camera
- Stakes read as stakes before the feature enters
- An area-visible carrier event every ~2s (area = fraction of the frame)
- Editorial layer fully painted before its first frame (parked at parse), eased `autoAlpha` exit (300-500ms)
- Topic-specific concept; no copy-paste from unrelated cinematics
- Hands off into the first content chapter

## Output Checklist

Before declaring a postIntro done (cursor/mechanism items are species-1; for species 2 check its own profile: scenes/density/composition/stakes-last/pivot grammar):

- [ ] Walk the phases against the story-state rule — every phase changes a state a viewer can name; no second exists only to fit audio (holds waiting on narration are defects)
- [ ] Count distinct animation phases — at least 5 long-form / 3 on shorts
- [ ] Identify the cursor/pointer interaction — at least one click, hover, drag, or type with the editorial DOM (long-form; optional on shorts)
- [ ] Point at the frame where the mechanism acts — cause meets effect on camera (demonstrate, never illustrate)
- [ ] Stakes are visible before the feature enters — say what's at stake at the entrance beat
- [ ] Carrier pass — an area-visible event every ~2s; blinks and 30px gestures don't carry
- [ ] Confirm handoff — last frame of postIntro flows into first frame of chapter 1 (no bare-snapshot blink)
- [ ] Editorial layer is fully painted before the postIntro's first frame (parked at parse; nothing mounts lazily inside phase 1)
- [ ] Editorial layer opacity-eases to 0 (300-500ms), does not hard-remove
- [ ] Topic semantics match if borrowing a reference concept — never an unrelated topic's cinematic

## References (loaded on demand)

- `docs/postintro-patterns.md` — Canonical reference for postIntro design rules. Read for the deepest rationale and historical context.
- Living example of a video-local postIntro block: a recent film's opening section — read for vocabulary AFTER cloning `docs/examples/single-html-postintro-skeleton.html` (the skeleton is the first copy target, per Design Rules above).
- `docs/gsap-flip-patterns.md` — Read when the postIntro needs Flip-based morphs (radio→checkbox, card reflow, label-to-field).
- `docs/blocks.md` — Read when composing editorial chrome (mac-window, code-card, etc.) into a postIntro.
- `docs/text-kit.md` — Read when the postIntro includes text reveals (24 Pixel-Point-style presets).

## Granular craft references

- `docs/cursor-choreography.md` — Read when designing the postIntro's cursor handoff into chapter 1.
- `docs/beat-pacing.md` — Read for postIntro phase pacing (5+ phases long-form / 3+ shorts; story-state rule governs total length).
- `docs/camera-lensing.md` — Read when the postIntro uses zoom (most postIntros are level 1.0 full-bleed; some dive at the end).
- `docs/color-palette.md` — Read for editorial-chrome color rules in the postIntro.
- `docs/atmospheric-composition.md` — Read when adding grain / sweep / scale-push to postIntro phases.
- `docs/narration-writing.md` — Read when writing the postIntro narration (more conceptual than tutorial narration).

## See Also

- `wpforms-primitives` — the lookup index for `motion-primitives.js`. Every postIntro pulls from here.
- `wpforms-video` — universal authoring + storyboard gate.
- `wpforms-gsap-rules` — master-timeline contract, `pausableRaf`, GSAP discipline.
- `wpforms-marketing` — editorial / mixed film shapes + blocks library + atmospheric kit (postIntro is often a mini-editorial composition).

