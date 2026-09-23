# Product truth — Form Analytics (WPForms 2.0)

**Source:** addon doc URL `https://wpforms.com/docs/form-analytics-addon/` **404s as of 2026-07-13** (feature too new; site search surfaces no addon doc). Everything below is derived from the captured UI (`snapshots/form-analytics-main` + siblings) during the fa-retest run. Definitions marked **UNVERIFIED** are UI-label-derived semantics — verify against the internal doc before quoting in published narration.
**Verified by:** nobody yet — Umair to confirm on return.

## Availability

- Paid feature: Lite shows locked analytics columns + upgrade modal (`admin-forms-overview-lite-upgrade-modal` index entry). Exact tier naming **UNVERIFIED** (narrations say "WPForms Pro").

## Surfaces

- **All Forms columns** (`admin-forms-overview-analytics`): Views, Interactions, Conversion — per form, sortable, column-picker managed (`analytics_views` / `analytics_interactions` / `analytics_conversion`). Clicking a value navigates to `admin.php?page=wpforms-analytics&form_id=<id>`.
- **Per-form analytics page** (`form-analytics-main`): form switcher ("Select Form"), date-range button (`#wpforms-datepicker-popover-button`, default "Last 30 days"; presets Today / Yesterday / Last 7 / 30 / 90 days / Last 1 year / Custom + Apply), Export CSV (`.wpforms-analytics-export-csv`), Print Report (`.wpforms-analytics-print`), Ask WPForms AI modal (`#wpforms-ai-chat-modal`, sparkle FAB).

## The five metrics (stat cards, `data-card` values)

| Card (`data-card`) | Label | Definition | Status |
|---|---|---|---|
| `views` | Views | How many times the form was seen/rendered | **UNVERIFIED** (label-derived) |
| `interactions` | Interactions | Visitors who started engaging with fields | **UNVERIFIED** |
| `conversion-rate` | Conversion Rate | Share of views that became submissions | **UNVERIFIED** |
| `abandonments` | Abandonments | Started the form, left without submitting | **UNVERIFIED** |
| `errors` | Errors | Validation errors hit by visitors | **UNVERIFIED** |

## Conversion goal

- "Set Goal" link on the Conversion Rate card → popover with % input (`.wpforms-analytics-goal-input`) + Save Changes.
- Saved state: `.wpforms-analytics-goal` + `.wpforms-analytics-goal-met` (green above-goal arrow) + edit link "Goal: N%" (`data-goal` attr). Captured at 25% on form 406.

## Field-level table (`#wpforms-analytics-field-table`)

Columns: Name / Type / Views / Interactions / Abandonments / Errors / Avg. Time (m:s). Abandonments + Errors cells show `count / rate%`. Sortable (datatable) + "Reset Order".

## Known data caveat

Seeded analytics on sulliesbakery.com are physically implausible (Interactions 16,607 vs Views 1,310 in the 30-day window; recorded upstream issue, FIX-14 stopped) — fine for UI display, never narrate them as realistic.
