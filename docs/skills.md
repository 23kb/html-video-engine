# Skills

adds Anthropic-style repo-local skills under `.claude/skills/`.
`tools/skill-context.js` remains the canonical startup dump; skills are smaller
topic-scoped context packs to load on demand.

## Available Skills

- `wpforms-video` — universal WPForms video authoring: public API,
  production-truth rules, storyboard gate, legacy-first workflow, and
  postIntro expectations.
- `wpforms-postintro` — topic-specific postIntro design: multi-animation rule,
  canonical references, and video-local implementation choices.
- `wpforms-gsap-rules` — GSAP L0 discipline: timelines, Flip, shared effects,
  registered timelines, and `pausableRaf`.
- `wpforms-marketing` — editorial/ad-style authoring: surface modes,
  atmospheric kit, blocks, text-kit, and marketing composition guidance.
- `wpforms-transitions` — transition vocabulary: `flipBridge`, swap/break
  styles, camera poses, frame driver, preview, scrubber, and render workflow.

Use the most specific skill that matches the task. Load `wpforms-video` for a
new tutorial package, then add the narrower skill only when the work touches
that area.
