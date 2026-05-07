# Atmospheric Composition

When grain / sweep / parallax / scale-push work, when they distract, and how to layer them without crossing into "Stripe-imitation slop."

`videos/_shared/atmospheric.js` exports five additive helpers, all with `tweenInto(tl, opts)`:

- `grain` — film grain canvas (Mulberry32-seeded, draw-once, ~2-3% opacity).
- `gradientSweep` — diagonal CSS gradient panned `xPercent: -100 → 100` across the beat duration.
- `parallaxPair` — two stacked image layers with opposite scale/translate over the beat duration.
- `scalePush` — wrapper element scale `1 → 1.02` over 3-4s. "No frozen pixels" rule of thumb.
- `darkBackdrop` — dimming layer behind the editorial composition.

Each is opt-in. None loads by default.

## When atmospheric layers work

- **Marketing-mode hero compositions** (ad-style, surface: 'editorial'). Atmospheric is what makes 8-12s feel like a polished release video instead of a slideshow.
- **PostIntros that have ≥3s of "breathe" between phases.** Scale-push during a held state prevents the "frozen pixels" feel.
- **Title cards and outros with sustained imagery.** Grain + slow scale-push gives the brand mark texture.
- **Transformation interstitials** (the moment between "old way" and "new way"). Gradient sweep cues the shift.

## When atmospheric layers distract

- **Routine cursor + click tutorial beats.** The viewer is following the cursor; atmospheric motion fights for attention. Tutorial beats should be still backgrounds with motion ONLY on the focal action.
- **Technical content** (code cards, REST routes, JSON). Grain/sweep on a code card makes it harder to read.
- **Beats <3s.** The atmospheric layer doesn't have time to register; it just adds visual noise.
- **PostIntro phases with active multi-element morphs.** Don't add sweep behind a radio→checkbox transformation — too much going on.

Rule: atmospheric is for moments when the foreground is HOLDING. Active foreground choreography needs atmospheric backgrounds.

## Layering rules

Don't layer all 5 atmospheric helpers at once. Pick 1-3 per beat.

**Strong combinations:**
- **Grain + scale-push** — works for almost any held editorial state. The texture + subtle motion together.
- **Gradient sweep + dark backdrop** — for transition interstitials. The sweep moves; the backdrop stays.
- **Parallax pair + grain** — for hero compositions with two depth layers.

**Weak combinations:**
- **Sweep + parallax** — competing horizontal motion. The viewer can't tell what's moving.
- **Grain + scale-push + sweep + parallax + backdrop** — too much. Reads as "trying too hard."
- **Sweep behind active text reveal** — the sweep distracts from the per-character cascade.

## Build → Breathe → Resolve phase structure

For 3+ second editorial beats, structure as:

- **Build** (0-30%): entrance animations of foreground elements.
- **Breathe** (30-70%): atmospheric layers carry; foreground is held. **This is where atmospheric earns its place.**
- **Resolve** (70-100%): payoff cue → exit.

Atmospheric layers SHOULD run through all three phases (continuous), but the "breathe" phase is where they're most necessary.

## Parameter recommendations

### Grain

- Default opacity: 2-3%. Higher reads as "noisy."
- Mulberry32 seed: any constant. The grain is deterministic; it doesn't change between runs.
- Draw-once on mount; don't re-render per frame (CPU waste).

### Gradient sweep

- Duration: matches the beat (3-8s common).
- Easing: `sine.inOut` (smooth) or `'none'` (linear, mechanical feel).
- Direction: usually diagonal (top-left to bottom-right).
- Opacity: 8-15%. Higher reads as a hard wipe rather than a sweep.

### Parallax pair

- Use two image layers with `transform: scale()` going opposite directions.
- Back layer: `scale: 1.0 → 1.05`, `y: 0 → -20`.
- Front layer: `scale: 1.0 → 0.97`, `y: 0 → +10`.
- Duration: full beat. Easing: `sine.inOut`.
- Don't use stock images or generic "particles" — use product-truth photography or restrained editorial illustration.

### Scale push

- Wrapper element: `scale: 1 → 1.02`, duration 3-4s, ease `sine.inOut`.
- The 1.02 cap keeps it subtle. 1.05+ becomes obvious zoom.
- Apply to the SAME wrapper that holds your foreground. The push is "the camera leaning in slightly" while content holds.

### Dark backdrop

- Opacity: 10-30% for "dimming a surface" effect.
- 50-70% for "everything else fades to dark" cue.
- Don't use `#000` solid — use `rgba(10, 14, 20, 0.X)` so a hint of color shows through.

## Anti-patterns

- **Stripe-imitation slop:** big animated gradient sweep + grain + 3D card tilt + atmospheric particles → looks like every other tech-startup landing page. The WPForms voice is more grounded; pick atmospheric layers that serve the topic, not the trend.
- **Atmospheric on tutorial beats:** confuses viewers. Tutorial beats should be still backgrounds.
- **Atmospheric without `pausableRaf`:** if a layer uses raw `requestAnimationFrame`, scrubber pause won't freeze it. Phase E.5 rule applies.
- **Layering on top of an iframe:** the iframe is z:20, atmospheric usually mounts to body at z:auto. If atmospheric is meant to be IN FRONT of the iframe (ad-style overlays), set z explicitly. If meant to be BEHIND the iframe (mesh-bg replacement), `surface: 'editorial'` and skip the iframe entirely.

## See also

- `wpforms-marketing` skill — when atmospheric layers fit (editorial / ad-style work).
- `videos/_shared/atmospheric.js` — source of the 5 helpers.
- `hyperframes/hyperframes-rest-2/` — reference: editorial REST API composition with atmospheric layering.
- `docs/stage-css.md` — z-stack interaction with atmospheric layers.
- `analysis-quality-and-transitions.md` §1.2 — Phase 0 lesson on "atmospherics running but cream pastel WPForms background bleeding through."
