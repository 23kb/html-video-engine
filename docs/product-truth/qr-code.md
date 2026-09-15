# Product truth — QR Code setting (WPForms 2.0.1)

Source: `Creating a QR Code for Your Form` doc (published 2026-08-20, author Umair
Majeed, reviewed David Ozokoye) + plugin source read 2026-08-21
(`src/Admin/Builder/Settings/QrCode.php`, `src/Pro/Admin/Builder/Settings/QrCode.php`,
`assets/js/admin/builder/modules/settings-qr-code.min.js`,
`assets/css/builder/builder-panels.min.css`). Verified live on sulliesbakery
(elite license, WPForms 2.0.1).

## Claims that may appear on screen

| Claim | Truth source |
|---|---|
| Lives in the form builder: **Settings » General**, below Submit Button Processing Text | doc §Setting Up + capture |
| Dropdown options: **None** (default) / **Page** / **Custom URL** | `DESTINATIONS` const + doc |
| The code points at a **page or URL**, not the form itself (forms have no URL of their own outside Conversational Forms / Form Pages) | doc FAQ 1 |
| **Destination Page** lists published pages only, searchable (choices.js AJAX) | doc note + PHP `get_pages()` (`post_status === 'publish'`) |
| **Logo**: None / WPForms (default) / Custom Logo — custom requires **Pro license or higher** (pro/elite/agency/ultimate) | `LOGO_LICENSES` + doc note |
| **Generate QR Code** → spinner → green check → finished code in preview | data-state CSS: generating/success/generated |
| After generating: **Copy** and **Download** replace Generate; both offer **PNG Image** / **SVG Vector** | doc + captured markup |
| PNG = websites, emails, documents; **SVG = resize to any size without blur — posters, banners** | doc §Copying and Downloading |
| Download filename: **wpforms-qr-code** | builder strings `file_name` |
| "A QR code is a picture of a link. The destination is built into the pattern at the moment you generate it." | doc §Updating — verbatim |
| Changing destination later → preview fades, refresh icon, **Regenerate QR Code** replaces Copy/Download (stale guard) | doc + data-state="stale" CSS |
| Changing the **logo** does NOT require regenerating — preview updates right away; already-downloaded files keep the old logo | doc §Updating |
| Codes **never expire** — works as long as the destination does | doc FAQ |
| Printed codes can't be re-pointed — destination is part of the pattern; reprint, or point at an address you control and redirect | doc FAQ 2 |
| The setting adds **nothing visible to the form** and doesn't affect entries | doc FAQ last |
| Requires WPForms **2.0.1** or higher | doc intro |
| Rendered client-side by bundled qr-code-styling v1.9.2, **SVG type**, WPForms logo asset `qr-code-logo.svg` (Sullie mark) | JS module + `LIBRARY_VERSION` |

## Traps for film claims

- Do NOT say "links to your form" — it links to the page/URL the form lives on (FAQ 1 phrasing: "opens a page or a web address that you choose").
- Do NOT show a code re-pointing after print — the truthful story is the STALE flag + Regenerate + reprint.
- Do NOT put Copy-to-clipboard on screen claiming it works everywhere — fine to show (production https renders it; our capture note in `snapshots/builder-settings-general/fragments/README.md` explains the http artifact).
- The Logo control on lower licenses is a locked control (education class) — our capture is elite, full control. Don't show the locked state as the normal state.
- The captured SVG encodes `http://sulliesbakery.com/bakery-favorites-survey/` — beats must not claim it encodes anything else.
