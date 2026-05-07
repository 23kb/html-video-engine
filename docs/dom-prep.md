# `runtime/dom-prep.js` — DOM prep library

A small library of idempotent, document-scoped helpers that run against
the snapshot iframe's `contentDocument` after `loadSnapshot`, before the
first camera move.

This file documents what the library is, which helpers belong where, and
which pieces are deferred or deprecated. It is a **documentation lane**
only — the declarative `prep` verb is a separate future step.

---

## What this library is not

- Not an engine primitive. Nothing here mutates camera state, overlay
  state, cursor state, or runtime audio. Every helper touches DOM only.
- Not a general-purpose DOM utility. Selectors here encode WPForms
  builder assumptions (field-id numbering, `wpforms-panel-field-*`
  conventions, Quiz-addon body classes, etc.).

The declarative `prep` form (Phase 6 Step 7) is sugar over this
library — see "Declarative `prep` form" below.

---

## The three-layer DOM-prep model (intended architecture)

Decision locked 2026-04-23, recorded in `PLAN.md` §Phase 3. Three layers
run in order on every snapshot boot/swap:

1. **Universal baseline** — cleanups every WPForms video needs: strip
   the WP admin bar, remove builder cruft (Quiz-panel tabs, PayPal
   button, quiz alerts).
2. **Per-snapshot profile** — keyed to the snapshot's intent. e.g.
   `builder-fields` → `applyDefaultForm()`: trim the 20+ captured fields
   down to Name + Email + Message and rename the form "Simple Contact
   Form".
3. **Chapter-local `prep:`** — per-chapter delta. Runs last so chapters
   win on conflicts.

**Current reality.** Layer 1 helpers exist (`removeAdminBar`,
`removeBuilderCruft`) but **do not yet run automatically** on every
snapshot boot/swap. They run only when composed through
`applyDefaultForm` (which calls both) or when a chapter's `prep:`
function calls them explicitly. The three-layer compose pipeline is
the intended architecture, not the implemented one.

Layer 2 currently ships one profile, `applyDefaultForm` for
`builder-fields`-shaped snapshots. Other snapshots receive either a
hand-composed cleanup (see `cff-chapter-6.js` `prepSettings`) or
nothing.

Layer 3 is already in place via the `prep` field on `defineChapter()`
descriptors and on `snapshotSwap` steps (see
`docs/chapter-module-contract.md`).

---

## Admin / plugin-side prep notes

These notes came from the human during the admin/plugin-side recapture
planning on 2026-04-27. They are product truth for DOM prep and
chapter-local prep. They are **not** capture-time mutation instructions:
capture the real base surface first, then prepare video-safe state in the
loaded snapshot.

### Entries flow

Base surfaces to keep distinct:

- Entries overview:
  `/wp-admin/admin.php?page=wpforms-entries`
- Entries list for a specific form:
  `/wp-admin/admin.php?view=list&form_id=32&page=wpforms-entries`
- Entry detail:
  `/wp-admin/admin.php?page=wpforms-entries&view=details&entry_id=5`

Prep responsibilities:

- Replace any real/person-specific entry values with dummy video-safe
  values when a chapter exposes them.
- Row hover/focus, clicking View, table filtering, and selected-row
  emphasis are chapter-local prep or interaction effects, not separate
  capture requirements.

### Payments flow

Base surfaces to keep distinct:

- Payments list in test mode:
  `/wp-admin/admin.php?page=wpforms-payments&mode=test`
- Payment detail:
  `/wp-admin/admin.php?page=wpforms-payments&view=payment&payment_id=1`
- Coupons:
  `/wp-admin/admin.php?page=wpforms-payments&view=coupons`

Prep responsibilities:

- Settings > Payments may contain real connection text such as
  `Connected to Stripe as WPForms LLC in Test Mode.` Replace it with
  dummy/product-safe copy during DOM prep for video.
- Test mode toggle buttons on Settings > Payments should be forced off
  when the video calls for that state. Toggle state is prep, not a
  separate snapshot requirement unless the structural control is absent.
- Payment list/detail values should be dummy-safe before they appear in
  a video frame.

### Settings surfaces

Base settings surfaces:

- General: `/wp-admin/admin.php?page=wpforms-settings`
- Email: `/wp-admin/admin.php?page=wpforms-settings&view=email`
- CAPTCHA: `/wp-admin/admin.php?page=wpforms-settings&view=captcha`
- Validation:
  `/wp-admin/admin.php?page=wpforms-settings&view=validation`
- Payments:
  `/wp-admin/admin.php?page=wpforms-settings&view=payments`
- Integrations:
  `/wp-admin/admin.php?page=wpforms-settings&view=integrations`
- Geolocation:
  `/wp-admin/admin.php?page=wpforms-settings&view=geolocation`
- Access: `/wp-admin/admin.php?page=wpforms-settings&view=access`
- Misc: `/wp-admin/admin.php?page=wpforms-settings&view=misc`

Prep responsibilities:

- CAPTCHA may be configured or mostly empty on the current site. Capture
  the current structural surface; provider selection, keys, secret
  values, warning-copy emphasis, and on/off states are prep/dummy-data
  work as needed.
- Settings tab active states are structural enough to capture per tab,
  but small values inside a tab should be DOM prep.

### Integrations flow

Product truth:

- On the current site, Google Drive is the connected addon.
- The connected-addon UI shape is representative for any connected
  integration.
- Flow: click a connected addon to expand it, then click or reveal
  `+ Add New Account`.

Prep responsibilities:

- Treat the Settings > Integrations base page as the source surface.
- If the expanded connected-addon DOM is already present, reveal it with
  chapter-local prep/interaction.
- If the expanded DOM is not present until click, capture one expanded
  base variant or create a reusable connected-integration prep pattern
  after inspection.
- The `+ Add New Account` reveal/click is an interaction beat layered on
  the prepared surface.

### Tools surfaces

Base tools surfaces:

- Import: `/wp-admin/admin.php?page=wpforms-tools`
- Export: `/wp-admin/admin.php?page=wpforms-tools&view=export`
- System Info: `/wp-admin/admin.php?page=wpforms-tools&view=system`
- Scheduled Actions:
  `/wp-admin/admin.php?page=wpforms-tools&view=action-scheduler&s=wpforms`
- Logs: `/wp-admin/admin.php?page=wpforms-tools&view=logs`

Prep responsibilities:

- Search/filtering, row expansion, copied system text, and notices are
  prep or chapter-local interaction work unless the underlying
  table/panel is absent.
- Any environment-specific system information should be replaced or
  hidden before appearing in a video.

### Templates and addons

Base surfaces:

- Form Templates: `/wp-admin/admin.php?page=wpforms-templates`
- Addons: `/wp-admin/admin.php?page=wpforms-addons`

Prep responsibilities:

- Search terms, filter tabs, install/activate states, hover cards, and
  modal-like details should be set up with prep/interaction when the
  base list/grid exists.

### Explicit skip list

Do not include these in the current plugin-side base-surface recapture
unless human later reopens them:

- Privacy Compliance
- SMTP
- About Us
- Community

---

## Helper reference

### Universal baseline

#### `removeAdminBar(doc)`
Strips `#wpadminbar`, removes the `wp-toolbar` and `admin-bar` classes
that force `margin-top: 32px`, and appends a belt-and-braces style
element that neutralises any residual inline WP rules.

**Layer:** Universal baseline.
**When to call:** Any chapter whose snapshot captured the admin bar
that should not appear in the final video.
**Assumptions:** None. Safe on any document.
**Currently composed by:** `applyDefaultForm`, the `prepSettings`
helper in `cff-chapter-6.js`, and standalone in `cff-chapter-1-7.js`.

#### `removeBuilderCruft(doc)`
Removes Quiz-addon panel tabs, the PayPal Commerce checkout button
(container and logo span), and any quiz/alert overlays that the
`builder-fields` snapshot captures but the default Simple Contact Form
doesn't have. Extend the selector list as more addons leak into future
snapshots.

**Layer:** Universal baseline.
**When to call:** Any builder snapshot. Each selector is a no-op if
the node isn't present.
**Assumptions:** Builder-shaped DOM. Safe on non-builder snapshots
(no matches = no-op).
**Currently composed by:** `applyDefaultForm`, `prepSettings` in
`cff-chapter-6.js`.

---

### Per-snapshot profile

#### `applyDefaultForm(doc, opts?)`
The Simple-Contact-Form profile for `builder-fields`-shaped snapshots.
Composes: `removeAdminBar` + `removeBuilderCruft` + `keepOnlyFields`
(default `[1, 2, 4]`) + `setFieldLabel` (rename field 4 to "Message") +
`setFormName` (default "Simple Contact Form").

`opts`:
- `keepIds` — array of `data-field-id` values to keep. Override when a
  chapter needs the default 3 plus a reveal-target (e.g. hide a
  pre-captured field and reveal it mid-drag).
- `labels` — `{ [id]: label }` map of per-field label overrides.
  Merged with the default `{ 4: 'Message' }`.
- `formName` — override the default "Simple Contact Form".

**Layer:** Per-snapshot profile.
**Valid only on:** `builder-fields` and snapshots with the same field
DOM. Calling it on a settings-panel snapshot is safe (no matches) but
pointless.
**Used by:** 6 of 8 `cff-chapter-*.js` files.

#### `hideFields(doc, ids)`
Sets inline `display: none !important` on each
`#wpforms-field-<id>`. Used by chapters that need a field to remain
in the DOM (so a later drag/reveal animation can find it) but
invisible until then. Idempotent and safe on missing nodes.

**Layer:** Chapter-local delta (most callers) or per-snapshot profile
building block.
**Used by:** `cff-chapter-3.js`, `cff-chapter-4.js`,
`cff-chapter-5.js`, `cff-chapter-5-2.js`, `cff-chapter-5-3.js`.
**Op alias:** `{ op: 'hideFields', ids: [...] }`.

#### `keepOnlyFields(doc, keepIds)`
Removes every `.wpforms-field[data-field-id]` whose id isn't in the
supplied keep-set.

**Layer:** Per-snapshot profile building block.
**Direct chapter callers:** none today — used via `applyDefaultForm`.

#### `setFieldLabel(doc, fieldId, label)`
Rewrites `#wpforms-field-<id> > label.label-title > span.text`.

**Layer:** Per-snapshot profile building block.
**Direct chapter callers:** none today — used via `applyDefaultForm`.

#### `setFormName(doc, name)`
Swaps the builder header pill (`.wpforms-form-name`,
`.wpforms-center-form-name`) and sets the Settings → General → Form
Title input value.

**Layer:** Per-snapshot profile building block.
**Direct chapter callers:** `cff-chapter-6.js` `prepSettings` (which
runs on a settings-panel snapshot where `applyDefaultForm` wouldn't
apply).

---

### Chapter-local support

#### `iframeDoc()`
Returns `document.querySelector('iframe.ui')?.contentDocument`.

**Layer:** Chapter-local support (accessor).
**Note:** There is an identically-named function in
`runtime/scene-helpers.js`; the scene-helpers copy is the one imported
by the runner and verbs. Chapter `prep: (doc) => …` functions receive
the iframe document as a parameter — chapters should **not** need to
import `iframeDoc` from this file. Kept here because the
`authoring/generated/*.html` scaffold references it.

---

### Deprecated / migration-only

#### `stripQuizEnabled(doc)`  — migration-only
Drops the `wpforms-quiz-enabled` (and related graded/personality/
weighted/not-selected) body classes that the Quiz addon adds.
Workaround for snapshots captured while Quiz was active.

**Status:** Delete after the affected snapshots are recaptured with
the Quiz addon disabled.

#### `harvestField(slug, fieldType)` / `injectField(doc, slug, fieldType, opts?)` — deprecated
Fetch a `.wpforms-field-<type>` node out of a source snapshot and
append it onto the target snapshot's canvas, rewriting ids to avoid
collisions.

**Status:**
- `do: 'injectField'` in a chapter step is a **validator error on
  touched files** (`tools/validate-video.js`), warn-only on untouched
  legacy call sites.
- Retirement is deferred until the harvest-source path is decided
  (PLAN.md §Phase 6 "Carried debt"). For now: prefer capturing a
  snapshot that already contains the field you need. One legacy call
  site may remain until capture-side generalization lands.

---

## What belongs here vs. chapter-local setup

**Belongs in this library**
- Reused across more than one chapter, OR required for snapshot
  fidelity (fabricated-UI prevention, admin-bar strip, baseline
  cleanup).
- Idempotent — safe to call twice, safe on documents that don't have
  the target node.
- Selector-stable — its selectors map to catalog-indexed DOM (when
  the catalog exists) or to well-known WPForms conventions.

**Belongs in a chapter's `prep: (doc) => { … }`**
- One-off DOM seeds. Examples observed in the current chapters:
  - Hide a pre-captured field so it can be revealed mid-drag
    (`cff-chapter-5.js`, `cff-chapter-5-2.js`, `cff-chapter-5-3.js`).
  - Overwrite a specific input value with dummy copy that matches
    this chapter's narration (`cff-chapter-6.js`'s `prepNotifications`
    setting the subject to "New Entry: Simple Contact Form").
  - Restore a sidebar tab state that the previous chapter in the
    chain left in a different mode (`cff-chapter-5.js` forcing the
    Add Fields panel visible because chapter 4 left Field Options
    active).

The rule of thumb: if a DOM delta is legible only in the context of
one chapter's narration or animation plan, it stays in that chapter.
If it recurs verbatim in a second chapter, promote it here.

---

## Composition recipe

The canonical shape of a chapter `prep:` function.

```js
// videos/<slug>/chapters/my-chapter.js
import { defineChapter } from '/runtime/chapter-api.js';
import { applyDefaultForm } from '/runtime/dom-prep.js';

export default defineChapter({
  slug: 'my-chapter',
  snapshot: 'builder-fields',
  chapter: 'my-section',

  prep: (doc) => {
    // Layer 2: per-snapshot profile.
    applyDefaultForm(doc, { keepIds: [1, 2, 4, NEW_ID] });

    // Layer 3: chapter-local delta.
    doc.getElementById('wpforms-field-' + NEW_ID)
       ?.style.setProperty('display', 'none', 'important');
  },

  // steps: [...]
});
```

Worked example from `cff-chapter-5-3.js` — search "Dropdown" and drag
it onto the canvas, where the dropdown field already exists in the
captured snapshot (id 5):

```js
prep: (doc) => {
  applyDefaultForm(doc, { keepIds: [1, 2, 4, 5] });  // layer 2
  doc.getElementById('wpforms-field-5')              // layer 3
     ?.style.setProperty('display', 'none', 'important');
},
```

For a non-`builder-fields` snapshot where Layer 2's `applyDefaultForm`
doesn't apply (e.g. a settings-panel snapshot), compose the baseline
helpers directly — see `cff-chapter-6.js`'s `prepSettings`:

```js
function prepSettings(doc) {
  removeAdminBar(doc);
  removeBuilderCruft(doc);
  stripQuizEnabled(doc);
  setFormName(doc, 'Simple Contact Form');
}
```

This hand-composition is the pattern to reach for until Layer 2
gains more per-snapshot profiles.

---

## Deferred / deprecated summary

| Item | Status | Unblocks on |
|---|---|---|
| Universal-baseline auto-run on every boot/swap | Intended, not implemented | Someone wiring the compose pipeline into `bootSnapshot`/`swapSnapshot` |
| More per-snapshot profiles beyond `applyDefaultForm` | Intended, not implemented | Ask human per snapshot; bake profiles here |
| `stripQuizEnabled` deletion | Migration-only | Recapture affected snapshots with Quiz disabled |
| `harvestField` / `injectField` retirement | Deferred debt | Capture-side generalization (PLAN.md §Phase 6) |
| Declarative `prep` verb | Separate step | Phase 6 Step 7 |

---

## Declarative `prep` form

Phase 6 Step 7 added an array form for chapter `prep:` (and for
`snapshotSwap` step `prep:`). Entries run in declared order. Each
entry is a plain object with a required `op` field plus op-specific
fields. JS-function `prep: (doc) => { … }` remains the escape hatch
for cases the vocabulary doesn't cover.

```js
prep: [
  { op: 'applyDefaultForm', keepIds: [1, 2, 3, 4] },
  { op: 'hideFields', ids: [3] },
]
```

### Op vocabulary (v1)

| `op` | Fields | Notes |
|---|---|---|
| `removeAdminBar` | — | Strips the WP admin bar. |
| `removeBuilderCruft` | — | Quiz-tabs / PayPal button cleanup. |
| `applyDefaultForm` | `keepIds?: number[]`, `labels?: {[id]: string}`, `formName?: string` | Composes `removeAdminBar` + `removeBuilderCruft` + `keepOnlyFields` + label/name overrides. |
| `hideFields` | `ids: number[]` (required) | Inline `display: none` on each `#wpforms-field-<id>`. |
| `setFormName` | `name: string` | |
| `setFieldLabel` | `id: number`, `label: string` | Repeat the entry for multiple labels. |
| `stripQuizEnabled` | — | Migration-only. Validator warns on touched files. |

### Validation

`defineChapter()` compiles the array into a single function via
`runtime/prep-ops.js` at module load. Shape errors (unknown op,
unknown field on an entry, malformed args) throw at define time.
The validator (`tools/validate-video.js`) parses chapter `prep:`
arrays and applies the same checks as **hard errors regardless of
touched/untouched** — the syntax is new, so untouched legacy can
never use it.

### When to use the JS form instead

Reach for `prep: (doc) => { … }` when:

- A delta needs DOM reads outside the op vocabulary (e.g. restore a
  sidebar tab state by checking which one is currently active —
  see `cff-chapter-5.js`).
- A delta is a one-off editorial value tied to one chapter's
  narration (e.g. `prepNotifications` in `cff-chapter-6.js` setting
  the subject input to chapter-specific dummy copy).
- A delta runs on a non-`builder-fields` snapshot where
  `applyDefaultForm` doesn't apply but the cleanup is more than a
  short list of ops (e.g. `prepSettings` in `cff-chapter-6.js`).

### Migration

No bulk migration. The reference migration is
`videos/creating-first-form/chapters/cff-chapter-1-7.js`. Other
chapters keep their JS form until an author chooses to migrate
deliberately.

---

## See also

- `docs/chapter-module-contract.md` — the `prep:` field in
  `defineChapter()`.
- `docs/phase-6-validation.md` — selector-provenance fence and the
  validator rules that make `injectField` error on touched files.
- `PLAN.md` §Phase 3 — three-layer DOM-prep model decision.
- `PLAN.md` §Phase 6 — step ordering, including the future `prep`
  verb and capture-side generalization.
