# Capture gotchas

Product-neutral rules, one line each. Each one is a defect that shipped once.

## Choosing the capture method

- IF the page is styled by JavaScript (CSSOM rules, inline style injection, class toggles after load) THEN prefer a manual SingleFile save from the browser over an automated serializer; the automated one misses rules that exist only in the CSSOM.
- IF the page is behind a login on a third-party service THEN never automate that session; a human saves the page in their own browser and you ingest the file.
- IF you re-run a download-based capture THEN check that a NEW file landed; Chrome silently blocks repeated automatic downloads and re-serves the stale one, so require `--expect "<string unique to the page>"` and refuse byte-identical files under a new slug.
- IF you are about to capture a page from someone else's account THEN stop; never capture a page for someone else.

## Cleaning the saved HTML

- IF the saved HTML carries a `<meta http-equiv="Content-Security-Policy">` THEN strip it; it blocks every script you inject later, including the interactivity kit.
- IF the saved HTML carries a `<base>` tag THEN strip it; every relative URL in the snapshot resolves against the original site instead of the snapshot folder.
- IF a `<link>` or `<script>` has a `crossorigin` attribute THEN strip it; localized files served without CORS headers fail to load under it.
- IF the page holds hidden iframes (tracking pixels, chat widgets, ad frames) THEN remove them; they hit the network from inside a snapshot and can leak that the page was opened.
- IF an image is a remote 1×1 or hidden pixel, or an asset response is zero bytes THEN drop it; a localized empty file is a failed request and a console error on every mount.
- IF inline `on*` handler attributes (`onclick`, `onchange`) survive the script strip THEN expect product JS to run on the first click; strip them or account for them, the gate reports them.
- IF a banner or dialog is rendered by script at load (cookie consent, a promo) THEN it is in the live reference and not in the fossil; strip it in the capture plan so the paint diff compares like with like.
- IF a fragment (state file, dropdown list) still references remote assets THEN strip or localize those references BEFORE `innerHTML` parses it; the parser fetches on parse, not on display.
- IF the page uses anchor-positioned portals or popovers (`popover`, top-layer elements) THEN expect them to serialize empty; capture them as a separate state fragment with their box measured while open.
- IF a popover or module was not visible at save time THEN its CSS may be absent (lazy-loaded stylesheet); capture with the module open once and keep that stylesheet as a scoped addition.

- A switch or checkbox is styled by `:checked` sibling rules (`input:checked + .track`,
  `input:checked ~ .label--on`). Those rules are in the stylesheet, so the fossil flips correctly
  when the film sets `checked` — unless the capture stamped `display:none` inline on the hidden
  label. `freeze.mjs` leaves such elements to the stylesheet (the note reads `left to state CSS`);
  a save from another tool may not. Test: flip `checked` in the mount test and watch the label
  and track follow. The track colour and knob move through a CSS transition, so read the result
  after it, not on the same frame.

## Locale and identity

- IF the capturing machine is not in the product's target locale THEN check phone country flags, date placeholders (`DD/MM/YYYY`), and currency symbols; they inherit the machine, not the product.
- IF the page shows a greeting or the account name THEN leave it in the snapshot and neutralize it at film time by selector; editing the snapshot text by hand drifts from the capture and cannot be re-run.
- IF you are about to commit a snapshot THEN run the personal-data gate first (emails, greetings, names, tokens); a redaction after the commit is still in history.

## Geometry and layout

- IF the page is taller than the mount THEN record the measured document height in `meta.json` and size the iframe from it; a viewport-height iframe clips the page and the camera cannot reach what is below the fold.
- IF an element was hidden at capture time THEN it has no box; restore the product's own display value inline and measure `offsetHeight` before you animate toward it.
- IF a registration reveals a captured-hidden element by adding the product's class THEN clear the inline `display: none` the visibility bake stamped on it first; an inline style beats the class rule and the reveal silently does nothing.
- IF a long page reflows when it is mounted THEN its document height is not one number: the live height, the gate's height at a 900 px viewport and the mounted height can all differ (sticky and min-height sections). Mount at the height the HUD reports for the height you actually use.
- IF an ancestor of an overlay has `transform`, `filter`, or `contain` THEN the overlay is trapped inside that stacking context and containing block; set a targeted `transform: none` on that ancestor for the beat rather than restyling the overlay.
- IF a shell element uses viewport units (`100vh`, `100vw`) THEN it grows when the camera zooms the iframe; pin it to pixel sizes measured at capture.
- IF a region is a `<canvas>` THEN it is dead on camera after capture (a baked PNG); it cannot be hovered, resized, or animated as DOM, so plan the beat around a still or an editorial substitute.

## Verifying the result

- IF the paint-diff gate WARNs THEN look at the two PNGs side by side or fix the capture; an explanation of why the diff is probably fine never clears the warning.
- IF you are judging whether a snapshot is done THEN the bar is "behaves like the product on camera", not "the data is in the DOM"; a snapshot with the right markup and the wrong paint fails.
- IF a gate did not run THEN report it as NOT RUN, never as passed; a skipped check is not a clean check.
