# Legacy Manifest Skeleton

Default copy target for new WPForms tutorial videos.

Use a video-local postIntro chapter as the first chapter unless an existing
`manifest.postIntro.kind` is a real semantic match. Do not copy intro/outro
copy from accepted packages — but the **shape** below is the locked production
shape used by every shipping video. Match it exactly.

```jsonc
{
  "slug": "<video-slug>",
  "primarySnapshot": "<real-base-snapshot>",
  "coverColor": "#F4F7FB",
  "hud": false,
  "narrationSpeed": 1,
  "defaults": {
    "breakStyle": "glide",
    "swapStyle": "morph"
  },
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
  },
  "postIntro": null,
  "bgm": "default",
  "chapters": [
    "postintro-concept",
    "chapter-one",
    "chapter-two",
    "chapter-three"
  ],
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
}
```

Rules:

- **Intro/outro shape is locked.** Use `variant: "sullie-system"` and
  `subtitleVariants` (array of 3 short lines that rotate in the title card).
  Do not use the legacy `subtitleHTML` (singular) or `logo` fields — those are
  older shapes that pre-date the locked variant. The reference videos
  (`a-complete-guide-to-the-checkboxes-field`,
  `build-forms-faster-with-wpforms-ai`) are canonical.
- **Transition defaults are locked.** Use `breakStyle: "glide"` and
  `swapStyle: "morph"`. Both reference videos ship these.
- **Outro `cta`** is short, action-led ("Build with WPForms",
  "Try Form Templates", etc.).
- `coverColor` is the cream/cool-paper backdrop that shows behind covers and
  body-wipes. `#F4F7FB` (cool paper) and `#FAF6EF` (cream) are the in-use
  values.
- Replace every placeholder before implementation.
- `postIntro: null` is intentional when the postIntro is a video-local legacy
  chapter listed in `manifest.chapters`. Use `manifest.postIntro` only for an
  approved existing runtime cinematic kind whose product semantics match.
- `hud` should be `false` for review/recording.
- Keep `chapters` as the single source of truth for what plays.

## Modern features (optional additions)

The skeleton above is the locked back-compat shape. New videos can opt into these fields:

```jsonc
{
  // ... locked shape above ...

  // surface mode for ad-style / editorial videos.
  // Default 'iframe' if absent. Use 'editorial' for full-bleed 1920×1080
  // (no iframe, no Mac chrome) or 'mixed' for hybrid postIntros that need
  // product-truth iframe geometry plus marketing chrome above.
  // Tutorial videos: leave the field absent or set to 'iframe'.
  // See `wpforms-marketing` skill for editorial composition patterns.
  // "surface": "iframe",

  // cross-snapshot transitions.
  // For new videos with snapshot swaps, prefer `swapStyle: 'flipBridge'`
  // — eliminates the cream-bleed seam that morph/cover/fast all have.
  // Override per-chapter or in defaults below.
  // See `wpforms-transitions` skill.
  // "defaults": { "breakStyle": "glide", "swapStyle": "flipBridge" },

  // BGM with explicit src + volume (optional shape).
  // "bgm": { "src": "/bgms/56.mp3", "volume": 0.2 },
}
```

The `breakStyle: 'glide'` + `swapStyle: 'morph'` defaults stay locked for back-compat. Cross-snapshot work in new videos should override `swapStyle` to `'flipBridge'` for the cream-bleed kill — see `docs/transitions.md` and `wpforms-transitions` skill.
