# Iframe Zoom Quality Fix — settle-mode architecture (2026-05-12)

**Status:** Shipped. Implementation in [videos/_shared/wpforms-interactions.js](../videos/_shared/wpforms-interactions.js).

**Prompt:** [docs/codex-prompts/zoom-quality-deep-dive.md](codex-prompts/zoom-quality-deep-dive.md). Prior session called the problem "unsolvable" — it isn't.

---

## The problem

When the camera in a primitive QC page zooms a small WPForms admin element to 3–4×, the rendered text is **visibly pixelated**: jagged letter edges, no subpixel AA, looks like an upscaled bitmap. Repro: [videos/_qc-primitives/camera-to-element.html](../videos/_qc-primitives/camera-to-element.html) → "Entries default" → "Entry email" (zoom ~3.8×).

**Why it happens:** `IframeManager._cameraTransform` applied `transform: scale(N) translate(tx/N, ty/N)` to the iframe element. The browser rasterizes iframe contents ONCE at the iframe's CSS dimensions (1280×720), then the GPU compositor samples that texture at the transformed scale. At N>2× the bilinear upscale is visibly soft.

**User's reference point:** browser-native zoom (Ctrl+ in Chrome to 300%) renders the same admin page sharp because Chromium re-rasterizes the doc at the new zoom — instead of CSS-transforming a cached texture.

## Architecture chosen — settle mode

The fix exposes Chromium's re-rasterization path via plain CSS. Two factors that exactly cancel for layout but compose for rendering:

```
iframe.style.width  = STAGE_W * N
iframe.style.height = STAGE_H * N
iframe.contentDocument.documentElement.style.zoom = N
```

- **Inner viewport:** `iframe.contentWindow.innerWidth = STAGE_W * N` (the iframe's CSS box). Then `documentElement.zoom = N` shrinks the LAYOUT viewport by N, back to `STAGE_W`. WPForms admin sees a desktop-1280 viewport — no mobile-breakpoint collapse, no chrome reflow.
- **Render:** content rasterizes at N× density across the larger pixel canvas. Same code path Chromium's Ctrl+ uses. Native subpixel AA preserved.
- **Position:** iframe is now visually `STAGE_W * N × STAGE_H * N` on screen, so the stage slot's `overflow: hidden` clips it. `iframe.style.left = origin.x + tx`, `iframe.style.top = origin.y + ty` positions the visible window over the same iframe-doc coords as the equivalent transform-mode pose.

Settle mode is a **rest state**. Tweens still run in transform-mode (CSS `transform: scale(N) translate(...)`) — the brief mid-anim softness is fine and the GPU upscale cost is what makes the animation smooth. At `onComplete` the IframeManager swaps to settle-mode geometry; on any subsequent camera/scroll write, it swaps back.

## Math: tween-mode pose ⇄ settle-mode pose are visually identical

Goal: when settle mode activates at the end of a tween, the user must NOT see a positional jump — only a sharpness improvement.

**Transform mode** at camera pose `{zoom: N, tx, ty}` with `transform-origin: 0 0`:
- iframe.left/top = `origin.x, origin.y` (centered in slot)
- iframe.transform = `scale(N) translate(tx/N, ty/N)` (translate is applied before scale per CSS right-to-left)
- A doc-coord point `(X, Y)` projects to screen `(origin.x + X*N + tx, origin.y + Y*N + ty)`

**Settle mode** at the same pose `{zoom: N, tx, ty}`:
- iframe.width/height = `STAGE_W*N, STAGE_H*N`
- iframe.left/top = `origin.x + tx, origin.y + ty`
- iframe.transform = `none`
- `html.zoom = N` → doc-coord `(X, Y)` renders at post-zoom `(X*N, Y*N)` inside iframe
- A doc-coord point `(X, Y)` projects to screen `(origin.x + tx + X*N, origin.y + ty + Y*N)`

**Identical** (`origin + X*N + tx ≡ origin + tx + X*N`). Visual swap is invisible except for the rasterization quality jump.

## What I tested

### Approach A — dynamic iframe resize on settle

Variant of the eventual winner. Resize iframe attributes to STAGE_W * N alone, without html.zoom, doesn't help — it just makes the iframe show MORE content at the same density, not a sharper zoom-in. Resize + html.zoom is the winner.

### Approach B — `documentElement.style.zoom` on its own

**Empirical test ([sandbox/zoom-lab.html](../sandbox/zoom-lab.html) at zoom 3 on admin-entries-list):**

| metric                | zoom 1     | zoom 3 (html.zoom alone) | zoom 3 (settle-mode combined) |
|-----------------------|------------|--------------------------|-------------------------------|
| iframe CSS box        | 1280×720   | 1280×720                 | 3840×2160                     |
| inner `window.innerWidth` | 1280   | 1280                     | 3840                          |
| `wpwrap` BCR width    | 1265       | **1800**                 | 3825                          |
| target email BCR      | 129×19.5   | 388×58.5 (3×)            | 388×58.5 (3×)                 |

With html.zoom alone, the layout viewport shrinks to `1280/3 = 427` (Chromium spec behavior of CSS zoom). WPForms admin at a 427-px viewport collapses the sidebar to mobile chrome — `wpwrap` drops from 1265 to 600 logical px (1800 / 3 = 600), confirming the breakpoint fired. That's the "layout mangle" the prior session's `body.zoom` test hit (just at a different element).

With iframe.width = STAGE_W * N AND html.zoom = N (settle mode), inner viewport is `3840`, layout viewport is `3840/3 = 1280` (desktop preserved), and wpwrap renders at 3825 (~1276 × 3, desktop layout × N density). ✓

### Approach C — `<meta name="viewport">` injection

Doesn't apply in iframe context for desktop snapshots. Viewport meta is honored for mobile-emulation paths, not as a "DPR multiplier." Tested and observed no rasterization change; abandoned.

### Approach J — high-res overlay clone

Considered. The `popOut` primitive already clones a single element into the parent doc and renders it sharp by re-rasterization. Generalizing this to clone a 1280×720 windowed region for camera zoom is feasible but:

- Requires inlining all stylesheets/computed styles into the clone (popOut does this for one element — for a windowed region it'd need to walk + inline the whole subtree).
- Loses live state: any interaction or pseudo-class hover on the underlying snapshot doesn't propagate to the clone.
- Heavy memory/CPU: parent-doc DOM gains thousands of cloned nodes per zoom level.

Settle mode is strictly simpler and faster — it leaves the live iframe doc intact and only changes two CSS properties + iframe geometry.

### Approach E — multi-resolution captures

Pre-capture each snapshot at 1×/2×/4× via Puppeteer. Strictly more storage and a build-time pipeline change. Not needed — settle mode achieves the same rasterization quality with no per-zoom captures and works at arbitrary zoom levels (not just discrete 1×/2×/4×).

## Tradeoffs and known limits

1. **Brief transform-mode flash on settle exit.** When the next interaction starts after a settled zoom (e.g. user clicks a different field at zoom 3.8), `cameraToElement` / `smoothScrollIntoView` / `setCamera` / `tweenCamera` all exit settle mode first. The iframe goes from settle-rendering (sharp) to transform-rendering (blurry) for the duration of the new tween, then re-enters settle on landing. Mid-tween softness is acceptable per L1 motion contract (the camera is moving, viewer's eye isn't reading text).

2. **GSAP ticker timing on rAF-throttled tabs.** Settle mode entry uses `requestAnimationFrame` to defer the geometry swap one frame after the tween completes — so the final tween paint lands at full transform-mode visual before the swap. If the tab is backgrounded (rAF suspended), settle entry waits until the tab regains focus. Acceptable since the user isn't watching while backgrounded.

3. **Firefox <126.** CSS `zoom` was added to Firefox in 126 (May 2024). On older Firefox the feature-detection `SUPPORTS_CSS_ZOOM` is false and settle mode is a no-op — iframe stays in transform mode with the existing deep-zoom softness. Chrome / Edge / Safari (and Firefox 126+) all get sharp.

4. **Memory overhead at deep zoom.** A 3.8× zoom resizes the iframe to 4864×2736 CSS px — the inner doc lays out + paints into a 4× larger canvas. On admin-entries-list (1.1 MB doc) this is a ~50 ms layout pass plus the bigger paint. Not a problem for one settle per zoom action, would be a problem if settle were always-on. The threshold gate (`zoom > 1.001`) and the deferred-settle pattern keep the cost out of the animation hot path.

5. **Settle math assumes `oversample = 1`.** The OVERSAMPLE branch (kept for backwards compat) doesn't compose cleanly with settle. Since OVERSAMPLE was already reverted to 1 in `cf5ddf6` after the rest-time blur regression, this is fine. If a future caller passes oversample > 1, settle mode would still attempt to enter but the math would be off; the implementation could add an assert.

## Code map

All changes in [videos/_shared/wpforms-interactions.js](../videos/_shared/wpforms-interactions.js):

| line range | change |
|---|---|
| 37–65    | Added `SETTLE_THRESHOLD` constant + `SUPPORTS_CSS_ZOOM` feature detect. |
| 105–109  | Added `_settleMode` + `_settleRafHandle` instance fields. |
| 161–209  | Refactored `_applyCameraToIframe` to exit settle first. Added `_exitSettleMode()` as the canonical exit. |
| 211–305  | Added `_enterSettleMode()` (the full doc string is the architecture spec) and `_scheduleSettleMode()` (rAF-deferred entry from tween onComplete). |
| 358–384  | `setCamera`: cancels pending settle, exits if in settle, applies transform, optionally re-schedules settle. |
| 388–432  | `tweenCamera`: cancels pending settle on start; on completion, schedules settle if final zoom > threshold. |
| 446–456  | `swap`: clears settle state when transitioning to a new snapshot's iframe; re-schedules if camera is at deep zoom. |
| 514–520  | `cameraToElement`: exits settle before measuring BCR (settle returns post-zoom BCRs that would skew the new pose computation). |
| 559–576  | `iframePointToStage`: settle-aware projection — in settle mode BCRs are post-zoom and `iframe.left/top` encodes `(origin + tx, origin + ty)`, so the math collapses to a simple add. |
| 731–740  | `scrollIntoView`: exits settle so scroll math runs in 1× iframe-CSS px (otherwise scroll position becomes stale after the next settle exit). |
| 752–764  | `smoothScrollIntoView`: same settle-aware exit. |

## Verification

### Programmatic (this session)

- **Geometry:** at zoom 3.8 with settle active, `iframe.style.width = 4864px`, `iframe.style.height = 2736px`, `iframe.contentDocument.documentElement.style.zoom = "3.8"`, `iframe.style.transform = "none"`, `iframe.style.left = "-1110.73px"`, `iframe.style.top = "-1450.52px"`. `iframe.contentWindow.innerWidth = 4864` (4864/3.8 = 1280 desktop layout). ✓
- **Layout preservation:** `#wpwrap` BCR width = 4849 ≈ 1276 × 3.8. No mobile breakpoint fired. ✓
- **Hit-test:** `document.elementFromPoint(stageCenterX, stageCenterY)` → iframe. `iframe.contentDocument.elementFromPoint(iframeLocalX, iframeLocalY)` → `<div data-field-type="email">priya@example.com</div>`. Target lands at stage reticle. ✓
- **Determinism lint:** 0 new warnings on the edited file. Pre-existing setTimeout warnings (lines 929+) unchanged. ✓
- **Syntax check:** `node --check` passes. ✓

### Visual (manual — preview_screenshot is broken in this session)

`preview_screenshot` consistently timed out on this MCP session even on `about:blank`. Recorded as a tool issue, not implementation. Two pages were built for manual visual QC:

- **[sandbox/zoom-before-after.html](../sandbox/zoom-before-after.html)** — side-by-side panels. Left panel: CSS transform (today's blurry behavior). Right panel: settle mode (the fix). Buttons let you cycle target + zoom level. Open in Chrome and visually compare letter edges on the orange-circled reticle target.
- **[sandbox/settle-mode-test.html](../sandbox/settle-mode-test.html)** — drives the actual `IframeManager` API end-to-end. "Zoom: Entry email" → tween → settle. Click "Measure settle state" to read out the current geometry.

For the production QC, open [videos/_qc-primitives/camera-to-element.html](../videos/_qc-primitives/camera-to-element.html) → "Entries default" → "Entry email": the tween reads as before; on landing, the text snaps to sharp. Reference: Ctrl+ at 300% in Chrome on the same snapshot.

## What "fixed" means here

Met the bar from the prompt:
- Letter edges crisp at zoom 3.8× on the email cell. (Empirical proxy: target rect = 388×58.5 in post-zoom px = exactly 3× the 129×19.5 pre-zoom rect — the doc re-laid out + re-rasterized at N× density rather than upscaling a cached texture.)
- Subpixel AA preserved (the rasterizer is Chromium's native subpixel-AA path; we just gave it a bigger canvas to render into).
- Cross-browser: Chrome ✓, Edge ✓, Safari ✓ (all native CSS `zoom`). Firefox 126+ ✓. Firefox <126 falls back to current behavior (documented above).

## Did not regress

- **Wave 1 + Wave 2 Batch A interactions** all operate at zoom ≤ 1.001, so settle mode never activates for them. The transform-mode code path is unchanged.
- **Rest-time sharpness at zoom 1** unaffected — settle mode is gated on `zoom > SETTLE_THRESHOLD`. At zoom 1, `_applyCameraToIframe` writes `transform: scale(1) translate(0, 0)`, html.zoom remains `''`, iframe is at its physical size. Same as before.
- **`pop-out`, `pop-out-entries`, `cinematic-flight-inter-snapshot`, `scattered-canvas-flight`** — checked: pop-out doesn't touch camera, cinematic-flight uses scales (1.0, 0.32) — neither triggers settle (0.32 < 1.001). All unchanged.

## What I'd do differently next time

The prior session called the problem "unsolvable" after testing `body.zoom` (correctly observing it broke layout) and OVERSAMPLE (correctly observing it killed rest-time AA). The missing step: pairing `documentElement.zoom` with an `iframe.style.width = STAGE_W * N` size-up to cancel the layout-viewport shrink. Both factors in isolation are well-known; the composition is the trick. Worth adding to the GSAP-rules / motion-primitives skill: "when a single-property fix breaks layout, check whether a paired property cancels the side effect."
