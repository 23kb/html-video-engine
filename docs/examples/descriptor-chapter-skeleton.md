# Descriptor Chapter Skeleton (Secondary Path)

This is **not** the default for new video work. New videos default to
legacy/effect-mode unless the approved beat is simple and the descriptor
vocabulary preserves the visual idea without weakening choreography or
postIntro.

Use this shape only when descriptor mode is sufficient. Selectors stay local;
product states are staged with `prep` / `after` ops.

```js
import { defineChapter } from '/runtime/chapter-api.js';
import sel from './_selectors/setup.js';

export default defineChapter({
  slug: 'setup',
  title: 'Set up the field',
  snapshot: 'builder-field-options-select',
  chapter: 'setup',
  breakStyle: 'soft-dolly',
  swapStyle: 'cover',

  prep: [
    { op: 'applyDefaultForm', formName: 'Customer Feedback' },
    { op: 'removeBuilderCruft' },
  ],

  // Use step-level narration for short beats. Keep each beat near 6 seconds.
  steps: [
    {
      id: 'select-field',
      narration: 'setup-select-field',
      do: 'clickOn',
      target: sel.dropdownField,
      openFieldOptions: 4,
      instruction: 'Select the field',
      fill: 0.52,
      postHold: 300,
    },
    {
      id: 'rename-field',
      narration: 'setup-rename-field',
      do: 'typeInto',
      target: sel.labelInput,
      text: 'How did we do?',
      clear: true,
      fill: 0.58,
      after: [
        { op: 'setFieldLabel', id: 4, label: 'How did we do?' },
      ],
    },
    {
      id: 'show-result',
      narration: 'setup-show-result',
      do: 'highlight',
      target: sel.previewField,
      label: 'The preview follows the real field state',
      hold: 1200,
      fill: 0.48,
    },
  ],
});
```

Do not use descriptor mode for a postIntro or chapter that needs custom
HTML/CSS/SVG editorial animation, timestamp-locked narration actions,
`waitAt(t)`, or mid-effect choreography inside one narration clip. Use the
legacy skeletons for those.
