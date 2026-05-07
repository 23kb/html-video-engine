# `docs/surfaces/` — Historical (pre-refactor planning)

> **Status: HISTORICAL.** This directory was started for a planned
> "systematically inventory every WPForms admin surface" project that
> got partially executed (one file: `builder-settings-notifications.md`)
> then superseded by `docs/wpforms-field-state-inventory.md` as the
> canonical inventory pattern.
>
> The governance docs `builder-settings-notifications.md` references
> (`docs/phase-7-source-driven-surface-inventory.md`,
> `docs/phase-7-snapshot-refresh-builder-settings-notifications.md`) no
> longer exist in the repo.

## What's here

- `builder-settings-notifications.md` — 532-line draft inventory of the
  WPForms Form Builder → Settings → Notifications surface. Contains real
  product-truth content (DOM selectors, state transitions, payoff truth
  per control) that is **NOT covered** in the canonical
  `docs/wpforms-field-state-inventory.md` (which has 0 mentions of
  "notifications" as of 2026-05-07).

## How to use it

- **Read on demand only when working on a Notifications-specific video**
  (e.g. `form-notifications`).
- **Do not extend this directory.** New surface inventory work goes into
  `docs/wpforms-field-state-inventory.md` (queried via
  `node tools/field-state.js`).
- Long-term: harvest the unique notifications content from
  `builder-settings-notifications.md` into the canonical inventory. Not
  blocking; tracked as backlog.

## Why this directory still exists

Deleting it would lose unique notifications surface content. Harvesting
it requires editorial work that wasn't urgent for the refactor. Marked
historical via this README until someone migrates the content.
