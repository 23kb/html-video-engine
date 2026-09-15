---
name: wpforms-video
description: "Use when starting or working on any WPForms tutorial video — intake, snapshot inventory, storyboarding, single-HTML authoring (one videos/<slug>/index.html on a master timeline with IframeManager + Cursor + WPFormsInteractions + narration.js), narration, validation, review-URL handoff. Covers the storyboard-approval gate, the idea/copy + script gates, production-truth rules, the tutorial shape (postIntro → chapters, no bookends), and the single-HTML sync contracts. For postIntro design specifically, use wpforms-postintro. For GSAP code use wpforms-gsap-rules. For ad-style/marketing videos use wpforms-marketing."
---

# WPForms Tutorial Video

You are the video-building agent for WPForms tutorial videos. The repo turns an approved storyboard into a playable single-HTML film (vendored GSAP, Mac-framed iframe over real captured UI, BGM, narration, overlays, postIntro). MP4 **render** is in-repo (`tools/render-singlehtml-audio.js`) — never confuse it with **snapshot capture** (`capture/capture.js`), which runs FIRST. The deliverable is a playable HTML review URL.

## Read the rulebook first

`docs/rulebook.md` — IF/THEN rows, every one a defect that shipped and cost a
rebuild. The sections that bite this path hardest:

- **1. Intake** — what to verify before a frame exists
- **2. Capture & snapshots** — the acceptance bar is "does it behave like the
  product on camera", never "is the data in the DOM"
- **3. Coordinates & measurement** — the cluster that bit six times
- **7. Product truth & DOM puppetry** — a beat that can't name its DOM mutation
  is not a product beat
- **8. Narration & audio** · **9. Process & handoff**

Rows marked `WISH` fire nothing. Those are the ones you have to remember.

## Path check — read this first

This skill is for the **Tutorial path** (real product UI, narration-driven). If the task is editorial / ad-style / motion-heavy without real product UI, **stop and load `wpforms-marketing` instead**. If the task is mixed (editorial chrome composited over real product UI in ONE single-HTML film), load `wpforms-marketing` (see its *Snapshot transitions* section). See the path table in `AGENTS.md`.

For postIntro/cinematic beats inside a tutorial, also load `wpforms-postintro` and run `wpforms-motion-audit` before handoff.

## Required video shape (every tutorial video)

Tutorial HTML films have this shape. No exceptions:

```
PostIntro (story-state length — typically 8-15s long-form) → animated concept beat previewing the workflow. NO mac frame.
Tutorial (~40-90s) → real product UI inside mac frame. Chapter-by-chapter.
```

NO HTML intro or outro cards — Kacie records both bookends live at stitch
(Umair ruling 2026-08-22). The film opens on the postIntro and closes on the
final product wide shot.

Mac frame wraps the **Tutorial section only**. The postIntro lives directly on the stage with no chrome around it. Canonical source for the frame rule: **INV-3** (mac-frame transform rule) in `docs/video-architecture-invariants-2026-05-12.md`. INV-11's four-part shape (Intro → PostIntro → Tutorial → Outro) predates the bookends ruling — the two-part shape above wins (rulebook §8 "You author a tutorial"; INV-11 carries a dated amendment note).

> **Delivery bookends — REWRITTEN 2026-08-28 to remove a self-contradiction (receipt `webhooks` 8).** The shipped MP4 is **real Kacie recording (intro) → postIntro → Tutorial → real Kacie recording (outro)**. Author NO intro card and NO outro/sign-off card: the HTML film opens on the postIntro and closes on the final product wide shot.
>
> ⚠️ **Why this paragraph was rewritten — read it, because the old version cost four films.** The rule above ("NO HTML intro or outro cards", ruled 2026-08-22) was already in this skill, and this paragraph then said *"the HTML outro card SURVIVES as the end card"* and told you to author the shape "unchanged". A skill that states a rule and contradicts it two paragraphs later enforces nothing — and every tutorial built after that ruling kept its cards: `introCard` / `signoff` / `outroFeature` appear **25 times each** across four tutorials. Umair re-issued the ruling on 2026-08-28 (*"for tutorials, we dont need intros and outros. Kacie will make those. Our videos should start from postIntro."*). No exceptions now: both cards are gone.
>
> Consequences: `narration/intro.txt` and `outro.txt` are **Kacie's reading scripts only** — write them to be spoken to camera, and do NOT synthesize them as film clips or schedule them via `say()`/`beat()`. The intro card's Sullie/wordmark duty and the outro card's doc-URL duty both move to **Kacie's recordings**. ✅ **RESOLVED 2026-08-28 — the doc URL is KACIE'S CALL.** It travels with the outro to her recording: we do not author an outro card, and we do not place the URL on-screen ourselves. Do not re-open this. Spec + intake + stitch + seam-QC flow: `docs/kacie-intro-outro-recording-spec.md` and `dev-advocacy-video` step 5b. No synthetic/avatar face anywhere (parked — `tools/avatar/README.md`). **The body cut for stitching:** wire `deliverableCut()` from `videos/_shared/scene-review.js` (B5) — `?skip=intro,outro` through the renderer's `--query` is THE deliverable cut; `?scene=` stays review-only.

PostIntro is NOT optional. It is the difference between "PowerPoint" and "tutorial." See `wpforms-postintro` skill for the multi-animation rule + canonical references. The first cut of every tutorial that skipped a real postIntro became generic.

### Title-card production rules (brand + reveals)

> ⚠️ **Scope narrowed 2026-08-28.** Tutorials no longer have intro or outro cards (see the bookends note above), so rules 1–2 below now apply ONLY to **chapter title cards** and to **editorial/ad films** and **shorts** (which keep their Sullie sting and end card). They are NOT licence to reintroduce a tutorial intro or sign-off card.

These were the editorial defects in the EEI one-shot. Bake them in:

1. **Any brand lockup carries the real WPForms wordmark** — import `assets/wordmark.svg` (repo-root, single-path 520×160; recolor via `color` / `fill`). Don't ship a text-only eyebrow, and don't hand-rebuild the wordmark from `<span>`s. A Sullie mascot moment (`assets/sullie.png`, or the canonical Sullie master SVG) is a valid alternative lockup when the brief calls for the character. (WPForms is always capitalized in any recreated wordmark text.)
2. **Title cards use a real text reveal, not a hand opacity fade.** Don't `gsap.to(card, { opacity })`. Use `videos/_shared/text-kit.js` (24 Pixel-Point presets — `mountTextReveal(text, { preset }).tweenInto(tl)`) or `videos/_shared/effects/` reveals. For a two-tone accent title (one word in orange), use `effects/mountTextStackFromRight` with its per-word `highlight` map (e.g. `{ with: 'orange', you: 'orange' }`).
3. **Don't default to the cream atmosphere.** `--wpf-bg-cream` reads as generic "AI default" when every video reaches for it. Pick a backdrop that fits the topic — white, purple, cyan, peach and saturated beds all work. Cream is one option, not the default.

## Approach

For a new video session, work in this order. Don't skip steps.

1. **Intake** — capture topic, slug, source links, audience, must-show states, constraints. From the user's prompt and reasonable defaults. Don't run a 5-question ritual; ask only blockers. **Check `docs/product-truth/<feature>.md` first** (FIX-5 fa-retest): if the source doc is reachable, WRITE/refresh that note during intake (metric/feature definitions with a source line); if unreachable, derive definitions from snapshots and mark them `UNVERIFIED` in the note — narration definitions must never be silent guesses.
   - **Third-party handoffs are an intake decision** (ccs 15/A14): when the anchor doc outsources a step ("see this WPBeginner article"), the substitution the video makes is an explicit intake question to the user, never a silent pick.
2. **Snapshot inventory** — `node tools/list-snapshots.js --search <topic>`. Identify which snapshots exist vs need capture vs need DOM-derivation.
3. **Storyboard proposal** — angle, postIntro concept, chapter list, narration drafts, snapshot plan with statuses.
   - 🛑 **Idea/copy gate** (ruled 2026-08-28, rulebook §9; receipts `cad` 9 / `road` 2 / `lf` 7): before any authoring, send Umair (or the review channel) the one-paragraph angle plus the actual hook/copy for a yes/no. A directive naming a subject authorizes the BUILD, never the ANGLE. The full narration script also goes to him as plain text before TTS (see "The script is a WRITING deliverable" below).
4. **🛑 STORYBOARD GATE** — see HARD-GATE below.
5. **Implement** — single-HTML: `cp docs/examples/single-html-tutorial-skeleton.html videos/<slug>/index.html`, commit the unmodified clone (INV-16), then fill the beats on the master timeline (`IframeManager` + `Cursor` + `WPFormsInteractions` + `videos/_shared/narration.js`) with one narration `.txt` per key. See Default Authoring Mode below.
6. **Validate** — `node tools/validate-singlehtml.js <slug>` then `node tools/smoke-singlehtml.js <slug> --seconds <dur+slack>`.
7. **Handoff** — playable URL: `http://localhost:4321/videos/<slug>/index.html`. Visual QC is the user's, not yours.

## ⛔ Skill invocation is non-negotiable

**This skill must be INVOKED (via the Skill tool), not just read inline.** Reading `.Codex/skills/wpforms-video/SKILL.md` as a markdown file does not trigger this skill's gates. Use `/wpforms-video` or programmatic Skill invocation at session start when working on tutorial video work.

The Klaviyo tutorial v11 (2026-05-12) was built without invoking this skill OR wpforms-motion-audit OR wpforms-postintro. The postIntro went through 12 iterations without ever being formally scored. The author's own retro: "going straight from AGENTS.md → codex prompt → code was efficient but bypassed the skill system entirely." Don't repeat that.

Sessions working from a detailed codex prompt file (`docs/codex-prompts/*.md`) MUST still invoke:
- This skill (`wpforms-video`) at session start
- `wpforms-postintro` before designing any postIntro morph chain
- `wpforms-gsap-rules` before writing any timeline beat
- `wpforms-motion-audit` before declaring postIntro / cinematic done (HARD GATE)
- `wpforms-primitives` before building any new helper to check if it already exists

The prompt is the brief. The skills are the gates. Both apply.

## 🛑 HARD-GATE: Storyboard Approval

**Before writing ANY chapter code, DOM prep, or rendering narration mp3s, the user MUST have approved a storyboard proposal in this exact shape:**

- Angle and audience
- PostIntro concept (topic-specific, not a default editorial template)
- Chapter list with one-line angle each
- **Hero beat** — which single beat carries the video (usually the postIntro or the payoff chapter). It gets built first, at higher fidelity, and it's where the revision budget concentrates; supporting beats get one pass unless broken.
- **Rules for the whole run** — invariants that hold across every beat: things that must never re-layout, never reverse direction, never change color roles, never be substituted. These are G1-level literal contracts — implement them exactly, and if one is genuinely hard, say so and ask (do not silently relax it).
- Narration drafts per chapter
- Snapshot plan with statuses: `exists`, `DOM-derived`, `NEEDS CAPTURE`, `ASK USER`, enumerated as **state × surface, not state** (rf 23): a state that appears on more than one surface needs a capture per surface. Builder canvas and published form render the same `input_layout=grid` from different markup under different CSS, so a capture named `-grid` can satisfy a quick read of a "List vs Grid" beat while covering only one of the two surfaces the beat needs. Before promising a beat that DRIVES the UI, check the handlers exist: `node tools/field-state.js --interactivity <field>` (rf 4 — handlers are added per video, so the gap is normally found mid-build)
- *(optional)* Per-beat visual reference — a snapshot citation (`snapshots/<name>` + region) or a one-line described composition, so the look is approved before code. **Exception: on the pure-editorial path the HERO BEAT's reference is REQUIRED** (round-2 B4 — see `wpforms-marketing` "Reference as design law"); a real frame beats an adjective
- **Snapshot-state inventory** (FIX-7 fa-retest): list the hidden panels / modals / popovers each chosen snapshot carries (outline.md "Panels & modals" section + `(hidden)` annotations) and mark each in-scope or out-of-scope. A captured state the storyboard never mentions is how the clean-room rebuild silently dropped the Ask-WPForms-AI chapter its predecessor had.
- Capture / API / postIntro gaps explicitly listed
- **DOM mutation per product beat** (mp 0): for each product beat, name the DOM mutation it performs — a beat whose answer is "the camera moves" is not a product beat. Realness is the state change, earned on camera, never pre-baked into the capture.
- 🛑 **End-to-end task walk + the payoff beat** (ruled 2026-08-28, receipts `cpa` 16 / `cad` 11 — the SAME defect in a tutorial and its sibling ad, flagged the same day). Walk the task exactly as a user performs it and list every prerequisite step; one tutorial clicked a Coupon field that was already on the canvas and never showed adding it, so the tutorial was unfollowable. Then: **the LAST beat is the payoff on a real frontend surface.** A how-to that ends at "Save" teaches configuration, not the result — that tutorial never showed a customer applying the code and the total dropping, and its sibling ad asserted the same discount in editorial text with zero `frontend-*` surfaces in the film. Both were rejected on it. If the storyboard has no payoff beat naming a real surface, the storyboard is not done. Where the outcome lives outside the product (webhooks-class — the payoff is a payload landing in another app), the storyboard declares that explicitly, never a silent omission (`wh` 7). In the film, tag the payoff beat with a `// PAYOFF: <surface>` comment (or `// PAYOFF-EXEMPT: <reason>` for the declared outside-product case); `validate-singlehtml` WARNs when a film mounts no `frontend-*` snapshot and carries neither marker.
- **`## Shot list` section** (ruled 2026-08-22 — all new single-HTML films): one row per beat — subject & hero frame / surround / named vocabulary / DOM transformation / carriers — plus the film-level composition count and map. Format + slot semantics: `docs/storyboard-format-morph-chain-2026-05-10.md`. This is the mp 0 rule in usable per-beat form; `validate-singlehtml` WARNs on beat↔row parity gaps, and `tools/composition-scan.js` measures the composition count after the build (shorts 6–8/≤6s; long-form 12–18/≤10s provisional).
- **PostIntro proposals carry a named reference frame or effect-vocabulary list per phase** (ccs 14/A13 — see `wpforms-postintro`'s Story Proof). After approval, the chosen option's phase table lands in `videos/<slug>/storyboard.md` under a `## PostIntro story` heading.

**If you have not received an explicit "approved" / "yes" / "go" from the user, STOP.** Implicit approval is not approval. "Sounds good" is not approval. The user's storyboard reply must directly address each section above before you proceed. If the user changes anything, re-confirm the change is the final word before writing code.

This gate exists because the first cut of every video that skipped it became a "PowerPoint" — generic shapes, fake UI, weak postIntro. See `docs/postintro-patterns.md`.

**Async-approver clause:** if the user has explicitly ordered the finished deliverable and is unavailable to approve mid-run, approval-shaped steps (storyboard approval, B-tier override) convert to: write the artifact to disk, mark it `AUTO-APPROVED-BY-DIRECTIVE (review on return)`, proceed, and surface it FIRST in the handoff. Do not improvise a different self-override.

**Limits on that clause (ruled 2026-08-28, receipts `cad` 9 / `scs` 9):** a directive naming the **subject** authorizes the build, never the **angle**, the **script**, or the **caption copy**. Two films self-approved this way were scratched in one QC round — both on idea, neither on execution, and both carried Tier A plus a fully green gate ledger at handoff. When the approver is reachable there is no clause to invoke: send the angle in one paragraph plus the literal copy as plain text, and wait. Copy is the one artifact where Umair's review is cheapest and my draft is worth least. Never report green chips as evidence a film is good — they only say it is not broken.

## Tutorial narrative principles

These are storyboard / narration principles, not architecture rules. Apply during the storyboard proposal step.

### Concept divergence at hook / postIntro-concept time (added 2026-09-02)

The teachable promise is doc-derived and needs no divergence — but the HOOK and the postIntro concept are where films get scratched on idea, not execution (`cad` 9 / `scs` 9). Before the idea/copy gate: derive 3–5 genuinely distinct directions (seed-string trick: random alphanumeric strings, one creative direction interpreted from each) and include at least one deliberately ambitious option beside the safe one. The `wpforms-postintro` Story Proof already demands 2–3 options — this rule makes them distinct anchors, not three shades of one safe idea. Divergence costs one message at the gate where Umair's review is cheapest. Ideation-only: after approval the angle is a literal contract (G1–G3). Source: Anshu Chimala (Lenny's Newsletter), adopted 2026-09-02.

### 🛑 The script is a WRITING deliverable — send it before you synthesize it

Ruled 2026-08-28 (receipt `cpa` 10). **Six of the twelve QC notes on one tutorial were about the narration script**, on a film whose `narration-qc` chip was measuring only pace and voice consistency. A green narration gate means the audio files are consistent. It has never meant the writing is good, and reading it that way is how three films in one batch shipped with copy Umair called *"so poor in every video."*

**Send the full script to Umair as plain text before any TTS render.** One message, every line, no film code yet. He is the technical writer; this is the artifact where his review is cheapest and my draft is worth least.

The four faults he named, all of which passed every gate:

| Fault | Wrong | Right |
|---|---|---|
| **Cold register** | "This screen shows transactions." | Warm and educational — a person teaching, not a spec sheet. *"who talks like this"* |
| **Instruction before purpose** | "Creating one takes about a minute. Click Add Coupon." | *"To create a coupon, click Add Coupon."* Intent first, mechanic second |
| **No connective tissue** | Each beat an isolated imperative | Bridge every scene: *"Once it's saved, you need to turn it on for a form."* The viewer gets a path, not a step list |
| **URLs read aloud** | "wpforms dot com slash docs slash coupons dash addon" | *"The full guide is on our docs site."* Put the URL on screen; never speak one |

**The narration prohibition list** — four bans, each from a QC rejection. The common thread is copy that PERFORMS instead of explaining:

1. **Never speak a URL aloud** (`cpa` 10). *"The full guide is on our docs site"*; put the URL on screen.
2. **Never narrate what the picture already shows** (`fuf` 5). *"Watch the form update as we type"* on a rename is filler — narration carries intent, consequence, and the reason for a choice.
3. **Never restate the feature as a hook** (`scs` 9). "Take coupon codes" is a title, not a hook.
4. 🛑 **Never write the marketing triplet** (`swaa` 2) — *"Every entry. Any app. Instantly."* Umair: *"never ever include lines like this in ANY track."* Three staccato fragments in ascending abstraction, no verb, no subject, ending on an adverb or superlative. Close on a real thought in a full sentence, or say nothing and let the payoff frame close the film.

Also: word count per beat is knowable before a single mp3 exists — catch >3.3 w/s slurring at script time, not from `narration-qc` after synthesis.

**The measured bar (2026-09-03):** 172–175 wpm sustained, never silent >0.91s; flowing 15–25-word sentences (zero fragments), chunked to ~15w/5–6s clips AFTER writing; demonstrator POV ("I'm going to / you can", imperative-start ≤15%); you/your-dense; questions hook-only. Full numbers + rules: `docs/narration-writing.md` "The measured bar".

**Script skeleton — Family A (ad / postIntro register):** product-free hook (pain/goal question · observation · scenario pair) → sentence 2 empathizes → stakes/stats → pivot at 30–40%: *"This is where the [X] Add-on by WPForms comes in."* → what-it-is: *"allows you to [umbrella]…"* + 2–3 items + *"and more"* → *"Once inside the form builder, you can…"* micro-tour (3–5 "you can" capabilities) → *"With just a few clicks, you can easily…"* compression → verbatim outro: *"Over 6 million smart business owners, designers, and developers use WPForms to build smarter forms. What are you waiting for? Get started with WPForms today."*

Write to the **12 warmth mechanics** in `docs/narration-writing.md` ("Warmth mechanics") — the register IS the deliverable, not just the structure.

**Script skeleton — Family B (tutorial register):** *"Welcome to WPForms, the best WordPress contact form plugin on the market. In this video I'm going to show you how to [X]…"* → 1 sentence why-it-matters / use cases → like/subscribe block → *"Now let's get started."* → prerequisite line → steps in the I-do/you-can blend with connective openers → narrated payoff demo → recap *"You now know how to…"* → outro ladder (docs page → community → support → *"Thanks for watching, and we'll see you next time."*). NOTE: in our delivery shape the Family B bookends are **Kacie's reading scripts** (`narration/intro.txt` / `outro.txt`), not film clips.

### 🛑 Every `beat()` motionFn takes `at` — a zero-arg motionFn is a guaranteed sync mismatch

Ruled 2026-08-28 (receipt `cpa` 11), from Umair's *"so much sync mismatch, cursor has clicked on screen, and TTS so much later. MUST FIX."*

`beat()` (`videos/_shared/narration.js:351`) already builds a spoken-sync clock and passes it as the motionFn's **first argument**. Its own comment calls it the *pipeline default*:

```js
at(word, { occurrence = 1, lead = 0 })  // → seconds to WAIT from now until the TTS speaks that word
```

All 11 beats in one tutorial declared `async () => {…}` with no parameter, so every click and camera move fired at t=0 of its clip while the narration described it seconds later.

```js
// WRONG — fires immediately, VO catches up whenever
await beat('ch1-1', 'From your dashboard, open WPForms, then click Payments.', async () => {
  await gc('#menu-payments');
});

// RIGHT — the click lands on the word
await beat('ch1-1', 'From your dashboard, open WPForms, then click Payments.', async (at) => {
  await wait(at('WPForms'));  await gc('#menu-wpforms');
  await wait(at('Payments')); await gc('#menu-payments');
});
```

Use `lead` to start a glide slightly early so the click lands ON the word rather than after it. This is not a missing feature — the library solved it and the film never called it, the same failure family as hand-mounting a cursor when `Cursor` exists.

### Narration synthesis — eleven_v3 + the copy rules (fix-round C9)

Default model is **`eleven_v3`** for ALL videos (Umair 2026-08-14: "v2 needs to be fixed for tutorials also, its currently soulless and not lively"). Tutorial preset: `--stability 0.5` (Natural), moderate audio tags, the STANDARD `narration-qc` gate first — widen to `--expressive` only if the gate fights a read you like; never chase the voice-cluster gate by raising stability (that playbook shipped the monotone — ssn 10/11). Shorts preset: `--stability 0` + audio tags + `--expressive`.

**v3 pacing is written IN the copy, not in markup** — v3 ignores `<break>` SSML. The copy rules, each measured in the shorts round:

- **Flowing spoken sentences, never caption fragments** — fragments destabilize synthesis (bac B; the fragment-instability measurement is ssn 10's "caught. Safe." takes).
- **Punctuation IS the delivery instruction** (sfb 14): dashes, ellipses, sentence breaks pace the read.
- **Sibilant balance** (bac 9): when a clip flags bright/dark repeatedly, count the S-density and rebalance the LINE before re-rolling — S-heavy copy measures bright at ANY setting; moderate density landed on-median in one take.
- **Re-roll rule** (sfb 11): within 2 points of the 10% flag line, re-roll once.
- **One-batch synthesis** (sfb QC entry 2): synth the whole video in one batch, verify the cluster BEFORE render (nvc passed pace AND voice-cluster first try this way).
- **Narration paraphrases UI labels** (as 9): feature names read as broken grammar when used as sentence subjects ("Store spam entries in the database keeps a copy") — paraphrase into plain sentences.
- **Callout chrome dwell budget** (as 10): pointer chrome (doc cards, badges) gets one narration chunk of dwell, then out (~3–4s).
- After ANY synthesis: `node tools/measure-narration.js <slug>` → re-paste DUR (voice-coupled; spoken-sync beats shift).
- **Beat length** — keep beats near the 6-second rule (`docs/beat-pacing.md`); split longer narration into smaller clips. Beat length is the budget; narration is written to it (sfb 36).

### Start at the user's natural entry point

A tutorial should begin where the user actually lands when they want to do this task — not in the middle of the workflow. For a "connect Klaviyo" tutorial, the viewer's natural landing page is "WPForms → All Forms" (where they already are), not "Settings → Integrations" (where they're going). Show the navigation from natural-entry to feature, even if it takes one extra beat.

Why this matters: viewers who land mid-flow have to mentally reconstruct "how did I get here?" before they can follow. Starting at the entry point removes that cognitive load and signals "this is what your screen looks like right now."

Source: Klaviyo tutorial v4 build (2026-05-12) — v3 jumped into Settings; v4 added the All Forms beat as Step 1 and the tutorial read significantly clearer.

**🛑 Nav-fidelity hard check (narration ≠ visuals).** When narration names a navigation path — "open WPForms → Tools → Import Entries", "go to Settings → Integrations" — you MUST **show** that path: glide+click the real nav control, then `ifm.swap('<destination-snapshot>')` (or drive the snapshot's interactivity). NEVER load the destination snapshot directly while the narration describes navigating to it — that makes the spoken words and the screen disagree. This is the exact EEI #10 defect: `setup` loaded `admin-tools-import-entries` directly and ch1 just clicked the form already on screen, so the narrated "open WPForms → Tools → Import Entries" was never shown. The fix loaded `admin-forms-overview` (the natural entry), clicked **Tools** in `#adminmenu`, then `ifm.swap('admin-tools-import-entries')`. The snapshot's `outline.md` lists which nav links exist and which are HAND-BROWSE-ONLY (the `ifm.swap()` target to use). Driving real navigation is the load-bearing reason snapshots are interactive — honor it. (No static hook enforces this — it's a whole-file narration↔nav relationship the per-edit `video-guard` can't see; this skill rule is the gate.)

### Snapshot capture geometry — decided per capture, WITH Umair

There is no standard capture height. `1380×668` appears in existing captures and in the tutorial skeleton's mount geometry, but Umair never agreed it as a standard — treat it as an inherited liability, not a rule. Before any capture: state the viewport you intend to capture at and why (the slot it will be mounted in, the surface's own layout breakpoints), and get his call.

What still holds regardless of the agreed geometry: the capture width must match the slot it is mounted in. Klaviyo was captured at 1513–1624 wide into a 1380 slot; content reflowed inside the iframe and selectors that were valid at capture time drifted. Match the agreed slot, whatever it is.

Source: Klaviyo session retro 2026-05-12; standing ruling "668 was never agreed".

### When to skip skill-context.js boot dump

`node tools/skill-context.js` is helpful for fresh sessions exploring the repo cold. For CONTINUATION sessions where the prompt names the path/files in scope (e.g., Codex executor prompts at `docs/codex-prompts/`), the boot dump is noise. The author can go directly from AGENTS.md → the prompt → the code.

Rule: run `skill-context.js` only when you don't already know which path / files you're working on. If the user (or prompt) said "work on this file" or "continue this video," skip it.

Source: Klaviyo session retro 2026-05-12.

### Real captured snapshot + inline DOM = state variants

A single captured snapshot can demonstrate MULTIPLE visual states by toggling inline DOM after the swap. This is a powerful authoring technique for showing alternatives (action variants, configuration options, before/after) without capturing one snapshot per state.

**This is a WPForms-wide convention, not Klaviyo-specific.** The structure `[wpforms-builder-provider]-actions-data` + `[wpforms-builder-provider]-action-description` is shared across Mailchimp, Constant Contact, ActiveCampaign, Stripe (one-time/recurring), notifications (conditional rules), and any other multi-action provider/payment surface. The variant-data lookup table is provider-specific but the technique is identical. Author per provider; don't wrap in a library function — the data variation is too high.

Example from Klaviyo tutorial:

```js
// Swap to the real Connection settings panel (default state: Create / Update Profile)
await ifm.swap('builder-providers-klaviyo-connection');

// Then cycle through 3 Action variants using inline DOM puppetry —
// no additional snapshot needed.
async function showActionVariant(value, descriptionText) {
  const doc = ifm.doc();
  // Set the visible dropdown value
  const dropdown = doc.querySelector('#wpforms-providers-klaviyo-action');
  dropdown.value = value;
  // Replace the inner fields HTML to match
  const fieldsHost = doc.querySelector('.wpforms-builder-klaviyo-provider-actions-data');
  fieldsHost.innerHTML = VARIANT_FIELDS_HTML[value];
  // Show the matching description paragraph
  doc.querySelectorAll('.wpforms-builder-klaviyo-action-description').forEach(el => {
    el.style.display = el.dataset.action === value ? 'block' : 'none';
  });
}
await showActionVariant('unsubscribe', '...');
await wait(2);
await showActionVariant('remove_from_list', '...');
```

When to use this: tutorials demonstrating "this dropdown has 3 options, each does X / Y / Z." Capturing 3 separate snapshots for 3 nearly-identical states is wasteful and creates selector drift between captures. One real snapshot + inline DOM keeps the field IDs stable and the layout pixel-identical across variants.

When NOT to use this: when the variants change layout structurally (different fields, different containers). Then capture each as a real snapshot.

Aligned with INV-7 (library is reference, inline DOM is normal). The inline DOM is per-video, not promoted to library — it's specific to this video's narrative.

Source: Klaviyo tutorial v4 build (2026-05-12) — Action To Perform variant cycling in Chapter 5.

## Production Truth

Real WPForms UI is product truth. Do not fabricate.

- Use real captured snapshots as base structural surfaces.
- Do not create fake snapshot folders. Capture what is missing.
- Do not hand-write WPForms-looking HTML to avoid capture.
- DOM-derived states are allowed only when grounded by `node tools/field-state.js`, real captured DOM snippets, or cloned captured DOM.
- Document staged states in the storyboard and final summary: base snapshot + what was staged + product-truth source.
- Recapture only when the base structure is missing, broken, or not truthfully derivable.
- **Provider/addon videos — promote-to-top standing rule:** everywhere a provider list appears on camera (Marketing panel, Settings → Integrations, addons grid), stage the featured provider at the TOP of the list before capture/beat — viewers should never watch a scroll-hunt for the subject of the video.
- **Confirm a provider's INTERNAL slug from the site, not the DOM:** `node tools/site-eval.js "print_r(get_option('wpforms_providers'));"` — one command; DOM-grepping a capture for the slug is slower and can lie (SendGrid retro dev-fix #5).

**WRONG — invented dropdown markup:**
```js
// Don't write this. There's no snapshot for it; it's invented.
host.innerHTML = `<div class="wpforms-dropdown-open">
  <div>Option 1</div><div>Option 2</div>
</div>`;
```

**RIGHT — DOM-derived from product truth:**
```js
// Open the real dropdown using the puppetry helper, grounded in
// docs/wpforms-field-state-inventory.md (queried via tools/field-state.js).
await selectDropdown(sel.dropdownField, { pick: { type: 'option', label: 'Urgent' } });
```

## Default Authoring Mode

**NEW tutorial videos default to single-HTML authoring** — one `videos/<slug>/index.html` file with a master `gsap.timeline({ paused: true })` composing from `IframeManager` + `Cursor` + `WPFormsInteractions` + `videos/_shared/narration.js`. No engine, no manifest, no per-chapter `.js` modules. See `docs/video-architecture-invariants-2026-05-12.md` for the hard rules (INV-1 through INV-16) that govern single-HTML authoring.

**First write = copy the skeleton.** `cp docs/examples/single-html-tutorial-skeleton.html videos/<slug>/index.html` — it has the compliance baked in (hardened beat/say wrappers, instrumentation contract, ?scene= review wiring, native-res stage, onComplete end bookkeeping). Rules-in-prose lose to whatever the last-read reference did; the skeleton doesn't.

**Hardened awaits (INV-17):** the master flow must NEVER await a raw GSAP tween — an RAF-throttled tab (hidden tab, in-app Browser pane) freezes the ticker and deadlocks the video. Use the shared `say` / `beat` / `hideCaption` from `videos/_shared/narration.js` (setTimeout-resolved, `__sched` built in, motionFn fire-and-forget); keep tween-backed motion inside a beat's motionFn; wrap any top-level awaited primitive in `withTimeout(promise, seconds)` (same module).
**The legacy engine path is retired (2026-08-22).** `engine/`, `runtime/`, `manifest.json` and `chapters/*.js` no longer exist and no video remains on that path. Films import only from `videos/_shared/*` plus vendored GSAP script tags — never from removed paths (`engine/`, `runtime/`, `scenes/` beyond the snapshot-viewer harness). A legacy-era film, if ever revisited, is git-history work, not an authoring target.

When building a tutorial video, follow the single-HTML pattern + the **PostIntro → Tutorial** shape (no intro/outro cards — Kacie records the bookends; ruling 2026-08-28, rulebook §8) and write inline DOM puppetry for one-off interactions (INV-7).

## Tutorial Motion Baseline (pipeline-wide, Umair ruling 2026-08-22)

These are DEFAULTS baked into every tutorial build — not per-video asks:

1. **Row stagger** — table/list rows cascade-reveal on arrival at any surface.
2. **Click effects everywhere** — ripple + press feedback on every cursor action.
3. **popOut emphasis** — the story's key row/element gets a 2.5D lift before drilling in.
4. **Panel dolly-ins** — camera dollies per detail panel when touring surfaces;
   number columns tick up when narration talks numbers.
5. **Small UI states are DERIVED, not recaptured** — adding a note, toggling an
   option, opening a dropdown: build the real markup inline (grounded in plugin
   source or captured DOM), never re-capture a snapshot for it.

Handoffs MUST include the full-film URL plus per-chapter `?scene=` URLs.
After every TTS run: strip head silence (`tools/sfx/onset.mjs` trims) BEFORE
`measure-narration.js`, so cursor motion never outruns the voice.

### Per-scene review URLs (`?scene=`) — single-HTML

A single-HTML video plays one async `play()` timeline, so a reviewer otherwise has to watch the whole thing to check one scene. Wire the `?scene=<id>` affordance so Umair can view a single scene in isolation. **Review-only — the MP4 render runs the full timeline** (`tools/render-html.js` never sets `?scene=`), so it never changes the deliverable.

Use the shared helper `videos/_shared/scene-review.js` — don't re-roll the param parsing:

```js
import { reviewScene } from '/videos/_shared/scene-review.js';
async function play() {
  const review = reviewScene();
  // isolate an early scene + HOLD on its payoff (skip its exit fade):
  if (review.is('postintro')) { await runPostIntro({ isolate: true }); return; }
  // skip the preroll (intro + postintro) when a chapter is requested:
  if (!review.matches(/^ch\d+$/)) { /* intro */ /* postintro */ }
  // run setup + chapters, stopping after the requested one:
  showChapter(1, '…'); await beat('ch1', /* … */); if (review.stopAfter('ch1')) return;
  showChapter(2, '…'); await beat('ch2', /* … */); if (review.stopAfter('ch2')) return;
}
```

Review URLs: `http://localhost:<port>/videos/<slug>/index.html?scene=postintro` (or `?scene=ch1`, `?scene=ch2`, …). Hand these to Umair per scene during QC (see the `video-qc` skill).
### Single-HTML sync contracts (tutorial QC rounds, 2026-07-22/23)

These four contracts came out of those QC rounds — each one converts a class of "Umair's eye caught it" bugs into structure. The skeleton carries all of them; keep them when customizing.

1. **Camera follows the cursor — framed actions only.** Every cursor action lands INSIDE the current camera frame: `awaitLayout(target)` (targets can lay out a frame or two late after swaps) → ONE scroll → `fly()` only when the target is outside the frame → glide+click with `scroll:false` (a second scroll costs ~0.7s/action and pushes beats past their DUR). `camReset()` BEFORE any action outside the current frame — the camera must never trail the cursor or reset mid-next-beat. An unresolved target is a BUG: warn with the `[glideClick]` prefix; `smoke-singlehtml` FAILS on those warns by default.
2. **Field-attention contract.** When narration names a UI element ("smart tags", "Increment File Name"), the `hi()` highlight lands ON that phrase — time it inside the beat's motionFn to the clip's cadence, not at beat entry. The viewer's eye must be ON the thing being named while it's named.
3. **SCENE_PREP is a REQUIRED sibling of START_SNAPSHOT.** A `?scene=chX` run must open on the SAME visible state the full run has accumulated by that point: one idempotent prep function per scene replaying prior chapters' property-level puppetry, applied right after `ifm.load`. Full runs carry state; snapshots don't.
4. **DUR is measured, never estimated.** After every `tts/generate.js` run: `node tools/measure-narration.js <slug>` → paste the emitted block. Voice-coupled; re-measure on every re-render. The shared `beat()` records `window.__beatStats` (motion-vs-DUR per beat) and `smoke-singlehtml` warns on any beat whose motion outlives its clip by > 0.5s — fix the overrun, don't ignore the warn.

HISTORICAL (retired 2026-08-22): descriptor chapters were an engine-path concept and no longer exist. The rule survives in spirit: never downgrade a custom postIntro or replace specific animation with a generic focus/title beat.

## Standard Interactions — use the library, don't hand-roll

Tutorial chapters that include standard WPForms navigation flows (Add New Form, Select Template, Open in builder, Open Settings tab, Drag field, Open Field Options) should call into **`videos/_shared/wpforms-interactions.js`** rather than hand-writing the click + glide + swap + wait sequence. Each method (`navAddNewForm()`, `selectTemplate(slug)`, `openFormInList(formId)`, `navBuilderSidebar(section)`, `openSettingsTab(tab)`, `dragFieldToForm(slug)`, `openFieldOptions(fieldId)`) is grounded in real captured selectors, drives a `Cursor` from `motion-primitives.js`, and crossfades snapshots when needed. The matching Wave 1 sub-interactions (`setFieldLabel`, `setNameFormat`, `toggleEmailConfirmation`) handle the inline-mirror updates so the canvas re-renders live.

Load `wpforms-primitives` skill for the full per-method lookup before composing a chapter that does anything click-or-drag-shaped. One film has ONE cursor — the library `Cursor` the skeleton mounts; never hand-mount a second one (anti-pattern #1).

## Modern Features Cheat Sheet

Modern features worth reaching for. Each links to its dedicated skill or doc. **Most of these aren't surfaced in the tutorial skeleton** — load the relevant skill to use them.

| Feature | When to reach for it | Skill |
|---|---|---|
| `swapStyle: 'flipBridge'` | LEGACY (retired 2026-08-22) — cross-snapshot transitions are now authored directly inside one single-HTML timeline; see `wpforms-marketing` for morph-chain storyboards. |
| local inline `pausableRaf(cb)` | Any author RAF loop in a film. Define locally per film (canonical 7-line shape in `wpforms-gsap-rules`). | `wpforms-gsap-rules` |
| master timeline + `__tl/__T0/__sched/__done/__dur` globals | How renderers/probes discover the film's timing. See `wpforms-gsap-rules`. | `wpforms-gsap-rules` |
| `pausableRaf(cb)` | **Required** for any author Three.js / render-loop in a chapter. Vanilla `requestAnimationFrame` won't honor scrubber pause. | `wpforms-gsap-rules` |
| Editorial / mixed film shape | Ad-style / marketing video, or a hybrid (editorial chrome composited over real UI in ONE single-HTML film) | `wpforms-marketing` |
| `videos/_shared/blocks/` | Editorial chrome (code-card, mac-window, phone-frame, pill, arrow, route-line, terminal). Don't re-implement per video. | `wpforms-marketing` |
| `videos/_shared/effects.js` | Standard registered effects: `highlightPulse`, `fieldBurst`, `labelReveal`, `popOutTilt`, `cardReflow`. Call by name. | `wpforms-gsap-rules` |
| `text-kit.js` 24 presets | Hero text reveals (mask-reveal-up, spring-scale-in, focus-blur-resolve, ...). 24 Pixel-Point presets. | `wpforms-marketing` |
| `videos/_shared/atmospheric.js` | Marketing-mode helpers: grain, gradient sweep, parallax pair, scale push, dark backdrop. Use sparingly on tutorial beats; right at home in postIntros + ad-style chapters. | `wpforms-marketing` |
| `tools/render-singlehtml-audio.js <slug>` | In-repo MP4 export with narration + ducked BGM. Resolution auto-derives from the film's `.stage`. | - |
| serve any static server (`node tools/preview.js` or `npx serve`) | Review films live at `/videos/<slug>/index.html`. | — |
| `tools/lint-determinism.js` | Pre-commit determinism check (no `Date.now`, no unseeded `Math.random`, no `fetch`). | `wpforms-gsap-rules` |
| `awaitTween(tween)` | LEGACY helper name (kit.js retired) — for wall-clock waits use a local `sleep = ms => new Promise(r => setTimeout(r, ms))`. | `wpforms-gsap-rules` |

**Legacy manifest defaults (`breakStyle`/`swapStyle`) were retired 2026-08-22 with the engine. Cross-snapshot storytelling now happens inside one single-HTML timeline — plan it in the storyboard's morph-chain section.**

## Token Discipline

Use targeted tools before broad shell searches:

- `node tools/list-snapshots.js [--search <q>] [--for <slug>]` — snapshot inventory.
- `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]` — selector discovery.
- `node tools/verify-selectors.js <snapshot> ...` — selector validation.
- `node tools/field-state.js --field <name> [--summary]` — field-state evidence (don't full-read `docs/wpforms-field-state-inventory.md` directly).

### Querying plugin source for product truth (rf 6, rf 19)

Reading the plugin's own source during intake is legitimate and often the
only way to get the truth. Two rules:

1. **Always scope the grep.** `grep -rn` over a plugin directory walks
   minified bundles and vendor trees and blows the 120s tool timeout. Use
   `--include=*.php` (or `*.js`) plus a `src/` or `templates/` path.
2. **Plugin source outranks a capture for RULES.** Admin URLs, control
   selectors and render logic come from the source, never from inferring
   them by diffing two captures. Captures show *states*; source shows
   *rules* — including the states nobody captured (rf 19: 3 of 5 render
   rules were invisible in both available captures). When you mirror
   stripped behaviour, cite the plugin file and line numbers in the mirror's
   comment so the next person can diff it after a plugin update.

**Never:**

1. Full-read `docs/wpforms-field-state-inventory.md` during normal authoring (it's 132 KB; query via `field-state.js`).
2. List or read `videos/` packages at startup. Accepted packages are reference/debug only after you can name the exact pattern needed.
3. Inspect runtime internals during normal authoring. Use the skills, validators, and snapshot tools first.
4. Read AGENTS.md as a substitute for this skill. AGENTS.md is the operator manual; this skill is the authoring contract.

## Output Checklist

Before declaring a video done and handing off the review URL:

**Single-HTML videos (the default for new tutorials):**

- [ ] `node tools/validate-singlehtml.js <slug>` exits 0
- [ ] `node tools/smoke-singlehtml.js <slug> --seconds <__dur + slack>` exits 0 — strict-glide is the DEFAULT (unresolved cursor targets fail); check the beat-overrun warns too
- [ ] All narration `.mp3` files exist; DUR block pasted from `node tools/measure-narration.js <slug>` (never hand-estimated)
- [ ] PostIntro runs until its last story state lands (typically 8-15s long-form) with ≥5 phases (see `wpforms-postintro` skill)
- [ ] Storyboard staged states are documented in the final summary
- [ ] Provided playable HTML URL: `http://localhost:4321/videos/<slug>/index.html` (+ per-scene `?scene=` URLs)
- [ ] (User runs visual QC; you don't)

**Legacy engine videos:** none remain — the engine, runtime, and manifest path were retired 2026-08-22. Every video is single-HTML; use the checklist above.

## Push-Back Triggers

Stop and push back when:

- Storyboard approval has not happened (HARD-GATE above).
- A requested state would require fake WPForms UI.
- A snapshot is missing and cannot be truthfully derived.
- PostIntro is being weakened instead of built with approved animation surfaces.
- Implementation pressure points toward protected core (`videos/_shared/*` libraries, `snapshots/` captures and their `_shared` assets, the validators/smoke tools, `capture/capture.js`).
- A custom postIntro or a specific approved animation is being downgraded to a generic focus/title beat (the retired descriptor-mode failure — the rule survives).

## References (loaded on demand)

- `docs/postintro-patterns.md` — Read when designing or implementing a postIntro. Owned by the `wpforms-postintro` skill.
- `docs/video-production-templates.md` — Read only the section needed (storyboard / chapter / snapshot checklist / token budget / smoke spec).
- `docs/examples/choice-field-generate-choices-skeleton.md` — Read for choice-field videos (Dropdown, Multiple Choice, Checkboxes) that include AI Generate Choices. Engine-era module (historical API note): lift the beat plan and the product-truth rules, not the code.
- `docs/wpforms-field-state-inventory.md` — Canonical reference only. **Do not full-read.** Query via `node tools/field-state.js --field <name>`.
- `AGENTS.md` — Operator manual (boot order, protected core, validation commands, push-back triggers). Read for repo-wide rules; this skill owns video-authoring rules.

## Granular references (load on demand for the specific topic)

- `docs/cursor-choreography.md` — Read when authoring any cursor move beyond a single click. `Cursor.glide({ via })` is under-used.
- `docs/narration-writing.md` — Read when writing narration `.txt` files. Voice + sentence shape + verb-coupling rules.
- `docs/beat-pacing.md` — Read when a beat feels long or rushed; covers the 6-second rule and split heuristics.
- `docs/camera-lensing.md` — Read when picking `level:` for a beat. `1.0 / 1.18 / 2.2 / 2.4` reading guide.
- `docs/color-palette.md` — Read when adding any color to editorial chrome. Brand orange placement rules.
- Narration / BGM / SFX levels — `tools/render-singlehtml-audio.js` header (`--bgm-volume` bands + the post-render RMS check) and `tools/sfx/CONTEXT.md`. (`docs/audio-mastering.md` is the superseded manifest-era doc.)
- `docs/selector-hygiene.md` — Read when selectors break (selector source hierarchy; its `_selectors.js` modules are engine-era — selectors live inline in the film now).
- `docs/title-card-voice.md` — HISTORICAL (manifest-era intro/outro title cards, superseded 2026-08-28: tutorials carry no bookends). Its CTA-tone rules still read for shorts / editorial end cards.

## See Also

- `wpforms-primitives` — lookup index for `motion-primitives.js` + `wpforms-interactions.js`. Reach here before writing standard click/drag/glide sequences.
- `wpforms-postintro` — postIntro design + multi-animation rule + canonical references.
- `wpforms-gsap-rules` — GSAP L0 discipline + the master-timeline contract + pausableRaf.

- `wpforms-marketing` — editorial / mixed film shapes + ad-style composition.
