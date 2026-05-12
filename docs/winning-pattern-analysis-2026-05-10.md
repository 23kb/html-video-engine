# Winning pattern analysis — 2026-05-10

Audit input: 3 winners (`wpforms-ai-prompt-open`, `wpforms-rest-api-overview-polished`, `build-forms-faster-with-wpforms-ai`) and 3 failures (`wpforms-ai-board`, `wpforms-ai-announcement`, `wpforms-ai-zlyvs`).

---

## A. The winning pattern

**Architecture is not the variable.** Two of three winners are manifest+chapters running through the engine (`wpforms-rest-api-overview-polished`, `build-forms-faster-with-wpforms-ai`). One is single-HTML (`wpforms-ai-prompt-open`). What they share is something deeper than file shape.

### A1. Single subject per beat, real DOM as the camera target

In `wpforms-ai-prompt-open/index.html:154-168` the entire video is a **single morphing host element** — `#cta` — that progresses through Button → Input row → Sullie pill → Chat panel by tweening `width / height / borderRadius / backgroundColor / position` over 12 seconds. There is no overlay chrome, no checklist, no tweaks panel, no comment modal. One thing on screen, transforming.

The two manifest videos do the same thing structurally — each chapter is *one* product moment. `videos/wpforms-rest-api-overview-polished/manifest.json:16-23` lists six chapters, each ~9-12s, each focused on one curl/response pair:

```
"intro-cold-open"            (curl typed → 6 wireframe icosahedra burst)
"postintro-abilities-surface"
"auth-and-list-forms"        (curl + admin Forms list)
"get-form-drill-in-v2"       (curl + form schema drill)
"search-entries-constellation"
"mcp-outro"
```

The build-forms manifest (`videos/build-forms-faster-with-wpforms-ai/manifest.json:44-54`) is the same shape: 9 scenes, each one beat. **No chapter tries to show two things.**

### A2. Real iframe + DOM puppetry, never fake UI

`wpforms-ai-prompt-open/index.html:477-482` mounts the real `wpforms-ai-builder-empty` snapshot as an iframe and then *injects HTML into the iframe's own chat list* (lines 638-680) so the snapshot's natural chat panel reads as "user submitted, AI is thinking." It doesn't paint a fake chat — it puppeteers the real one.

`build-forms-faster-with-wpforms-ai/chapters/scene-2-add-new.js:170-185` injects CSS into the real iframe document (`ifrDoc.head.appendChild(s)`) to add a conic-gradient ring around the real `#wpforms-template-generate` card. The card is the real captured one. The hover ring is editorial. **Editorial decoration on real DOM, not editorial replacement of DOM.**

`wpforms-rest-api-overview-polished/chapters/auth-and-list-forms.js:32-39` defines the form data inline from "forms ACTUALLY in the admin-forms-overview snapshot — keeps the JSON response in sync with what the cloned admin table will show." The ID `55` ("Contact Us form") later becomes the row Ch.4 drills into. **Editorial content is keyed to snapshot reality.**

### A3. Camera moves are timeline-decomposed, not single-tween

In `wpforms-ai-prompt-open` the dolly-back from morph-host to full mac-frame is a single named CustomEase (`'dolly-back'`, line 616: `'M0,0 C0.16,0.20 0.20,0.95 1,1'` — slow start, fast settle), but the move **itself** runs in parallel with three other tweens on the same beat (lines 953-958: opacity + scale + filter brightness all simultaneously). The camera is one of *four* coordinated tracks — never alone.

`build-forms-faster-with-wpforms-ai/chapters/scene-2-add-new.js:160` does manual `zoomTo` then customizes with explicit `level: 1.4, pad: 34, duration: 550`. It does not call zoomTo and walk away — it then animates the cursor via `cursor.glideTo(sel.generateCard, { via: { x: 1700, y: 700 }, wait: 880 })` (line 239) with an explicit `via` waypoint to produce a curved arc. **Single-control-point cursor flights are how the failures ended up "frenzy" (see C2 below).**

`wpforms-rest-api-overview-polished/chapters/intro-cold-open.js:253-259` decomposes phase 5 into a multi-track sub-timeline: camera dolly-back AND label fade AND wireframe opacity AND emissive intensity all on one timeline starting at the same instant.

### A4. Custom-named eases, not stock cubic-bezier

Every winner registers and names its own eases. `wpforms-ai-prompt-open/index.html:611-616`:

```
CustomEase.create('cinematic-whoosh', 'M0,0 C0.10,0.0 0.20,0.05 0.40,0.20 ...');
CustomEase.create('cinematic-rise',   'M0,0 C0.16,0.04 0.18,0.99 1,1');
CustomEase.create('cursor-arrival',   'M0,0 C0.10,0.05 0.30,0.95 1,1');
CustomEase.create('dolly-back',       'M0,0 C0.16,0.20 0.20,0.95 1,1');
```

Each ease answers a *narrative* question (cursor arrival = mostly-overshoot-near-end, dolly-back = slow start fast settle). `power2.out` does not appear as the only ease in any winning beat. The kit-shaped runtime in `videos/build-forms-faster-with-wpforms-ai/chapters/_kit.js` (only 154 lines) and the fat rest-api kit (894 lines) both register named eases per beat shape.

### A5. Atmosphere is minimal and animated, not loud and static

`wpforms-ai-prompt-open/index.html:46-83` defines exactly **three** blooms (b1, b2, b3) with `mix-blend-mode: multiply` / `screen`, all under `filter: blur(70px)`, all with subtle yoyo drift (lines 738-740: 5–6s sine.inOut, ±40px). Plus an 8fps grain canvas (lines 683-700). That is the entire atmosphere. No dot-grid, no vignette, no "kit."

`build-forms-faster-with-wpforms-ai/chapters/scene-1-hook.js:32-46` has a similar pattern: three radial-gradients in a single CSS background + 6 hard-coded "frags" (frosted blurry rectangles at fixed positions). Atmosphere is a fixed asset — not a system.

### A6. Branding is brand-orange `#E27730 / #d54e21` reserved for moments, not continuous

The rest-api postmortem (`videos/wpforms-rest-api-overview-polished/postmortem-ch1.md:18-20`) calls this out explicitly:

> "The brief reserved `#d54e21` for two macro moments (Ch.2 central node, Ch.6 wordmark). I missed that the literal token 'wpforms' appearing in every curl URL is itself a brand touchpoint that wants the color."

Brand-orange is not a default — it's a punctuation mark. In the winners, the dominant palette is purple (`#7a30e2`, `#5c24a9`, `#b886f5`) for AI moments and blue (`#0399ED`, `#056AAB`) for ambient/atmosphere; orange shows up as the gradient terminator (e.g. `scene-1-hook.js:63` `linear-gradient(96deg, #0399ED → #056AAB → #E27730 94%)` — orange is at 94%, the *end* of the gradient).

### A7. Pacing: 1 second hold per landing, then micro-zoom

The board lessons file is explicit (`videos/wpforms-ai-board/LESSONS.md:51-52`):

> "Camera arrived AND immediately micro-zoomed on same frame" → "1s hold at panel-wide pose after each landing, then micro-zoom."

You see this in the prompt-open beat sheet (lines 919-921: 0.20s hold breath after pill arrives, before pill starts traveling). You see it in build-forms (`scene-2-add-new.js:236` — `await sleep(280)` between caption reveal and cursor glide; line 288 — `await sleep(900)` for hover settle before clicking).

---

## B. Why `wpforms-ai-prompt-open` read as "closest to what I want"

The actual choreography of `wpforms-ai-prompt-open/index.html` decomposed:

| t | beat | what's happening |
|---|---|---|
| 0.2–1.4 | button arrival | `#cta` (purple pill, "Generate with WPForms AI" + spark icon) scales 0.88→1.0 with `back.out(1.4)`, words stagger in with `power3.out`, then a tiny 1.1s yoyo breathe (line 767) |
| 1.4–3.0 | cursor flies in | 3 keyframes: `(1380,620) → (1100,540) → (830,440) → (640,360)` with `cursor-arrival` ease (line 776). Click ring at impact (line 786). Button background flashes purple-deep `#5c24a9` for 100ms (line 792) |
| 3.0–4.4 | morph: button → input | btn-label fades + blurs out, `#cta` tweens `width:680→1180, height:120→260, borderRadius:60→14, backgroundColor: purple → #f6f7f7`. The send button springs in with `back.out(1.6)` |
| 4.4–6.4 | typing | per-char span reveal at 72ms/char for "customer feedback form", caret blinking via separate `repeat:-1` timeline driven by `steps(1)` |
| 6.4–7.0 | send activates | `backgroundColor: #a7aaad → #7a30e2`, scale `1 → 1.12 → 1` yoyo (line 854) |
| 6.5–7.6 | cursor returns | 3 keyframes again, click ring + send-press squash |
| 7.5–7.9 | send shows internal spinner | 400ms — the real WPForms thing |
| 7.9–8.3 | input row morphs to Sullie pill | `width:1180→680, height:260→120, borderRadius:14→60, backgroundColor:white`. Sullie content `back.out(1.4)` |
| 8.3–9.5 | Sullie pill shrinks AND travels in parallel | `width:680→120, height:120→120 (square), top:360→378, left:640→240` over 1s with `power3.inOut` — single tween, two motions |
| 8.3–10.3 | mac-frame dolly-back parallel | `opacity:0→1, scale:0.5→1, filter: brightness(.55) sat(.85) → brightness(1) sat(1)` over 2s with the named `dolly-back` ease (line 957) |
| 9.5–10.3 | circle morphs into chat panel | `width:120→380, height:120→604, borderRadius:60→0`. `chatFinal` opacity 0→1 |
| 10.3–12.0 | end hold | iframe is fully visible with the chat-panel HTML in slot |

**What this gave the user that storyboard-driven didn't:**

1. **Continuous identity transformation.** A single DOM node carries the user's attention from the trigger button all the way to the final chat panel. The viewer doesn't switch focus — they watch one thing become four things. No system can decide to do this from a storyboard prompt unless the storyboard literally says "morph one element through these four states." In the failed videos, every beat is a discrete element appearing/disappearing.

2. **Parallel composition, not serial choreography.** Lines 8.3–10.3 have **three separate things moving at the same time**: the pill is shrinking + translating AND the mac-frame is dollying-back + brightening AND the cursor has already left. A storyboard table reads beats serially; this video runs them in parallel. The rest-api video has the same property in `intro-cold-open.js:212-224` — burst nodes scale-in AND wireframe materials fade up AND labels fade in AND continuous rotation starts, all at t=0.

3. **The cursor flies in twice on a 12-second timeline and isn't the protagonist.** In the failures, cursor flights eat 1.5–2 seconds each and become the action. Here cursor is a 1.5s gesture, then it leaves. The morph is the story.

4. **The end-state is a real product screen.** At t=10.3 the iframe is the actual `wpforms-ai-builder-empty` snapshot with its real chat list HTML replaced — no editorial overlay survives the final beat. The viewer's last second is "this is the actual product, mid-task." That's the payoff that makes the title "WPForms AI" pay off as a product, not as a graphic design.

The hand-prompted workflow gave him control over **exactly** which element morphs into which element. That's the thing the storyboard table cannot encode — table rows describe states, not the connecting tissue between them.

---

## C. The failure pattern

Three different failures, three different surface modes — and the same defects.

### C1. They paint editorial chrome ON TOP OF the iframe instead of decorating it

`wpforms-ai-announcement/index.html:206-279` defines a `.checklist` with five hard-coded `<li>` items ("Pick fields from prompt", "Set required + validation", etc.). Lines 657-671 render it in DOM. Lines 1170-1176 mark each item done with strike-through. **None of those items is in the actual WPForms AI flow.** It's invented progress UI.

`wpforms-ai-announcement/index.html:281-367` adds a `.tweaks-panel` with theme swatches, column slider, "Conditional logic" toggle, "Anti-spam" toggle. Same pattern as `.comment-modal` (lines 369-440). All three are independent overlay panels with their own visual language, none of them exist in the real product, all of them slide in with their own choreography for ~5 seconds each.

`wpforms-ai-zlyvs/index.html:228-242` mounts a `.skeleton-layer` with SVG `<rect>`s drawn via DrawSVG to represent fields. The actual `wpforms-ai-builder-feedback-generated` snapshot already has real fields. The skeletons exist in parallel with the real ones, drawing then fading out. It's a workaround for not trusting the snapshot.

The winners never do this. `wpforms-ai-prompt-open` *replaces* the iframe's own chat-list HTML with its own (lines 645-670) — it does not paint over the iframe.

### C2. They give the camera too much work and too few control points

`wpforms-ai-zlyvs/index.html:649-682` (Beat 2): the camera moves from `scale 1.0 → scale 0.92 → scale 1.85, x: 0 → 460, rotation: 0 → 0.3°` in **two tweens** over 3.15s. Lines 808-832 (Beat 5): the camera does anticipation+flight+land+micro-zoom in **four sequential tweens** (`-40, 0` → `230, -8, scale 0.95, rotation 1.6` → `480, -10, scale 1.65, rotation 1.2` → `540, -12, scale 2.4, rotation 0.8`) over 2.15s. Read those numbers — every value changes on every tween. That's a pile of motion — not choreography.

The board's LESSONS.md:50 names the exact symptom:

> "Cursor 'frenzy' / `motionPath` with 3 control points, via at `Math.min(fromY, toY) - 40` (above target) → cursor arcs UP past target then BACK"

Compare to the winners' approach (`wpforms-ai-prompt-open/index.html:773-780`): three keyframes, all three on the *direct line* from start to target, ease `cursor-arrival`. No motionPath. The arc is in the **temporal** spacing of the keyframes (0.40s → 0.45s → 0.40s), not in geometric overshoot.

### C3. Atmosphere is loud, layered, and changes per beat

`wpforms-ai-zlyvs/index.html:71-102` has FIVE atmosphere layers: `.atmo-grad` (3-layer radial+linear), `.atmo-bloom-warm`, `.atmo-bloom-cool`, `.atmo-dotgrid`, `#grain`. And then the bloom **swaps** between warm and cool throughout the timeline (lines 736-738, 833-834, 913-914) — three color-of-air changes in 21 seconds. Cool swap to "signal AI is working." Warm swap to "signal user-action moment." The viewer never gets to settle into one space.

`wpforms-ai-board/index.html:78-120` has six atmosphere layers (`.atmo-grad` + warm bloom + cool bloom + grain + dot-grid + masked vignette via `mask-image`).

The winners use 3 blooms + grain. Period.

### C4. They use `power2.inOut` everywhere instead of named eases

`wpforms-ai-announcement/index.html:1144` `ease: 'power3.inOut'`, line 1147 `ease: 'power3.in'`, line 1163 `ease: 'power3.out'`, line 1179 `ease: 'power3.in'`, line 1182 `ease: 'power3.out'` — five lines, four power3 variations, no narrative voice. The single CustomEase defined at line 808 (`camera-flight`) is used exactly once.

The board postmortem-equivalent in LESSONS.md:65-66 calls the symptom: "Cursor speed kept being too fast. v1: 0.40s → after Round 2: 1.05s → still flagged Round 3 → still flagged Round 4 (frenzy)." Standard `power2.inOut` at any duration reads inhuman because the curve is symmetric and predictable. Named eases like `cursor-arrival` (`M0,0 C0.10,0.05 0.30,0.95 1,1` — extreme overshoot in last 30%) **read** as a hand reaching for a target.

### C5. They try to show 6+ things in the same time budget the winner uses for 1

`wpforms-ai-announcement/index.html:11-24` (the comment header in the source file) lists **12 beats in 41 seconds** including: title card, iframe push-in, cursor → textarea → click → typewriter, verb-pill mutation (Thinking → Drafting → Generating), snapshot swap with 6-field cascade, plan checklist (5 items strike-through), tweaks panel slide-in, comment modal with asterisk pop, hero push-in, pull-back to 6-up mosaic, endplate 1, endplate 2.

Compare to `wpforms-ai-prompt-open` 12 seconds, 1 morphing element, ~7 sub-beats but all are stages of the same object. The announcement ships the surface area of a 90-second video in a 41-second runtime, with no breathing room. Beats 6, 7, 8 (checklist, tweaks, comment modal) each get 4-5 seconds; the winner gives the morph alone 2 seconds.

### C6. The board failure is the cleanest "more polish wouldn't fix it" case

The board went through four rebuild rounds (LESSONS.md). Round 5 final flag: "1. zoom levels not zoomed enough. 2. make typing speed fast in snapshots." The lessons file then writes scale tables (lines 96, "cards 2.8–3.2, inputs 3.0–3.5, buttons 3.2–3.8, tiny 4.0–5.0") and typing-speed defaults (lines 60-61, "30–50ms/char"). After four rounds, the surface still wasn't zoomed enough. **Because the virtual-board layout puts four panels in a 2×2 grid at panel-wide scale 1.7, and the viewer's eye reads "I can see all panels" as wide-shot regardless of canvas scale.** The architecture itself capped the zoom. No amount of tweaking inside the architecture moves it past 6/10.

---

## D. The honest verdict

**The editorial direction can work in this repo, but only if "editorial" is reframed as decoration on real DOM, not as a separate visual layer.**

The smallest delta between a winner-shaped video and an editorial-quality video is:

1. **One subject per beat.** Drop the multi-panel virtual-board, drop the simultaneous overlay chrome (checklist + tweaks + comment), drop the mosaic. Each beat shows one product moment.
2. **Real iframe is the canvas.** Editorial stylesheet is *injected into the iframe's document head* (the build-forms scene-2 pattern), not painted as a sibling overlay.
3. **Camera moves use parallel tracks (3+) with named eases per move.** Not a single `gsap.to(camera, ...)` per phase.
4. **One element morphs across the whole timeline.** The `wpforms-ai-prompt-open` morph-host is the missing pattern. The failures all build a new element per beat instead of transforming the one from the previous beat.

The delta is achievable. It's also a **completely different authoring posture** from the storyboard tables that produced the failures. The storyboard format encodes "what happens at t=14.5" but cannot encode "this element from t=0 becomes that element at t=21." Until the authoring step thinks in terms of **identity continuity across time**, the table-driven storyboard will keep producing checklists+tweaks+modals — because those are the easy table cells to write.

**What I don't have evidence to say**: whether the storyboard-driven manifest videos (rest-api, build-forms) actually feel as good as `wpforms-ai-prompt-open` to the user. Both have shipped MP4s; both got "best video the system made" / "best" tags. But the user also identified `wpforms-ai-prompt-open` as the closest reference to the approved direction. That implies a gap exists between "best the system made" and "what was wanted." The system can produce 7-8/10 work; the hand-prompted single-HTML produced ~9/10. The delta there is the morph-host pattern, which the manifest engine does not yet have a primitive for.

---

## E. Remotion comparison readiness

Remotion is a frame-based React renderer. Frame N of the output is `<Composition>` rendered with `useCurrentFrame()` returning N. Animation = pure function of frame.

**What translates cleanly:**
- The morph-host pattern. Tweening `width / height / borderRadius / backgroundColor` over a master timeline maps directly to Remotion's `interpolate(frame, [0, 30, 60], [120, 680, 1180])`. The single-HTML `wpforms-ai-prompt-open` is essentially Remotion-shaped already — paused master timeline, scrubber, pure-function-of-time playback.
- Atmosphere drift. `gsap.to(.b1, { x: -40, ... yoyo })` → `interpolate(frame % cycleLen, ...)`. Trivial.
- Editorial overlays (frags, captions, callouts). Pure JSX.
- Camera transforms (translate/scale on `.scene-camera`). Direct 1:1.

**What does NOT translate cleanly:**
- **Real iframe + DOM puppetry.** Remotion renders to a Chrome headless context, so iframes load, but the iframe's own JS (the snapshot's GSAP, click handlers, internal animations) runs at live wall-clock — it does not respect Remotion's `frame`. The `injectIframeCSS` + `input.value = '...'; dispatchEvent(new Event('input'))` pattern still works inside Puppeteer, but the iframe's own frame state at frame N is only deterministic if the snapshot itself is pure. WPForms snapshots are not — they have CSS animations (the spinner keyframes line 555 of prompt-open), focus animations, hover effects. Those will tick on real time, not on `frame`.
- **The `mountThreeScene` 3D burst** in rest-api intro. THREE.js in Remotion is doable but you'd need to drive `three.scene.update()` from `useCurrentFrame()`, not from a `pausableRaf` loop. Big rewrite.
- **The `cursor.glideTo(selector, { via })` engine API.** That entire engine (`engine/engine.js`, `runtime/player.js`) is a wall-clock GSAP-driven system. Remotion replaces the player. The two manifest videos would need to be rewritten from chapter `effect: async ({ cursor, sleep, zoomTo }) => { ... }` callbacks to `<Sequence from={X} durationInFrames={Y}>` components.

**Verdict on Remotion**: it would preserve `wpforms-ai-prompt-open` essentially as-is (same morph timeline, same parallel composition, same named eases — just expressed in `interpolate()` instead of `gsap.timeline()`). It would **destroy** the rest-api and build-forms architectures because those depend on the engine's chapter-runner, which is wall-clock. Rebuilding those in Remotion is a 2-3 week port per video, not a refactor.

The honest move: **if the editorial single-HTML pattern is what's working, Remotion is the natural next step for that pattern specifically.** Keep the manifest+chapters engine for tutorial videos where the engine's `cursor`/`zoomTo`/`type` primitives earn their cost. Don't try to make the engine produce editorial — make editorial in Remotion. They're different toolchains for different jobs.
