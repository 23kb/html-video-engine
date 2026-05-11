# Klaviyo Addon Video — Capture Plan (2026-05-11)

For the upcoming Klaviyo addon tutorial. Based on the doc at
`C:\Users\PC\Desktop\klaviyo\Klaviyo Addon 5 - WPForms.pdf` (8 pages).

## WPForms-side snapshots (captured ✓)

These were captured against `sulliesbakery.com` where Klaviyo addon is
installed AND already connected (account: "Sullie Eloso", connected
2026-05-10).

| Slug | State | URL |
|---|---|---|
| `admin-settings-integrations` | Re-capture; Klaviyo accordion now present (closed, green Connected pill) | `/wp-admin/admin.php?page=wpforms-settings&view=integrations` |
| `admin-settings-integrations-klaviyo-open` | Klaviyo accordion expanded — shows "Sullie Eloso" account row + Disconnect link + "+ Add New Account" button | same |
| `admin-settings-integrations-klaviyo-form` | "Add New Account" clicked — connection form open with empty API Key + Nickname inputs and orange "Connect to Klaviyo" button | same |
| `builder-providers` | Re-capture; Klaviyo now in sidebar provider list | `/wp-admin/admin.php?page=wpforms-builder&view=providers&form_id=55` |
| `builder-providers-klaviyo` | Klaviyo sidebar entry active; right pane shows Klaviyo header. ⚠ "Add New Connection" pane content is not in DOM until you've added one — see TODO below | same |

Plans: `capture/plans/klaviyo-base.json`, `capture/plans/klaviyo-states.json`, `capture/plans/klaviyo-builder.json`.

## WPForms-side TODO captures

These need Klaviyo to have **at least one form connection** already saved
on a form. Connect Klaviyo to form 55 first via the WP admin, then capture:

| Slug | State | How |
|---|---|---|
| `builder-providers-klaviyo-connection-create` | Klaviyo connection settings panel, Action = Create / Update Profile, all fields visible (Email + List + Subscribe toggle + Custom Fields table) | Save a Klaviyo connection on form 55 with action "Create / Update Profile", re-capture |
| `builder-providers-klaviyo-connection-unsubscribe` | Same panel, Action = Unsubscribe | Save another connection with Unsubscribe, re-capture |
| `builder-providers-klaviyo-connection-remove` | Same panel, Action = Remove from List | Save another connection with Remove from List, re-capture |
| `builder-providers-klaviyo-nickname-modal` | Pop-up "Enter a connection nickname" modal | Triggered by clicking "Add New Connection" — needs a synthetic step in the capture plan to click and wait for the modal |

(Alternatively, the nickname-modal state can be reached via DOM
puppetry — it's a generic jconfirm dialog that the engine could fake.
But a real capture is preferred per the project's "real UI only" rule.)

## Klaviyo-side snapshots (NOT captured — needs your login)

These come from your Klaviyo account dashboard at https://www.klaviyo.com/.
Since Klaviyo is hosted externally (not on sulliesbakery), `capture.js`
would need your Klaviyo credentials + handle whatever 2FA Klaviyo uses.
Recommended path: capture these manually OR run `capture.js` with your
Klaviyo creds against the live Klaviyo dashboard.

| # | Slug | URL | Maps to PDF page |
|---|---|---|---|
| 1 | `klaviyo-dashboard` | `https://www.klaviyo.com/dashboard` (or `/`) | Page 2: Welcome, Sullie + sidebar |
| 2 | `klaviyo-dashboard-account-menu-open` | same; click bottom-left account name to open menu | Page 2: menu with What's new? / Billing / Settings / Log out / Legal |
| 3 | `klaviyo-settings-account` | `/settings/account` | Page 3: Settings page with Account tab + sub-sidebar (Personal/Organization/Users/Messaging/Domains/API keys/Activity log/Security/Tags/Testing) |
| 4 | `klaviyo-api-keys` | `/settings/account/api-keys` | Page 3: API Keys page — Public API Key section + empty Private API Keys section + "Create Private API Key" button |
| 5 | `klaviyo-api-keys-create-form` | `/settings/account/api-keys/new` (or modal opened from #4) | Page 3: Create Private API Key form — Name input + Select Access Level radios (Custom / Read-Only / Full Access) + API Scopes table |
| 6 | `klaviyo-api-keys-private-confirmation` | post-create state | Page 4: Private API Key Confirmation dialog showing the key with copy + download icons |

### Suggested capture command (Klaviyo)

If your Klaviyo account doesn't enforce 2FA on the login form, the
existing `capture.js` should work with new env vars:

```bash
WP_URL=https://www.klaviyo.com \
WP_USER=<your-klaviyo-email> \
WP_PASS=<your-klaviyo-password> \
node capture/capture.js --variants capture/plans/klaviyo-external.json
```

But `capture.js` is hard-coded for WP login form selectors. It would need
a small refactor for Klaviyo's login form. Cleaner alternative: use the
browser dev tools "Save as Web Page Complete" on each Klaviyo screen
(loses some interactivity but preserves visual fidelity), or use Chrome's
`SingleFile` extension for cleaner output.

Send me the captured HTMLs and I'll wire them into the snapshot pipeline
(strip sensitive bits, generate catalogs, register in `snapshots/index.json`).

### Sensitive content note

The Klaviyo dashboard shows:
- **Real revenue numbers** ($59.96 in the PDF — sullies bakery's actual)
- **Real Sullie's Flowers account name + email** (sullie@wpforms.com)
- **A real API key** in the confirmation screen

`capture.js` already strips a set of secret patterns (Stripe, Google API,
AWS, GitHub, Slack). Klaviyo's `pk_` API keys are NOT in that list. Add
this to the sanitizer when capturing Klaviyo screens:

```js
{ name: 'klaviyo-pk', re: /pk_[a-zA-Z0-9]{40,}/g },
```

And manually scrub the revenue + customer email after capture if those
shouldn't leak into the snapshot.

## Recommended Wave 2 interactions (Klaviyo)

Once the snapshots above are captured, these are the canonical
interactions for the addon video:

### WPForms-side
- `expandIntegrationProvider(slug)` — open the Klaviyo accordion in Settings → Integrations
- `clickAddNewProviderAccount(slug)` — click "Add New Account" → connection form
- `fillProviderConnectionForm(slug, { apiKey, nickname })` — type into both fields
- `clickConnectProvider(slug)` — click the orange "Connect to Klaviyo" button → connected state
- `selectMarketingProvider('klaviyo')` — in form builder Marketing panel, click Klaviyo
- `clickAddNewConnection()` — top-right "Add New Connection" button
- `fillConnectionNickname(name)` — types into the nickname modal + clicks OK
- `setKlaviyoAction(action)` — dropdown selector for Create/Update Profile / Unsubscribe / Remove from List
- `setKlaviyoEmailField(fieldId)` — map the Email dropdown to a form field
- `setKlaviyoList(listSlug)` — pick a Klaviyo list from the dropdown
- `toggleSubscribeToMarketing(on)` — flip the marketing toggle
- `addKlaviyoCustomFieldMapping({ klaviyoField, formField })` — add a row to the Custom Fields table

### Klaviyo-side
- `openKlaviyoAccountMenu()` — click bottom-left account → menu expands
- `navKlaviyoSettings()` — click "Settings" in account menu
- `navKlaviyoApiKeys()` — click "API keys" in left sidebar
- `clickCreatePrivateApiKey()` — opens the create form
- `fillApiKeyName(name)` — types into Name field
- `selectAccessLevel(level)` — clicks Custom / Read-Only / Full Access radio
- `clickCreateApiKey()` — top-right Create button → confirmation
- `copyPrivateApiKey()` — visual click on the copy icon next to the key

## File map for this round

```
docs/klaviyo-capture-plan-2026-05-11.md          # this file
capture/plans/klaviyo-base.json                  # admin-settings-integrations re-capture
capture/plans/klaviyo-states.json                # Klaviyo expanded + connection form
capture/plans/klaviyo-builder.json               # builder-providers + builder-providers-klaviyo
snapshots/admin-settings-integrations/           # re-captured (now has Klaviyo)
snapshots/admin-settings-integrations-klaviyo-open/      # NEW
snapshots/admin-settings-integrations-klaviyo-form/      # NEW
snapshots/builder-providers/                     # re-captured (now has Klaviyo)
snapshots/builder-providers-klaviyo/             # NEW
snapshots/index.json                             # +3 entries (now 85)
```
