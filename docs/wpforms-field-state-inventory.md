# WPForms Field-State Inventory

> Author: human.
> Format: natural-language notes per field, with real after-state HTML
> pasted inline. This is evidence type (5) per `visual-payoff-truth-contract.md`.
> No inferred truth.

## Conventions

- **must / nice / never / skip** = filmability tag.
  - `must` — videos will demonstrate this; payoff truth required.
  - `nice` — might film occasionally; truth helpful but not urgent.
  - `never` — no video will film this (frontend-only, theme-only, dev-only). Skip in registry.
  - `skip` — universal control (Hide Label, Read-Only, Placeholder, Default Value). Default to no-film when the video is *about a different feature*. Becomes `must` only when the video is specifically about that universal control.
- HTML blocks are real builder DOM after the change. Diff against the field's base snapshot to identify what actually flipped.

---

## Universal controls (apply to all fields unless noted)

These show on most fields. Default tag is `skip` unless the video is specifically about the control.

- **Label** — text-content swap on `label.label-title > span.text`. `skip`.
- **Description** — text-content swap on `.description`. `skip`.
- **Required** — toggles asterisk in label. `nice`. (Toggle adds/removes `<span class="required">*</span>`; wrapper gains `required` class.)
- **Field Size** — `small` / `medium` / `large` adds `size-{value}` class on field wrapper. `nice`.
- **Placeholder** — sets `placeholder` attr on the input. `skip`.
- **Default Value** — sets `value` attr; supports Smart Tags via a dropdown panel. `skip` for the value itself; smart-tag dropdown is its own state if filmed.
- **Hide Label** — adds `label_hide` class to wrapper + crossed-out eye icon next to the label. `skip`. *Snippet under Name #4.*
- **Read-Only** — adds `readonly` class to wrapper + grays the field. `skip`. *Snippet under Name #5.*
- **CSS Classes** — appends classes to wrapper. No reliable visual payoff (theme-dependent). `never`.
- **Conditional Logic** — sidebar reveal only; no canvas payoff. `never` for canvas; if filming the mechanic, capture the sidebar.
- **Enable Calculation** *(supported fields only)* — toggle reveals a Formula editor row with CodeMirror + Insert Field dropdown + Validate Formula + Generate Formula (AI). `nice` for the editor reveal. Snippet below.

### Snippet — Calculation editor row when toggle is on
*(applies to any field that supports Calculations — Single Line Text, Paragraph Text, Numbers, etc.)*

```html
<div class="wpforms-field-option-row wpforms-field-option-row-calculation_code wpforms-hidden" id="wpforms-field-option-row-{id}-calculation_code" data-field-id="{id}" style="display: block;">
  <label for="wpforms-field-option-{id}-calculation_code">
    Formula
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Using your form fields as variables, enter your formula below and ensure there are no extra spaces. Validate your formula when finished."></i>
    <button type="button" class="wpforms-btn-purple wpforms-ai-modal-button wpforms-ai-calculations-button wpforms-btn" id="wpforms-field-option-{id}-ai_modal_button" data-field-id="{id}">Generate Formula</button>
  </label>
  <div class="wpforms-calculations-editor-collapsed">
    <div class="wpforms-calculations-editor-wrap">
      <div class="toolbar">
        <button type="button" class="button-insert-field">Insert Field</button>
        <button type="button" class="button-plus">+</button>
        <button type="button" class="button-plus">-</button>
        <button type="button" class="button-divide">/</button>
        <button type="button" class="button-multiply">*</button>
        <button type="button" class="button-br-open">(</button>
        <button type="button" class="button-br-close">)</button>
        <button type="button" class="button-expand-editor wpforms-calculations-expand-editor"><i class="fa fa-expand"></i></button>
      </div>
      <textarea class="wpforms-codemirror-editor" id="wpforms-field-option-{id}-calculation_code" name="fields[{id}][calculation_code]" rows="3"></textarea>
      <!-- CodeMirror DOM is mounted by JS; rendered host element shown in the source paste -->
      <div class="wpforms-calculations-below-editor">
        <div class="wpforms-calculations-validate-formula-wrap">
          <button type="button" class="wpforms-calculations-validate-formula disabled">Validate Formula</button>
          <span class="wpforms-calculations-validate-formula-status"></span>
        </div>
        <a href="https://wpforms.com/calculations-formula-cheatsheet/" target="_blank" rel="noopener noreferrer" class="wpforms-calculations-cheatsheet-link">
          <i class="fa fa-file-text-o"></i><span>Cheatsheet</span>
        </a>
      </div>
    </div>
  </div>
  <div class="wpforms-calculations-editor-expanded"></div>
  <!-- Insert Field dropdown panel — populated dynamically with available fields -->
  <div class="wpforms-builder-dropdown-list closed insert-field-dropdown">
    <div class="title">Form Fields</div>
    <ul></ul>
    <div class="wpforms-no-results">Sorry, no results found</div>
  </div>
</div>
```

> Note: the CodeMirror editor inside is JS-mounted at runtime. The snippet above shows the static container; the inner CodeMirror DOM (`.CodeMirror`, lines, gutters) appears only after the editor mounts. If a video films the editor active, capture is required.

---

# Fields

## 1. Name field

Base snapshot: `snapshots/builder-field-options-name/`

### General tab

**Format** (dropdown: Simple / First Last / First Middle Last) — **must**.
Each value swaps which sub-field block is visible on the canvas. The wrapper's `format-selected-*` class flips; all three sub-blocks (`.wpforms-simple`, `.wpforms-first-name`, `.wpforms-middle-name`, `.wpforms-last-name`) are present in the DOM, only one set is visible per format.

**Snippet — Format = Simple:**

```html
<div class="wpforms-field wpforms-field-name size-medium required ui-sortable-handle active" id="wpforms-field-48" data-field-id="48" data-field-type="name">
  <a href="#" class="wpforms-field-duplicate" title="Duplicate Field"><i class="fa fa-files-o" aria-hidden="true"></i></a>
  <a href="#" class="wpforms-field-delete" title="Delete Field"><i class="fa fa-trash-o" aria-hidden="true"></i></a>
  <div class="wpforms-field-multi-field-menu">
    <ul class="wpforms-context-menu-list">
      <li class="wpforms-context-menu-list-item" data-action="duplicate-multi"><span class="wpforms-context-menu-list-item-icon"><i class="fa fa-files-o"></i></span><span class="wpforms-context-menu-list-item-text">Duplicate Fields</span></li>
      <li class="wpforms-context-menu-list-divider"></li>
      <li class="wpforms-context-menu-list-item" data-action="delete-multi"><span class="wpforms-context-menu-list-item-icon"><i class="fa fa-trash-o"></i></span><span class="wpforms-context-menu-list-item-text">Delete Fields</span></li>
    </ul>
  </div>
  <div class="wpforms-field-helper">
    <span class="wpforms-field-helper-edit">Click to Edit</span>
    <span class="wpforms-field-helper-drag">Drag to Reorder</span>
    <span class="wpforms-field-helper-hide" title="Hide Helper"><i class="fa fa-times-circle"></i></span>
  </div>
  <label class="label-title">
    <span class="hidden_text" title="Label Hidden"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Name</span>
    <span class="required">*</span>
  </label>
  <div class="format-selected format-selected-simple">
    <div class="wpforms-simple"><input type="text" placeholder="" value="" class="primary-input" readonly></div>
    <div class="wpforms-first-name"><input type="text" placeholder="" value="" class="primary-input" readonly><label class="wpforms-sub-label">First</label></div>
    <div class="wpforms-middle-name"><input type="text" placeholder="" value="" class="primary-input" readonly><label class="wpforms-sub-label">Middle</label></div>
    <div class="wpforms-last-name"><input type="text" placeholder="" value="" class="primary-input" readonly><label class="wpforms-sub-label">Last</label></div>
  </div>
  <div class="description"></div>
</div>
```

**Snippet — Format = First Last:** identical to Simple except wrapper class is `format-selected format-selected-first-last`. CSS hides `.wpforms-simple` and `.wpforms-middle-name`; First + Last show.

**Snippet — Format = First Middle Last:** identical except wrapper class is `format-selected format-selected-first-middle-last`. All three (First, Middle, Last) show.

> Implementation note: this is a pure class swap on the inner `.format-selected` div. All three layouts ship in the DOM at all times — the visible one is decided by CSS. Patchable as `setNameFormat(doc, fieldId, 'simple'|'first-last'|'first-middle-last')` once registered.

### Advanced tab

- Placeholder text input — `skip`.
- Default value (with Smart Tags) — `skip`. Snippet for placeholder added (`placeholder="umair"` on the simple input) — see the source HTML provided.
- Hide Label — `skip`. Adds `label_hide` to wrapper. Snippet:

```html
<div class="wpforms-field wpforms-field-name size-medium required ui-sortable-handle active label_hide" id="wpforms-field-48" data-field-id="48" data-field-type="name">
  <!-- … rest identical to base; only the wrapper class list changes — `label_hide` is appended … -->
</div>
```

- Read-Only — `skip`. Adds `readonly` to wrapper, grays the field. Note: the wrapper here also drops the `required` class (the user's pasted HTML for Read-Only does not include `required`). Snippet:

```html
<div class="wpforms-field wpforms-field-name size-medium ui-sortable-handle active readonly" id="wpforms-field-48" data-field-id="48" data-field-type="name">
  <!-- … rest identical to base except wrapper class includes `readonly` and excludes `required` … -->
</div>
```

- Field Size, CSS Classes — universal. See top.

---

## 2. Email field

Base snapshot: `snapshots/builder-field-options-email/`

### General tab

**Enable Email Confirmation** (toggle) — **nice**.
When enabled, a second "Confirm Email" sub-input appears on the canvas. Wrapper's inner block becomes `.wpforms-confirm wpforms-confirm-enabled` containing two sub-blocks (primary + confirmation). Disabled state shows only one input.

**Snippet — Confirmation enabled:**

```html
<div class="wpforms-field wpforms-field-email size-medium required ui-sortable-handle active" id="wpforms-field-49" data-field-id="49" data-field-type="email">
  <!-- duplicate/delete/menu/helper/label identical to base -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Email</span>
    <span class="required">*</span>
  </label>
  <div class="wpforms-confirm wpforms-confirm-enabled">
    <div class="wpforms-confirm-primary">
      <input type="email" placeholder="" value="" class="primary-input" readonly>
      <label class="wpforms-sub-label">Email</label>
    </div>
    <div class="wpforms-confirm-confirmation">
      <input type="email" placeholder="" class="secondary-input" readonly>
      <label class="wpforms-sub-label">Confirm Email</label>
    </div>
  </div>
  <div class="description"></div>
</div>
```

> Implementation note: pure class flip + sub-block reveal. Both sub-blocks should be present in the base DOM. Patchable as `setEmailConfirmation(doc, fieldId, on)`.

### Advanced tab

- **Placeholder Text** — `skip`. Always shown.
- **Confirmation Placeholder Text** — `skip`. Only shown in the field-options panel when Email Confirmation is enabled. (Sidebar-only; canvas effect is just the `placeholder` attr on `.secondary-input`.)
- **Default Value** — `skip`.
- **Allowlist / Denylist** (dropdown: None / Allowlist / Denylist) — **must**.
  When the dropdown is set to Allowlist or Denylist, an additional textarea row appears below it in the field-options panel. **No canvas payoff** — purely a sidebar/options-panel state. Filmable as a sidebar reveal.

**Snippet — dropdown row:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-filter_type" id="wpforms-field-option-row-49-filter_type" data-field-id="49">
  <label for="wpforms-field-option-49-filter_type">
    Allowlist / Denylist
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Restrict which email addresses are allowed. Be sure to separate each email address with a comma."></i>
  </label>
  <select id="wpforms-field-option-49-filter_type" name="fields[49][filter_type]">
    <option value="" selected>None</option>
    <option value="allowlist">Allowlist</option>
    <option value="denylist">Denylist</option>
  </select>
</div>
```

**Snippet — textarea row revealed when Allowlist or Denylist is picked:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-allowlist" id="wpforms-field-option-row-49-allowlist" data-field-id="49">
  <textarea id="wpforms-field-option-49-allowlist" name="fields[49][allowlist]" rows="3"></textarea>
</div>
```

> Implementation note: this is a sidebar-only payoff. The compiler should NOT patch the canvas for this; only the option-row reveal in the sidebar is filmable.

- **Hide Label / Hide Sublabels / Read-Only** — `skip` universals.
- **Disable Suggestions** (toggle) — `never`. Frontend behaviour only; no builder change.

---

## 3. Paragraph Text field

Base snapshot: `snapshots/builder-field-options-textarea/`

### General tab

Nothing field-specific worth filming. Standard Label / Description / Required.

### Advanced tab

- **Placeholder Text** — `skip` universal.
- **Default Value** — `skip` universal.
- **Hide Label / Read-Only** — `skip` universals.
- **Enable Survey Reporting** (toggle) — `never`. Tied to Surveys & Polls addon; no canvas effect.
- **Limit Length** (toggle) — **nice**.
  When enabled, a number input + Characters/Words selector appears below it in the field-options panel. **No canvas payoff** — sidebar reveal only.

**Snippet — Limit Length toggle row (enabled):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-limit_enabled" id="wpforms-field-option-row-50-limit_enabled" data-field-id="50">
  <span class="wpforms-toggle-control">
    <input type="checkbox" id="wpforms-field-option-50-limit_enabled" name="fields[50][limit_enabled]" value="1">
    <label class="wpforms-toggle-control-icon" for="wpforms-field-option-50-limit_enabled"></label>
    <label for="wpforms-field-option-50-limit_enabled" class="wpforms-toggle-control-label">Limit Length</label>
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Check this option to limit text length by characters or words count."></i>
  </span>
</div>
```

**Snippet — controls row revealed when toggle is on:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-limit_controls" id="wpforms-field-option-row-50-limit_controls" data-field-id="50">
  <input type="number" id="wpforms-field-option-50-limit_count" name="fields[50][limit_count]" value="1" placeholder="" min="1" step="1" pattern="[0-9]">
  <select id="wpforms-field-option-50-limit_mode" name="fields[50][limit_mode]">
    <option value="characters" selected>Characters</option>
    <option value="words">Words</option>
  </select>
</div>
```

> Implementation note: sidebar-only. No canvas patch.

- **Enable Calculation** (toggle) — see Universal controls. Same Formula editor reveal as on other supported fields.

---

# Pending fields (TODO)

## 4. Single Line Text  (`builder-field-options-text`)

Base snapshot: `snapshots/builder-field-options-text/`

Nothing special. All controls are universals (Label, Description, Required, Field Size, Placeholder, Default Value, Limit Length, Input Mask, Hide Label, Read-Only, CSS Classes, Conditional Logic). Default tag → `skip` for film coverage unless the tutorial is specifically about that universal.

**Enable Address Autocomplete** (Advanced) — same control as on Address (#10). `nice` for sidebar reveal. No builder canvas payoff. Backend functionality only.

## 5. Dropdown  (`builder-field-options-select`)

Base snapshot: `snapshots/builder-field-options-select/`

### General tab

The General tab houses the **Choices list** management UI. Canvas updates only when choices are added, removed, edited, or reordered (which adds/removes/relabels `<option>` elements in the canvas `<select>`). No other General-tab control changes canvas appearance directly.

**Add / Remove / Edit label / Reorder choice** — **must**.

Each choice in the list lives as an `<li>` inside `ul#wpforms-field-option-{id}-choices-list.choices-list`. The `<li>` carries a drag handle (`.move`), a default radio, the visible label input, the +/- buttons, an internal value input, plus pre-baked `.wpforms-image-upload` and `.wpforms-icon-select` blocks that are activated by the Image Choices / Icon Choices toggles on choice-type fields. (For Dropdown, those blocks live in the DOM but render styled-hidden by default.)

**Snippet — choices list with 5 choices (option-row):**

```html
<ul id="wpforms-field-option-5-choices-list" data-next-id="6" class="choices-list wpforms-undo-redo-container wpforms-ai-choices ui-sortable" data-field-id="5" data-field-type="select">
  <li data-key="1">
    <span class="move ui-sortable-handle"><i class="fa fa-grip-lines"></i></span>
    <input type="radio" name="fields[5][choices][1][default]" class="default" value="1">
    <input type="text" name="fields[5][choices][1][label]" value="First Choice" class="label">
    <a class="add" href="#"><i class="fa fa-plus-circle"></i></a>
    <a class="remove" href="#"><i class="fa fa-minus-circle"></i></a>
    <input type="text" name="fields[5][choices][1][value]" value="" class="value">
    <div class="wpforms-image-upload">
      <div class="preview"></div>
      <button class="wpforms-btn wpforms-btn-sm wpforms-btn-blue wpforms-btn-block wpforms-image-upload-add" data-after-upload="hide">Upload Image</button>
      <input type="hidden" name="fields[5][choices][1][image]" value="" class="source">
    </div>
    <div class="wpforms-icon-select">
      <i class="ic-fa-preview ic-fa-regular ic-fa-face-smile"></i>
      <span>face-smile</span>
      <i class="fa fa-edit"></i>
      <input type="hidden" name="fields[5][choices][1][icon]" value="face-smile" class="source-icon">
      <input type="hidden" name="fields[5][choices][1][icon_style]" value="regular" class="source-icon-style">
    </div>
  </li>
  <li data-key="2"><!-- Second Choice — same structure --></li>
  <li data-key="3"><!-- Third Choice  — same structure --></li>
  <li data-key="4"><!-- Fourth Choice — same structure --></li>
  <li data-key="5"><!-- Fifth Choice  — same structure --></li>
</ul>
```

> Implementation note: adding a choice clones the `<li>` template with `data-key={next-id}` and appends a matching `<option>` to the canvas `<select>`. Removing reverses both. Reorder is a DOM move; the canvas `<select>` options must follow the same order. Editing the label in the option-row updates the `<option>` text on the canvas. All four operations are pure DOM transforms.

### Advanced tab

The Advanced group contains 8 controls in this order:

1. Enable Survey Reporting
2. Multiple Options Selection
3. Style
4. Field Size
5. Placeholder Text
6. Dynamic Choices
7. CSS Classes
8. Hide Label
9. Read-Only

**Enable Survey Reporting** (toggle) — `never`. Backend-only (Surveys & Polls addon).

**Multiple Options Selection** (toggle) — **must**.
When on, the canvas `<select class="primary-input">` gains a `multiple=""` attribute. Pure attribute toggle.

**Class diff (canvas):**

```text
OFF: <select class="primary-input" readonly="" data-choicesjs-key="…">
ON : <select class="primary-input" readonly="" multiple="">
```

**Snippet — canvas, Multiple = on, Style = Classic, 5 choices:**

```html
<div class="wpforms-field wpforms-field-select size-medium ui-sortable-handle active" id="wpforms-field-5" data-field-id="5" data-field-type="select">
  <!-- duplicate / delete / multi-menu / helper / label omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Dropdown</span>
    <span class="required">*</span>
  </label>
  <select class="primary-input" readonly multiple>
    <option value="First Choice">First Choice</option>
    <option value="Second Choice">Second Choice</option>
    <option value="Third Choice">Third Choice</option>
    <option value="Fourth Choice">Fourth Choice</option>
    <option value="Fifth Choice">Fifth Choice</option>
  </select>
  <div class="description"></div>
</div>
```

> Note: when Multiple = on, the `data-choicesjs-key` attribute is dropped (Choices.js doesn't wrap a multi-select the same way). When Multiple = off + Style = Classic, the `<select>` carries `data-choicesjs-key` but renders as a plain native select.

**Style** (dropdown: Classic / Modern) — **must**.
Classic renders a plain native `<select>`. Modern wraps it with the full Choices.js DOM (`.choices.is-disabled` host, `.choices__inner`, `.choices__list--dropdown` with all options pre-rendered). Both states are real DOM that the snapshot can ship.

**Snippet — canvas, Style = Classic (default):**

```html
<select class="primary-input" readonly data-choicesjs-key="19dd3fb2f29">
  <option value="First Choice">First Choice</option>
  <option value="Second Choice">Second Choice</option>
  <option value="Third Choice">Third Choice</option>
  <option value="Fourth Choice">Fourth Choice</option>
  <option value="Fifth Choice">Fifth Choice</option>
</select>
```

**Snippet — canvas, Style = Modern (Choices.js wrapper):**

```html
<div class="choices is-disabled" data-type="select-one" tabindex="-1" role="combobox" aria-autocomplete="list" aria-haspopup="true" aria-expanded="false" aria-disabled="true">
  <div class="choices__inner">
    <select class="primary-input choices__input" readonly data-choicesjs-key="19dd3fc5d31" hidden tabindex="-1" data-choice="active">
      <option value="" data-custom-properties="[object Object]"></option>
    </select>
    <div class="choices__list choices__list--single">
      <div class="choices__item choices__placeholder choices__item--selectable" data-item data-id="2" data-value="" aria-selected="true"></div>
    </div>
  </div>
  <div class="choices__list choices__list--dropdown" aria-expanded="false">
    <input type="search" name="search_terms" class="choices__input choices__input--cloned" placeholder="" disabled>
    <div class="choices__list" role="listbox">
      <div id="choices--3tp1-item-choice-6" class="choices__item choices__item--choice is-selected choices__placeholder choices__item--selectable is-highlighted" role="option" data-id="6" data-value="" aria-selected="true"></div>
      <div id="choices--3tp1-item-choice-1" class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="1" data-value="First Choice">First Choice</div>
      <div id="choices--3tp1-item-choice-2" class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="2" data-value="Second Choice">Second Choice</div>
      <div id="choices--3tp1-item-choice-3" class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="3" data-value="Third Choice">Third Choice</div>
      <div id="choices--3tp1-item-choice-4" class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="4" data-value="Fourth Choice">Fourth Choice</div>
      <div id="choices--3tp1-item-choice-5" class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="5" data-value="Fifth Choice">Fifth Choice</div>
    </div>
  </div>
</div>
```

> Implementation note: this is a structural DOM swap — replace the `<select>` with the Choices.js wrapper (or vice versa). Patchable, but needs a careful template; not a single class flip. The Modern wrapper renders the dropdown list pre-expanded with all options visible, which is useful for filming.

**Field Size** (dropdown: Small / Medium / Large, default Medium) — universal `nice`. Toggles `size-{value}` on the field wrapper. Note the row also carries a hidden sub-label warning: "Field size cannot be changed when used in a layout."

**Placeholder Text** — universal `skip`.

**Dynamic Choices** (dropdown: Off / Post Type / Taxonomy) — **must** for sidebar reveal.
When set to Post Type or Taxonomy, additional sub-rows reveal in the sidebar (source selector). The canvas `<select>` options are then **replaced** by sample post titles or taxonomies pulled from the WordPress site. **Canvas-side payoff requires capture or live data** — not a pure DOM patch (the post titles are unknown to the snapshot).

> No canvas snippet provided. **Default approach**: derive the populated state from `snapshots/builder-field-options-select/` using product-truth DOM in this inventory plus a real captured DOM snippet of the post-titles list. Recapture only if the structural base is missing or not truthfully derivable from the live site. (The earlier per-state capture was intentionally deleted.)

**Snippet — Dynamic Choices dropdown row (revealed values):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-dynamic_choices" id="wpforms-field-option-row-5-dynamic_choices" data-field-id="5">
  <label for="wpforms-field-option-5-dynamic_choices">Dynamic Choices</label>
  <select id="wpforms-field-option-5-dynamic_choices" name="fields[5][dynamic_choices]">
    <option value="" selected>Off</option>
    <option value="post_type">Post Type</option>
    <option value="taxonomy">Taxonomy</option>
  </select>
</div>
```

**CSS Classes** (with embedded "Show Layouts" picker) — universal `never`. Same picker pattern as Page Break Advanced.

**Hide Label / Read-Only** — universals.

### Filmability summary

- Choices add/remove/edit/reorder → `must`. DOM-patch via `<li>` clone + `<option>` clone.
- Multiple Options Selection → `must`. Single attribute toggle.
- Style (Classic/Modern) → `must`. Structural DOM swap (or pre-ship both, gated by visibility).
- Dynamic Choices → `must` for sidebar; **canvas needs capture** because options come from live WP data.
- Survey Reporting → `never`.
- Field Size, Placeholder, CSS Classes, Hide Label, Read-Only → universals (mostly `skip`, never).

## 6. Multiple Choice  (`builder-field-options-radio`)

Base snapshot: `snapshots/builder-field-options-radio/`

> Note: this field is `data-field-type="radio"` and the wrapper carries `wpforms-field-radio`. Same family as Checkboxes (`data-field-type="checkbox"`); the Image / Icon / Layout patterns documented here transfer 1-to-1 to Checkboxes.

### General tab

**Choices list** (add / remove / edit / reorder via the choices-list ul) — **must**.
Same `<li>` template as Dropdown choices, but the `<ul>` carries an inline CSS variable: `style="--wpforms-icon-choices-color: #066aab;"`. The default Choice color (`#066aab`) is a custom property that drives the icon-choices accent color when Icon Choices is enabled.

**Snippet — choices list with 5 choices:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-choices" id="wpforms-field-option-row-6-choices" data-field-id="6">
  <label for="wpforms-field-option-6-choices">Choices
    <i class="fa fa-question-circle-o wpforms-help-tooltip"></i>
    <a href="#" class="toggle-bulk-add-display toggle-unfoldable-cont"><i class="fa fa-download"></i><span>Bulk Add</span></a>
  </label>
  <ul id="wpforms-field-option-6-choices-list" data-next-id="8" class="choices-list wpforms-undo-redo-container wpforms-ai-choices ui-sortable" data-field-id="6" data-field-type="radio" style="--wpforms-icon-choices-color: #066aab;">
    <li data-key="1">
      <span class="move ui-sortable-handle"><i class="fa fa-grip-lines"></i></span>
      <input type="radio" name="fields[6][choices][1][default]" class="default" value="1">
      <input type="text" name="fields[6][choices][1][label]" value="First Choice" class="label">
      <a class="add" href="#"><i class="fa fa-plus-circle"></i></a>
      <a class="remove" href="#"><i class="fa fa-minus-circle"></i></a>
      <input type="text" name="fields[6][choices][1][value]" value="" class="value">
      <div class="wpforms-image-upload">
        <div class="preview"></div>
        <button class="wpforms-btn wpforms-btn-sm wpforms-btn-blue wpforms-btn-block wpforms-image-upload-add" data-after-upload="hide">Upload Image</button>
        <input type="hidden" name="fields[6][choices][1][image]" value="" class="source">
      </div>
      <div class="wpforms-icon-select">
        <i class="ic-fa-preview ic-fa-regular ic-fa-face-smile"></i>
        <span>face-smile</span>
        <i class="fa fa-edit"></i>
        <input type="hidden" name="fields[6][choices][1][icon]" value="face-smile" class="source-icon">
        <input type="hidden" name="fields[6][choices][1][icon_style]" value="regular" class="source-icon-style">
      </div>
    </li>
    <!-- additional <li data-key="2..."> entries — same template -->
  </ul>
  <div class="wpforms-alert-warning wpforms-alert wpforms-hidden">
    <h4>Dynamic Choices Active</h4>
    <p>Choices are dynamically populated from the <span class="dynamic-name"></span> <span class="dynamic-type"></span>. Go to the Advanced tab to change this.</p>
  </div>
</div>
```

**Add Other Choice** (toggle) — **must**.
Appends a `<li class="wpforms-choice-other-option not-draggable">` to the choices-list with the drag handle and add/remove buttons disabled, plus a hidden `other-flag` input. On the canvas, an extra `<input type="text" class="wpforms-other-input wpforms-hidden">` is also appended (it stays hidden in the builder; on the live frontend it appears when the user picks the "Other" option).

**Snippet — Other choice `<li>` in the choices-list:**

```html
<li data-key="8" class="wpforms-choice-other-option not-draggable">
  <span class="move ui-sortable-handle wpforms-disabled"><i class="fa fa-grip-lines"></i></span>
  <input type="radio" name="fields[6][choices][8][default]" class="default" value="1">
  <input type="text" name="fields[6][choices][8][label]" value="Other" class="label">
  <a class="add wpforms-disabled" href="#"><i class="fa fa-plus-circle"></i></a>
  <a class="remove wpforms-disabled" href="#"><i class="fa fa-minus-circle"></i></a>
  <input type="text" name="fields[6][choices][8][value]" value="" class="value">
  <div class="wpforms-image-upload">…</div>
  <div class="wpforms-icon-select">…</div>
  <input type="hidden" class="other-flag" name="fields[6][choices][8][other]" value="1">
</li>
```

**Use Image Choices** (toggle) — **must**.

**Sidebar payoff** when on:
- The choices-list `<ul>` gains class `show-images` (so the per-row Upload Image buttons render).
- Two new option-rows appear: **Hide Images in Entries** (toggle) and **Image Choice Style** (dropdown: Modern / Classic / None, default Modern).

**Canvas payoff**: the canvas `<ul class="primary-input">` is replaced with the image-choices template. Each choice becomes `<li class="wpforms-image-choices-item">` containing an `<img>` (placeholder URL when no image uploaded), a screen-reader radio, and a label.

> **Important: real placeholder image URL.** The placeholder image source seen in your snippet is a live WordPress media URL: `http://sulliesbakery.com/wp-content/plugins/wpforms/assets/images/builder/placeholder-200x125.svg`. The compiler must use the same WPForms placeholder asset path (or the equivalent on the active site); do **not** invent an image src. For per-choice **uploaded** images, the src is a real WP media URL — those payoffs need either a captured snapshot or an explicit snippet, not a synthesized image.

**Snippet — sidebar extras (Image Choices on, Style = Modern):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-choices_images_hide" id="wpforms-field-option-row-6-choices_images_hide" data-field-id="6">
  <span class="wpforms-toggle-control">
    <input type="checkbox" id="wpforms-field-option-6-choices_images_hide" name="fields[6][choices_images_hide]" value="1">
    <label class="wpforms-toggle-control-icon" for="wpforms-field-option-6-choices_images_hide"></label>
    <label for="wpforms-field-option-6-choices_images_hide" class="wpforms-toggle-control-label">Hide Images in Entries</label>
  </span>
</div>
<div class="wpforms-field-option-row wpforms-field-option-row-choices_images_style" id="wpforms-field-option-row-6-choices_images_style" data-field-id="6">
  <label for="wpforms-field-option-6-choices_images_style">Image Choice Style</label>
  <select id="wpforms-field-option-6-choices_images_style" name="fields[6][choices_images_style]">
    <option value="modern" selected>Modern</option>
    <option value="classic">Classic</option>
    <option value="none">None</option>
  </select>
</div>
```

**Snippet — canvas, Image Choices on, Style = Modern:**

```html
<ul class="primary-input wpforms-image-choices wpforms-image-choices-modern">
  <li class="wpforms-image-choices-item">
    <label>
      <span class="wpforms-image-choices-image">
        <img src="http://sulliesbakery.com/wp-content/plugins/wpforms/assets/images/builder/placeholder-200x125.svg" alt="First Choice" title="First Choice">
      </span>
      <input class="wpforms-screen-reader-element" type="radio" readonly>
      <span class="wpforms-image-choices-label">First Choice</span>
    </label>
  </li>
  <!-- … one <li> per choice … -->
</ul>
<input type="text" class="wpforms-other-input wpforms-hidden" placeholder="" value="">
```

**Snippet — canvas, Image Choices on, Style = Classic:** identical except the wrapping `<ul>` class is `primary-input wpforms-image-choices wpforms-image-choices-classic`.

**Snippet — canvas, Image Choices on, Style = None:** wrapping `<ul>` class is `primary-input wpforms-image-choices wpforms-image-choices-none`. Distinct from Modern/Classic in that each `<li>` renders a visible `<input type="radio" readonly>` (preceded by `<br>`) instead of the screen-reader-only radio. Image + label still render.

```html
<ul class="primary-input wpforms-image-choices wpforms-image-choices-none">
  <li class="wpforms-image-choices-item">
    <label>
      <span class="wpforms-image-choices-image">
        <img src="http://sulliesbakery.com/wp-content/plugins/wpforms/assets/images/builder/placeholder-200x125.svg" alt="First Choice" title="First Choice">
      </span>
      <br>
      <input type="radio" readonly>
      <span class="wpforms-image-choices-label">First Choice</span>
    </label>
  </li>
  <!-- … one <li> per choice … -->
</ul>
```

> Note: when the field's Choice Layout is set, that class (`wpforms-list-2-columns` etc.) is on the **field wrapper**, not the `<ul>`. Image-style classes are on the `<ul>`.

**Use Icon Choices** (toggle) — **must**.

**Sidebar payoff** when on, three new option-rows reveal:
- **Icon Color** (color picker — Minicolors widget, default `#066aab`).
- **Icon Size** (dropdown: Large / Medium / Small, default Large).
- **Icon Choice Style** (dropdown: Default / Modern / Classic / None, default Default).

**Canvas payoff**: the canvas `<ul class="primary-input">` is replaced with the icon-choices template. Wrapper classes: `wpforms-icon-choices wpforms-icon-choices-{style} wpforms-icon-choices-{size}` plus the inline `--wpforms-icon-choices-color` CSS variable. Each choice becomes `<li class="wpforms-icon-choices-item">` with an `<i>` glyph (real Font Awesome icon class, e.g. `ic-fa-regular ic-fa-face-smile`), a `wpforms-icon-choices-icon-bg` span, a screen-reader radio, and a label.

**Snippet — sidebar extras (Icon Choices on; defaults Color `#066aab`, Size Large, Style Default):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-choices_icons_color color-picker-row" id="wpforms-field-option-row-6-choices_icons_color" data-field-id="6">
  <label for="wpforms-field-option-6-choices_icons_color">Icon Color</label>
  <div class="minicolors minicolors-theme-default minicolors-position-bottom">
    <input type="text" class="wpforms-color-picker minicolors-input" id="wpforms-field-option-6-choices_icons_color" name="fields[6][choices_icons_color]" value="#066aab" data-fallback-color="#066aab" size="7">
    <span class="minicolors-swatch minicolors-sprite minicolors-input-swatch">
      <span class="minicolors-swatch-color" style="background-color: rgb(6, 106, 171);"></span>
    </span>
    <!-- minicolors-panel hue/grid markup is JS-mounted by the Minicolors widget on init -->
    <!-- When the swatch is clicked, panel opens with `style="display: block;"` and wrapper gains `minicolors-focus`: -->
    <div class="minicolors-panel minicolors-slider-hue" style="display: block;">
      <div class="minicolors-slider minicolors-sprite">
        <div class="minicolors-picker" style="top: 65.1515px;"></div>
      </div>
      <div class="minicolors-opacity-slider minicolors-sprite">
        <div class="minicolors-picker"></div>
      </div>
      <div class="minicolors-grid minicolors-sprite" style="background-color: rgb(0, 153, 255);">
        <div class="minicolors-grid-inner"></div>
        <div class="minicolors-picker" style="top: 49px; left: 145px;"><div></div></div>
      </div>
    </div>
  </div>
</div>
```

> Color-picker open state: when filming the picker open, wrapper class becomes `minicolors minicolors-theme-default minicolors-position-bottom minicolors-focus` and the `.minicolors-panel` gains `style="display: block;"`. Patchable as a class + inline-style flip.

```html
<div class="wpforms-field-option-row wpforms-field-option-row-choices_icons_size" id="wpforms-field-option-row-6-choices_icons_size" data-field-id="6">
  <label for="wpforms-field-option-6-choices_icons_size">Icon Size</label>
  <select id="wpforms-field-option-6-choices_icons_size" name="fields[6][choices_icons_size]">
    <option value="large" selected>Large</option>
    <option value="medium">Medium</option>
    <option value="small">Small</option>
  </select>
</div>
<div class="wpforms-field-option-row wpforms-field-option-row-choices_icons_style" id="wpforms-field-option-row-6-choices_icons_style" data-field-id="6">
  <label for="wpforms-field-option-6-choices_icons_style">Icon Choice Style</label>
  <select id="wpforms-field-option-6-choices_icons_style" name="fields[6][choices_icons_style]">
    <option value="default" selected>Default</option>
    <option value="modern">Modern</option>
    <option value="classic">Classic</option>
    <option value="none">None</option>
  </select>
</div>
```

**Snippet — canvas, Icon Choices on, Style = Default, Size = Large, Color = #066aab:**

```html
<ul class="primary-input wpforms-icon-choices wpforms-icon-choices-default wpforms-icon-choices-large" style="--wpforms-icon-choices-color: #066aab;">
  <li class="wpforms-icon-choices-item">
    <label>
      <span class="wpforms-icon-choices-icon">
        <i class="ic-fa-regular ic-fa-face-smile"></i>
        <span class="wpforms-icon-choices-icon-bg"></span>
      </span>
      <input class="wpforms-screen-reader-element" type="radio" readonly>
      <span class="wpforms-icon-choices-label">First Choice</span>
    </label>
  </li>
  <!-- … one <li> per choice … -->
</ul>
<input type="text" class="wpforms-other-input wpforms-hidden" placeholder="" value="">
```

**Snippet — canvas, Icon Choices on, Style = Modern:** identical except wrapper class is `wpforms-icon-choices-modern` instead of `-default`.

**Snippet — canvas, Icon Choices on, Style = Classic:** identical except wrapper class is `wpforms-icon-choices-classic` instead of `-default`.

> Implementation note: the icon glyph class (`ic-fa-regular ic-fa-face-smile` here) and color (`#066aab` here) come from the per-choice icon source AND the color picker. Defaults: `face-smile` regular at `#066aab`. **The unicode-`★` stand-in pattern is banned by the contract** — render real FA icon class names.

**Icon Picker modal** — clicking the `.wpforms-icon-select` block on a choice row in the field-options panel opens a jconfirm modal where the user browses/searches 2000+ icons. The first page renders 50 icons; pagination at the bottom.

**Snippet — Icon Picker modal (open, page 1, search empty):**

```html
<div class="jconfirm-box jconfirm-hilight-shake jconfirm-type-orange jconfirm-type-animated wpforms-icon-picker-jconfirm-box" role="dialog">
  <div class="jconfirm-closeIcon" style="display: block;">×</div>
  <div class="jconfirm-title-c wpforms-icon-picker-title">
    <span class="jconfirm-title">
      Icon Picker
      <span class="wpforms-icon-picker-description">Browse or search for the perfect icon.</span>
      <input type="text" placeholder="Search 2000+ icons..." class="search" id="wpforms-icon-picker-search">
    </span>
  </div>
  <div class="jconfirm-content-pane wpforms-icon-picker-jconfirm-content-pane">
    <div class="jconfirm-content">
      <div class="wpforms-icon-picker-container" id="wpforms-icon-picker-icons">
        <ul class="wpforms-icon-picker-icons" data-field-id="{id}" data-choice-id="{choiceId}">
          <!-- 50 <li data-icon="…" data-icon-style="…"> entries, e.g.: -->
          <li data-icon="envelope" data-icon-style="regular">
            <i class="ic-fa-regular ic-fa-envelope"></i>
            <span class="name">envelope</span>
          </li>
          <li data-icon="bullhorn" data-icon-style="solid">
            <i class="ic-fa-solid ic-fa-bullhorn"></i>
            <span class="name">bullhorn</span>
          </li>
          <!-- … 48 more on page 1 (heart, star, calendar, phone, etc.) -->
        </ul>
        <ul class="wpforms-icon-picker-pagination">
          <li class="active"><a class="page" href="#" data-i="1" data-page="50">1</a></li>
          <li><a class="page" href="#" data-i="2" data-page="50">2</a></li>
          <li><a class="page" href="#" data-i="3" data-page="50">3</a></li>
          <li class="disabled"><a class="page" href="#">...</a></li>
        </ul>
        <p class="wpforms-icon-picker-not-found wpforms-hidden" data-message="Sorry, we didn't find any matching icons."></p>
      </div>
    </div>
  </div>
</div>
```

> Modal is JS-mounted (jconfirm). The structural pattern is fixed; only the icon list contents differ across pages and search filters. If a tutorial films picking a specific icon via search, that is a separate beat (search input + result render) and likely needs its own capture.

> **Hard constraint:** Image Choices and Icon Choices are mutually exclusive — only one can be enabled at a time. The registry must encode them as XOR. The compiler must reject a brief beat that asks for both on the same field.

### Advanced tab

**Choice Layout** (dropdown: One Column / Two Columns / Three Columns / Inline; default One Column) — **must**.
Adds a class to the **field wrapper** (`#wpforms-field-{id}`):

```text
1 column (default): no extra class
2 columns:          wpforms-list-2-columns
3 columns:          wpforms-list-3-columns
Inline:             wpforms-list-inline
```

**Snippet — canvas, Choice Layout = Two Columns (no Image/Icon Choices):**

```html
<div class="wpforms-field wpforms-field-radio ui-sortable-handle active wpforms-list-2-columns" id="wpforms-field-6" data-field-id="6" data-field-type="radio">
  <!-- duplicate / delete / multi-menu / helper / label omitted -->
  <label class="label-title"><span class="text">Multiple Choice</span><span class="required">*</span></label>
  <ul class="primary-input">
    <li><input type="radio" readonly>First Choice</li>
    <li><input type="radio" readonly>Second Choice</li>
    <li><input type="radio" readonly>Third Choice</li>
  </ul>
  <input type="text" class="wpforms-other-input wpforms-hidden" placeholder="" value="">
</div>
```

**Snippet — canvas, Choice Layout = Inline:** identical except wrapper class is `wpforms-list-inline` (replacing `wpforms-list-2-columns`).

> Implementation note: pure single-class swap on the field wrapper. Patchable as `setChoiceLayout(doc, fieldId, '1'|'2'|'3'|'inline')` — already shipped in `runtime/dom-prep.js` per the audit. This confirms the existing helper is correct.

**Other Advanced controls** *(not provided in detail; defaults from prior audit)*:
- Randomize Choices (toggle) — `never` (frontend-only).
- Dynamic Choices (Off / Post Type / Taxonomy) — `must` for sidebar reveal; canvas needs capture, same as Dropdown.
- Hide Label, CSS Classes, Conditional Logic — universals.

### Filmability summary

- Choices add/remove/edit/reorder/Bulk Add → `must`.
- Add Other Choice → `must`. DOM patch: extra `<li>` with `wpforms-choice-other-option` + canvas `wpforms-other-input`.
- Use Image Choices + Image Choice Style → `must`. Canvas template swap. Real WPForms placeholder image URL required; uploaded images need capture.
- Use Icon Choices + Icon Color/Size/Style → `must`. Canvas template swap with real FA icon class names. Color carried via `--wpforms-icon-choices-color` CSS variable.
- Choice Layout → `must`. Single-class swap on field wrapper.
- Dynamic Choices → `must` for sidebar; canvas needs capture.
- Survey Reporting / Randomize → `never`.

## 7. Checkboxes  (`builder-field-options-checkbox`)

Base snapshot: `snapshots/builder-field-options-checkbox/`

> **Inherits from Multiple Choice (#6) verbatim.** Same General-tab and Advanced-tab controls, same DOM patterns, same `must / nice / never` tags, same Image Choices XOR Icon Choices constraint, same Choice Layout pattern. The only differences are:
>
> 1. `data-field-type="checkbox"`, wrapper class `wpforms-field-checkbox`, canvas inputs are `<input type="checkbox" readonly>` (vs `radio`).
> 2. **Choice Limit** (Advanced) — exists on Checkboxes only. Number input. **Frontend-only** (validates submit count); **no builder canvas payoff**. Sidebar reveal — `nice`.
> 3. **Enable Disclaimer / Terms of Service Display** (Advanced) — exists on Checkboxes only. See below.

### Advanced tab — Checkbox-only controls

**Enable Disclaimer / Terms of Service Display** (toggle) — **must**.
When on, the description div on the canvas gains a `disclaimer` class. CSS renders it as a bordered scroll box. Pure single-class flip on `.description`.

**Class diff (canvas description block):**

```text
OFF: <div class="description"></div>
ON : <div class="description disclaimer"></div>
```

**Snippet — canvas, Disclaimer = on:**

```html
<div class="wpforms-field wpforms-field-checkbox ui-sortable-handle active" id="wpforms-field-7" data-field-id="7" data-field-type="checkbox">
  <!-- duplicate / delete / multi-menu / helper omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Checkboxes</span>
    <span class="required">*</span>
  </label>
  <ul class="primary-input">
    <li><input type="checkbox" readonly>First Choice</li>
  </ul>
  <div class="description disclaimer"></div>
</div>
```

> Implementation note: patchable as `setDisclaimerFormat(doc, fieldId, on)` — toggles the `disclaimer` class on the field's `.description` child. Confirms one of the patches recommended in the audit's section F.

> Pairing note: the disclaimer renders the **Description** text inside the bordered box, so a video filming this beat usually also fills the Description. The `<div class="description disclaimer">` should contain the disclaimer text (the canvas snippet here is empty because no description was set).

**Choice Limit** (number input, Checkboxes only) — `nice`. Sidebar-only; no canvas payoff. Frontend behaviour: when the limit is reached, additional checkbox inputs are disabled. If a tutorial films the limit hitting on the live form, that needs a frontend capture.

### Filmability summary (delta vs Multiple Choice)

- Disclaimer / Terms of Service → `must`. Single-class swap on `.description`.
- Choice Limit → `nice` for sidebar; canvas → `never`; frontend behaviour → capture if filmed.

Everything else: see Multiple Choice (#6).

## 8. Numbers  (`builder-field-options-number`)

Base snapshot: `snapshots/builder-field-options-number/`

### General tab

Universals only.

### Advanced tab

**Range** (Minimum / Maximum number inputs) — `nice` for sidebar reveal; **canvas → `never`**, frontend-only validation. No builder visual payoff.

**Snippet — Range option-row:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-min_max" id="wpforms-field-option-row-8-min_max" data-field-id="8">
  <label for="wpforms-field-option-8-min">Range
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Define the minimum and the maximum values for the field."></i>
  </label>
  <div class="wpforms-input-row">
    <div class="minimum">
      <input type="number" class="wpforms-numbers-min" id="wpforms-field-option-8-min" name="fields[8][min]" value="" placeholder="" step="any">
      <label for="wpforms-field-option-8-min" class="sub-label">Minimum</label>
    </div>
    <div class="maximum">
      <input type="number" class="wpforms-numbers-max" id="wpforms-field-option-8-max" name="fields[8][max]" value="" placeholder="" step="any">
      <label for="wpforms-field-option-8-max" class="sub-label">Maximum</label>
    </div>
  </div>
</div>
```

Universals: Field Size, Placeholder, Default Value, Hide Label, CSS Classes, Conditional Logic. Calculation toggle present (see Universal controls).

## 9. Phone  (`builder-field-options-phone`)

Base snapshot: `snapshots/builder-field-options-phone/`

### General tab

**Format** (dropdown: Smart / International / US) — **must**.
Pure single-attribute swap on the inner `.wpforms-field-phone-input-container`'s `data-format` attribute. The visible canvas DOM is otherwise identical across all three values; CSS reads `data-format` to pick which flag/arrow assets to render in `.wpforms-field-phone-flag` + `.wpforms-field-phone-arrow`.

**Class/attr diff (canvas):**

```text
Smart:         <div class="wpforms-field-phone-input-container" data-format="smart">
US:            <div class="wpforms-field-phone-input-container" data-format="us">
International: <div class="wpforms-field-phone-input-container" data-format="international">
```

**Snippet — canvas, Format = Smart:**

```html
<div class="wpforms-field wpforms-field-phone size-medium ui-sortable-handle active" id="wpforms-field-10" data-field-id="10" data-field-type="phone">
  <!-- duplicate / delete / multi-menu / helper omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Phone</span>
    <span class="required">*</span>
  </label>
  <div class="wpforms-field-phone-input-container" data-format="smart">
    <input type="text" class="primary-input wpforms-field-medium" readonly>
    <div class="wpforms-field-phone-country-container">
      <div class="wpforms-field-phone-flag"></div>
      <div class="wpforms-field-phone-arrow"></div>
    </div>
  </div>
  <div class="description"></div>
</div>
```

**Snippet — canvas, Format = US:** identical except `data-format="us"`.
**Snippet — canvas, Format = International:** identical except `data-format="international"`.

> Implementation note: patchable as `setPhoneFormat(doc, fieldId, 'smart'|'us'|'international')` — single attribute swap on `.wpforms-field-phone-input-container[data-format]`.

> Note on label text: in the source snippets the visible label reads "Phone (Smart format)" across all three captures because the field's label was set to that string. Format does **not** update the label text automatically; only `data-format` flips. The compiler should treat the label as independent.
>
> **Compiler rule:** for video purposes, when a beat demonstrates Phone Format change, the compiler SHOULD also update the field label text to match the chosen format (e.g. "Phone (US format)"). This is a filming convention, not a product behaviour change.

### Advanced tab

Nothing canvas-changing. Universals only.

## 10. Address  (`builder-field-options-address`)

Base snapshot: `snapshots/builder-field-options-address/`

### General tab

**Scheme** (dropdown: US / International) — **must**.
Both scheme blocks (`.wpforms-address-scheme-us` and `.wpforms-address-scheme-international`) are always present in the DOM. The inactive one carries `wpforms-hide`. Pure class flip — same family as File Upload Style.

**Class diff (canvas):**

```text
US:            .wpforms-address-scheme-us            (no wpforms-hide)
               .wpforms-address-scheme-international (wpforms-hide)
International: .wpforms-address-scheme-us            (wpforms-hide)
               .wpforms-address-scheme-international (no wpforms-hide)
```

**Snippet — canvas, Scheme = US (US visible, International hidden):**

```html
<div class="wpforms-field wpforms-field-address size-medium ui-sortable-handle active" id="wpforms-field-15" data-field-id="15" data-field-type="address">
  <!-- duplicate / delete / multi-menu / helper omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Address - US</span>
    <span class="required">*</span>
  </label>
  <div class="wpforms-address-scheme wpforms-address-scheme-us">
    <div class="wpforms-field-row wpforms-address-1">
      <input type="text" readonly>
      <label class="wpforms-sub-label">Address Line 1</label>
    </div>
    <div class="wpforms-field-row wpforms-address-2">
      <input type="text" readonly>
      <label class="wpforms-sub-label">Address Line 2</label>
    </div>
    <div class="wpforms-field-row">
      <div class="wpforms-city wpforms-one-half">
        <input type="text" readonly>
        <label class="wpforms-sub-label">City</label>
      </div>
      <div class="wpforms-state wpforms-one-half last">
        <select readonly><option class="placeholder" selected>--- Select State ---</option></select>
        <label class="wpforms-sub-label">State</label>
      </div>
    </div>
    <div class="wpforms-field-row">
      <div class="wpforms-postal wpforms-one-half">
        <input type="text" readonly>
        <label class="wpforms-sub-label">Zip Code</label>
      </div>
      <div class="wpforms-country wpforms-one-half last"></div>
    </div>
  </div>
  <div class="wpforms-address-scheme wpforms-address-scheme-international wpforms-hide">
    <!-- International block — same row structure with these differences:
         · State sub-block uses <input type="text"> (free text), label "State / Province / Region"
         · Postal label is "Postal Code"
         · Country sub-block has <select> with "--- Select Country ---" placeholder, label "Country" -->
  </div>
  <div class="description"></div>
</div>
```

**Snippet — canvas, Scheme = International:** mirror of above — `wpforms-address-scheme-us` carries `wpforms-hide`, `wpforms-address-scheme-international` does not.

> Implementation note: patchable as `setAddressScheme(doc, fieldId, 'us'|'international')` — toggle `wpforms-hide` on the two scheme siblings.

> Note on label text: the visible label still reads "Address - US" in both your snippets — same quirk as Phone. The compiler must treat the label as independent of the Scheme value.

### Advanced tab

Most controls are placeholder text inputs for each subfield (Address Line 1 / 2 / City / State / Zip / Country) — universals (`skip`).

**Enable Address Autocomplete** (toggle) — `nice` for sidebar reveal; **canvas → no payoff** (functionality only). When on, reveals **Display Map** sub-toggle.

**Display Map** (sub-toggle, only when Autocomplete is on) — **must**.
Inserts a new map placeholder block **above** the scheme blocks: `<div class="wpforms-field-row wpforms-field-medium wpforms-geolocation-map" style="">`. The map renders via the WPForms Geolocation addon (live tile fetch on the frontend); in the builder canvas it appears as the empty placeholder div.

**DOM diff (canvas, Display Map = on):**

```text
+ <div class="wpforms-field-row wpforms-field-medium wpforms-geolocation-map" style=""></div>
  <div class="wpforms-address-scheme wpforms-address-scheme-us">…</div>
  <div class="wpforms-address-scheme wpforms-address-scheme-international wpforms-hide">…</div>
```

**Snippet — canvas, Display Map = on:**

```html
<div class="wpforms-field wpforms-field-address size-medium ui-sortable-handle active" id="wpforms-field-15" data-field-id="15" data-field-type="address">
  <!-- duplicate / delete / multi-menu / helper / label omitted -->
  <div class="wpforms-field-row wpforms-field-medium wpforms-geolocation-map" style=""></div>
  <div class="wpforms-address-scheme wpforms-address-scheme-us">…</div>
  <div class="wpforms-address-scheme wpforms-address-scheme-international wpforms-hide">…</div>
  <div class="description"></div>
</div>
```

> Implementation note: pure DOM insert/remove of the geolocation-map placeholder div. Patchable as `setAddressDisplayMap(doc, fieldId, on)`.

> Conditional dependency: **Display Map** is only available (and only meaningful) when **Enable Address Autocomplete** is also on. Compiler must respect this chain — don't try to insert the map block when Autocomplete is off.

### Filmability summary

- Scheme (US / International) → `must`. Pure class flip on the two scheme siblings.
- Per-subfield Placeholder Text → `skip` universals.
- Enable Address Autocomplete → `nice` for sidebar; canvas `never`.
- Display Map → `must` (canvas DOM insert). Requires Autocomplete = on.
- Hide Label / Hide Sublabels / CSS Classes / Conditional Logic → universals.

## 11. Date / Time  (`builder-field-options-date-time`)

Base snapshot: `snapshots/builder-field-options-date-time/`

### General tab

**Format** (dropdown: Date and Time / Date / Time only) — **must**.
The wrapper of the inner block flips between `.format-selected-date-time`, `.format-selected-date`, `.format-selected-time` (always paired with the base class `.format-selected`). All three sub-blocks (`.wpforms-date.wpforms-date-type-datepicker` and `.wpforms-time`) are present in the DOM at all times — only one set is shown per format via CSS.

**Snippet — Format = Date and Time:**

```html
<div class="wpforms-field wpforms-field-date-time size-medium ui-sortable-handle active" id="wpforms-field-41" data-field-id="41" data-field-type="date-time">
  <!-- duplicate / delete / multi-menu / helper / label identical to base -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Date / Time (Date and Time format)</span>
    <span class="required">*</span>
  </label>
  <div class="format-selected format-selected-date-time">
    <div class="wpforms-date wpforms-date-type-datepicker">
      <div class="wpforms-date-datepicker">
        <input type="text" class="primary-input" readonly>
        <label class="wpforms-sub-label">Date</label>
      </div>
      <div class="wpforms-date-dropdown">
        <select readonly class="first"><option>MM</option></select>
        <select readonly class="second"><option>DD</option></select>
        <select readonly class="third"><option>YYYY</option></select>
        <label class="wpforms-sub-label">Date</label>
      </div>
    </div>
    <div class="wpforms-time">
      <input type="text" class="primary-input" readonly>
      <label class="wpforms-sub-label">Time</label>
    </div>
  </div>
  <div class="description"></div>
</div>
```

**Snippet — Format = Date only:** identical except wrapper class is `format-selected-date format-selected`. Label changes to `Date / Time (Date format)`.

**Snippet — Format = Time only:** identical except wrapper class is `format-selected-time format-selected`. Label changes to `Date / Time (Time format)`.

> Implementation note: pure class swap on the inner `.format-selected` div. Patchable as `setDateTimeFormat(doc, fieldId, 'date-time'|'date'|'time')`.

### Advanced tab

**Date** — **must**. Two sub-controls living in one option row:

- **Type** (dropdown: Date Picker / Date Dropdown). Flips the inner Date sub-block class between `.wpforms-date-type-datepicker` and `.wpforms-date-type-dropdown`. Both sub-children (`.wpforms-date-datepicker` and `.wpforms-date-dropdown`) are present in the DOM; CSS picks which renders.
- **Format** (date-format dropdown: `m/d/Y`, `d/m/Y`, `Y/m/d`, `m.d.Y`, `d.m.Y`, `Y.m.d`, `F j, Y`). The dropdown order in the canvas mini-preview reflects the chosen format (e.g. picking `d/m/Y` swaps the rendered MM/DD/YYYY order to DD/MM/YYYY in the inner select options).

**Snippet — Date sub-row in options panel:**

```html
<div class="wpforms-field-options-columns-2 wpforms-field-options-columns">
  <div class="type wpforms-field-options-column">
    <select id="wpforms-field-option-42-date_type" name="fields[42][date_type]">
      <option value="datepicker" selected>Date Picker</option>
      <option value="dropdown">Date Dropdown</option>
    </select>
    <label for="wpforms-field-option-42-date_type" class="sub-label">Type</label>
  </div>
  <div class="format wpforms-field-options-column">
    <select id="wpforms-field-option-42-date_format" name="fields[42][date_format]">
      <option value="m/d/Y" selected>04/27/2026 (m/d/Y)</option>
      <option value="d/m/Y">27/04/2026 (d/m/Y)</option>
      <option value="Y/m/d">2026/04/27 (Y/m/d)</option>
      <option value="m.d.Y">04.27.2026 (m.d.Y)</option>
      <option value="d.m.Y">27.04.2026 (d.m.Y)</option>
      <option value="Y.m.d">2026.04.27 (Y.m.d)</option>
      <option value="F j, Y" class="datepicker-only">April 27, 2026</option>
    </select>
    <label for="wpforms-field-option-42-date_format" class="sub-label">Format</label>
  </div>
</div>
```

**Snippet — canvas with Type=Date Picker, Format=Date, format=`d/m/Y`:**

```html
<div class="format-selected-date format-selected">
  <div class="wpforms-date wpforms-date-type-datepicker">
    <div class="wpforms-date-datepicker">
      <input type="text" class="primary-input" readonly>
      <label class="wpforms-sub-label">Date</label>
    </div>
    <div class="wpforms-date-dropdown">
      <select readonly class="first"><option>DD</option></select>
      <select readonly class="second"><option>MM</option></select>
      <select readonly class="third"><option>YYYY</option></select>
      <label class="wpforms-sub-label">Date</label>
    </div>
  </div>
  <div class="wpforms-time">
    <input type="text" class="primary-input" readonly>
    <label class="wpforms-sub-label">Time</label>
  </div>
</div>
```

**Snippet — canvas with Type=Date Dropdown:** same as above except inner block class is `wpforms-date wpforms-date-type-dropdown` (only changed token; the rest of the DOM is identical).

> Implementation note: Type swap is a single class toggle. Format swap also reorders the option text inside the three readonly `<select>` elements (MM/DD/YYYY → DD/MM/YYYY, etc.).

**Limit Days** *(only when Format includes Date AND Type=Date Picker)* — **must**. Toggle reveals a 7-checkbox row in the options panel (Mon–Sun, default Mon–Fri checked, Sat/Sun unchecked). **Canvas-side: no builder payoff.** Frontend payoff: disabled day-of-week cells render grayed out in the live datepicker — needs DOM manipulation if filmed.

**Snippet — Limit Days toggle row (on):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-date_limit_days wpforms-clear" id="wpforms-field-option-row-41-date_limit_days" data-field-id="41">
  <span class="wpforms-toggle-control">
    <input type="checkbox" id="wpforms-field-option-41-date_limit_days" name="fields[41][date_limit_days]" class="wpforms-panel-field-toggle" value="1">
    <label class="wpforms-toggle-control-icon" for="wpforms-field-option-41-date_limit_days"></label>
    <label for="wpforms-field-option-41-date_limit_days" class="wpforms-toggle-control-label">Limit Days</label>
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Check this option to adjust which days of the week can be selected."></i>
  </span>
</div>
```

**Snippet — day-of-week checkboxes revealed when Limit Days = on:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-date_limit_days_options wpforms-panel-field-toggle-body wpforms-field-options-columns wpforms-field-options-columns-7 checkboxes-row" id="wpforms-field-option-row-41-date_limit_days_options" data-toggle="fields[41][date_limit_days]" data-toggle-value="1" data-field-id="41">
  <label class="sub-label"><input type="checkbox" class="wpforms-field-options-column" id="wpforms-field-option-41-date_limit_days_mon" name="fields[41][date_limit_days_mon]" value="1" checked><br>Mon</label>
  <label class="sub-label"><input type="checkbox" class="wpforms-field-options-column" id="wpforms-field-option-41-date_limit_days_tue" name="fields[41][date_limit_days_tue]" value="1" checked><br>Tue</label>
  <label class="sub-label"><input type="checkbox" class="wpforms-field-options-column" id="wpforms-field-option-41-date_limit_days_wed" name="fields[41][date_limit_days_wed]" value="1" checked><br>Wed</label>
  <label class="sub-label"><input type="checkbox" class="wpforms-field-options-column" id="wpforms-field-option-41-date_limit_days_thu" name="fields[41][date_limit_days_thu]" value="1" checked><br>Thu</label>
  <label class="sub-label"><input type="checkbox" class="wpforms-field-options-column" id="wpforms-field-option-41-date_limit_days_fri" name="fields[41][date_limit_days_fri]" value="1" checked><br>Fri</label>
  <label class="sub-label"><input type="checkbox" class="wpforms-field-options-column" id="wpforms-field-option-41-date_limit_days_sat" name="fields[41][date_limit_days_sat]" value="1"><br>Sat</label>
  <label class="sub-label"><input type="checkbox" class="wpforms-field-options-column" id="wpforms-field-option-41-date_limit_days_sun" name="fields[41][date_limit_days_sun]" value="1"><br>Sun</label>
</div>
```

**Disable Past Dates** *(only when Type=Date Picker)* — **must**. Toggle. When on, reveals a sub-toggle **Disable Today's Date**.

**Snippet — Disable Today's Date sub-toggle:**

```html
<span class="wpforms-toggle-control">
  <input type="checkbox" id="wpforms-field-option-41-date_disable_todays_date" name="fields[41][date_disable_todays_date]" value="1">
  <label class="wpforms-toggle-control-icon" for="wpforms-field-option-41-date_disable_todays_date"></label>
  <label for="wpforms-field-option-41-date_disable_todays_date" class="wpforms-toggle-control-label">Disable Today's Date</label>
  <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Check this option to prevent today's date from being selected."></i>
</span>
```

> Frontend behaviour: disabled past dates / today render grayed in the live datepicker. Builder canvas: no payoff. If a video films the live datepicker, capture the frontend or apply DOM manipulation to gray-out specific cells.

**Limit Hours** *(only when Format=Time, or Date and Time)* — **must**. Toggle reveals start/end time pickers (hour / minute / AM-PM selects, columns layout).

**Snippet — Limit Hours options revealed (start=09:00 AM, end=06:00 PM):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-time_limit_hours_options wpforms-panel-field-toggle-body" id="wpforms-field-option-row-43-time_limit_hours_options" data-toggle="fields[43][time_limit_hours]" data-toggle-value="1" data-field-id="43">
  <div class="wpforms-field-options-columns wpforms-field-options-columns-4">
    <select class="wpforms-field-options-column" id="wpforms-field-option-43-time_limit_hours_start_hour" name="fields[43][time_limit_hours_start_hour]">
      <option value="01">01</option><option value="02">02</option><option value="03">03</option><option value="04">04</option><option value="05">05</option><option value="06">06</option><option value="07">07</option><option value="08">08</option><option value="09" selected>09</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
    </select>
    <select class="wpforms-field-options-column" id="wpforms-field-option-43-time_limit_hours_start_min" name="fields[43][time_limit_hours_start_min]">
      <option value="00" selected>00</option><option value="05">05</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option><option value="30">30</option><option value="35">35</option><option value="40">40</option><option value="45">45</option><option value="50">50</option><option value="55">55</option>
    </select>
    <select class="wpforms-field-options-column" id="wpforms-field-option-43-time_limit_hours_start_ampm" name="fields[43][time_limit_hours_start_ampm]">
      <option value="am" selected>AM</option><option value="pm">PM</option>
    </select>
    <label for="wpforms-field-option-43-time_limit_hours_start_hour" class="sub-label wpforms-field-options-column">Start Time</label>
    <div class="wpforms-hidden-strict wpforms-field-options-column"></div>
  </div>
  <div class="wpforms-field-options-columns wpforms-field-options-columns-4">
    <select class="wpforms-field-options-column" id="wpforms-field-option-43-time_limit_hours_end_hour" name="fields[43][time_limit_hours_end_hour]">
      <option value="01">01</option><option value="02">02</option><option value="03">03</option><option value="04">04</option><option value="05">05</option><option value="06" selected>06</option><option value="07">07</option><option value="08">08</option><option value="09">09</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
    </select>
    <select class="wpforms-field-options-column" id="wpforms-field-option-43-time_limit_hours_end_min" name="fields[43][time_limit_hours_end_min]">
      <option value="00" selected>00</option><option value="05">05</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option><option value="30">30</option><option value="35">35</option><option value="40">40</option><option value="45">45</option><option value="50">50</option><option value="55">55</option>
    </select>
    <select class="wpforms-field-options-column" id="wpforms-field-option-43-time_limit_hours_end_ampm" name="fields[43][time_limit_hours_end_ampm]">
      <option value="am">AM</option><option value="pm" selected>PM</option>
    </select>
    <label for="wpforms-field-option-43-time_limit_hours_end_hour" class="sub-label wpforms-field-options-column">End Time</label>
    <div class="wpforms-hidden-strict wpforms-field-options-column"></div>
  </div>
</div>
```

> Frontend behaviour: hours outside the start/end window render grayed in the live time picker. Same DOM-manipulation note as Limit Days.

**Hide Sublabels / Hide Label / Read-Only / CSS Classes / Conditional Logic** — universals.

## 12. Website / URL  (`builder-field-options-url`)

Base snapshot: `snapshots/builder-field-options-url/`

Nothing field-specific. All controls are universals (Label, Description, Required, Field Size, Placeholder, Default Value, Hide Label, Read-Only, CSS Classes, Conditional Logic). Defaults to `skip` for video coverage unless a tutorial is specifically about one of those universals.

## 13. File Upload  (`builder-field-options-file-upload`)

Base snapshot: `snapshots/builder-field-options-file-upload/`

### General tab

**Style** (dropdown: Modern / Classic) — **must**.
Both inner blocks (`.wpforms-file-upload-builder-modern` and `.wpforms-file-upload-builder-classic`) are always present in the DOM. The inactive one carries `wpforms-hide`. Pure class flip.

**Snippet — Style = Modern (modern visible, classic hidden):**

```html
<div class="wpforms-field wpforms-field-file-upload ui-sortable-handle active" id="wpforms-field-30" data-field-id="30" data-field-type="file-upload">
  <!-- duplicate / delete / multi-menu / helper omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">File Upload (Modern Style)</span>
    <span class="required">*</span>
  </label>
  <div class="wpforms-file-upload-builder-modern">
    <svg viewBox="0 0 640 640" width="50px" height="50px" fill="#B1B1B1" aria-hidden="true">
      <path d="M352 173.3L352 384…"></path>
    </svg>
    <span class="modern-title">
      Drag &amp; Drop File or <span class="wpforms-file-upload-choose-file">Choose File to Upload</span>
    </span>
    <span class="modern-hint wpforms-hide">You can upload up to 1 files.</span>
  </div>
  <div class="wpforms-file-upload-builder-classic wpforms-hide">
    <input type="file" class="primary-input" readonly>
    <span class="wpforms-file-upload-capture-camera wpforms-file-upload-capture-camera-classic wpforms-hidden">Capture With Your Camera</span>
  </div>
  <div class="description"></div>
</div>
```

**Snippet — Style = Classic (classic visible, modern hidden):** identical except the `wpforms-hide` class swaps:

```text
Modern: <div class="wpforms-file-upload-builder-modern">                    + classic has wpforms-hide
Classic: <div class="wpforms-file-upload-builder-modern wpforms-hide">       + classic NO wpforms-hide
```

> Implementation note: patchable as `setFileUploadStyle(doc, fieldId, 'modern'|'classic')` — toggles `wpforms-hide` on the two inner blocks.

**Store Files in WordPress Media Library** (toggle) — **must**. **Backend-only.** No canvas or live-form visual change. Sidebar reveal only.

**Enable File Access Restrictions** (toggle) — **must**. **Backend-only for runtime behaviour**, but enabling it reveals additional sidebar controls.

When **on**, these option-rows appear in the field-options panel:

**Snippet — User Restriction dropdown (revealed):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-user_restrictions" id="wpforms-field-option-row-30-user_restrictions" data-field-id="30">
  <label for="wpforms-field-option-30-user_restrictions">User Restriction</label>
  <select class="wpforms-file-upload-user-restrictions" id="wpforms-field-option-30-user_restrictions" name="fields[30][user_restrictions]">
    <option value="none" selected>None</option>
    <option value="logged">Logged-in Users</option>
  </select>
</div>
```

When **User Restriction = Logged-in Users**, two more rows appear (User Roles + Users multi-selects, both Choices.js):

**Snippet — User Roles row (Choices.js multi-select):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-user_roles_restrictions" id="wpforms-field-option-row-30-user_roles_restrictions" data-field-id="30">
  <label for="wpforms-field-option-30-user_roles_restrictions">User Roles
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Select the user roles that can access the uploaded files."></i>
  </label>
  <div class="choices" data-type="select-multiple" role="combobox">
    <div class="choices__inner">
      <select class="wpforms-file-upload-user-roles-select wpforms-field-element choices__input" id="wpforms-field-option-30-user_roles_restrictions" name="fields[30][user_roles_restrictions]" multiple hidden>
        <option value="administrator">Administrator</option>
      </select>
      <div class="choices__list choices__list--multiple">
        <div class="choices__item choices__item--selectable" data-id="1" data-value="administrator" aria-selected="true" data-deletable>
          Administrator<button type="button" class="choices__button">Remove item</button>
        </div>
      </div>
      <input type="search" name="search_terms" class="choices__input choices__input--cloned">
    </div>
    <div class="choices__list choices__list--dropdown" aria-expanded="false">
      <div class="choices__list" role="listbox">
        <div class="choices__item choices__item--choice choices__item--selectable is-highlighted" role="option" data-id="2" data-value="author">Author</div>
        <div class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="3" data-value="contributor">Contributor</div>
        <div class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="4" data-value="editor">Editor</div>
        <div class="choices__item choices__item--choice choices__item--selectable" role="option" data-id="5" data-value="subscriber">Subscriber</div>
      </div>
    </div>
  </div>
  <input type="hidden" name="fields[30][user_roles_restrictions]" value='["administrator"]' id="wpforms-field-30-user_roles_restrictions-select-multiple-options">
  <span class="sub-label">All users with selected roles will be able to access the uploaded files.</span>
</div>
```

**Snippet — Users row (Choices.js multi-select, empty by default):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-user_names_restrictions" id="wpforms-field-option-row-30-user_names_restrictions" data-field-id="30">
  <label for="wpforms-field-option-30-user_names_restrictions">Users
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Select the users that can access the uploaded files."></i>
  </label>
  <div class="choices" data-type="select-multiple" role="combobox">
    <div class="choices__inner">
      <select class="wpforms-file-upload-user-names-select wpforms-field-element choices__input" id="wpforms-field-option-30-user_names_restrictions" name="fields[30][user_names_restrictions]" multiple hidden></select>
      <div class="choices__list choices__list--multiple"></div>
      <input type="search" name="search_terms" class="choices__input choices__input--cloned">
    </div>
    <div class="choices__list choices__list--dropdown" aria-expanded="false">
      <div class="choices__list" role="listbox">
        <div class="choices__item choices__item--choice has-no-choices">No results found</div>
      </div>
    </div>
  </div>
  <input type="hidden" name="fields[30][user_names_restrictions]" value="" id="wpforms-field-30-user_names_restrictions-select-multiple-options">
</div>
```

When **File Access Restrictions = on**, an additional **Password Protection** toggle also appears. When that toggle is **on**, two password inputs appear:

**Snippet — Password Protection inputs:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-protection_password_label" id="wpforms-field-option-row-30-protection_password_label" data-field-id="30">
  <label for="wpforms-field-option-30-protection_password_label">Password
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Set a password to protect the uploaded files."></i>
  </label>
</div>
<div class="wpforms-field-option-row wpforms-field-option-row-protection_password_columns" id="wpforms-field-option-row-30-protection_password_columns" data-field-id="30">
  <div class="wpforms-field-option-row wpforms-field-option-row- wpforms-field-options-columns" id="wpforms-field-option-row-30-" data-field-id="30">
    <div class="wpforms-field-option-row wpforms-field-option-row-protection_password" id="wpforms-field-option-row-30-protection_password" data-field-id="30">
      <input type="password" class="wpforms-file-upload-password has-after" id="wpforms-field-option-30-protection_password" name="fields[30][protection_password]" placeholder="" autocomplete="new-password">
      <span class="after-input sub-label">Enter Password</span>
      <button type="button" class="wpforms-file-upload-password-clean wpforms-hidden wpforms-btn" id="wpforms-field-option-30-password_restrictions_clean_button" data-field-id="30" tabindex="-1">
        <i class="fa fa-times-circle fa-lg"></i>
      </button>
    </div>
    <div class="wpforms-field-option-row wpforms-field-option-row-protection_password_confirm" id="wpforms-field-option-row-30-protection_password_confirm" data-field-id="30">
      <input type="password" class="wpforms-file-upload-password-confirm has-after" id="wpforms-field-option-30-protection_password_confirm" name="fields[30][protection_password_confirm]" placeholder="">
      <span class="after-input sub-label">Confirm Password</span>
      <div class="wpforms-field-option-row wpforms-field-option-row-protection_password_confirm_error wpforms-hidden wpforms-error wpforms-error-message" id="wpforms-field-option-row-30-protection_password_confirm_error" data-field-id="30">Passwords do not match</div>
    </div>
  </div>
</div>
```

> Conditional dependency chain:
> - `Enable File Access Restrictions = on` → reveals User Restriction dropdown.
> - User Restriction = `Logged-in Users` → reveals User Roles + Users.
> - `Enable File Access Restrictions = on` → also reveals Password Protection toggle (independent of User Restriction value).
> - Password Protection = on → reveals password + confirm-password inputs.
> Compiler must respect this chain. Sidebar-only — no canvas payoff.

**Enable Camera** (toggle) — **must**. Has both sidebar payoff AND canvas payoff (in Classic style).

**Sidebar payoff** when Camera = on: a Format dropdown appears (Photo / Video, default Photo).

**Snippet — Camera Format dropdown:**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-camera_format wpforms-file-upload-camera-format" id="wpforms-field-option-row-30-camera_format" data-field-id="30">
  <label for="wpforms-field-option-30-camera_format" class="wpforms-file-upload-camera-format-label">Format
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Select the camera format."></i>
  </label>
  <select class="wpforms-file-upload-camera-format-select" id="wpforms-field-option-30-camera_format" name="fields[30][camera_format]">
    <option value="photo" selected>Photo</option>
    <option value="video">Video</option>
  </select>
</div>
```

When **Format = Video**, a Time Limit row appears (Minutes / Seconds number inputs, default 1m 30s):

**Snippet — Camera Time Limit (revealed when Format=Video):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-camera_time_limit wpforms-file-upload-camera-time-limit" id="wpforms-field-option-row-30-camera_time_limit" data-field-id="30">
  <label for="wpforms-field-option-30-camera_time_limit" class="wpforms-file-upload-camera-time-limit-label">Time Limit
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Set the time limit for camera recording."></i>
  </label>
  <div class="wpforms-field-option-row-columns wpforms-field-option-row-columns-2 wpforms-file-upload-camera-time-limit-columns">
    <div class="wpforms-file-upload-camera-time-limit-minutes">
      <input type="number" class="wpforms-file-upload-camera-time-limit-minutes-input has-after" id="wpforms-field-option-30-camera_time_limit_minutes" name="fields[30][camera_time_limit_minutes]" value="1" min="0" step="1">
      <span class="after-input sub-label">Minutes</span>
    </div>
    <div class="wpforms-file-upload-camera-time-limit-seconds">
      <input type="number" class="wpforms-file-upload-camera-time-limit-seconds-input has-after" id="wpforms-field-option-30-camera_time_limit_seconds" name="fields[30][camera_time_limit_seconds]" value="30" min="0" max="59" step="1">
      <span class="after-input sub-label">Seconds</span>
    </div>
  </div>
</div>
```

**Canvas payoff** when Camera = on AND Style = Classic: the "Capture With Your Camera" span inside `.wpforms-file-upload-builder-classic` loses its `wpforms-hidden` class.

**Class diff (canvas, Style=Classic):**

```text
Camera OFF: <span class="wpforms-file-upload-capture-camera wpforms-file-upload-capture-camera-classic wpforms-hidden">…</span>
Camera ON : <span class="wpforms-file-upload-capture-camera wpforms-file-upload-capture-camera-classic">…</span>
```

> When Style = Modern, the Camera capture-button is rendered differently (or only on the live frontend) — the builder canvas Modern block does not gain a Camera-related child in the snippets provided. If a tutorial films Camera + Modern on the canvas, capture or additional snippet is needed.

### Advanced tab

TODO — not provided. Likely Allowed File Extensions, Max File Size, Max File Number, plus universals.

### Filmability summary

- Style = `must`. Pure class-flip patch.
- Store Files in Media Library = `must`. Sidebar-only / backend.
- File Access Restrictions chain (User Restriction, User Roles, Users, Password Protection, Password inputs) = `must` for sidebar reveal. No canvas payoff. Backend-only for runtime.
- Enable Camera = `must`. Sidebar reveal (Format, Time Limit) + canvas class flip on Classic. Modern + Camera canvas needs capture if filmed.

## 14. Password  (`builder-field-options-password`)

Base snapshot: `snapshots/builder-field-options-password/`

### General tab

**Enable Password Confirmation** (toggle) — **must**.
When on, the inner block becomes `.wpforms-confirm wpforms-confirm-enabled` containing **two** sub-blocks: `.wpforms-confirm-primary` and `.wpforms-confirm-confirmation`. Each contains the same `.wpforms-field-password-input` markup (password input + eye-icon block). Sub-labels: "Password" / "Confirm Password".

**Snippet — Confirmation = on, Visibility = on:**

```html
<div class="wpforms-field wpforms-field-password size-medium required ui-sortable-handle active" id="wpforms-field-45" data-field-id="45" data-field-type="password">
  <!-- duplicate / delete / multi-menu / helper / label identical to base -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Password</span>
    <span class="required">*</span>
  </label>
  <div class="wpforms-confirm wpforms-field-password-visibility-enabled wpforms-confirm-enabled">
    <div class="wpforms-confirm-primary">
      <div class="wpforms-field-password-input">
        <input type="password" class="primary-input" readonly>
        <div class="wpforms-field-password-input-icon">
          <svg class="wpforms-field-password-input-icon-invisible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6…"/></svg>
          <svg class="wpforms-field-password-input-icon-visible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2…"/></svg>
        </div>
      </div>
      <label class="wpforms-sub-label">Password</label>
    </div>
    <div class="wpforms-confirm-confirmation">
      <div class="wpforms-field-password-input">
        <input type="password" class="secondary-input" readonly>
        <div class="wpforms-field-password-input-icon">
          <svg class="wpforms-field-password-input-icon-invisible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6…"/></svg>
          <svg class="wpforms-field-password-input-icon-visible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2…"/></svg>
        </div>
      </div>
      <label class="wpforms-sub-label">Confirm Password</label>
    </div>
  </div>
  <div class="description"></div>
</div>
```

> Implementation note: pure class flip (`wpforms-confirm-enabled`) + sub-block reveal. Patchable as `setPasswordConfirmation(doc, fieldId, on)`.

**Enable Password Strength** (toggle) — **must**.
When on, an option-row appears in the field-options panel with a Minimum Strength dropdown (Weak / Medium / Strong, default **Medium**). **Sidebar-only** — no builder canvas payoff. Frontend effect is validation logic at submit time.

**Snippet — Minimum Strength dropdown (revealed):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-password-strength-level" id="wpforms-field-option-row-45-password-strength-level" data-field-id="45">
  <label for="wpforms-field-option-45-">Minimum Strength
    <i class="fa fa-question-circle-o wpforms-help-tooltip" title="Select minimum password strength level."></i>
  </label>
  <select id="wpforms-field-option-45-password-strength-level" name="fields[45][password-strength-level]">
    <option value="2">Weak</option>
    <option value="3" selected>Medium</option>
    <option value="4">Strong</option>
  </select>
</div>
```

**Enable Password Visibility** (toggle) — **must**.
The eye-icon DOM (`.wpforms-field-password-input-icon` with both SVGs) is **always present** in the canvas markup. The toggle flips a single class on the inner `.wpforms-confirm` (or single-input wrapper): `wpforms-field-password-visibility-enabled` is present when on, absent when off. CSS controls whether the eye icon renders.

**Class diff — visibility OFF vs ON:**

```text
OFF: <div class="wpforms-confirm wpforms-confirm-enabled">
ON : <div class="wpforms-confirm wpforms-field-password-visibility-enabled wpforms-confirm-enabled">
```

Inner DOM identical in both. Patchable as `setPasswordVisibility(doc, fieldId, on)` — single class toggle on the inner wrapper.

> Frontend behaviour: when on, clicking the eye icon on the live form toggles the password input's visibility. If a tutorial films that interaction, the live form needs capture or a separate frontend snippet — the builder doesn't run the visibility-toggle JS.

### Advanced tab

All universals: Field Size, Placeholder, Default Value, Hide Label, Read-Only, CSS Classes, Conditional Logic.

## 15. Rich Text  (`builder-field-options-richtext`)

Base snapshot: `snapshots/builder-field-options-richtext/`

> Note: the canvas renders a static TinyMCE host — `.wpforms-richtext-wrap.tmce-active` containing tab buttons (`.wp-switch-editor`), an editor container (`.wp-editor-container`), the toolbar group (`.mce-toolbar-grp`), the underlying textarea, and a status bar. **The actual TinyMCE toolbar buttons (Bold / Italic / Link / Image icons) are mounted by TinyMCE JS at runtime — not in the static snapshot.** The static container shows an empty `.mce-toolbar-grp` div. If a tutorial films the visible toolbar buttons, that needs a captured snapshot of the live builder with TinyMCE initialised.

### General tab

**Allow Media Uploads** (toggle) — **must**.

**Sidebar payoff** when on: an additional toggle **Store files in WordPress Media Library** appears.

**Canvas payoff** when on: the `.mce-toolbar-grp` div gains class `wpforms-field-richtext-media-enabled`.

**Class diff (canvas):**

```text
OFF: <div class="mce-toolbar-grp"></div>
ON : <div class="mce-toolbar-grp wpforms-field-richtext-media-enabled"></div>
```

**Snippet — canvas, Allow Media Uploads = on:**

```html
<div class="wpforms-field wpforms-field-richtext size-medium ui-sortable-handle active" id="wpforms-field-14" data-field-id="14" data-field-type="richtext">
  <!-- duplicate / delete / multi-menu / helper omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Rich Text</span>
    <span class="required">*</span>
  </label>
  <div class="wpforms-richtext-wrap tmce-active">
    <div class="wp-editor-tabs">
      <button type="button" class="wp-switch-editor switch-tmce">Visual</button>
      <button type="button" class="wp-switch-editor">Text</button>
    </div>
    <div class="wp-editor-container">
      <div class="mce-container-body">
        <div class="mce-toolbar-grp wpforms-field-richtext-media-enabled"></div>
      </div>
      <textarea id="wpforms-richtext-14"></textarea>
      <div class="mce-statusbar">
        <i class="mce-ico mce-i-resize"></i>
      </div>
    </div>
  </div>
  <div class="description"></div>
</div>
```

> Implementation note: pure single-class flip on `.mce-toolbar-grp`. The visible *effect* on the toolbar (i.e. media-upload buttons appearing) is rendered by TinyMCE JS reading that class — the static snapshot doesn't show the rendered buttons. If a beat films the toolbar with the media button visible, capture is needed.

### Advanced tab

**Field Style** (dropdown: Full / Basic) — **must**.

Adds class `wpforms-field-richtext-toolbar-basic` to `.mce-toolbar-grp` when Basic is selected. Coexists with `wpforms-field-richtext-media-enabled` if Media Uploads is also on.

**Class diff (canvas, with Media Uploads on):**

```text
Field Style = Full:  <div class="mce-toolbar-grp wpforms-field-richtext-media-enabled"></div>
Field Style = Basic: <div class="mce-toolbar-grp wpforms-field-richtext-media-enabled wpforms-field-richtext-toolbar-basic"></div>
```

**Snippet — canvas, Field Style = Basic, Media Uploads on:**

```html
<div class="wpforms-richtext-wrap tmce-active">
  <div class="wp-editor-tabs">
    <button type="button" class="wp-switch-editor switch-tmce">Visual</button>
    <button type="button" class="wp-switch-editor">Text</button>
  </div>
  <div class="wp-editor-container">
    <div class="mce-container-body">
      <div class="mce-toolbar-grp wpforms-field-richtext-media-enabled wpforms-field-richtext-toolbar-basic"></div>
    </div>
    <textarea id="wpforms-richtext-14"></textarea>
    <div class="mce-statusbar">
      <i class="mce-ico mce-i-resize"></i>
    </div>
  </div>
</div>
```

> Implementation note: same caveat as Allow Media Uploads — the visible toolbar button set is rendered by TinyMCE JS reading these classes. If a tutorial films the actual toolbar buttons (more buttons in Full vs fewer in Basic), capture is needed; the class flip alone is the static evidence we can patch.

### Filmability summary

- Allow Media Uploads → `must` (sidebar toggle reveal + canvas class flip). Static visual diff is the toolbar class; rendered toolbar buttons need capture.
- Store files in WordPress Media Library → `nice` (sidebar reveal under Allow Media Uploads). Backend behaviour.
- Field Style (Full / Basic) → `must` (canvas class flip). Same caveat re: rendered toolbar.

## 16. Number Slider  (`builder-field-options-number-slider`)

Base snapshot: `snapshots/builder-field-options-number-slider/`

### General tab

**Default Value** (number input) — **must**.
Sets the slider's starting position and updates the visible "Selected Value" hint underneath. The hint's `<b>` content reflects the chosen default.

**Snippet — canvas, Default Value = 10:**

```html
<div class="wpforms-field wpforms-field-number-slider size-medium ui-sortable-handle active" id="wpforms-field-9" data-field-id="9" data-field-type="number-slider">
  <!-- duplicate / delete / multi-menu / helper omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Number Slider</span>
    <span class="required">*</span>
  </label>
  <input type="range" readonly class="wpforms-number-slider" id="wpforms-number-slider-9" value="0" min="0" max="100" step="1">
  <div id="wpforms-number-slider-hint-9" data-hint="Selected Value: {value}" class="wpforms-number-slider-hint">Selected Value: <b>10</b></div>
  <div class="description"></div>
</div>
```

> Implementation note: the `<input type="range">`'s `value` attribute remains the literal default rendered into HTML (the snippet shows `value="0"` even when default=10). The visible payoff is in the `.wpforms-number-slider-hint > b` text. Patchable as `setNumberSliderDefault(doc, fieldId, n)` — sets the hint text. (If a tutorial actually films the slider thumb position changing, the `value` attribute and visual position should also be updated; verify against product behaviour.)

### Advanced tab

Nothing canvas-changing. Universals only (Min, Max, Step would live here as sidebar-only controls — same pattern as Numbers' Range).

## 17. Hidden Field  (`builder-field-options-hidden`)

Base snapshot: `snapshots/builder-field-options-hidden/`

Nothing special. By design hidden fields render no visible canvas or frontend payoff — they only carry a hidden `<input>` in the live form. All controls are universals (Label, Default Value). Default tag → `never` for canvas, narration-only if a video discusses hidden fields at all.

## 18. HTML  (`builder-field-options-html`)

Base snapshot: `snapshots/builder-field-options-html/`

Nothing field-specific. The field renders whatever HTML body the user enters (Code textarea in the options panel) directly into the canvas. No state toggles, no sub-controls.

- **Code (HTML body)** — text-content swap on the canvas. Trivial.
- **Conditional Logic** — universal.

Default tag → `skip` unless the tutorial is specifically about embedding HTML.

## 19. Content  (`builder-field-options-content`)

Base snapshot: `snapshots/builder-field-options-content/`

Nothing field-specific in terms of canvas state. The field has a TinyMCE rich-text editor **in the field options panel (sidebar)** — not on the canvas. The canvas just renders the entered content.

### Sidebar — content editor

The Content option-row hosts a full TinyMCE host (`.wp-editor-wrap.tmce-active.tmce-initialized`) with:
- Visual / Text tab buttons (`.wp-switch-editor.switch-tmce` / `.switch-html`).
- Add Media button (`#insert-media-button.add_media`).
- Toolbar grp with paragraph dropdown, Bold/Italic/Underline/Strike, text color, link, bullet/numbered/blockquote, align left/center/right (12 buttons total).
- Editor iframe (`#wpforms-field-option-{id}-content_ifr`).
- QuickTags toolbar for the Text view (b, i, link, b-quote, del, ins, img, ul, ol, li, code, close tags).
- Two action buttons below the editor: **Update Preview** and **Expand Editor** (with expand/collapse SVG icons).
- Hidden `<input id="wpforms-field-option-{id}-label_disable" name="fields[{id}][label_disable]" value="1">` — Content fields hide their label by default.

> Implementation note: the TinyMCE iframe and toolbar buttons are **JS-mounted at runtime** (the static markup shown above is the host shell that TinyMCE attaches to). If a tutorial films interactions inside the editor (typing, formatting, switching to Text view, expanding), capture the live builder — the static snapshot's editor is non-interactive.

### Canvas

Renders the user-entered content. **Update Preview** click is what pushes the editor content into the canvas — until clicked, canvas may show stale content. Worth a note for any beat that involves typing into the editor: narrate "click Update Preview" or include the click in the beat.

Default tag → `skip` for canvas; `nice` for the editor sidebar if a tutorial is specifically about the Content field.

## 20. Page Break  (`builder-field-options-pagebreak`)

Base snapshot: `snapshots/builder-field-options-pagebreak/`

> Note: Page Break does **not** have a Smart Logic tab. Conditional Logic doesn't apply.

### General tab

**Progress Indicator** (dropdown: Progress Bar / Circles / Connector / None) — **must**.
The whole `.wpforms-page-indicator` block in the canvas (top page-break) re-renders per value. Three substantially different layouts.

**Snippet — Progress Bar (color `#066aab`):**

```html
<div class="wpforms-field wpforms-field-pagebreak wpforms-field-stick wpforms-pagebreak-top ui-draggable ui-draggable-handle active" id="wpforms-field-33" data-field-id="33" data-field-type="pagebreak">
  <!-- delete / multi-menu / helper omitted; identical to base -->
  <div class="wpforms-pagebreak-divider">
    <span class="pagebreak-label">First Page / Progress Indicator <span class="wpforms-pagebreak-title"></span></span>
    <span class="line"></span>
  </div>
  <div class="wpforms-page-indicator wpforms-page-indicator-progress">
    <span class="wpforms-page-indicator-page-title"></span>
    <span class="wpforms-page-indicator-page-title-sep" style="display:none;"> - </span>
    <span class="wpforms-page-indicator-steps">Step <span class="wpforms-page-indicator-steps-current">1</span> of 2</span>
    <div class="wpforms-page-indicator-page-progress-wrap">
      <div class="wpforms-page-indicator-page-progress" style="width:50%;background-color:#066aab"></div>
    </div>
  </div>
</div>
```

**Snippet — Circles (only `.wpforms-page-indicator` block changes):**

```html
<div class="wpforms-page-indicator wpforms-page-indicator-circles" data-allow-page-navigation="0">
  <div class="wpforms-page-indicator-page active wpforms-page-indicator-page-1" data-page="1">
    <span class="wpforms-page-indicator-page-number" style="background-color:#066aab" data-page="1">1</span>
  </div>
  <div class="wpforms-page-indicator-page  wpforms-page-indicator-page-2" data-page="2">
    <span class="wpforms-page-indicator-page-number" data-page="2">2</span>
  </div>
</div>
```

**Snippet — Connector (only `.wpforms-page-indicator` block changes):**

```html
<div class="wpforms-page-indicator wpforms-page-indicator-connector" data-allow-page-navigation="0">
  <div class="wpforms-page-indicator-page active wpforms-page-indicator-page-1" style="min-width:50%;" data-page="1">
    <span class="wpforms-page-indicator-page-number" style="background-color:#066aab" data-page="1">1
      <span class="wpforms-page-indicator-page-triangle" style="border-top-color:#066aab"></span>
    </span>
  </div>
  <div class="wpforms-page-indicator-page wpforms-page-indicator-page-2" style="min-width:50%;" data-page="2">
    <span class="wpforms-page-indicator-page-number" data-page="2">2
      <span class="wpforms-page-indicator-page-triangle"></span>
    </span>
  </div>
</div>
```

> Implementation note: each value swaps the inner `.wpforms-page-indicator` block. Wrapper class on that block (`-progress | -circles | -connector`) plus the inner DOM. Color tokens (`#066aab` here) ride along — swap them when the indicator color is also being filmed.

**Page Indicator Color** — paired with Progress Indicator. Color appears as inline `background-color` (and `border-top-color` on the connector triangle). **nice** — easy to film if a tutorial covers theming.

**Allow Page Navigation** (toggle) — **nice**. Lets a user click the indicator to jump to a previous page. Builder canvas doesn't change (only `data-allow-page-navigation="0"` flips to `"1"` on the indicator block). Frontend behaviour-only on click.

### Advanced tab

> All Advanced controls are sidebar-only or frontend-only. **No builder canvas payoff.**

- **Page Navigation Alignment** (dropdown: Left / Right / Center / Split) — `nice` if a tutorial discusses navigation; sidebar-only here, affects the rendered Next/Prev button alignment in the live form.
- **Disable Scroll Animation** (toggle) — `never`. Live-form behaviour only.
- **CSS Classes** with **layout selector preview** — universal `never` for canvas. (Note: the row also embeds a "Select your layout" picker that suggests `wpforms-one-half` / `wpforms-one-third` etc. classes — frontend-only impact.)

**Snippet — Advanced group (full):**

```html
<div class="wpforms-field-option-group wpforms-field-option-group-advanced active" id="wpforms-field-option-advanced-33">
  <a href="#" class="wpforms-field-option-group-toggle">Advanced</a>
  <div class="wpforms-field-option-group-inner wpforms-pagebreak-top">
    <div class="wpforms-field-option-row wpforms-field-option-row-nav_align" id="wpforms-field-option-row-33-nav_align" data-field-id="33">
      <label for="wpforms-field-option-33-nav_align">Page Navigation Alignment</label>
      <select id="wpforms-field-option-33-nav_align" name="fields[33][nav_align]">
        <option value="left" selected>Left</option>
        <option value="right">Right</option>
        <option value="">Center</option>
        <option value="split">Split</option>
      </select>
    </div>
    <div class="wpforms-field-option-row wpforms-field-option-row-scroll_disabled" id="wpforms-field-option-row-33-scroll_disabled" data-field-id="33">
      <span class="wpforms-toggle-control">
        <input type="checkbox" id="wpforms-field-option-33-scroll_disabled" name="fields[33][scroll_disabled]" value="1">
        <label class="wpforms-toggle-control-icon" for="wpforms-field-option-33-scroll_disabled"></label>
        <label for="wpforms-field-option-33-scroll_disabled" class="wpforms-toggle-control-label">Disable Scroll Animation</label>
      </span>
    </div>
    <div class="wpforms-field-option-row wpforms-field-option-row-css" id="wpforms-field-option-row-33-css" data-field-id="33">
      <label for="wpforms-field-option-33-css">CSS Classes</label>
      <div class="layout-selector-display unfoldable-cont">
        <p class="heading">Select your layout</p>
        <div class="layouts">
          <div class="layout-selector-display-layout"><span class="one-half" data-classes="wpforms-one-half wpforms-first"></span><span class="one-half" data-classes="wpforms-one-half"></span></div>
          <div class="layout-selector-display-layout"><span class="one-third" data-classes="wpforms-one-third wpforms-first"></span><span class="one-third" data-classes="wpforms-one-third"></span><span class="one-third" data-classes="wpforms-one-third"></span></div>
          <!-- … remaining preset rows: 4×¼, ⅓+⅔, ⅔+⅓, ¼+¼+½, ½+¼+¼, ¼+½+¼ … -->
        </div>
      </div>
      <input type="text" id="wpforms-field-option-33-css" name="fields[33][css]" value="" placeholder="">
    </div>
  </div>
</div>
```

## 21. Section Divider  (`builder-field-options-divider`)

Base snapshot: `snapshots/builder-field-options-divider/`

### General tab

Universals only (Label, Description).

### Advanced tab

**Hide Divider Line** (toggle) — **must**. When enabled, adds class `hide_line` to the field wrapper. Pure single-class flip.

**Class diff:**

```text
OFF (line shown): <div class="wpforms-field wpforms-field-divider ui-sortable-handle active" …>
ON  (line hidden): <div class="wpforms-field wpforms-field-divider ui-sortable-handle active hide_line" …>
```

> Implementation note: patchable as `setDividerHideLine(doc, fieldId, on)` — toggles the `hide_line` class on `#wpforms-field-{id}`. Inner DOM identical in both states.

Universals: CSS Classes, Conditional Logic.

## 22. Layout  (`builder-field-options-layout`)

Base snapshot: `snapshots/builder-field-options-layout/`

Layout is a container field. It renders a row of empty columns into which other fields can be dragged. The DOM shape is the same family as Repeater's column system.

### General tab

**Select a Layout** (preset radio, 9 values: 100 / 50-50 / 67-33 / 33-67 / 33-33-33 / 50-25-25 / 25-25-50 / 25-50-25 / 25-25-25-25) — **must**.
Each value rebuilds the column children inside `.wpforms-field-layout-columns`. Each `<div class="wpforms-layout-column wpforms-layout-column-{N}">` is one column where `{N}` is the percentage width.

**Snippet — preset radio row in options panel (50-50 selected):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-preset wpforms-layout-display-rows" id="wpforms-field-option-row-40-preset" data-field-id="40">
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-100" value="100">
  <label for="wpforms-field-option-40-preset-100" class="preset-100"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-50-50" value="50-50" checked>
  <label for="wpforms-field-option-40-preset-50-50" class="preset-50-50"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-67-33" value="67-33">
  <label for="wpforms-field-option-40-preset-67-33" class="preset-67-33"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-33-67" value="33-67">
  <label for="wpforms-field-option-40-preset-33-67" class="preset-33-67"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-33-33-33" value="33-33-33">
  <label for="wpforms-field-option-40-preset-33-33-33" class="preset-33-33-33"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-50-25-25" value="50-25-25">
  <label for="wpforms-field-option-40-preset-50-25-25" class="preset-50-25-25"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-25-25-50" value="25-25-50">
  <label for="wpforms-field-option-40-preset-25-25-50" class="preset-25-25-50"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-25-50-25" value="25-50-25">
  <label for="wpforms-field-option-40-preset-25-50-25" class="preset-25-50-25"></label>
  <input type="radio" name="fields[40][preset]" id="wpforms-field-option-40-preset-25-25-25-25" value="25-25-25-25">
  <label for="wpforms-field-option-40-preset-25-25-25-25" class="preset-25-25-25-25"></label>
</div>
```

**Snippet — canvas, preset=33-33-33 (3 columns), Display=Rows:**

```html
<div class="wpforms-field-layout-columns wpforms-layout-display-rows">
  <div class="wpforms-layout-column wpforms-layout-column-33 ui-sortable">
    <div class="wpforms-layout-column-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path id="fa-caret-square-o-up" d="M11.25 14…" fill="#A6A6A6" class="wpforms-plus-path"></path>
      </svg>
      <span>Add Fields</span>
    </div>
  </div>
  <div class="wpforms-layout-column wpforms-layout-column-33 ui-sortable">
    <div class="wpforms-layout-column-placeholder">
      <!-- … same placeholder svg … -->
      <span>Add Fields</span>
    </div>
  </div>
  <div class="wpforms-layout-column wpforms-layout-column-33 ui-sortable">
    <div class="wpforms-layout-column-placeholder">
      <!-- … same placeholder svg … -->
      <span>Add Fields</span>
    </div>
  </div>
  <!-- Always hidden on Layout (Repeater-only control) -->
  <div class="wpforms-field-repeater-display-rows-buttons wpforms-hidden">
    <button type="button" class="dashicons dashicons-insert wpforms-field-repeater-display-rows-buttons-add"></button>
    <button type="button" class="dashicons dashicons-remove wpforms-field-repeater-display-rows-buttons-remove"></button>
  </div>
</div>
```

**Display** (dropdown: Rows / Columns) — **must**.
Flips wrapper class on `.wpforms-field-layout-columns` between `wpforms-layout-display-rows` (default; "fields are ordered from left to right") and `wpforms-layout-display-columns` ("fields are ordered from top to bottom").

**Snippet — Display dropdown (options panel):**

```html
<div class="wpforms-field-option-row wpforms-field-option-row-display" id="wpforms-field-option-row-40-display" data-field-id="40">
  <label for="wpforms-field-option-40-display">Display</label>
  <select id="wpforms-field-option-40-display" name="fields[40][display]">
    <option value="rows" selected>Rows - fields are ordered from left to right</option>
    <option value="columns">Columns - fields are ordered from top to bottom</option>
  </select>
</div>
```

**Snippet — canvas with Display=Columns, preset=33-33-33:** identical to the Display=Rows snapshot above except wrapper class is `wpforms-field-layout-columns wpforms-layout-display-columns`.

> Implementation note: Display is a single class flip on the wrapper. Preset rebuilds children. Both are pure DOM; Layout is **Repeater minus the repeating mechanic** — no Button Type, no Button Labels, no Limit. Different from Repeater also in Display options: Layout = Rows/**Columns**; Repeater = Rows/**Blocks**.

### Fields nested inside Layout columns

A child field's `.wpforms-field` element is appended **inside** the corresponding `.wpforms-layout-column`, after `.wpforms-layout-column-placeholder`. The placeholder remains in the DOM regardless. The wrapping `.wpforms-field` for child fields gets a trailing `style=""` attribute and drops some standard outer chrome.

**Snippet — canvas with preset=50-50, Display=Columns, Name in column 1, Email in column 2:**

```html
<div class="wpforms-field-layout-columns wpforms-layout-display-columns">
  <div class="wpforms-layout-column wpforms-layout-column-50 ui-sortable">
    <div class="wpforms-layout-column-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path id="fa-caret-square-o-up" d="M11.25 14…" fill="#A6A6A6" class="wpforms-plus-path"></path>
      </svg>
      <span>Add Fields</span>
    </div>
    <div class="wpforms-field wpforms-field-name required" id="wpforms-field-53" data-field-id="53" data-field-type="name" style="">
      <!-- Same Name field inner DOM as Name #1 (Simple format, label, sub-blocks, description) -->
    </div>
  </div>
  <div class="wpforms-layout-column wpforms-layout-column-50 ui-sortable">
    <div class="wpforms-layout-column-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path id="fa-caret-square-o-up" d="M11.25 14…" fill="#A6A6A6" class="wpforms-plus-path"></path>
      </svg>
      <span>Add Fields</span>
    </div>
    <div class="wpforms-field wpforms-field-email required" id="wpforms-field-54" data-field-id="54" data-field-type="email" style="">
      <!-- Same Email field inner DOM, with `wpforms-confirm wpforms-confirm-disabled` (single email input visible) -->
    </div>
  </div>
  <div class="wpforms-field-repeater-display-rows-buttons wpforms-hidden">
    <button type="button" class="dashicons dashicons-insert wpforms-field-repeater-display-rows-buttons-add"></button>
    <button type="button" class="dashicons dashicons-remove wpforms-field-repeater-display-rows-buttons-remove"></button>
  </div>
</div>
```

> Implementation note: nesting child fields is a structural DOM move (child node removed from canvas top-level, appended inside `.wpforms-layout-column`). Patchable as `nestFieldInLayoutColumn(doc, layoutFieldId, columnIndex, childFieldId)`. The placeholder div stays.

### Advanced tab

Nothing special. Universals only (CSS Classes, Conditional Logic).

## 23. Repeater  (`builder-field-options-repeater`)

Base snapshot: `snapshots/builder-field-options-repeater/`

### General tab

**Label** — universal `skip`.

**Display** (radio: Rows / Blocks) — **must**. Both states are filmable; both change the canvas preview substantially. The wrapper of the inner column container picks up `wpforms-layout-display-rows` or `wpforms-layout-display-blocks`. A small floating Add/Remove control set (`.wpforms-field-repeater-display-rows-buttons`) is **always** in the DOM but has the `wpforms-hidden` class when Blocks is active, no class (visible) when Rows is active.

**Snippet — full options-panel General group (display=rows, preset=100):**

```html
<div class="wpforms-field-option-group-inner">
  <div class="wpforms-field-option-row wpforms-field-option-row-label" id="wpforms-field-option-row-46-label" data-field-id="46">
    <label for="wpforms-field-option-46-label">Label<i class="fa fa-question-circle-o wpforms-help-tooltip"></i></label>
    <input type="text" id="wpforms-field-option-46-label" name="fields[46][label]" value="Repeater (Rows)">
  </div>

  <label for="wpforms-field-option-46-display">Display<i class="fa fa-question-circle-o wpforms-help-tooltip"></i></label>
  <div class="wpforms-field-option-row wpforms-field-option-row-display" id="wpforms-field-option-row-46-display" data-field-id="46">
    <input type="radio" name="fields[46][display]" id="wpforms-field-option-46-display-rows" value="rows" checked>
    <label for="wpforms-field-option-46-display-rows" class="display-rows"></label>
    <input type="radio" name="fields[46][display]" id="wpforms-field-option-46-display-blocks" value="blocks">
    <label for="wpforms-field-option-46-display-blocks" class="display-blocks"></label>
  </div>

  <label for="wpforms-field-option-46-preset">Layout<i class="fa fa-question-circle-o wpforms-help-tooltip"></i></label>
  <div class="wpforms-field-option-row wpforms-field-option-row-preset wpforms-layout-display-rows" id="wpforms-field-option-row-46-preset" data-field-id="46">
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-100" value="100" checked>
    <label for="wpforms-field-option-46-preset-100" class="preset-100"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-50-50" value="50-50">
    <label for="wpforms-field-option-46-preset-50-50" class="preset-50-50"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-67-33" value="67-33">
    <label for="wpforms-field-option-46-preset-67-33" class="preset-67-33"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-33-67" value="33-67">
    <label for="wpforms-field-option-46-preset-33-67" class="preset-33-67"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-33-33-33" value="33-33-33">
    <label for="wpforms-field-option-46-preset-33-33-33" class="preset-33-33-33"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-50-25-25" value="50-25-25">
    <label for="wpforms-field-option-46-preset-50-25-25" class="preset-50-25-25"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-25-25-50" value="25-25-50">
    <label for="wpforms-field-option-46-preset-25-25-50" class="preset-25-25-50"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-25-50-25" value="25-50-25">
    <label for="wpforms-field-option-46-preset-25-50-25" class="preset-25-50-25"></label>
    <input type="radio" name="fields[46][preset]" id="wpforms-field-option-46-preset-25-25-25-25" value="25-25-25-25">
    <label for="wpforms-field-option-46-preset-25-25-25-25" class="preset-25-25-25-25"></label>
  </div>

  <!-- Hidden when display=rows; revealed when display=blocks -->
  <div class="wpforms-field-option-row wpforms-field-option-row-button-type wpforms-hidden" id="wpforms-field-option-row-46-button-type" data-field-id="46">
    <label for="wpforms-field-option-46-button_type">Button Type</label>
    <select id="wpforms-field-option-46-button_type" name="fields[46][button_type]">
      <option value="buttons_with_icons" selected>Buttons with icons</option>
      <option value="buttons">Buttons</option>
      <option value="icons_with_text">Icons with text</option>
      <option value="icons">Icons</option>
      <option value="plain_text">Plain text</option>
    </select>
  </div>

  <!-- Hidden when display=rows; revealed when display=blocks -->
  <div class="wpforms-clear wpforms-field-option-row wpforms-field-option-row-button-labels wpforms-hidden" id="wpforms-field-option-row-0-button-labels" data-field-id="46">
    <label for="wpforms-field-option-46-button_labels">Button Labels</label>
    <div class="wpforms-field-options-columns-2 wpforms-field-options-columns">
      <div class="wpforms-field-options-column">
        <input type="text" class="add" id="wpforms-field-option-46-button_add_label" name="fields[46][button_add_label]" value="Add">
        <label for="wpforms-field-option-46-button_add_label" class="sub-label">Add Label</label>
      </div>
      <div class="wpforms-field-options-column">
        <input type="text" class="remove" id="wpforms-field-option-46-button_remove_label" name="fields[46][button_remove_label]" value="Remove">
        <label for="wpforms-field-option-46-button_remove_label" class="sub-label">Remove Label</label>
      </div>
    </div>
  </div>

  <!-- Always present -->
  <div class="wpforms-clear wpforms-field-option-row wpforms-field-option-row-rows-limit" id="wpforms-field-option-row-46-rows_limit" data-field-id="46">
    <label for="wpforms-field-option-46-rows_limit">Limit</label>
    <div class="wpforms-field-options-columns-2 wpforms-field-options-columns">
      <div class="wpforms-field-options-column">
        <input type="number" class="rows-limit-min" id="wpforms-field-option-46-rows_limit_min" name="fields[46][rows_limit_min]" value="1" min="1" max="200" step="1">
        <label for="wpforms-field-option-46-rows_limit_min" class="sub-label">Minimum</label>
      </div>
      <div class="wpforms-field-options-column">
        <input type="number" class="rows-limit-max" id="wpforms-field-option-46-rows_limit_max" name="fields[46][rows_limit_max]" value="10" min="2" max="200" step="1">
        <label for="wpforms-field-option-46-rows_limit_max" class="sub-label">Maximum</label>
      </div>
    </div>
  </div>
</div>
```

**Snippet — canvas, Display=Rows, preset=100 (single column):**

```html
<div class="wpforms-layout-column wpforms-layout-column-100 ui-sortable" style="padding-top: 50px; min-height: 105px;">
  <div class="wpforms-layout-column-placeholder" style="top: 50px;">
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
      <path id="fa-caret-square-o-up" d="M11.25 14H0.75…" fill="#A6A6A6" class="wpforms-plus-path"></path>
    </svg>
    <span>Add Fields</span>
  </div>
</div>
```

**Snippet — canvas, Display=Rows, preset=50-50 (two columns + row controls visible):**

```html
<div class="wpforms-field-layout-columns wpforms-layout-display-rows" style="margin-top: -50px;">
  <div class="wpforms-layout-column wpforms-layout-column-50 ui-sortable" style="padding-top: 50px; min-height: 105px;">
    <div class="wpforms-layout-column-placeholder" style="top: 50px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path id="fa-caret-square-o-up" d="M11.25 14…" fill="#A6A6A6" class="wpforms-plus-path"></path>
      </svg>
      <span>Add Fields</span>
    </div>
  </div>
  <div class="wpforms-layout-column wpforms-layout-column-50 ui-sortable" style="padding-top: 50px; min-height: 105px;">
    <div class="wpforms-layout-column-placeholder" style="top: 50px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path id="fa-caret-square-o-up" d="M11.25 14…" fill="#A6A6A6" class="wpforms-plus-path"></path>
      </svg>
      <span>Add Fields</span>
    </div>
  </div>
  <!-- Visible (no wpforms-hidden) when Display=Rows -->
  <div class="wpforms-field-repeater-display-rows-buttons" style="top: 36px;">
    <button type="button" class="dashicons dashicons-insert wpforms-field-repeater-display-rows-buttons-add"></button>
    <button type="button" class="dashicons dashicons-remove wpforms-field-repeater-display-rows-buttons-remove"></button>
  </div>
</div>
```

**Snippet — canvas, Display=Blocks (preset=100):**

```html
<div class="wpforms-field-layout-columns wpforms-layout-display-blocks" style="margin-top: -50px;">
  <div class="wpforms-layout-column wpforms-layout-column-100 ui-sortable" style="padding-top: 50px; min-height: 105px;">
    <div class="wpforms-layout-column-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path id="fa-caret-square-o-up" d="M11.25 14…" fill="#A6A6A6" class="wpforms-plus-path"></path>
      </svg>
      <span>Add Fields</span>
    </div>
  </div>
  <!-- Hidden when Display=Blocks -->
  <div class="wpforms-field-repeater-display-rows-buttons wpforms-hidden" style="top: 36px;">
    <button type="button" class="dashicons dashicons-insert wpforms-field-repeater-display-rows-buttons-add"></button>
    <button type="button" class="dashicons dashicons-remove wpforms-field-repeater-display-rows-buttons-remove"></button>
  </div>
</div>
```

**Layout preset** (radio, 9 values: 100 / 50-50 / 67-33 / 33-67 / 33-33-33 / 50-25-25 / 25-25-50 / 25-50-25 / 25-25-25-25) — **must**. Each value rebuilds the column structure inside `.wpforms-field-layout-columns`. Pattern: one `<div class="wpforms-layout-column wpforms-layout-column-{N}">` per column where `{N}` is the column's percentage. Both Rows and Blocks display the same preset set; selected preset works in both.

> Implementation note: setting Display patches the inner wrapper class (`wpforms-layout-display-{rows|blocks}`) AND toggles `wpforms-hidden` on `.wpforms-field-repeater-display-rows-buttons`. Setting preset rebuilds the column children. Both are pure DOM transforms; capture not required.

**Button Type** (dropdown, only shown when Display=Blocks; 5 values) — **must** for the variants we film.
The control row is in the options panel (id `wpforms-field-option-row-{id}-button-type`). The frontend canvas preview gets a `.wpforms-field-repeater-display-blocks-buttons` block whose `data-button-type` attribute and inner markup change per value.

**All 5 button-type values use IDENTICAL inner DOM** — only `data-button-type` differs. CSS reads the attribute and decides whether to render icon, text, or both. Single attribute swap, patchable.

```html
<div class="wpforms-field-repeater-display-blocks-buttons" data-button-type="{value}">
  <button type="button" class="wpforms-field-repeater-display-blocks-buttons-add">
    <i class="dashicons dashicons-insert"></i><span>Add</span>
  </button>
  <button type="button" class="wpforms-field-repeater-display-blocks-buttons-remove">
    <i class="dashicons dashicons-remove"></i><span>Remove</span>
  </button>
</div>
```

`{value}` is one of: `buttons_with_icons` (default), `buttons`, `icons_with_text`, `icons`, `plain_text`. All five confirmed.

> Side reveal: when Button Type is `icons_with_text` or `plain_text`, the **Button Labels** option-row reveals in the sidebar (Add Label / Remove Label inputs). When the type is icons-only, the labels are still in the DOM but CSS hides the spans.

**Button Labels** (Add / Remove text inputs, only shown when Display=Blocks) — `nice`. Sidebar-only canvas effect: changes the text inside `.wpforms-field-repeater-display-blocks-buttons-{add,remove} > span` on the canvas preview.

**Limit** (Min / Max number inputs, always shown) — `never` for canvas (no builder payoff; it's a frontend submission constraint).

### Advanced tab

Only **Field Size** and **Description** (universal `skip`). No Hide Label, no Read-Only.

> Note: HTML pasted is the **builder canvas preview** (which is what we film). True frontend (live form on a page) is a separate render — capture only if a video specifically shows the public form.

## 24. Rating  (`builder-field-options-rating`)

Base snapshot: `snapshots/builder-field-options-rating/`

> Note: the canvas always renders **10** `<i>` icon elements. Visibility per-icon is controlled by inline `style` (`display:inline-block` for visible, `display:none` for hidden). The Scale value decides how many of the 10 are visible.

### General tab

**Scale** (dropdown, integer 1–10) — **must**.
First N icons get `display:inline-block`; remaining icons get `display:none`. Same DOM, different per-icon style attribute.

**Per-icon diff (canvas), Scale = 3:**

```text
icon 1: style="display:inline-block"
icon 2: style="display:inline-block"
icon 3: style="display:inline-block"
icon 4: style="display:none"
icon 5..10: style="display:none"
```

**Per-icon diff (canvas), Scale = 4:**

```text
icons 1..4: style="display:inline-block"
icons 5..10: style="display:none"
```

**Snippet — canvas, Scale = 3, Icon = Star, color #066aab:**

```html
<div class="wpforms-field wpforms-field-rating ui-sortable-handle active" id="wpforms-field-36" data-field-id="36" data-field-type="rating">
  <!-- duplicate / delete / multi-menu / helper omitted -->
  <label class="label-title">
    <span class="hidden_text"><i class="fa fa-eye-slash"></i></span>
    <span class="empty_text"><i class="fa fa-exclamation-triangle"></i></span>
    <span class="text">Rating</span>
    <span class="required">*</span>
  </label>
  <div class="wpforms-rating-field">
    <div class="wpforms-rating-field-icons">
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:inline-block; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:inline-block; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:inline-block; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:none; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:none; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:none; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:none; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:none; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:none; font-size:24px;"></i>
      <i class="fa fa-star medium rating-icon" aria-hidden="true" style="color:#066aab; display:none; font-size:24px;"></i>
    </div>
    <div class="wpforms-rating-field-labels wpforms-hidden">
      <span class="wpforms-rating-field-lowest-label wpforms-sub-label"></span>
      <span class="wpforms-rating-field-highest-label wpforms-sub-label"></span>
    </div>
  </div>
  <div class="description"></div>
</div>
```

> Implementation note: patchable as `setRatingScale(doc, fieldId, n)` — flip the `display` style on each `<i>` based on index < n.

### Advanced tab

**Icon** (dropdown: Star / Heart / Smiley Face / Thumb) — **must**.
Each `<i>` swaps its FA glyph class. The `medium rating-icon` part is constant; the FA token changes.

**Icon class diff per `<i>`:**

```text
Star:    fa fa-star medium rating-icon
Heart:   fa medium rating-icon fa-heart
Smiley:  fa medium rating-icon fa-smile-o
Thumb:   fa medium rating-icon fa-thumbs-up
```

**Snippet — canvas, Scale = 3, Icon = Heart:**

```html
<div class="wpforms-rating-field-icons">
  <i class="fa medium rating-icon fa-heart" aria-hidden="true" style="color:#066aab; display:inline-block; font-size:24px;"></i>
  <i class="fa medium rating-icon fa-heart" aria-hidden="true" style="color:#066aab; display:inline-block; font-size:24px;"></i>
  <i class="fa medium rating-icon fa-heart" aria-hidden="true" style="color:#066aab; display:inline-block; font-size:24px;"></i>
  <!-- … remaining 7 icons with display:none … -->
</div>
```

> Implementation note: patchable as `setRatingIcon(doc, fieldId, 'star'|'heart'|'smile'|'thumb')` — rewrite the FA class token on every `<i>`.

**Lowest Score Label / Highest Score Label** (text inputs) — **must**.
When both are empty, the labels container has `wpforms-hidden`. When either is set, that class is removed and the spans render their text.

**Class diff (labels container):**

```text
Empty: <div class=" wpforms-rating-field-labels wpforms-hidden ">
       <span class="wpforms-rating-field-lowest-label wpforms-sub-label"></span>
       <span class="wpforms-rating-field-highest-label wpforms-sub-label"></span>
       </div>
Set:   <div class="wpforms-rating-field-labels">
       <span class="wpforms-rating-field-lowest-label wpforms-sub-label">10</span>
       <span class="wpforms-rating-field-highest-label wpforms-sub-label">Hello</span>
       </div>
```

**Snippet — canvas, Lowest = "10", Highest = "Hello":**

```html
<div class="wpforms-rating-field-labels">
  <span class="wpforms-rating-field-lowest-label wpforms-sub-label">10</span>
  <span class="wpforms-rating-field-highest-label wpforms-sub-label">Hello</span>
</div>
```

> Implementation note: patchable as `setRatingScoreLabels(doc, fieldId, low, high)` — text-set both spans, drop `wpforms-hidden` if either is non-empty.

**Label Position** (Above / Below) — **must**.
Adds class `wpforms-rating-field-labels-position-above` to `.wpforms-rating-field-labels` when Above is selected. Below is the default (no extra class).

**Class diff (labels container):**

```text
Below (default): <div class="wpforms-rating-field-labels">
Above:           <div class="wpforms-rating-field-labels wpforms-rating-field-labels-position-above">
```

**Snippet — canvas, Label Position = Above, Lowest = "10", Highest = "Hello":**

```html
<div class="wpforms-rating-field-labels wpforms-rating-field-labels-position-above">
  <span class="wpforms-rating-field-lowest-label wpforms-sub-label">10</span>
  <span class="wpforms-rating-field-highest-label wpforms-sub-label">Hello</span>
</div>
```

> Implementation note: pure single-class flip on `.wpforms-rating-field-labels`. CSS reorders the labels block via flex/order. Patchable as `setRatingLabelPosition(doc, fieldId, 'above'|'below')`.

### Filmability summary

- Scale → `must`. Per-icon `display` style flip on 10 fixed `<i>` elements.
- Icon (Star / Heart / Smiley / Thumb) → `must` (Star, Heart confirmed; Smiley, Thumb pending exact FA token).
- Lowest / Highest Score Labels → `must`. Text + class flip on labels container.
- Label Position → `must` for the underlying control; **canvas markup pending** — needs the "Above" snippet before the registry can mark it `supported-exact`.

## 25. Signature  (`builder-field-options-signature`)

Base snapshot: `snapshots/builder-field-options-signature/`

Mostly empty in the builder. The canvas shows a static signature pad placeholder; the live signing widget is JS-mounted on the frontend.

- **Ink Color** (color picker, Advanced) — `nice`. Sets the stroke color of the user's signature on the **live frontend**. Builder canvas: no visible payoff (the placeholder pad doesn't reflect ink color until it's drawn into).
- All other controls are universals.

> Filming note: if a tutorial demonstrates signing with a specific ink color, that's a frontend interaction — the builder canvas alone is not enough. Capture the live form with a sample stroke if needed.

Default tag → `skip` for canvas, `narration-only` for the ink-color behaviour unless a frontend capture is supplied.

---

# After this inventory exists

1. Claude cross-references each entry against the audit and existing snapshots.
2. For every state tagged `must` or `nice`, the registry gets one entry.
3. Status is decided from evidence type:
   - inline HTML here (or `reference/payoff-snippets/...`) → `supported-exact`.
   - "needs capture" → `blocked-needs-truth` with a slug.
   - `skip` / `never` → omitted, or `narration-only`.
4. Compiler gate (Step 3) reads only the registry.
