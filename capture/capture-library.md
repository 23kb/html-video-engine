# WPForms Capture Library — UI Surface Inventory

Source: derived from WPForms plugin source at `C:\Users\PC\Local Sites\video-test-site\app\public\wp-content\plugins\wpforms`.

**Caveat:** selectors and click-sequences below are starting points. Each capture job will need `WP_WAIT_FOR` verification and selector tuning on first run (see the `notifications` scene history — the agent guessed `wpforms-panel-field-settings-notifications-...` but the real ID is `wpforms-panel-field-notifications-1-email`). Expect 1 iteration per job to nail the exact selectors.

---

## 1. Form Builder Panels
Base URL: `admin.php?page=wpforms-builder&form_id={ID}&view={view}`

| View slug | Panel | Click-through needed? |
|---|---|---|
| `setup` | Setup (form name, template picker) | No |
| `fields` | Fields (palette + canvas + options sidebar) | No |
| `settings` | Settings hub | Click section subtab |
| `payments` | Payments (Stripe/PayPal/etc. — Pro) | Click provider subtab |
| `providers` | Marketing providers (Mailchimp, ConvertKit, etc.) | Click provider subtab |
| `revisions` | Form version history (Pro) | No |

### Settings subsections (click `.wpforms-panel-sidebar-section-{name}`)
- general, notifications, confirmations, anti_spam, themes
- (Pro) access_control, calculations

### Fields panel — field-option sidebars (click the field in canvas to activate)
Lite fields (`includes/fields/`):
- Single Line Text, Paragraph Text, Dropdown, Multiple Choice (radio), Checkboxes, Number, Number Slider, Name, Email, Website/URL, GDPR Agreement, Layout, HTML, Content, Section Divider, Page Break, Hidden Field

Pro fields (`src/Pro/Forms/Fields/`):
- Address, Date/Time, Phone, File Upload, Rating, Credit Card (Stripe), Signature, Rich Text, Password, Repeater, Calculation, Entry Preview

Addon fields (activate addon first):
- Signature, Coupon, NPS, Likert Scale, Authorize.Net/Square cards, Lookup (map/address)

Each field-option sidebar has tabs: **General**, **Advanced**, **Smart Logic** — capture each tab separately.

---

## 2. Admin pages outside the builder

| Page | URL path |
|---|---|
| Forms Overview | `admin.php?page=wpforms-overview` |
| Form Templates | `admin.php?page=wpforms-templates` |
| Entries | `admin.php?page=wpforms-entries` (and `&view=details&entry_id=X`) |
| Payments | `admin.php?page=wpforms-payments` |
| Tools | `admin.php?page=wpforms-tools&view=import|export|logs|system|action-scheduler` |
| Addons | `admin.php?page=wpforms-addons` |
| Settings | `admin.php?page=wpforms-settings&view=general|email|validation|integrations|access|payments|geolocation|misc` |
| SMTP | `admin.php?page=wpforms-smtp` |
| About | `admin.php?page=wpforms-about` |
| Community | `admin.php?page=wpforms-community` |

---

## 3. Modals / popups / overlays
Trigger via click-sequence:

- **Template picker** — Setup panel → search or category filter
- **Embed modal** — header `#wpforms-embed`
- **Smart-tags dropdown** — `.wpforms-show-smart-tags` on any supporting field
- **Conditional logic builder** — settings sidebar on fields/notifications/confirmations that support it
- **PDF popup** — builder loads this by default when PDF addon prompts exist
- **Help/context menu** — `#wpforms-help`, `#wpforms-context-menu-container`
- **Delete confirmations** — any delete button
- **Upgrade-to-Pro** — click any Pro-locked feature (dims + shows upgrade modal)
- **Entry details** — `admin.php?page=wpforms-entries&view=details&entry_id=X`
- **Payment details** — `admin.php?page=wpforms-payments&view=single_payment&payment_id=X`
- **Revision diff** — Revisions panel → click a revision

---

## 4. Frontend form states (`[wpforms id=X]` on a page)

- Empty (initial load)
- Partially filled (one field focused, another filled)
- Validation error (submit with required fields empty)
- Submit-in-progress (`.wpforms-submit.wpforms-submit-loading`)
- Confirmation — message variant
- Confirmation — redirect (captured just before redirect)
- Multi-page: page 1, middle page, last page with progress bar variants (connector / circles / progress / none)

Each captured at mobile viewport (375px), tablet (768px), and desktop (1440px) for responsive demos.

---

## 5. Micro-interactions (capture "before" and "after" as two snapshots)

| Interaction | Before state | After state |
|---|---|---|
| Toggle switch (Enable Notifications, etc.) | OFF | ON |
| Smart-tag dropdown | closed | open |
| Smart-tag insert | cursor in input | tag chip present |
| Add notification | 1 notification | 2 notifications |
| Add conditional rule | no rules | 1 rule row |
| Delete field confirm | confirm modal closed | open |
| Template picker | list view | preview modal |
| Panel switch | Fields active | Settings active |
| Field reorder | order A-B-C | order B-A-C |
| Color picker | closed | open |
| Add field | N fields | N+1 fields |

For each, the scene does: snapshot-A → fake cursor click → swap to snapshot-B (or direct DOM edit). The "edit" is simpler and works when only a small area changes.

---

## Starter manifest (first 10 highest-value captures)

```json
[
  { "slug": "builder-setup",              "path": "/wp-admin/admin.php?page=wpforms-builder&form_id=${FID}&view=setup",    "click": "", "verify": "#wpforms-panel-setup" },
  { "slug": "builder-fields",             "path": "/wp-admin/admin.php?page=wpforms-builder&form_id=${FID}&view=fields",   "click": "", "verify": "#wpforms-panel-fields" },
  { "slug": "builder-settings-general",   "path": "/wp-admin/admin.php?page=wpforms-builder&form_id=${FID}",               "click": ".wpforms-panel-settings-button, .wpforms-panel-sidebar-section-general", "verify": "#wpforms-panel-field-settings-form_title" },
  { "slug": "builder-settings-notifications", "path": "/wp-admin/admin.php?page=wpforms-builder&form_id=${FID}",           "click": ".wpforms-panel-settings-button, .wpforms-panel-sidebar-section-notifications", "verify": "#wpforms-panel-field-notifications-1-email" },
  { "slug": "builder-settings-confirmations", "path": "/wp-admin/admin.php?page=wpforms-builder&form_id=${FID}",           "click": ".wpforms-panel-settings-button, .wpforms-panel-sidebar-section-confirmations", "verify": "[id^='wpforms-panel-field-confirmations-']" },
  { "slug": "builder-field-options-text", "path": "/wp-admin/admin.php?page=wpforms-builder&form_id=${FID}&view=fields",   "click": ".wpforms-field-text", "verify": ".wpforms-field-option-text" },
  { "slug": "builder-field-options-email","path": "/wp-admin/admin.php?page=wpforms-builder&form_id=${FID}&view=fields",   "click": ".wpforms-field-email", "verify": ".wpforms-field-option-email" },
  { "slug": "admin-forms-overview",       "path": "/wp-admin/admin.php?page=wpforms-overview",                              "click": "", "verify": ".wpforms-admin-forms-table" },
  { "slug": "admin-entries",              "path": "/wp-admin/admin.php?page=wpforms-entries",                               "click": "", "verify": ".wpforms-admin-content" },
  { "slug": "admin-settings-general",     "path": "/wp-admin/admin.php?page=wpforms-settings&view=general",                 "click": "", "verify": "#wpforms-setting-row-license-key" }
]
```

`${FID}` = a fixture form you create once. Keep one "everything-enabled" fixture form in LocalWP and reference it by ID for every capture.

---

## 6. Driving state before capture — `WP_STEPS`

Many surfaces need DOM state set up before the serialize step (SPA nav,
native `<select>` changes, dropdown-open states). `WP_STEPS` is a JSON
array run after initial navigation and before capture.

Entry shapes:

- `{ "click": "<selector>", "settle": <ms?> }` — waits for the selector, clicks it, sleeps `settle` (default 800ms).
- `{ "eval":  "<js>",       "settle": <ms?> }` — `page.evaluate(js)`, sleeps `settle` (default 1500ms).
- `{ "wait":  <ms> }` — plain sleep.

Example — open the Confirmation page-type Choices dropdown on form 401:

```bash
WP_STEPS='[
  {"click":".wpforms-panel-sidebar-section-confirmation"},
  {"eval":"document.querySelector(\"#wpforms-panel-field-confirmations-1-type\").value=\"page\";jQuery(\"#wpforms-panel-field-confirmations-1-type\").trigger(\"change\")"},
  {"click":"#wpforms-panel-field-confirmations-1-page-wrap .choices"}
]' node capture/capture.js "/wp-admin/admin.php?page=wpforms-builder&form_id=401&view=settings" builder-settings-confirmation-dropdown-open
```

Legacy shorthand `WP_CLICK="sel1, sel2"` still works (equivalent to a
`click`-only `WP_STEPS`).

---

## 7. Multi-variant single-context capture — `--variants`

Phase 6 Step 4. One invocation emits multiple named variants from the
same base URL. Shared login + initial navigation; per-variant `steps`.
Use it when two or more snapshots differ only by a small DOM-state
change (e.g. dropdown closed vs open).

Plan file shape:

```json
{
  "targetPath": "/wp-admin/admin.php?page=wpforms-builder&form_id=401&view=settings",
  "variants": [
    {
      "slug": "builder-settings-confirmation-dropdown-closed",
      "steps": [
        { "click": ".wpforms-panel-sidebar-section-confirmation" },
        { "eval":  "document.querySelector('#wpforms-panel-field-confirmations-1-type').value='page';jQuery('#wpforms-panel-field-confirmations-1-type').trigger('change')" }
      ]
    },
    {
      "slug": "builder-settings-confirmation-dropdown-open",
      "steps": [
        { "click": ".wpforms-panel-sidebar-section-confirmation" },
        { "eval":  "document.querySelector('#wpforms-panel-field-confirmations-1-type').value='page';jQuery('#wpforms-panel-field-confirmations-1-type').trigger('change')" },
        { "click": "#wpforms-panel-field-confirmations-1-page-wrap .choices" }
      ]
    }
  ]
}
```

Run:

```bash
WP_URL=... WP_USER=... WP_PASS=... node capture/capture.js --variants ./plan.json
```

Between variants the page reloads to `targetPath` to reset state. Each
variant writes its own full `snapshots/<slug>/assets/` — no cross-variant
dedup (deferred).

Single-variant CLI `node capture.js <targetPath> <slug>` plus
`WP_STEPS`/`WP_CLICK`/`WP_WAIT_FOR` envs still works unchanged.
