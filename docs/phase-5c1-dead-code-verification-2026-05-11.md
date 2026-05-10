# Phase 5c.1 Dead-Code Verification — 2026-05-11

## Summary

- Targets verified safe to delete: 6
- Targets that have callers: 8
- Audit errors found: 5

LOUD FLAG: the original Track 1 "verified-zero-caller" framing has additional errors beyond the already-known `collapseBlock` correction. `runScene`, `pointer`, `spotlight`, and `runtime/camera-poses.js` all have production reachability. The debug `d` hotkey is also installed from the live `loadSnapshot()` path, so it is not an uncalled installer.

Branch verified during this pass: `audit-shape-2026-05-10`.

## Per-target verdicts

### Target 1: `runScene`

- **Location:** `engine/engine.js:666-749`
- **Direct production callers** (in `videos/**`): none
  - `rg -n --glob '!*.bak' "runScene\s*\(" videos` returned no hits.
- **Internal callers** (in `engine/`, `runtime/`, `scenes/`, `tools/`, `videos/_shared/`):
  ```text
  engine\engine.js:689:export async function runScene(beats) {
  runtime\player.js:364:      await runScene(wrapBeats(beats, baseBuilder));
  runtime\player.js:368:      await runScene(wrapBeats(beats, baseBuilder));
  runtime\player.js:378:    await runScene(wrapBeats(beats, builder));
  scenes\chapters\smart-tags.html:14:import { runScene, clearHighlights } from '../../engine/engine.js';
  scenes\chapters\smart-tags.html:56:await runScene([{
  ```
- **Production reachability evidence:** production chapter modules export modes that route through `runtime/player.js` to `runScene`, for example:
  ```text
  videos\build-forms-faster-with-wpforms-ai\chapters\scene-2-add-new.js:21:export const mode = 'parallel';
  videos\form-notifications\chapters\smart-tags.js:6:export const mode = 'audio-cued';
  videos\wpforms-rest-api-overview-polished\chapters\intro-cold-open.js:19:export const mode = 'parallel';
  ```
- **Verdict:** KEEP. No direct `videos/**` imports, but `runtime/player.js` calls it for live `parallel` and `audio-cued` production chapters.
- **Deletion approach if safe:** Not safe as a wholesale delete. Any slimming would need a separate behavior-preserving refactor of `runtime/player.js` mode handling.

### Target 2: `pointer`

- **Location:** `engine/engine.js:351-428`
- **Direct production callers** (in `videos/**`): no direct `pointer(...)` calls, but production beat-shape callers exist:
  ```text
  videos\form-notifications\chapters\smart-tags.js:25:    { pointer: tagIcon, direction: 'down', label: 'Click to open', size: 30, gap: 8 },
  videos\form-notifications\chapters\managing.js:22:      { pointer: addBtn, direction: 'down', label: 'Click to add', size: 28, gap: 8 },
  videos\form-notifications\chapters\managing.js:48:      { pointer: cloneBtn, direction: 'down', label: 'Click to clone', size: 26, gap: 8 },
  videos\form-notifications\chapters\managing.js:67:      { pointer: statusBtn, direction: 'down', label: 'Click to toggle', size: 26, gap: 8 },
  videos\form-notifications\chapters\conditional-logic.js:31:      { pointer: clToggleBtn, direction: 'down', label: 'Click to enable', size: 28, gap: 8 },
  videos\form-notifications\chapters\advanced.js:14:      { pointer: advTitle, direction: 'down', label: 'Click to expand', size: 28, gap: 8 },
  ```
- **Internal callers**:
  ```text
  engine\engine.js:351:export async function pointer(selector, {
  engine\engine.js:725:      if (o.pointer)         await pointer(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
  runtime\player.js:275:      if (o.pointer)         await ptrOverlay(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
  scenes\shared.js:186:      if (o.pointer)         await ptrOverlay(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
  scenes\shared.js:256:      if (o.pointer)         await ptrOverlay(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
  engine\overlays-layer.js:15:import { highlight as engineHighlight, pointer as enginePointer, clearHighlights, sleep } from './engine.js';
  ```
- **Verdict:** KEEP. The function is reached through production `overlays: [{ pointer: ... }]` shapes.
- **Deletion approach if safe:** Not safe unless production overlay pointer support is removed or migrated.

### Target 3: `spotlight`

- **Location:** `engine/engine.js:442-477`
- **Direct production callers** (in `videos/**`): no direct `spotlight(...)` calls, but production beat-shape callers exist:
  ```text
  videos\form-notifications\chapters\smart-tags.js:22:  spotlight: emailWrap,
  videos\form-notifications\chapters\advanced.js:11:    spotlight: advTitle,
  videos\form-notifications\chapters\advanced.js:37:    spotlight: fileWrap,
  videos\form-notifications\chapters\advanced.js:48:    spotlight: csvWrap,
  ```
- **Internal callers**:
  ```text
  engine\engine.js:442:export async function spotlight(selector, { dim = 0.08, fade = 400 } = {}) {
  engine\engine.js:718:    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
  runtime\player.js:271:    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
  scenes\shared.js:182:    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
  scenes\shared.js:251:    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
  ```
- **Verdict:** KEEP. The function is reached through production `spotlight:` beat properties.
- **Deletion approach if safe:** Not safe unless production spotlight beat support is removed or migrated.

### Target 4: `cursor.dragGrab`

- **Location:** `engine/engine.js:541-610`
- **Direct production callers** (in `videos/**`): none for `cursor.dragGrab(...)`; descriptor `do: 'dragGrab'` exists but does not call this method.
  ```text
  videos\creating-first-form\chapters\cff-chapter-5.js:67:      do: 'dragGrab',
  videos\a-complete-guide-to-the-checkboxes-field\chapters\add-checkboxes-field.js:33:      do: 'dragGrab',
  ```
- **Internal callers**:
  ```text
  engine\engine.js:549:  async dragGrab(srcSel, dstSel, { wait = 900, rotate = 2.5, ghostMaxPx = 260, ghostScale = 0.9 } = {}) {
  runtime\verbs.js:238:  async dragGrab(step, ctx) {
  runtime\verbs.js:241:    await dragField(step.from, step.to, {
  runtime\drag.js:98:export async function dragField(fromSel, toSel, opts = {}) {
  ```
- **Verdict:** SAFE TO DELETE. Production descriptor `dragGrab` routes to `runtime/drag.js#dragField`, not `engine/engine.js#cursor.dragGrab`.
- **Deletion approach if safe:** Remove only the `dragGrab` method from the exported `cursor` object in `engine/engine.js:541-610`. Leave `runtime/verbs.js#dragGrab` and `runtime/drag.js#dragField` intact.

### Target 5: Debug `d` hotkey installer

- **Location:** `engine/engine.js:633-655`, installed from `engine/engine.js:164`
- **Direct production callers** (in `videos/**`): none.
- **Internal callers**:
  ```text
  engine\engine.js:164:      installDebugHotkey();
  engine\engine.js:634:function installDebugHotkey() {
  engine\engine.js:640:  window.addEventListener('keydown', (e) => {
  engine\engine.js:642:    document.querySelectorAll('.debug-rect').forEach(n => n.remove());
  engine\engine.js:648:      dr.className = 'debug-rect';
  ```
- **Verdict:** NEEDS USER DECISION. It is debug-only, but it is installed by the live `loadSnapshot()` path. Deleting it removes an authoring/debug affordance, not dead unreachable code.
- **Deletion approach if safe:** If approved, remove `installDebugHotkey();` at `engine/engine.js:164`, remove `installDebugHotkey()` at `engine/engine.js:633-655`, and remove `.debug-rect` CSS at `engine/engine.js:120`.

### Target 6: `whiteout`

- **Location:** `engine/wpforms.js:489-543`
- **Direct production callers** (in `videos/**`): none.
  - `rg -n --glob '!*.bak' "whiteout\s*\(|import.*whiteout|export.*whiteout|\bwhiteout\b" videos` returned no hits.
- **Internal callers**:
  ```text
  engine\wpforms.js:411:  backdropColor = 'rgba(0,0,0,0.5)',  // set to 'transparent' when paired with whiteout()
  engine\wpforms.js:493: *   const wo = await whiteout(['button.wpforms-notifications-add']);
  engine\wpforms.js:502:export async function whiteout(keepSelectors = [], { fade = 350 } = {}) {
  ```
- **Verdict:** SAFE TO DELETE. No production or internal executable callers.
- **Deletion approach if safe:** Remove `engine/wpforms.js:489-543`. Also remove or revise the nearby `showPrompt` comment at `engine/wpforms.js:411` that references pairing with `whiteout()`.

### Target 7: `collapseBlock`

- **Location:** `engine/wpforms.js:549-561`
- **Direct production callers** (in `videos/**`):
  ```text
  videos\form-notifications\chapters\managing.js:11:export async function setup({ collapseBlock }) {
  videos\form-notifications\chapters\managing.js:12:  await collapseBlock(block1);
  videos\form-notifications\chapters\managing.js:13:  await collapseBlock(block2);
  videos\form-notifications\chapters\managing.js:36:    effect: async ({ zoomTo, showPrompt, duplicateBlock, collapseBlock }) => {
  videos\form-notifications\chapters\managing.js:40:      await collapseBlock(newBlockSel);
  videos\form-notifications\chapters\managing.js:51:    effect: async ({ cursor, zoomTo, clearLabels, duplicateBlock, collapseBlock }) => {
  videos\form-notifications\chapters\managing.js:59:      await collapseBlock(dupSel);
  ```
- **Internal callers**:
  ```text
  engine\wpforms.js:551:export async function collapseBlock(blockSelector) {
  runtime\verbs.js:14:  collapseBlock as wpfCollapseBlock,
  runtime\player.js:11:  duplicateBlock, showPrompt, collapseBlock, toggleBlockActive,
  runtime\player.js:210:  duplicateBlock, showPrompt, collapseBlock, toggleBlockActive,
  scenes\chapters\managing.html:14:import { duplicateBlock, showPrompt, collapseBlock, toggleBlockActive } from '../../engine/wpforms.js';
  ```
- **Verdict:** KEEP. Known production callers are real in `videos/form-notifications/chapters/managing.js`.
- **Deletion approach if safe:** Not safe.

### Target 8: `uniqueSelectorFor`

- **Location:** `engine/wpforms.js:696`
- **Direct production callers** (in `videos/**`): none.
- **Internal callers**:
  ```text
  engine\wpforms.js:135:  const tagIconSel = uniqueSelectorFor(tagIcon, fieldSelector, '.wpforms-show-smart-tags');
  engine\wpforms.js:148:  const itemSel = uniqueSelectorFor(item, fieldSelector,
  engine\wpforms.js:696:function uniqueSelectorFor(node, wrapSelector, relativeSelector) {
  ```
- **Verdict:** SAFE TO DELETE as a standalone helper, with inline replacement. It has internal callers, but both are same-file one-line wrapper calls.
- **Deletion approach if safe:** Replace both calls with direct template/string expressions equivalent to `${fieldSelector} ${relativeSelector}`, then remove `engine/wpforms.js:696-698`.

### Target 9: Deprecated `applyIconChoices`

- **Location:** deprecated unicode-star implementation at `runtime/dom-prep.js:356-372`; current implementation is `applyIconChoicesV2` at `runtime/dom-prep.js:424+`
- **Direct production callers** (in `videos/**`): none.
  - `rg -n --glob '!*.bak' "op:\s*['\"]applyIconChoices['\"]" videos` returned no hits.
- **Internal callers**:
  ```text
  runtime\dom-prep.js:356:export function applyIconChoices(doc, fieldId, opts = {}) {
  runtime\dom-prep.js:424:export function applyIconChoicesV2(doc, fieldId, opts = {}) {
  runtime\prep-ops.js:17:  applyIconChoices,
  runtime\prep-ops.js:196:  applyIconChoices: {
  runtime\prep-ops.js:206:    run: (doc, entry) => applyIconChoices(doc, entry.fieldId, entry.glyph ? { glyph: entry.glyph } : {}),
  tools\validate-video.js:159:  applyIconChoices: {
  ```
- **Verdict:** SAFE TO DELETE the deprecated variant, with registry cleanup. There are no production op entries, but internal prep/validator registries still expose it.
- **Deletion approach if safe:** Remove `runtime/dom-prep.js:356-372`, remove `applyIconChoices` from `runtime/prep-ops.js` import and op registry (`runtime/prep-ops.js:17`, `196-207`), and remove the validator schema at `tools/validate-video.js:159-167`. Keep `applyIconChoicesV2`.

### Target 10: `harvestField`

- **Location:** `runtime/dom-prep.js:631-644`
- **Direct production callers** (in `videos/**`): none.
- **Internal callers**:
  ```text
  runtime\dom-prep.js:631:export async function harvestField(slug, fieldType) {
  runtime\dom-prep.js:659:  const node = await harvestField(slug, fieldType);
  ```
- **Verdict:** SAFE TO DELETE if paired with `injectField` deletion. It is only called by `injectField`.
- **Deletion approach if safe:** Remove `runtime/dom-prep.js:625-644` after removing `injectField`.

### Target 11: `injectField`

- **Location:** `runtime/dom-prep.js:657-669`
- **Direct production callers** (in `videos/**`): none.
  - `rg -n --glob '!*.bak' "do:\s*['\"]injectField['\"]|\binjectField\b" videos` returned no hits.
- **Internal callers**:
  ```text
  runtime\dom-prep.js:657:export async function injectField(doc, slug, fieldType, { containerSel = '#wpforms-panel-fields .wpforms-field-wrap', newId } = {}) {
  runtime\verbs.js:20:import { injectField } from './dom-prep.js';
  runtime\verbs.js:335:  async injectField(step, ctx) {
  runtime\verbs.js:337:    await injectField(doc, step.harvestFrom, step.fieldType, {
  runtime\verbs.js:1014:  'hold', 'snapshotSwap', 'sectionTitle', 'lineDraw', 'injectField', 'scroll',
  tools\validate-video.js:529:  'injectField',
  ```
- **Verdict:** SAFE TO DELETE with verb/validator cleanup. Validator already marks it deprecated and no production chapters use it.
- **Deletion approach if safe:** Remove `runtime/dom-prep.js:646-669`, remove `injectField` import and verb from `runtime/verbs.js:20`, `335-341`, and `1014`, and remove `injectField` from `tools/validate-video.js:528-534`.

### Target 12: `runBeatsAtTimes`

- **Location:** `scenes/shared.js:154-202`
- **Direct production callers** (in `videos/**`): none.
  - `rg -n --glob '!*.bak' "runBeatsAtTimes" videos` returned no hits.
- **Internal callers**:
  ```text
  scenes\shared.js:157:export async function runBeatsAtTimes(audio, beats, { tailPad = 0.05, endPad = 0.1 } = {}) {
  scenes\chapters\fields.html:12:  mountWatermark, runBeatsAtTimes, cursor, sleep
  scenes\chapters\fields.html:54:await runBeatsAtTimes(audio, beats);
  ```
- **Verdict:** NEEDS USER DECISION. Safe for `videos/**` production packages, but deleting it breaks legacy `scenes/chapters/fields.html`.
- **Deletion approach if safe:** If legacy `scenes/chapters/*.html` can break or be removed, delete `scenes/shared.js:154-202` and update/delete `scenes/chapters/fields.html`.

### Target 13: `runBeatsSequential`

- **Location:** `scenes/shared.js:228-274`
- **Direct production callers** (in `videos/**`): none.
  - `rg -n --glob '!*.bak' "runBeatsSequential" videos` returned no hits.
- **Internal callers**:
  ```text
  scenes\shared.js:229:export async function runBeatsSequential(beats, { postHold = 0.15 } = {}) {
  scenes\notifications-combined.html:522:    loadSnapshot, startBGM, stopBGM, playNarration, runBeatsSequential,
  scenes\notifications-combined.html:1029:  await runBeatsSequential([
  scenes\notifications-combined-v2.html:542:    loadSnapshot, startBGM, stopBGM, playNarration, runBeatsSequential,
  scenes\notifications-combined-v2.html:1164:  await runBeatsSequential([
  scenes\chapters\managing.html:12:  mountWatermark, runBeatsSequential, cursor, sleep
  scenes\chapters\conditional-logic.html:12:  mountWatermark, runBeatsSequential, cursor, sleep
  scenes\chapters\advanced.html:12:  mountWatermark, runBeatsSequential, cursor, sleep
  runtime\player.js:248:// Mirrors shared.js's runBeatsSequential but injects our enriched context.
  ```
- **Verdict:** NEEDS USER DECISION. Safe for `videos/**` production packages, but deleting it breaks multiple legacy `scenes/*.html` / `scenes/chapters/*.html` files.
- **Deletion approach if safe:** If legacy scene pages can break or be removed, delete `scenes/shared.js:228-274` and update/delete the legacy scene imports/calls listed above.

### Target 14: `runtime/camera-poses.js`

- **Location:** `runtime/camera-poses.js:1-27`
- **Direct production callers** (in `videos/**`):
  ```text
  videos\make-field-required\chapters\find-field-setting.js:2:import { registerCameraPose } from '../../_shared/kit.js';
  videos\make-field-required\chapters\find-field-setting.js:10:registerCameraPose('mfr-builder-overview', { focus: 'body', level: 1, pad: 0, noScroll: true });
  videos\make-field-required\chapters\find-field-setting.js:11:registerCameraPose('mfr-email-field-focus', { focus: sel.builder.emailField, level: 1.22, pad: 18, noScroll: false });
  videos\make-field-required\chapters\find-field-setting.js:26:    camera: 'mfr-email-field-focus',
  videos\make-field-required\chapters\toggle-required.js:2:import { registerCameraPose } from '../../_shared/kit.js';
  videos\make-field-required\chapters\toggle-required.js:10:registerCameraPose('mfr-options-required', { focus: sel.options.requiredRow, level: 1.55, pad: 28, noScroll: false });
  videos\make-field-required\chapters\toggle-required.js:11:registerCameraPose('mfr-options-email-payoff', { focus: sel.options.emailLabel, level: 1.32, pad: 22, noScroll: false });
  videos\make-field-required\chapters\toggle-required.js:48:    camera: 'mfr-options-required',
  videos\make-field-required\chapters\toggle-required.js:67:    camera: 'mfr-options-email-payoff',
  videos\make-field-required\chapters\verify-preview.js:2:import { registerCameraPose } from '../../_shared/kit.js';
  videos\make-field-required\chapters\verify-preview.js:10:registerCameraPose('mfr-preview-email', { focus: sel.frontend.emailField, level: 1.22, pad: 24, noScroll: false });
  videos\make-field-required\chapters\verify-preview.js:11:registerCameraPose('mfr-preview-submit', { focus: sel.frontend.emailField, level: 1.16, pad: 30, noScroll: false });
  ```
- **Internal callers**:
  ```text
  videos\_shared\kit.js:17:import { registerCameraPose as _registerCameraPose, resolveCameraPose as _resolveCameraPose } from '../../runtime/camera-poses.js';
  videos\_shared\kit.js:151:export function registerCameraPose(name, spec) {
  videos\_shared\kit.js:152:  _registerCameraPose(name, spec);
  videos\_shared\kit.js:155:export function resolveCameraPose(pose) {
  videos\_shared\kit.js:156:  return _resolveCameraPose(pose);
  runtime\player.js:48:import { resolveCameraPose } from './camera-poses.js';
  runtime\player.js:220:    const camera = resolveCameraPose(b.camera) || b.camera;
  runtime\player.js:260:    const cam = resolveCameraPose(beat.camera) || {};
  ```
- **Resolution of Claude finding:** `make-field-required` does not import `runtime/camera-poses.js` directly. It imports `registerCameraPose` from `videos/_shared/kit.js`, and `kit.js` imports/re-exports through `runtime/camera-poses.js`. The registered names are used as string `camera:` values.
- **Verdict:** KEEP. The registry has production users in `videos/make-field-required`.
- **Deletion approach if safe:** Not safe unless `make-field-required` is migrated from string camera poses to inline camera objects and `videos/_shared/kit.js` / `runtime/player.js` are cleaned up.

## Recommended deletion order

Smallest blast radius first:

1. `engine/wpforms.js:489-543` — delete `whiteout`; revise the `showPrompt` comment at `engine/wpforms.js:411`.
2. `engine/wpforms.js:696-698` — inline the two same-file `uniqueSelectorFor(...)` calls first, then delete the helper.
3. `engine/engine.js:541-610` — delete only `cursor.dragGrab`; keep descriptor `dragGrab` in `runtime/verbs.js` and `runtime/drag.js`.
4. `runtime/dom-prep.js:356-372`, `runtime/prep-ops.js:17` and `196-207`, `tools/validate-video.js:159-167` — remove deprecated `applyIconChoices`; keep `applyIconChoicesV2`.
5. `runtime/dom-prep.js:625-669`, `runtime/verbs.js:20`, `335-341`, `1014`, `tools/validate-video.js:528-534` — remove `harvestField`/`injectField` and the deprecated verb plumbing together.

Decision-gated deletions:

- `engine/engine.js:633-655` plus installer at `engine/engine.js:164` and `.debug-rect` CSS at `engine/engine.js:120` — only if losing the `d` debug hotkey is acceptable.
- `scenes/shared.js:154-202` and/or `228-274` — only if legacy scene pages can be removed or updated.

Do not delete:

- `engine/engine.js:666-749` (`runScene`)
- `engine/engine.js:351-428` (`pointer`)
- `engine/engine.js:442-477` (`spotlight`)
- `engine/wpforms.js:549-561` (`collapseBlock`)
- `runtime/camera-poses.js:1-27`

## Risks and unknowns

- `runScene`, `pointer`, and `spotlight` are production-reachable through the player and beat-shape properties. Removing them would break live videos such as `form-notifications` and multiple `parallel` / `audio-cued` chapters.
- `cursor.dragGrab` appears safe because production descriptor drag uses `runtime/drag.js#dragField`; risk is limited to any out-of-tree chapter manually calling `ctx.cursor.dragGrab`.
- `whiteout` has no executable callers; risk is limited to out-of-tree imports.
- `uniqueSelectorFor` deletion is safe only if its two same-file call sites are inlined correctly.
- Deprecated `applyIconChoices` has no production op entries, but the validator and prep registry currently allow it. Delete registry/schema plumbing in the same change to avoid a dangling op.
- `harvestField`/`injectField` deletion removes a deprecated verb path. This should be acceptable for production because validator already gates it and no `videos/**` call sites exist.
- `runBeatsAtTimes` and `runBeatsSequential` are not production video callers, but they are live for legacy `scenes/*.html` pages. Owner decision needed on whether those pages still matter.
- `runtime/camera-poses.js` is production-live through `videos/_shared/kit.js` and `make-field-required`; deletion would break string camera pose resolution.
