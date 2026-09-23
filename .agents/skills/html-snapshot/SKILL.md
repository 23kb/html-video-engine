---
name: html-snapshot
description: "Freeze a web UI into a self-contained HTML snapshot for video mounts: a public page, your own site behind a login, or a SingleFile save of a logged-in SaaS page; plus state fragments, nine QA gates, a mount test, an interactivity kit and a layer manifest for non-HTML tools. Use when asked to snapshot, freeze or capture a page as HTML, SingleFile, state fragment, the dropdown open state, the real UI in the video, layer manifest, rebuild the page as native layers."
---

# html-snapshot

A snapshot is a fossil of a live page: one `index.html` (plus `assets/`) that renders the same
paint with no network and no scripts, so a film can mount it in an iframe, move a camera over
it and mutate its DOM. This skill captures the fossil, captures the states a film needs that only
exist after interaction, checks the fossil for the defects that cost rebuilds, and proves it
mounts.

## Say this

- "snapshot this page: `https://…`" — public page (Path A)
- "freeze my admin page behind login: `https://mysite/wp-admin/…`" — your own site, credentials from the environment (Path C)
- "ingest this SingleFile save: `~/Downloads/page.html`" — a logged-in SaaS or JS-styled page you saved yourself (Path B)
- "capture the open dropdown as a state" — a state fragment with its own CSS
- "run the gates on `<slug>`" / "does `<slug>` mount?" — the QA report, the mount test
- "make the tabs work in `<slug>`" — one interactivity registration, source-first (asks whether the product is installed locally)
- "layer manifest for `<slug>`" / "rebuild `<slug>` as layers in After Effects" — boxes, text, fonts and rasters in page px for a tool that is not HTML

**Needs:** Node 18+, `npm install` in the skill folder (Playwright; chromium downloads on
postinstall). Nothing else. Nothing leaves the machine except the page fetches Playwright makes.

**Never:** capture a page for someone else, automate a logged-in third-party session, commit a
snapshot before the personal-data gate has run, or edit a captured DOM to hide a name (neutralize
at film time by selector instead).

## Files

| Path | Role |
|---|---|
| `scripts/freeze.mjs` | Paths A + C: live page → `index.html` + `assets/` + `live-reference.png` + `meta.json` |
| `scripts/ingest.mjs` | Path B: a SingleFile / Save-Page-As file the human saved → normalized snapshot |
| `scripts/states.mjs` | a UI state after interaction → `states/<name>.json` (outerHTML + rect + scoped CSS) |
| `scripts/state-snippet.js` | the same serializer as a DevTools console snippet for authenticated tabs |
| `scripts/gates.mjs` | G1–G9 quality gates, report-only → `gates.json` |
| `scripts/serve.mjs` | static server for the snapshots root + `mount-test.html` |
| `scripts/manifest.mjs` | layer manifest for tools that are not HTML: `manifest/layers.json` (page, fonts, layers in paint order), `manifest/raster/<id>.png`, `manifest/page@2x.png` |
| `scripts/targets.mjs` | measures `<slug>/targets.json` (the storyboard's words → a CSS selector) into page px boxes and centres; the storyboard's `fill-anchors.mjs` and the handoff read it |
| `mount-test.html` | bare page: iframe at native size, scale + translate camera, fake cursor, one click |
| `scripts/interactivity-kit.js` | empty registry + custom `<select>` overlay + `fadeSwap`; behaviour is re-added per product |
| `scripts/steps.mjs` | the step-plan runner shared by freeze and states (click / type / fill / select / waitFor / …) |
| `references/gotchas.md` | every capture rule as IF / THEN, one line each |
| `references/discover-transitions.md` | how to write interactivity registrations for a new product |

Snapshot layout: `<root>/<slug>/index.html`, `assets/`, `meta.json`, `live-reference.png`
(A and C only), `states/<name>.json`, `gates.json`, `manifest/` (on request). `<root>` defaults to `./snapshots`; pass
`--root <dir>` everywhere to use another.

## Path decision (ask this first, one line)

| The page is… | Path | Command |
|---|---|---|
| public, no login | **A** | `node scripts/freeze.mjs <url> <slug>` |
| your own site with credentials and a session you may drive (your WordPress admin, your own app) | **C** | `node scripts/freeze.mjs <url> <slug> --login login.json --steps steps.json --wait-for <sel>` |
| a logged-in SaaS, a JS-styled admin, anything with a heavy client (chat apps, marketing platforms, code-snippet plugins) | **B** | human: SingleFile → Save page. Then `node scripts/ingest.mjs <saved.html> <slug> --expect "<unique string>"` |

Rules behind the table: the SingleFile manual save beats automation for JS-styled pages (CSSOM
rules no static serializer sees are in the save). A third-party session is never automated; the
human saves the page, the tool packages it. `--expect` is required because Chrome silently
re-serves a stale download and three "captures" once turned out to be one file.

## Path A / C — `freeze.mjs`

```
node scripts/freeze.mjs <url> <slug> [--root dir] [--viewport 1440x900]
     [--login plan.json] [--steps plan.json] [--wait-for <sel>] [--wait-url <regex>] [--settle ms]
     [--inline] [--redact <regex>]... [--strip <sel>]... [--preset wp-admin|wp-frontend]...
     [--keep-iframes] [--force] [--headed]
```

What it bakes, and why (each one is a defect that shipped once):

- **visibility bake** — computed `display:none` / `visibility:hidden` written inline, only on the
  element that turns hidden (visibility inherits; stamping the subtree makes a later reveal an
  empty box). Without it, hidden overlays resurrect expanded once scripts are gone.
- **CSSOM materialization** — rules injected with `insertRule` / `adoptedStyleSheets` exist only
  in memory; they are written back into `<style>` text.
- **property → attribute** — typed values, checked radios, picked options, textarea text.
- **stylesheets inlined** as `<style data-origin>`; `@import` resolved; every `url()` localized.
- **assets localized** under `assets/` with hashed names (or data URIs with `--inline`); only
  files the final HTML references are written. Fetched through the browser session, so
  authenticated and cross-origin assets come along.
- **canvas → PNG**, reported: the still is right and the region is dead on camera.
- **scripts, noscript stripped; iframes removed** (src recorded) unless `--keep-iframes`; `<base>`,
  `crossorigin`, `integrity` removed; charset ensured. Tracking pixels (remote 1×1 or hidden
  images) are removed and zero-byte asset bodies are never written: each one was a failed
  request on every mount.
- **script-rendered chrome is not in the fossil.** A cookie-consent banner that JS injects live
  appears in `live-reference.png` and not in the frozen page, and the paint diff charges you for
  it. Strip it in the capture (`--strip '[id*="consent"], [class*="cookie"]'`) so the reference
  and the fossil show the same thing.
- **redaction** of API keys and tokens (built-in catalog + `--redact`), in the HTML and in text
  assets.
- **`live-reference.png`** — the live paint after the strips, so the paint-diff gate compares
  like with like.
- **error / login guard** — a title or URL that looks like an error or a login page writes
  nothing (`--force` overrides).

Plans (`--login`, `--steps`) are JSON; credentials are `${ENV:NAME}` placeholders resolved from
the environment, never literal. Steps use real Playwright mouse and keyboard events (synthetic
`el.click()` is ignored by delegated bindings). Step kinds: `goto`, `click`, `hover`, `type`,
`fill`, `press`, `select`, `check`, `uncheck`, `setFile`, `scroll`, `eval`, `wait`, `waitFor`,
`waitUrl`; each accepts `settle` (ms). `--wait-for` must name a **rendered** element: a boxless
node never becomes visible and `body` matches instantly.

```json
{ "url": "https://site.example/wp-login.php",
  "steps": [ { "fill": { "sel": "#user_login", "text": "${ENV:WP_USER}" } },
             { "fill": { "sel": "#user_pass",  "text": "${ENV:WP_PASS}" } },
             { "click": "#wp-submit" } ],
  "success_url": "wp-admin" }
```

Strip chrome the film never shows with `--strip <sel>`; the two optional WordPress presets remove
the admin bar and notices (`wp-admin`) or theme header / nav / search / sidebar / footer / edit
links (`wp-frontend`, because a frontend capture is a shot of the form, not of the website).
`meta.json` records `doc_height`: a page taller than the mount needs that number, or the payoff
sits below the iframe's viewport.

## Path B — `ingest.mjs`

```
node scripts/ingest.mjs <saved.html> <slug> --expect "<string unique to the page>"
     [--no-expect] [--root dir] [--redact <regex>]... [--keep-iframes] [--source-url <url>]
```

Normalizes a human save: `--expect` assert (the wrong page fails loudly), byte-identity ledger
(the same bytes under a second slug are refused), CSP `<meta>` and `<base>` stripped (the CSP
blocks every injected script and the preview client), missing `</body></html>` appended,
`crossorigin` stripped (CORS fails after the freeze and the whole style layer never applies),
hidden / tracking iframes removed, remaining external stylesheets and their fonts inlined,
redaction, `meta.json`, then a personal-data pre-report. A SingleFile save carries the
account's greeting, name, avatar and history titles — run `gates.mjs` before any commit.

## States — `states.mjs` and `state-snippet.js`

A film often needs UI that exists only after interaction: an open menu, a popover, a filled
composer, a hover. Two ways to capture it as a fragment:

```
node scripts/states.mjs <url> --slug <slug> --name <state> --target <sel> [--steps plan.json] [--login plan.json] [--note "..."]
```

drives the steps and serializes the first `--target` match: `outerHTML`, bounding rect, and a
**scoped stylesheet** built from the subtree's computed styles (every element gets `data-st`,
only properties that differ from a default element of the same tag are emitted). That scoped
CSS is the fix for the day a popover fragment rendered unstyled because its CSS module was not
in the page save. Remote `src` / `srcset` / `poster` / `href` / `xlink:href` inside the fragment
are renamed to `data-stripped-<attr>` (`data-stripped-src`, `data-stripped-href`, ...) unless
`--keep-remote`, because parsing a fragment with remote assets hits the network; the film decides
what to restore. The scoped CSS bakes computed sizes in px, so capture at the viewport the film
will mount at. Steps use the same vocabulary as `freeze.mjs` (`steps.mjs`). Output:
`states/<name>.json` = `{ state, url, theme, capturedAt, note, viewport, rect, html, css,
stripped_assets, target_selector }`.

For an authenticated third-party tab, the human pastes `scripts/state-snippet.js` into the
DevTools console and calls `__snapState('<selector>', { name })`; it produces the same JSON on
the clipboard. Gotchas the header comments carry: an anchor-positioned portal serializes empty
(capture the portal's target too); a viewport-unit shell grows under a zoomed mount (pin it).

## Gates — `gates.mjs`

```
node scripts/gates.mjs <slug> [--root dir] [--no-paint-diff] [--expect-selector <sel>]... [--interactive <sel>]... [--name <string>]... [--pii <regex>]... [--currency $] [--json]
```

Report-only. Every finding is a WARN; a gate that cannot run prints `NOT RUN` with the reason,
because a silent skip reads exactly like a pass. Writes `gates.json`; on a paint WARN it also
writes `gates-frozen.png` beside `live-reference.png` so the two PNGs to compare both exist.
The page is loaded with the CSP bypassed so a leftover CSP `<meta>` cannot blank the page the
other gates measure; G7 still reports it, and a real mount would look worse than the gates did.
`--interactive <sel>` **replaces** the default overlay set (`[role=menu]`, `[role=listbox]`,
`[role=dialog]`, `[class*=dropdown]`, `[class*=popover]`, `[class*=menu]`, `[class*=tooltip]`).

| Gate | Checks | The defect it catches |
|---|---|---|
| G1 geometry | frozen scrollHeight vs the live `doc_height` freeze recorded (growth > 20 %); without a live height, > 3× the viewport | hidden overlays serialized expanded into a 32,000 px page. A long landing page that was long live passes, and the note tells you the `h=` to mount at |
| G2 paint diff | `live-reference.png` vs a fresh render, brightness + stddev per side, mean abs diff > 8/255 | structural checks pass on a visually destroyed page. **Cleared only by looking at the two PNGs or fixing the capture, never by explaining it.** NOT RUN for an ingested save (no live reference) |
| G3 assets | every 4xx / 5xx / failed request while loading, plus assets that were served but did not decode (0-byte or mistyped files) | icon fonts as empty boxes, missing webfonts, a tracker pixel that fails on every mount |
| G4 locale | selected phone flag, DD/MM/YYYY, non-target currency | the capturing machine's locale shipped through four QC rounds |
| G5 stacking | ancestor / sibling `transform` / `filter` / `contain` around menus, popovers, dialogs; stripped presentation when shown | overlays trapped under later content whatever their z-index; a reveal target with no box. Dropdowns and tooltips that were hidden at capture time often show "no box when shown": read the finding against the beats that need them, it is not a verdict on the page |
| G6 canvas | rasterized canvases, and live `<canvas>` left by an ingest (no browser ran, so nothing painted them) | a region that looks right and is dead |
| G7 leftovers | CSP meta, `<base>`, scripts, inline `on*` handlers, `crossorigin`, external stylesheets, iframes, noscript notices, missing `--expect-selector` | console errors the film can never remove; product JS firing on the first click; a missing admin menu |
| G8 personal data | emails, greetings, `--name` strings, avatar images and the name-like text beside them, long link lists in nav / aside / history / recents, `--pii` | an account name and the account's chat history in a pushed snapshot. Heuristics fire on product copy too: "Welcome Mats" or "Welcome Panel" read as greetings, a mega-menu reads as a history list, a blog thumbnail as an avatar. Every G8 line needs a human read; the gate tells you where to look, not what to cut |
| G9 viewport-unit shell | `vw` / `vh` / `dvh` on the shell itself (`:root`, html, body, main, root layout) — not on a modal inside it | the shell grows N× under a zoomed mount (~400 px drift per frame) |

The bar a gate serves is "does it behave like the product on camera", not "is the data in the DOM".

## Mount test — `serve.mjs` + `mount-test.html`

```
node scripts/serve.mjs --root <snapshots root>
# open the printed URL: /__skill/mount-test.html?snap=/<slug>/index.html&w=1440&h=900&zoom=1.8&click=<sel>
```

The page mounts the snapshot in an iframe at native size, runs one scale + translate camera move
onto the `click=` element, glides a fake cursor to it and clicks it, and shows a HUD with the
document size, the element's stage rect and the iframe's console error count. If this page shows
the snapshot with a camera move and zero errors, the snapshot is mountable in any tool. Pass
`h=<doc_height>` (from `meta.json` or the HUD) when the target sits below the first screen; the
iframe paints only its native height. In a Git Bash / MSYS shell the `snap=/slug/...` value gets
rewritten to a Windows path on the command line: paste the URL into the browser or set
`MSYS_NO_PATHCONV=1`.

## Manifest — for tools that are not HTML

```
node scripts/manifest.mjs <slug> [--root dir] [--viewport WxH] [--dpr 2] [--min-size 8] [--select <css>] [--all]
```

A snapshot can also be rebuilt as native layers in After Effects, Figma, Remotion or Claude
Design instead of mounted as an iframe. For Claude Design this is the only route: its exporter
serializes the stage to svg/foreignObject, so a live iframe exports empty; the deliverable for
that target is the manifest (measured layers, real text, PNG crops) plus `page-full.png`, and the
build recreates the screen with real data instead of inventing rows. Real Claude Design projects
redrew every captured screen as a React mock with hand-typed geometry constants; the manifest's
measured boxes and real text ARE those constants — copy them — and `page-full.png` at stage scale
is the tracing image. The manifest is what that rebuild needs, learned from a real After Effects
build: text anchored at centre for every justification, fonts resolved by name on the machine,
hidden and off-screen elements coming through, no per-element assets. The script serves the
frozen page the way `gates.mjs` does, walks the rendered DOM at the viewport and writes:

- `manifest/layers.json` — `page` (css_width, css_height, viewport, dpr); `fonts[]` (family,
  weight, style, `file` = the localized path under `assets/` when the snapshot carries the
  `@font-face`, else `system:<name>`); `layers[]` in paint order, bottom first, each with `id`
  (the element's id or tag + nth path), `selector`, `type` (text | image | svg | shape |
  container), `box`, `parent`, `opacity`, `fill` (colour or gradient string), `stroke`,
  `radius`, `shadow`; for text: content, font family / size / weight / style, colour, line
  height, `text_align`, `measured_width_px` (a canvas in the page, same font) and
  `baseline_offset`; for rasters: `image` (src, natural size, object-fit) and `raster`.
- `manifest/raster/<id>.png` — one PNG per raster element (img, svg, canvas, background image):
  an element screenshot at `--dpr`. A background-image element with children is shot with the
  children hidden, so the PNG is the background alone and the children stay native layers.
- `manifest/page@2x.png` — the full page at `--dpr`.

**One coordinate space:** every box is CSS px in page coordinates (0,0 = the top of the
document, not of the viewport); rasters are the same boxes at `--dpr`. A tool that anchors text
at centre places left- or right-aligned text from `text_align` + `measured_width_px`.
`--select <css>` limits the walk to one widget, `--min-size` drops specks (under the size in
both dimensions), `--all` lists hidden, off-page and clipped elements with `visible: false`.

Two known limits. Z-order is best effort: stacking contexts and z-index are resolved from the
DOM (in-flow, then positioned, then z-index ascending, document order inside each); floats and
inline / block interleaving are not modelled. Text with mixed inline styles is one layer with the
first run's style: an inline `<a>` or `<b>` inside a paragraph folds into the paragraph and
loses its own colour. `::before` / `::after` content is not emitted either (a pseudo-element
has no readable box), so icon fonts drawn that way are missing from the manifest.

## Interactivity — `interactivity-kit.js`

Capture strips scripts, so a snapshot is display-only until behaviour is re-added. The kit ships
the architecture with an **empty registry**: `SnapKit.register({ label, event, match, apply,
source, verified })`, delegated listeners, a custom overlay for native `<select>` (an OS popover
cannot be drawn by a synthetic cursor), `fadeSwap`, and the rules: the final state is reached
**synchronously** (no rAF / timers / transitionend gating), no `Date.now`, no `Math.random`, no
`fetch`. Every registration carries provenance: `source: "source-code" | "captured" |
"synthetic"`.

`references/discover-transitions.md` is the procedure for a new product, three paths in this
order:

1. **Source code — the default.** Ask one question: *"Is the product installed locally, and may I
   read its source?"* For a team filming its own product the answer is almost always yes. Locate
   it (WordPress: `<site path>/wp-content/plugins/<slug>/`, the site path from the project's site
   registry or the user), read the handler for the control the film needs, write the registration
   from the DOM writes it performs, tag `source-code`. Captures show states; source shows rules.
2. **Playwright before/after diff — secondary, needs a go.** Say what it costs first (minutes per
   control, two captures, the live site up and drivable) and wait for the go. Real input events,
   capture before and after, diff, `apply()` from the diff, tag `captured`. Never on a
   third-party logged-in session.
3. **Synthetic** — tagged as such, never dressed as a capture.

A display-only snapshot with no registrations is a valid deliverable. A fossil keeps its live
`href`s: a click on an `<a>` navigates the iframe to the live site, which refuses to be framed.
`serve.mjs` and `mount-test.html` intercept anchor clicks and form submits on the capture phase;
a film's click must be owned the same way (the kit or the film's handler decides what a click
means).

## Order of work for a new snapshot

1. Decide the path (table above). For B, the human saves first.
2. Capture: `freeze.mjs` or `ingest.mjs`. Read the notes it prints.
3. `gates.mjs <slug>`. Open the two PNGs on a paint WARN. Fix the capture or record the WARN
   with a reason; never argue it away.
4. Personal data (G8) clean, or every hit listed with the film-time selector that neutralizes it.
5. Needed states: `states.mjs` (own site) or the console snippet (third-party tab).
6. `serve.mjs` + `mount-test.html` with the film's first camera target and click.
7. Every trigger the storyboard names on this screen (`triggers` in `screens-needed.json`):
   confirm the target is in the fossil, and for a switch or checkbox flip `checked` and watch
   the label and track follow (a `:checked` rule the capture stamped over goes blank). Write
   the verified selectors to `<slug>/targets.json` — `{"the Enable Log switch": "#…"}`, or
   `{"selector": "#the-list .row-title", "text": "#1042"}` to pick a row by its text — for every
   word the storyboard's `fill-anchors.mjs --list` names (anchors and presses), then run
   `node scripts/targets.mjs <slug>`: it measures each into page px and reports a miss. Record a
   target that is not there in `decisions.md`; never invent it.
8. Rasters the storyboard flags (`our.rasters_needed` after `fill-anchors.mjs`: a macro landing above
   2× on real UI, the carrier of a morph into editorial): `node scripts/manifest.mjs <slug> --select
   "<selector>" --dpr 4` writes the crop into `manifest/raster/`; an iframe raster reads soft above 2×.
9. Only then hand the slug to the film.

## Privacy

- Capture only pages you are entitled to show. Never a page for someone else.
- Redact before the file leaves the machine; G8 before any commit.
- Greetings, account names and history titles are neutralized at film time by selector. The
  captured DOM is never edited to hide them.
