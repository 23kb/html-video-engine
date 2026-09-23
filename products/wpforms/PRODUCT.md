# WPForms — product pack notes

WPForms is the default pack: a film with no `<meta name="film:product">` uses
it. The engine reads the pack's data from `brand/brand.json`,
`brand/tokens.css` and `pack.json`. This file holds the rules that apply to
WPForms films only. The shared manuals (`CLAUDE.md`, `AGENTS.md`) point here,
and the rulebook marks the same rules with Scope `wpforms`.

## Brand

- The primary colour is orange `#E27730` (`--wpf-orange`). Purple
  (`--wpf-ai-purple`, `#7A30E2`) is for AI features only. Never use purple as
  the primary brand colour.
- Write "WPForms" and "WPForms.com" with exactly that capitalisation in all
  rendered text.
- Use the real brand assets. Never redraw Sullie, the loading visuals or the
  AI 3-dot spinner. Read the brand usage doc and its anti-patterns before any
  brand work.
- Sullie is the official Sullie **with arms**: waist-up `assets/sullie.png` or
  its vector `assets/sullie-with-arms.svg`. The standing Sullie
  `assets/sullie-standing.png` is official too; pick per composition.
- Real template data comes from the templates API,
  `https://wpforms.com/templates/api/get/`. Fetch it directly.

## Where Sullie goes

- Ads: Sullie intro and outro lockups.
- Shorts: an animated Sullie sting and end card (`mountShortIntro` /
  `mountShortOutro` in `shorts-kit.js`). Never a static slide.
- Tutorials: Sullie inside the film (`mountBrandBug`). No intro or outro cards;
  the presenter bookends open and close the film.

## Tutorials: presenter bookends

A WPForms tutorial ships as a recorded Kacie intro, the HTML body and a
recorded Kacie outro, joined by `tools/stitch.js`. The recording spec is
`docs/kacie-intro-outro-recording-spec.md`; the flow is step 5b of the
`dev-advocacy-video` skill. The film itself starts at the postIntro and has no
intro or outro narration clips. Narration uses the Kacie voice (`brand.json`
`voice: KACIE` → `ELEVENLABS_VOICE_ID_KACIE`). Shorts have no presenter
bookends.

## WPForms-only code and data

All paths below are inside `products/wpforms/` unless they start with `docs/`
or `tools/` at the repo root.

- Interactions: `film/wpforms-interactions.js` (`WPFormsInteractions`),
  `film/wpforms-templates.js`, `film/builder-frontend-split.js`. Films reach
  them through the `videos/_shared/` shims too.
- Field-state inventory: `docs/wpforms-field-state-inventory.md` (132 KB).
  Query it with `node tools/field-state.js`; do not full-read it.
- Product truth per feature: `product-truth/<feature>.md`. Check it before any
  feature claim, metric or value goes on screen.
- Snapshot tools: `tools/` (trim-builder-markup, clean-builder-snapshot-canvas,
  trim-snapshot-fields). Sanitizers: `sanitize/`.
- The tutorial topic backlog (the "what video next" list) is
  `docs/ga4-video-priorities/` at the repo root; the `dev-advocacy-video` skill
  picks from it.
