# PostIntro Patterns

Purpose: help agents design the short concept beat after the title card and
before the product walkthrough.

## What PostIntro Is

PostIntro is a short animated proof of value, usually 8-15 seconds. It should
teach the "why" of the video before entering the WPForms UI.

It is not:

- a second title card;
- a copied cinematic from another topic;
- a full tutorial chapter;
- a generic decoration layer.

## Design Rules

- Start from the current topic's product problem.
- Show a clear before -> after, limitation -> solution, or messy -> polished
  transformation.
- The implemented visuals must match the approved visual transformation. Do not
  replace an approved concept with a weaker related UI highlight while keeping
  the narration conceptual.
- Keep the narration tight.
- Use real WPForms product truth when product UI appears.
- Existing runtime cinematics are code references, not design prompts.
- Reuse an existing `postIntro.kind` only when its product semantics match.
- If the concept needs richer motion, build it with the proven HTML/CSS/SVG/GSAP
  surfaces used by the canonical postIntros. Do not turn that need into an easy
  excuse to drop or shrink the beat.

## Multi-animation rule (mandatory)

PostIntros are **never single-beat**. The canonical references all run
**8–15 seconds with at least 5 distinct animation phases**. A new postIntro
must:

- Hit ≥ 5 distinct animation phases (mount, primary morph, payoff, secondary
  morph or label reveal, exit/handoff). A single fade-in followed by a
  fade-out does not count as a postIntro.
- Run 8–15 seconds total.
- Choreograph at least one cursor or pointer interaction with the editorial
  DOM (click, hover, drag, type) so it does not feel like a slide.
- End by handing off into the first content chapter — fade into the real
  snapshot, dive-zoom into a captured element, or hand the cursor to a
  product-truth control.

Reference timelines:

- `runtime/cinematic-rough-thought-to-draft.js` — ~15.2 s, 5 phases:
  type messy idea → erase + retype clean prompt → compress to chip →
  thinking → form draft reveal.
- `runtime/cinematic-one-answer-enough.js` — ~14 s, 6 phases: form mount →
  cursor → radio click → radio→checkbox morph → multi-select payoff → exit.
- Notifications form-to-inbox teaser — ~12 s, multiple phases: browser
  chrome → form fill → click → Gmail slide-in → email ping.

The validator does not enforce this rule; the user will reject postIntros
that feel like a single fade-in.

## Snapshot handoff (avoiding the boot flash)

A chapter-mode postIntro declares `snapshot: '<base>'` so the runtime
preloads that iframe behind the editorial layer. The runtime mounts a
pre-first-chapter cover at z 595 and drops it via `onAfterSetup` once the
chapter's `setup()` completes. Therefore:

- Mount the editorial layer in `setup()`, not lazily inside `effect()` —
  the cover drops as soon as setup returns, so the layer must already be
  painted by then.
- Do not abruptly `.remove()` the layer onto a bare snapshot at the end of
  the postIntro; ease opacity to 0 over 300–500 ms, ideally over the
  element the next chapter focuses on.

## How To Build The Animation

There are two separate ideas:

- **PostIntro story beat** — required by default. This is the 8-15 second
  concept proof that comes after the title card.
- **Manifest `postIntro.kind` slot** — current runtime wiring. Today this slot
  resolves `kind` to `runtime/cinematic-<kind>.js`, calls `mount(opts)`, waits
  for `animPromise`, then calls `dismiss()`.

Normal video work should create the story beat without editing protected core.
Use this order:

1. **Existing semantic match.** If an existing `postIntro.kind` tells the same
   product story, use it through `manifest.postIntro`. This is rare. Do not use
   a Checkboxes or WPForms-AI cinematic for a different topic just because the
   motion looks good.
2. **Legacy video-local concept chapter.** Default fallback for normal video
   work: create an early chapter named like `postintro-<topic>` or
   `<topic>-concept` using legacy/effect-mode, per-beat narration, local
   selectors, and ctx helpers. CSS transitions/keyframes and SVG overlays are
   acceptable when they are clearly editorial/staged, not fake WPForms product
   UI. This keeps the animation video-local and avoids core edits.
3. **Descriptor concept chapter.** Secondary option for simple concept beats
   only. Use `defineChapter` and public verbs such as `sectionTitle`,
   `animateText`, `captionLine`, `lineDraw`, `hold`, `focus`, `popOut`,
   `focusPull`, and `snapshotSwap` only when they preserve the approved visual
   transformation. A real UI focus plus title text is not enough when the
   storyboard approved richer animation.
4. **New reusable runtime cinematic.** Only with explicit approval. Add a new
   `runtime/cinematic-<name>.js` when the concept is reusable across future
   videos and worth promoting into the manifest `postIntro.kind` slot.

For video-local concept beats, the practical tools are:

- **HTML** for simple editorial objects: cards, chips, small forms, lists,
  inboxes, menus, and labels. Product-looking HTML must be cloned from real
  captured DOM or based on product-truth snippets.
- **CSS** for layout, opacity, transforms, keyframes, easing, masks, and simple
  before/after states. Prefer transform/opacity animation.
- **SVG** for arrows, paths, rings, connectors, marker strokes, and line-draw
  moments. The descriptor `lineDraw` verb is the safest public surface for this.
- **GSAP-style timelines** for complex timing after approval. Normal video
  chapters should stay video-local and avoid direct runtime imports; ask before
  promoting a reusable GSAP cinematic into `runtime/`.
- **GSAP Flip plugin** for layout-change, parent-change, pin-to-UI,
  state-driven reflow, and real-UI clone-and-morph patterns. See
  `docs/gsap-flip-patterns.md` for the loader, discipline rules, and the two
  validated sandboxes (`flip-sandbox`, `flip-generate-card`).
- **Shared blocks** from `videos/_shared/blocks/` for parent-document editorial
  chrome such as code cards, mac windows, phone frames, pills, arrows, route
  lines, and terminals. Blocks sit above the iframe or inside editorial mode,
  never read iframe DOM, and compose into a master timeline with
  `tweenInto(tl, opts)`.

If the approved concept needs HTML/CSS/SVG/GSAP, build that animation with an
approved video-local surface or ask to promote a reusable runtime cinematic.
The WPForms AI, Checkboxes, and Notifications postIntros prove the repo can do
this level of animation. Do not downgrade the concept to `focusPull` + title
text.

Ambitious postIntros often need visual QC. After the user reviews the playable
URL, revise timing, framing, morphs, labels, and payoff states instead of
treating the first pass as final.

If a normal video needs a true manifest `postIntro.kind` but no semantic kind
exists, build an equivalent video-local postIntro or ask to promote a reusable
cinematic. Do not use a second title card or drop the beat.

## When To Reach For popOut / glideTo / lineDraw

Use these helpers when they make the beat clearer without changing product
truth:

- `popOut`: use when narration points at one real WPForms element as "the
  thing." It clones a real iframe element into the parent document and gives it
  a short cinematic lift. Good candidates: an Entries detail panel, an Add
  Notification button, or an export setting row.
- `cursor.glideTo`: use for any non-trivial cursor travel where a waypoint
  makes the motion feel intentional. Phase D rolled this into
  `form-entries-guide` for the WPForms sidebar to Entries submenu move, and
  `form-notifications` for the notification clone-button move.
- `lineDraw`: use for relationships between two or more concepts, especially
  when a highlight ring would only identify objects rather than explain how
  they connect. Good candidates: conditional-logic rule cells or Entries
  overview recency/activity columns.

## Canonical References

These are the best references for ambition, timing, and construction. Read only
the relevant postIntro/teaser code, not the full video package.

### WPForms AI: `rough-thought-to-draft`

Route: `/scenes/player.html?video=build-forms-faster-with-wpforms-ai`

Relevant code: `runtime/cinematic-rough-thought-to-draft.js`.

What to study:

- HTML editorial objects: prompt panel, chat chip, assistant bubbles, generated
  form preview.
- CSS-owned stage: full-screen root, panels, cards, spark/glow states, exit
  classes.
- GSAP timeline: type messy idea, correct it into a clean prompt, compress to a
  chip, show assistant thinking, reveal generated form fields.

Why it works: the visual transformation is the product promise. A rough human
thought becomes a working WPForms draft before the walkthrough begins.

Do not reuse for non-WPForms-AI videos. Reuse the construction pattern:
editorial HTML + CSS states + GSAP sequencing that proves the idea.

### Checkboxes: `one-answer-enough`

Route: `/scenes/player.html?video=a-complete-guide-to-the-checkboxes-field`

Relevant code: `runtime/cinematic-one-answer-enough.js`.

What to study:

- HTML editorial form: option rows, marks, cursor, side chips.
- CSS morph: radio marks become checkbox marks; selected and warning states
  make the limitation visible.
- GSAP choreography: cursor selects one answer, the first selection is displaced,
  the form morphs, then multiple selections stay selected with bursts.

Why it works: the viewer sees the limitation, then sees the field type solve it.
The postIntro is not just about Checkboxes; it demonstrates the reason
Checkboxes exist.

Do not reuse for non-Checkboxes videos. Reuse the pattern:
limitation -> visible failure -> morph -> solved state.

### Notifications: `form-to-inbox`

Route: `/scenes/notifications-combined.html`

Relevant code: the welcome teaser block in `scenes/notifications-combined.html`
(`mountWelcomeTeaser`, the `.teaser*`, `.site-window`, `.tf-*`, and `.gmail-*`
CSS/HTML).

What to study:

- HTML editorial objects: browser window, form fields, submit button, Gmail-like
  inbox.
- SVG cursor: a simple pointer path becomes the actor that submits the form.
- CSS transitions/keyframes: typing, button press/ripple, dimming, inbox reveal.
- Timeline comments: the beat is timed to narration and ends in a payoff before
  the settings walkthrough.

Why it works: it shows the real outcome first. A submitted form becomes an
email notification, then the tutorial explains the controls.

Reuse this as an outcome-before-controls reference for notifications-style
topics. Do not copy its old combined-HTML packaging into new videos.

## Proven Examples Summary

- WPForms AI: rough thought -> clean prompt -> generated form draft.
- Checkboxes: one-answer limitation -> checkbox morph -> multiple answers.
- Notifications: submitted form -> inbox/email payoff -> settings walkthrough.

## How To Invent A New One

Use this mini-brief:

```text
Problem:
Feature behavior:
Visual transformation:
Product truth used:
Animation surfaces: HTML / CSS / SVG / GSAP / descriptor verbs:
Narration, one sentence:
Why this is not just a title card:
What would count as an unacceptable weaker substitute:
```

Examples:

- Dropdown: a long blank list becomes a focused "Reason for contact" menu,
  then opens to show clean options.
- Email Notifications: a form submission splits into the right recipient inbox.
- Payments: a checkout intent becomes a completed payment record.
- Confirmations: a form submit turns into a message, redirect, or next-step
  handoff.

If the concept needs reusable runtime support, ask before adding it.
