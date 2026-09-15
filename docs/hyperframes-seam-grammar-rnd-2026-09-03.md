# HyperFrames seam grammar — R&D (2026-09-03)

**Source:** [heygen-com/hyperframes-launches](https://github.com/heygen-com/hyperframes-launches) → `claude-paper-launch/` (public repo, re-clonable; analyzed 2026-09-03). Rendered film: [hyperframes.dev viewer](https://hyperframes.dev/viewer/659498ab-d77e-48a8-a719-dd97adbbd3e5). Umair's reference MP4 is HeyGen's 1744×720 comparison cut — its left panel is this film.

**Verdict:** the smoothness is not a framework feature. It is a small set of **named, parameterized seam recipes** applied to whole-scene wrappers, plus disciplined micro-motion constants. Everything below is plain GSAP on `transform / filter / opacity` — L0-legal, deterministic, and portable to our master-timeline contract as-is.

**Status:** approved for adaptation (chat sign-off 2026-09-03). Nothing here is promoted yet — every recipe proves itself **video-local first**, promotes to `videos/_shared/` on second use (promotion gate).

---

## 1 · Architecture pattern: scenes own beats, the master owns seams

Their master file mounts each scene as an absolutely-positioned full-frame layer (`position:absolute; inset:0`, z-index in play order, `will-change: transform, filter, opacity`). Each scene registers its own paused timeline; the **master timeline touches only the scene wrappers** — `scale`, `filter`, `opacity`, `xPercent` — never anything inside a scene.

Two structural rules make every seam cheap:

1. **Shared ground.** Every scene sits on the same background (`#F0EEE6` paper). A throw or zoom exposes identical ground on both sides of the cut, so no edge ever flashes. → For us: the atmosphere bed color must match across every scene that participates in a throw/zoom seam.
2. **Hold the final frame.** Every scene timeline ends with a no-op hold to its exact scene duration (`tl.to({}, {duration:.2}, END)`), so a hard cut never lands on a 1-frame gap. → Maps to our dead-time comma rule; the hold is a *seam* requirement, not idle time.

Adaptation shape for us: in a single-HTML film, "scenes" are top-level `.scene` wrappers inside `.stage`; seam recipes are functions taking `(tl, outEl, inEl, t)` and writing to the master timeline at position `t`.

---

## 2 · Seam recipes (the actual grammar)

All five are **hard cuts disguised by matched motion**. Exit velocity ≈ entry velocity at the cut instant — exactly what `tools/seam-gate.js` measures.

### 2.1 · Inverse zoom-through (their signature)

Outbound recedes + blurs + dims fast; hard cut at peak blur; inbound enters oversized and settles. Both sides move in the shrinking direction → velocity-matched.

```js
// Verbatim parameters from claude-paper-launch/index.html seams 3/4/6.
function seamZoomThrough(tl, outEl, inEl, CUT){
  tl.to(outEl,  { scale: 0.8, filter: 'blur(20px)', duration: 0.2, ease: 'power3.in' }, CUT - 0.2);
  tl.to(outEl,  { opacity: 0.15, duration: 0.2, ease: 'none' },                         CUT - 0.2);
  tl.set(outEl, { opacity: 0 },                                                          CUT);
  tl.set(inEl,  { opacity: 0.15, scale: 1.25, filter: 'blur(20px)' },                    CUT);
  tl.to(inEl,   { scale: 1, filter: 'blur(0px)', opacity: 1, duration: 0.5, ease: 'expo.out' }, CUT);
}
```

Constants that matter: exit is **0.2s power3.in**, entry is **0.5s expo.out** (asymmetric — snap out, settle in); blur peak **20px**; opacity floor **0.15** on both sides (never 0 at the cut — the residue sells the continuity); entry scale **1.25**.

⚠️ `filter` on a wrapper containing a real-UI iframe blurs the whole raster (standing rule: never CSS-filter over an iframe). This seam is for **editorial scenes and PNG-baked states only**. For a scene with a live iframe, use 2.4 (throw) or 2.2 (locked crossfade) instead.

### 2.2 · Position-locked crossfade

0.6s opacity swap where the shared elements (message, composer, window chrome) sit at **identical coordinates in both scenes** — only the changing content dissolves; everything shared reads as one continuous object.

```js
tl.to(inEl,  { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, CUT);
tl.to(outEl, { opacity: 0, duration: 0.6, ease: 'power1.inOut' }, CUT);
```

The recipe is trivial; the craft is the **coordinate contract**: before authoring scene B, copy scene A's end-state geometry (position, size, weight, shadow) for every element that survives the cut. They comment this in-file at each seam ("message + composer sit at identical positions in both, so they stay rock-steady").

### 2.3 · Pixel-matched hard cut

No blend at all. Scene A's last frame is *built* to equal scene B's first frame — same layout, font weight, border, shadow, cursor position. Their comp-1 composer ends styled to comp-2's composer down to the box-shadow (`0 2px 6px…, 0 34px 80px -30px…` — the tween in comp-1 *settles to comp-2's shadow* on purpose).

Checklist form (this is a QC contract, not code):
- [ ] out-scene end geometry == in-scene start geometry for every surviving element (px, radius, shadow, font weight)
- [ ] cursor position identical on both sides
- [ ] background identical
- [ ] verify with a paused seek to `CUT − 1 frame` and `CUT` — the two stills must diff only where intended (storyboard-sheet or qc-probe screenshots)

### 2.4 · Leftward cut-the-curve (the throw)

Outbound accelerates off-frame left while dimming; hard cut mid-throw; inbound is *already* sliding left and settles. Opacity values are exact inverses across the cut.

```js
// Master side (out): verbatim from seams 5/7/8.
function seamThrowLeft(tl, outEl, inEl, CUT){
  tl.to(outEl,  { xPercent: -13,  duration: 0.26, ease: 'power2.in' }, CUT - 0.26);
  tl.to(outEl,  { opacity: 0.55,  duration: 0.26, ease: 'power2.in' }, CUT - 0.26);
  tl.set(outEl, { opacity: 0 }, CUT);
  tl.set(inEl,  { opacity: 1 }, CUT);
}

// Scene side (in): the entering scene's OWN timeline starts its hero already moving left.
// Verbatim from sure-response.html / outro.html:
gsap.set(hero, { x: 210, opacity: 0.55, scale: 1.045, transformOrigin: '50% 50%' });
tl.to(hero,   { x: 0, opacity: 1, scale: 1, duration: 0.18, ease: 'power3.out' }, 0);
```

Constants: exit **xPercent −13 over 0.26s power2.in**, fade **1 → 0.55**; entry **x 210→0 px** (fixed px is safe — scene coordinates are always 1920-wide), fade **0.55 → 1**, `power3.out`, 0.18–0.4s. Cut lands mid-throw with the out-scene still mostly on-frame — the motion, not the disappearance, carries the eye.

### 2.5 · Cursor velocity-split handoff (1:2 split)

One continuous mouse move spans a hard cut: scene A animates the **first ⅓** of the path accelerating; scene B `set`s the cursor at that exact position and finishes the **remaining ⅔** decelerating.

```js
// Scene A, last 0.3s (connector-morph.html):
tlA.to(cursor, { left: '40.7%', top: '63.7%', duration: 0.3, ease: 'power2.in' }, SCENE_END - 0.3);

// Scene B, frame 0 (chat-response.html):
gsap.set(cursorB, { left: '40.7%', top: '63.7%' });          // pick up EXACTLY where A left it
tlB.to(cursorB,  { left: '22%', top: '45%', duration: 0.6, ease: 'power2.out' }, 0);
```

The split is 1:2 in *time* (0.3s in / 0.6s out) with `power2.in → power2.out`, so position AND velocity match at the cut. For us this is a `Cursor` idiom, not a new class: park the out-scene cursor with a `power2.in` partial move, start the in-scene cursor from the same stage coords with `power2.out`.

---

## 3 · Micro-motion constants (the polish layer)

### 3.1 · Cursor tap

```js
// Tap = press at the cursor TIP, not the glyph center.
tl.to(cursor, { scale: 0.84, duration: 0.10, ease: 'power2.in',  transformOrigin: '21% 14%' }, T);
tl.to(cursor, { scale: 1,    duration: 0.22, ease: 'power2.out', transformOrigin: '21% 14%' }, T + 0.1);
```

**Restraint rule:** in the whole 53s film exactly ONE element gets a button-press reaction (darker fill + deeper shadow + scale 1.07); every other click is cursor-tap only. Button reacts are a spice, rationed to the beat that introduces the interaction. → Candidate default for our `Cursor.click()` choreography.

Approach paths run **straight along one axis** ("cursor enters STRAIGHT UP the y-axis… no diagonal/fragmented motion") with `power3.out`, 0.5–0.9s.

### 3.2 · Hover highlight without the dark flash

```js
// WRONG: from 'transparent' (rgba(0,0,0,0)) — interpolates through gray mid-tween.
// RIGHT: from the SAME hue at 0 alpha.
tl.fromTo(row, { backgroundColor: 'rgba(243,241,235,0)' },
               { backgroundColor: 'rgba(243,241,235,1)', duration: 0.14 }, T);
```

They hit the gray-flash bug and left the comment in. Pure-prevention rulebook row.

### 3.3 · Humanized deterministic typing

Per-char timing from a fixed formula — no `Math.random()`, seek-safe, same total duration as flat pacing:

```js
const N = PROMPT.length, TYPEDUR = N * 0.04;
const weights = [];
for (let i = 0; i < N; i++){
  const x = (N > 1) ? i / (N - 1) : 0;
  let w = 1 + 0.25 * Math.sin(i * 2.7);        // deterministic micro-jitter
  w *= 1.15 - 0.32 * Math.sin(Math.PI * x);    // swell: slower ends, quicker middle
  const prev = PROMPT[i - 1];
  if (prev === ' ') w += 0.7;                  // breath after a word
  if (prev === ',' || prev === '.') w += 0.9;  // longer after punctuation
  if (i === N - 1) w += 0.5;                   // hesitation before the last char
  weights.push(Math.max(0.25, w));
}
let acc = 0; const cum = weights.map(w => (acc += w));
const scale = TYPEDUR / cum[N - 1];
const charT = cum.map(c => T0 + c * scale);    // absolute reveal time per char
```

Reveal mechanism: width-clipping (`tl.set(clipEl, { width: W[i] }, charT[i])`) with per-char widths **measured after `await document.fonts.ready`** (`W[N-1] += 10` buffer so the final glyph never clips). They explicitly avoid `tl.invalidate()`/`tl.recent()` because their frame-stepping renderer can't run them — same constraint class as our qc-probe.

**SFX coupling:** each keystroke is its own `<audio>` cue at the same humanized timestamps (their master file carries 74 `typenew.mp3` entries at vol 0.2, clicks at 0.85). For us: derive the SFX plan timestamps from `charT` instead of a flat grid → `tools/sfx` plan stays in perfect sync with the visual by construction.

→ Adaptation target: `caretType` (editorial) and `typeIntoIframeInput` gain an opt-in `humanize: true` that swaps flat pacing for this weight curve.

### 3.4 · Inverse-eased scroll reveal

One continuous scroll on a custom bezier; per-line reveals timed by **numerically inverting the ease** so each line pops exactly as the scroll reaches it:

```js
CustomEase.create('scrollBez', '0.76, 0, 0.24, 1');
tl.to(scroll, { y: -maxScroll, duration: SCROLL_DUR, ease: 'scrollBez' }, SCROLL_START);

const ef = gsap.parseEase('scrollBez');
const invEase = f => { let lo = 0, hi = 1;
  for (let k = 0; k < 26; k++){ const m = (lo + hi) / 2; (ef(m) < f) ? lo = m : hi = m; }
  return (lo + hi) / 2; };

units.forEach(u => {
  const need = yOf(u) - TARGET;                // stage-px distance until u hits the settle line
  const at = SCROLL_START + SCROLL_DUR * invEase(Math.min(need, maxScroll) / maxScroll) - 0.08;
  tl.to(u, { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' }, Math.max(0.2, at));
});
```

Geometry is measured scale-robustly: `(el.getBoundingClientRect().top − stage.top) / (stageWidth / 1920)` → unscaled 1920×1080 coords regardless of preview zoom. Directly useful for any long-response / long-form scroll beat.

### 3.5 · Lottie under timeline control

```js
const anim = lottie.loadAnimation({ container, renderer: 'svg', loop: false, autoplay: false, animationData });
const orig = anim.goToAndStop.bind(anim);
const setFrame = f => { try { orig(f, true); } catch(e){} };
anim.goToAndStop = function(){};               // neutralize: ONLY the timeline may move it
const bf = { frame: 0 };
tl.to(bf, { frame: 80, duration: 2.7, ease: 'none', onUpdate: () => setFrame(bf.frame) }, T);
```

Deterministic, frame-steppable Lottie — INV-9-compatible by construction. Our `lottie-kit` should adopt the neutralize step as standard.

### 3.6 · Status-word shimmer + swap

Thinking states: gradient-text shimmer via `backgroundPosition: '140% 0' → '-140% 0'` (linear, bounded repeats), word cycle as 0.3s `power2.inOut` crossfades every 0.9s, new-word entry as `{ scale: 1.12, blur(12px) } → { scale: 1, blur(0) }` 0.4s `power3.out` (a micro zoom-through — the seam grammar reused at element scale).

---

## 4 · Repo-compliance map

| Their practice | Our rule it satisfies |
|---|---|
| transform/filter/opacity only on wrappers | GSAP L0 discipline |
| deterministic sine-jitter typing, no RNG | INV-9 (no unseeded random) |
| bounded `repeat:` counts everywhere | no `repeat:-1` / `boundedRepeats` |
| velocity-matched seams | `seam-gate.js` exit/entry contract |
| hold final frame to scene duration | dead-time comma rule at cuts |
| fonts.ready before measuring | our snapshot/type-metric hygiene |
| Lottie stepped from timeline | INV-9 + qc-probe frame-stepping |
| one button-react per film | motion-audit restraint calibration |

Conflicts to respect: **no zoom-through blur over live iframes** (iframe-filter rule); scene wrappers must carry `will-change: transform, filter, opacity` only for the seam's duration if paint memory becomes an issue at 1920×1080.

---

## 5 · Adaptation order (agreed 2026-09-03)

1. **Seam recipes video-local** — next editorial/ad build implements `seamZoomThrough` + `seamThrowLeft` as in-file helpers (§2.1, §2.4 verbatim constants), plus the §2.3 pixel-match checklist on at least one cut. Gate: `seam-gate.js` on the render; motion-audit tier as usual. **Promote to `videos/_shared/effects/seams.js` on second use.**
2. **Cursor constants** — compare `Cursor.click()` against §3.1 (tip-origin, 0.10/0.22 in-out split); adopt the velocity-split handoff (§2.5) as the standard for cursor motion across scene cuts. Library change → propose-first (protected area).
3. **Humanized typing** — `humanize` option for `caretType` per §3.3, SFX timestamps derived from `charT`. Prove on the same pilot.
4. **Rulebook rows** (pure prevention, no code): same-hue-at-0-alpha highlights (§3.2); shared-ground requirement for throw/zoom seams (§1.1); hold-final-frame at every cut (§1.2).
5. **`FRAME-wpforms.md` (parked until 1–3 prove out)** — a brand-at-frame-scale spec fusing the canonical brand tokens + motion-audit calibration into one authoring-time file, modeled on their `FRAME-claude.md`: hero vw ramp with fit-to-measure headline steps (≤3 words → 9vw, 4–6 → 6.2vw, 7+ → 4.2vw), a 1.4vw legibility floor, orange-fires-once accent ration, squint/silence/restraint self-audit. Needs its own alignment pass before authoring.

## 6 · Source pointers

- Master seam timeline: `claude-paper-launch/index.html` (10 scene layers, 8 seams, 90 SFX cues — the whole grammar is in its ~90 lines of root script)
- Morphbox identity-thread ×4 + cursor discipline: `compositions/connector-morph.html`
- Humanized typing + composer morph + thinking beat: `compositions/chat-response.html`
- Inverse-eased scroll: `compositions/response-scroll.html`
- Throw-entry heroes: `compositions/sure-response.html`, `compositions/outro.html`
- Task checklist / player / grow-upward composer: `compositions/compose-ui.html`
- Brand-at-frame-scale spec: `claude-paper-launch/FRAME-claude.md`

Repo is public — re-clone with `git clone --depth 1 https://github.com/heygen-com/hyperframes-launches` (631 MB with LFS; `GIT_LFS_SKIP_SMUDGE=1` for text-only). Nothing vendored into this repo; the recipes above are self-contained.
