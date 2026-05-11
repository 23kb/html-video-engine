# Editorial Video Session Retros — 2026-05-12

Synthesis of two editorial-video session retrospectives (Claude session + Codex session) on the Klaviyo editorial video. Both produced "horrible v1" builds that required substantial manual rescue. This doc extracts the failure modes + the proposed system rules so future sessions don't repeat them.

A third session (Claude continuation when Codex hit its limit) also worked on this video — separate retro pending. See `docs/codex-prompts/editorial-continuation-session-retro.md` for the questions.

## TL;DR

**Both sessions skipped the procedural skills (motion-audit) AND skipped the reference skills (primitives) at the right moment.** The rules existed in CLAUDE.md + skills + invariants — but as prose advisories, not as gates that fire BEFORE the next tool call. Both sessions hand-rolled approximations of canonical primitives, then needed manual rescue when Umair flagged the result as 0.5/10.

The strongest single learning, said almost identically by both sessions:

> "Promote soft rules to hard gates that fire at specific moments (session-start, before-first-write, before-show-user, before-sign-off). Soft rules in prose get rationalized past; hard gates that block the next tool call do not."

## Session 1 — Claude editorial v1

### Failure modes by category

| Category | What happened | Missing rule |
|---|---|---|
| **Hand-rolled cursor** | `tl.to(cursorEl, {x, y})` on manually-mounted SVG. Never imported `Cursor` from `motion-primitives.js`. | CLAUDE.md hard rule ("if about to write `gsap.to(cursor, ...)`, stop") existed but as a code-time check, not a session-start gate. |
| **Hand-rolled cameras** | Single-tween `tl.to(camera, {x,y,scale})` between fixed poses. Classic slide-projector — exactly the C-tier ceiling per motion-audit. | Same — hard rule existed but as code-time advisory. |
| **Fake/mocked UI** | Styled own facsimile of integration row, connection card, Klaviyo key panel. NONE used real snapshot DOM. Umair explicitly said "use real UI" — bypassed. | No "real UI proof" gate. Should be: before authoring inline DOM for any UI fragment, list which snapshot it derives from OR get explicit approval to fabricate. |
| **Native `<select>` for action dropdown** | `<select>` can't be opened by JS — viewer sees nothing when "user clicks dropdown." Knew the issue, shipped it anyway. | Editorial dropdown ≠ functional dropdown. Should be flagged in primitives lookup as an anti-pattern. |
| **"Morph chain" was classList + appendChild** | Element teleported between DOM containers with class changes. No geometric continuity. Not Flip. | Identity-continuity contract in storyboard format mentions Flip morphs — no enforcement that morph host transitions use Flip, not classList. |
| **Atmospheres too subtle** | Max opacity 0.18 on radial gradients over `#0a0e14` — visually nothing. | Storyboard called for "multi-stop gradients (3+ stops)" but no opacity floor. Need ≥0.30 on hero atmospheres. |
| **Two competing lockup identities** | Big "WPForms × Klaviyo" heading PLUS a separate lockup row with wordmarks below. Redundant. | No rule against double protagonists in the lockup. |
| **Caption stacking** | Three captions all positioned at `top: 56px; left: 64px` — overlapped when timing overlapped. | No layout sanity check. |
| **No micro-zooms** | Camera held at 0.58–0.66 throughout. No click-target dolly-in. | Audit S-tier criteria call for "inputs 3.0+, buttons 3.2+" but that's a sign-off criterion, not a build directive. Should be in storyboard format: "every click moment requires a micro-zoom or named exemption." |

### Skill usage (Claude session)

Via Skill tool, NOT just file-read:

1. `wpforms-marketing` — at session start ✓
2. `wpforms-gsap-rules` — only AFTER v1 was already in progress and Umair flagged it as broken
3. `wpforms-primitives` — only AFTER Umair said "scratch everything, read CLAUDE.md carefully" — rescue attempt, not before v1
4. `wpforms-motion-audit` — once, on v3 rescue build at Umair's explicit instruction. **Not on v1.**

Self-diagnosis: "I had access to the primitives skill index, I knew the libraries existed, and I still skipped the primitives skill until prompted explicitly. Same skill-bypass pattern as the codex session, possibly worse."

### Motion-audit on v3 rescue

Tier: **D**. Two ceilings:
- Overlay-painted-as-iframe-sibling → auto-D
- Re-invented-primitive → auto-B

Lower wins. If audited on v1, would have caught single-tween cameras (C cap) + re-invented cursor (B cap). **Umair would have seen the audit report before the broken build.**

### What the prompt should have said (Claude session's reverse-engineering)

In priority order:

1. **Hard write-time gate on primitives.** "Before writing any motion code (`gsap.to`, cursor element, caret type, camera move, dropdown open, toggle flick), invoke `wpforms-primitives`. Reading `motion-primitives.js` inline does not count."
2. **Mandatory `wpforms-motion-audit` on v1 before user review.** Should be: "No editorial / postIntro / cinematic build is shown to the user without an audit invocation logged on the build's commit." Hard gate.
3. **Real-UI proof gate for editorial work.** "For each station / UI fragment, prove derivation from a real snapshot or extracted DOM. Inline-styled facsimiles without snapshot source require explicit user override."
4. **Storyboard-format addition: per-beat primitive declaration.** For each interaction in each beat, name the canonical primitive. If 'inline DOM puppetry,' say so and justify.
5. **Anti-pattern catalog inside CLAUDE.md.** Short numbered list at the top: "DO NOT: hand-mount a cursor; single-tween a camera move; native-select for editorial dropdowns; mount overlays as iframe siblings; opacity <0.30 on hero atmospheres; ship without motion-audit." Re-read before each beat.
6. **Clone-and-customize rule has to have teeth.** "First write must be `cp reference/html-templates/<closest>.html videos/<slug>/index.html`. Anything else requires explicit user override before write."

## Session 2 — Codex editorial v1

### Failure modes by category

| Category | What happened | Missing rule |
|---|---|---|
| **Concept** | V1 over-indexed on "logo collision spectacle" instead of "premium integration connection." Technically executed the brief, but taste was off — too much event, not enough editorial clarity. | "Premium product announcement, not logo collision demo" needed as a concept rule, not implied. |
| **Brand** | Colors not wrong but generic-brand rather than WPForms/Klaviyo-specific. Logo + wordmark spacing not handled as a real lockup. | Brand canonical mentions colors + Sullie but not lockup composition rules. |
| **Motion quality** | Sequencing the worst issue. Cursor "teleport/jump" moments — used timeline calls and cursor glides without enough promise sequencing. | "Cursor.glide must be awaited before click/reveal" needs explicit articulation. |
| **Fake UI / DOM puppetry** | Big mistake: swapping iframes to show form state. Flashed + broke illusion. Correct approach: keep same live iframe, reveal/insert HTML inside it. Same mistake almost happened again with Klaviyo API-created state. | "No iframe swaps for state changes — same iframe + DOM puppetry" should be a hard rule. |
| **Atmosphere** | First atmosphere was decorative, not beat-driven. Changed, but not with narrative purpose. Better version uses scene-specific atmospheric states: intro dark/warm, WPForms light editorial, Klaviyo cooler SaaS gradient. | Atmosphere should be beat-driven, not decorative. Each scene needs its own atmospheric state. |
| **Copy / typography** | First headline weak. Font not premium. Text/logo spacing collapsed. Better version: text first with display face, logos supporting words rather than fighting them. | Typography-led intro should be the default pattern. |

### Skill usage (Codex session)

Used well (eventually):
- `motion-primitives.js` (Cursor especially) — too late, not cleanly at first
- `cursor-glide-via.html` + `cinematic-flight-inter-snapshot.html` — as QC references AFTER Umair explicitly pointed
- `klaviyo-quick-connect/index.html` as reference for DOM puppetry AFTER iframe-swap mistake called out

Treated too weakly:
- `wpforms-primitives` — should have been WRITE-TIME gate before any cursor/camera work, not "remember after issues appeared"
- `wpforms-gsap-rules` — followed parts, but async cursor/timeline mixing showed sequencing discipline not internalized
- `wpforms-marketing` — clone/reference style mattered, but initially authored too much from scratch

### Manual guidance pattern (Codex session)

Manual scene-by-scene prompts were needed because system context was insufficient in practice. The repo had the right rules; Codex did not extract a strong enough working storyboard before building. Umair had to manually specify:
- Text-first intro
- Exact Pixel Point effects
- No visual QC
- No iframe swap
- Exact selectors
- Exact DOM placement for connected state
- Exact camera/snapshot behavior

Self-diagnosis: "I was not carrying enough editorial taste and product-truth context on my own."

### What the prompt should have said (Codex's reverse-engineering)

Single paragraph that would have prevented v1:

> "Build this as a premium editorial product announcement, not a logo collision demo. Use wpforms-ai-prompt-open.html / editorial-reference-36s.html style. Typography leads. Product truth matters: use real snapshots and DOM puppetry, never iframe swaps for state changes unless explicitly requested. Use Cursor from motion-primitives.js for all cursor movement, promise-sequenced so glide completes before click. Use native iframe viewport sizing to avoid responsive collapse and avoid upscaling if possible. Every scene must have a beat-specific atmospheric background. No visual QC. Before coding, identify the exact DOM state transition and selector target for each interaction."

Core lesson (Codex's own framing): "The right output needed fewer 'cool animations' and more disciplined editorial causality."

## Convergent learnings (both sessions agree)

1. **Both hand-rolled primitives that already existed.** Cursor, camera moves, dropdown overlays, type animations — all canonical in `motion-primitives.js` / `wpforms-interactions.js` / `iframe-helpers.js`, all re-invented.
2. **Both skipped motion-audit on v1.** Both shipped horrible-v1 to user review without ever scoring.
3. **Soft rules in prose got rationalized past.** Hard rules in CLAUDE.md ("if you're about to write `gsap.to(cursor, ...)`, stop") existed but didn't fire as gates.
4. **Manual rescue was concept/product-level, not implementation-level.** Umair gave macro feedback ("0.5/10... 0 camera movements"). Implementation had to come from re-reading the system context, which both sessions then did.

## Proposed system rules (deduped + prioritized)

In order of how often they'd prevent future v1 horror:

| # | Rule | Bake target | Status |
|---|---|---|---|
| 1 | Pre-write primitives gate ("invoke `wpforms-primitives` BEFORE writing any motion code") | CLAUDE.md / AGENTS.md + wpforms-primitives skill header | ✅ Baked at `2fddece` + `8fc3b25` |
| 2 | Mandatory motion-audit on v1 before user review (not just final handoff) | wpforms-motion-audit skill header + CLAUDE.md | ✅ Baked at `2fddece` (cadence section updated) |
| 3 | Reference vs procedural skill distinction (file-read fine for reference, Skill tool required for procedural) | INV-13 in invariants doc + CLAUDE.md + AGENTS.md | ✅ Baked today (after Codex feedback) |
| 4 | Real-UI proof gate — every UI fragment derives from a real snapshot or explicit user override | NEW: wpforms-marketing skill OR new INV-14 | ⏳ Pending |
| 5 | Anti-pattern catalog in CLAUDE.md (short numbered list at top) | CLAUDE.md | ⏳ Pending |
| 6 | Clone-and-customize first-write enforcement (first write = `cp reference/html-templates/<closest>.html ...`) | wpforms-marketing skill | ⏳ Pending |
| 7 | Storyboard format: per-beat primitive declaration | `docs/storyboard-format-morph-chain-2026-05-10.md` | ⏳ Pending |
| 8 | No iframe-swap for state changes — same iframe + DOM puppetry | NEW INV-14 or wpforms-marketing skill | ⏳ Pending |
| 9 | Cursor promise-sequencing rule (glide must complete before click/reveal) | wpforms-gsap-rules skill | ⏳ Pending |
| 10 | Atmosphere opacity floor (≥0.30 on hero atmospheres, beat-driven not decorative) | wpforms-marketing skill | ⏳ Pending |
| 11 | No native `<select>` for editorial dropdowns (use faux overlay) | wpforms-primitives skill anti-patterns section | ⏳ Pending |
| 12 | Click moments require micro-zoom or named exemption | wpforms-marketing or storyboard format | ⏳ Pending |
| 13 | Typography-led intro by default | wpforms-marketing skill | ⏳ Pending |
| 14 | No double-protagonist lockup (one composition per identity moment) | wpforms-marketing skill | ⏳ Pending |
| 15 | Caption stacking layout sanity (no overlapping captions) | wpforms-marketing or motion-audit | ⏳ Pending |

Rules 1-3 already baked from earlier postmortems. Rules 4-15 are new from these 2 editorial retros. Strongest-impact unbaked items: **4 (real-UI proof), 5 (anti-pattern catalog), 6 (clone-and-customize teeth)**.

## Recommendation: which to bake next

Highest leverage based on "what would have prevented v1 horror in both sessions":

- **Rule 5 (anti-pattern catalog in CLAUDE.md top)** — Claude session explicitly said "If I had a 6-line don't-do-this list in the protected area of CLAUDE.md, I'd have re-read it before each beat." Easy to bake. High visibility.
- **Rule 6 (clone-and-customize teeth)** — Codex session said "still authored too much from scratch" even though it KNEW `wpforms-marketing` says clone-first. Needs to be procedural, not advisory.
- **Rule 4 (real-UI proof gate)** — Claude's #1 unique failure was fake/mocked UI. Codex's #1 was iframe-swaps for state. Both are "didn't use real product truth" failures.

Lower-leverage (but still worth baking eventually):

- Rules 9-15 are mostly motion-craft specifics that motion-audit would catch on v1 IF motion-audit is run on v1. Solving rule 2 partially solves these.

## Session 3 — Claude continuation (when Codex hit rate limit)

Session 3 inherited `videos/klaviyo-bridge-2/index.html` after Codex tripled the file size to ~25.5s of build with iframeCard + docsCard scenes + API-key paste flow. Continued through BEATS 13–15 (scattered canvas, Add New Connection, dropdown showcase). Different failure axis than the first two sessions.

### Unique failure modes (not in Sessions 1+2)

| Category | What happened | Missing rule |
|---|---|---|
| **Inherited bugs propagated** | Codex's `revealConnectedIndicator` had inline `Object.assign(indicator.style, {...})` overrides — caused pill to render unlike adjacent Google Calendar pill in same snapshot. Session 3 saw user shout "are you serious right now?" before realizing the rendering came from Codex's overrides, not from oversample. | Inherited code should be audited BEFORE extending. Continuation session ran no audit. |
| **Cleanup selector drift** | `#provider-klaviyo > .connected-indicator.green` was the correct selector when Codex first wrote it. When append target moved to `.wpforms-settings-provider-info`, selector wasn't updated → duplicate pill on scrubber replay. Hidden in code, took iteration to find. | Code should mark cleanup selectors as load-bearing across DOM-target changes. |
| **Library composition pattern set by inheritance** | Codex used local `glideClick` + raw `gsap.timeline()` instead of `iframe-helpers.js` / canonical primitives. Session 3 propagated this pattern forward without ever consciously deciding to. **Quiet failure** — no obvious skip moment to point to. | Continuation session should explicitly assess "should I be using library primitives the prior session didn't?" before extending. |
| **No storyboard for the slug** | `videos/klaviyo-bridge-2/` had no storyboard.md. The older `klaviyo-bridge/storyboard.md` (v4) was the closest, but had drifted from the `-2` build. Session 3 inferred state from code + verbal directions. | Continuation should produce its own storyboard.md before extending, even if just a one-page derived doc. |
| **Re-discovery via commit messages** | No structured handoff. Session 3 reverse-engineered Umair's prior corrections to Codex by reading code patterns. "Why is `iframeCard` width 1280×720 with oversample disabled?" — answer was in user history, not code annotation. | Code touched in response to user pushback should be annotated. |
| **"No QC from you" conflation** | User said "no visual QC from you" (meaning: don't open browser preview to spot-check; user is doing visual QC live). Session 3 conflated this with "no procedural QC either" and skipped `wpforms-motion-audit`. | Distinguish visual QC (browser preview) from procedural QC (motion-audit tier scoring). They are SEPARATE artifacts. |
| **Fabricated payoff content** | Session 3 invented a chip overlay + Klaviyo result card during the action-dropdown showcase. User rejected: "no chip, no Klaviyo result card, no fabricated payoff content." This rule was NEW to Session 3 — Codex hadn't been told this. | Real-UI proof gate (Rule 4 from sessions 1+2) confirmed across all 3 sessions. |
| **Pegboard halftone moment** | Session 3 invented a uniform 9px-dot 32px-spacing background for the scattered canvas. User reaction: "the fuck is this... pegboard... what the fuck are all these motion design files in the system for if you're gonna make shit from your ass." Fix: lift atmosphere from `wpforms-ai-board/index.html` verbatim. | Atmosphere should be cloned from `reference/html-templates/` examples, not invented. |

### Skill invocation (Session 3)

- **Re-invoked at session start (after rate-limit handoff):** No. Treated prior Claude conversation's skill invocations (`wpforms-marketing`, `wpforms-primitives`, `wpforms-gsap-rules`) as still live in context across the Codex interlude.
- **`wpforms-motion-audit` on inherited state:** No. Same skip as Sessions 1 + 2.
- **`wpforms-motion-audit` on Session 3's output:** No.
- **Self-diagnosis:** "Two failure modes fed each other. (1) User said 'hurry up' + 'no QC from you' — felt like the audit would slow the iteration loop. (2) Assumed Codex's substrate was at-or-above tier-A already (false assumption — never verified). Both rationalized."

### Continuation-specific learning (the genuinely new finding)

> "Continuation sessions inherit the prior session's skip patterns by default. The continuation Claude assumes that what the prior session did NOT do was either already done or unnecessary. It is neither — those gates need to fire fresh per session, regardless of inheritance."

> "Handoffs are invisible gate-skip moments. The continuation Claude has zero forcing function to re-invoke gates because nothing about the handoff signals 'the gates are dirty now.'"

### Session 3's proposed continuation prompt template

Section 8 of the retro is a model continuation-handoff document. Stealable verbatim as the template for future continuation prompts:

```
You are continuing <slug>/index.html. The prior session hit a rate limit at TOTAL=<N>s.

USER-APPROVED THROUGH:
  <enumerated beats user approved>

KNOWN BUGS IN PRIOR BUILD:
  <inherited issues to fix before extending>

USER PREFERENCES (HARD, from prior corrections):
  <each rule the user established with the prior session>

NEXT BEATS (from storyboard / verbal):
  <enumerated beats remaining>

NON-NEGOTIABLE GATES (continuation-specific):
  - Run wpforms-motion-audit on inherited state BEFORE adding to it
  - Run wpforms-motion-audit on each new beat BEFORE showing to user
  - <task-specific gates>
```

### Tier-distribution per beat (Session 3's retrospective informal audit)

Median A− across 14 beats after manual rescue. Pre-rescue distribution would have been C or below on 3–4 beats. **~45 minutes of avoidable rework cost from skipping motion-audit.** That's the concrete cost of the skill skip.

## Revised proposed system rules (deduped + prioritized across all 3 sessions)

| # | Rule | Source | Bake target | Status |
|---|---|---|---|---|
| 1 | Pre-write primitives gate | S1+S2 | wpforms-primitives + CLAUDE.md | ✅ Baked at `2fddece` + `8fc3b25` |
| 2 | Motion-audit on v1 before user review | S1+S2 | wpforms-motion-audit + CLAUDE.md | ✅ Baked at `2fddece` |
| 3 | Reference vs procedural skill distinction | Codex feedback | INV-13 + CLAUDE.md + AGENTS.md | ✅ Baked today |
| 4 | Real-UI proof gate | S1+S2+S3 | NEW INV or wpforms-marketing | ⏳ Pending |
| 5 | Anti-pattern catalog in CLAUDE.md top | S1 (explicit ask) | CLAUDE.md | ⏳ Pending — HIGH PRIORITY |
| 6 | Clone-and-customize first-write enforcement | S2+S3 (pegboard) | wpforms-marketing | ⏳ Pending |
| 7 | Storyboard format: per-beat primitive declaration | S1 | storyboard-format doc | ⏳ Pending |
| 8 | No iframe-swap for state changes | S2 | INV or wpforms-marketing | ⏳ Pending |
| 9 | Cursor promise-sequencing rule | S2 | wpforms-gsap-rules | ⏳ Pending |
| 10 | Atmosphere opacity floor + beat-driven | S1+S2 | wpforms-marketing | ⏳ Pending |
| 11 | No native `<select>` for editorial dropdowns | S1 | wpforms-primitives anti-patterns | ⏳ Pending |
| 12 | Click moments require micro-zoom or exemption | S1 | wpforms-marketing or storyboard format | ⏳ Pending |
| 13 | Typography-led intro by default | S2 | wpforms-marketing | ⏳ Pending |
| 14 | No double-protagonist lockup | S1 | wpforms-marketing | ⏳ Pending |
| 15 | Caption stacking layout sanity | S1 | wpforms-marketing or motion-audit | ⏳ Pending |
| **16** | **Continuation re-audit gate** (re-invoke procedural skills on inherited state's last user-visible output before extending) | **S3 unique** | **NEW INV-14** | ⏳ HIGH PRIORITY |
| **17** | **"No visual QC" ≠ "no procedural QC"** — these are separate artifacts; motion-audit fires regardless of visual-QC stance | **S3 unique** | **CLAUDE.md + wpforms-motion-audit** | ⏳ Pending |
| **18** | **Annotate inherited code with prior user-rejection signals** (e.g. comment: `// user rejected 2560×1440 oversample 2026-05-12; do not retry`) | **S3 unique** | **wpforms-video skill OR new continuation handoff doc** | ⏳ Pending |
| **19** | **Continuation handoff template** (Session 3's section 8 — copyable for the moment a session resumes work on an inherited build) | **S3 contribution** | **`docs/codex-prompts/continuation-handoff-template.md`** | ⏳ HIGH PRIORITY |

## Recommendation: bake the high-priority items now

Three sessions of evidence, time to act. Baking next:

- **Rule 5** — Anti-pattern catalog in CLAUDE.md top (Session 1 explicit ask, Session 3 confirms "would have re-read before each beat")
- **Rule 16** — Continuation re-audit gate (Session 3's strongest unique contribution) → INV-14
- **Rule 19** — Continuation handoff template (Session 3 wrote a copyable example)
- **Rule 4** — Real-UI proof gate (confirmed across all 3 sessions, multiple manifestations)

The other 11 rules cluster around motion-craft specifics. Most would be caught by `wpforms-motion-audit` IF that audit actually fires on v1. Rule 2 (already baked) handles the systemic skip. The motion-craft specifics can land per-skill organically.
