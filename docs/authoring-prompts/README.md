# Authoring Prompts

Reusable prompt templates for kicking off a new video session with Claude (or a fresh Codex run). Each file in this folder is a **copy-paste-then-fill-the-blanks** brief — not a finished doc, not narrative.

## Index

| File | Use when |
|---|---|
| [builder-frontend-split.md](builder-frontend-split.md) | Single-field tutorial where the builder is on the left and the published frontend mirrors changes on the right. Uses `BuilderFrontendSplit` from `videos/_shared/builder-frontend-split.js`. |
| [klaviyo-addon-tutorial.md](klaviyo-addon-tutorial.md) | Full how-to for the Klaviyo addon (admin → Klaviyo dashboard → admin → builder → profile result). Concrete prompt, ~125-150s, single-HTML. Not parameterized — paste and go. |

## TODO — expand the catalog (later)

We need prompt templates for the other video kinds too. Each should follow the same shape: surface plan → storyboard skeleton → field-/feature-specific config → standing constraints → deliverables → review URL.

Kinds to draft (rough list — adjust as we go):

- **Single-surface tutorial** (builder only, no frontend) — most tutorials in `videos/` today.
- **Single-surface frontend demo** (frontend only, no builder) — for "what the visitor sees" hero shots, marketing flavor.
- **Settings-panel walkthrough** (no fields canvas, just builder settings tabs — covers handoffs 5/6 surface).
- **AI builder demo** (`wpforms-ai-builder-empty` → `-feedback-generated` swap).
- **Marketing / ad-style editorial** (no real UI, motion-heavy, clone from `reference/html-templates/`).
- **Multi-field tutorial** (chains several fields without losing the thread — e.g. "build a contact form from scratch").
- **Integration / addon walkthrough** (admin Integrations connect flow + builder provider panel; pairs with handoff-7 work).
- **PostIntro / cinematic concept beat** (per `wpforms-postintro` skill — usually the first 8-15s of a tutorial).

## TODO — wire CLAUDE.md and friends (later)

Once we have 3-5 templates here, wire discoverability so Claude reaches for the right template automatically:

- Add a section to root `CLAUDE.md` pointing at `docs/authoring-prompts/README.md` from the "Pick your path FIRST" table — one column "Suggested prompt template".
- Add an entry to `docs/INDEX.md` so it shows up in the one-line-per-doc index.
- Optionally extend `tools/skill-context.js` so the startup context dump mentions the prompt-templates folder.
- Consider adding `authoring-prompts` discovery to the `wpforms-video` skill so it surfaces during intake.

Right now this folder is unwired — finding it requires knowing the path. That's fine for v0; revisit once we have a critical mass of templates.

## Guidelines for new templates

- **Filled-in example at the bottom.** Every template ends with at least one concrete fill (e.g. a Checkbox example). Easier to adapt than a blank Mad Lib.
- **Standing constraints repeated.** No edits to `runtime/*` / `engine/*`, no visual QC from Claude, deterministic-safe, etc. Don't trust the global CLAUDE.md to be loaded — re-state in the prompt.
- **Point at the helper, not the implementation.** "Use `BuilderFrontendSplit`" not "instantiate two IframeManagers and bridge messages". The helper should hide the plumbing.
- **Required-reading list.** Which skills to load before authoring. Saves a round trip.
- **Deliverable bullet list.** Files expected, validations to run, review URL to share.
