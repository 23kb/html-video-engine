# Product truth — Entry Automation addon

> Source: https://wpforms.com/docs/entry-automation-addon/ (doc updated Jul 8, 2025; fetched 2026-07-22).
> Verified against live site: sullies-bakery, WPForms v2.0.0 Elite, `wpforms-entry-automation` active.

## Requirements

- Elite license level or higher. — SOURCE: doc "Requirements"
- WPForms core ≥ 1.9.6.1. — SOURCE: doc "Requirements"

## Where it lives

- Per-form: form builder → **Settings → Entry Automation** → `Add New Task` button (`.wpforms-builder-entity-connection-add`). — SOURCE: doc "Creating a New Automation Task"; snapshot `builder-settings-entry_automation` catalog
- Site-wide dashboard: **WPForms → Tools → Entry Automation** tab — table of forms with their tasks below each, **Last Run** column, checkbox + Bulk Actions + Apply for activate/deactivate. — SOURCE: doc "Managing Entry Automation"

## Task model

- Task creation: `Add New Task` → overlay asks for task name → OK. — SOURCE: doc
- Two task types: **Export Entries** and **Delete Entries**. — SOURCE: doc
- Unlimited tasks per form. Additional tasks default to **Run After Previous Task** (sequential); disabling it reveals the full Schedule form. Doc recommends keeping the default to avoid conflicts. — SOURCE: doc "Adding Multiple Automations"
- Reorder tasks by dragging the 2-vertical-line icon; order = run order. — SOURCE: doc
- Saved task shows **ACTIVE** status next to the task name (after saving the form). Copy icon clones a task with its config; Trash icon deletes (confirmation overlay; irreversible). — SOURCE: doc

## Export Entries options

- **File Name** — defaults to Form Name + Date Timestamp; supports smart tags via Smart Tag icon dropdown. — SOURCE: doc
- **File Format** — CSV, XLSX, JSON, PDF. (Doc has a typo "XLSL"; product means XLSX.) — SOURCE: doc "Exporting Form Entries"
- **Export To** — default **Email**; alternatives **FTP Server**, **Dropbox**, **Google Drive**. — SOURCE: doc
  - Email: Email Address field, defaults to Site Administrator Email smart tag; multiple addresses comma-separated. — SOURCE: doc
  - FTP Server: Host, Port, Username, Password, Path; **Test Connection** button → "Connection Established" or "Connection Failed" popup. — SOURCE: doc
  - Dropbox: requires Dropbox addon (install/activate prompt if missing) → Add New Connection → account dropdown → Dropbox Folder Name (defaults to form name). — SOURCE: doc
  - Google Drive: requires Google Drive addon → Continue with Google → Add New Connection → Google Account dropdown → Google Drive Folder: **Create New** (name field, defaults to form name) or **Select Existing** (folder picker button). — SOURCE: doc
- **If File Already Exists** (FTP/Dropbox/Drive only, not Email): **Increment File Name** (recommended by doc), **Overwrite File**, **Add Entries to File** (CSV + XLSX only; doc warns not to change Entry Information after first export — new fields won't be added to the existing file). — SOURCE: doc "Handling Existing Files"

## Entry Information section

- **Form Fields** checkbox list — choose which fields the export includes. — SOURCE: doc
- **Additional Information** — Entry ID, Entry Date, Payment Status, etc. — SOURCE: doc
- **Filter** — condition rows, e.g. "Any Field contains giveaway" exports only matching entries. — SOURCE: doc
- **Status** — include entries by status. — SOURCE: doc
- **Export** dropdown — **All Entries** (everything each run) vs **New Entries Since Last Export** (only entries since the task last ran). — SOURCE: doc

## Schedule section

- **Start Date** (datepicker), optional **End Date**. — SOURCE: doc
- **Frequency** — Days of the Week (day picker), Days of the Month (day-of-month picker), First Day of the Month, Last Day of the Month. — SOURCE: doc
- **Time** dropdown — when the task runs. — SOURCE: doc
- Runs on **WP-Cron** — fires on page load, not a system scheduler. — SOURCE: doc note

## Delete Entries options

- Filter section (conditions) + Status dropdown to scope what gets deleted; same Schedule model (defaults to Run After Previous Task when it's an additional task). — SOURCE: doc "Deleting Form Entries"
