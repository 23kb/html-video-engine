# Product truth — WPForms anti-spam stack

Source: https://wpforms.com/docs/how-to-prevent-spam-in-wpforms/ (fetched live 2026-07-31, doc updated Sep 24 2024, author Umair Majeed).
Capture evidence: `products/wpforms/snapshots/builder-settings-anti_spam/` (builder Settings → Spam Protection and Security) + `products/wpforms/snapshots/admin-settings-captcha/` (WPForms → Settings → CAPTCHA, empty state).

## Where the settings live

- Form-level: form builder → **Settings → Spam Protection and Security** (`.wpforms-panel-sidebar-section-anti_spam`). Groups in the captured panel: **Protection** ("Behind-the-scenes spam filtering that's invisible to your visitors") and **Filtering**.
- Site-level CAPTCHA keys: **WPForms → Settings → CAPTCHA** tab (`admin.php?page=wpforms-settings&view=captcha`).

## Feature definitions (doc + captured UI)

| Feature | Definition (doc) | Captured control | Default |
|---|---|---|---|
| Modern anti-spam protection | Honeypot-technique multi-layer detection; invisible to visitors; requires JS on the site; form will not submit if a bot trips it | `#wpforms-panel-field-settings-antispam_v3` toggle, label "Enable modern anti-spam protection", tooltip "Turn on invisible modern spam protection." | ON by default |
| Store spam entries | Store spam in DB instead of blocking outright; review/recover false positives in the **Spam** section of the form's Entries page | `#wpforms-panel-field-settings-store_spam_entries` toggle | ON by default |
| Minimum time to submit | Reject submits faster than N seconds; user sees an error prompting them to wait | `#wpforms-panel-field-anti_spam-time_limit-enable` toggle + `#wpforms-panel-field-anti_spam-time_limit-duration` number input (captured value "2", suffix "seconds", min=1) | ON by default, 2 s |
| CAPTCHA | 4 options: reCAPTCHA, hCaptcha, Cloudflare Turnstile (all free w/ Lite), Custom Captcha (paid license) | `input[name="captcha-provider"]` radios: hcaptcha / recaptcha / turnstile / none (none checked in capture). Turnstile key rows `#wpforms-setting-row-turnstile-site-key` / `-secret-key` exist hidden until provider picked | none |
| Country filter | Allow or Deny entries from selected countries (Filtering group) | `#wpforms-panel-field-anti_spam-country_filter-enable` toggle → reveals action select (`-action`: Allow selected / Deny) + "entries from" + choices.js country multi-select + message field | OFF |
| Keyword filter | Block entries containing listed words/phrases, one per line | `#wpforms-panel-field-anti_spam-keyword_filter-enable` toggle → reveals message field + "Keyword Filter List" textarea container (tooltip: "Keywords that will be blocked if they are found in a form entry.") + Save Changes/Cancel actions | OFF |
| Akismet | Requires Akismet plugin; algorithmic flagging; separate doc | **NOT in capture** (no `settings-akismet` control — Akismet inactive on capture site) | — |
| Allowlist/Denylist | Email-address rules; separate doc; lives on the Email field's advanced options, not this panel | not on this panel | — |

## Video-scope rulings (5-layer framing)

Layers shown: (1) modern anti-spam, (2) minimum time to submit, (3) CAPTCHA — Turnstile featured, (4) country filter, (5) keyword filter. "Store spam entries" is presented as the safety net, not a layer. Akismet + allowlist/denylist are doc pointers only — no UI exists in the captures and fabrication is banned.

- Builder capture has **zero** CAPTCHA markup (no keys configured at capture) → the per-form "enable Turnstile" toggle CANNOT be shown truthfully; the CAPTCHA chapter ends on the settings page with a verbal pointer back to the builder panel.
- Turnstile demo keys typed on camera = Cloudflare's **official public test keypair** (site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`, documented at developers.cloudflare.com — always-pass test keys, safe to publish).
- Doc↔product divergence to flag: none found — doc structure matches captured UI. (Akismet toggle absence is capture-site state, not divergence.)
