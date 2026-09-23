---
name: wpforms-primitives
description: "Use BEFORE writing motion, cursor, camera, typing, field-reveal, brand-bug, iframe glue, or WPForms admin/builder interaction code — this is the WRITE-TIME lookup index for three shipped libraries (motion-primitives.js, wpforms-interactions.js, iframe-helpers.js). Most-skipped skill across 3 sessions; hand-rolling primitives that already exist costs 10+ iteration rounds. Triggers: cursor glide, camera move, cinematic flight, typing animation, field reveal, drag field, click Add New, select template, open settings, status pill morph, marker sweep, Sullie bug, iframe click, scroll into view, SaaS dashboard. If about to write gsap.to(cursor, ...) — STOP and load this first."
---

# WPForms Primitives & Interactions — lookup index

Two shipped libraries codify the motion + interaction vocabulary for this repo. Their authoritative rationale lives inline in the source files; this skill is the **when-to-use lookup table** so future Claude reaches for them instead of reinventing.

## ⛔ INVOKE BEFORE WRITING ANY MOTION CODE

**This skill is NOT a lookup-when-you-think-of-it reference. It is a WRITE-TIME GATE.** Invoke it via the Skill tool BEFORE you write the first `gsap.to`, `Cursor`, `caretType`, `cinematicFlight`, `figjamFlight`, `popOut`, `IframeManager.swap`, `markerSweep`, or `mountSullieBug` call. Reading this file inline is not enough — use the Skill tool.

Observed failure mode (Klaviyo tutorial v11 + editorial v1, both 2026-05-12):

> "Should've loaded wpforms-primitives at the very start. It would have given me the canonical signatures for Cursor, caretType, clickRipple, popOut, figjamFlight, cinematicFlight in one place — and the QC pages showing what each looks like — before I started writing. Instead I read motion-primitives.js piecemeal mid-build and hand-rolled approximations of half of it."
> — editorial session retro, 2026-05-12

Both sessions hand-rolled approximations of primitives that already exist. The rebuild is more expensive than the lookup. Invoke this skill at session start for ANY work that touches motion-primitives.js, wpforms-interactions.js, or iframe-helpers.js, not just after you notice you're reinventing.

## Why this skill exists

Across the 5d audit pass, every failed editorial / postIntro / interaction beat re-invented:

- a cursor element + glide tween (and re-introduced the cursor-frenzy + caret-drift bugs)
- a single-tween camera "flight" that read as a slide projector
- a typed string via opacity-stagger char spans (caret floats 500px right)
- a snapshot-swap with a cream-flash gap

The libraries fix all of the above. The job here is to **find the matching primitive, copy or compose it, do not rewrite it**.

## ⛔ The settle-mode measurement doctrine (fix-round C2)

**Never derive in-document coordinates from raw `getBoundingClientRect` once any camera work has happened.** After any zoom, IframeManager enters settle mode (`html.zoom = N`, resized box): raw rects return post-zoom pixels, scroll metrics stay layout-px, and camera `ty` has its own semantics. Measure through `cameraToElement` / `elementToStageCoords` / `elementToStageRect` (correct in every regime), or position within the anchor's own offset parent via `offsetTop`/`offsetLeft` (layout px in every regime). **Closed-loop beats open-loop:** measure → correct → re-measure, ≤3–4 iterations. **Camera move FIRST** (it clamps), then the loop centers inside the clamp.

Five independent sightings earned this rule: mp F (framed a wrong page section), bac 7 (overlay at ×2 coordinates TWICE — the second time as a race where live timing won and render timing lost), ssn 9 (its cousin), as 1 (click misses after deep-zoom landings), ccs 7 (under-scroll from offsetTop — offsetTop is offset-parent-relative; document-absolute positions use rect + scrollTop).

The closed-loop family in `iframe-helpers.js` (re-exported by `shorts-kit.js`):

- `settleAndMeasure(ifm, target)` — waits for two consecutive identical stage rects before you trust one. Use on late-loading pages where layout keeps moving AFTER `load` resolves (~180px table growth measured).
- `paneScrollTo(ifm, target, opts)` — closed-loop scroll of an inner builder pane. Resolves the scroller by walking UP from the target (never `querySelector` a pane class — inactive panels ship hidden 0×0 twins).
- `pageCenter(ifm, target, opts)` — closed-loop window scroll for live frontend pages, with a post-settle re-check (late image decodes reflow ~1300px after the scroll lands).

`smoothScrollIntoView` now resolves inner scroll containers too (as 3 fix) — but for centering a target under a deep zoom, prefer the closed-loop helpers above.

### Camera judgment notes (fix-round B3)

- **Fill/width rule of thumb** (mp E): a target wider than ~half the viewport makes `fill`-based framing compute a zoom ≈ the current zoom — the "camera move" visibly does nothing. Frame a SUB-REGION at explicit zoom instead. `flyToElement` now warns (`[camera]` prefix) when the computed zoom is within 10% of current.
- ✅ **FIXED 2026-09-02 (AP-4, granted behaviour change)** — `flyToElement`'s `decompose: true` default is now a BLENDED flight: one `tweenCamera` call whose tx/ty span the full duration on the land ease while the zoom dips (`min(cur, target)×0.96`, clamped ≥1 from rest) over the first 42% and lands over the back 58% via `zoomKeyframes`. The old shape (two sequentially awaited tweens, zero blend — Umair twice: *"first it goes to right and then zooms"*, `geo` 8 / `wh` 5) is gone; no film opts in or out, and total duration is unchanged, so DUR budgets hold. `{ decompose: false }` remains for mostly-vertical moves where any dip arc reads as sideways drift (mp G).
- **The zoom↔clamp trade** (ccs 23, measured): at high fill the edge clamp silently moves the pose off-center and the field-centre probe fails LATER. Error-by-fill curve on the measured page: fill 0.66 → 82px low, 0.78 → 36px, 0.86 → 5px, 0.90 → 0. `cameraToElement` now returns `clampedBy: {x, y}` (stage px the clamp moved the pose) — read it at authoring time instead of discovering it in the probe.
- **Scroll, not transform, for below-viewport iframe content** (ccs 6/A6): an embedded iframe rasterizes only its own viewport — transforming the iframe can NEVER reveal content below it. Scroll inside (the closed-loop helpers above), then frame.
- **Travel-to-center promotion trigger** (ccs 8/A8): `liftIdToCenter` exists video-locally in one tutorial. Promote into motion-primitives on its SECOND use — recorded here so the next session finds it; do not promote preemptively.

## Quick Reference

Scan this table first. For deeper context (why, when not to use, options), scroll to the detailed sections below.

| Need | Primitive | Signature | Source |
|------|-----------|-----------|--------|
| Move cursor to a point or element | `cursor.glide(to, opts)` | `(targetOrPos, {duration, ease}) → Promise` | motion-primitives.js:445 |
| Click at current cursor position | `cursor.click(opts)` | `({squash, ripple}) → Promise` | motion-primitives.js:489 |
| Glide to + hover an element | `cursor.hover(to, opts)` | `(el, {duration}) → Promise` | motion-primitives.js:541 |
| Drag from point A to point B | `cursor.drag(from, to, opts)` | `(posA, posB, {duration}) → Promise` | motion-primitives.js:628 |
| Camera move A→B (zoom+pan+ease) | `cinematicFlight(camera, opts)` | `(cameraEl, {from, to, zoom, duration}) → tl` | motion-primitives.js:100 |
| Figjam-style camera traversal | `figjamFlight(camera, opts)` | `(cameraEl, opts) → tl` | motion-primitives.js:195 |
| Establish overview shot of a station | `focusStationOverview(camera, opts)` | `(cameraEl, opts) → tl` | motion-primitives.js:272 |
| Typewriter into an input field | `caretType(el, text, opts)` | `(el, str, {wpm, jitter}) → tl` | motion-primitives.js:819 |
| Animate pill text + color morph | `statusPillMorph(pill, texts, opts)` | `(el, [strings], opts) → tl` | motion-primitives.js:901 |
| Highlighter sweep across text | `markerSweep(textEl, opts)` | `(el, {color, duration}) → tl` | motion-primitives.js:953 |
| Stagger-reveal a list of fields | `fieldStaggerReveal(fields, opts)` | `([els], {stagger, dur}) → tl` | motion-primitives.js:1228 |
| Mount the Sullie brand bug | `mountSullieBug(opts)` | `({position, scale}) → element` | motion-primitives.js:1266 |
| Compute finite loop count from duration | `boundedRepeats(cycle, visible)` | `(cycleSec, visibleSec) → number` | motion-primitives.js:46 |
| Seeded RNG for deterministic randomness | `mulberry32(seed)` | `(seed) → () => number` | motion-primitives.js:58 |
| **Defensive scroll + glide + click** (off-frame points auto-recenter since 2026-09-02; `recenter:false` opts out) | `glideClick({iframeManager, cursor}, target, opts)` | `(deps, el, opts) → Promise` | iframe-helpers.js:121 |
| Poll until a target exists AND has layout | `awaitLayout(ifm, target, { timeout })` | `(ifm, target, opts) → Promise<Element\|null>` | iframe-helpers.js (AP-10) |
| Is the element's centre inside the camera window | `inCameraView(ifm, el, margin)` | `(ifm, el, margin) → boolean` | iframe-helpers.js (AP-10) |
| Fly-then-centre for deep-below-fold targets | `flyCentered({iframeManager}, target, opts)` | `(ctx, target, flyOpts + {anchor, centerDuration}) → Promise<Element\|null>` | iframe-helpers.js (AP-10) |
| Framed glide+click (awaitLayout → fly-if-outside → centre → click) | `gcFramed({iframeManager, cursor}, target, opts)` | `(ctx, target, {flyOpts, flyFn, ...glideClick opts}) → Promise<Element\|null>` | iframe-helpers.js (AP-10) |
| Find iframe element by visible text | `findInIframeByText(ifm, text, opts)` | `(ifm, str, opts) → Element` | iframe-helpers.js:45 |
| Glide+click an iframe element by text | `glideToText({iframeManager, cursor}, text, opts)` | `(deps, str, opts) → Promise` | iframe-helpers.js:183 |
| **Blended tutorial camera flight** (dip + land in ONE tween, audit-clean) | `flyToElement({iframeManager}, target, opts)` | `(deps, el, {fill, pad, maxZoom, duration}) → Promise<pose\|null>` | iframe-helpers.js (FIX-1 fa-retest) |
| Click "Add New Form" in admin | `ifm.navAddNewForm(opts)` | `IframeManager method` | wpforms-interactions.js:1385 |
| Pick a template by slug | `ifm.selectTemplate(slug, opts)` | `IframeManager method` | wpforms-interactions.js:1410 |
| Drag a field into form builder | `ifm.dragFieldToForm(slug, opts)` | `IframeManager method` | wpforms-interactions.js:1655 |
| Open a field's option panel | `ifm.openFieldOptions(fieldId, opts)` | `IframeManager method` | wpforms-interactions.js:1914 |

### Payoff instruments (`videos/_shared/instruments.js`)

**When a beat explains a state, prefer a labelled instrument over a bare highlight ring — an instrument explains; a ring only points.** This applies to TEACHING beats, not just payoffs (the notifications short's → YOU chip is a teaching frame). Promoted by use-count from the shipped shorts (C-SPEC C5): `valueRoll` (number changes on real DOM — tween or split-flap slot, exact-value snap on complete), `sheenSweep` (contrast-aware carrier; dark tone for white admin panels), `stateChip` (labelled pill whose `.set()` slot-rolls in place), `routeChip` (fire-time anchor — never beat-start coords), `scanline`, `raceLane` (parameterized axis + coupled `onTick` scrub), `browserShell`. All `wpfi-` prefixed (guard-exempt for consumers), parked hidden at parse, tween-only. `bandToStage(y)` owns the BAND_Y=300 offset three films hand-rolled. QC: `videos/_qc-instruments/index.html`.

### Editorial named-effects (`videos/_shared/effects/`)

For pure-editorial / ad-style / marketing motion. Each `mountFoo({...})` returns `{ el, tweenInto(tl, opts), dispose() }`. **Use these before writing custom GSAP for an editorial text or layout reveal.** The named set lives in `videos/_shared/effects/`.

| Need | Effect |
|------|--------|
| Sentence reveal — word stack from right with 3D arrival | `mountTextStackFromRight({text, highlight, fontSize})` |
| Title card — letter mask flip + accent recolor | `mountTextLetterMaskDomino({text, topColor, botColor})` |
| Multi-line punch — center-out letter wave per line | `mountTextCenterOutRoll({lines, accentColor})` |
| "Pick a form" — card stack fans horizontally + center lift | `mountCardsSpreadFan({cards, spacing})` |
| "Template library" — cards fly in at varied stops + emphasize center | `mountCardsFlyInStack({cards, stops})` |
| "Hundreds of templates" — phyllotaxis spiral bloom of N tiles | `mountConstellationPhyllotaxisBloom({count, palette})` |
| Premium surface over a moving world — frosted glass + slow sheen | `mountGlassCard({width, height, content})` + `glassSpringEase` |
| "One number" — card lands, value ticks UP | `mountStatCountUp({label, from, to, suffix})` |
| House outro — Sullie + wordmark + CTA | `mountEndCard({title, cta, url})` |

**Ad vocabulary — promoted from a proving reel (2026-09-03).** All dark-ground by default (restyle the `--fx-*` vars for a light bed) and all inherit the film's font. Reach for these before hand-rolling an ad beat:

| Need | Effect |
|------|--------|
| Ad opening — giant-type phrases whip in/out, last line carries an inline chip whose label hot-swaps + width-morphs (xai T7) | `mountPhraseChain({lines, chip:{from,to}, font, chipFont})` — `.tweenInto()` + `.swapChip()` |
| "AI is doing the work" — checklist rows tick done: same-hue row wash, SVG check draws, chip swaps QUEUED → DONE | `mountTaskQueue({title, subtitle, rows, width})` |
| "It builds itself" — skeleton bars dissolve and real fields materialize on the SAME coordinates, after a sheen wipe | `mountSkeletonToLive({width, height, skeleton, live})` — mounts as a content layer INSIDE a frame the film owns |
| A big number that should LAND (not tick) — rolling digit columns, separators arrive after the digits | `mountOdometer({digits, separatorAfter, kicker, tail, live})` — `live:false` builds the settled pixel-match twin |
| Social proof — tile grid pops in on a micro-stagger, then dims | `mountLogoWall({marks:[{name,src}], columns, rows})` — **ships no logos**; marks are caller-supplied with `// SOURCE:` cites |
| The claim on top of the proof — testimonial card lifts + sheen | `mountQuoteCard({text, attribution, markFont})` |
| "There is audio here" — seeded bars ladder in, then breathe at a fixed Hz (xai T2) | `mountWaveformBars({count, seed, width, height})` — `.tweenInto()` + `.wiggle({window})` |
| Press reaction on the exact AEP ratios 1 → 0.8 → 1.1 → 1 (xai T6) | `pulseEmphasis(tl, target, {position})` — a composer, any target |

**`mountStatCountUp` vs `mountOdometer`:** siblings, not modes. Count-up = white card, text node tweened by a numeric proxy, number ticks UP. Odometer = per-digit masked strips on a dark bed, number LANDS.

**Seam grammar (`videos/_shared/effects/seams.js`)** — the five named scene-cut recipes, verbatim constants from `docs/hyperframes-seam-grammar-rnd-2026-09-03.md` (local-only), measured PASS on the proving reel. These are **composers, not mounts**: `(tl, outEl, inEl, cut, opts)` writing to the master at absolute `cut`, where `outEl`/`inEl` are whole-scene wrappers.

| Cut you want | Recipe |
|---|---|
| The signature recede-and-punch-through | `seamZoomThrough` — ⚠ animates `filter: blur()`; **editorial / PNG-baked scenes ONLY**, never over a live iframe |
| The workhorse throw (iframe-safe) | `seamThrowLeft` + `parkThrowEntry` / `seamThrowEntry` on the entering hero |
| Continuity — shared elements at identical coordinates | `seamLockedCrossfade` (carry a shared element across at matched speed; a crossfade alone reads DEAD to `seam-gate`) |
| Pixel-matched cut, no blend | `seamHardCut` — split one release ACROSS the cut so position *and* velocity agree mid-flight |
| One cursor move spanning a cut | `seamCursorVelocitySplit({outEl, inEl, from, to, cut})` — takes two matched glyphs; never mounts a cursor |
| Pin a beat's last frame to its end time | `holdFinalFrame(tl, cut)` — before every cut, always |

**Wash (`videos/_shared/effects/wash-transition.js`)** — the whiteout cut for **await-driven tutorial films** with no master timeline: `await washTransition(outGroup, inGroup, { veil, axis })`, veil from `mountWashVeil(surface)`. Alternate the axis between consecutive washes. `unparkGroup(g)` reveals a group with no wash for isolated `?scene=` entry.

Full vocabulary table + how to add a new effect: `videos/_shared/effects/README.md`. QC harness: `videos/_qc-effects/index.html`.

For the IframeManager class itself: `wpforms-interactions.js:103`. For the Cursor class: `motion-primitives.js:380`. Other interactions (`openSettingsTab`, `addNotification`, `insertSmartTag`, `selectFromDropdown`, `addConditionalLogicRule`, etc.) are also IframeManager methods — grep `wpforms-interactions.js` for the method name to find its line.

## Library scope philosophy

The library codifies **hard-won patterns**: interactions where a naive implementation would re-introduce a bug already solved here, or multi-step choreography that benefits from being standardized once. Everything else stays inline in the per-video HTML.

The library is a starting reference, not an exhaustive vocabulary. Future videos should compose from the shared primitives where they fit, then write small inline DOM puppetry for one-off beats, the same way old engine-path chapter `effect({ doc, cursor, sleep, ... })` callbacks composed engine helpers with local DOM mutations.

### When NOT to add to the library

An interaction earns library status only if it meets at least **2 of 3**:

1. **Hard-won pattern test:** the naive implementation re-introduces a bug. Examples that pass: faux-native dropdown, smart-tag chip insertion, cream-flash-free snapshot swap, cursor anti-frenzy, caret-drift fix.
2. **Multi-step choreography test:** 3 or more sequential UI steps with timing/coordination between them. Examples that pass: `addConditionalLogicRule`, `dragFieldToForm`, `duplicateNotificationBlock`.
3. **Recurrence test:** the same exact pattern appears in 3 or more separate videos, or 3 or more separate WPForms.com docs.

**Bonus: pattern abstracts over class-name volatility.** Helpers that paper over content-hashed SaaS class names (Klaviyo, Mailchimp, Stripe dashboards use unstable `.sc-jTrPJq`-style classes) earn promotion easily — they survive re-captures that would break class-based selectors. Examples: `findInIframeByText`, `glideToText` in `videos/_shared/iframe-helpers.js`. These belong in the library even at 2 uses because every future SaaS-captured video benefits.

An interaction failing all three is **inline territory**. Write it in the master timeline:

```js
// Inline example - toggle a setting control.
const toggle = iframeManager.doc().querySelector('#wpforms-panel-field-settings-foo');
await cursor.glide(iframeManager.elementToStageCoords(toggle));
await cursor.click();
toggle.checked = true;
toggle.dispatchEvent(new (iframeManager.iframe().contentWindow.Event)('change', { bubbles: true }));
```

In the new single-HTML video pattern, the master timeline composes library calls and inline DOM puppetry per beat:

```js
const tl = gsap.timeline({ paused: true });

// Use library where it fits: hard, multi-step, or recurring.
tl.add(() => interactions.openFieldOptions(48));
tl.add(() => interactions.dragFieldToForm('email'));

// Write inline for one-offs: simple, singleton, specific to this video.
tl.add(async () => {
  const doc = iframeManager.doc();
  const labelInput = doc.querySelector('#wpforms-field-option-48-label');
  await cursor.glide(iframeManager.elementToStageCoords(labelInput));
  await cursor.click();
  await typeIntoIframeInput(labelInput, 'Your Email Address');
});

// Compose library + inline freely.
tl.add(() => cinematicFlight(camera, { from: posA, to: posB }));
```

The "system knowing what to do" is the author composing this from a storyboard. The shared library is reference vocabulary; the per-video timeline is where video-specific logic belongs.

Avoid pre-promoting single-click or simple typewriter wrappers. When tempted to add methods like these, stop and keep the beat inline:

- `setXFieldValue(fieldId, value)` - use `cursor.click` plus `typeIntoIframeInput`.
- `toggleXSetting(fieldId)` - use `cursor.click(toggle)`.
- `setXActive(blockSel, state)` - use `cursor.click(badge)`.
- `collapseX(blockSel)` - use `cursor.click(caret)`.
- `expandX(groupSel)` - use `cursor.click(header)`.

Actual Wave 2 Batch A examples to treat carefully: `setNotificationActive`, `collapseNotificationBlock`, `expandSettingsSection`, `toggleSettingControl`, `editNotificationName`, `setNotificationSubject`, `setNotificationMessage`, and `setNotificationSendTo`. These are useful references, but do not use them as permission to add every future single-click or input-fill variant to the shared library.

After a video ships, review its inline DOM puppetry blocks. If the same pattern appears in 3+ videos with the same shape, then promote it. Pre-promotion is over-promotion.

### Inline DOM puppetry — rules (fix-round B7)

- **The IframeManager accessors are `doc()`, `query()`, `queryAll()`, `iframe()`, `elementToStageCoords()`, `elementToStageRect()`, `currentSlug()`.** There is no `getDocument()` — guessing an accessor name and guarding it with `obj.method && obj.method()` no-opped every puppetry call in a shipped v1 (mp A; the call-it-and-let-it-throw rule lives in `wpforms-gsap-rules`).
- **Text-match on leaves, act on the known-class ancestor** (mp D): `textContent` bubbles — matching `p, div` by prefix returned the CONTAINER holding the form and hid it (9s white screen). Constrain text-matched selection to leaf-ish nodes, then climb to the closest known-class ancestor. `findInIframeByText` in `iframe-helpers.js` already climbs correctly — prefer it over hand-rolled text matching.
- **Teaching-CSS injection needs specificity armor** (ccs 22/A19): injected demo CSS uses `!important` or an ID-scoped selector — bare `.wpforms-form` (0,1,0) loses to the theme's `div.wpforms-container-full .wpforms-form` (0,2,1) and the "demo" silently does nothing. Its probe asserts COMPUTED style on the real elements, never the injected string.

## Decision flow

Before writing any of the following, scan this skill:

1. **GSAP cursor tween** → use `Cursor` class from `videos/_shared/motion-primitives.js`. Do not mount a cursor element by hand.
2. **Camera move on an editorial / postIntro / cinematic beat** → use `cinematicFlight` (intra-snapshot), `figjamFlight` (inter-snapshot zoom-out-then-zoom-in reveal), or `focusStationOverview` (tutorial polish arc). Hand-written single-tween translate+scale is a `wpforms-motion-audit` automatic-C ceiling per HARD RULE 3.
3. **Letter-by-letter typing** → `caretType`. Do not stagger char spans (the caret-drift bug).
4. **Persistent status label morphing through 2+ texts** → `statusPillMorph`.
5. **Marker / highlighter sweep behind text** → `markerSweep`.
6. **Per-field cascade reveal during AI generation or template apply** → `fieldStaggerReveal`.
7. **Persistent Sullie brand anchor** → `mountSullieBug` (polished rest-api pattern).
8. **Clean exit out of a focused card back to overview** → `cleanFastRejoin` (no blur smear).
9. **Standard WPForms admin / builder interaction** (Add New, Select Template, Drag Field, Open Settings, etc.) → call the matching method on `WPFormsInteractions` from `videos/_shared/wpforms-interactions.js`. Do not hand-roll click + swap + wait sequences.
10. **Snapshot-iframe slot with crossfade swap** → use `IframeManager` from `wpforms-interactions.js` — the ONE iframe mount for every film: tutorials (the skeleton mounts it), mixed films and any editorial scene that needs a real product surface. There is no other iframe host; the engine's was retired 2026-08-22.
11. **Glide cursor to an iframe element, scroll-into-view + click** (the recurring 4-10× pattern across single-HTML videos) → `glideClick({ iframeManager, cursor }, target, opts)` from `videos/_shared/iframe-helpers.js`. Wraps the entire `try { scrollIntoView + elementToStageCoords + glide + click } catch (warn)` choreography.
12. **Interact with text in a SaaS-captured iframe** (Klaviyo, Mailchimp, Stripe — anything with content-hashed class names like `.sc-jTrPJq`) → `findInIframeByText(ifm, 'Settings')` or `glideToText({ ifm, cursor }, 'Settings', opts)` from `iframe-helpers.js`. Text content is stable across re-captures; class names are not.

If your beat genuinely needs something neither library covers, **flag it to the user** — primitives are a separate task, not a quick fix.

## Library 3 — `videos/_shared/iframe-helpers.js`

Authoring helpers built on top of IframeManager + Cursor. Each earns library status by recurrence (10× for `glideClick` in Klaviyo v11 alone) or class-name-volatility-bonus (text-based queries paper over content-hashed SaaS class names).

| Helper | When | Signature | Source |
|---|---|---|---|
| `findInIframeByText(iframeManager, text, opts?)` | Find a clickable element by VISIBLE TEXT inside iframe. For SaaS dashboards where class names are content-hashed `.sc-jTrPJq` and unstable across re-captures. Walks from text node → nearest clickable ancestor; skips hidden duplicates. | `(ifm, text, { clickableSelector?, maxDepth? })` → Element\|null | `iframe-helpers.js:30` |
| `glideClick({ iframeManager, cursor }, target, opts?)` | The 10×-recurring pattern: scrollIntoView + elementToStageCoords + cursor.glide + cursor.click, all in one defensive try/catch. Catches the empty-rect throw (INV-12 signal) and the cursor null-guard. Logs failure, doesn't crash the timeline. Off-frame click points auto-recenter (closed loop) since 2026-09-02 — `recenter: false` restores warn-and-proceed for deliberate off-frame clicks. | `(ctx, target, { click?, scroll?, glideDuration?, via?, ripple?, rippleColor?, silent?, recenter?, dispatch? })` → Promise<Element\|null> — `dispatch: true` fires a real bubbling `click` MouseEvent into the iframe doc after the visual click so registered interactivity handlers run (`Cursor.click()` alone is visual-only) | `iframe-helpers.js:96` |
| `glideToText({ iframeManager, cursor }, text, opts?)` | Convenience: `findInIframeByText` + `glideClick`. The shortest path to "click that 'Settings' link in the Klaviyo dashboard." | `(ctx, text, opts)` → Promise<Element\|null> | `iframe-helpers.js:165` |
| `flyToElement({ iframeManager }, target, opts?)` | **The tutorial camera move.** Decomposed dip/pan → named-ease land arc to frame an iframe element. A bare `cameraToElement` + single `tweenCamera` reads as a slide projector and caps the motion audit at tier B — this helper is the audit-clean default for every single-HTML tutorial zoom. Iframe zoom ≤ 2.0 default (CSS pixel-doubling sharpness limit). | `(ctx, target, { fill?, pad?, maxZoom?, duration?, silent? })` → Promise<pose\|null> | `iframe-helpers.js` (FIX-1 fa-retest 2026-07-13) |
| `settleAndMeasure(iframeManager, target, opts?)` | Wait for a stable stage rect on late-loading pages before deriving any position from it (ccs 7: layout grew ~180px after `load`). Two consecutive identical reads through the library's own projection. | `(ifm, target, { epsilon?, interval?, timeout?, silent? })` → Promise<rect\|null> | `iframe-helpers.js` (fix-round C2) |
| `paneScrollTo(iframeManager, target, opts?)` | Closed-loop INNER-PANE scroll (builder settings panes). Walks UP to the real scroller (hidden 0×0 twins defeat querySelector — bac 5), measures via `elementToStageCoords`, corrects scrollTop by residual/zoom, iterates ≤3. Camera move first, then this centers inside the clamp. | `(ifm, target, { duration?, anchor?, tolerance? })` → Promise<Element\|null> | `iframe-helpers.js` (fix-round C2, promoted from bac 5) |
| `pageCenter(iframeManager, target, opts?)` | Closed-loop WINDOW scroll for live frontend pages, ≤4 iterations + a post-settle re-check for late image decodes (nvc 4: ~1300px reflow after the scroll landed). | `(ifm, target, { duration?, anchor?, tolerance?, recheckDelay? })` → Promise<Element\|null> | `iframe-helpers.js` (fix-round C2, promoted from nvc 4) |
| `reflowSubject(ifmOrDoc, opts)` | Re-layout as SHOT DESIGN, not probe damage-control: cap the subject to a width (default 560), center it, hide columns/rows, un-stick sticky cells (which pin to the full-width container edge no matter how narrow the table — ssn probe r2 measured Δx +1059 AFTER the width cap). Degrade-don't-throw `{applied, missing}`. Call BEFORE the camera move. | `(ifmOrDoc, { targets, maxWidth?, center?, hideColumns?, hideRows?, unstick? })` → `{applied, missing}` | `iframe-helpers.js` (C-SPEC C2, promoted from nvc/cc/ssn) |
| `awaitLayout(ifm, target, { timeout = 1.5 })` | Poll until the target exists AND has layout (post-swap sections lay out late; hidden panel twins skipped for string targets). The 19-film inline shape, promoted (AP-10). | `(ifm, target, opts)` → Promise<Element\|null> | `iframe-helpers.js` (AP-10, 2026-09-02) |
| `inCameraView(ifm, el, margin = 20)` | Centre-point test against the current camera window — beware: a partially cropped wide element still reads "in view" (force the fly for taught elements, sfb 6). | `(ifm, el, margin)` → boolean | `iframe-helpers.js` (AP-10) |
| `flyCentered({ iframeManager }, target, opts?)` | Deep-below-fold pattern, 3-for-3 across films (ee 4 / geo 4): awaitLayout → flyToElement → closed-loop centre INSIDE the clamp (paneScrollTo/pageCenter, ~0.7s budget). | `(ctx, target, flyOpts + { anchor?, centerDuration?, timeout? })` → Promise<Element\|null> | `iframe-helpers.js` (AP-10) |
| `gcFramed({ iframeManager, cursor }, target, opts?)` | The framed action: awaitLayout → fly-if-outside (`flyOpts` — even `{}` — forces it) → closed-loop centre → `glideClick(..., { scroll: false })`. Portrait films pass `flyFn` (their punch/pan wrapper). | `(ctx, target, { flyOpts?, flyFn?, timeout?, ...glideClick opts })` → Promise<Element\|null> | `iframe-helpers.js` (AP-10) |
| `prepOnSwap(ifm, prepFn)` | **The swap-reapply trap, made impossible to forget:** a swap replaces the document and silently reverts every inline reflow — three films rediscovered this independently. Runs prepFn(doc) now AND after every load/swap on THIS instance (monkey-patches the instance, never the prototype). | `(ifm, prepFn)` → `{dispose}` | `iframe-helpers.js` (C-SPEC C2) |

Source: Klaviyo tutorial v11 retro 2026-05-12 (`docs/sound-design-reference-2026-05-12.md` is unrelated; the retro lives in commit messages + this skill).

## Library 1 — `videos/_shared/motion-primitives.js`

Standalone primitives (only depend on GSAP + browser APIs). Determinism-safe.

QC: open `videos/_qc-primitives/index.html` in the preview server. Each card links to a live demo. Statuses shown there are authoritative.

### ⚠ Return contract — "do I need `.play()`?"

The Signature column's return type IS the contract (FIX-16):

- **`→ paused timeline`** — renders NOTHING until you call `.play()` or `tl.add()` it into a running master timeline. Composing one at cue-time and forgetting `.paused(false)` is a silent-failure trap (FA ad addendum #26). Applies to: `cinematicFlight`, `figjamFlight`, `focusStationOverview`, `statusPillMorph`, `markerSweep`, `fieldStaggerReveal`.
- **`→ UNPAUSED tween/timeline`** — starts playing the moment you call it (deliberate, per its regression-guard). `tl.add()`-ing it re-schedules it under the master. Applies to: `caretType`, `typeIntoIframeInput`, `clickRipple`.
- **`→ Promise`** — await it (through `withTimeout` if top-level — INV-17); there is nothing to play. Applies to: `Cursor` methods, `popOut`, `cleanFastRejoin`.

### Camera

| Primitive | When | Signature | QC status | Source |
|---|---|---|---|---|
| `cinematicFlight(camera, opts)` | Intra-snapshot multi-phase camera move. Single best fit for any "flight between two poses" with a scale dip. 5 phases: anticipation → outbound (dip) → inbound (recover) → land+hold → optional micro-zoom. | `{ from, to, anticipationDuration?, flightDuration?, landHold?, scaleDipFactor?, rotationTilt?, microZoom? }` → paused timeline | **ready** | `motion-primitives.js:100` |
| `figjamFlight(camera, opts)` | Inter-snapshot / virtual-board flight. 3-act: zoom out only → translate at wide scale → zoom in only. Use when the storyboard's payoff is the wide reveal between A and B. | `{ from, to, wide, anticipationDuration?, zoomOutDuration?, translateDuration?, zoomInDuration?, landHold? }` → paused timeline | **ready** | `motion-primitives.js:195` |
| `focusStationOverview(camera, opts)` | Tutorial-grade focus → station → overview arc with a short 120ms anchor hold. Polished rest-api shape. Each move uses `expo.inOut`. | `{ focusPose, stationPose?, overviewPose, focusDuration?, holdAtFocus?, stationDuration?, overviewDuration?, anchorHold? }` → paused timeline | **ready** | `motion-primitives.js:272` |
| `cameraToElement(iframeManager, selector, opts)` | Measure-driven tutorial zoom. Use to frame a real iframe element before passing the returned pose into `cinematicFlight`. | `{ fill?, pad?, anchor? }` → `{ x, y, scale }` | **draft** — needs QC | `motion-primitives.js:310` |

### Cursor

| Primitive | When | Notes | QC status | Source |
|---|---|---|---|---|
| `new Cursor(stage, opts)` | Mount a single cursor element on a stage. Use this for every cursor in editorial / single-HTML and any video-local cursor work. Built-in anti-frenzy guards (kill-tweens on each new move). | Methods: `.glide({x,y}, opts)`, `.click(opts)` (squash + ripple), `.hover({x,y}, { target?, hoverScale?, hoverGlow? })`, `.drag(from, to, { ghostSource? })`, `.setPos(x,y)`, `.pos()`, `.remove()` | **ready** | `motion-primitives.js:320` |
| `Cursor.glide(to, { via })` | Use when cursor motion needs the winning-pattern curved arc instead of a straight line. Splits one glide into a 55% waypoint leg and 45% target leg. | `.glide({x,y}, { via: {x,y}, duration? })` → Promise | **draft** — needs QC | `motion-primitives.js:442` |
| `clickRipple(stage, x, y, opts)` | Standalone ripple at a stage point, decoupled from the Cursor instance. Prefer `Cursor.click()` when a cursor is on stage. | `{ color?, scale?, duration? }` → **UNPAUSED** timeline (self-playing) | covered by Cursor QC | `motion-primitives.js:689` |
| `cursorGlideStraight(cursor, from, to, opts)` | **DEPRECATED.** Kept for back-compat with the cursor-glide-straight QC page. New code uses `Cursor`. | — | deprecated | `motion-primitives.js:665` |

### Text / typing

| Primitive | When | Signature | QC status | Source |
|---|---|---|---|---|
| `caretType(el, text, opts)` | Letter-by-letter typing into a text element with a blinking caret. Avoids the caret-drift bug from opacity-stagger char spans. | `{ charDuration?, caretHtml? }` → **UNPAUSED** tween (self-playing) | **ready** | `motion-primitives.js:735` |
| `typeIntoIframeInput(input, text, opts)` | Type into a real iframe `<input>` / `<textarea>` and fire JS listeners. Use when WPForms option inputs or live mirrors need per-character `input` events. | `{ cps?, clear?, change? }` → **UNPAUSED** tween (self-playing) | **draft** — needs QC | `motion-primitives.js:844` |
| `statusPillMorph(pill, texts[], opts)` | Single persistent pill morphs through a sequence of labels char-by-char ("Thinking… / Filling field… / Checking formatting…"). | `{ holdEach?, morphDuration? }` → paused timeline | **ready** | `motion-primitives.js:770` |
| `markerSweep(textEl, opts)` | Highlight sweep behind text with color flip inside. WPForms orange default. | `{ color?, duration? }` → paused timeline | **ready** | `motion-primitives.js:822` |

### Highlight / pop-out

| Primitive | When | Signature | QC status | Source |
|---|---|---|---|---|
| `popOut(iframe, selector, opts)` | Pull a real iframe-doc element forward as a 2.5D card lifted into the parent doc. Clones + inlines computed styles + materializes pseudo-elements. Multi-layer shadow stack at peak. No dimmer. **The "money shot" for real-UI ads** — used on the real goal-met arrow in a form analytics ad (v3+v4) (worked under camera zoom 2.0, through withTimeout). | `{ tilt?, tiltX?, lift?, perspective?, riseMs?, holdMs?, fallMs?, hideOriginal?, shadow?, border?, stripTextShadow?, caption? }` → Promise | **proven in production** (fa-retest 2026-07-13) | `motion-primitives.js:911` |

### Field / form

| Primitive | When | Signature | QC status | Source |
|---|---|---|---|---|
| `fieldStaggerReveal(fields, opts)` | Per-field rise + un-blur + fade-in with stagger. AI-generation field-reveal pattern, also the template-apply cascade. | `{ duration?, stagger?, rise?, blurFrom? }` → paused timeline | **ready** | `motion-primitives.js:1080` |

### Tutorial polish

| Primitive | When | Signature | QC status | Source |
|---|---|---|---|---|
| `mountSullieBug(opts)` | Persistent brand anchor — Sullie bottom-right with subtle 6px yoyo float (bounded, deterministic). Polish-vocabulary "persistent-brand-anchor" — mount once, keep across chapters. | `{ src?, id?, position? }` → HTMLElement (idempotent) | **ready** | `motion-primitives.js:1118` |
| `cleanFastRejoin(target, opts)` | Polished rest-api exit pattern: 500ms breathe → scale 1.02 + sine.in 0.35s → reveal shared anchor → 120ms hold → 180ms layer fade. No blur smear. | `{ breatheDuration?, exitDuration?, exitScale?, onSharedAnchor?, onPanToOverview?, layer? }` → Promise | **ready** | `motion-primitives.js:1179` |

### Utilities

| Primitive | When | Signature | Source |
|---|---|---|---|
| `boundedRepeats(cycle, visible)` | Compute finite `repeat:` count from a cycle duration + total visible duration. Replaces `repeat: -1` (which violates GSAP L0 rule 7, is a `validate-singlehtml` ERROR, and breaks every frame-stepped seek: `tools/probe-singlehtml.js`, `tools/storyboard-sheet.js`, a seek-mode render). | `(cycleDuration, visibleDuration) → number` | `motion-primitives.js:46` |
| `mulberry32(seed)` | Seeded PRNG factory. Use anywhere `Math.random()` would have appeared. Self-contained in the library. | `(seed) → () => number` | `motion-primitives.js:58` |
| `loadNarrationManifest(slug)` | Optional single-HTML narration manifest probe. Returns null when the video only has raw mp3 files. | `(slug) → Promise<object|null>` | `narration.js:37` |
| `playNarration(slug, key, opts)` | Play one narration clip and duck active BGM until the clip ends. | `(slug, key, { keepDucked?, volume? }) → Promise<void>` | `narration.js:103` |
| `startBGM(src, opts)` / `stopBGM(opts)` | Start, fade, duck, restore, and stop a portable music bed without engine/player coupling. | `(src, { volume?, fadeIn? })`, `({ fadeOut? })` | `narration.js:62` |
| `setNarrationBase(path)` / `cleanupAudio()` | Override mp3 base path and release narration/BGM resources when a single-HTML video closes. | `(path)`, `() → Promise<void>` | `narration.js:26`, `narration.js:135` |

## Library 2 — `videos/_shared/wpforms-interactions.js`

High-level interaction sequences that drive real WPForms selectors. Built on top of motion-primitives (re-exports `Cursor` + `clickRipple`).

QC: open `videos/_qc-interactions/index.html` in the preview server. Wave 1 is built and in active QC iteration; check the QC index for the current per-interaction status before relying on one in production.

### IframeManager (helper)

| Class / method | Use |
|---|---|
| `new IframeManager(stage, opts)` | Mount a snapshot iframe slot inside a stage. Renders at native captured viewport (default 1444×900) and CSS-scales to stage viewport (default 1280×720). |
| `.load(slug)` / `.swap(slug, opts)` | Load a snapshot, or crossfade to a different one. No flash-guard cover needed — both iframes coexist during the fade. |
| `.query(selector)` / `.queryAll(selector)` | Run a selector against the iframe document. |
| `.elementToStageCoords(target)` | Convert an iframe-doc element (or selector) to its center point in stage-local coords. **This is what `Cursor.glide` consumes.** |
| `.elementToStageRect(target)` | Convert an iframe-doc element (or selector) to a full stage-local `{ x, y, w, h }` rect for camera/highlight helpers. |
| `.highlightElement(target, opts)` | Project a ring + optional label over a real iframe element in stage coords. Use for tutorial callouts that need engine-highlight parity. |
| `.scrollIntoView(target, opts?)` | Scroll the iframe-doc element into view. Default `behavior: 'instant'` to beat snapshot CSS that ships `scroll-behavior: smooth`. |
| `.doc()` / `.iframe()` / `.currentSlug()` | Accessors. |
| `.wait(seconds)` | `setTimeout`-backed wait that survives backgrounded preview throttling. |

Source: `wpforms-interactions.js:66`.

### WPFormsInteractions methods (Wave 1)

Constructor: `new WPFormsInteractions(stage, cursor, iframeManager)`. Each method below assumes you've called `iframeManager.load(<prereq>)` first; methods enforce the prerequisite via `_assertSnapshot` and throw a useful error otherwise.

JSDoc convention in the source: `@prerequisite` (required snapshot), `@operation` (`snapshot-swap` / `dom-only` / `hybrid`), `@endsAt` (snapshot after the call), `@primitives` (which motion-primitives are used), `@realDom` (the captured selector), `@duration` (approximate runtime).

#### Admin-side

| Method | What it does | Prereq → Ends at | Op | Source |
|---|---|---|---|---|
| `navAddNewForm(opts?)` | Click the orange "Add New" button in the All Forms header, crossfade to the template library. | `admin-forms-overview` → `admin-templates` | snapshot-swap | `wpforms-interactions.js:460` |
| `selectTemplate(slug, opts?)` | Pick a template card by `data-slug`. Scrolls in, hover-reveals the action buttons, clicks the primary action ("Create Blank Form" / "Use Template" / "Generate Form" per variant). Does NOT swap by itself — the handoff to `builder-setup` belongs to a separate call. | `admin-templates` → `admin-templates` (with active card) | hybrid | `wpforms-interactions.js:485` |
| `navWPFormsSidebarMenu(item, opts?)` | Click a WPForms submenu item in the WordPress sidebar. Strips the "NEW!" badge before matching by visible text. Optional `swap: false` to click without swap. | any admin-* or builder-* → mapped snapshot (see `WPF_SIDEBAR_TARGETS` in source) | snapshot-swap | `wpforms-interactions.js:587` |
| `openFormInList(formId, opts?)` | Click a form-row title to open it in the builder. Applies per-form profile after swap so the three demo forms don't all look like the all-fields fixture. | `admin-forms-overview` → `builder-fields` | snapshot-swap | `wpforms-interactions.js:627` |
| `applyFormProfile(formId)` | Public form-profile apply (sets toolbar + canvas form name + hides non-allowed fields). Use directly when mounting on `builder-fields` without going through `openFormInList`. | `builder-fields` | dom-only | `wpforms-interactions.js:665` |

#### Builder-side

| Method | What it does | Prereq → Ends at | Op | Source |
|---|---|---|---|---|
| `dragFieldToForm(fieldSlug, opts?)` | Full visual drag from the left palette to the canvas: glide → press → ghost-clone carry → FLIP-reveal landing field at ~58% of carry → drop + fade. Mid-drag reveal makes the canvas grow BEFORE the ghost lands. `opts.camera: 'follow'` (RECOMMENDED for new films, AP-11) tweens the camera to the landing field over the carry — the camera holds the SUBJECT, never pre-frames the destination (rulebook §4; sfc 6). Default `'hold'` = pre-2026-09-02 behaviour. | `builder-fields` → `builder-fields` (+1 field) | dom-only | `wpforms-interactions.js:730` |
| `openFieldOptions(fieldId, opts?)` | Click a canvas field, swap the left panel from "Add Fields" to "Field Options," and expose the field's specific option panel. | `builder-fields` → `builder-fields` (options open) | dom-only | `wpforms-interactions.js:989` |
| `navBuilderSidebar(section, opts?)` | Click a builder panel button (`setup` / `fields` / `settings` / `providers` / `payments` / `revisions`) and swap to the corresponding `builder-*` snapshot. `providers` is the slug for the Marketing panel. | any `builder-*` → mapped `builder-*` | snapshot-swap | `wpforms-interactions.js:1261` |
| `openSettingsTab(tab, opts?)` | Click a Settings sub-tab (`general` / `notifications` / `confirmation` / `anti_spam` / `themes`) and swap to the corresponding `builder-settings-*`. | `builder-settings-*` → `builder-settings-<tab>` | snapshot-swap | `wpforms-interactions.js:1292` |

#### Field-option sub-interactions

After `openFieldOptions(fieldId)` exposes a panel, these drive specific sub-controls. Each updates the option DOM AND mirrors the change onto the canvas field so the viewer sees the form update live.

| Method | What it does | Source |
|---|---|---|
| `setFieldLabel(fieldId, newLabel, opts?)` | Click the Label input, clear it, letter-type the new label with per-char canvas mirror. | `wpforms-interactions.js:1045` |
| `setNameFormat(fieldId, format)` | Switch a Name field between `simple` / `first-last` / `first-middle-last`. Builds a fake dropdown overlay (the native `<select>` popover can't be visually driven), clicks the option, flips the canvas wrapper's `format-selected-*` class. | `wpforms-interactions.js:1094` |
| `toggleEmailConfirmation(fieldId, on?)` | Flip the Enable Email Confirmation toggle. Click the visible slider (not the hidden checkbox), update both the option control and the canvas `wpforms-confirm-enabled/disabled` class. | `wpforms-interactions.js:1221` |

#### Wave 2 Batch A — Notifications + Conditional Logic

Use these for Settings → Notifications, smart tags, generic settings controls, and notification conditional logic. QC pages live under `videos/_qc-interactions/` and are draft until approved.

| Method | What it does | Source |
|---|---|---|
| `addNotification(opts?)` | Click Add New Notification, complete the modal prompt, clone a real notification block, and slide the new block in. | `wpforms-interactions.js:1563` |
| `editNotificationName(blockSel, newName)` | Click a block edit pencil, type a replacement name, and update the block header label. | `wpforms-interactions.js:1609` |
| `setNotificationSendTo(blockSel, value)` | Insert a smart-tag chip into a notification's Send To Email Address field. | `wpforms-interactions.js:1644` |
| `setNotificationSubject(blockSel, text)` | Type into a notification's Email Subject Line input with input/change events. | `wpforms-interactions.js:1667` |
| `setNotificationMessage(blockSel, text)` | Type into a notification's Email Message textarea with input/change events. | `wpforms-interactions.js:1691` |
| `openSmartTagPicker(fieldSel, opts?)` / `closeSmartTagPicker()` | Lower-level smart-tag picker controls for hand-scripted beats. | `wpforms-interactions.js:1715` |
| `insertSmartTag(fieldSel, opts?)` | Open the smart-tag picker, pick a real dropdown item, insert a chip, and close the picker. | `wpforms-interactions.js:1770` |
| `selectFromDropdown(fieldWrapSel, value)` | Generic faux-dropdown for any native WPForms `<select>` inside a field wrap. | `wpforms-interactions.js:1813` |
| `toggleSettingControl(fieldWrapSel, state?)` | Generic WPForms toggle-control for any checkbox slider in settings panels. | `wpforms-interactions.js:1853` |
| `duplicateNotificationBlock(blockSel, opts?)` | Click a notification clone icon, clone the block DOM, and slide in the duplicate. | `wpforms-interactions.js:1888` |
| `setNotificationActive(blockSel, isActive)` | Toggle and update a notification block's Active / Inactive badge. | `wpforms-interactions.js:1920` |
| `collapseNotificationBlock(blockSel)` | Click the block caret and collapse the notification content area. | `wpforms-interactions.js:1954` |
| `expandSettingsSection(groupSel)` | Expand a collapsed panel-fields group such as Notifications Advanced. | `wpforms-interactions.js:1982` |
| `addConditionalLogicRule(opts?)` | Enable notification conditional logic and populate one Field / Operator / Value rule. | `wpforms-interactions.js:2014` |

## When NOT to use these

- **Not "instead of the skeleton's own wiring"** — tutorials use these libraries DIRECTLY in the single-HTML film (`IframeManager` + `Cursor` + `WPFormsInteractions` + `glideClick`/`flyToElement` are what `docs/examples/single-html-tutorial-skeleton.html` mounts). The engine helpers (`ctx.cursor`, `ctx.swapToSnapshot`) were retired 2026-08-22 and must not be reached for. One film has ONE cursor (the skeleton's `Cursor`); never mount a second.
- **Pure-editorial videos** that don't need real WPForms surface — skip `wpforms-interactions.js` entirely; motion-primitives alone is enough.- **One-off motion** that genuinely doesn't match any primitive — write it locally in the video package, document why no primitive fit, and flag it as a candidate for promotion. Do not "almost-fit" a primitive into the wrong shape.

## References

- `videos/_shared/motion-primitives.js` — full source + inline JSDoc rationale + citation back to the lessons docs.
- `videos/_shared/wpforms-interactions.js` — full source + per-method `@prerequisite`/`@endsAt`/`@realDom` JSDoc.
- `videos/_qc-primitives/index.html` — live primitive demos with statuses.
- `videos/_qc-interactions/index.html` — live interaction demos with statuses.
- Per-template button variants, hover-state inventory, sub-interaction notes: read the QC pages above + `tools/inspect-snapshot.js` (the standalone usage doc retired 2026-08-22).
- Identity continuity: one visual element threads the whole story (the rule behind the camera primitives; source postmortem retired 2026-08-22).
- Polish deltas behind `focusStationOverview`, `mountSullieBug`, `cleanFastRejoin`: land-holds, shadow stacks, brand-true colors (source doc retired 2026-08-22).

## See Also

- `wpforms-gsap-rules` — L0 GSAP discipline + L1 camera-decomposition. The camera primitives here are the executable form of L1.
- `wpforms-motion-audit` — HARD RULE 3 caps re-invented camera moves at C. Use this skill's primitives to clear the ceiling.
- `wpforms-postintro` — every postIntro should compose from these primitives (Cursor + caretType + statusPillMorph + fieldStaggerReveal are direct fits for the multi-animation rule).
- `wpforms-video` — tutorial chapters that include standard navigation flows should compose from `wpforms-interactions.js`, not hand-roll click+swap sequences.
- `wpforms-marketing` — single-HTML / editorial clones combine these primitives with the blocks library + atmospheric kit + text-kit.
- `wpforms-marketing` — *Snapshot transitions*: `figjamFlight` covers the camera arc; `ifm.swap()` crossfades between snapshots.
