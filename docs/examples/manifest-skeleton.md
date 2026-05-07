# Manifest Skeleton (DEPRECATED)

> **DEPRECATED — DO NOT USE FOR NEW VIDEOS.**
>
> Use `docs/examples/legacy-manifest-skeleton.md` for new video packages. That
> skeleton has the locked production shape (`variant: "sullie-system"`,
> `subtitleVariants` array, `defaults: { breakStyle, swapStyle }`) and is what
> every shipping video uses.
>
> This file is retained only to document the older generic shape that some
> pre-Phase-A videos used. The fields here (singular `subtitle`, no
> `subtitleVariants`, `breakStyle: 'soft-dolly'`/`swapStyle: 'cover'` defaults)
> do NOT match current production.

```jsonc
{
  "slug": "example-video",
  "primarySnapshot": "builder-setup",
  "hud": false,
  "narrationSpeed": 1,
  "bgm": "default",
  "defaults": {
    "breakStyle": "soft-dolly",
    "swapStyle": "cover"
  },
  "intro": {
    "title": "Example Video",
    "subtitle": "Short promise for the viewer"
  },
  "chapters": [
    "postintro-concept",
    "setup",
    "payoff"
  ],
  "outro": {
    "title": "You're all set",
    "subtitle": "Short completion promise for this exact topic"
  }
}
```

Notes:

- Put `.txt` and rendered `.mp3` narration in `videos/<slug>/narration/`.
- Prefer legacy/effect-mode for new videos.
- When no approved runtime cinematic matches, model the postIntro as the first
  video-local concept chapter (`postintro-concept`). If the concept needs
  richer HTML/CSS/SVG/GSAP animation, build it with an approved video-local
  surface or ask to promote a reusable cinematic.
- The postIntro chapter must implement the approved visual transformation. Do
  not swap in a weaker real-UI focus/title beat while leaving conceptual
  narration in place.
- Keep intro/outro copy topic-specific and current. Do not copy old intro/outro
  blocks from accepted packages or legacy combined scenes.
- Descriptor chapters are secondary and should be used only when the approved
  beat is simple enough that descriptor verbs preserve it fully.
- Do not inspect accepted video packages during startup.
