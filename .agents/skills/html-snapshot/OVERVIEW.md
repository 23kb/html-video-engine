# html-snapshot

A portable Claude skill: freeze any web UI into a self-contained HTML snapshot that a video
tool can mount in an iframe and puppet. Three capture paths (public page, your own site behind
a login, a human SingleFile save of a logged-in SaaS page), state fragments with scoped CSS,
nine report-only quality gates, a bare mount-test page, an empty interactivity kit, and a layer
manifest for tools that are not HTML (After Effects, Figma, Remotion).

## Requirements

- Node 18 or newer
- `npm install` inside this folder (installs Playwright; chromium downloads on postinstall)

Nothing else. No network use beyond the page fetches Playwright makes for the capture.

## Install

```
# project-local
cp -r html-snapshot  <your-project>/.claude/skills/html-snapshot
# or user-wide
cp -r html-snapshot  ~/.claude/skills/html-snapshot
cd <that folder> && npm install
```

Then ask: "snapshot this page: <url>" or "freeze my admin page behind login" or "ingest this
SingleFile save".

## Quick start

```
# Path A — public page
node scripts/freeze.mjs https://example.com/pricing pricing
node scripts/gates.mjs pricing

# Path C — your own site, driveable session (credentials from the environment)
WP_USER=... WP_PASS=... node scripts/freeze.mjs https://site.example/wp-admin/admin.php?page=x builder \
   --login login.json --steps steps.json --wait-for "#the-panel" --preset wp-admin
node scripts/gates.mjs builder --expect-selector "#adminmenumain"

# Path B — a SingleFile save of a logged-in page
node scripts/ingest.mjs ~/Downloads/saved.html chat-home --expect "What should we work on"
node scripts/gates.mjs chat-home --name "Jordan Example"

# a state that exists only after interaction
node scripts/states.mjs https://site.example/app --slug app --name menu-open --target "[role=menu]" --steps open-menu.json

# prove it mounts
node scripts/serve.mjs --root snapshots
#   -> open /__skill/mount-test.html?snap=/pricing/index.html&zoom=1.8&click=.cta

# layers for a tool that is not HTML (After Effects, Figma, Remotion): boxes in page px, text + fonts, one 2x PNG per raster element
node scripts/manifest.mjs pricing --select ".pricing-table"
#   -> snapshots/pricing/manifest/layers.json + raster/<id>.png + page@2x.png
```

Snapshots land in `./snapshots/<slug>/` (or `--root <dir>`).

## Folder

```
SKILL.md                      the procedure Claude follows: path decision, bakes, gates, privacy
mount-test.html               bare mount page: iframe at native size, camera, fake cursor, one click
scripts/
  lib.mjs                     args, redaction catalog, asset helpers, static server, Playwright loader
  steps.mjs                   step-plan runner (click / type / fill / select / waitFor / ...)
  freeze.mjs                  Paths A + C
  ingest.mjs                  Path B
  states.mjs                  state fragments with scoped CSS
  state-snippet.js            the same serializer for a DevTools console
  gates.mjs                   G1-G9, report-only, writes gates.json
  serve.mjs                   static server for the snapshots root + mount-test
  manifest.mjs                layer manifest (layers.json + per-element rasters) for After Effects / Figma / Remotion
  interactivity-kit.js        empty registry + <select> overlay + fadeSwap (link from a snapshot)
references/
  gotchas.md                  every capture rule as IF / THEN
  discover-transitions.md     writing interactivity registrations for a new product
```

## Privacy

Capture only pages you are entitled to show. Run the gates (G8 personal data) before any
commit. Greetings, account names and history titles are neutralized at film time by selector;
the captured DOM is never edited to hide them.
