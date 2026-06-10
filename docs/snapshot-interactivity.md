# Snapshot interactivity — conventions and load-bearing patterns

Consolidates the institutional memory previously scattered across three
session-handoff docs at the repo root (`SNAPSHOT-INTERACTIVITY-HANDOFF-3.md`,
`-4.md`, `SNAPSHOT-WORK-HANDOFF.md`). Those docs are deleted; this is the
canonical reference for anyone wiring or modifying snapshot interactivity.

The **code** lives at [snapshots/_shared/interactivity.js](../snapshots/_shared/interactivity.js).
This document describes its conventions; it does not re-document the code.

---

## Architecture in one paragraph

Each snapshot loads a single shared script
`snapshots/_shared/interactivity.js` via `<script src="../_shared/interactivity.js"></script>`
injected before `</body>` (automated by `tools/link-interactivity-script.js`).
The script holds an append-mostly `TRANSITIONS[]` registry, where each entry
is `{ label, event, match, apply }`. Listeners are keyed by **selector
pattern**, not by snapshot — so the same handler covers any snapshot with
that DOM shape. Native `<select>` elements are intercepted on `mousedown`
(capture phase) and replaced with a custom HTML overlay that matches the
real WPForms admin style. The "canvas" is the live in-snapshot DOM; the
"option panel" is the right-rail config UI. Transitions mirror panel state
into canvas geometry.

---

## Locked conventions

### `fadeSwap` — 180ms out, 180ms in

Default transition timing for **any layout / visibility / structure change**
on the canvas. Instant (no fade) for attribute-only updates.

**Why:** snappy enough to feel responsive in a tutorial video, slow enough
that the viewer's eye tracks the change. Consistent across all transitions
so authors never have to think about it.

### Append-mostly registry

Don't refactor `interactivity.js` "for cleanliness." Resync transitions go
at the **end** of the `TRANSITIONS[]` array. Order matters when transitions
overlap — the universal handler may run first, the snapshot-specific resync
runs last.

### Real plugin classes everywhere

Never invent `wpf-snap-*` classes when a real WPForms class exists. Use the
real class so bundled snapshot CSS applies natively. When a class lacks
styling in the bundled CSS, **inject the missing rules** from the local
WPForms install
(`C:\Users\PC\Local Sites\sullies-bakery\app\public\wp-content\plugins\wpforms\assets\css\`)
rather than inventing replacement styles.

### Aggressive inline styles on modals

Icon Picker and color-picker overlays use inline styles. Snapshot CSS is
massive and unpredictable — `<style>` blocks don't reliably win against it.
Inline wins. Don't strip the inline styles in a refactor pass.

### Mode classes on `<ul.primary-input>`, not the field div

Choices mode classes (`wpforms-image-choices`, `wpforms-icon-choices`) live
on the canvas `<ul>`, **not** on the parent `.wpforms-field-*` div. Keep
them there; the snapshot CSS targets that element.

### Click delegation order matters

The global click handler at the bottom of `interactivity.js` calls
`preventDefault` only when a click transition matches. Use capture-mode for
modal-like overlays so they win over inner clicks.

### Visual QC belongs to the user

Never run preview verification. Always ask Umair for the live plugin HTML
when matching markup; never guess.

---

## Combined-field snapshots

Combined snapshots ship a single capture with **multiple canvas fields**
preserved (e.g. `builder-field-options-payment-fields` contains 8
payment-related canvas fields plus their option panels).

### `KEEP_ALL_PANELS` set in `tools/trim-builder-markup.js`

The trim tool strips inactive `#wpforms-field-option-<id>` panels by
default. For combined-field snapshots that needs to be skipped — add the
slug to:

```js
const KEEP_ALL_PANELS = new Set(['builder-field-options-payment-fields']);
```

Default behavior (strip inactive panels) stays in place for every other
slug.

### Don't run `clean-builder-snapshot-canvas.js` on combined snapshots

That tool strips non-baseline canvas fields. Combined snapshots
intentionally keep everything. Skip it for any slug in `KEEP_ALL_PANELS`.

### `activate-canvas-field` universal handler

Click any canvas `.wpforms-field[data-field-id]` → adds `.active` to that
field (removes from siblings), removes `wpforms-hidden` from its
`#wpforms-field-option-<id>` panel (adds to all others), switches sidebar
to Field Options tab. Ignores clicks on
`.wpforms-field-duplicate / .wpforms-field-delete / .wpforms-field-multi-field-menu`
— those handlers stay free.

### `initCanvasFieldActiveSync`

Combined snapshots ship with no `.active` field on canvas and all option
panels rendered visible. This init scans the canvas: if a field is
`.active`, only its panel stays visible; if none, all panels get
`wpforms-hidden` and the sidebar defaults to the Add Fields tab.
Per-field-stripped snapshots (1 panel in DOM) are unaffected.

---

## Detach-tolerant match pattern

When the base handler removes the click target's ancestor (e.g.
`choices-remove` detaches a clicked `<li>`), a follow-up resync transition
that tries to climb back via `el.closest('.wpforms-field-option-row')`
returns `null`, `getField()` fails, and the resync silently skips.

**Pattern:** use `document.querySelector('.wpforms-field-<type>')` for the
field lookup in any resync that fires after a remove handler. Don't rely on
the el's parent chain — it may already be detached.

Currently applied in:
- `payment-choices-resync-click` (covers radio + payment-multiple)
- the Likert/NPS choices-remove resync chain

---

## Coupon helpers — scope to option panel row, not field

`.choices__list--multiple` and `.choices__list--dropdown` live in the
**option panel** (right rail), not on the canvas field. Pattern:

```js
const _couponRow = fid => document.getElementById(
  `wpforms-field-option-row-${fid}-allowed_coupons`
);
const row = _couponRow(fid);
row.querySelector('.choices__list--dropdown');
```

Then scope all coupon DOM lookups to `row`, not `field`. Mixing the two
breaks because the field's `.choices__*` queries return the canvas-side
choice list, which doesn't exist for the coupon field.

### `SAMPLE_COUPONS` sample data

```js
const SAMPLE_COUPONS = ['Oliver Norton', 'BIRTHDAY10', 'SUMMER20', 'WELCOME15', 'BAKERY25'];
```

Sullie's-bakery-themed; `initCouponField` populates the hidden `<select>`
plus the `.choices__list--dropdown` listbox. **No pre-selected pill** —
user picks from dropdown. Click `.choices__inner` opens (`.is-active`);
click outside or pick an option closes.

---

## Payment-select quantity layout — class hook, not inline width

Snapshot CSS already has:

```css
select.quantity-input { float: inline-start; width: 70px; }
.wpforms-field-payment-select.payment-quantity-enabled .choices { /* ... */ }
```

The canvas has a bare `<select>` (no `.choices` wrapper), so the second rule
doesn't apply directly. Fix: `renderPaymentEnableQuantity` adds
`payment-quantity-enabled` on the field (matching the plugin), then sets
inline `float: inline-start; width: calc(100% - 85px)` on the main `<select>`.

Don't use `display: inline-block` for this layout — the `payment-quantity-enabled`
class hook is the canonical pattern.

---

## Custom-field-set snapshot composition — three paths

When a video needs a specific set of fields together (Sullie's bakery
contact form, e.g.):

1. **Build the form in WP + capture** — the canonical path. The capture
   tool sees real plugin state. Captures expensive but high-fidelity.
2. **Capture once + hide at runtime** — capture a combined snapshot with
   all candidate fields, then hide fields the video doesn't need via JS or
   a `<style>` block. Trades capture cost for runtime complexity.
3. **Runtime `addField()` helper** — approved but **NOT BUILT**. Would let
   a chapter compose a custom field set from primitives at boot. Don't
   propose unless Umair re-asks.

Default to (1) for new videos. (2) is a fallback when capturing the exact
form would gate the video on access to a specific WP environment. See
`project_snapshot_field_composition` in auto-memory for the live status.

---

## Don't redo / don't do (canonical list)

- **Don't push to GitHub.** Umair's work account is read-only.
- **Don't commit with `Co-Authored-By` lines.** Umair's preference; no LLM
  attribution trailers in commit messages.
- **Don't run preview QC.** Umair owns visual QC on all snapshot interactivity.
- **Don't refactor `interactivity.js` "for cleanliness".** Append-mostly registry.
- **Don't add mockup CSS when real plugin CSS exists** — extract from the
  local install and inline.
- **Don't use fake class names** — always real WPForms classes.
- **Don't migrate the snapshot capture pipeline.** Snapshots are static fossils.
- **Don't strip aggressive inline styles from modals** (Icon Picker, color picker overlay).
- **Don't move choices mode classes back to the field div.** Stay on `<ul.primary-input>`.
- **Don't auto-add a coupon pill on init.** User clicks dropdown to add.
- **Don't use inline `display: inline-block` for payment-select + quantity layout.**
  Use `payment-quantity-enabled` + `float: inline-start` + `width: calc(100% - 85px)`.
- **Don't run `clean-builder-snapshot-canvas.js` on combined-field snapshots.**
  Strips non-baseline canvas fields.
- **Don't strip option panels for combined-field snapshots.** Add the slug
  to `KEEP_ALL_PANELS` in `tools/trim-builder-markup.js`.
- **Don't use `getField(el)` in a resync transition that fires after a
  remove handler.** Use a document query against the field type class.

---

## Tools (one-line reminder; see each tool's `--help` for detail)

- `tools/audit-snapshot-weight.js` — per-snapshot weight breakdown
- `tools/dedup-snapshot-css.js` — extracts identical `<style>` blocks into `snapshots/_shared/css/<hash>.css`
- `tools/extract-data-uris.js` — pulls base64 fonts/images into `snapshots/_shared/data-uris/<hash>.<ext>`
- `tools/consolidate-snapshot-assets.js` — moves per-snapshot `assets/` into `snapshots/_shared/assets/<contenthash>.<ext>`, rewrites refs
- `tools/trim-builder-markup.js` — strips dead-weight markup from `builder-*` snapshots; respects `KEEP_ALL_PANELS`
- `tools/clean-builder-snapshot-canvas.js` — strips non-baseline canvas fields (skip for combined-field snapshots)
- `tools/link-interactivity-script.js` — injects the `_shared/interactivity.js` script tag into a snapshot
- `tools/field-state.js --field <name> [--summary] | --search <q>` — query the field-state inventory; **do not full-read** `docs/wpforms-field-state-inventory.md` (132 KB)

---

## Pace + handoff discipline

Past sessions: **3–5 transitions per snapshot per session**, each
user-verified visually, before moving on. One snapshot complete, sign off,
next. Don't batch across sessions.

This doc replaces the chain of incrementally-numbered handoff files. Future
"what's the next chunk of work" decisions should land in
`docs/plans/repo-master-plan-2026-05-19.md` (or its successor) — not in a
new handoff doc at repo root.

---

## Admin-side interactivity (added 2026-06-10)

All 23 `admin-*` snapshots + `wp-dashboard` carry the interactivity script
(injected via `tools/link-interactivity-script.js`; builder-side was wired
earlier). Three admin-specific systems live in `interactivity.js`:

### Cross-snapshot navigation (`initAdminCrossSnapshotNav`)

Hand-browsing only (`window.top === window`, served from `/snapshots/`).
Clicks on `admin.php?page=wpforms-*` links are intercepted and mapped to
sibling snapshot folders:

| Captured URL | Navigates to |
|---|---|
| `page=wpforms-settings&view=<v>` | `admin-settings-<v>` (default `general`) |
| `page=wpforms-tools&view=<v>` | `admin-tools-<v>` (default `import`) |
| `page=wpforms-builder` (Add New / `view=setup`) | `builder-setup` |
| `page=wpforms-builder&view=fields` (edit-form rows) | `builder-fields` |
| `page=wpforms-overview` / `-entries` / `-addons` / `-templates` / `-payments` | matching `admin-*` snapshot |

A `HEAD` existence check makes missing captures no-op instead of 404.
Navigation eases out (120 ms fade on `#wpbody-content`) before leaving.
**Inert inside the video player iframe** — videos swap snapshots instead.

### Entrance fx (`initAdminEntranceFx`)

Admin mirror of the builder settle-in: 180 ms content fade
(top-window only), then a 6 px / 35 ms-per-row stagger (cap 14) over the
page's primary collection — provider rows, setting rows, list-table rows,
addon cards, or template cards (first selector with visible matches wins).

### Promote API (`initSnapshotPromoteApi`)

`?promote=<slug>&expand=1` URL params, `window.wpfSnapshotApi.*`, or
`wpf:promote-*` postMessage move an integration row / provider sidebar
item to position 1 without recapturing. Gotcha: slugs are the INTERNAL
provider keys — Brevo is `sendinblue`.
