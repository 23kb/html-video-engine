# Surface inventory — `builder-settings-notifications`

> **Status:** Draft source-driven surface inventory. No capture
> started.
>
> **Surface:** WPForms Form Builder → Settings → Notifications.
> **Live capture site (current):** `http://sulliesbakery.com`
> (WP admin: `http://sulliesbakery.com/wp-admin/`).
> **Plugin source root (current):**
> `C:\Users\PC\Local Sites\sullies-bakery\app\public\wp-content\plugins\wpforms`
> (the prior `newsite.local` Local site is still active locally
> but new capture planning targets `sulliesbakery.com`.)
> **Inventory framework:** `docs/phase-7-source-driven-surface-inventory.md`.
> **Refresh task that consumes this inventory:**
> `docs/phase-7-snapshot-refresh-builder-settings-notifications.md`.
> **Audit/readiness gate this inventory feeds into:**
> `docs/phase-7-catalog-quality-gate.md`.

---

## 1. Source files inspected

Direct reads, not summaries. Line numbers below were verified
against the WPForms plugin tree at the current capture site
(`C:\Users\PC\Local Sites\sullies-bakery\…\plugins\wpforms`)
on 2026-04-26 — the key anchors (`form_settings_notifications`
at 1057, `wpforms-builder-settings-block-default` at 1184,
`wpforms_form_settings_notifications_single_after` at 1440)
are unchanged from the prior inspection on the
`newsite.local` tree.

| File | Relevance |
| --- | --- |
| `pro/wpforms-pro.php` (`form_settings_notifications` at line 1057–1448) | Panel header (title + Add New button), form-level Enable toggle, per-notification block render loop, all per-notification fields (Send To, Subject, From Name, From Email, Reply-To, Email Message), block actions (clone/delete/toggle/edit/status), Conditional Logic builder hook, before/after action filters. The `default_notifications_key` block gets the `wpforms-builder-settings-block-default` class — this is what marks "expanded by default" at runtime (see line 1183–1185). |
| `src/Admin/Builder/Notifications/Advanced/EmailTemplate.php` | Email Template `<select>` (Lite + Pro hook), "Default Template" placeholder + registered template choices (Pro options labelled "(Pro)" and disabled for non-Pro). Modal link rendered after the select; modal HTML rendered into the builder footer via `builder/notifications/email-template-modal` template. Pro badge surfaced on Lite via `EducationHelpers::get_badge('Pro')`. |
| `src/Pro/Admin/Builder/Notifications/Advanced/Settings.php` | Pro-only "Advanced" group wrapper — `wpforms_panel_fields_group` with `group: settings_notifications_advanced`, `class: wpforms-builder-notifications-advanced`, `unfoldable: true`. Provides `Settings::get_choicesjs_field()` helper used by both EntryCsv and FileUpload for the multi-select renderings. Enqueues `assets/pro/js/admin/builder/notifications.js` (depends on `choicesjs`). |
| `src/Pro/Admin/Builder/Notifications/Advanced/EntryCsvAttachment.php` | Entry CSV Attachment toggle (`entry_csv_attachment_enable`, class `notifications_enable_entry_csv_attachment_toggle`); on toggle-on reveals the Entry Information ChoicesJS multi-select + the File Name text input. Excludes captcha / divider / entry-preview / html / content / internal-information / layout / pagebreak from the field list; appends "Other" smart tags (`{entry_date format="d/m/Y"}` etc.). |
| `src/Pro/Admin/Builder/Notifications/Advanced/FileUploadAttachment.php` | File Upload Attachment toggle (`file_upload_attachment_enable`, class `notifications_enable_file_upload_attachment_toggle`); on toggle-on reveals the File Upload Fields ChoicesJS multi-select. Options are *only* fields of type `file-upload` — empty options if the form has no File Upload field (localized as "You do not have any file upload fields"). Tooltip reminds about email-provider attachment size limits. |

The `wpforms_pro_admin_builder_notifications_advanced_settings_content`
filter is the seam where EmailTemplate (priority 5),
EntryCsvAttachment (priority 10), and FileUploadAttachment
(priority 10) compose into the Advanced group's body in that
order.

---

## 2. Fixture requirements

Live as of 2026-04-26 against `http://sulliesbakery.com`.

| Fixture role | Form ID (current) | Purpose | Status |
| --- | --- | --- | --- |
| Notifications fixture | **7** | Purpose-built for the Notifications surface so dependent Advanced-group dropdowns have meaningful options to render. | Live on `sulliesbakery.com`. |
| All-fields fixture | **10** | Every field type — for builder-fields / builder-setup / generic builder captures across the active library. | Live on `sulliesbakery.com`. |

Other fixtures present on the same site, recorded here for
context (their dedicated surface inventories will live in
their own docs):

| Fixture role | Form ID | Notes |
| --- | --- | --- |
| Blank Capture Form | 15 | Empty-template builder — used as the empty canvas teaser pattern. |
| Frontend Contact Fixture | 18 | Embedded at `http://sulliesbakery.com/page-frontend-contact-fixture/` for frontend captures. |
| Multi-Page Fixture | 25 | Multi-page form. |
| Payments Fixture | 28 | Carries the credit-card field — see §2.4. |
| Entries Fixture | 32 | Has 5 entries seeded for entry-list / entry-detail captures. |

### 2.1 Notifications fixture (form 7) shape

- Name
- Email
- Message
- File Upload

### 2.2 Why these specific fields

- **Name + Email + Message** — neutral, three-field form
  matching the WPForms tutorial-default "Simple Contact Form"
  shape. Keeps the panel chrome representative of what a
  first-time user sees.
- **File Upload** — *required* for the Notifications surface,
  not optional. `FileUploadAttachment.php` line 110 builds the
  File Upload Fields ChoicesJS option list by filtering
  `form_data['fields']` to `type === 'file-upload'`. If the
  form has none, the dropdown's option list is **empty** and
  the localized "You do not have any file upload fields"
  string surfaces. The dropdown's open / selected variant
  states cannot be captured meaningfully without at least
  one file-upload field on the fixture.

### 2.3 Historical placeholders

Earlier planning iterations used form IDs **436** (Notifications
fixture) and **401** (all-fields fixture) on the
`newsite.local` site. Those are now **superseded** by form 7
and form 10 on `sulliesbakery.com`. The references are kept
here only so prior-session notes and the older
`memory/local_wp_site.md` entry resolve to the new IDs without
ambiguity. Capture-time wiring continues to reference the
*fixture role* (Notifications fixture / all-fields fixture);
the literal ID rides through `formId` in
`capture/manifest.json` / `WP_FORM_ID` / per-job override in
`capture/batch-capture.js` and is now `7` / `10`.

### 2.4 Active WPForms addons (observed)

Confirmed present on the new site —
records the license / addon surface this inventory is being
written against:

- WPForms (core)
- WPForms Airtable
- WPForms Calculations
- WPForms Coupons
- WPForms Dropbox
- WPForms Geolocation
- WPForms Google Calendar
- WPForms Google Drive
- WPForms Google Sheets
- WPForms PayPal Commerce Pro
- WPForms Signatures
- WPForms Square Pro
- WPForms Stripe Pro
- WPForms Surveys and Polls

Pro core is active (required for `Settings.php`,
`EntryCsvAttachment.php`, `FileUploadAttachment.php` and the
non-disabled Pro Email Template options).

### 2.5 Known credit-card warning artifact

The Payments Fixture (form 28) and the all-fields fixture
(form 10) may render the WPForms credit-card warning banner
when previewed over plain `http://`:

```html
<div class="wpforms-cc-warning wpforms-error-alert">
  This page is insecure. Credit Card field should be used for testing purposes only.
</div>
```

This is a known capture artifact specific to the credit-card
field on a non-HTTPS host. It is **not** relevant to the
Notifications surface (form 7 has no credit-card field) and
should not appear in this surface's captures. It is recorded
here so the upcoming Payments / All-Fields surface
inventories handle it deliberately — including a decision to
either suppress (DOM-prep on the captured snapshot for
non-payment videos) or keep (when a payments tutorial walks
the warning intentionally). The warning must not silently
leak into tutorial footage unless intentionally relevant.

### 2.6 What is NOT yet pinned

- **WP admin credentials.** Provided by the operator out of band;
  **must not be stored in repo docs**, in this doc, in
  capture configs committed to the repo, or in any
  derivative artifact. Capture-time `WP_USER` / `WP_PASS`
  ride through environment variables only.
- **Admin notice / popup cleanliness.** New site must boot
  with no upgrade banners, no "first-run" prompts, no
  pending notices that bleed into the captured DOM.
  **Needs live builder confirmation before capture** —
  cannot be confirmed from source alone.
- **ChoicesJS option-list serialization, closed.** Whether
  the Entry Information / File Upload Fields ChoicesJS
  dropdowns serialize their full option list closed, or
  materialize options only on open, is observable on the
  live builder but not provable from source. Needs inspect
  after Sub-step 8 audit/readiness tooling lands.

These are §10 open questions, not §1 source facts.

---

## 3. Known base state

The "default" / first-load state of the Notifications panel
when a clean fixture form is opened in the builder, after
clicking the Settings → Notifications subtab.

### 3.1 Panel header

- **Title:** `<span id="wpforms-builder-settings-notifications-title">Notifications</span>` inside `.wpforms-panel-content-section-title`.
- **Add New Notification button:** `.wpforms-notifications-add.wpforms-builder-settings-block-add` with `data-block-type="notification"` and `data-next-id` set to the next free numeric id. Hidden via `wpforms-hidden` class when Enable Notifications is off (line 1085).

### 3.2 Description block (educational, dismissible)

- `.wpforms-panel-content-section-description.wpforms-dismiss-container`. Two paragraphs explaining notifications + linking to docs. Has a `.wpforms-dismiss-button`. Hidden once dismissed (`user_meta` `wpforms_dismissed`); on a clean fixture this block is **present and undismissed** by default.

### 3.3 Form-level Enable Notifications toggle

- Field: `notification_enable`, parent `settings`. Renders via `wpforms_panel_field('toggle', 'settings', 'notification_enable', …)`.
- Live DOM (verified in capture-library.md's note + existing catalog): wrapper `#wpforms-panel-field-settings-notification_enable-wrap`, hidden checkbox `#wpforms-panel-field-settings-notification_enable`. The visible UI is a custom toggle drawn by WPForms styles; the underlying `<input type="checkbox">` is rect 0×0. Default-on for a new form. **Authoring beats must target the wrapper, not the input.** This is the precise issue Sub-step 7 Finding #8 surfaced.

### 3.4 First (default) notification block

- Block element: `<div class="wpforms-notification wpforms-builder-settings-block wpforms-builder-settings-block-default" data-block-type="notification" data-block-id="1">`. The `-default` suffix is what marks the block as expanded at runtime — `.wpforms-builder-settings-block-content` is **not** wrapped in `style="display:none"` for the default block (line 1183–1185, 1227).
- Block header (`.wpforms-builder-settings-block-header`):
  - Block actions (`.wpforms-builder-settings-block-actions`):
    - **Status button** rendered by `get_status_button()` (line 1207) — Pro-only active/inactive control on each notification.
    - **Clone:** `.wpforms-builder-settings-block-clone` (`<i class="fa fa-copy">`).
    - **Delete:** `.wpforms-builder-settings-block-delete` (`<i class="fa fa-trash-o">`).
    - **Toggle (open/close):** `.wpforms-builder-settings-block-toggle` — chevron-up when expanded, chevron-down when collapsed.
  - Block name holder (`.wpforms-builder-settings-block-name-holder`):
    - Display: `.wpforms-builder-settings-block-name` shows the saved name (default: "Default Notification").
    - Edit input: `.wpforms-builder-settings-block-name-edit input[name="settings[notifications][1][notification_name]"]`.
    - Edit pencil: `.wpforms-builder-settings-block-edit` (`<i class="fa fa-pencil">`).
- Block content (`.wpforms-builder-settings-block-content`) — the per-notification fields, all using subsection `id`. Live DOM ID format: `wpforms-panel-field-notifications-{id}-{field}` (subsection-then-field), even though the source passes `input_id` as `wpforms-panel-field-notifications-{field}-{id}` — the live IDs come from the `wpforms_panel_field()` helper's wrapper conventions (capture-library.md §1 explicitly logs this mismatch).

### 3.5 Per-notification fields, in render order (block 1, default):

| Source field key | Label | DOM id (block 1) | Type | Notes |
| --- | --- | --- | --- | --- |
| `email` | Send To Email Address | `#wpforms-panel-field-notifications-1-email` | text + smart tags | Default `{admin_email}`. Class `email-recipient`. The wrap is `…-email-wrap`. **Verified runtime-visible 450×59 in Sub-step 7.** |
| `carboncopy` | CC | `#wpforms-panel-field-notifications-1-carboncopy` | text + smart tags | **Conditional** — only rendered if `wpforms_setting('email-carbon-copy')` is true (line 1251 `if ( $cc )`). Default off; absent in clean fixtures. Treat as a separate variant if a video covers CC. |
| `subject` | Email Subject Line | `#wpforms-panel-field-notifications-1-subject` | text + smart tags | Default `New Entry: <form-name>`. |
| `sender_name` | From Name | `#wpforms-panel-field-notifications-1-sender_name` | text + smart tags (filtered `name,text`) | Default = blog name. |
| `sender_address` | From Email | `#wpforms-panel-field-notifications-1-sender_address` | text + smart tags | Default `{admin_email}`. |
| `replyto` | Reply-To | `#wpforms-panel-field-notifications-1-replyto` | text + smart tags | Default empty. **Always rendered** by core (line 1364–1389) — there is no Pro/version gate. Capture-side: presence + empty value is the target; do not treat empty as absent. |
| `message` | Email Message | `#wpforms-panel-field-notifications-1-message` | textarea + smart tags | Default `{all_fields}`. Note about `{all_fields}` rendered after via `'after' =>`. |

Each text field with `'input_class' => 'wpforms-smart-tags-enabled'` carries the `.wpforms-show-smart-tags` button next to the input — that is the smart-tags dropdown trigger.

### 3.6 Conditional Logic builder block

`wpforms_conditional_logic()->builder_block(...)` at line 1412–1426 emits the per-notification CL UI **inside the block content**. Actions: `Send` / `Don't send`, action description "this notification if". This is **part of the base notification block** at the source level — there is no Pro gate; it renders for every notification. Whether to capture it as a separate variant depends on whether the captured DOM serializes the CL "no rules yet" state usefully on its own (most likely yes — see §4 row 11).

### 3.7 Advanced group (Pro)

`Settings::content()` (line 84–108) is hooked to `wpforms_form_settings_notifications_single_after` and emits the unfoldable Advanced group **after** the per-notification fields. Group composition under the
`wpforms_pro_admin_builder_notifications_advanced_settings_content` filter:

1. **Email Template** (priority 5, EmailTemplate.php) — single-`<select>` field with class `wpforms-panel-field-email-template-wrap` (wrap) and `wpforms-panel-field-email-template` (input), plus a modal-link rendered after the select.
2. **Entry CSV Attachment** (priority 10, EntryCsvAttachment.php) — toggle `entry_csv_attachment_enable` + (when on) Entry Information ChoicesJS + File Name text input.
3. **File Upload Attachment** (priority 10, FileUploadAttachment.php) — toggle `file_upload_attachment_enable` + (when on) File Upload Fields ChoicesJS.

The Advanced group is **collapsed by default** (`unfoldable: true`); on a base capture its body is in the DOM but visually folded.

---

## 4. Complete state inventory

Every source-known UI state for this surface. "Capture proposal"
column is the proposed disposition; "Variant slug" column names
the slug a future capture would write to. **Slugs and decisions
are proposed, pending review.**

| # | State | Driven by (source) | Capture proposal | Variant slug |
| - | ----- | ------------------ | ---------------- | ------------ |
| 1 | Base — single notification block, default-expanded, Enable Notifications on, Advanced collapsed | `form_settings_notifications` lines 1057–1448 | **base capture** | `builder-settings-notifications` |
| 2 | Enable Notifications **off** — Add New button hidden via `wpforms-hidden`; per-block content still rendered but the form-level toggle reads off | line 1085 | variant if any video walks the off→on flow | `builder-settings-notifications-disabled` (proposed) |
| 3 | Add New Notification clicked — second block appended | `.wpforms-notifications-add` button | variant only if a video walks "add a second notification" | `builder-settings-notifications-add-second` (proposed) |
| 4 | Two notifications present — second block collapsed (non-default) | source: only the `default_notifications_key` block gets `-default` class | variant *only* alongside #3; otherwise out of scope | (rolled into #3 capture) |
| 5 | Clone notification — duplicates the block with the next id | `.wpforms-builder-settings-block-clone` | variant only if a video walks cloning | `builder-settings-notifications-cloned` (proposed; defer) |
| 6 | Delete notification — confirm modal | `.wpforms-builder-settings-block-delete` triggers a confirm dialog | variant only if a video walks deletion; modal capture pattern from Phase 6 | `builder-settings-notifications-delete-confirm` (proposed; defer) |
| 7 | Collapse / expand block — `display:none` on `.wpforms-builder-settings-block-content` + chevron flip | line 1178–1181, 1227 | base covers expanded (default block); collapsed-only state is a variant only if a video walks closed→open on the *default* block | (rolled into #3 capture if any) |
| 8 | Edit block name (rename inline) | `.wpforms-builder-settings-block-edit` | not its own variant — interactive, covered by chapter-level animation against the base | — |
| 9 | Per-notification status active / inactive | `get_status_button()` line 1207 | variant if a video walks toggling per-block status | `builder-settings-notifications-block-inactive` (proposed; defer) |
| 10 | Smart-tags dropdown open on any of the seven smart-tag-enabled fields | `.wpforms-show-smart-tags` button + smart-tags overlay | variant only when a video walks insertion; precedent: `form-notifications` (smart-tags scenes already shipped) | `builder-settings-notifications-smarttags-<field>` (proposed; defer per-field) |
| 11 | Conditional Logic builder — no rules yet | `wpforms_conditional_logic()->builder_block` line 1412 | base may already include the empty CL block fully serialized; verify on inspect of refreshed base. If the CL builder defers any options to runtime, capture as variant. | (verify; otherwise rolled into base) |
| 12 | Conditional Logic builder — one rule added (field/condition/value populated) | CL builder JS adds row(s) | **separate slug**, already named in `snapshots/CATALOG.md` as `_not generated` | `builder-settings-notifications-cl` |
| 13 | Advanced group expanded | Settings.php `unfoldable: true` | **variant** — the entire Advanced sub-surface lives here | `builder-settings-notifications-advanced` |
| 14 | Email Template select (closed) | EmailTemplate.php — native `<select>` with options serialized inline | covered by #13 (Advanced expanded captures the closed select with all options in the DOM) | (rolled into #13) |
| 15 | Email Template select (open) — visual dropdown drawn over the page | native `<select>` opening behavior | typically not captured (browser-native popup is not part of the DOM); skip unless WPForms wraps it in ChoicesJS at capture time. **Verify on inspect.** | (likely skipped) |
| 16 | Email Template modal — rendered into builder footer, opened via the `email-template-link` after the select | EmailTemplate.php `builder_footer_scripts()` | variant if a video walks the modal | `builder-settings-notifications-email-template-modal` (proposed; defer) |
| 17 | Entry CSV Attachment toggle **off** (default) | EntryCsvAttachment.php toggle at default-off | covered by #13 base Advanced state | (rolled into #13) |
| 18 | Entry CSV Attachment toggle **on** — reveals Entry Information ChoicesJS + File Name | toggle-on JS reveals dependent controls | **variant** — the revealed sub-surface is authorable | `builder-settings-notifications-advanced-entry-csv-on` (proposed) |
| 19 | Entry Information Choices closed (selected values rendered as chips) | `Settings::get_choicesjs_field` renders saved selections; closed = base for #18 | covered by #18 | (rolled into #18) |
| 20 | Entry Information Choices open — full options list visible (All Fields + form fields + Other smart tags) | ChoicesJS open materializes options into the DOM | **separate variant** if the option list isn't fully serialized closed; verify on inspect | `builder-settings-notifications-advanced-entry-csv-options-open` (proposed) |
| 21 | Entry Information Choices selected — at least one chip present | post-selection state | variant only if a video walks the selection moment | `builder-settings-notifications-advanced-entry-csv-selected` (proposed; defer) |
| 22 | File Name field (visible only when #18 is on) | EntryCsvAttachment.php text input | covered by #18 | (rolled into #18) |
| 23 | File Upload Attachment toggle **off** (default) | FileUploadAttachment.php toggle at default-off | covered by #13 | (rolled into #13) |
| 24 | File Upload Attachment toggle **on** — reveals File Upload Fields ChoicesJS | toggle-on JS reveals dependent control | **variant** | `builder-settings-notifications-advanced-file-upload-on` (proposed) |
| 25 | File Upload Fields Choices closed | `Settings::get_choicesjs_field` | covered by #24 | (rolled into #24) |
| 26 | File Upload Fields Choices open — options list visible (only file-upload-typed fields from the fixture; **requires the Notifications fixture's File Upload field (form 7)** or the list is empty) | ChoicesJS open | **separate variant** if option list isn't serialized closed; verify on inspect | `builder-settings-notifications-advanced-file-upload-options-open` (proposed) |
| 27 | File Upload Fields Choices selected — at least one chip | post-selection state | variant only if a video walks the selection moment | `builder-settings-notifications-advanced-file-upload-selected` (proposed; defer) |
| 28 | Pro badge / upgrade prompts on Lite (EmailTemplate "(Pro)" labels, Pro modal badge) | EmailTemplate.php `EducationHelpers::get_badge('Pro')` | variant only if a video targets Lite specifically; default capture is Pro-licensed | (out of scope — the Notifications fixture form 7 runs on a Pro-licensed install) |
| 29 | Section description block — dismissed state (the educational paragraphs hidden) | dismissible UI in `wpforms_dismissed` user meta | not captured — runtime DOM state, controllable by clean fixture user (start undismissed). | — |

The "rolled into base / #13 / #18 / #24" rows are intentional —
not every state needs its own slug; some are byproducts of the
parent capture and are runtime-visible without further work.

---

## 5. Variant matrix (proposed, pending capture-planning sign-off)

The matrix consolidates §4 into the slugs the refresh program
will actually capture. Each row is one capture target.

### 5.1 Required for first refresh acceptance (base)

| Slug | What it captures | Source rows from §4 |
| --- | --- | --- |
| `builder-settings-notifications` | Single block default-expanded, Enable on, Advanced **collapsed**, all base per-notification fields visible incl. Reply-To, smart-tags buttons present but closed, no CL rules. | 1 |

### 5.2 Required for Notifications surface completeness (after base)

| Slug | What it captures | Source rows from §4 |
| --- | --- | --- |
| `builder-settings-notifications-advanced` | Same single block, Advanced **expanded**, Email Template select closed with all options serialized, Entry CSV toggle off, File Upload toggle off. | 13, 14, 17, 23 |
| `builder-settings-notifications-advanced-entry-csv-on` | Advanced expanded, Entry CSV toggle **on**, Entry Information ChoicesJS rendered with empty selection (no chips), File Name field visible at default value `entry-details`. | 18, 19, 22 |
| `builder-settings-notifications-advanced-file-upload-on` | Advanced expanded, File Upload toggle **on**, File Upload Fields ChoicesJS rendered, *the Notifications fixture's File Upload field (form 7) listed as a selectable option* in the closed/serialized state. | 24, 25 |

### 5.3 Conditional on inspect of base (decide after capture)

The "open ChoicesJS" rows below are needed **only** if the
inspect pass on the refreshed `…-advanced-entry-csv-on` /
`…-advanced-file-upload-on` snapshots shows that the option
list is not fully serialized in the closed state. If options
serialize at load, these rows are unnecessary.

| Slug | When required |
| --- | --- |
| `builder-settings-notifications-advanced-entry-csv-options-open` | If Entry Information option list isn't serialized closed (row 20). |
| `builder-settings-notifications-advanced-file-upload-options-open` | If File Upload Fields option list isn't serialized closed (row 26). |

### 5.4 Conditional on video scope

Captured only when a specific video's plan needs the state.

| Slug | Trigger |
| --- | --- |
| `builder-settings-notifications-cl` | A video covers conditional notification logic (row 12). The slug already exists as `_not generated` in the snapshot index. |
| `builder-settings-notifications-add-second` | A video walks adding a second notification (rows 3–4). |
| `builder-settings-notifications-cloned` | A video walks cloning a notification (row 5). |
| `builder-settings-notifications-delete-confirm` | A video walks deletion (row 6). |
| `builder-settings-notifications-block-inactive` | A video walks per-block status toggle (row 9). |
| `builder-settings-notifications-disabled` | A video walks the form-level Enable off→on flow (row 2). |
| `builder-settings-notifications-email-template-modal` | A video walks the Email Template modal (row 16). |
| `builder-settings-notifications-smarttags-<field>` | A video inserts a smart tag into one of the per-block text fields (row 10). One slug per `<field>` (`email`, `subject`, `sender_name`, `sender_address`, `replyto`, `message`). Per-field decision deferred; precedent in `form-notifications`. |
| `builder-settings-notifications-advanced-entry-csv-selected` | A video shows post-selection chips in Entry Information (row 21). |
| `builder-settings-notifications-advanced-file-upload-selected` | A video shows post-selection chips in File Upload Fields (row 27). |

### 5.5 Out of scope for the active library

| Slug-area | Reason |
| --- | --- |
| Pro upgrade badges on Lite (row 28) | Default capture is Pro-licensed; Lite-specific captures not needed for the current tutorial library. |
| CC field (row 3.5 column "carboncopy") | Conditional on global setting `email-carbon-copy`; absent in default fixture. Capture only if a video covers CC, then either (a) toggle the setting or (b) accept it as a configuration variant of the base. |

---

## 6. Capture variant rules (recap)

Codified in `docs/phase-7-source-driven-surface-inventory.md` §6
and inherited verbatim. Specific to this surface:

1. **Each meaningful UI state gets a named slug.** The §5
   variant matrix is the slug list.
2. **Toggle-revealed authorable surfaces require both
   states.** Entry CSV (rows 17–18) and File Upload (rows
   23–24) toggles are the canonical instances here; the
   "off" state is base/Advanced-base, the "on" state is its
   own slug.
3. **ChoicesJS open / selected variants are captured only if
   needed.** Decided per-control after inspect proves whether
   options serialize closed. Pattern from Phase 6 Step 3
   (confirmation dropdown closed/open) is the reference.
4. **Modals get their own slug** when a video walks the open
   flow (Email Template modal, Delete confirm). Default
   capture does not include modal-open state.
5. **Repeated blocks**: base captures one block (default,
   expanded). Two-block / clone / delete-confirm states are
   variants only when a video drives them.
6. **Conditional Logic** stays its own slug
   (`-cl`). Empty-rules state may be subsumed by base if
   inspect confirms the empty CL DOM serializes inline.
7. **Smart-tags dropdowns** are interactive variants per
   field; precedent from `form-notifications` (smart-tags
   scenes shipped). One slug per field per surface,
   captured only on demand.

---

## 7. Settle / wait expectations

Inherited from
`docs/phase-7-snapshot-refresh-builder-settings-notifications.md`
§5 and the universal goal in
`docs/phase-7-source-driven-surface-inventory.md` §6.8: no
broken images, no empty panels, no spinners, no half-rendered
WPForms UI.

Concrete per-variant settle expectations:

| Variant | Target selectors that must be visible before serialize | Asset settle | Explicit delay |
| --- | --- | --- | --- |
| `builder-settings-notifications` (base) | `[data-section="notifications"]` (sidebar nav active), `.wpforms-notification.wpforms-builder-settings-block-default` (default block expanded), `#wpforms-panel-field-notifications-1-email-wrap` (Send To wrap), `#wpforms-panel-field-notifications-1-replyto` (Reply-To input) | network-idle + font-ready per existing capture tooling | 1500–2500 ms (pin per Local-site latency observed at capture time) |
| `…-advanced` | base + `.wpforms-builder-notifications-advanced` (Advanced group container) **expanded** + `.wpforms-panel-field-email-template` rendered | same | same |
| `…-advanced-entry-csv-on` | `.wpforms-builder-notifications-advanced` expanded + `.notifications_enable_entry_csv_attachment_toggle` reads on + Entry Information ChoicesJS rendered + File Name input visible at default value | same | same |
| `…-advanced-file-upload-on` | `.wpforms-builder-notifications-advanced` expanded + `.notifications_enable_file_upload_attachment_toggle` reads on + File Upload Fields ChoicesJS rendered with the fixture's File Upload field listed | same | same |
| Open-options variants (5.3) | as parent + the relevant ChoicesJS dropdown open with options visible | same | longer settle if ChoicesJS animates the opening transition |

ChoicesJS is `choicesjs` (enqueued by Settings.php line 68) —
its open / close transitions are JS-driven; the explicit
settle delay should account for the transition completing
before serialization.

---

## 8. Add-on / addon state

Currently out of scope for this surface inventory beyond what
core + the Pro Notifications/Advanced classes ship. A future
inventory iteration will fold in addon-introduced states
(e.g. third-party providers that add notification-block
fields) once a video targets them.

---

## 9. Backup / refresh interaction

- Existing capture at `snapshots/builder-settings-notifications/`
  has been backed up to
  `snapshot-backups/2026-04-25-pre-notifications-refresh/builder-settings-notifications/`.
  Existing `snapshots/builder-settings-notifications-cl/` likewise
  backed up. See that folder's `MANIFEST.md`.
- Originals under `snapshots/` are untouched.
- The recapture proposal in
  `docs/phase-7-snapshot-refresh-builder-settings-notifications.md`
  will reference this inventory for the variant matrix and
  acceptance criteria.

---

## 10. Open questions — status

Updated 2026-04-26 against the live `sulliesbakery.com` site.
Each row tracks whether the question still blocks capture.

| # | Question | Status |
| - | -------- | ------ |
| 1 | Live site URL | ✅ Resolved — `http://sulliesbakery.com` (admin: `/wp-admin/`). |
| 2 | WPForms plugin source root | ✅ Resolved — `C:\Users\PC\Local Sites\sullies-bakery\app\public\wp-content\plugins\wpforms`. All five Notifications source files confirmed present at the new path on 2026-04-26. |
| 3 | Final fixture form IDs | ✅ Resolved — Notifications fixture = form **7**; all-fields fixture = form **10**. Other fixtures recorded in §2 for context. |
| 4 | Notifications fixture composition | ✅ Resolved — Name + Email + Message + File Upload on form 7. Pin captured before any future re-shape. |
| 5 | Active WPForms addons + license state | ✅ Resolved  — Pro core + the addon list in §2.4. Reply-To rendering confirmed via source line 1364–1389 (always rendered for every notification). |
| 6 | WP admin credentials | ⚠ Provided out of band; **do not store in repo docs**. Capture-time `WP_USER` / `WP_PASS` ride through environment variables only. No credential value lives in this repo or any derivative artifact. |
| 7 | Admin-notice / popup cleanliness | ⏳ Needs live builder confirmation before capture. The new site must boot with no WP admin notices, no WPForms upgrade banners, no "first-run" prompts, no review-nag prompts, and no plugin-update notices in the builder chrome. Confirmable only by the operator (or by a future audit pass) on the live builder. |
| 8 | `email-carbon-copy` global setting | ⏳ Expected off; needs live confirmation. If on, the base capture's CC field row in §3.5 changes from "absent" to "present + empty". |
| 9 | ChoicesJS option-list serialization, closed | ⏳ Needs inspect after Sub-step 8 audit/readiness tooling lands. Determines whether §5.3 open-options variants are required at all. |
| 10 | Settle-delay calibration | ⏳ 1500–2500 ms range proposed; final value pinned at capture time once new-site latency is observed. |

Resolved (✅) rows are no longer capture blockers. ⚠ rows are
governed by external rules (no in-repo storage of secrets) and
do not block capture so long as that rule is followed at run
time. ⏳ rows still block, in the order: audit/readiness
tooling → live admin-notice / settings confirmation →
capture authorization.

Capture commands for any variant in §5 remain **future,
pending Sub-step 8 audit tooling and capture authorization**.
None are run inside this inventory doc.

---

## 11. Current waiting state

Snapshot of where this surface sits on 2026-04-26.

- ✅ **Source path known.** WPForms plugin tree confirmed at
  the new live site path; all five Notifications source files
  present.
- ✅ **Fixture forms ready.** Form 7 (Notifications) and form
  10 (all-fields) live on `http://sulliesbakery.com`. Other
  fixtures (15 / 18 / 25 / 28 / 32) catalogued for sibling
  surface inventories.
- ✅ **Old snapshot backups exist.** Pre-refresh
  `builder-settings-notifications/` and
  `builder-settings-notifications-cl/` archived under
  `snapshot-backups/2026-04-25-pre-notifications-refresh/`
  (outside `snapshots/` so the snapshot index/catalog
  tooling does not treat them as library snapshots). See
  `snapshot-backups/2026-04-25-pre-notifications-refresh/MANIFEST.md`.
- ⏳ **Waiting on Sub-step 8 audit/readiness implementation.**
  See `docs/phase-7-catalog-quality-implementation-plan.md`.
  Capture cannot proceed until per-snapshot audit
  (`catalog-audit.json`) + library readiness rollup
  (`readiness.json`) tooling exists, so refreshed captures
  can be evaluated against the runtime-visibility gate.
- ⏳ **Then live admin-notice / settings confirmation.**
  Resolve the remaining ⏳ rows in §10 (admin-notice
  cleanliness, `email-carbon-copy` confirmation).
- ⏳ **Then capture authorization.** Explicit go from the operator on
  this specific recapture per the refresh proposal §2 and
  §3.4a.
- ⏳ **Then base capture, then variant captures.** Base slug
  `builder-settings-notifications` first; surface
  completeness via the §5.2 / §5.3 inventory tiers follows
  per the refresh proposal §7.2.

This doc remains a draft; nothing here triggers capture.

### 11.1 Future-capture notes (for when authorization lands)

Recorded here so the eventual capture work has the relevant
hooks on hand. **Not** a runnable plan, **not** JSON, **not** a
command. Treat as planning notes to translate into a real
capture plan once Sub-step 8 ships and authorization is
explicit.

- Base capture target — Settings → Notifications subtab on
  form 7. The standard pattern in `capture/manifest.json` for
  this slug is the "Settings → click `.wpforms-panel-sidebar-section-notifications`"
  hand-off; the verifier `[id^='wpforms-panel-field-notifications-']`
  remains valid.
- `…-advanced` capture — same base + a `WP_STEPS`-style
  expand-Advanced step against the
  `.wpforms-builder-notifications-advanced` group. The
  Advanced group is `unfoldable: true`; capture-tool already
  supports per-job step sequences via the `--variants`
  pattern documented in `capture/capture-library.md` §7.
- `…-advanced-entry-csv-on` and `…-advanced-file-upload-on` —
  toggle-on steps against
  `.notifications_enable_entry_csv_attachment_toggle` and
  `.notifications_enable_file_upload_attachment_toggle`
  respectively, with settle long enough for the ChoicesJS
  multi-select to render its dependent control.
- ChoicesJS open-state variants (§5.3) — captured only after
  inspect of the toggle-on captures shows the option list is
  not serialized closed. Decided per-control at that point;
  no commitment from this doc.
- Frontend-related captures (form 18, page
  `/page-frontend-contact-fixture/`) belong to a different
  surface inventory and are not part of this Notifications
  surface.

The above is forward-looking only. No capture command is
constructed here.
