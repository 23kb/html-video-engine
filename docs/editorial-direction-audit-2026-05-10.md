# Editorial Direction Audit — 2026-05-10

Master synthesis of three parallel audits commissioned after the third failed editorial-video attempt (`videos/wpforms-ai-zlyvs/`, "so many things wrong"). Two sub-reports back this up:

- `docs/winning-pattern-analysis-2026-05-10.md` — what the 3 winning videos do that 3 failed editorial videos don't
- `docs/wpforms-source-inventory-2026-05-10.md` — real brand + motion + UI assets in the live WPForms plugin source

External-resource audit findings are inlined below.

---

## TL;DR

**Don't migrate to Remotion. The motion-design problem isn't architectural — it's a literacy + authoring-discipline gap. The system you have can produce winners (it has, 3 times). Editorial videos fail for three specific, fixable reasons.**

The three diagnoses converge:

1. **Audit-skill gap.** Claude can describe motion primitives but can't tell good motion from bad motion. Three open-source skills exist that close this gap. Install them. (Detail: external-resources audit below.)
2. **Authoring-shape gap.** Winning videos use *identity continuity across time* (one element morphs Button → Input → Pill → Chat over 12s). Failures use *state-table beats* (12 beats × 41s, every beat is a fresh composition). Storyboards can't encode the morph chain that makes winners read as cinematic. (Detail: `winning-pattern-analysis-2026-05-10.md`.)
3. **Brand-authenticity gap.** The video repo has been guessing what WPForms looks like — purple as primary (it's orange `#E27730`), invented spinners (real one is in plugin source), fake mosaic cards (templates are at `https://wpforms.com/templates/api/get/`). The plugin source has the answers. (Detail: `wpforms-source-inventory-2026-05-10.md`.)

**Concrete week-1 plan (5 things, half-day each):**

1. Install three audit skills (`kylezantos/design-motion-principles`, `emilkowalski/skill`, `pbakaus/impeccable`). Run each on `videos/wpforms-ai-zlyvs/index.html`. Compare critiques to the diagnoses we already wrote. Whichever surfaces issues we missed gets promoted into the workflow.
2. Read `motion.dev/docs/ai-kit` end-to-end and adapt the **MotionScore S–F tier audit pattern** into a new `wpforms-motion-audit` skill. (Don't install Motion the library — steal the audit pattern.)
3. Adopt three real plugin-source assets — `#E27730` as primary brand color (not purple), the real `getSpinnerSvg()` 3-dot animation, the real `loading-avatar.svg + loading-spinner.svg` pair for any "AI is loading" moment. Replace fake chrome wherever it appears.
4. Pick **one editorial archetype** (recommend: "AI Form Generator demo, 30s") and rebuild it with two new disciplines: identity-continuity authoring (one morph host across beats, like `wpforms-ai-prompt-open`'s `#cta`) and real plugin-source assets only. Storyboard format must declare the morph chain explicitly.
5. Stop building `videos/wpforms-ai-zlyvs/`. It violates both authoring-shape and brand-authenticity rules. Mark it `_zlyvs-archived/` and reference it as an anti-example.

The cost of these five steps is ~3 days. If quality clears the bar, the editorial direction is unblocked. If not, we have a real signal that the *content type* (Anthropic-style cinematic motion for a form-builder product) is the wrong fit, and we lower format ambition instead.

---

## Diagnosis 1 — Audit-skill gap (external resources)

**The 12 URLs you sent — verdict:**

**Top 3 to install or read this week:**

- **Motion AI Kit** (`motion.dev/docs/ai-kit`) — Motion library's official agent kit ships 5 Claude-installable skills including `/motion-audit` (S–F tier scorecard for animations) and `/css-spring` (natural-language spring generator). The library itself is React-only so don't migrate, but the **audit pattern** is exactly what your repo lacks. Read end-to-end and adapt the MotionScore tiering into your own `wpforms-motion-audit` skill.

- **kylezantos/design-motion-principles** — real, MIT-licensed Claude Code skill that audits motion against Emil Kowalski / Jakub Krehel / Jhey Tompkins principles. Ships `SKILL.md` + 9 reference docs. Install: `npx add-skill kylezantos/design-motion-principles`. Drop-in compatible with your `wpforms-*` skill structure. The "decomposed multi-phase motion" gap you keep hitting is exactly Emil Kowalski's territory (he built sonner, vaul).

- **Remotion Best Practices skill** (`remotion-dev/skills`) — install as a *reference*, not a migration. Read the architecture: 126K+ installs, official, actively maintained. Mirror the pattern (per-archetype best-practice docs) in your own postIntro skill.

**Install if you have an extra 30 min:**

- **emilkowalski/skill** — Emil's own Claude skill, opaque content (can't preview without installing) but cheap (`npx skills add emilkowalski/skill`). Pair with kylezantos for designer-named-principles redundancy.
- **pbakaus/impeccable** — Paul Bakaus's design-vocabulary system + `/animate` command. Bakaus has serious credentials (jQuery UI core, ex-Google AMP). Install (`npx skills add pbakaus/impeccable`), run `/animate` on a failed editorial chapter. Cheap to try.
- **freshtechbro/claudedesignskills** — bundled marketplace of 22 skills. Quality variance unknown. Install ONLY their GSAP skill (`/plugin install` whichever subset surfaces it) and diff against your `wpforms-gsap-rules`. If theirs has timing/decomposition guidance yours lacks, copy. Don't bulk-install all 22.

**Bonus — local copy reviewed after the fact:**

- **mcpmarket motion-design skill (`SKILL (1).md` in your Downloads)** — actually a real, well-structured skill. Decision-tree based: maps interaction (purpose × frequency × pattern) to specific cubic-bezier values + duration tokens. Prescriptive, where the audit skills are diagnostic — useful complement. Real concrete tips like "use scale(0.96) not scale(0)". Caveat: your local copy is the SKILL.md only; it depends on `references/decision-tree.md` and `references/easing-tokens.md` which aren't in your copy. To use it, fetch those references too. Scope is UI motion (dropdowns, modals, tooltips), not editorial cinematic motion — but the principles (purpose-frequency-pattern → concrete tokens) translate to camera moves.

**Skip — vibes, dead links, or wrong fit:**

| Resource | Why skip |
|---|---|
| `mcpmarket.com/...motion-design-ui-animation` (the live URL — rate-limited) | The Downloads copy is the same skill, reviewed above |
| Medium "Designer's Guide to AI Skills" | Conceptual essay, no artifacts; defers how-to to a future post |
| `mindstudio.ai/blog/...motion-graphics` | Marketing for Hyperframes/Remy. No code, no skills |
| `yummy-design-sprint.notion.site/Claude-Framer-MCP` | Notion page renders empty server-side. Almost certainly stale concept doc |
| `firecrawl.dev/blog/best-claude-code-skills` | Curation only. Single relevant link is Remotion (already covered above) |
| `skillsdirectory.com/skills/jezweb-motion` | Real skill but React/Motion-only. Wrong frame for vanilla GSAP repo |
| `typeui.sh/design-skills` | Static visual aesthetics (Bento, Glassmorphism). Zero motion content |
| `impeccable.style` | Listed under install above — same target |

**Total install cost for the actionable 3-5 skills:** under 10 minutes. **Output:** Claude can audit its own motion authoring against multiple designer-grade lenses before handoff. This addresses the actual root cause — not "Claude doesn't know GSAP," but "Claude can't tell good motion from bad motion."

---

## Diagnosis 2 — Authoring-shape gap (winning pattern)

Full evidence in `docs/winning-pattern-analysis-2026-05-10.md`. The compact version:

**The architecture is not the variable.** Single-HTML wins (`wpforms-ai-prompt-open`, `editorial-reference`, `sandbox/openai-replica-18s.html`) AND manifest-chapters wins (`build-forms-faster-with-wpforms-ai`, `wpforms-rest-api-overview-polished`). Single-HTML loses (`wpforms-ai-announcement`, `wpforms-ai-zlyvs`). So "should we use Remotion / single-HTML / chapters" is the wrong question.

**The variables that matter (winners do all five; failures violate at least three):**

1. **Identity continuity across time.** Winners have a single morphing element that carries viewer attention across beats — `wpforms-ai-prompt-open#cta` morphs Button → Input → Sullie pill → Chat panel over 12s. Failures stage a fresh composition per beat. Tables and per-beat storyboards cannot encode this — they encode states, not connecting tissue.
2. **Decoration is INJECTED into the iframe DOM, never painted over it.** Winners inject CSS into `iframe.contentDocument.head` and toggle classes on real fields. Failures stack overlay panels (Anthropic-style verb pill, plan checklist, tweaks panel) as siblings outside the iframe — which is what made `wpforms-ai-announcement` read as fake.
3. **Camera moves are 3-keyframe direct-line, with the arc encoded in temporal spacing.** Failures use 4+ sequential tweens where every value changes per tween (`videos/wpforms-ai-zlyvs/index.html:649-832`). Winners use one master timeline with parallel tracks of `opacity/transform/filter` only.
4. **Atmosphere = 3 blooms + 8fps grain. Period.** Failures stack 5-6 atmosphere layers and swap colors per beat. Winners hold one atmospheric bed for the whole video.
5. **Pacing: 1 hero element gets 8-12 seconds.** Failures pack 12 beats into 41s (`videos/wpforms-ai-announcement/index.html:11-24`). Winners hold one morph for 12s.

**For `wpforms-ai-zlyvs/` specifically:** it violates 1, 3, and 4. The smallest fix isn't more iteration — it's archive and rebuild with these constraints baked into the storyboard format itself (storyboards must declare morph chains, not just per-beat states).

---

## Diagnosis 3 — Brand-authenticity gap (plugin source inventory)

Full evidence in `docs/wpforms-source-inventory-2026-05-10.md`. The high-impact gaps:

| Video repo currently fakes | Real source | Cost to swap |
|---|---|---|
| Purple `#7A30E2` as primary brand | `#E27730` orange — confirmed in `.wpforms-btn-orange` and `icon-wpforms.svg` fill | trivial |
| Generic 3-dot spinner | `getSpinnerSvg()` at `wpforms-ai-chat-element.min.js:33` — inline SVG with `@keyframes spinner_MGfb` | low |
| Fake "AI loading" overlay | `loading-avatar.svg` (masked Sullie) + `loading-spinner.svg` (orange ring) rotating at `wpforms-spinner-rotation 0.8s linear` | low |
| Generic Sullie SVG (`assets/sullie - svg.svg`) | Master at `assets\images\splash\sullie.svg` (80×80, full palette) | trivial |
| Fake template mosaic cards (`wpforms-ai-announcement` beat 10) | Real template API at `https://wpforms.com/templates/api/get/` — JSON + thumbnails | medium (one-time fetch + cache) |
| Custom font ("Inter") | OS system font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI"...` | trivial |

**Other plugin facts the video repo should know:**

- AI chat is a real Web Component: `<wpforms-ai-chat>` with classes `.wpforms-ai-chat`, `.wpforms-ai-chat-message-list`, `.wpforms-ai-chat-message-input`, items `.wpforms-chat-item-question` / `.wpforms-chat-item-answer` / `.wpforms-chat-item-answer-waiting > .wpforms-chat-item-spinner`.
- "Use This Form" button class: `.wpforms-btn-orange.wpforms-ai-chat-answer-action`. Literal string at `src\Integrations\AI\Admin\Builder\Forms.php:272`.
- No SCSS variables file — colors are inlined per-component. The de-facto palette is in the inventory doc table.
- No Lottie. No custom fonts. Don't add them.

**Adoption rule going forward:** before any future editorial build, do a 10-minute "real-asset pass" — replace every guessed brand element with a real one from the inventory. This alone would have caught the purple/fake-spinner/fake-mosaic mistakes in the previous three failures.

---

## Remotion verdict (short, decisive)

**Don't migrate.** Detail in the external-resources audit above. Three reasons:

1. **HTML deliverable.** Your repo ships playable HTML — Remotion's strength is MP4 from React components. You'd inherit a render pipeline you don't need and lose the in-browser scrub-and-play model.
2. **Migration cost.** Weeks of refactor: rewrite `runtime/player.js`, `runtime/frame-driver.js`, `runtime/transitions.js`, scrubber, `tools/render.js`, every snapshot integration, the whole protected-core surface. Months to parity.
3. **Doesn't fix the literacy gap.** Claude writes syntactically valid Remotion code with shallow choreography just as easily as it writes shallow GSAP. The fix is audit/critique skills + identity-continuity authoring, not the framework.

**One nuance:** the `wpforms-ai-prompt-open` style (single-HTML, paused master timeline, pure-function-of-time playback) translates to Remotion essentially as-is. If you ever decide to ship video tooling for a fully different product, Remotion is a reasonable choice for a greenfield repo. For *this* repo, no.

---

## Recommended next moves (ranked)

### Phase 0 — preserve before reset (10 min)

1. Copy 3 audit docs + `tools/ref-frames/` + 3 canonical HTML templates already preserved at `reference/html-templates/`. (Done 2026-05-10.)
2. Cherry-pick from `core-factors` onto main: **step-9** (flipBridge as default swap path) + **step-11** (title-card vendored GSAP, was CDN). Drop step-2 (protected-core split) — re-deciding that during the engine audit. Drop everything else.
3. `git checkout main`, commit preserved files, optionally delete `core-factors`.

### Phase 1 — read the engine for real (~2 hours, Claude, on main)

Audit the protected core that previous editorial work bypassed entirely. Files:

1. `engine/engine.js` — `loadSnapshot`, `zoomTo`, `highlight`, `cursor`, `type`
2. `engine/wpforms.js` — WPForms DOM puppetry vocabulary
3. `runtime/dom-prep.js` + `runtime/prep-ops.js` — state vocabulary
4. `runtime/chapter-runner.js` — descriptor mode
5. `runtime/transitions.js` — `breakStyle` / `swapStyle` / `flipBridge`
6. `runtime/player.js` — orchestration
7. **A representative engine-using winner chapter** — `videos/build-forms-faster-with-wpforms-ai/chapters/scene-2-add-new.js` (per Agent B's winning-pattern analysis, this is the canonical engine-using-winner shape)

Output: `docs/engine-reading-notes-2026-05-10.md`. Format = primitive-by-primitive: what it does, who uses it, what bypassing costs, which editorial archetypes it actually fits. Explicit gap flag at top: "this is reading not authoring; treat strategic recommendations with that lens."

### Phase 2 — install + adopt motion skills (in parallel with Phase 1, ~2 hours total)

| Action | What | Cost |
|---|---|---|
| **Install `kylezantos/design-motion-principles`** (primary audit skill — do not skip) | `npx add-skill kylezantos/design-motion-principles` — Emil Kowalski / Krehel / Tompkins audit lens. The decomposed-multi-phase-motion gap is exactly Emil's territory; this skill is the most directly relevant of the three | 1 min |
| Install other audit skills | `npx skills add emilkowalski/skill` (Emil's own), `npx skills add pbakaus/impeccable` (Bakaus's `/animate` command + design vocabulary) | 2 min |
| Run each on a failed editorial video | Compare critiques against your own diagnoses | 30 min |
| Install Remotion Best Practices skill **as structural reference, NOT migration** | `npx skills add https://github.com/remotion-dev/skills --skill remotion-best-practices`. **What we want from it** — mirror the per-archetype `references/<archetype>.md` doc structure, the SKILL.md vs references split, the do-this/don't-do-this specificity. Throwaway: the Remotion-specific code content. | 10 min install + 30 min read |
| Install only freshtechbro's GSAP skill, diff against `wpforms-gsap-rules` | If theirs has decomposition/timing guidance yours lacks, copy. Don't bulk-install all 22 | 15 min |
| Read `motion.dev/docs/ai-kit` end-to-end | Adopt the **MotionScore S–F tier audit pattern** | 45 min |
| **Build new `.claude/skills/wpforms-motion-audit/SKILL.md`** | Single-tween-translate-and-scale = F. Multi-phase decomposed = A. Claude self-audits before any postIntro/cinematic chapter handoff | ~half-day |

**Skipping the mcpmarket motion-design skill** (the SKILL.md you have locally). Searched 5 public repos for the missing `references/decision-tree.md` + `references/easing-tokens.md` it depends on; not findable. The kylezantos skill + motion.dev MotionScore pattern cover the same ground (decision-tree-by-interaction-type + easing tokens + duration tokens). No work lost.

**On authoring impact:** these are mostly skill-level changes (read at authoring time, audit-after time), not authoring-shape changes. The one authoring-shape change that comes out of all this is the **morph-chain storyboard format** (Phase 4 below). Skills tell Claude what good looks like; the storyboard format change tells Claude how to plan it.

### Phase 3 — brand fix pass (1 hour)

Scan all videos for `--wpf-purple`, replace with `#E27730`. Replace fake spinners with the real `getSpinnerSvg()` (inline SVG with `@keyframes spinner_MGfb`) from the plugin source. Replace generic Sullie SVGs with master at `assets\images\splash\sullie.svg`. Replace fake template mosaics with calls to `https://wpforms.com/templates/api/get/`. Detail in [wpforms-source-inventory-2026-05-10.md](wpforms-source-inventory-2026-05-10.md).

### Phase 4 — reframe storyboard format + build one editorial archetype as proof (week 2)

Add a **morph-chain section** to the storyboard format that declares which DOM element carries identity across which beats (the `wpforms-ai-prompt-open#cta` Button → Input → Pill → Chat pattern). Without this, editorial storyboards keep producing state-table compositions per Agent B's winning-pattern analysis.

Then build one editorial archetype — recommend "AI Form Generator demo, 30s." Real plugin-source assets only. Identity-continuity: one element carries 30 seconds. Audit with the installed skills before handoff.

### Phase 5 — update core files to reflect post-audit reality

After Phases 1–4 land, update:
- **`CLAUDE.md`** — protected-core list (per the engine audit's findings — what's actually load-bearing vs. bypass-able), authoring rules (morph-chain requirement, audit-skill gate), brand-asset adoption rules
- **`AGENTS.md`** — sync with new CLAUDE.md
- **`tools/skill-context.js`** — register new `wpforms-motion-audit` skill, remove references to dead/dropped docs, update startup dump if structure changes
- **`.claude/skills/wpforms-postintro/SKILL.md`** — bake morph-chain pattern as canonical
- **`.claude/skills/wpforms-gsap-rules/SKILL.md`** — fold in any decomposition guidance from the freshtechbro diff or motion.dev MotionScore patterns
- **`.claude/skills/wpforms-marketing/SKILL.md`** — point at `reference/html-templates/` as the canonical clone-and-customize starting points (not the deleted prose docs)
- Optionally: `docs/INDEX.md`

### Phase 6 — QC gate (mandatory, runs at multiple points)

The system has 2 winning videos that USE the engine (`build-forms-faster-with-wpforms-ai`, `wpforms-rest-api-overview-polished`). Don't break them.

| When | What to QC | How |
|---|---|---|
| Before any engine touch (baseline) | Run `node tools/validate-video.js --all` + `node tools/check-video-playback.js <slug>` on the 2 winners. Save baseline output. | 10 min |
| After Phase 1 (audit only, no code changes) | Re-run baseline. Should be identical. If not, investigate. | 5 min |
| After Phase 5 (CLAUDE.md / skill / skill-context updates) | Re-run baseline. + manual smoke: open each winner in `node tools/preview.js`, scrub once end-to-end, no console errors, no visual regressions ≤5s/static states (Claude QC per memory rule). | 30 min |
| After any new editorial archetype (Phase 4) | Run audit skills, run validators, run smoke. Visual QC by Umair >5s motion per memory rule. | 1 hour |
| Before any `git push` | Same as above, full baseline. | 30 min |

**Hard rule:** if a baseline regression appears at any QC gate, stop and root-cause before continuing. Don't roll forward through breakage.

### Phase 7 — fallback (only if Phases 1–6 land but motion still feels mid)

Hire a motion designer one-time to build ONE annotated editorial template per archetype. Annotate with marker comments (`// PRIMITIVE: cinematic-flight — anticipation 0.15s + scale-dip + rotation 1.2°, copy don't reinvent`) so Claude clones-and-customizes instead of inventing. ~$1.5K–4K, 2–3 weeks.

---

## On the wpforms-ai-zlyvs build

**Recommendation: archive, do not iterate.** Reasons (from the winning-pattern analysis):

- No identity-continuity element (violates rule 1).
- 4-tween sequential camera moves with everything-changes-per-tween (violates rule 3).
- 5-layer atmosphere with per-beat color swaps (violates rule 4).
- Skeleton draws + cross-fade + DOM injection + camera flight all happening simultaneously in beat 3-4 (cognitive overload).

Move `videos/wpforms-ai-zlyvs/` → `videos/_archive/wpforms-ai-zlyvs/` with a `WHY-ARCHIVED.md` referencing this audit. Keep `storyboard.md` as a record of the wrong storyboard format (state-table without morph chain) so the next attempt avoids it.

---

## What this audit changes

Before today, the working theory was: editorial videos fail because Claude is bad at motion design and the system is over-engineered for editorial work. The proposed fixes were architectural (single-HTML over manifest, lower ambition format, hire designer).

After this audit: **the system is fine, the architecture is fine, the failures share three specific fixable patterns. None of them require a tool migration.** The fixes are: install audit skills, change storyboard format, use real plugin assets, archive the failed builds as anti-examples.

If after the week-1 plan the next editorial build still fails, then we have real evidence the literacy-skill route doesn't close the gap, and option 7 (motion designer) becomes the move. Until then, no migration.

---

## Sub-reports for deep evidence

- [docs/winning-pattern-analysis-2026-05-10.md](winning-pattern-analysis-2026-05-10.md) — what the 3 winners share, with cited code line numbers
- [docs/wpforms-source-inventory-2026-05-10.md](wpforms-source-inventory-2026-05-10.md) — full plugin-source inventory with real file paths

Both are within the repo, citable, and dated.
