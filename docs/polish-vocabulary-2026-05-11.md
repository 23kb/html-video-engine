# Polish-Vocabulary Extraction — rest-api vs polished

## Inventory

| Asset | `wpforms-rest-api-overview` | `wpforms-rest-api-overview-polished` |
|---|---|---|
| Manifest | `surface: "mixed"`, `primarySnapshot: "admin-forms-overview"`, `hud: false`, BGM `/bgms/3.mp3` at `0.18`, default `breakStyle: "glide"`, no `swapStyle`, all intro/postIntro/teaser/outro null, chapters `intro-cold-open`, `postintro-abilities-surface`, `auth-and-list-forms`, `get-form-drill-in-v2`, `search-entries-constellation`, `mcp-outro` (`videos/wpforms-rest-api-overview/manifest.json:2`, `videos/wpforms-rest-api-overview/manifest.json:3`, `videos/wpforms-rest-api-overview/manifest.json:7`, `videos/wpforms-rest-api-overview/manifest.json:8`, `videos/wpforms-rest-api-overview/manifest.json:11`, `videos/wpforms-rest-api-overview/manifest.json:15`) | Same surface, snapshot, HUD, null intro/postIntro/teaser/outro, and chapter order, but slug is polished, BGM is `/bgms/5.mp3` at `0.03`, and defaults add `swapStyle: "flipBridge"` (`videos/wpforms-rest-api-overview-polished/manifest.json:2`, `videos/wpforms-rest-api-overview-polished/manifest.json:3`, `videos/wpforms-rest-api-overview-polished/manifest.json:7`, `videos/wpforms-rest-api-overview-polished/manifest.json:8`, `videos/wpforms-rest-api-overview-polished/manifest.json:12`, `videos/wpforms-rest-api-overview-polished/manifest.json:16`) |
| Chapter files | `_form-card-template.js` 126, `_kit.js` 824, `_selectors.js` 10, `auth-and-list-forms.js` 965, `get-form-drill-in-v2.js` 755, `get-form-drill-in.js` 690, `intro-cold-open.js` 367, `mcp-outro.js` 699, `postintro-abilities-surface.js` 496, `search-entries-constellation.js` 708 | `_form-card-template.js` 126, `_kit.js` 894, `_selectors.js` 10, `auth-and-list-forms.js` 965, `get-form-drill-in-v2.js` 755, `get-form-drill-in.js` 690, `intro-cold-open.js` 367, `mcp-outro.js` 707, `postintro-abilities-surface.js` 496, `search-entries-constellation.js` 708 |
| Narration | 18 files: matching `.txt`/`.mp3` pairs for intro, postintro, two auth beats, two get-form beats, three search beats, and outro | Same 18 narration filenames |
| Render outputs | none in package inventory | Two rendered MP4s under `render/` |

## Manifest diff

The manifest-level polish is small but important. The polished version keeps the mixed-surface structure and chapter order intact (`videos/wpforms-rest-api-overview/manifest.json:3`, `videos/wpforms-rest-api-overview-polished/manifest.json:3`, `videos/wpforms-rest-api-overview/manifest.json:15`, `videos/wpforms-rest-api-overview-polished/manifest.json:16`). It changes the bed from louder `/bgms/3.mp3` at `0.18` to quieter `/bgms/5.mp3` at `0.03`, which makes the piece feel less like a loop under a demo and more like restrained editorial score (`videos/wpforms-rest-api-overview/manifest.json:7`, `videos/wpforms-rest-api-overview-polished/manifest.json:7`). It also promotes snapshot-swap polish into defaults: original declares only `breakStyle: "glide"` while polished adds `swapStyle: "flipBridge"` (`videos/wpforms-rest-api-overview/manifest.json:8`, `videos/wpforms-rest-api-overview-polished/manifest.json:8`).  

There is no intro/postIntro/outro config difference: all remain `null` in both (`videos/wpforms-rest-api-overview/manifest.json:11`, `videos/wpforms-rest-api-overview-polished/manifest.json:12`). The kit/import difference is chapter-level: polished chapters import `mountSullieBug`, while originals either export per-chapter `breakStyle` or omit the brand bug (`videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:11`, `videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:20`).

## Per-chapter delta table

| Chapter | Delta | Category | Pre (rest-api) | Post (polished) | Evidence | Polish-vocabulary name |
|---|---|---|---|---|---|---|
| Shared manifest | Default swap polish centralized | (b) Motion/easing vocabulary | Only default `breakStyle: "glide"` | Adds `swapStyle: "flipBridge"` | `videos/wpforms-rest-api-overview/manifest.json:8`; `videos/wpforms-rest-api-overview-polished/manifest.json:8` | default-the-seam |
| Shared manifest | Audio bed is quieter and different | (a) Timing/pacing | `/bgms/3.mp3`, `volume: 0.18` | `/bgms/5.mp3`, `volume: 0.03` | `videos/wpforms-rest-api-overview/manifest.json:7`; `videos/wpforms-rest-api-overview-polished/manifest.json:7` | under-score-not-over-score |
| `_kit.js` | Persistent WPForms mascot badge | (c) Atmospheric/visual polish | Stage CSS goes from `.ra-wrap` to grain/sweep; no bug | Adds `.ra-sullie-bug` chrome, float keyframes, and `mountSullieBug()` | `videos/wpforms-rest-api-overview/chapters/_kit.js:88`; `videos/wpforms-rest-api-overview-polished/chapters/_kit.js:92`; `videos/wpforms-rest-api-overview-polished/chapters/_kit.js:277` | persistent-brand-anchor |
| `_kit.js` | Parallax atmosphere gains glow layer | (c) Atmospheric/visual polish | Parallax has two grid SVGs only | Adds cyan/violet radial glow SVG before grids | `videos/wpforms-rest-api-overview/chapters/_kit.js:342`; `videos/wpforms-rest-api-overview-polished/chapters/_kit.js:358` | glow-before-grid |
| `_kit.js` | Parallax repeats become finite | (b) Motion/easing vocabulary | `repeat: -1` for both parallax planes | Computes `repeats` from visible duration | `videos/wpforms-rest-api-overview/chapters/_kit.js:346`; `videos/wpforms-rest-api-overview-polished/chapters/_kit.js:409` | duration-bounded-ambient |
| `intro-cold-open` | Brand bug mounted in setup | (c) Atmospheric/visual polish | Setup injects stage/cursor CSS, then mounts layer | Calls `mountSullieBug()` before cursor CSS | `videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:26`; `videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:25` | branded-stage-presence |
| `intro-cold-open` | Parallax atmospherics turned on | (c) Atmospheric/visual polish | `mountAtmospherics()` and `runAtmospherics(gsap, atm, 9)` | Passes `{ parallax: true }` to both | `videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:33`; `videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:33`; `videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:71`; `videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:71` | atmosphere-depth-switch |
| `intro-cold-open` | Dead command hold trimmed | (a) Timing/pacing | Holds command 2000ms before cursor | Holds 900ms | `videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:107`; `videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:107` | no-dead-air-command |
| `intro-cold-open` | Curl exit becomes scale-takeover | (b) Motion/easing vocabulary | Fades curl with `filter: blur(8px)` over 0.5s | Uses `scale: 1.015`, 0.3s, no blur | `videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:207`; `videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:207` | takeover-scale-not-blur |
| `intro-cold-open` | Final title hold shortened | (a) Timing/pacing | Waits 2000ms before exit | Waits 900ms | `videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:315`; `videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:315` | land-then-leave |
| `postintro-abilities-surface` | Brand bug + parallax | (c) Atmospheric/visual polish | No bug, plain atmospherics | `mountSullieBug()`, parallax atmosphere | `videos/wpforms-rest-api-overview/chapters/postintro-abilities-surface.js:117`; `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:31`; `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:117` | branded-parallax-bed |
| `postintro-abilities-surface` | Mid-beat waits tightened | (a) Timing/pacing | Waits 500ms after node reveals and 600ms after API label | Waits 220ms and 240ms | `videos/wpforms-rest-api-overview/chapters/postintro-abilities-surface.js:352`; `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:352`; `videos/wpforms-rest-api-overview/chapters/postintro-abilities-surface.js:381`; `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:381` | trim-after-reveal |
| `postintro-abilities-surface` | Shared-scene handoff tightened | (a) Timing/pacing | Waits 300ms on target before handoff | Waits 80ms | `videos/wpforms-rest-api-overview/chapters/postintro-abilities-surface.js:456`; `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:456` | short-handoff-breath |
| `auth-and-list-forms` | Brand bug + parallax | (c) Atmospheric/visual polish | Plain `mountAtmospherics()` / `runAtmospherics` | Bug + parallax on mount and run | `videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:323`; `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:50`; `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:323`; `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:372` | persistent-branded-depth |
| `auth-and-list-forms` | Exit breath reduced | (a) Timing/pacing | 1300ms before fade | 500ms before fade | `videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:621`; `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:621` | exit-before-stale |
| `auth-and-list-forms` | Exit is less blurry/heavy | (b) Motion/easing vocabulary | `scale: 1.05`, `filter: blur(8px)`, 0.6s `power2.in` | `scale: 1.02`, 0.35s `sine.in` | `videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:636`; `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:636` | clean-exit-over-smear |
| `auth-and-list-forms` | Overview anchor hold tightened | (a) Timing/pacing | 400ms hex hold + 420ms local fade wait | 120ms + 180ms | `videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:650`; `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:650`; `videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:655`; `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:655` | snap-back-anchor |
| `get-form-drill-in-v2` | Form card becomes hero-sized | (c) Atmospheric/visual polish | `width: min(440px, 36vw)` and local `formW = 480` | `width: min(720px, 42vw)` and dynamic `620–720px` width | `videos/wpforms-rest-api-overview/chapters/_form-card-template.js:24`; `videos/wpforms-rest-api-overview-polished/chapters/_form-card-template.js:24`; `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:322`; `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:322` | readable-hero-card |
| `get-form-drill-in-v2` | Same three-step crystal camera remains | (b) Motion/easing vocabulary | Pan crystal -> focus -> station | Same structure retained | `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:244`; `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:244` | preserve-winning-camera |
| `get-form-drill-in-v2` | Exit breath and smear reduced | (a)/(b) Timing + motion | 1300ms pre-exit; card exits with 1.05 scale, blur, 0.6s `power2.in`; 400/420ms end waits | 500ms; 1.02 scale, no blur, 0.35s `sine.in`; 120/180ms waits | `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:477`; `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:477`; `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:486`; `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:486`; `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:499`; `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:499` | clean-fast-rejoin |
| `search-entries-constellation` | Brand bug added | (c) Atmospheric/visual polish | No bug mount | `mountSullieBug()` | `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:76` | brand-bug-continuity |
| `search-entries-constellation` | Concept hold cut hard | (a) Timing/pacing | Page-vs-offset narration hold 2200ms | Hold 1000ms | `videos/wpforms-rest-api-overview/chapters/search-entries-constellation.js:460`; `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:460` | narrate-and-move |
| `search-entries-constellation` | Overview/fade waits tightened | (a) Timing/pacing | 400ms after overview, 420ms after local fade | 120ms and 180ms | `videos/wpforms-rest-api-overview/chapters/search-entries-constellation.js:477`; `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:477`; `videos/wpforms-rest-api-overview/chapters/search-entries-constellation.js:481`; `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:481` | short-anchor-reset |
| `mcp-outro` | Outro hides inherited shared scene before finale | (c) Atmospheric/visual polish | No shared-layer hide in setup | Sets shared layer opacity/visibility to hidden | `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:60` | clear-the-stage |
| `mcp-outro` | Outro parallax enabled | (c) Atmospheric/visual polish | `mountAtmospherics()` / `runAtmospherics(gsap, atm, 11)` | `{ parallax: true }` in both | `videos/wpforms-rest-api-overview/chapters/mcp-outro.js:241`; `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:247`; `videos/wpforms-rest-api-overview/chapters/mcp-outro.js:257`; `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:263` | finale-depth-bed |
| `mcp-outro` | Final fade includes brand bug | (c) Atmospheric/visual polish | Fades only layer | Fades layer plus `ra-sullie-bug` | `videos/wpforms-rest-api-overview/chapters/mcp-outro.js:572`; `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:576` | whole-stage-out |

## Repeated patterns (Phase 5d motion-primitive candidates)

### 1. `persistent-brand-anchor`

```js
export function mountSullieBug() {
  let bug = document.getElementById('ra-sullie-bug');
  if (bug) return bug;
  bug = document.createElement('div');
  bug.id = 'ra-sullie-bug';
  bug.className = 'ra-sullie-bug';
  bug.innerHTML = '<img src="/assets/sullie.png" alt="WPForms Sullie" draggable="false" />';
  document.body.appendChild(bug);
  return bug;
}
```

Appears in `_kit.js` and is mounted in Ch.1, Ch.2, Ch.3, Ch.4v2, Ch.5, and Ch.6 (`videos/wpforms-rest-api-overview-polished/chapters/_kit.js:277`, `videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:28`, `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:31`, `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:50`, `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:68`, `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:79`, `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:58`). The original has no equivalent; its kit proceeds directly from wrapper CSS to grain (`videos/wpforms-rest-api-overview/chapters/_kit.js:88`). What makes this polished is not the mascot alone; it is a persistent brand coordinate that survives abstract Three.js scenes and REST code cards without shouting.

### 2. `parallax-glow-bed`

```js
const atm = mountAtmospherics({ parallax: true });
runAtmospherics(gsap, atm, 13, { parallax: true });
```

Polished enables this in Ch.1, Ch.2, Ch.3, Ch.4v2, and Ch.6 (`videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:33`, `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:117`, `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:323`, `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:160`, `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:247`). The original uses plain atmospherics in those same chapters (`videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:33`, `videos/wpforms-rest-api-overview/chapters/postintro-abilities-surface.js:117`, `videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:323`, `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:160`, `videos/wpforms-rest-api-overview/chapters/mcp-outro.js:241`). This reads polished because the atmosphere is no longer a flat sweep over a dark void; it has a low-frequency glow layer plus gentle grid drift.

### 3. `clean-fast-rejoin`

```js
await wait(500);
fadeTl.to(s.formCard, {
  opacity: 0, scale: 1.02,
  duration: 0.35, ease: 'sine.in',
}, 0.1);
revealSharedHex({ duration: 0.7 });
await panToOverview({ duration: 1.1 });
await wait(120);
gsap.to(s.layer, { opacity: 0, duration: 0.4, ease: 'sine.in' });
await wait(180);
```

This pattern appears in the polished exits for Ch.3, Ch.4v2, and Ch.5 (`videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:621`, `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:477`, `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:460`). Originals hold longer and often blur/scale harder (`videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:621`, `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:477`, `videos/wpforms-rest-api-overview/chapters/search-entries-constellation.js:460`). The polished move lets the visual land, then gets out before the viewer starts inspecting stale geometry.

## Camera moves

The core shared-camera vocabulary is the same in both kits: focus pose is `(crystal.x, crystal.y, z=3.5)`, overview pose is `(0,0,z=7)`, and station pose is `(crystal.x * 0.7, crystal.y - 1.8, z=6.5)` with default `expo.inOut` (`videos/wpforms-rest-api-overview/chapters/_kit.js:727`, `videos/wpforms-rest-api-overview/chapters/_kit.js:738`, `videos/wpforms-rest-api-overview/chapters/_kit.js:751`; `videos/wpforms-rest-api-overview-polished/chapters/_kit.js:792`, `videos/wpforms-rest-api-overview-polished/chapters/_kit.js:803`, `videos/wpforms-rest-api-overview-polished/chapters/_kit.js:816`). That means the approved delta is not “rewrite every camera move.” It is “keep the good camera grammar, clean up what surrounds it.”

| Chapter | Move | Pre | Post | Delta |
|---|---|---|---|---|
| Ch.2 -> Ch.3 handoff | Shared scene is mounted at the same list-forms crystal center before Ch.2 fades | Same camera concept | Same, but hold before handoff is 80ms instead of 300ms | Seam is preserved; dead air is cut (`videos/wpforms-rest-api-overview/chapters/postintro-abilities-surface.js:456`, `videos/wpforms-rest-api-overview-polished/chapters/postintro-abilities-surface.js:456`) |
| Ch.3 list forms | Station/overview return | `panToOverview({ duration: 1.1 })`, then 400ms hold, 420ms layer fade wait | Same `panToOverview`, then 120ms and 180ms | Same pose, tighter settle (`videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:647`, `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:647`) |
| Ch.4 get form | Focus -> collapse -> station | `panToCrystal(0.9)`, `focusSharedCrystal(0.5)`, `panToStation(0.9)` | Same | This was already winning camera grammar; polish keeps it (`videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:244`, `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:244`) |
| Ch.5 search | Focus -> wide constellation | `panToCrystal(0.9)`, `focusSharedCrystal(0.5)`, then camera z to 12 for 2.4s `sine.inOut` | Same camera body | Polish changes branding/timing around it, not the move itself (`videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:277`, `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:282`) |
| Ch.6 outro | Standalone Three scene at `cameraZ: 13` | Plain atmosphere | Parallax atmosphere and hidden inherited shared scene | The finale camera stays big, but the stage is cleaner (`videos/wpforms-rest-api-overview/chapters/mcp-outro.js:242`, `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:248`, `videos/wpforms-rest-api-overview-polished/chapters/mcp-outro.js:60`) |

No chapter adds rotation tilt or explicit scale-dip to the shared camera helpers. The reusable camera primitive here is therefore `focus-station-overview-with-short-anchor`: direct focus, content station, return to overview, then a short 120ms anchor before local-layer fade.

## Anti-patterns confirmed in unpolished version

1. **Infinite ambient repeats.** The unpolished kit uses `repeat: -1` for parallax planes (`videos/wpforms-rest-api-overview/chapters/_kit.js:346`). The polished kit computes bounded repeats from visible duration (`videos/wpforms-rest-api-overview-polished/chapters/_kit.js:409`). This is not one of the five named visual anti-patterns, but it directly violates the GSAP finite-repeat rule.
2. **Over-blur/smear exits.** The unpolished version repeatedly exits cards with `scale: 1.05`, `filter: blur(8px)`, and `power2.in` (`videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:636`, `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:486`). Polished reduces this to `scale: 1.02`, no blur, and `sine.in` (`videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:636`, `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:486`). This validates a new anti-pattern candidate: heavy blur exits make chapter returns feel like a transition effect rather than a clean rejoin.
3. **Dead holds after the point is made.** Unpolished waits 2000ms on the intro command, 1300ms before Ch.3/Ch.4 exits, and 2200ms on the page-vs-offset point (`videos/wpforms-rest-api-overview/chapters/intro-cold-open.js:107`, `videos/wpforms-rest-api-overview/chapters/auth-and-list-forms.js:621`, `videos/wpforms-rest-api-overview/chapters/get-form-drill-in-v2.js:477`, `videos/wpforms-rest-api-overview/chapters/search-entries-constellation.js:460`). Polished cuts those to 900ms, 500ms, 500ms, and 1000ms (`videos/wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:107`, `videos/wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:621`, `videos/wpforms-rest-api-overview-polished/chapters/get-form-drill-in-v2.js:477`, `videos/wpforms-rest-api-overview-polished/chapters/search-entries-constellation.js:460`). This validates “dead-air hold” as a real functional-vs-polished separator.

Of the five current `wpforms-motion-audit` anti-patterns, this pair does not cleanly exhibit 4-tween-everything camera, 5-6 stacked atmosphere layers, cursor frenzy, caret-typing layout drift, or purple-primary branding. The rejected version is not broken in the same way as `wpforms-ai-zlyvs`; it is mostly under-polished through missing persistent brand/atmosphere, loose waits, and heavy exit treatment.

## Verdict

The polish vocabulary here is surprisingly surgical. The approved video does not replace the workflow, rewrite the chapters, or invent a new camera system. It keeps the same REST actions and the same six-chapter arc, then improves the reading experience through persistent brand identity, deeper but still controlled atmospherics, quieter score, centralized seam handling, larger content surfaces, and faster exits.

Track A polish, in plain English: keep the viewer oriented, make the dark void feel alive, let product/code surfaces be readable at a glance, and never make the viewer sit on a frame after the idea has landed. The original is functional because it stages the right actions. The polished version is approved because it gives those actions a continuous visual world and removes the little frictions that make a viewer feel the machinery.

## Recommendations

Top Phase 5d extraction candidates:

1. `persistent-brand-anchor`: reusable fixed brand bug with subtle float and final-fade integration.
2. `parallax-glow-bed`: grain + sweep + scale push + finite parallax glow/grid drift.
3. `clean-fast-rejoin`: 500ms breathe, light `sine.in` exit, reveal shared anchor, 120ms overview hold, 180ms layer cleanup.

Top guardrails to add to skills:

1. Do not leave chapter-local `breakStyle` scattered when the manifest can define the default seam policy.
2. Avoid heavy blur+scale exits on product/content surfaces; prefer small scale, short duration, and clean opacity.
3. Audit every hold after a landing: if no new information appears, cut it toward 80-500ms unless narration truly needs it.
