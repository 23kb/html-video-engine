# Tools + Scripts Optimization Audit — 2026-05-11

Phase 5c Track 2. Review-only. No code edits. Companion to the editorial-direction master plan and the engine-reading audit.

Scope: 25 source files under `tools/` (7,244 LOC) + `tts/generate.js` (202 LOC). Critical-tier files (`validate-video.js`, `render.js`, `preview.js`, `check-video-playback.js`, `lint-determinism.js`, `skill-context.js`) read line-by-line. Tier-2 files skimmed; surface findings only where the code is obviously simple or is the source of a cross-tool finding.

## Executive summary

**The biggest single lever is `validate-video.js` per-file I/O.** Each chapter file is `readText()`-ed and `parseChapter()`-ed 7–9 times in a single `--all` run because every lint pass re-walks the chapter list and re-opens the file (`tools/validate-video.js:959, 994, 1139, 1171, 1186, 1280, 1322, 1393, 1424, 1475, 1531`). With ~34 active video packages and a typical 5–10 chapters each, that's ~250 chapter files opened ~9 times = ~2,250 disk reads + ~2,250 regex parses per `npm run lint`. None of it caches across passes — `parseChapter()` is pure regex with no memoization. The same applies to `runVideoChecks()` reading manifest text on every lint sub-pass. **Concentrate the work**: read each chapter file once, parse it once, run all lints over the cached AST-light record. This alone should halve `npm run lint` wall-clock.

**The second-biggest lever is the `ffprobe` subprocess fan-out for narration-mp3 duration**. `lintAudioVsDuration()` calls `execFileSync('ffprobe', ...)` per beat with no on-disk cache (`tools/validate-video.js:1117`). The in-memory `mp3DurationCache` (line 1113) is a Map that lives only for the current process — lost between `validate-video.js` invocations. With 34 videos × ~6 narration mp3s/video = ~200 ffprobe spawns at ~100–300 ms each on Windows = 20–60 s of pure subprocess startup per `--all` run. The mp3 length is deterministic given file mtime; this should be a JSON cache keyed on `(path, mtime, size)`.

**The third lever is dead code.** Three Playwright probes (`probe-overlays.js` 734 LOC, `probe-transitions.js` 249 LOC, `transition-qc.js` 149 LOC) have **zero references** outside themselves — not in `package.json`, not in `CLAUDE.md`, not in `tools/skill-context.js`, not in any doc under `docs/`. `tools/render-snapshot-png.js` is mentioned in the original audit brief but does not exist in the repo. Several "operate-once" snapshot maintenance scripts (`backfill-snapshot-fonts.js`, `bake-sanitized-snapshots.js`, `clean-builder-snapshot-canvas.js`, `replay-inline-css.js`, `verify-baked.js`, `verify-sanitize.js`, `dump-sanitized.js`, `prune-snapshot-assets.js`) are surfaced only by stale `meta.json` audit-trail entries — none are in the documented author surface. Together: ~2,500 LOC + their Playwright dep load time, available to be moved to `tools/_archive/` so the daily author surface shrinks to ~10 files.

The remaining proposals (preview watcher scope, render Puppeteer cold-start, smoke-test deadline math, validator help/error wording) are smaller individual wins but cumulatively reduce token-burn per run by ~30%.

## Per-file findings

### `tools/validate-video.js` (1691 lines) — critical path

#### Repeated I/O — biggest perf finding

Each active chapter file is read from disk and regex-parsed in **at least seven** separate places per video:

- `validateChapter()` `:959, :994` — reads the file twice in this single function (once for selector-sheet provenance pass, once for chapter pass).
- `lintAudioVsDuration()` `:1139` — reads every chapter again for narration-beat scan.
- `lintRawRaf()` `:1171` and `lintRegisterTimelinePaused()` `:1186` — each opens every chapter + every `runtime/cinematic-*.js` file (12 such files, `runtime/`).
- `runVideoChecks()` per-chapter `styleExportRe` scan `:1280` — reopens chapter.
- Snapshot reference scan `:1322` — reopens chapter.
- Narration coverage scan `:1393` — reopens chapter.
- Camera-floor scan `:1424` — reopens chapter.
- `per-beat-narration` coverage scan `:1475` — reopens chapter.
- `classifyAuthoringModes()` `:1531` — reopens chapter.

Net: ~9 reads + ~9 regex passes per chapter, per video. `parseChapter()` (`:769–861`) is the canonical extractor and produces almost everything the sub-passes need (snapshot, mode, narration keys, beat ids, camera levels, deprecated calls, inline selectors). The lint passes ignore it and run their own regexes.

**Proposal:** introduce a per-process cache keyed on file path that holds `{ text, sha1, parsed }`. All passes consume the cached parsed record. Touched/untouched classification (`classify()` `:949`) already computes sha1 — reuse that work.

#### `ffprobe` subprocess on every `--all` run

`mp3DurationSeconds()` `:1114` shells out to `ffprobe` with no persistent cache. The in-memory `mp3DurationCache` Map (`:1113`) lives only inside one process. Every `npm run lint` re-spawns ffprobe ~200 times. ffprobe cold-start on Windows is ~100–300 ms.

**Proposal:** add a `tools/.cache/ffprobe-durations.json` keyed on `<path>::<mtime>::<size>`. Invalidation is automatic on mp3 re-generation. Falls back to ffprobe on miss. Reduces `--all` wall-clock by 20–60 seconds.

#### Catalog reload per chapter

`loadCatalog()` `:625` is called once per chapter via `validateChapter()` `:998`. A single video may have 6 chapters all referencing `builder-fields` — `catalog.md` (a 422 KB file at `snapshots/builder-fields/catalog.md`) is then read + regex-parsed 6 times. Across `--all`, the catalogs of common snapshots (`builder-fields`, `builder-settings-notifications`, `builder-settings-confirmation`) are re-parsed dozens of times.

**Proposal:** wrap `loadCatalog()` in a `Map<slug, catalogRecord>` cache. Catalog files are static within a single CLI invocation. Saves substantial time on 422 KB regex passes.

#### Selector-sheet pass parses chapter text twice

`validateSelectorSheet()` `:958` reads + parses each `_selectors/*.js` file. Then `validateChapter()` reads the chapter that imports it and runs its own selector resolution. The selector sheet is parsed once per sheet — that's fine. But the same chapter gets two reads (`:959` selector-sheet pass + `:994` chapter pass) when it doesn't need to.

**Proposal:** route the selector-sheet pass and chapter pass through the single shared text+parse cache.

#### Verbose import-boundary warnings — token burn

`findForbiddenImports()` `:503` and `classifyImport()` `:473` flag chapter modules that import `runtime/dom-prep.js`. Every flagged import emits **two** warnings in `validateChapter()` `:1054–1064` (one generic, one dom-prep-specific). For large videos with many chapters that import shared helpers, this floods the report with duplicated text the author has already learned to skip.

**Proposal:** collapse to one warning per chapter per import. The "see declarative prep" hint can be a single per-video footer line, not a per-import repeat.

#### Authoring-mode INFO lines noise on `--all`

`classifyAuthoringModes()` `:1513` emits one INFO summary + optional one INFO audio-cued list per video. With 34 videos that's 34–68 INFO lines on `npm run lint` with no actionable content unless `--strict-authoring` is set. They look like real findings in the grouped output and contribute to the "13 errors / 126 warnings" feeling.

**Proposal:** suppress the per-video INFO summary when `--all` is set unless `--strict-authoring`. Print one footer "authoring mode summary: 24 descriptor / 7 legacy / 3 mixed" instead.

#### Stack traces on expected error paths

`parsePrepLiteral()` `:241` throws `_parseFail`-tagged Errors that `parsePrepArrays()` `:410` catches and re-reports as one-liners. That's good. But `loadVideo()` `:898` and `findVideoDir()` `:864` will throw bare `new Error('No manifest at ...')` if you give a slug with no manifest, and `main()` `:1602` does not wrap loadVideo. That bubbles a Node stack trace into the author's terminal for what should be a one-line "unknown video slug" error.

**Proposal:** wrap the per-slug body in try/catch in `main()`, surface "unknown video slug: <slug>" + the list-snapshot suggestion the way `check-video-playback.js` already does.

#### Help / usage walls

`main()` `:1626` lists `--all --strict --strict-authoring --report --baseline --skip-lint <rule>` in the usage line. Two of these flags (`--strict-authoring`, `--report`, `--all-chapters`) are referenced **only in this file and one doc** (`docs/video-production-templates.md`, `docs/authoring-api.md`) — nobody invokes them in `package.json` and they are not surfaced by `tools/skill-context.js`. They're internal escape hatches.

**Proposal:** drop them from the default `--help` and gate them behind `--help-advanced`. Clean help reduces the chance the author flips a wrong flag.

#### Dead code candidates

- `lintRegisterTimelinePaused()` `:1183` — narrow heuristic that only matches the exact `const x = gsap.timeline(...)` declaration shape. Inline `registerTimeline(gsap.timeline({ paused:true }))` is allowed at `:1196` but `gsap.timeline` declared as `let` then later passed will miss. Either tighten or drop. Low signal; many false negatives.
- `DEPRECATED_VERBS_WARN_ONLY` `:535` — empty Set; the `setFieldOptions` retirement happened in Phase 6 Step 2 per the comment at `:528`. Code at `:1067` chooses warn vs error based on this empty set, which makes the conditional dead.

### `tools/render.js` (301 lines) — MP4 export

#### Chromium cold-start per invocation

`chromium.launch()` `:247` runs fresh every call. On Windows that's 1.5–3 s. For a `--seek` 5-second capture (~10 s total) launch is 30% of wall-clock.

**Proposal:** opt-in `--server` daemon that amortizes launch across multiple renders. Low priority — only matters for iteration.

#### Wall-clock screencast: 2 round-trips per frame

`wallClockRender()` `:163`: per loop, `page.evaluate({sceneDone, bootError})` + `page.screenshot({jpeg, quality:86})` + write + `setTimeout(10)`. Two round-trips per frame at 30 fps. `page.screenshot()` is synchronous to the page event loop — animations stall during capture.

**Proposal:** consider `CDPSession.send('Page.startScreencast', ...)` for streaming async JPEG frames. Complex; only worth it for long-render workflow.

#### Seek-mode `setTimeout` patch is opaque

`addInitScript()` `:257` rewrites `window.setTimeout` so `delay >= 5000` → `× 1000`. That's a 1000× slow-down of long timers so the seek loop drives time. Undocumented in the file.

**Proposal:** comment the contract; better, replace with a `window.__hfNow()` hook shared with the frame driver.

#### `assertSeekAllowed()` rejects multi-chapter editorial videos

`assertSeekAllowed()` `:228` requires `surface: 'editorial'` OR a single-chapter clamp. Multi-chapter editorial with `--chapter <id>` is rejected. Likely a bug; confirm intent.

#### Duplicated dev-server bootstrap

`probeServer()`/`ensureServer()` in `render.js:57–82`, `check-video-playback.js:57–79`, `transition-qc.js:25–35`, plus the probes. ~80 LOC duplicated.

**Proposal:** `tools/_lib/dev-server.js` exporting `ensureServer({port})`.

### `tools/preview.js` (102 lines) — dev server

#### Watcher scope is broad and could miss

`tools/preview.js:64` watches `['videos', 'runtime', 'engine', 'scenes', 'videos/_shared', 'vendor/gsap']`. The `videos` folder includes `videos/_archive/`, `videos/_examples/`, sandbox folders. Editing a snapshot doc or test video reloads the live preview. Two issues: (a) reload latency is non-zero on a noisy save, (b) it does NOT watch `tools/preview-client.js` or `tools/scrubber-html.js`, so changing the scrubber UI requires a manual server restart.

**Proposal:** narrow `videos` to the active video slug (`--video <slug>` already exists), and add `tools/scrubber-html.js`/`tools/preview-client.js` to the watch list with a server-restart action (not just iframe reload).

#### Default video is a phase-c sandbox

`parseArgs()` `:13` defaults `args.video = '_phase-c-editorial-pilot'` — an editorial sandbox, not the most-edited current video. Author always passes `--video`, so the default is never right.

**Proposal:** read the most-recent `videos/<slug>/manifest.json` mtime and default to that. Or drop the default and require `--video`.

#### Debounce is hard-coded and not tunable

`watcher.on('all')` `:72` debounces 150 ms. Hard-coded. On a slow disk or git checkout, multiple file events within 150 ms collapse fine; on rapid editor-driven saves the WS push lag is occasionally noticeable.

**Proposal:** `--reload-debounce <ms>` flag, default 150. Low-priority.

### `tools/check-video-playback.js` (239 lines) — smoke

#### Missing-resources allowlist is hardcoded

`expectedMissingResources` `:124–127` only contains `/sanitize/<slug>.js`. New opt-in modules will flood the report unless added.

**Proposal:** load the allowlist from `tools/check-video-playback.allowlist.json` or from the same opt-in registry `runtime/scene-helpers.js` consults.

#### Page.goto timeout coupled to `--seconds`

`page.goto()` `:173` uses `args.seconds * 1000` as the navigation timeout. For `--seconds 5` the goto would time out before the page loads.

**Proposal:** clamp goto timeout to `min(30_000, args.seconds * 1000)`.

### `tools/lint-determinism.js` (166 lines)

#### Rebuilds the file list on every CLI call

`targetFiles()` `:82` walks every `videos/<slug>/chapters/` + `videos/_shared/` + `runtime/cinematic-*.js`. No cache. For `npm run lint --all` after a single chapter edit, the linter walks ~250 files. Each is regex-scanned for `Date.now`, `fetch`, `Math.random`, `setTimeout`. The work is unavoidable for `--all` but is wasted when the author only changed one chapter.

**Proposal:** support `--changed-since <ref>` that uses `git diff --name-only` to scope. Pre-commit hook becomes much faster.

#### `hasSeededRng` heuristic over-broad

`hasSeededRng()` `:98` matches *any* function whose param contains "seed" — false positives happen when a chapter has e.g. `function plantSeeds(seedlings)`. Low-priority; current corpus likely fine.

#### Output format duplicates filename N times

`main()` `:152` prints `\n${rel}` per file then `${rel}:${line}` per finding. The filename appears once per file plus once per finding line — twice the necessary context.

**Proposal:** drop the per-line `${rel}:` prefix when the file is shown above. Saves visual clutter and tokens.

### `tools/skill-context.js` (146 lines)

This is well-scoped and cheap. Pure config + 2 directory reads. No I/O on the skill markdown bodies — only `existsSync`. Good token discipline already.

#### One stale list

`KNOWN_VIDEO_EXCLUDE` `:64` excludes 3 surveys-and-polls-v4 variants. `validate-video.js:46` excludes 4 variants (adds `surveys-and-polls-v4-final-synced`). Lists drift.

**Proposal:** factor into `tools/_lib/excluded-videos.js` exported as a single Set. Both files import it. (Cross-tool finding; see system-level section.)

#### `KEY_DOCS` lists `docs/INDEX.md` and `docs/authoring-api.md` only

Whereas `docs/` actually has many docs that authors hit during a session (`docs/render.md`, `docs/preview.md`, `docs/dom-prep.md`, `docs/selector-hygiene.md`). Skill-context surfaces only 2 — those 2 are correct anchors but the discoverability is thin. Low priority; skills compensate.

### Tier-2 tools (skim findings)

#### `tools/list-snapshots.js` (151)

Clean. `snapshotsReferencedByVideo()` `:43` is the right reference shape for a future shared chapter-walker with cached parse — single pass per file.

#### `tools/inspect-snapshot.js` (500)

Two modes (`--emit-selectors` markdown parser vs Playwright walker). Lazy-load of `playwright` `:391` is exemplary. The hand-curated `HIGH_SIGNAL_FIELD_TYPES` `:147` and `HIGH_SIGNAL_PANEL_FIELDS` `:123` will drift as WPForms ships new field types.

**Proposal:** drive starter allowlists from a manifest under `snapshots/_starter-allowlist.json`.

#### `tools/verify-selectors.js` (102)

Clean. No findings.

#### `tools/field-state.js` (259)

`parseInventory()` `:49` reads a 132 KB file on every CLI invocation. Cache to `tools/.cache/field-state.json` keyed on mtime. Saves ~30 ms per invocation; protects against future inventory growth.

#### `tts/generate.js` (202)

Clean. Skip-if-newer at `:113–119` correct. Multi-line `process.stdout.write` chain `:134, :153` produces output that's hard to grep — replace with discrete tagged lines (`[slug] step1`, `[slug] step2`, `[slug] done`).

#### `tools/generate-snapshot-catalog.js` (501)

Static parser. Skimmed; clean. Refreshes `snapshots/CATALOG.md` via `capture/generate-catalog.js`.

#### `tools/probe-transitions.js` (249), `tools/probe-overlays.js` (734), `tools/transition-qc.js` (149)

**No callers anywhere in the documented author surface.** Searched `package.json`, `CLAUDE.md`, `docs/*.md`, `tools/skill-context.js`, `.claude/skills/**/SKILL.md` — internal refs only. Probable history: built during a transition-QC investigation, never wired to the daily workflow.

`probe-overlays.js` is 30 KB with 14 CLI flags, all undocumented. **Proposal:** move all three to `tools/_archive/`. Saves ~1,100 LOC + Playwright surface.

#### Snapshot-maintenance scripts (operate-once)

One-time migration / repair tools, no documented author-surface caller:

- `backfill-snapshot-fonts.js` (338), `bake-sanitized-snapshots.js` (304), `clean-builder-snapshot-canvas.js` (341), `replay-inline-css.js` (165), `verify-baked.js` (47), `verify-sanitize.js` (138), `dump-sanitized.js` (43), `prune-snapshot-assets.js` (200) — references only in stale snapshot `meta.json` audit-trail entries.

**Proposal:** move to `tools/_archive/snapshot-maintenance/`.

#### `tools/preview-client.js`, `tools/scrubber-html.js`

Clean. `previewClientScript()` `:141` polls every 500 ms via `setInterval` — trivial cost; if it ever bites, switch to event-driven posting on state change.

#### `tools/_sanitize-forbidden.js`

Shared module already — good model.

## Cross-tool / system-level findings

### Duplicated dev-server bootstrap

`probeServer()` + `ensureServer()` is implemented in `render.js`, `check-video-playback.js`, `probe-transitions.js`, `probe-overlays.js`, `transition-qc.js`, `verify-sanitize.js`, `dump-sanitized.js`, `bake-sanitized-snapshots.js`, `clean-builder-snapshot-canvas.js`. Each variant has slightly different timeouts (30 retries vs 20, 250 ms vs 750 ms), different child-process options, different cleanup paths.

**Proposal:** `tools/_lib/dev-server.js` exporting `ensureServer({port, retries, timeout})` and `withServer(fn)` for guaranteed cleanup. Eliminates ~80 LOC duplication and standardizes Windows/Posix behavior.

### Excluded-videos list drift

`tools/validate-video.js:46` and `tools/skill-context.js:64` maintain similar but inconsistent exclude lists for `surveys-and-polls-v4-*` variants. `validate-video.js` excludes 4, `skill-context.js` excludes 3.

**Proposal:** `tools/_lib/video-set.js` exporting `KNOWN_VIDEO_EXCLUDE` + `listAllVideoSlugs()` + `findVideoDir()` (which also lives in `validate-video.js:864`, `lint-determinism.js:51`, `tts/generate.js`).

### Hardcoded paths instead of a config

Every tool resolves paths via `path.resolve(__dirname, '..')` then knows about `videos/`, `snapshots/`, `scenes/`, `videos/_shared/`. No central config. Renaming or moving any directory requires a sweep across ~25 files.

**Proposal:** `tools/_lib/repo-paths.js` exporting a single object: `{ ROOT, VIDEOS, SNAPSHOTS, SCENES, RUNTIME, ENGINE, KIT_SHARED }`. All tools import it. Cheap refactor; large maintenance dividend.

### Validator vocabulary lives in two places

`validate-video.js:65–210` duplicates the prep-op vocabulary spec from `runtime/prep-ops.js` because the validator is CommonJS and prep-ops is ESM. Comment at `:53–56` calls this out: "if you change one, change the other."

**Proposal:** convert `runtime/prep-ops.js` to dual-export (CJS shim or `.mjs` + `.cjs` pair) so the validator can `require()` the canonical spec. One source of truth. Edit-with-a-plan because `runtime/prep-ops.js` is in the protected `runtime/` tier per `CLAUDE.md`.

### No on-disk caching layer

Every tool that does any computation re-does it on each invocation. Candidates:
- `mp3DurationSeconds()` results
- `loadCatalog()` results (parsed catalog.md)
- `parseInventory()` field-state inventory parse
- `parseChapter()` per-file regex results when file mtime unchanged
- `targetFiles()` walk in `lint-determinism.js`
- snapshot index in `list-snapshots.js`

**Proposal:** `tools/.cache/` (gitignored) with a `cacheKey(path) → { mtime, size, hash }` helper. Each tool caches its expensive output. Single shared invalidation rule: invalidate on (path, mtime, size) change. Per-cache directory names so tools don't trample each other.

### Token-burn — output volume

`validate-video.js --all` produces a file-grouped report (`summarize()` `:1568`). For 34 videos × ~5 chapters × ~9 lints, the report often runs 200+ lines even when "everything is fine," because every video gets the per-video INFO summary + the (legacy) untouched-warning suppression tags. Each find is rendered with the bracketed level tag (`[ERROR]`, `[WARN]`, `[WARN(legacy)]`, `[INFO]`) and a blob of relative path + line — consuming ~20 tokens per finding × ~250 findings = 5,000 tokens for a "passing" run.

**Proposal:** in `--all` runs without `--report`, suppress all `[INFO]` lines and all per-video filename headers when the file has zero findings. Preserve actionable findings only. Add a `--summary-only` mode that prints `videos/<slug>: 0 errors, 2 warnings (touched)` lines, which is what the author wants 95% of the time.

### Help-text discoverability

Multiple tools have flags that no doc references (`--strict-authoring`, `--all-chapters`, `--report`, `--baseline`, `--skip-lint <rule>` in validate-video; `--allow-resource-404` in check-video-playback; `--settle`, `--headed`, `--timeout` in render). Authors don't know they exist; Claude doesn't either.

**Proposal:** every tool's `--help` output should list its flags with one-line descriptions. Add `--help` parsing to all tools that don't have it (currently only `field-state.js` does).

## Ranked-impact proposal list

Top 10, ranked impact / risk:

1. **Validator per-file cache** — Read each chapter file once per `validate-video.js` invocation; cache `{text, sha1, parsed}`; route all 9 lint passes through the cache. Halves `npm run lint` wall-clock. Touches `validate-video.js:949–1556`. Risk: medium — lints must agree on the parsed shape; baseline test ready (`tools/qc-baseline-2026-05-10.txt`).

2. **`ffprobe` on-disk duration cache** — `tools/.cache/ffprobe-durations.json` keyed on `(path, mtime, size)`. Saves 20–60 s per `--all`. Touches `validate-video.js:1113–1131`. Risk: low; cache miss falls back to ffprobe.

3. **Catalog-parse memoization** — Wrap `loadCatalog()` `:625` in a per-process Map. Saves repeat 422 KB regex passes. Touches `validate-video.js` only. Risk: low; catalog files are static within one run.

4. **Archive 3 unused probes** — `probe-overlays.js`, `probe-transitions.js`, `transition-qc.js` to `tools/_archive/`. ~1,100 LOC removed from author surface. Risk: low; nothing references them.

5. **Archive 8 operate-once snapshot maintenance scripts** — `backfill-snapshot-fonts`, `bake-sanitized-snapshots`, `clean-builder-snapshot-canvas`, `replay-inline-css`, `verify-baked`, `verify-sanitize`, `dump-sanitized`, `prune-snapshot-assets` to `tools/_archive/snapshot-maintenance/`. ~1,500 LOC. Risk: low; recoverable from git.

6. **Shared dev-server module** — `tools/_lib/dev-server.js` consolidates `ensureServer` from 5 callers. Standardizes Windows/Posix child-process handling. Touches `render.js`, `check-video-playback.js` (and the 3 archived probes if kept). Risk: low.

7. **Shared video-set module** — `tools/_lib/video-set.js` for `KNOWN_VIDEO_EXCLUDE` + `findVideoDir` + `listAllVideoSlugs`. Removes drift. Touches `validate-video.js`, `skill-context.js`, `lint-determinism.js`, `tts/generate.js`. Risk: low.

8. **Suppress passing-video noise in `--all`** — Drop per-video INFO summary lines + zero-finding file headers in default mode; add `--summary-only`. Cuts ~5,000 tokens off a clean `npm run lint`. Touches `validate-video.js:1568–1599`. Risk: low; opt-in `--report` preserves verbose output.

9. **`lint-determinism --changed-since <ref>`** — Walk only chapter files git-changed since `<ref>`. Pre-commit hook 5–10× faster. Touches `lint-determinism.js:82–96`. Risk: low.

10. **Validator prep-op vocabulary single-source-of-truth** — Make `runtime/prep-ops.js` requirable from CJS so `validate-video.js:65–210` doesn't duplicate it. Touches a protected file (`runtime/prep-ops.js`); needs an edit-with-a-plan. Risk: medium — protected core touch, but the change is a build-time export shape only, no semantic change.

## Open questions for Umair

1. **Daily author surface scope.** Is it OK to archive `probe-overlays`, `probe-transitions`, `transition-qc`, and the 8 snapshot-maintenance scripts? They're recoverable from git; the goal is to shrink the daily `tools/` directory listing to ~10 entries.
2. **Multi-chapter editorial seek.** `tools/render.js:228` clamps `--seek` to single-chapter or `surface: 'editorial'`. Is multi-chapter editorial seek intentional behavior or an oversight?
3. **`--strict-authoring` lifecycle.** Was this meant to graduate from opt-in to default, or remain a one-off escape hatch? If the latter, drop from default `--help`.
4. **`tools/.cache/` directory.** OK to add this gitignored directory and start writing per-tool caches? (No data loss risk.)
5. **Validator output truncation.** Is the current "every video shows in the report regardless of findings" surface intentional (acts as proof-of-coverage), or noise to remove?

## Risk inventory

| Proposal | Risk | Mitigation |
|---|---|---|
| Validator per-file cache | Medium | Run `tools/qc-baseline-2026-05-10.txt` against new code; results must be byte-identical except for ordering |
| ffprobe on-disk cache | Low | Cache miss falls back to ffprobe; `--no-cache` flag escape-hatch |
| Catalog memoization | Low | In-process only; no persistence concerns |
| Archive probes / maintenance scripts | Low | Git history preserves; provide `tools/_archive/README.md` documenting why archived |
| Shared dev-server module | Low | Lift logic verbatim; no semantic changes |
| Shared video-set module | Low | Re-export same constants; no semantic changes |
| Suppress passing-video output | Low | Hidden behind default; `--report` flag preserves verbose mode |
| `--changed-since` mode | Low | Opt-in flag; falls back to full walk |
| Prep-op single source | Medium | Touches protected `runtime/prep-ops.js`; requires explicit per-edit approval per `CLAUDE.md` strict tier |
| Help-text refactor | Low | Pure documentation; no behavior change |

End of audit.
