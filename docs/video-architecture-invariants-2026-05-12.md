# Video Architecture Invariants — 2026-05-12

Hard-learned rules from building the first 3 single-HTML pilots and chasing down the pixel-quality regression. These are NOT preferences — they are physics-of-browser-rendering rules. Breaking any one re-introduces a class of bugs we've already paid the cost to find.

## Why this doc exists

Across this session we hit three different versions of the SAME architectural mistake — applying a CSS transform to an element whose rendering quality matters. Each variant looked plausible at write time and produced visible blur at QC time. The fixes are mechanical; the underlying principle is one rule.

Document them here so future sessions (and future Claude / Codex) don't reinvent the regression.

## The one rule

**Never apply a CSS transform (`scale`, `translate`, `rotate`) to an element whose contents need to render sharp, unless that element is the camera surface itself with its own native rasterization.**

Why: `transform` promotes an element to its own compositor layer. The browser rasterizes the element's contents ONCE at the element's natural CSS dimensions, then samples that texture at the transformed scale. This is bilinear GPU resampling, not CPU re-rendering. Subpixel antialiasing on text dies. Pixel doubling happens beyond 1×.

This applies to:
- Iframes (rasterized at iframe's CSS width × height, sampled when parent or self has transform)
- Stage / wrapper DIVs containing the video content (same compositor flatten)
- Mac-frame chrome around the stage (transform → child text resampled)
- Anything between the viewport and the text you want sharp

## Concrete invariants

Numbered for easy reference in code comments / commit messages.

### INV-1 — Stage at native, no transform
- The `.stage` element is fixed at 1280×720 (or whatever native render resolution the video targets).
- **No `transform: scale()` on the stage**, including from a `fitStage()` helper. Letterbox in the viewport instead; viewport overflow scrolls.
- MP4 capture records at native stage size. Sharp throughout.
- Verified in commit `79081e7` after the editorial pilot QC regression.

### INV-2 — Iframe at native, single direct camera transform
- IframeManager mounts the iframe at the captured snapshot's native viewport (default 1280×720, configurable).
- No pre-scale transform on the iframe (no `transform: scale(0.8864)` to fit into a smaller stage slot — that's the nested-transform bug that hit the QC primitive pages).
- Camera moves apply transform DIRECTLY to the iframe element using the engine.js pattern: `iframe.style.transform = 'scale(z) translate(tx/z, ty/z)'` with `transform-origin: 0 0`.
- At rest (zoom 1, identity transform), iframe rasterizes at the native pixel grid with subpixel AA.
- Soft-zoom at zoom > 2-3× is an accepted engineering trade — same trade engine.js made for 12 production videos. Future zoom-quality work may improve this; treat current state as the floor.
- Verified in commits `aa1432e` (OVERSAMPLE 4→1), `4b563d1` (4 QC primitive pages), and `89075aa` (selector fixes).

### INV-3 — Mac frame is outer chrome only, never a transform parent
- `.mac-frame` wraps the stage area visually with borders, mac-style title bar, shadow.
- **No CSS transform on the mac-frame.** It can have a one-time entrance fade-in opacity transition (0 → 1), and that's it.
- The iframe content INSIDE the mac frame is unaffected by the frame's existence — cursor coord space is `iframeStage`-local (the element inside the mac-body), not stage-local.
- Click targets land correctly because `elementToStageCoords` projects iframe-doc coords to that local space.

### INV-4 — Cursor lives in stage-local coord space
- `new Cursor(iframeStage, { initialX, initialY })` — coords are RELATIVE to the iframeStage element, not the page.
- After any IframeManager swap, cursor position is preserved (stage-local coord stays valid).
- Mac frame chrome around iframeStage does NOT affect cursor coords — chrome is purely visual padding.

### INV-5 — Captured snapshots have RANDOM field IDs
- WPForms admin snapshots are captured against real forms. The Email field in `builder-fields` might be `data-field-id="49"`; in `builder-field-options-email` it might be `data-field-id="2"`. They are unrelated captures.
- **Never hardcode a snapshot-specific field ID in a selector that needs to work across snapshots.**
- Use class-based selectors instead: `.wpforms-field-option-email .wpforms-field-option-row-required` (works in any snapshot containing an Email field's option panel).
- Verified at commit `89075aa` (tutorial pilot chapter 2 fix).

### INV-6 — Captured snapshots can exceed iframe viewport
- The frontend-published-form snapshot is 6088px tall (full WordPress page).
- The Required-toggle row in builder-field-options-email might be ~300px below the iframe viewport top.
- **Before any cursor glide to an element, call `IframeManager.smoothScrollIntoView(target, { duration, block: 'center' })`** to bring it into view.
- The library already handles this; just remember to call it.
- Verified at commit `89075aa` (tutorial pilot chapter 3 fix).

### INV-7 — Library is REFERENCE, inline DOM is normal
- The libraries (`motion-primitives.js`, `wpforms-interactions.js`) codify HARD-WON patterns (cursor anti-frenzy, faux-dropdown, smartTag chip insertion, cream-flash-free swap).
- For one-off clicks / typewriters / single-step toggles, write inline DOM in the video's master timeline. Same shape the old engine-path chapter `effect({ doc, cursor, sleep, ... })` callbacks used.
- 3-test for promotion (per `wpforms-primitives` skill): hard-won pattern + multi-step choreography (≥3 sequential UI steps) + recurrence (≥3 videos OR ≥3 docs). 2 of 3 to earn library status.
- Pre-promotion is over-promotion. Promote AFTER a video ships and the inline pattern has been seen 3+ times.
- Source: commit `60b93bc` (philosophy update), `5ceccaf` (empirical frequency audit).

### INV-8 — IframeManager has `pointer-events: none` at rest
- Captured snapshots preserve real WordPress href URLs (`Dashboard`, `index.php`, etc.). A stray click on the iframe would navigate it to a real WP URL that the dev server doesn't have → 404 → tiny error pre tag in upper-left of stage.
- `pointer-events: none` on the iframe prevents this. The interactions library drives clicks via simulated events on specific elements (`.click()`, `dispatchEvent`), which bypass the pointer-events guard.
- Verified at commit `cf5ddf6`.

### INV-9 — No fetch/random/Date.now() at runtime
- Repo determinism rule (CLAUDE.md). Video chapter + runtime cinematic code is deterministic logic. Required for `tools/render.js --seek` mode parity.
- No `Date.now()` outside the player driver.
- No unseeded `Math.random()` — use `mulberry32(seed)` from `videos/_shared/kit.js`.
- No `fetch()` at runtime — assets must be loaded before render starts.
- No `repeat: -1` — compute bounded repeats from visible duration.
- Static check: `node tools/lint-determinism.js [--all]`

### INV-10 — Real WPForms brand only
- Primary: `--wpf-orange #E27730`
- AI-feature accent only: `--wpf-ai-purple #7A30E2` (never primary)
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI"...`
- Real Sullie at `reference/wpforms-brand/assets/sullie-master.svg`
- All tokens in `reference/wpforms-brand/tokens.css`
- No invented colors, no Inter web font, no fake characters

## When a future session is about to break one

Patterns that signal trouble:

| If you're about to write… | Stop and re-read… |
|---|---|
| `stage.style.transform = scale(...)` | INV-1 — stage transform breaks all child text |
| `iframe.style.transform: 'scale(0.8864) ...'` | INV-2 — pre-scale flattens compositor |
| `body { zoom: 4 }` on captured WP admin | Body zoom breaks fixed/absolute WPForms layout (verified in zoom-quality investigation) |
| `#wpforms-field-49` hardcoded across multiple snapshots | INV-5 — field IDs vary per capture |
| `cursor.glide(elementToStageCoords(el))` without scrollIntoView first | INV-6 — element may be off-viewport |
| New `WPFormsInteractions.setXfieldValue()` method | INV-7 — single-click wrappers stay inline |
| `iframe.pointerEvents = 'auto'` for debugging | INV-8 — re-enable per-instance only when needed |

## Commits this invariant set was learned from

| Commit | Invariant | What broke |
|---|---|---|
| `aa1432e` | INV-2 | OVERSAMPLE=4 supersampled iframe with scale-down transform killed subpixel AA at rest |
| `cf5ddf6` | INV-8 | iframe accepted real-href clicks, broke stage with 404s |
| `4b563d1` | INV-2 | 4 primitive QC pages had hardcoded `width: 1444px; transform: scale(0.8864)` pattern |
| `89075aa` | INV-5, INV-6 | Tutorial pilot ch.2 hardcoded field-49 selector; ch.3 cursor offscreen |
| `79081e7` | INV-1 | `fitStage()` transform on stage flattened compositor for parent doc |
| `60b93bc` | INV-7 | Wave 2 Batch A had ~9 over-promotion methods that should have stayed inline |
| `5ceccaf` | INV-7 (data) | Empirical frequency scan confirmed which Wave 2 methods earned library status |

## Production-quality checklist (when shipping any new video)

Before declaring a pilot done:

- [ ] Stage has no `transform` (INV-1)
- [ ] Iframe at native size (no pre-scale, INV-2)
- [ ] If camera zoom > 1× anywhere, that zoom is `transform` on the iframe directly (engine.js pattern)
- [ ] Mac frame has no `transform` other than the entrance opacity fade (INV-3)
- [ ] No hardcoded field-id selectors across snapshots (INV-5)
- [ ] `smoothScrollIntoView` called before cursor glide if target is not guaranteed in viewport (INV-6)
- [ ] No new `WPFormsInteractions` methods unless they pass the 2-of-3 promotion test (INV-7)
- [ ] `iframe.pointerEvents === 'none'` at rest (INV-8)
- [ ] No `Date.now()` / unseeded random / fetch / `repeat: -1` (INV-9)
- [ ] Brand orange primary, no purple unless AI-feature (INV-10)

## Open items for the zoom-quality Codex session

The current state is engine.js-equivalent quality at zoom 1 (sharp) and engine.js-equivalent quality at zoom > 1 (softens with pixel doubling). Codex's deep-dive prompt (`docs/codex-prompts/zoom-quality-deep-dive.md`) is exploring 10 approaches to sharpen the > 1 zoom case without regressing the at-rest case.

When their work lands, this doc will get a new INV-X covering the chosen approach. Until then, treat current iframe zoom-blur as the floor; pilots should cap aggressive emphasis zooms at ~2× and use `popOut` for any deeper zoom-equivalent emphasis (popOut clones the element into the parent doc where it renders fresh at any scale).
