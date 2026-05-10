# Storyboard Format — Morph Chain Section

Adds a **morph chain** declaration to the editorial storyboard format. Drives Phase 4 of `editorial-direction-audit-2026-05-10.md`.

## Why this exists

Per `winning-pattern-analysis-2026-05-10.md`, the single biggest authoring-shape variable separating winning from failed editorial videos is **identity continuity across time**:

> Winners have a single morphing element that carries viewer attention across beats — `wpforms-ai-prompt-open#cta` morphs Button → Input → Sullie pill → Chat panel over 12s. Failures stage a fresh composition per beat. Tables and per-beat storyboards cannot encode this — they encode states, not connecting tissue.

Per-beat storyboard tables describe **states**. Editorial videos that read as cinematic require **morph chains** — a host DOM element transforms its content/role across beats while its identity (the `id` and visual continuity) persists. The viewer's eye stays anchored.

Without this declared up-front, Claude (and any author) defaults to staging fresh compositions per beat, which produces state-table editorial — exactly the failure mode of `wpforms-ai-zlyvs/`, `wpforms-ai-announcement/`, and the Anthropic-mimicry pattern.

## What a morph chain is

A **morph chain** is one DOM element that takes on multiple visual identities across beats while preserving its `id` and (usually) position/scale envelope. Example, verbatim from `reference/html-templates/wpforms-ai-prompt-open.html:152` (the comment that flags the pattern):

> `Button → Input row → Sullie pill → Chat panel`

That's four visual states for `#cta` across approximately 12 seconds (beats spanning ~0.0–12.0s). The element's `id` stays `#cta`. Its CSS classes, child content, and dimensions morph. Viewer's eye is anchored throughout.

The morph chain element is the **protagonist**. Other beat-local content (typography, atmosphere, transitions in/out) supports it but doesn't compete with it.

## When required vs. optional

| Video type | Morph chain |
|---|---|
| Pure editorial / ad-style | **Required** — without one, the video reads as state-table |
| Mixed (`surface: 'mixed'`) | **Recommended** — apply to the editorial chrome that wraps real product UI |
| Tutorial (engine + chapters) | **Optional** — narration carries identity continuity in tutorials; morph chains apply to postIntro/cinematic beats only |

For tutorials, the equivalent of identity continuity is the **narration spine + cursor**. The tutorial engine handles this implicitly via the chapter-runner's beat sequencing. Tutorial chapters do NOT need explicit morph-chain declarations.

## Storyboard format addition

Editorial storyboards must include this section, near the top, **before** any beat-by-beat table:

```markdown
## Morph chain

**Host element:** `#<id>`

**Identity arc** (states from beat 1 to last beat):

| Beat | Visual state | Mechanism |
|---|---|---|
| 1 | <state name> | <how it appears — initial mount, fade-in, etc.> |
| 2 | <state name> | <transition mechanism — Flip morph, transform tween, content swap> |
| 3 | <state name> | <...> |

**Continuity contract:**
- The `id` does NOT change across the chain.
- The element stays mounted; transforms accumulate, content swaps inside.
- Atmospheric and typographic beat content supports the morph host, never competes for focus.
- Camera moves anchor on the morph host's bounding box, not on arbitrary stage coordinates.
```

If a video has more than one morph host (rare; consider whether you actually need two), declare each as a separate "Morph chain" subsection and explain how they relate temporally (sequential, overlapping, parent-child).

## Mechanics — how to author for it

### 1. ID stability

Pick the `id` early. Keep it. Never re-mount the element with a new id mid-video.

```html
<div id="cta">…</div>
```

### 2. Content morphs, not element swaps

Inside `#cta`, the inner HTML can change radically (button label → input field → pill content → chat panel rows). The container element stays.

GSAP Flip is the canonical mechanism for repositioning + reshape morphs:

```js
const flipState = Flip.getState('#cta, #cta *', { props: 'opacity, color, backgroundColor' });
// ... mutate DOM inside #cta ...
Flip.from(flipState, { duration: 0.8, ease: 'power2.inOut' });
```

For content-only changes without dimensional morph, plain `innerHTML` + opacity tween works.

### 3. Scale envelope as continuity cue

The element's bounding box changes, but the **camera anchors on it**. This means:
- Camera-pose pose targets the morph host (`focus: '#cta'`), not stage coordinates.
- Element position relative to the viewport stays approximately constant — viewer feels anchored.

### 4. Single timeline, parallel tracks

The morph chain choreography lives in a master timeline. Other beat content (atmosphere, typography, transitions) runs as parallel tracks on the same timeline, not as separate beats with hard cuts between them.

```js
const tl = gsap.timeline();
tl.add(morphHostTimeline(), 0);          // identity-continuity track
tl.add(atmosphereTimeline(), 0);         // parallel atmosphere
tl.add(typographyTimeline(), 0);         // parallel typography
```

### 5. Camera as observer, not director

The camera follows the morph host. It does NOT cut to staged compositions. Camera moves are continuous with the morph chain — they pan, push in, scale, but always with the host as the anchor.

This is the difference between editorial cinematic motion (`reference/html-templates/wpforms-ai-prompt-open.html`) and slide-projector editorial (`videos/wpforms-ai-zlyvs/`). The former camera observes one host; the latter cuts between staged compositions.

## Example morph chains worth modeling

These are the canonical patterns in `reference/html-templates/`:

### `wpforms-ai-prompt-open.html` — `#cta`: Button → Input → Sullie pill → Chat

Four-state chain over ~12s. Each transition uses a different mechanism (button-to-input is dimensional Flip morph; input-to-pill is content swap inside the pill container; pill-to-chat is Flip with content multiplication).

### `editorial-reference-36s.html` — typography-as-host (multiple)

This 36s video doesn't have a single dominant morph host. Each beat has its own typographic host that morphs internally (caret-typing → typed text → input morph in beats 1-3; phone composition continuity in beats 4, 5, 12). For a 36s editorial with high beat density, multiple per-beat-internal morph chains are acceptable.

### `openai-replica-18s.html` — landscape + foreground twin chains

Background landscape (pixel-art) is a static persistent host; foreground hero element morphs across beats. Two co-existing chains.

## Anti-patterns (rejected by `wpforms-motion-audit` skill)

- **No morph chain declared in storyboard.** Editorial videos without an explicit morph chain in the storyboard get scored C or worse before the build even starts.
- **Element re-mounting between beats.** `<div id="cta">…</div>` in beat 1 is removed; a new `<div id="cta">…</div>` is mounted in beat 2. Breaks identity continuity. Fix: keep the element mounted; mutate inside.
- **Camera cutting to staged compositions instead of following the host.** This is the slide-projector failure mode in `wpforms-ai-zlyvs/`. Fix: every camera pose anchors on the morph host's bounding box.
- **Multiple competing protagonists.** Two morph hosts at same prominence at same time. Viewer's eye splits, identity continuity is destroyed. Fix: stagger them temporally, or subordinate one as supporting cast.

## Cross-references

- `docs/editorial-direction-audit-2026-05-10.md` — Phase 4 in the master plan
- `docs/winning-pattern-analysis-2026-05-10.md` — full identity-continuity analysis
- `reference/html-templates/wpforms-ai-prompt-open.html:152-158` — the canonical morph chain comment
- `.claude/skills/wpforms-motion-audit/references/score-examples.md` — auditor scores tied to morph-chain presence

## What this changes

When `wpforms-marketing` skill is updated in Phase 5 (deferred), it must require this section in any editorial storyboard. Until then, this doc is the explicit authoring contract — storyboards that lack a morph chain section are out of scope for editorial authoring on this repo.
