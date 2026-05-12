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
| **Defensive scroll + glide + click** | `glideClick({iframeManager, cursor}, target, opts)` | `(deps, el, opts) → Promise` | iframe-helpers.js:121 |
| Find iframe element by visible text | `findInIframeByText(ifm, text, opts)` | `(ifm, str, opts) → Element` | iframe-helpers.js:45 |
| Glide+click an iframe element by text | `glideToText({iframeManager, cursor}, text, opts)` | `(deps, str, opts) → Promise` | iframe-helpers.js:183 |
| Click "Add New Form" in admin | `ifm.navAddNewForm(opts)` | `IframeManager method` | wpforms-interactions.js:1385 |
| Pick a template by slug | `ifm.selectTemplate(slug, opts)` | `IframeManager method` | wpforms-interactions.js:1410 |
| Drag a field into form builder | `ifm.dragFieldToForm(slug, opts)` | `IframeManager method` | wpforms-interactions.js:1655 |
| Open a field's option panel | `ifm.openFieldOptions(fieldId, opts)` | `IframeManager method` | wpforms-interactions.js:1914 |

For the IframeManager class itself: `wpforms-interactions.js:103`. For the Cursor class: `motion-primitives.js:380`. Other interactions (`openSettingsTab`, `addNotification`, `insertSmartTag`, `selectFromDropdown`, `addConditionalLogicRule`, etc.) are also IframeManager methods — grep `wpforms-interactions.js` for the method name to find its line.

## Library scope philosophy

The library codifies **hard-won patterns**: interactions where a naive implementation would re-introduce a bug already solved here, or multi-step choreography that benefits from being standardized once. Everything else stays inline in the per-video HTML / chapter module.

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
10. **Snapshot-iframe slot with crossfade swap inside an editorial chapter** → use `IframeManager` from `wpforms-interactions.js`. (Tutorial chapters keep using the engine's iframe; this is for editorial / single-HTML scenes that need real product surface.)
11. **Glide cursor to an iframe element, scroll-into-view + click** (the recurring 4-10× pattern across single-HTML videos) → `glideClick({ iframeManager, cursor }, target, opts)` from `videos/_shared/iframe-helpers.js`. Wraps the entire `try { scrollIntoView + elementToStageCoords + glide + click } catch (warn)` choreography.
12. **Interact with text in a SaaS-captured iframe** (Klaviyo, Mailchimp, Stripe — anything with content-hashed class names like `.sc-jTrPJq`) → `findInIframeByText(ifm, 'Settings')` or `glideToText({ ifm, cursor }, 'Settings', opts)` from `iframe-helpers.js`. Text content is stable across re-captures; class names are not.

If your beat genuinely needs something neither library covers, **flag it to the user** — primitives are a separate task, not a quick fix.

## Library 3 — `videos/_shared/iframe-helpers.js`

Authoring helpers built on top of IframeManager + Cursor. Each earns library status by recurrence (10× for `glideClick` in Klaviyo v11 alone) or class-name-volatility-bonus (text-based queries paper over content-hashed SaaS class names).

| Helper | When | Signature | Source |
|---|---|---|---|
| `findInIframeByText(iframeManager, text, opts?)` | Find a clickable element by VISIBLE TEXT inside iframe. For SaaS dashboards where class names are content-hashed `.sc-jTrPJq` and unstable across re-captures. Walks from text node → nearest clickable ancestor; skips hidden duplicates. | `(ifm, text, { clickableSelector?, maxDepth? })` → Element\|null | `iframe-helpers.js:30` |
| `glideClick({ iframeManager, cursor }, target, opts?)` | The 10×-recurring pattern: scrollIntoView + elementToStageCoords + cursor.glide + cursor.click, all in one defensive try/catch. Catches the empty-rect throw (INV-12 signal) and the cursor null-guard. Logs failure, doesn't crash the timeline. | `(ctx, target, { click?, scroll?, glideDuration?, via?, ripple?, rippleColor?, silent? })` → Promise<Element\|null> | `iframe-helpers.js:96` |
| `glideToText({ iframeManager, cursor }, text, opts?)` | Convenience: `findInIframeByText` + `glideClick`. The shortest path to "click that 'Settings' link in the Klaviyo dashboard." | `(ctx, text, opts)` → Promise<Element\|null> | `iframe-helpers.js:165` |

Source: Klaviyo tutorial v11 retro 2026-05-12 (`docs/sound-design-reference-2026-05-12.md` is unrelated; the retro lives in commit messages + this skill).

## Library 1 — `videos/_shared/motion-primitives.js`

Standalone primitives (only depend on GSAP + browser APIs). Determinism-safe.

QC: open `videos/_qc-primitives/index.html` in the preview server. Each card links to a live demo. Statuses shown there are authoritative.

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
| `clickRipple(stage, x, y, opts)` | Standalone ripple at a stage point, decoupled from the Cursor instance. Prefer `Cursor.click()` when a cursor is on stage. | `{ color?, scale?, duration? }` → timeline | covered by Cursor QC | `motion-primitives.js:689` |
| `cursorGlideStraight(cursor, from, to, opts)` | **DEPRECATED.** Kept for back-compat with the cursor-glide-straight QC page. New code uses `Cursor`. | — | deprecated | `motion-primitives.js:665` |

### Text / typing

| Primitive | When | Signature | QC status | Source |
|---|---|---|---|---|
| `caretType(el, text, opts)` | Letter-by-letter typing into a text element with a blinking caret. Avoids the wpforms-ai-board caret-drift bug from opacity-stagger char spans. | `{ charDuration?, caretHtml? }` → tween | **ready** | `motion-primitives.js:735` |
| `typeIntoIframeInput(input, text, opts)` | Type into a real iframe `<input>` / `<textarea>` and fire JS listeners. Use when WPForms option inputs or live mirrors need per-character `input` events. | `{ cps?, clear?, change? }` → tween | **draft** — needs QC | `motion-primitives.js:844` |
| `statusPillMorph(pill, texts[], opts)` | Single persistent pill morphs through a sequence of labels char-by-char ("Thinking… / Filling field… / Checking formatting…"). | `{ holdEach?, morphDuration? }` → paused timeline | **ready** | `motion-primitives.js:770` |
| `markerSweep(textEl, opts)` | Highlight sweep behind text with color flip inside. WPForms orange default. | `{ color?, duration? }` → paused timeline | **ready** | `motion-primitives.js:822` |

### Highlight / pop-out

| Primitive | When | Signature | QC status | Source |
|---|---|---|---|---|
| `popOut(iframe, selector, opts)` | Pull a real iframe-doc element forward as a 2.5D card lifted into the parent doc. Clones + inlines computed styles + materializes pseudo-elements. Multi-layer shadow stack at peak. No dimmer. | `{ tilt?, tiltX?, lift?, perspective?, riseMs?, holdMs?, fallMs?, hideOriginal?, shadow?, border?, stripTextShadow?, caption? }` → Promise | **draft** — QC pending | `motion-primitives.js:911` |

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
| `boundedRepeats(cycle, visible)` | Compute finite `repeat:` count from a cycle duration + total visible duration. Replaces `repeat: -1` (which violates GSAP L0 rule 7 and breaks `tools/render.js --seek`). | `(cycleDuration, visibleDuration) → number` | `motion-primitives.js:46` |
| `mulberry32(seed)` | Seeded PRNG factory. Use anywhere `Math.random()` would have appeared. Duplicate of `videos/_shared/kit.js` `mulberry32` so the library has zero internal-kit dependencies. | `(seed) → () => number` | `motion-primitives.js:58` |
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
| `dragFieldToForm(fieldSlug, opts?)` | Full visual drag from the left palette to the canvas: glide → press → ghost-clone carry → FLIP-reveal landing field at ~58% of carry → drop + fade. Mid-drag reveal makes the canvas grow BEFORE the ghost lands. | `builder-fields` → `builder-fields` (+1 field) | dom-only | `wpforms-interactions.js:730` |
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

- **Tutorial chapters** keep using engine helpers (`ctx.cursor`, `ctx.swapToSnapshot`, etc.) — those are wired into the runtime pause/seek pipeline. The libraries here are for editorial / postIntro / single-HTML work where there is no engine ctx. The engine cursor and the `Cursor` class are different objects; do not mix in one beat.
- **Pure-editorial videos** that don't need real WPForms surface — skip `wpforms-interactions.js` entirely; motion-primitives alone is enough. (See `reference/html-templates/` clones for the canonical shape.)
- **One-off motion** that genuinely doesn't match any primitive — write it locally in the video package, document why no primitive fit, and flag it as a candidate for promotion. Do not "almost-fit" a primitive into the wrong shape.

## References

- `videos/_shared/motion-primitives.js` — full source + inline JSDoc rationale + citation back to the lessons docs.
- `videos/_shared/wpforms-interactions.js` — full source + per-method `@prerequisite`/`@endsAt`/`@realDom` JSDoc.
- `videos/_qc-primitives/index.html` — live primitive demos with statuses.
- `videos/_qc-interactions/index.html` — live interaction demos with statuses.
- `docs/wpforms-interactions-library-2026-05-11.md` — interaction-library usage doc (per-template button variants, hover-state inventory, sub-interaction notes).
- `docs/winning-pattern-analysis-2026-05-10.md` — identity-continuity rule + 5-variable winning pattern that motivated the camera primitives.
- `docs/polish-vocabulary-2026-05-11.md` — polished-vs-unpolished rest-api deltas behind `focusStationOverview`, `mountSullieBug`, `cleanFastRejoin`.

## See Also

- `wpforms-gsap-rules` — L0 GSAP discipline + L1 camera-decomposition. The camera primitives here are the executable form of L1.
- `wpforms-motion-audit` — HARD RULE 3 caps re-invented camera moves at C. Use this skill's primitives to clear the ceiling.
- `wpforms-postintro` — every postIntro should compose from these primitives (Cursor + caretType + statusPillMorph + fieldStaggerReveal are direct fits for the multi-animation rule).
- `wpforms-video` — tutorial chapters that include standard navigation flows should compose from `wpforms-interactions.js`, not hand-roll click+swap sequences.
- `wpforms-marketing` — single-HTML / editorial clones combine these primitives with the blocks library + atmospheric kit + text-kit.
- `wpforms-transitions` — `figjamFlight` covers the camera arc for cross-snapshot reveals; `flipBridge` still handles the actual snapshot swap.
