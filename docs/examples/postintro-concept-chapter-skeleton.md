# Descriptor PostIntro Concept Skeleton (Secondary Path)

A normal video needs a topic-specific postIntro concept beat. This descriptor
example is secondary: use it only when descriptor verbs preserve the approved
visual transformation. The default copy target for richer postIntros is
`docs/examples/legacy-postintro-effect-skeleton.md`.

## Concept Brief

Fill this before writing chapter code:

```text
Problem:
Feature behavior:
Approved visual transformation:
Product truth used:
Animation surfaces:
  HTML:
  CSS:
  SVG:
  GSAP:
  Descriptor verbs:
Narration, one sentence:
Why this is not a second title card:
What would count as an unacceptable weaker substitute:
Custom animation surface needed:
Expected visual QC risk:
```

Working example: Checkboxes `one-answer-enough`

Route: `/scenes/player.html?video=a-complete-guide-to-the-checkboxes-field`

Relevant code: `runtime/cinematic-one-answer-enough.js`

```text
Problem: Radio buttons force one answer when the viewer may need several.
Feature behavior: Checkboxes let users select all answers that apply.
Approved visual transformation: A support form starts as radio buttons, the
second click displaces the first answer, then the form morphs into checkboxes
and multiple answers stay selected.
Product truth used: Real field semantics; editorial form objects are used only
for the concept beat before the WPForms UI walkthrough.
Animation surfaces:
  HTML: form card, option rows, marks, side chips, cursor wrapper
  CSS: radio mark, checkbox mark, selected/warning states, wave and sparks
  SVG: cursor pointer
  GSAP: card entrance, cursor movement, click compression, warning shake,
  radio-to-checkbox morph, multiple selected bursts
  Descriptor verbs: not enough for this specific morph; the canonical runtime
  cinematic proves the repo can do the richer animation
Narration, one sentence: Checkboxes are for every time one answer is not enough.
Why this is not a second title card: It demonstrates the limitation and the
solution before the tutorial names the field.
What would count as an unacceptable weaker substitute: showing the real
Checkboxes options panel while narration talks about selecting multiple answers.
Custom animation surface needed: Use the proven HTML/CSS/SVG/GSAP pattern from
the canonical cinematic, or build an equivalent approved video-local surface.
Expected visual QC risk: The morph, cursor timing, and final selected state may
need user review and one or two polish revisions.
```

## Descriptor Implementation When It Preserves The Transformation

Use descriptor verbs only when they can preserve the approved transformation.
This is acceptable for simple concept beats, but a real UI focus plus title text
is not enough when the storyboard approved an abstract animation.

```js
import { defineChapter } from '/runtime/chapter-api.js';

export default defineChapter({
  slug: 'postintro-concept',
  title: 'The idea',
  snapshot: 'builder-setup',
  chapter: 'postintro',
  breakStyle: 'hold',
  swapStyle: 'morph',

  prep: [
    { op: 'applyDefaultForm', formName: 'Event RSVP' },
    { op: 'removeBuilderCruft' },
  ],

  steps: [
    {
      id: 'name-the-problem',
      narration: 'postintro-problem',
      do: 'captionLine',
      text: 'Scattered details are hard to act on.',
      position: 'bottom-center',
      hold: 900,
    },
    {
      id: 'show-the-transformation',
      narration: 'postintro-transform',
      do: 'lineDraw',
      from: '[data-postintro-source]',
      to: '[data-postintro-payoff]',
      label: 'One clear path',
      hold: 1200,
    },
    {
      id: 'payoff',
      narration: 'postintro-payoff',
      do: 'animateText',
      text: 'Cleaner input. Better answers.',
      preset: 'rise',
      hold: 1000,
    },
  ],
});
```

Rules:

- Do not use a second title card as postIntro.
- Do not downgrade an approved concept to `focusPull`, `sectionTitle`, or
  `calloutLabel` on a loosely related UI surface.
- Do not copy product-specific cinematics for unrelated topics.
- Study `docs/postintro-patterns.md` for canonical HTML/CSS/SVG/GSAP examples.
- `builder-setup` is a real starter snapshot. Replace it with a more specific
  real captured snapshot when the concept beat needs one.
- If the approved concept needs HTML/CSS/SVG/GSAP, build that animation with an
  approved video-local surface or an approved reusable cinematic. The three
  canonical postIntros prove this repo can do it.
- Expect visual QC on ambitious postIntros. Revise timing, framing, morphs, and
  payoff states after the user reviews them.
