# WPForms Interactions Library — 2026-05-11

Wave 1 of the standard WPForms interaction sequences. Lives at
[`videos/_shared/wpforms-interactions.js`](../videos/_shared/wpforms-interactions.js).
Built on top of [`motion-primitives.js`](../videos/_shared/motion-primitives.js)
(specifically the `Cursor` class and `clickRipple` helper).

> **Status:** Draft. All 8 interactions wired, all 8 QC pages render their
> starting snapshot without console errors. Visual approval (cursor lands
> on the right target, snapshot-swap is clean, drag ghost stays glued to
> cursor) is **Umair's** — open each `videos/_qc-interactions/*.html`
> page in a real browser tab (preview_eval throttles rAF, so animations
> only run when the tab is foreground).

## What this is

A documented set of executable WPForms interaction sequences. Each method
on `WPFormsInteractions` performs ONE canonical user-action arc:

- cursor glide to a real captured WPForms element
- click animation (squash + WPForms-orange ripple)
- optional snapshot-swap (`flipBridge`-style crossfade) or DOM-only state change

Why a library: the "click Add New" arc was being re-implemented from
scratch in every editorial/mixed video, and the cursor timings, snapshot
swap durations, and selector targets drifted between videos. This pins
them.

## Library shape

```js
import { Cursor } from '/videos/_shared/motion-primitives.js';
import {
  IframeManager,
  WPFormsInteractions,
} from '/videos/_shared/wpforms-interactions.js';

const stage = document.getElementById('stage'); // 1280×720
const iframe = new IframeManager(stage);
const cursor = new Cursor(stage, { initialX: 1180, initialY: 660 });
const actions = new WPFormsInteractions(stage, cursor, iframe);

await iframe.load('admin-forms-overview');
await actions.navAddNewForm();          // → admin-templates
await actions.selectTemplate('blank');  // → builder-setup
await actions.navBuilderSidebar('settings'); // → builder-settings-general
```

### `IframeManager`

Owns the snapshot iframe slot inside the stage. Loads + crossfade-swaps
snapshots. Exposes:

| method | purpose |
|---|---|
| `load(slug)` | mount + load a snapshot folder (`/snapshots/<slug>/index.html`) |
| `swap(slug, { duration })` | crossfade to a different snapshot (default 0.32 s) |
| `currentSlug()` | current snapshot slug |
| `doc()` | current iframe's `contentDocument` |
| `query(sel)` / `queryAll(sel)` | iframe-doc convenience selectors |
| `elementToStageCoords(elOrSel)` | iframe-doc element → stage-coord center (accounts for iframe `transform: scale(0.8864)`) |
| `scrollIntoView(elOrSel)` | smooth-scroll the iframe-doc element into view |
| `wait(seconds)` | promise-returning sleep (setTimeout-backed, determinism-safe) |

The iframe renders at 1444×900 and is `transform: scale(0.8864)` down to
the stage's 1280×720 viewport — same convention as
[`videos/_qc-primitives/cinematic-flight-inter-snapshot.html`](../videos/_qc-primitives/cinematic-flight-inter-snapshot.html).

### `WPFormsInteractions` — Wave 1

Each method's JSDoc carries `@prerequisite`, `@operation`, `@endsAt`,
`@primitives`, `@realDom`, and `@duration` tags.

| # | method | start snapshot | op | end snapshot | real DOM target |
|---|---|---|---|---|---|
| 1 | `navAddNewForm()` | `admin-forms-overview` | snapshot-swap | `admin-templates` | `.page-title-action[data-action="add"]` |
| 2 | `selectTemplate(slug)` | `admin-templates` | snapshot-swap | `builder-setup` | `.wpforms-template-select[data-slug="<slug>"]` |
| 3 | `navWPFormsSidebarMenu(item)` | any with WP sidebar | snapshot-swap | per item map | `#toplevel_page_wpforms-overview .wp-submenu a` filtered by text |
| 4 | `openFormInList(formId)` | `admin-forms-overview` | snapshot-swap | `builder-fields` | `td.column-name a[href*="form_id=<id>"]` |
| 5 | `dragFieldToForm(fieldSlug)` | `builder-fields` | dom-only | `builder-fields` (+1 field) | `[data-field-type="<slug>"].wpforms-add-fields-button` → `.wpforms-field-wrap` |
| 6 | `openFieldOptions(fieldId)` | `builder-fields` | dom-only | `builder-fields` (options open) | `.wpforms-field[data-field-id="<id>"]` |
| 7 | `navBuilderSidebar(section)` | any `builder-*` | snapshot-swap | per section map | `.wpforms-panel-<section>-button[data-panel="<section>"]` |
| 8 | `openSettingsTab(tab)` | any `builder-settings-*` | snapshot-swap | `builder-settings-<tab>` | `.wpforms-panel-sidebar-section[data-section="<tab>"]` |

### Snapshot-swap vs DOM-only decisions

The brief asked us to decide per-interaction. Rationale:

- **snapshot-swap** when the next state is a captured snapshot with rich
  detail (admin-templates → builder-setup carries a fully populated setup
  panel that would be tedious to fake by DOM puppetry).
- **dom-only** when the change is local to one DOM region and the snapshot
  already contains the target state (e.g. `builder-fields` already has the
  `#wpforms-field-options` panel hidden behind the active "Add Fields" tab
  — flipping the tab active class is enough).
- **hybrid** is reserved for cases where a swap would be too jarring for
  a small click feedback (none in Wave 1; queued for Wave 2 if needed).

## Template hover state inventory

The admin-templates snapshot ships each template card with a hidden
`.wpforms-template-buttons` wrapper. The CSS reveals it on `:hover` or
when the card has `.active`, but those rules live inside a `@layer` that
loses to the unlayered `opacity: 0` base — so `selectTemplate` always
sets inline `opacity: 1` on top of the `.active` class.

Three variants exist; `selectTemplate` normalizes button copy to match
the live product per variant:

**1. AI generate card** — `data-slug="generate"`. Single purple-dark
button only. Canonical HTML:

```html
<div class="wpforms-template-buttons">
  <a href="#" class="wpforms-template-generate wpforms-btn wpforms-btn-md wpforms-btn-purple-dark">
    Generate Form
  </a>
</div>
```

**2. Blank Form** — `data-slug="blank"`. Single orange button only:

```html
<div class="wpforms-template-buttons">
  <a href="#" class="wpforms-template-select wpforms-btn wpforms-btn-md wpforms-btn-orange"
     data-template-name-raw="Blank Form" data-template="blank" data-slug="blank">
    Create Blank Form
  </a>
</div>
```

**3. All other templates** — orange "Use Template" + light-grey "View Demo":

```html
<div class="wpforms-template-buttons">
  <a href="#" class="wpforms-template-select wpforms-btn wpforms-btn-md wpforms-btn-orange"
     data-template-name-raw="Simple Contact Form"
     data-template="simple-contact-form-template" data-slug="simple-contact-form-template">
    Use Template
  </a>
  <a class="wpforms-template-demo wpforms-btn wpforms-btn-md wpforms-btn-light-grey"
     href="https://wpforms.com/templates/simple-contact-form-template/" target="_blank">
    View Demo
  </a>
</div>
```

Shared wrapper CSS (per the live product):

```css
.wpforms-template-buttons {
  background-color: #fff;
  border-radius: 6px;
  display: flex;
  opacity: 0;
  padding: 15px 15px 0;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
  position: absolute;
  bottom: 15px;
  transition: all 0.15s ease-out;
}
```

## Per-form profiles for `openFormInList`

The captured `admin-forms-overview` snapshot has three form rows but
`builder-fields` is captured as the All-Fields Fixture (50+ fields). To
make each form open look distinct, `openFormInList` post-applies a
form-specific profile after the swap:

| form_id | name | visible canvas fields (data-field-id) |
|---|---|---|
| 55 | Contact Us form | 48 (Name), 49 (Email), 50 (Message) |
| 53 | Newsletter Signup | 48 (Name), 49 (Email) |
| 40 | Job Application | 48 (Name), 49 (Email), 10 (Phone), 15 (Address), 50 (Description) |

The profile lives in `FORM_PROFILES` at the top of
`videos/_shared/wpforms-interactions.js`. To add another form id, append
an entry — the helper hides any canvas field whose id isn't in the
`fields` whitelist.

## QC pages

One per interaction, plus an index. All under
[`videos/_qc-interactions/`](../videos/_qc-interactions/).

| QC page | runs |
|---|---|
| [index.html](../videos/_qc-interactions/index.html) | grid of all 8 demos with prerequisites + op type |
| [nav-add-new-form.html](../videos/_qc-interactions/nav-add-new-form.html) | `navAddNewForm()` |
| [select-template.html](../videos/_qc-interactions/select-template.html) | `selectTemplate(slug)` — slug picker (6 options) |
| [nav-wpforms-sidebar-menu.html](../videos/_qc-interactions/nav-wpforms-sidebar-menu.html) | `navWPFormsSidebarMenu(item)` — item picker (8 options) |
| [open-form-in-list.html](../videos/_qc-interactions/open-form-in-list.html) | `openFormInList(formId)` — id picker (3 options) |
| [drag-field-to-form.html](../videos/_qc-interactions/drag-field-to-form.html) | `dragFieldToForm(slug)` — field-type picker (8 options) |
| [open-field-options.html](../videos/_qc-interactions/open-field-options.html) | `openFieldOptions(fieldId)` — id picker (3 options) |
| [nav-builder-sidebar.html](../videos/_qc-interactions/nav-builder-sidebar.html) | `navBuilderSidebar(section)` — section picker (6 options) |
| [open-settings-tab.html](../videos/_qc-interactions/open-settings-tab.html) | `openSettingsTab(tab)` — tab picker (5 options) |

Each page mounts the stage, iframe, and cursor; loads the starting
snapshot; and exposes a "run" button. Picker dropdowns expose the
interaction's parameter space.

> **rAF in preview_eval is throttled** because the preview browser tab is
> backgrounded (`document.hidden === true`). For visual verification,
> open the QC page in a real browser tab. The page itself renders fine
> in preview_eval; only the animations stall until the tab is foreground.

## Hard constraints honored

- **Real WPForms UI only.** Every selector is sourced from a captured
  snapshot. None of the targets are fabricated.
- **Determinism-safe.** No `Date.now()`, no unseeded `Math.random()`, no
  `fetch()`, no `repeat: -1`. `setTimeout` is used in `IframeManager#wait`
  (matches the `motion-primitives.js#wait` convention).
- **Cursor reuse.** The `Cursor` class from `motion-primitives.js` is used
  everywhere — no re-implementation.
- **Protected core untouched.** `runtime/`, `engine/`, `scenes/shared.js`,
  and existing snapshots are unchanged.
- **GitHub read-only.** Files committed locally; no push.

## What this does NOT do

- **No engine integration.** This library uses its own `IframeManager`
  and crossfade. A chapter-driven tutorial video would use the engine's
  `loadSnapshot` + `runtime/transitions.js#flipBridge` instead. The
  interaction *methods* are still useful inside a chapter (you can pass
  the engine's iframe element to a thin adapter), but the wiring isn't
  built yet.
- **No keyboard interactions.** No `typeAIPrompt(text)` yet (Wave 2).
- **No addon/marketing workflows.** No `selectMarketingProvider`,
  `clickAddonActivate`, `openEmbedModal` (all Wave 2).
- **No real form drag-and-drop physics.** `dragFieldToForm` uses a stage-
  mounted ghost element clone. It looks like a WPForms drag; it is not
  driven by the live plugin's `jquery.sortable`. Production scenes that
  need the actual sortable behavior should use the engine's drag helper.

## Things flagged to user

During build I found these worth surfacing back:

1. **`wp-dashboard` snapshot does not exist.** The prompt mentions
   "From wordpress dashboard go to wpforms then select any of the setting
   from the sidebar" — but there is no `wp-dashboard` snapshot. Every
   admin-* snapshot already has the WPForms admin page active. Wave 1's
   `navWPFormsSidebarMenu` assumes you're already on an admin-* snapshot
   with the sidebar visible. To start from a pure WP-dashboard (Posts /
   Pages / etc. active), a new snapshot would need to be captured.

2. **No `admin-addons-after-install` snapshot.** Wave 2 wanted
   `clickAddonActivate(slug)` that transitions to a "connected" state.
   The current `admin-addons` snapshot shows the grid; there is no
   captured post-activation state. Either capture one, or build a
   DOM-only puppetry path (toggle the Install/Activate button text and
   the status badge inside the same snapshot).

3. **Admin-templates uses opaque `data-template` hashes for most
   templates.** Only `blank` and `simple-contact-form-template` use
   human-readable values. We use `data-slug` instead (e.g.
   `newsletter-signup-form-template`), which is stable and readable —
   documented in the QC picker.

4. **`Settings` in `navWPFormsSidebarMenu` is ambiguous between WP
   Settings (Reading / Writing / etc.) and WPForms Settings.** Wave 1
   maps `"Settings"` to `admin-settings-general` (WPForms Settings, since
   the click target lives inside the WPForms submenu). If a video needs
   to click WP-core Settings, that's a different interaction.

5. **`Surveys and Polls` results state has 3 captured variants** (base,
   customize-open, export-open, filters-open). Wave 2 could surface a
   `selectSPResultsAction(action)` interaction; flagging for prioritization.

## Wave 2 candidates (deferred)

- AI flow: `openAIChat()`, `typeAIPrompt(text)`, `clickAIChatSend()`,
  `clickUseThisForm()` (uses `wpforms-ai-builder-empty` and
  `wpforms-ai-builder-feedback-generated`).
- Marketing providers: `selectMarketingProvider(slug)`,
  `openProviderSettings(slug)` (uses `builder-providers`,
  `builder-providers-convertkit`).
- Addons: `navAddonsPage()`, `clickAddonActivate(slug)`,
  `clickAddonInstall(slug)`.
- Embed: `openEmbedModal()`, `selectEmbedTarget(target)`.
- Surveys: `selectSPResultsAction(action)` covering the 4 SP-results
  snapshot variants.

## File map

```
videos/_shared/wpforms-interactions.js     # library (IframeManager + WPFormsInteractions)
videos/_qc-interactions/
├── _shell.css                             # shared chrome
├── _shell.js                              # shared boot harness (bootQc)
├── index.html                             # QC index — links to all demos
├── nav-add-new-form.html
├── select-template.html
├── nav-wpforms-sidebar-menu.html
├── open-form-in-list.html
├── drag-field-to-form.html
├── open-field-options.html
├── nav-builder-sidebar.html
└── open-settings-tab.html
docs/wpforms-interactions-library-2026-05-11.md   # this file
```
