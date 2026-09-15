# Motion Criteria Tiers

| Tier | Camera | Easing | Atmosphere | Identity continuity | Zoom level (if relevant) |
|---|---|---|---|---|---|
| S (cinematic) | Multi-phase decomposed: anticipation -> flight w/ scale-dip -> land -> micro-zoom | CustomEase per phase | Swap per beat | One element morphs across beats | Inputs 3.0+, buttons 3.2+, cards 2.8+ |
| A (publishable) | 3+ phases | Named CustomEase | Optional swap | Visible scale arc | Close to S thresholds |
| B (acceptable for tutorials) | 2-phase | Stock easing | No swap | Lands -> 1s hold -> zoom (per `videos/wpforms-ai-board/LESSONS.md` rule) | Content-appropriate |
| C (mid) | Single-tween translate+scale | Stock easing | None | Per-beat states | Anything |
| D (poor) | Translate-only OR scale-only | None visible | None | None | Anything |
| F (slide projector) | "Literal swipe like phone images" - single tween, no scale arc, no rotation, no anticipation | Linear or one bezier across the whole move | None | None | Often too low (1.5-2.0 for inputs) |
