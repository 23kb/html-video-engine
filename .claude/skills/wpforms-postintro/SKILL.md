---
name: wpforms-postintro
description: Use when designing, implementing, reviewing, or debugging a WPForms postIntro concept beat. Covers the 8-15s multi-phase requirement, build-order decisions (existing kind vs video-local vs descriptor vs new cinematic), canonical reference cinematics (rough-thought-to-draft, one-answer-enough, form-to-inbox), snapshot handoff (avoiding the boot flash), and HTML/CSS/SVG/GSAP video-local surfaces. Triggers on any "postIntro", "concept beat", "after the title card", or `postIntro.kind` work.
---

# WPForms PostIntro

PostIntro is a short animated proof of value (8-15 seconds) that runs after the title card and before the product walkthrough. It teaches the *why* before the user enters WPForms UI.

It is **not**: a second title card, a copied cinematic from another topic, a full tutorial chapter, or a generic decoration layer.

## ⛔ Skill must be INVOKED, not just read

This skill defines the multi-animation rule + the morph-chain requirement that postIntros are scored against. **Use the Skill tool to invoke it** at the start of any postIntro design work. Reading the markdown file inline ≠ running the skill.

Sign-off requirement: every postIntro is run through `wpforms-motion-audit` (Skill tool) before declaring it done. Tier B or below requires fix or explicit Umair override. The Klaviyo tutorial v11 postIntro went through 12 iterations without ever being scored — don't repeat that.

## 🛑 HARD-GATE: Multi-Animation Rule (Mandatory)

**Every postIntro MUST hit all five of these. The user will reject postIntros that feel like a single fade-in.**

1. **8-15 seconds total runtime.** Not 4. Not 20. The canonical references all sit in this range.
2. **At least 5 distinct animation phases.** Examples: mount, primary morph, payoff, secondary morph or label reveal, exit/handoff. A fade-in + fade-out is **not** five phases.
3. **At least one cursor or pointer interaction with the editorial DOM** (click, hover, drag, type). Without this it feels like a slide, not a scene.
4. **Hands off into the first content chapter** — fade into the real snapshot, dive-zoom into a captured element, or hand the cursor to a product-truth control. Never abruptly `.remove()` the editorial layer onto a bare snapshot.
5. **Identity continuity via a morph chain** — one DOM element carries viewer attention through the phases, morphing in content/scale/role while preserving its `id`. The canonical example is `reference/html-templates/wpforms-ai-prompt-open.html#cta`: Button → Input → Sullie pill → Chat panel over 12 seconds. Per `docs/storyboard-format-morph-chain-2026-05-10.md` — the storyboard MUST declare the morph chain as its own section.

The validator does not enforce these rules. You enforce them. If the storyboard approved a postIntro that doesn't hit all five, push back at storyboard stage. If implementation is drifting toward 3 phases or a state-table-of-beats, stop.

## 🛑 Pre-Handoff Audit Gate

Before declaring a postIntro done, **run `wpforms-motion-audit` skill** on the postIntro chapter file. Tier A or higher is the merge bar; B or below needs a fix or explicit user override. The audit checks: multi-phase camera decomposition, atmosphere-swap discipline, identity-continuity host, zoom levels, easings, automatic-ceiling triggers (heavy blur exits, dead-air holds, `repeat: -1`).

Also load `design-motion-principles` (kylezantos, auto-triggers) for the per-designer critique by Emil Kowalski / Jakub Krehel / Jhey Tompkins.

## Design Rules

- Start from the current topic's product problem.
- Show a clear before → after, limitation → solution, or messy → polished transformation.
- The implemented visuals must match the approved visual transformation. **Do not** replace an approved concept with a weaker related UI highlight while keeping the narration conceptual.
- Use real WPForms product truth when product UI appears in the postIntro. Editorial elements (chips, abstract shapes, conceptual cards) can be invented as long as they read as editorial, not as fake product chrome.
- Keep narration tight. The postIntro narration should be a single 8-15s clip, not split across many small ones.

## Transformation Proof (Pre-Code)

Before any DOM/CSS authoring, surface a short transformation proof for approval. It must:

1. Pick the single closest canonical reference by semantic match. If nothing is close, say that explicitly and name the primitive you are borrowing.
2. State in 2-4 lines the concrete physical morph or rebuild the postIntro will perform: what changes shape, structure, position, or relationship. Do not list phases or only what appears/disappears.

**Anti-pattern:** a polished static card with inner states fading/toggling is not a transformation.

Treat this proof note like a tiny storyboard gate: show it inline and wait for explicit approval before authoring starts. Do not create a separate file unless the user asks.

## Build Order

When designing a new postIntro, evaluate options in this exact order. Stop at the first one that fits.

1. **Existing semantic match** — does an existing `postIntro.kind` tell the same product story? Use `manifest.postIntro: { kind: '<existing>' }`. **Rare** — do not use a Checkboxes or WPForms-AI cinematic for an unrelated topic just because the motion looks good. Topic semantics must match.
2. **Legacy video-local concept chapter** — *default for normal video work*. Create an early chapter named `postintro-<topic>` or `<topic>-concept` using legacy/effect-mode, per-beat narration, local selectors, and ctx helpers. HTML/CSS/SVG/GSAP-style timing all acceptable when clearly editorial. Keeps the animation video-local; no core edits.
3. **Descriptor concept chapter** — secondary, simple beats only. Use `defineChapter` with public verbs (`sectionTitle`, `animateText`, `captionLine`, `lineDraw`, `hold`, `focus`, `popOut`, `focusPull`, `snapshotSwap`). **Only if** they preserve the approved visual transformation. A real UI focus plus title text is **not enough** when the storyboard approved richer animation.
4. **New reusable runtime cinematic** — only with explicit user approval. Add a new `runtime/cinematic-<name>.js` when the concept is reusable across future videos. Touches protected core; gate hard.

## Snapshot Handoff (Avoiding the Boot Flash)

A chapter-mode postIntro declares `snapshot: '<base>'` so the runtime preloads that iframe behind the editorial layer. The runtime mounts a pre-first-chapter cover at z 595 and drops it via `onAfterSetup` once `setup()` completes.

**Two rules:**

1. **Mount the editorial layer in `setup()`, not lazily inside `effect()`.** The cover drops as soon as setup returns. If the layer mounts inside the first beat, the viewer sees a brief bare snapshot frame before the editorial layer paints.
2. **Ease opacity, don't abrupt-remove.** Don't `el.remove()` the editorial layer onto a bare snapshot at the end. Tween opacity to 0 over 300-500ms — ideally over the element the next chapter focuses on, so the cursor can hand off seamlessly.

**WRONG — lazy mount + hard remove:**
```js
// Editorial layer paints AFTER cover drops → viewer sees bare snapshot for ~1 frame
effect: async ({ doc, sleep }) => {
  const stage = doc.body.appendChild(document.createElement('div'));
  // ... paint stage, animate, then ...
  stage.remove(); // hard cut to snapshot
}
```

**RIGHT — eager mount in setup, ease out:**
```js
async setup({ doc }) {
  const stage = doc.body.appendChild(document.createElement('div'));
  stage.id = 'postintro-stage';
  // ... paint full editorial layer here ...
  // Cover drops onto a fully-painted stage. No bare-snapshot flash.
}

effect: async ({ doc, sleep, awaitTween }) => {
  // ... animate ...
  const stage = doc.getElementById('postintro-stage');
  stage.style.transition = 'opacity 400ms ease-out';
  stage.style.opacity = '0';
  await sleep(420);
  stage.remove();
}
```

## Canonical References

Read **only** the cinematic whose semantics match your concept. Do not read all three for design inspiration; that produces frankenstein postIntros.

- **`runtime/cinematic-rough-thought-to-draft.js`** — Read when the concept is *messy idea → polished output* or *generative AI*. ~15.2s, 5 phases: type messy idea → erase + retype clean prompt → compress to chip → thinking → form draft reveal. Used by `build-forms-faster-with-wpforms-ai`.
- **`runtime/cinematic-one-answer-enough.js`** — Read when the concept is *limitation → richer answer* or *radio→checkbox morph* style. ~14s, 6 phases: form mount → cursor → radio click → radio→checkbox morph → multi-select payoff → exit. Used by `a-complete-guide-to-the-checkboxes-field`.
- **Notifications `form-to-inbox` teaser** in `scenes/notifications-combined.html` — Read when the concept is *form submission → email landing*. ~12s, multi-phase: browser chrome → form fill → click → Gmail slide-in → email ping. Used by `form-notifications`.

Other accepted package postIntros are not canonical references; treat them as historical, not design inspiration.

## Motion Primitives — compose from these, do not reinvent

Every postIntro should compose from `videos/_shared/motion-primitives.js`. The library was built precisely to give each postIntro phase a canonical implementation:

| PostIntro phase | Primitive to reach for |
|---|---|
| Cursor mount + glide/click/hover/drag (Multi-Animation rule #3) | `Cursor` class — built-in anti-frenzy guards, squash+ripple click, ghost-clone drag |
| Letter-by-letter typing (e.g. AI prompt input) | `caretType` — scalar-tween + innerHTML mutation, avoids the wpforms-ai-board caret-drift bug |
| Status / progress label morphing (Thinking → Filling → Done) | `statusPillMorph` |
| Marker / highlighter sweep on key text | `markerSweep` |
| Field cascade (AI generation, template apply) | `fieldStaggerReveal` |
| Multi-phase camera move into / out of the editorial layer | `cinematicFlight` (intra-snapshot) or `figjamFlight` (inter-snapshot reveal) |
| Brand anchor (Sullie) persisting across the handoff | `mountSullieBug` |
| Exit back to overview before chapter 1 takes over | `cleanFastRejoin` (no blur smear, 0.35s scale-1.02 exit) |

Hand-rolling any of these in a postIntro re-introduces the bugs they exist to fix. `wpforms-motion-audit` HARD RULE 3 caps re-invented primitives at tier B regardless of other criteria.

Load `wpforms-primitives` skill for the full lookup (signatures, QC statuses, line citations).

## Video-Local Surfaces

For video-local concept beats (option 2 above), the practical tools are:

- **HTML** for editorial objects: cards, chips, small forms, lists, inboxes, menus, labels. Product-looking HTML must be cloned from real captured DOM or based on product-truth snippets — see `wpforms-video` skill's Production Truth section.
- **CSS** for layout, opacity, transforms, keyframes, easing, masks, before/after states. Prefer `transform`/`opacity` animation (compositor-friendly).
- **SVG** for arrows, paths, rings, connectors, marker strokes, line-draw. The descriptor `lineDraw` verb is the safest public surface.
- **GSAP timelines** for complex timing. **Use registered timelines via `videos/_shared/kit.js registerTimeline()`** for paused, scrubbable, hidden-tab-survivable choreography. See `wpforms-gsap-rules` skill.
- **Blocks library** at `videos/_shared/blocks/`: `mountCodeCard`, `mountMacWindow`, `mountPhoneFrame`, `mountPill`, `mountArrow`, `mountRouteLine`, `mountTerminal`. See `wpforms-marketing` skill.

## Modern Features for PostIntros

Modern features especially relevant for postIntro authoring. Reach for these when the concept needs richer choreography than the legacy skeleton shows.

| Feature | When to use | Skill |
|---|---|---|
| `registerTimeline(tl, { id })` | Multi-phase postIntro choreography in a paused timeline. Driver seeks deterministically; survives hidden-tab RAF. **The canonical postIntros (`rough-thought-to-draft`, `one-answer-enough`) use this.** | `wpforms-gsap-rules` |
| `pausableRaf(cb)` | **Required** if the postIntro has a Three.js scene or any `requestAnimationFrame` render loop. The AI postIntro's Three.js render loop migrated to this. | `wpforms-gsap-rules` |
| `swapStyle: 'flipBridge'` | If the postIntro hands off to a different snapshot at the end. Eliminates cream-bleed seam during the handoff dive. | `wpforms-transitions` |
| `surface: 'mixed'` (manifest-level) | Hybrid postIntros that need both full-bleed editorial chrome AND the iframe geometry behind. Rare but real for mid-flight postIntros. | `wpforms-marketing` |
| `videos/_shared/blocks/` | Editorial chrome inside the postIntro (mac-window, code-card, phone-frame, pill). Don't re-implement these per postIntro. | `wpforms-marketing` |
| `videos/_shared/text-kit.js` (24 presets) | Hero text reveals inside the postIntro (mask-reveal-up, spring-scale-in, focus-blur-resolve). | `wpforms-marketing` |
| `videos/_shared/atmospheric.js` | Grain / sweep / parallax / scale-push for ad-style postIntros. Use sparingly on tutorial postIntros. | `wpforms-marketing` |

## Required Shape (Quick Reference)

- 8-15 seconds total
- ≥5 distinct animation phases
- ≥1 cursor or pointer interaction with editorial DOM
- Eager mount in `setup()`, eased opacity exit (300-500ms)
- Topic-specific concept; no copy-paste from unrelated cinematics
- Hands off into the first content chapter

## Output Checklist

Before declaring a postIntro done:

- [ ] Stopwatch the rendered HTML — total runtime is between 8.0 and 15.0 seconds
- [ ] Count distinct animation phases — at least 5
- [ ] Identify the cursor/pointer interaction — at least one click, hover, drag, or type with the editorial DOM
- [ ] Confirm handoff — last frame of postIntro flows into first frame of chapter 1 (no bare-snapshot blink)
- [ ] Editorial layer is mounted in `setup()`, not lazily in `effect()`
- [ ] Editorial layer opacity-eases to 0 (300-500ms), does not hard-remove
- [ ] Topic semantics match if reusing an existing `postIntro.kind`

## References (loaded on demand)

- `docs/postintro-patterns.md` — Canonical reference for postIntro design rules. Read for the deepest rationale and historical context.
- `docs/examples/legacy-postintro-effect-skeleton.md` — Read when starting a new video-local postIntro chapter. First copy target.
- `docs/gsap-flip-patterns.md` — Read when the postIntro needs Flip-based morphs (radio→checkbox, card reflow, label-to-field).
- `docs/authoring-api.md` — Reference for the `postIntro.kind` manifest slot and `mount(opts)/dismiss()` cinematic contract.
- `docs/blocks.md` — Read when composing editorial chrome (mac-window, code-card, etc.) into a postIntro.
- `docs/text-kit.md` — Read when the postIntro includes text reveals (24 Pixel-Point-style presets).

## Granular craft references

- `docs/cursor-choreography.md` — Read when designing the postIntro's cursor handoff into chapter 1.
- `docs/beat-pacing.md` — Read for postIntro phase pacing (5+ phases in 8-15s).
- `docs/camera-lensing.md` — Read when the postIntro uses zoom (most postIntros are level 1.0 full-bleed; some dive at the end).
- `docs/stage-css.md` — Read when the postIntro layer leaks Mac chrome or mesh-bg.
- `docs/color-palette.md` — Read for editorial-chrome color rules in the postIntro.
- `docs/atmospheric-composition.md` — Read when adding grain / sweep / scale-push to postIntro phases.
- `docs/narration-writing.md` — Read when writing the postIntro narration (more conceptual than tutorial narration).

## See Also

- `wpforms-primitives` — the lookup index for `motion-primitives.js`. Every postIntro pulls from here.
- `wpforms-video` — universal authoring + storyboard gate.
- `wpforms-gsap-rules` — registered timelines, `pausableRaf`, GSAP discipline.
- `wpforms-marketing` — editorial surface mode + blocks library + atmospheric kit (postIntro is often a mini-editorial composition).
- `wpforms-transitions` — cross-snapshot continuity (`flipBridge`) for postIntros that swap snapshots mid-flight.
