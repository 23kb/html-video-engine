# Product truth — Layout field

Source doc: https://wpforms.com/docs/how-to-use-the-layout-field-in-wpforms/
(fetched live 2026-08-24; author Umair; modified 2024-12-16).
Capture evidence: `snapshots/builder-field-options-layout`.

## Definitions (doc-sourced)

- **Layout field**: container field under **Fancy Fields**; arranges fields in
  1–4 columns that adjust responsively. Basic license and up.
- **Choosing a layout**: click the Layout field in the preview → Field Options
  shows preset tiles (capture: 9 presets — 100, 50-50, 67-33, 33-67, 33-33-33,
  50-25-25, 25-25-50, 25-50-25, 25-25-25-25; radios + `label.preset-*` tiles).
  Default = 50/50.
- **Display order**: `Rows` (left→right; default, recommended for stacked
  fields so mobile/notifications/entries preserve order) vs `Columns`
  (capture: `#wpforms-field-option-40-display` select).
- **Switching layouts**: allowed after filling; fewer columns → last column's
  fields move to the form body.
- **Adding fields to columns**: drag from sidebar into the target column.
  Layout / Page Break / Repeater / Entry Preview can't go inside. Most fields
  default to large (full column width) size inside.
- **Conditional logic**: Smart Logic tab → Enable Conditional Logic — shows or
  hides the WHOLE Layout field (WPForms ≥1.9.0); per-field CL inside is then
  disabled.
- **Removing**: trash icon → confirm overlay deletes the layout AND its fields.

## Capture facts

- Canvas (Contact-style fixture): Name(1), Email(2), Layout(40, 50/50 with 2
  empty placeholder columns), Paragraph Text(4), Multiple Choice(6, First/
  Second choices…), Checkboxes(7), Phone "Phone (Smart format)"(10).
- Registered interactivity: `layout-preset` (radio change REBUILDS the canvas
  columns preserving children), `layout-display`, `activate-canvas-field`.
- Sidebar: options panel open on field 40; palette pane
  `#wpforms-add-fields-tab` captured `display:none` (tab li is `#add-fields` —
  the exact cc 7 id pair).
- Smart Logic group `#wpforms-field-option-conditionals-40` captured collapsed
  with NO accordion CSS (capture strips hidden-state styles — same class as
  the export-page choices dropdown); CL toggle
  `#wpforms-field-option-40-conditional_logic` present; the rule-builder
  subtree is NOT captured (cloned from
  `snapshots/builder-settings-notifications-cl` at runtime, per the
  webhooks-addon precedent).

## Divergences found while building the video

- None — doc and captured product agree on every surface shown.
