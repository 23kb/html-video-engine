# Prompt — Builder ⇄ Frontend split-screen tutorial

For tutorial videos where the **builder is on the left** and the **published frontend mirrors changes on the right** in real time. Uses `BuilderFrontendSplit` from `videos/_shared/builder-frontend-split.js`.

Use this kind when: tutorial about a single field (Checkbox, Date/Time, Rating…), and you want viewers to see the option change AND its effect on what the visitor sees, both at once.

---

## How to use this file

1. Copy the **Template** block below.
2. Replace every `{ALL_CAPS}` token with the specific field / IDs / slug for your tutorial.
3. Paste it as the first message in a fresh Claude or Codex session.
4. (Optional) Adjust the storyboard bullets for the specific options you want to demonstrate.

---

## Template

```
Make a tutorial video about the {FIELD_NAME} field in WPForms. Slug: {video-slug}.

Architecture: clone videos/_examples/builder-frontend-split-skeleton/ → videos/{video-slug}/.
Use BuilderFrontendSplit from videos/_shared/builder-frontend-split.js — DO NOT reinvent.

Surface plan:
- Left: builder snapshot snapshots/builder-field-options-{TYPE}/.
- Right (faded in at beat 3): snapshots/frontend-published-form/, isolated to field IDs [{IDS}].

Storyboard (~60-90s):
1. Open on builder centered. Cursor settles. Narration: "Let's set up a {FIELD_NAME} field."
2. Cursor clicks the {FIELD_NAME} field on the canvas → field options panel opens.
3. await split.fadeInFrontend('frontend-published-form'); then
   split.isolateFrontend([{IDS}]); — frontend pane slides in showing only this field.
4. General tab walkthrough — cursor edits Label, toggles Required, edits Placeholder,
   maybe edits choice labels / adds a choice / changes Layout. Each change MIRRORS
   to the frontend automatically (no manual setFieldState calls — the auto-bridge does it).
   Hold each beat ~2-3s with narration.
5. Click Advanced tab. Cursor walks 1-2 advanced options (e.g. choice layout,
   choice limit, default value, randomize) — same auto-mirror.
6. Camera pans to the frontend pane. Cursor demonstrates filling the field
   (clicking a choice, etc.) — Capability A handles native behavior.
7. await split.fadeOutFrontend(); builder returns to center. Outro card.

Field-specific config (edit videos/{video-slug}/index.html):
- TUTORIAL_FIELD.builderSlug = 'builder-field-options-{TYPE}'
- TUTORIAL_FIELD.frontendFieldIds = [{IDS}]

Constraints (standing — repeat in case CLAUDE.md isn't in context):
- Single-HTML path (NOT chapter/manifest legacy).
- No edits to runtime/* or engine/*.
- No visual QC from you — I QC.
- Storyboard gate first if narration is non-trivial (per wpforms-video skill).
- Use motion-primitives Cursor for all cursor work, gsap.timeline for sequencing.
- Mirror happens automatically — only call split.setFieldState(...) for
  effects you want WITHOUT a corresponding builder click (e.g. show a state
  before the cursor demonstrates it).

Required reading before authoring:
- .claude/skills/wpforms-video (Skill tool, not file-read)
- .claude/skills/wpforms-primitives (file-read OK)
- .claude/skills/wpforms-gsap-rules (file-read OK)

Deliverable:
- videos/{video-slug}/index.html
- videos/{video-slug}/storyboard.md
- videos/{video-slug}/narration/*.txt + rendered *.mp3
- Static-check pass: lint-determinism, validate-video.

Plus a review URL: http://localhost:4321/videos/{video-slug}/index.html
```

---

## Filled example — Checkbox field

```
Make a tutorial video about the Checkbox field in WPForms. Slug: checkbox-field-tutorial.

Architecture: clone videos/_examples/builder-frontend-split-skeleton/ → videos/checkbox-field-tutorial/.
Use BuilderFrontendSplit from videos/_shared/builder-frontend-split.js — DO NOT reinvent.

Surface plan:
- Left: builder snapshot snapshots/builder-field-options-checkbox/.
- Right (faded in at beat 3): snapshots/frontend-published-form/, isolated to field IDs [7].

Storyboard (~75s):
1. Open on builder centered. Cursor settles near the canvas Checkbox field.
2. Cursor clicks the Checkbox field → field options panel opens.
3. fadeInFrontend + isolateFrontend([7]). Frontend slides in showing only
   "First Choice / Second Choice / Third Choice".
4. General tab:
   - Edit Label → "Pick your favorites" (frontend label updates live)
   - Toggle Required (asterisk appears on frontend)
   - Edit Choice 1 label "First Choice" → "Apples" (frontend updates)
   - Click + to add a 4th choice (new li appears on frontend)
   - Change Choices Layout to 2-columns (frontend reflows)
5. Click Advanced tab:
   - Toggle "Show values" or Choice Limit (frontend reflects)
   - Set Default to Choice 2 (frontend pre-checks Apples)
6. Camera pans to frontend. Cursor clicks each checkbox (Capability A native behavior).
7. fadeOutFrontend; builder returns to center. End card.

Field-specific config:
- TUTORIAL_FIELD.builderSlug = 'builder-field-options-checkbox'
- TUTORIAL_FIELD.frontendFieldIds = [7]

[constraints + deliverables as in template above]
```

---

## Frontend field-ID reference

For setting `TUTORIAL_FIELD.frontendFieldIds`, these are the field IDs in `snapshots/frontend-published-form/`:

| Field type | IDs |
|---|---|
| name | 1 |
| email | 2 |
| text (single-line) | 3 |
| textarea | 4 |
| select (dropdown) | 5 |
| radio | 6 |
| **checkbox** | **7** |
| number | 8 |
| number-slider | 9 |
| phone | 10, 11, 17 |
| hidden | 12 |
| richtext | 14 |
| address (US) | 15, 16, 38 |
| payment-single | 18 |
| payment-checkbox | 19 |
| payment-multiple | 20 |
| payment-select | 21 |
| paypal-commerce | 22 |
| stripe-credit-card | 23 |
| payment-total | 24 |
| likert_scale | 25 |
| net_promoter_score | 26 |
| content | 27 |
| html | 28 |
| divider | 29 |
| file-upload (modern) | 30 |
| file-upload (classic) | 31 |
| signature | 35 |
| rating | 36 |

For builder slug, the pattern is `builder-field-options-<TYPE>` — e.g. `builder-field-options-checkbox`, `builder-field-options-date-time`, `builder-field-options-payment-fields`. Confirm a snapshot exists with `ls snapshots/ | grep builder-field-options-` before authoring.
