# Product truth — Exporting form entries

Source doc: https://wpforms.com/docs/how-to-export-form-entries-to-csv-in-wpforms/
(fetched live 2026-08-24; author Umair; modified 2026-05-26).
Capture evidence: `snapshots/admin-tools-export`, `snapshots/admin-entries-list`,
`snapshots/admin-entries-overview`, `snapshots/admin-entry-detail`.

## Definitions (doc-sourced)

- **Bulk export**: WPForms → Tools → Export tab → Export Entries. Pick a form,
  choose fields / additional info / options / filters, click Download Export File.
  Download starts immediately (browser Downloads folder).
- **Form Fields**: all fields included (checked) by default; uncheck to exclude.
- **Payment Fields section**: renders only when the exported form is a payment
  form (doc: "If the form you're exporting its entries is a payment form,
  you'll likely see the Payment Fields section").
- **Additional Information**: Entry ID, Entry Date, Entry Notes, Type, Viewed,
  Starred, User Agent, User IP, Unique Generated User ID, Payment Status,
  deleted-fields data, Geolocation Details, Dropbox Links, Google Drive Links,
  User Journey — addon-gated rows only appear with their addon active.
- **Export Options**: "Export in Microsoft Excel (.xlsx)" checkbox (unchecked =
  CSV). "Separate dynamic choices into individual columns" appears only for
  multiple-choice fields with multi-select entries (capture: present but
  `wpforms-hide`).
- **Custom Date Range**: flatpickr range input; only entries submitted inside
  the range export.
- **Status section**: only shows when the form has Partial / Spam / Abandoned
  entries (capture: `wpforms-hidden`, empty choices — matches a form with only
  Published entries).
- **Search filter**: field selector (Any form field / Entry ID / Entry Notes /
  IP Address / User Agent) + comparison (contains, does not contain, is,
  is not, is empty, is not empty) + term. Exports only matching entries.
- **Single-entry export**: WPForms → Entries → open form → View an entry →
  right-sidebar **Actions** list → Export (CSV) or Export (XLSX). Both links
  confirmed in `admin-entry-detail` capture.

## Divergences found while building the video (TELL UMAIR)

1. **"Entries subtab" (doc) vs captured UI.** The doc says: Tools → Export tab
   → "click the Entries subtab." The captured Tools → Export page
   (WPForms 2.0.x fixture site, snapshot `admin-tools-export`) has **no
   Entries subtab** — Export Entries, Export Forms, and Export a Form Template
   are three sections on one page. Either the doc describes a newer build than
   the capture, or the subtab wording is stale. Video narration says "the
   Export tab" only, which is true on both.

## Fixture facts used by the video

- Form: **Entries Fixture** (form_id 32 in the export dropdown), fields
  Name / Email / Paragraph Text — same form shown by `admin-entries-list`
  (5 entries: Sarah Mitchell, Daniel Cooper, Priya Shah, Marcus Lee,
  Emily Carter) and `admin-entry-detail` (Sarah Mitchell, Entry 5 of 5).
- Search-term story uses "catering" — grounded: Sarah Mitchell's message reads
  "I would like more information about your catering options."
