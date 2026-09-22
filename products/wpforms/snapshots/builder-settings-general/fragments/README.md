# QR Code setting — per-option HTML fragments + state machine

Extracted from this snapshot's frozen DOM (sulliesbakery form 1779, WPForms 2.0.1,
captured 2026-08-21). The frozen page holds **every** QR option state at once —
hidden rows + a `data-state` attribute do the switching, so a film drives states
by mutating the live iframe DOM, never by swapping snapshots.

## Fragments

| File | What it is | Captured state |
|---|---|---|
| `qr-dropdown-row.html` | QR Code `<select>` row (None / Page / Custom URL) | value=`page` |
| `qr-content-block.html` | The whole content block (preview + actions + settings column) | `data-state="generated"` |
| `qr-destination-page-row.html` | Destination Page row (choices.js, shows "Bakery Favorites Survey") | visible |
| `qr-destination-url-row.html` | Destination URL text row (`https://` placeholder) | hidden |
| `qr-logo-row.html` | Logo `<select>` row (None / WPForms / Custom Logo) | value=`wpforms` |
| `qr-logo-custom-block.html` | Upload an Image link + 40px file row + Remove Image | hidden |
| `qr-preview.html` | Preview box with the **real generated SVG** — 780 `<rect>` modules + Sullie logo as embedded data-URI `<image>` | generated |
| `qr-actions.html` | Generate button + Copy/Download pair + PNG/SVG format menu | generated |

The SVG in `qr-preview.html` encodes `http://sulliesbakery.com/bakery-favorites-survey/`.
Its 780 rects are individually addressable — the real code can assemble itself on camera.

## The state machine (mirrors `settings-qr-code.min.js`)

`#wpforms-panel-field-settings-qr_code-content` carries `data-state`; the captured
CSS renders each state. Set the attribute, get the visual:

| `data-state` | Visual (pure CSS, already in the capture) |
|---|---|
| *(none)* / `initial` | placeholder ghost QR (CSS `::before`, `qr-code-placeholder.png`), Generate button |
| `generating` | blue conic spinner over the preview, canvas fades out |
| `success` | green check (Font Awesome `\f058`) for ~1s |
| `generated` | real SVG visible, Copy + Download replace Generate |
| `stale` | canvas fades, blue refresh icon (`\f01e`), preview becomes clickable, button reads "Regenerate QR Code" |
| `error` / `error-logo` / `error-copy` | red cross (`\f057`) |

Class toggles the product JS performs alongside `data-state` (replicate when driving
manually): `wpforms-hidden` on `.wpforms-qr-code-generate` vs
`.wpforms-qr-code-actions-generated` (generated ⟷ initial/stale), on
`.wpforms-panel-field-qr-code-page` / `-url` (destination select), on
`.wpforms-qr-code-format-menu` (Copy/Download click), on
`.wpforms-qr-code-logo-custom` + `.wpforms-qr-code-logo-note` (logo select).

## Interactivity (already wired — `snapshots/_shared/interactivity.js`)

8 transitions: `qr-destination-change`, `qr-destination-value-change`,
`qr-destination-url-input`, `qr-generate-click` (generating → success → generated,
product cadence ~0.9s + 1.0s), `qr-stale-preview-regenerate`, `qr-action-menu-toggle`,
`qr-format-pick`, `qr-logo-change`. Fire a `change`/`click`/`input` event on the
control and the panel behaves like the product. **R11 still applies:** handlers set
STATE off-camera; on-camera motion is GSAP's job (set `data-state` + classes directly
on the timeline).

## Traps (all found by probe, all handled)

1. **Duplicate section:** the frozen page contains a second, INACTIVE copy of the
   whole General section. `getElementById` resolves to the active copy (first in
   DOM); bare class selectors from probe/film code must scope through
   `#wpforms-panel-field-settings-qr_code-content` or `.wpforms-panel-content-section-general.active`.
2. **Visibility bake:** elements hidden at freeze carry inline `display:none`;
   revealing needs the class toggle AND `style.removeProperty('display')`
   (the wired handlers' `qrShow()` does both).
3. **Identity-transform stacking trap:** a captured stylesheet gives
   `.wpforms-panel-fields-group` and the QR content div an identity `transform`,
   which clamps the format menu's z-index under later accordion groups. Neutralized
   by `<style id="wpf-qr-overlay-fix">` in this snapshot's head. (capture-gates
   stacking WARN "as 5" — this is that row, made concrete.)
4. **Copy button:** `navigator.clipboard` doesn't exist on plain-http LocalWP, so
   the live builder itself removed Copy before freeze. Restored byte-for-byte from
   the plugin-rendered markup carried by the inactive duplicate section (annotated
   inline). Production https sites show it.
5. **The SVG cannot re-encode.** The fossil's code always points at the captured
   URL. Regenerate flows replay the state machine truthfully, but a beat must not
   claim a DIFFERENT destination got encoded.
