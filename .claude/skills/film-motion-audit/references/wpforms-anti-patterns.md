# WPForms Motion Anti-Patterns

1. **4-tween-everything-changes camera** - Each tween changes x, y, scale, rotation simultaneously with stock easing. Reads as flat. Fix: decompose into anticipation -> flight (scale dip mid) -> land -> micro-zoom.
2. **Atmospheres stacked 5-6 layers per beat** - Winners use 3 blooms + grain, period. Fix: cap at 3 atmosphere layers, swap colors not stack.
3. **Cursor frenzy from motion-path single via point** - `via.y = Math.min(fromY, toY) - 40` makes cursor arc UP past target then back. Fix: straight-line `gsap.to` with `power2.inOut`, killTweensOf at start.
4. **Caret-typing via opacity-stagger on pre-rendered char spans** - Invisible chars consume layout space, so the caret floats far right. Fix: `innerHTML` mutation via scalar tween + onUpdate render.

