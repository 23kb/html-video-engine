# Title Card Voice

Intro / outro shape, the `subtitleVariants` array, CTA tone, and what reads as on-brand vs corporate.

## The locked shape (`variant: "sullie-system"`)

Every shipping video uses the same intro/outro variant: a Sullie-themed title card with eyebrow + title + rotating subtitle + (outro only) CTA.

```jsonc
"intro": {
  "variant": "sullie-system",
  "eyebrow": "WPForms Tutorial",
  "title": "<Topic-Specific Title>",
  "subtitleVariants": [
    "<First subtitle line — short, value-led.>",
    "<Second subtitle line — different angle.>",
    "<Third subtitle line — payoff.>"
  ],
  "hold": 3
}
```

```jsonc
"outro": {
  "variant": "sullie-system",
  "eyebrow": "WPForms",
  "title": "<Closing brand-flavored line>",
  "subtitleVariants": [
    "<First closing line.>",
    "<Second closing line.>",
    "<Third closing line.>"
  ],
  "cta": "Build with WPForms",
  "hold": 3
}
```

Don't use the legacy `subtitle` (singular) field or `logo` field — those are pre-Phase-A shapes that don't match current production. The `legacy-manifest-skeleton.md` shape is canonical.

## Eyebrow

The eyebrow is the small uppercase line above the title. Two patterns:

- **`"WPForms Tutorial"`** — for tutorial videos.
- **`"WPForms"`** — for outros and ad-style videos.

Other eyebrows are possible but uncommon (`"WPForms Update"`, `"WPForms 2.0"`). Stick to the two above unless the video is explicitly a release or announcement.

## Title

The intro title:

- **Names the topic, not the lesson.** "Customize the Checkboxes field" not "How to learn to use the Checkboxes field tutorial."
- **Verb-led.** "Add validation," "Send notifications," "Build forms faster with WPForms AI." Title cards starting with a noun ("Checkboxes," "Notifications") are weaker but acceptable for field-name videos.
- **Short.** 4-8 words. Title fits on one line at the rendered font size; longer titles wrap awkwardly.

The outro title is more brand-flavored than topic-flavored:

- "Build clearer forms with WPForms"
- "Stay on top of every response"
- "Send the right message every time"

It's a one-liner that pays off the topic without naming it. Don't repeat the intro title.

## `subtitleVariants` (the rotating array)

The array has 3 lines. The runtime picks one to display. The viewer sees only one — you don't know which.

Each line:

- **6-10 words.**
- **Different angle from the others.** Not three rephrasings of the same thing. Each captures a distinct value.
- **Lower-case sentence case** (not Title Case).
- **No question marks.** Statements only.

**WRONG (three rephrasings):**
```js
[
  "Let visitors choose more than one answer.",
  "Allow viewers to select multiple options.",
  "Make it possible to pick more than one choice."
]
```

**RIGHT (three angles):**
```js
[
  "Let visitors choose more than one answer.",      // value angle
  "Turn a basic list into a clear visual choice.",  // craft angle
  "Keep longer choice lists easy to scan."          // problem angle
]
```

The first is "what it does," the second is "how it presents," the third is "why it matters." Three different beats.

## CTA (outro only)

The outro `cta` is action-led:

- "Build with WPForms" (most common)
- "Try Form Templates"
- "Create your first form"
- "Start with WPForms AI"

Rules:

- **Verb + 1-3 words.** Short.
- **Doesn't promise a free trial / discount / etc.** This is brand voice, not paid acquisition.
- **Doesn't use buzzwords.** "Unlock," "leverage," "supercharge" — no.
- **Matches video tone.** A tutorial outro CTA should feel like a calm next step, not a sales close.

## What's NOT on brand

- **Title Case Where Every Word Is Capitalized For Emphasis.** Sentence case only.
- **Exclamation marks.** Calm voice.
- **"Ultimate guide to..."** — never. Always "complete guide" if needed.
- **Emojis** in title or subtitle.
- **Marketing hyperbole:** "the most powerful," "industry-leading," "revolutionary." Plain language only.
- **Question titles:** "How do I add a field?" — say what the video does, don't ask. "Add a field with WPForms."

## `hold` (display duration)

`intro.hold: 3` and `outro.hold: 3` are the title card display duration in seconds. Most videos use `hold: 3`. Some longer cinematic-heavy videos use `hold: 7-7.5` (build-forms-faster-with-wpforms-ai uses `hold: 7.4`).

Hold longer when:
- The intro has a custom theme/animation that needs time to play out.
- The viewer should have time to read all three subtitle variants if they happen to play more than once.

Hold shorter (rare):
- Pure tutorial videos with no postIntro between intro and chapter 1, where the viewer is impatient to see the product UI.

## Themes

`intro.theme` and `postIntro.theme` accept:

- `backgroundCss: 'linear-gradient(...)'` — custom intro background gradient.
- `waveFill: '#XXXXXX'` — color of the decorative wave element.
- `accent: '#XXXXXX'` — accent color for theme elements.
- `background: 'cool-paper'` (postIntro only) — uses the cool-paper backdrop.

Tutorial videos usually omit `theme` and use defaults. Marketing-mode videos use custom themes (build-forms-faster-with-wpforms-ai uses a custom gradient `linear-gradient(to right, #C5796D, #DBE6F6)`).

## Subtitle / pill (optional)

`intro.pill` adds a small badge above or alongside the title. Used by build-forms-faster-with-wpforms-ai: `"pill": "Rough idea. Ready draft."` — captures the postIntro's transformation in one phrase.

Pills are optional. Use them when:
- The video's promise is a transformation that fits in 3-5 words.
- The intro animation has space for a small badge (some don't).

## Common mistakes

| Mistake | Fix |
|---|---|
| Three subtitle lines that rephrase the same idea | Three different angles (value / craft / problem / payoff) |
| Title in Title Case | Sentence case |
| 14-word outro CTA | Verb + 1-3 words |
| Subtitle ends with "...," — implies more | Complete the thought |
| Outro title repeats intro title | Outro is brand-flavored payoff, not topic-flavored |
| Eyebrow is a full sentence | Eyebrow is `"WPForms Tutorial"` or `"WPForms"` |
| `hold: 1` — title flashes by | Default 3; longer for cinematic intros |
| Pill is 8 words long | Pill is 3-5 words |

## Reference videos

Read the manifest of these videos to see strong intro/outro examples:

- `videos/a-complete-guide-to-the-checkboxes-field/manifest.json` — clean tutorial intro/outro.
- `videos/build-forms-faster-with-wpforms-ai/manifest.json` — custom themed intro with pill.
- `videos/form-entries-guide/manifest.json` — overview-tutorial intro/outro.

## See also

- `docs/examples/legacy-manifest-skeleton.md` — locked manifest shape.
- `docs/narration-writing.md` — voice rules for narration body.
- `docs/color-palette.md` — brand colors used in title themes.
- `wpforms-video` skill — manifest authoring context.
- `wpforms-marketing` skill — title cards in editorial / ad-style work.
