# Transitions

Phase C keeps the existing transition vocabulary and adds `flipBridge` as the
cross-snapshot continuity path.

## Surface Modes

- `iframe` is the default tutorial surface: snapshot iframe, Mac chrome,
  mesh background, watermark, and overlay helpers.
- `mixed` keeps the iframe surface but allows full-bleed editorial layers above
  it. Use this for cinematic videos that still need hidden snapshot DOM for
  clone math.
- `editorial` skips snapshot iframe boot and Mac chrome. It is a clean
  1920x1080 stage for ad-style chapters.

## Swap Styles

Existing `cover`, `fast`, `morph`, `push`, and `whip` styles still wrap the
legacy body-wipe swap. `flipBridge` uses a hidden preloaded iframe instead:

1. Append the next snapshot iframe under the current stage.
2. Wait for its load and two paint frames.
3. Run sanitize and prep against the hidden iframe document.
4. Mark `body[data-flipbridge-armed="<slug>"]` for debug assertions.
5. Adopt the loaded iframe as the engine iframe, preserving the current camera
   transform.
6. Crossfade old and new iframes, then remove the old iframe.

Because the page body is not wiped on the `flipBridge` path, Mac chrome,
watermark, mesh, and editorial layers remain mounted across the swap.

