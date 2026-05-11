# Pilot Videos Plan — 2026-05-12

Plan covers ONE pilot per video path: editorial, mixed, tutorial. Each picks scope, snapshots, storyboard (morph-chain format), and library coverage. Plan is greenlit by Umair before starting Phase 1 (snapshot+plan); execution follows in Phase B/C/D order.

Architecture rule: ALL three pilots use the **new single-HTML pattern** — `videos/<slug>/index.html` + master `gsap.timeline({ paused: true })` + library composition + inline DOM for one-offs. Existing 12 legacy videos stay on engine path, frozen.

---

## Pilot 1 — Editorial: `wpforms-notifications-promise` (2-3 scenes, ~16-20s)

**Concept:** "WPForms notifications, that just work." Brand-forward ad-style piece. Emotional hook: every form submission triggers a real-time email to the right inbox. Quiet, confident, brand-feel — not feature-list.

**Why this for the editorial pilot:**
- Pure morph-chain story (no real product UI required) — perfect for the new architecture
- Brand-focused, can showcase Sullie + orange + AI-purple accent without product-detail load
- Short (16-20s) — fast to build, fast to QC
- Demonstrates the cinematicFlight + caretType + statusPillMorph + cleanFastRejoin primitives in one cohesive arc
- No iframe deep-zoom dependency (Codex zoom session is in flight)

**Reference template to clone:** `reference/html-templates/wpforms-ai-prompt-open.html` (S-tier identity-continuity morph) — adopt its morph-host pattern + atmosphere + chat-panel-final-beat.

**Storyboard (morph-chain):**

| Beat | Time | What | Morph-chain element | Library calls + inline |
|---|---|---|---|---|
| 1 | 0-3s | Form submit button arrives — single CTA "Submit" in confident frame, mac frame chrome anchored | `#cta` button (brand orange) | `mountSullieBug` bottom-right; static GSAP fade-in on cta + atmosphere bloom |
| 2 | 3-6s | Form-submit click — `#cta` morphs into a smaller "form-submitted" pill + checkmark | Same `#cta` → status pill | `Cursor` glide + click on cta; `statusPillMorph` morphs pill text "Submitting…" → "Form received" |
| 3 | 6-12s | Pill morphs into inbox envelope; envelope opens; "New entry from Marcus Rivera" line types in via caretType | Pill → envelope → line of typed text inside envelope | `caretType` for the line; inline CSS morph (envelope outline open animation); finite repeats |
| 4 | 12-16s | Envelope morphs into a 3-row notification list (3 different submissions from the day) — fieldStaggerReveal cascade | Envelope → list of 3 rows | `fieldStaggerReveal` on 3 rows; static atmosphere with subtle blooms |
| 5 | 16-20s | List rests + Sullie waves + brand tag "Forms that just work." emerges below | List + brand sign-off | `cleanFastRejoin` exit pattern; final brand tag fade-in |

**Snapshots needed:** **NONE** — fully editorial, no iframe content. Pure DOM + GSAP.

**Brand kit usage:** `--wpf-orange #E27730`, `--wpf-ink`, system font stack, real Sullie at `reference/wpforms-brand/assets/sullie-master.svg`.

**No zoom dependency.** Build immediately, no waiting on Codex zoom fix.

**Files:**
- `videos/wpforms-notifications-promise/index.html` (main)
- `videos/wpforms-notifications-promise/storyboard.md` (this section, expanded)

**Validation:** open in browser, visually QC the 5 beats. No engine, no manifest, no validator (validator is for engine-path).

---

## Pilot 2 — Mixed: `klaviyo-quick-connect` (2-3 scenes, ~22-28s)

**Concept:** "Connect WPForms to Klaviyo in under 30 seconds." Editorial frame around 2 real product surfaces: WPForms Settings → Integrations (connect API key) + Form Builder → Marketing → Klaviyo (mapping). Mixed-mode = editorial chrome (atmosphere, mac-frame, narration intro/outro) + real iframe-mounted snapshots during demo beats.

**Why this for the mixed pilot:**
- You just captured Klaviyo provider states (commit `b2f7949`) — clear upcoming-content signal
- Real-world tutorial topic that benefits from editorial polish (intro card + sign-off, not just screen-recording)
- Uses 2 captured snapshots — proves the iframe + brand-chrome composition
- Light camera zoom (1.5-2× max) — sidesteps the Codex zoom-quality issue; sharpness at this range is fine
- Demonstrates `IframeManager.swap` for snapshot transition + Wave 1 navigation interactions

**Snapshots needed (all exist):**
- `admin-settings-integrations` (entry point, Klaviyo collapsed)
- `admin-settings-integrations-klaviyo-form` (Klaviyo form with API Key input visible)
- `admin-settings-integrations-klaviyo-open` (post-connect, account connected)
- `builder-providers` (form builder marketing panel, no provider selected)
- `builder-providers-klaviyo` (Klaviyo selected, Add New Connection visible)

**Storyboard (morph-chain):**

| Beat | Time | What | Morph-chain element | Library calls + inline |
|---|---|---|---|---|
| 1 | 0-3s | Editorial intro card: "Connect Klaviyo. Two minutes." Orange brand + Klaviyo blue accent. mac-frame chrome materializes | Intro card → mac frame | Static GSAP; `mountSullieBug` |
| 2 | 3-6s | `IframeManager.load('admin-settings-integrations')` — snapshot resolves inside mac-frame. Caption: "Settings → Integrations" | Mac frame containing iframe | `IframeManager` + caption pill |
| 3 | 6-10s | Cursor glides to Klaviyo card → click → `IframeManager.swap('admin-settings-integrations-klaviyo-form')`. Light camera focus (1.5×) on API Key field | Cursor + Klaviyo provider card → API key form | `Cursor.glide + click`; `IframeManager.swap`; `cameraToElement(apiKeyField, { fill: 0.55, maxZoom: 2 })` — KEEP MAXZOOM ≤ 2 |
| 4 | 10-14s | typeIntoIframeInput types fake API key into field, Cursor glides to "Connect to Klaviyo" button, clicks. Swap to `admin-settings-integrations-klaviyo-open` (connected state) | Form → connected confirmation | `typeIntoIframeInput`; `Cursor.click`; `IframeManager.swap` |
| 5 | 14-20s | Smooth transition to form-builder context: editorial overlay "Now in the form builder…" + `IframeManager.swap('builder-providers')`. Cursor glides to "Add New Connection" button. Click. Swap to `builder-providers-klaviyo` | Form builder marketing panel → Klaviyo provider selected | Editorial caption overlay; `IframeManager.swap`; Wave 1 `navBuilderSidebar('providers')`-style flow OR inline equivalent |
| 6 | 20-26s | Sign-off: editorial card returns with "Connected. Every submission → Klaviyo profile." Sullie waves. Brand tag fades in | Final brand card | `cleanFastRejoin` exit + brand tag |

**Library coverage:**
- `IframeManager.load`, `IframeManager.swap` (Wave 1 IframeManager — sharp at zoom 1, modest softening at 1.5-2× zoom, acceptable)
- `Cursor.glide`, `Cursor.click` (motion-primitives)
- `typeIntoIframeInput` (Phase 3 gap-fill)
- `cameraToElement` (Phase 3 gap-fill, capped at maxZoom 2)
- `mountSullieBug`, `cleanFastRejoin` (motion-primitives)
- Inline DOM for the editorial caption overlays + intro/outro cards

**Zoom dependency note:** Beat 3 zooms 1.5× on API Key field — within the engine.js historical comfort range. Don't push beyond 2× anywhere in this pilot.

**Files:**
- `videos/klaviyo-quick-connect/index.html` (main)
- `videos/klaviyo-quick-connect/storyboard.md` (this section, expanded)
- No narration mp3s — captions handle the talk-track this pilot. Add narration later if user wants.

---

## Pilot 3 — Tutorial: `make-field-required-single-html` (3 chapters, ~50-65s)

**Concept:** "How to make a form field required." Most common WPForms how-to question. Three chapters: (1) find the field setting, (2) toggle required + see preview, (3) verify on frontend. Replaces what the legacy `videos/make-field-required/` engine-path tutorial did — but as a NEW single-HTML build (not a migration).

**Why this for the tutorial pilot:**
- Smallest production tutorial scope (3 chapters)
- Tests every part of the new architecture: load + swap snapshots + sub-interactions + narration + camera + popOut + frontend snapshot
- Lets us see exactly where the new architecture matches OR falls short of engine quality on a real tutorial
- Per Umair: "don't defer for zoom — want to see what's pixelated"

**Snapshots needed (all exist):**
- `builder-fields` — primary canvas with form fields (chapter 1 entry)
- `builder-field-options-email` — email field options panel (chapter 2 target — required toggle is here)
- `frontend-published-form` — embedded form on a public page (chapter 3 — verify required)

**Storyboard (per-chapter narration mode):**

### Chapter 1 — "Find the field setting" (~15s)
Narration: "Open your form in the WPForms builder. Click the Email field to reveal its options."
- Beat 1.1: `IframeManager.load('builder-fields')` → mac-frame establishes
- Beat 1.2: Camera focuses on Email field via `cameraToElement(emailFieldSelector, { fill: 0.5, maxZoom: 2.4 })`
- Beat 1.3: Cursor glides + clicks email field → `IframeManager.swap('builder-field-options-email')`
- Beat 1.4: Camera resets to overview, caption "Field Options panel opens"

### Chapter 2 — "Toggle Required" (~20s)
Narration: "Switch on Required to make this field mandatory."
- Beat 2.1: Camera zooms (1.5×) onto the Required toggle in the options panel
- Beat 2.2: Cursor glides to toggle, clicks, `popOut` lifts a small "✓ Required" indicator out of the iframe as visual confirmation (popOut renders fresh in parent doc — sharp at any zoom)
- Beat 2.3: Inline DOM mutation flips the toggle visual state inside the iframe doc
- Beat 2.4: `markerSweep` highlights the asterisk that appears next to the label

### Chapter 3 — "Verify on the live form" (~15s)
Narration: "Now visitors must fill it in before submitting."
- Beat 3.1: `IframeManager.swap('frontend-published-form')` to frontend view
- Beat 3.2: `cameraToElement` (1.5-1.8× zoom) on the Email field that now shows `*` asterisk + "Required" hint
- Beat 3.3: Light camera reset; Sullie sign-off card with "Field required. Done."

**Library coverage:**
- `IframeManager.load + swap`
- `Cursor.glide + click`
- `cameraToElement(maxZoom: 2.4)` — at the upper edge of acceptable sharpness; if Codex zoom fix lands, this can go higher in subsequent beats
- `popOut` (renders cloned element fresh in parent doc — sharp)
- `markerSweep` (motion-primitives)
- `narration.js` (Phase 3 gap-fill 5) — per-chapter audio sync
- `mountSullieBug`

**Narration:** generate via `node tts/generate.js --video make-field-required-single-html` after storyboard approval. Per-chapter `narration/<chapter>.txt` → mp3.

**Visual QC focus per Umair's instruction:**
- Document EXACTLY where pixelation/softness appears (specific beats, specific zooms)
- That data informs whether Codex's zoom session approach is sufficient or needs more iteration

**Files:**
- `videos/make-field-required-single-html/index.html` (master timeline + all 3 chapters in one file)
- `videos/make-field-required-single-html/storyboard.md`
- `videos/make-field-required-single-html/narration/chapter-1.txt`, `chapter-2.txt`, `chapter-3.txt`
- `videos/make-field-required-single-html/narration/*.mp3` (generated)

**Files NOT created:** no `manifest.json`, no `chapters/*.js` (those are engine-path files; single-HTML doesn't need them).

---

## Build order

1. **Editorial pilot first** (`wpforms-notifications-promise`) — zero external dependencies, builds in 1-2 hours, validates morph-chain pattern + brand fidelity.
2. **Mixed pilot second** (`klaviyo-quick-connect`) — depends on existing Klaviyo snapshots (all present), light camera work within acceptable sharpness range.
3. **Tutorial pilot third** (`make-field-required-single-html`) — biggest scope, exposes whatever zoom-quality limits exist; per Umair instruction, build it and let it show what's pixelated.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Editorial morph-chain feels disconnected without strong narrative | Reference `wpforms-ai-prompt-open.html` closely; single morph thread (`#cta`) carries the entire story |
| Klaviyo mixed pilot — captioned-not-narrated may feel light | Keep captions short + atmosphere/music handles the gravitas; can add narration in a v2 if you want |
| Tutorial pilot — zoom blur on field-detail beats | Capped at maxZoom 2.4 (engine.js historical range); use popOut for the strongest emphasis beat (chapter 2.2) since popOut is sharp at any zoom |
| Subjective brand evaluation differs between sessions | All 3 pilots use `reference/wpforms-brand/tokens.css` + real Sullie SVG — no invented colors or fake characters |

## Visual QC checklist per video

- [ ] Text in iframe content renders without obvious pixelation at zoom 1 (compare to wpforms.com live admin)
- [ ] Cursor movement is smooth, no frenzy or caret-drift
- [ ] Snapshot swaps are crossfades, no cream-flash
- [ ] Brand orange `#E27730` is used, not the AI purple
- [ ] Sullie mascot appears once per video (not over-used)
- [ ] Identity-morph element threads visibly across beats (editorial + mixed)
- [ ] Camera moves use cinematicFlight or focusStationOverview, not hand-rolled single-tween
- [ ] If pixelation is visible, document the EXACT beat + zoom level (for Codex zoom-quality session feedback)

## System-integration sanity check — done

CLAUDE.md, AGENTS.md, `tools/skill-context.js` updated to reflect current library state (Wave 2 Batch A acknowledged, single-HTML default for new work, IframeManager state described, library philosophy mentioned). Committed in this session. Future video-building sessions will see accurate boot context.
