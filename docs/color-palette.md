# Color Palette

WPForms brand colors, supporting accents, when to use which, and what NOT to do.

## Primary palette

| Color | Hex | Role |
|---|---|---|
| **WPForms orange** | `#E27730` (also `#D54E21` in marketing surfaces) | Brand. Highlight rings, instruction labels, ripples, click cues, "Sullie" halo, brand lockups. |
| **Cream paper** | `#FAF6EF` | Default `coverColor` for legacy swap covers. Reads as soft-focus / between-states. |
| **Cool paper** | `#F4F7FB` | Alternate `coverColor` (used by checkboxes + AI build videos). Reads slightly cooler. |
| **WPForms blue** | `#056AAB` | Secondary brand. Sometimes used as `theme.accent` for postIntros and editorial chrome. |
| **AI blue** | `#0399ED` | WPForms AI-specific accent (used in `build-forms-faster-with-wpforms-ai`). |

## Accent palette (editorial / ad-style)

Used in REST API video and other technical/editorial compositions.

| Color | Hex | Role |
|---|---|---|
| **Canvas void** | `#0A0E14` | Dark background for editorial-mode hero compositions |
| **Code card bg** | `#0D1117` | Code/terminal cards |
| **Code text** | `#C9D1D9` | Code body |
| **Panel stroke** | `#2F3540` | Subtle border on dark panels |
| **Cyan route light** | `#4EC9FF` | Technical accent (REST routes, data flow) |
| **Violet ability light** | `#B178FF` | Technical accent (capability/feature highlights) |
| **Amber endpoint slug** | `#F0B849` | Technical accent (URL slugs, identifiers) |
| **Success green** | `#46B450` | Successful states, confirmations |

Source: `hyperframes/hyperframes-rest-2/DESIGN.md` (REST API video design system).

## Highlight ring + instruction label color

The default highlight ring is **orange `#E27730`** with double soft-glow. The instruction label is white glass-card with orange left-border accent + orange arrow.

Don't change this for tutorial videos. The orange-on-product-UI is the brand signature; viewers learn to read it as "click this."

For ad-style / editorial videos with a different palette, you can override via `runtime/overlays-config.js` (Phase 0 audit confirmed it's a single source of truth). Don't override per-video unless the storyboard explicitly approves a non-orange highlight scheme.

## When to use brand orange

- **Tutorial videos:** orange is reserved for highlight rings, instruction labels, click ripples, and the Sullie halo / lockup. Don't sprinkle it into editorial chrome.
- **Ad-style videos:** orange in moderation. Single hero element, single brand mark, single tagline accent. Not as a body color.
- **REST API / technical content:** orange ONLY for `wpforms` literal in curl tokens, the final `WPForms REST API` lockup, and Sullie's halo. Cyan / violet / amber are the technical accents.

**WRONG — orange everywhere:**
- Orange highlight ring + orange editorial card border + orange title text + orange CTA + orange icon → confetti box, viewer can't lock onto the action

**RIGHT — orange reserved for action:**
- Orange highlight ring on the click target only
- Editorial card uses neutral / blue / accent palette
- Brand lockup at end uses orange

This is the lesson from REST API video Phase 0 (analysis-quality-and-transitions.md §1.6).

## When to use blue

- **Tutorial videos:** WPForms blue `#056AAB` works as `theme.accent` on postIntros (e.g., checkboxes postIntro uses it). Don't use blue for highlight rings — that's orange's job.
- **Editorial videos:** AI blue `#0399ED` is the WPForms AI scene accent. Use for AI-related chrome (badges, callouts, brand mark).
- **Code / technical content:** cyan `#4EC9FF` for syntax highlighting (keywords, route accents). Not the same as brand blue.

## When to use cream / cool paper

- **`coverColor` only.** That's the swap-cover background.
- Don't use cream as a slide background — it reads as "loading" / "blank state," not as content.
- Cool paper `#F4F7FB` is slightly cooler / more neutral than cream `#FAF6EF`. Pick one per video and stick with it.

## What NOT to do

- **Don't use highlight orange in editorial body content.** Confetti effect.
- **Don't use full-screen linear gradients on dark backgrounds.** H.264 banding kills them. Use radial gradients or solid + localized glow. (Lesson from Hyperframes house-style.md.)
- **Don't invent new colors mid-video.** Stay in the palette family. If a hex isn't on this list and isn't in the video's `DESIGN.md`, push back at storyboard.
- **Don't animate hex string interpolation through far-apart colors.** GSAP color tweens between e.g. `#0A0E14` and `#E27730` pass through muddy mid-tones. Use a `CustomEase` with stops or change via `autoAlpha` between two finished states.

## Stage CSS interaction

The `coverColor` shows during legacy swap styles. `flipBridge` doesn't mount covers, so cover color doesn't matter for it.

Watermark (`#wpf-watermark`) uses a fixed orange variant. Don't override per-video.

## Per-video DESIGN.md (Hyperframes pattern)

Ad-style / marketing-mode videos can declare a per-video `DESIGN.md` with palette + typography + motion rules. The `hyperframes/hyperframes-rest-2/DESIGN.md` and `hyperframes/wpforms-ai-scene-10/DESIGN.md` are reference examples.

For tutorial videos, the brand palette above is enough. No per-video DESIGN.md needed.

## See also

- `wpforms-marketing` skill — editorial composition patterns.
- `runtime/overlays-config.js` — single source of truth for highlight/label/ripple colors.
- `hyperframes/hyperframes-rest-2/DESIGN.md` — full REST API design system.
- `hyperframes/wpforms-ai-scene-10/DESIGN.md` — WPForms AI scene-10 design system.
- `analysis-quality-and-transitions.md` §1.6 — REST API video lesson on over-cooked curl colors.
