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

## 8. Querying the test site — `tools/site-eval.js`

For any WP-side question (option values, table counts, plugin state), use the
wp-cli wrapper — never reconstruct the 4-path invocation by hand, and never
`wp db query` (broken on LocalWP/Windows; `eval` works):

```bash
node tools/site-eval.js "echo wpforms()->version;"
node tools/site-eval.js "print_r(get_option('wpforms_providers'));" --site sullies-bakery
```

Site paths/credentials live in `tools/sites.json`; the phar is vendored at
`tools/vendor/wp-cli.phar`. Pre-capture health check: `node tools/preflight-site.js`.

### Staging writes — `--as-admin`, then read the value back

wp-cli boots with **no current user**. A WPForms write API runs a capability
check, fails it, and returns `false` — which is indistinguishable from "wrote
nothing because nothing needed writing". A staging script that trusts the
return value reports success and sends you off to capture the wrong field
state (rf 8).

```bash
node tools/site-eval.js "\$f = wpforms()->obj('form')->get(1779, ['content_only' => true]); ..." --as-admin
```

Two rules, both cheap:

1. **`--as-admin`** on any call that writes (it runs `wp_set_current_user(1)` first).
2. **Assert on a read-back, never on the return value.** `current_user_can()`
   was measured `false` even in the run where the write succeeded, so the
   pre-flight capability check is not trustworthy either — only re-reading the
   stored value is.

Credential precedence gotcha: `WP_URL` / `WP_USER` / `WP_PASS` in the
environment **override** `--site`, so a stale `.env` silently redirects a
capture at a different host and the failure reads as "login is broken".

### Frontend captures — strip the theme, every time

A frontend capture is a shot of the FORM, not of the website around it. The
first ranking batch shipped a page carrying banner, nav twice (including every
test page), two search boxes, a sidebar, a footer, the `Please enable
JavaScript` notice, and an admin-only **Edit Form** link that no visitor ever
sees — a truth defect (rf 9). `capture-gates.js` G7 now WARNs on all of it, but
the WARN is a backstop; the strip belongs in the plan.

Paste this into the `steps` of any frontend variant and adjust the selectors to
the theme:

```json
{ "eval": "['header','nav','.site-header','#masthead','.main-navigation','#site-navigation','form[role=\"search\"]','.search-form','#secondary','.widget-area','aside','footer','.site-footer','#colophon','#wpadminbar','.post-edit-link','.wpforms-form-edit-link'].forEach(function(s){document.querySelectorAll(s).forEach(function(n){n.remove();});});document.body.style.margin='0';", "settle": 400 }
```

Capture the same form on more than one surface and the strip steps must be
**identical**, or the two captures are not comparable and any morph between
them jumps.

### Coverage — enumerate state × surface, not state

Layout is a per-surface property. The builder canvas and the published form
render the same `input_layout=grid` from different markup under different CSS,
so a capture named `-grid` satisfies a quick read of a "List vs Grid" beat while
covering only one of the two surfaces the beat needs (rf 23 — nine snapshots
existed and none showed the published form in grid).

When the snapshot plan lists a state, list it once per surface it appears on.

### Two capture facts that cost a round each

- **Script tags never survive.** Capture strips every `<script>`, including
  `<script type="application/json">`. Park extracted state on an attribute
  (`<body data-wpf-charts='…'>`) — attributes survive.
- **`waitFor` needs a *rendered* selector.** The wait is visibility-based, so a
  boxless element (a script tag) can never match and fails open with
  `⚠ waitFor selector not found — continuing anyway`. Equally, never put a
  universal selector (`body`) in a `waitFor` list: it matches instantly and
  voids the wait for everything after it.

## 9. SaaS dashboards + JS-styled admin pages — the SingleFile-download recipe

`capture/capture.js` is WP-login-only, and ANY network channel out of an
authenticated third-party page correctly trips the exfil guard (SendGrid R3,
2026-07-03 — receiver, PNA probe, and encoded-chunk routes all blocked). The
sanctioned shape keeps the browser half human/agent-in-browser (FIX-11 —
do not automate the browser side).

### Primary path (fix-round B1, ccs 4): SingleFile manual save

For JS-styled third-party admin pages (WPCode-class: CSSOM/JS-injected rules
that no static serializer sees), the **SingleFile browser extension's manual
save beat the automated capture** (ccs 3: CSSOM inlined, admin bar preserved,
clean live-vs-capture diff 16/255). The whole flow:

1. **In the tab** (human/agent-in-browser): SingleFile → Save page. The file
   lands in `~/Downloads`.
2. **Package it:**
   ```bash
   node tools/capture-saas.js <slug> --from-download <file> --expect "<string unique to the page>"
   ```
   `--expect` is REQUIRED (or explicit `--no-expect`) — the tool fails loudly
   when the download isn't the page you think it is (mp 1: the same stale
   download was packaged three times because Chrome blocks repeated automatic
   downloads and "newest .html" silently re-ingested). The tool also refuses
   byte-identical re-ingests under a different slug, strips SingleFile's
   restrictive CSP `<meta>`, appends missing `</body></html>`, inlines
   CORS-blocked CDN stylesheets + fonts as data URIs, re-runs redaction
   (built-in secret catalog + `--redact <regex>`), and runs post-capture.

### Fallback: the console serializer (copy-paste-run — no editing needed)

When SingleFile isn't available, paste this into the authenticated tab's
console AS-IS (no slug/redact editing — the ingest tool owns both via its
flags). It works on a CLONE — freezes input state, inlines readable
same-origin CSS from the CSSOM, strips scripts — then triggers a normal
browser **download** (local disk, no off-page channel):

```js
(async () => {
  const doc = document.documentElement.cloneNode(true);
  const live = document.querySelectorAll('input, textarea, select');
  const clone = doc.querySelectorAll('input, textarea, select');
  live.forEach((el, i) => {
    const c = clone[i]; if (!c) return;
    if (el.type === 'checkbox' || el.type === 'radio') { el.checked ? c.setAttribute('checked', '') : c.removeAttribute('checked'); }
    else if (el.tagName === 'SELECT') { [...el.options].forEach((o, j) => { if (o.selected && c.options[j]) c.options[j].setAttribute('selected', ''); }); }
    else c.setAttribute('value', el.value);
    if (el.tagName === 'TEXTAREA') c.textContent = el.value;
  });
  for (const sheet of document.styleSheets) {
    let rules; try { rules = [...sheet.cssRules]; } catch { continue; }   // cross-origin stays a <link>
    if (!sheet.href) continue;
    for (const l of doc.querySelectorAll('link[rel="stylesheet"]')) {
      if (l.href === sheet.href) {
        const s = document.createElement('style');
        s.setAttribute('data-origin', sheet.href);
        s.textContent = rules.map((r) => r.cssText).join('\n');
        l.replaceWith(s);
      }
    }
  }
  doc.querySelectorAll('script').forEach((s) => s.remove());
  const html = '<!doctype html>\n' + doc.outerHTML;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = 'saas-capture.html';
  document.body.appendChild(a); a.click(); a.remove();
})();
```

Then package with the same `capture-saas.js --from-download --expect` command
as above. ⚠ Chrome blocks repeated automatic downloads from an origin after
the first — if you re-run the snippet, VERIFY a new file actually landed
(the `--expect`/byte-identity asserts catch it when you don't).

**Blocked-route fallback ladder** (when a DOM-extraction route is blocked, try
the next rung before abandoning real UI): DOM-serialize (this recipe) →
OS-level screenshot (rendered pixels, key visually redacted) → honest
editorial interlude. Never tunnel authenticated DOM through network
side-channels — that IS the pattern the guard exists to stop.
