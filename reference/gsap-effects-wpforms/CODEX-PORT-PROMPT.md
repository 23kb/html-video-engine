# Codex task — port the GSAP effects to real WPForms UI

You are converting a library of 101 generic GSAP motion demos into **WPForms-specific** versions.
Effects **000–015 are already done** — study them, then do **016 through 100** in batches of ~10.

This brief is self-contained. Read it fully before writing anything.

---

## 1. Mission

Each effect is a standalone HTML file with a `<style>` block, a GSAP timeline, and a scrubber UI.
The originals animate **generic placeholder content** (plain divs, fake "cards", lorem text).
Your job: keep each effect's **signature motion**, but make everything it animates **real WPForms UI**.

### THE HARD RULE — no mockups
The previous attempt built fake CSS "cards" and was rejected. **Every card / panel / UI surface
must be REAL captured WPForms DOM**, mounted from `snapshots/` and animated in place or adopted
into the stage. If you find yourself hand-writing a `<div class="card">` with fake fields — stop.
Mount a real snapshot and use its real nodes.

---

## 2. Files & layout

- **Source originals:** `reference/gsap-effects/effectNNN.html` — **READ ONLY. NEVER MODIFY.**
- **Your targets:** `reference/gsap-effects-wpforms/effectNNN.html` — these currently exist as
  unmodified copies of the originals. **Overwrite them** with the WPForms version.
- Helper library: `reference/gsap-effects-wpforms/_snapshot-iframe.js` (already exists — use it).
- Stage is always **1920×1080**. GSAP is vendored at `../../vendor/gsap/3.15.0/gsap.min.js`.
- Brand tokens: `../wpforms-brand/tokens.css` (gives `--wpf-orange #E27730`, `--wpf-ink`, font stack…).
  Orange is the primary brand colour. Purple is AI-feature-only — do not use purple as primary.

Done already (clone these as your pattern reference):
- `effect003`, `effect007` — adopt real cards onto pivot rigs + **self-style** them.
- `effect008`, `effect010`, `effect013` — real cards in a scrolling marquee strip.
- `effect011` — real cards slide in / settle into a row.
- `effect012` — real cards fly through 3D z-space.
- `effect014` — real cards fly in and fan into a stacked spread.
- `effect009`, `effect015` — editorial text motion + a real form snapshot revealed.

---

## 3. The helper — `_snapshot-iframe.js`

Include it: `<script src="_snapshot-iframe.js"></script>` (after the GSAP `<script>`).

```js
// mount a real snapshot as an iframe inside the stage
const { iframe, ready, query } = SnapshotIframe.mountSnapshot(stage, {
  slug: 'admin-templates', x: 0, y: 0, w: 1280, h: 720, scale: 1.5, zIndex: 1
});
await ready;                                   // resolves on iframe load
await SnapshotIframe.awaitDom(query, '.wpforms-template', { min: 12 }); // wait for real nodes
const nodes = [...query('.wpforms-template')];  // real captured DOM nodes
SnapshotIframe.rewriteRelativeUrls(node, 'admin-templates'); // fix img src BEFORE adopting
```

`mountSnapshot` returns `{ iframe, ready, query, queryOne, elementToStageRect }`.
`awaitDom(query, sel, {min})` polls until `min` matches exist (snapshots boot async).
`rewriteRelativeUrls(rootEl, slug)` rewrites relative `<img src>` / `srcset` / `url()` so images
still resolve after a node is moved out of the iframe. **Call it on every node before adopting.**

---

## 4. CRITICAL lesson — WPForms CSS is ancestor-scoped

When you pull a node OUT of the snapshot iframe into the effect document, **the snapshot's own
CSS does not style it** — WPForms admin CSS is scoped under body/page-level ancestor classes that
don't exist in your effect document. An extracted card renders as unstyled raw markup.

**Therefore: re-style every adopted node yourself**, with a scoped `<style>` block in the effect
file. Two proven recipes below — paste them in, replace `SCOPE` with your effect's container
class (e.g. `.strip`, `.rigs`, `.row`, `.field`, `.medias`).

### 4a. Real template card — `snapshots/admin-templates` → `.wpforms-template`
Skip `#wpforms-template-generate` and `#wpforms-template-blank` (the AI/Blank tiles — not real
templates). The thumbnail is a **tall** form screenshot — you MUST crop it with `object-fit:cover`.

```css
SCOPE .wpforms-template { width:230px; height:228px; flex-shrink:0; background:#fff;
  border:1px solid #e9e2d4; border-radius:14px; box-shadow:0 16px 36px rgba(20,22,28,0.18);
  display:flex; flex-direction:column; overflow:hidden; }
SCOPE .wpforms-template .wpforms-template-thumbnail { height:150px; overflow:hidden; flex-shrink:0;
  margin:0; padding:0; border-bottom:1px solid #eee7da; }
SCOPE .wpforms-template .wpforms-template-thumbnail img { width:100%; height:100%;
  object-fit:cover; object-position:top center; display:block; }
SCOPE .wpforms-template .wpforms-template-name { font-size:15px; font-weight:700; color:#1d2327;
  margin:0; padding:15px 16px 0; line-height:1.3; }
SCOPE .wpforms-template .wpforms-template-desc,
SCOPE .wpforms-template .wpforms-template-favorite,
SCOPE .wpforms-template .wpforms-template-buttons { display:none; }
```
(To show the description instead of hiding it, give it
`font-size:12px;line-height:1.5;color:#5b6168;padding:8px 16px 16px;display:-webkit-box;
-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;` and grow the card height.)

### 4b. Real addon card — `snapshots/admin-addons` → `.wpforms-addons-list-item` (49 available)

```css
SCOPE .wpforms-addons-list-item { width:300px; height:156px; flex-shrink:0; background:#fff;
  border:1px solid #e4e4e7; border-radius:10px; box-shadow:0 18px 40px rgba(20,22,28,0.20);
  display:flex; flex-direction:column; overflow:hidden; }
SCOPE .wpforms-addons-list-item-header { display:flex; gap:13px; align-items:flex-start; padding:16px 17px 8px; }
SCOPE .wpforms-addons-list-item-header > img { width:44px; height:44px; flex-shrink:0; object-fit:contain; border-radius:6px; }
SCOPE .wpforms-addons-list-item-header-meta { flex:1; min-width:0; }
SCOPE .wpforms-addons-list-item-header-meta-title { display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-bottom:4px; }
SCOPE .wpforms-addons-list-item-header-meta-title a { font-size:15px; font-weight:700; color:#1d2327; text-decoration:none; }
SCOPE .wpforms-badge { font-size:9.5px; font-weight:600; line-height:1; padding:3px 7px; border-radius:999px; background:#eef0f2; color:#50575e; white-space:nowrap; }
SCOPE .wpforms-badge-blue { background:#e3effb; color:#1f6fc4; }
SCOPE .wpforms-badge-orange { background:#fceee1; color:#c2611f; }
SCOPE .wpforms-badge-purple { background:#efe7fb; color:#7340c8; }
SCOPE .wpforms-badge-green { background:#e2f3ea; color:#21794a; }
SCOPE .wpforms-addons-list-item-header-meta-excerpt { font-size:11.5px; line-height:1.5; color:#5f6368;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
SCOPE .wpforms-addons-list-item-footer { display:flex; align-items:center; gap:10px; margin-top:auto;
  padding:9px 17px; border-top:1px solid #f0f0f1; background:#fcfcfd; }
SCOPE .wpforms-addons-list-item-footer-settings-link { font-size:11.5px; color:#2271b1; text-decoration:none; font-weight:500; }
SCOPE .wpforms-addons-list-item-footer-actions { display:flex; align-items:center; margin-left:auto; }
SCOPE .wpforms-toggle-control { display:inline-flex; align-items:center; gap:8px; position:relative; }
SCOPE .wpforms-toggle-control input[type=checkbox] { position:absolute; opacity:0; width:1px; height:1px; margin:0; }
SCOPE .wpforms-toggle-control-status { font-size:11px; color:#5f6368; }
SCOPE .wpforms-toggle-control-icon { display:inline-block; width:34px; height:19px; border-radius:999px; background:#c3c4c7; position:relative; }
SCOPE .wpforms-toggle-control-icon::after { content:''; position:absolute; top:2px; left:2px; width:15px; height:15px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.3); }
SCOPE .wpforms-toggle-control input:checked ~ .wpforms-toggle-control-icon { background:#2c8a55; }
SCOPE .wpforms-toggle-control input:checked ~ .wpforms-toggle-control-icon::after { left:17px; }
```

Do NOT copy the snapshot's `<link rel=stylesheet>` into the effect — it won't apply to extracted
nodes and bleeds global admin CSS into the effect. Self-style only.

---

## 5. Available real snapshots

Pick the one whose real content fits the effect. Inventory: `node tools/list-snapshots.js`.
Most-used:

| slug | real nodes to adopt | notes |
|---|---|---|
| `admin-templates` | `.wpforms-template` | 800+ cards; skip `#…-generate` / `#…-blank`; tall thumbnails — crop |
| `admin-addons` | `.wpforms-addons-list-item` | 49 cards; header logo + badge + excerpt + footer toggle |
| `frontend-published-form` | whole form | mount as a plain `<iframe>` and reveal/scale it; great as a centre anchor |
| `admin-forms-overview`, `builder-fields`, `builder-settings-notifications`, `admin-entries`, `admin-payments` | full pages | mount whole-iframe for "tour"/"surface" effects |

If an effect needs a node type not listed, inspect the snapshot first
(`node tools/inspect-snapshot.js <slug> --emit-selectors`) — never invent selectors.

---

## 6. Adoption skeleton (card-style effects)

```js
const stage = document.getElementById('stage');
function fit(){ stage.style.transform =
  `scale(${Math.min(innerWidth/1920,(innerHeight-56)/1080)*0.96})`; }
addEventListener('resize', fit); fit();

const { iframe, ready, query } = SnapshotIframe.mountSnapshot(stage, {
  slug:'admin-templates', x:0, y:0, w:1280, h:720, scale:1.5, zIndex:1 });

ready.then(async () => {
  await SnapshotIframe.awaitDom(query, '.wpforms-template', { min:12 });
  document.getElementById('loading').classList.add('gone');

  const cards = [...query('.wpforms-template')]
    .filter(c => c.id!=='wpforms-template-generate' && c.id!=='wpforms-template-blank')
    .slice(0, 12);
  cards.forEach(c => SnapshotIframe.rewriteRelativeUrls(c, 'admin-templates'));
  iframe.style.opacity = '0';                       // hide the source iframe
  cards.forEach(c => container.appendChild(c));      // adopt real nodes into the stage

  const tl = gsap.timeline({ paused:true });
  /* … apply the ORIGINAL effect's signature motion to `cards` … */
});
```

Mounting multiple snapshots: `Promise.all([a.ready.then(...), b.ready.then(...)])`.
If you measure `scrollWidth` (marquees), do it inside a `requestAnimationFrame` after adoption.

---

## 7. Per effect-type strategy

- **Card / image / grid effects** (fly-in, stack, spiral, 3D, marquee, fan): adopt real
  `.wpforms-template` or `.wpforms-addons-list-item` cards and apply the original's motion to them.
- **Pure-text / typography effects** (scrolling letters, mask reveals, marquees): apply the
  signature motion to **real cards** instead of letters where it works (e.g. a sine-wave applied
  to a row of real template cards — see `effect010`); otherwise keep an editorial headline doing
  the motion and **reveal a real `frontend-published-form` iframe** alongside it (see `effect009`,
  `effect015`).
- **Cursor / interaction effects**: keep the ghost-cursor, but have it move over / affect real
  adopted cards.
- Keep the effect recognisably the SAME motion as the original — only the content becomes real.

---

## 8. Boilerplate every file keeps

- `:root{--stage-w:1920px;--stage-h:1080px}`, `.stage-wrap`, `.stage`, the `fit()` scaler.
- A `.loading` overlay with spinner; remove it (`classList.add('gone')`) once snapshots are ready.
- The bottom `.controls` bar: Play button, range scrubber, time label — copy it verbatim from any
  done effect (000–015). Timeline is `gsap.timeline({paused:true})`, auto-played via
  `setTimeout(()=>tl.play(),400)`.
- These are **reference effects, not video chapters** — `repeat:-1`, `Date.now()` etc. are FINE
  here (the repo's determinism rules apply only to `videos/`).
- To tune speed, use `tl.timeScale(n)`.

---

## 9. Verification (do this — no visual QC)

After each batch, for every effect, load it on the dev server and run static DOM probes:
- correct number of real nodes adopted (`.wpforms-template` / `.wpforms-addons-list-item` count);
- thumbnails/logos loaded — `img.naturalWidth > 0`;
- no `#wpforms-template-generate` / `#wpforms-template-blank` among adopted template cards;
- **zero console errors**.

Do NOT screenshot-judge or sign off on motion quality — the human owns visual QC.
Hand back a list of review URLs: `http://localhost:<port>/reference/gsap-effects-wpforms/effectNNN.html`.
Start the server with `node serve.js` if it isn't running.

Note: the `.stage` flex-shrinks below a 1920px-wide window (pre-existing in all effects) — QC at ≥1920px.

---

## 10. Workflow

1. Work in batches of 10 (016–025, 026–035, …).
2. For each effect: read `reference/gsap-effects/effectNNN.html`, identify its signature motion,
   pick the real snapshot that fits, overwrite `reference/gsap-effects-wpforms/effectNNN.html`.
3. Run the static verification for the batch.
4. Report the batch (one line per effect: what real UI it now uses) + review URLs, then continue.

Done = 016–100 all use real WPForms UI, all verified, zero console errors.
