# Prompt — Klaviyo addon tutorial (end-to-end)

Full how-to video for the WPForms Klaviyo addon. Walks the viewer from "addon installed" all the way to "form submission appears as a Klaviyo profile." Single-HTML tutorial path.

Use this prompt when: starting a fresh session to author `videos/klaviyo-addon-tutorial/`. Distinct from the two existing Klaviyo videos:

- `videos/klaviyo-quick-connect/` — morph-chain intro/teaser (~14s editorial postIntro + brief tutorial). It still runs (only references `klaviyo-example-profile` for cross-snapshot loads + DOM-puppets `admin-settings-integrations`), but its tutorial chapter was authored BEFORE handoff-7's snapshot interactivity landed — every state change is hand-rolled DOM puppetry. The new tutorial below uses the wired hooks (`settings-integrations-row-toggle`, `-add-account-toggle`, `-connect-submit`, `builder-providers-connection-add`, `connection-cascade-reveal`) instead, so chapter code stays small. Reference `klaviyo-quick-connect/storyboard.md` for its S/A-tier postIntro pattern + atmosphere; do NOT clone its chapter code.
- `videos/klaviyo-bridge-2/` — pure editorial reference (no mac frame, no real product UI). Not a tutorial. Useful as a brand/atmosphere reference only.

This new video is the missing **full how-to** — long form, real product UI, narration-driven.

---

## How to use this file

1. Confirm the snapshots in the surface plan still exist (`node tools/list-snapshots.js --search klaviyo` + `--search integrations`).
2. Copy the **Prompt** block below and paste it as the first message in a fresh Claude session.
3. The session MUST write `videos/klaviyo-addon-tutorial/storyboard.md` FIRST and wait for your explicit approval before writing `index.html` or chapter code (HARD-GATE per `wpforms-video` skill).
4. The proposed storyboard skeleton at the bottom of this file is a starting point — the session can iterate it with you.

---

## Prompt

```
Make the full how-to tutorial video for the WPForms Klaviyo addon. Slug:
klaviyo-addon-tutorial.

Source doc: https://wpforms.com/docs/klaviyo-addon/

Architecture: single-HTML tutorial (CLAUDE.md default for NEW tutorial work).
One videos/klaviyo-addon-tutorial/index.html + master gsap.timeline({paused:true})
+ IframeManager (one iframe, cross-snapshot navigation via flipBridge) + Cursor
from videos/_shared/motion-primitives.js + WPFormsInteractions from
videos/_shared/wpforms-interactions.js + videos/_shared/narration.js.

NOT the legacy engine + manifest + chapters/*.js path. NOT split-screen
(BuilderFrontendSplit is wrong for this — multi-snapshot cross-surface, not
single-field mirror).

DO NOT duplicate existing Klaviyo videos:
- videos/klaviyo-quick-connect/ — morph-chain intro/teaser. Reference its
  storyboard.md for the S/A-tier postIntro pattern + the atmosphere /
  mac-frame visual scaffold. DO NOT clone its tutorial chapter code: it
  pre-dates handoff-7 snapshot interactivity and hand-rolls every state
  change via DOM puppetry on admin-settings-integrations. Our chapter
  code uses the wired hooks instead — much smaller surface.
- videos/klaviyo-bridge-2/ — pure editorial reference, not a tutorial.

This is the FULL end-to-end how-to. Audience: WPForms Plus+ users who
just installed the Klaviyo addon and need to wire it up.

LEVERAGE the wired snapshot interactivity (from handoffs 5-7) — DO NOT
reinvent DOM puppetry where a hook already exists. The captured snapshots
behave like the real plugin when the right selector is clicked. Pattern:
cursor click on a REAL selector → wired TRANSITIONS handler in
snapshots/_shared/interactivity.js runs → state changes. DOM puppetry is
the FALLBACK for things no hook covers (currently in this video:
cycling the Action To Perform dropdown to demonstrate Unsubscribe and
Remove from List variants). When in doubt, try the cursor-click path
first; fall back to puppetry only if the state doesn't update.

Shape (per wpforms-video skill, INV-11):
  Intro (3s, no mac frame)
  PostIntro (8-15s, no mac frame) — mandatory, multi-animation,
    topic-specific. Not generic. See PostIntro section below.
  Tutorial (~110-130s, inside mac frame) — 9 beats matching the
    snapshot order below.
  Outro (5s, no mac frame)

Target total: ~125-150s.

Surface plan — 9 beats, the snapshot for each, in order:

  1. snapshots/admin-settings-integrations/ — entry. Expand the Klaviyo
     row using the wired interactivity hook (settings-integrations-row-toggle),
     then trigger the add-account-toggle to reveal the API Key / Account
     Nickname / Connect to Klaviyo inputs.

  2. snapshots/klaviyo-dashboard/ — viewer "switches" to a Klaviyo browser
     tab. Cursor lands on the account-switcher (#account-switcher-toggle)
     and opens the account menu → Settings.

  3. snapshots/klaviyo-settings/ — Klaviyo product Settings page (account
     context). Brief stop. Cursor moves to the API Keys link in the sidebar.

  4. snapshots/klaviyo-api-keys/ — API Keys list. Cursor highlights the
     Create Private API Key button.

  5. snapshots/klaviyo-create-api-key/ — Create form. Type "WPForms" into
     the Name field via caretType, click Full Access scope, click Create.

  6. snapshots/klaviyo-private-key-confirmation/ — generated-key modal.
     Reveal the masked key, cursor on the Copy button. Narration emphasizes
     "Klaviyo only shows this key once."

  7. snapshots/admin-settings-integrations/ — return to WPForms. Crossfading
     back via IframeManager.swap() reloads the snapshot fresh — state from
     beat 1 is lost. Restore it by programmatically dispatching the right
     events ON the iframe document so the wired hooks re-fire:
       - click .wpforms-settings-provider-logo for the klaviyo row →
         settings-integrations-row-toggle expands the accordion
       - click .wpforms-settings-provider-accounts-toggle for klaviyo →
         settings-integrations-add-account-toggle reveals the connect form
     Then caretType the API Key, type the Account Nickname, click
     "Connect to Klaviyo" — settings-integrations-connect-submit drives
     the transition to "Connected ✓" (green pill + accounts list row added).

  8. snapshots/builder-providers-klaviyo/ — Form Builder, Marketing tab,
     Klaviyo provider selected. Cursor clicks Add New Connection
     (button.js-wpforms-builder-provider-connection-add). The wired
     builder-providers-connection-add hook opens the nickname modal
     AND queues the swap to builder-providers-klaviyo-connection — no
     custom overlay needed. Cursor types the nickname into the modal
     prompt, clicks OK, IframeManager auto-swaps to the connection panel.

  9. snapshots/builder-providers-klaviyo-connection/ — Connection settings
     panel. With Create / Update Profile selected (default), demonstrate
     the cascade reveal by cursor-clicking the real connection-block
     fields in order: Select Account → Action To Perform → Email field →
     List dropdown → Subscribe to Email Marketing toggle → Profile field
     mappings (First Name, Last Name, Phone). The wired
     connection-cascade-reveal hook walks the next-gated-thing reveal on
     each value commit — no manual unhiding needed.

     Then cycle the Action To Perform dropdown to show variants. This
     part likely needs light DOM puppetry (the cascade reveal handles
     opening, not back-and-forth between action types):
       - "Unsubscribe" (~5s) — hide action-specific subfields except Email;
         narration: "revokes consent globally."
       - "Remove from List" (~5s) — show Email + List dropdown (Email
         List preselected); narration: "drops them from one list, keeps
         consent."
     Restore to Create / Update Profile before the chapter ends.

     If you find a wired hook for Action-dropdown change that already
     toggles the correct subfield visibility, USE IT and skip puppetry.
     Check with: grep -n "action.*change\|provider-action" snapshots/_shared/interactivity.js
     before authoring this section.

     (Any inline UI fragment beyond what's in the captured DOM needs
     INV-15 // SOURCE: or // OVERRIDE: annotation.)

 10. snapshots/klaviyo-example-profile/ — payoff. Swap to the real Klaviyo
     profile that resulted from a form submission. Cursor lands on the
     profile, narration: "Every submission becomes a profile, automatically."

Action coverage required (from the doc):
  - Create / Update Profile — headline, full walkthrough in beat 9.
  - Unsubscribe — ~5s variant in beat 9.
  - Remove from List — ~5s variant in beat 9.

Out of scope (do NOT cover beat-by-beat):
  - Klaviyo subscription / billing setup.
  - Conditional logic on the connection (conditional-logic interactivity is
    wired but not the focus here — one-sentence narration mention only).
  - Phone number international-format troubleshooting (FAQ territory).
  - Custom property mapping (mention in passing during beat 9 if pacing allows;
    otherwise skip — the headline path is Email + List + Subscribe toggle).

PostIntro — mandatory per wpforms-video skill. Build per wpforms-postintro skill
(multi-animation rule, 5+ phases). Two viable directions — propose one in the
storyboard, do not silently pick:

  A. "Data bridge" concept (~8s, 10 phases)
     Two cards onstage: left = mini WPForms form (orange Subscribe button),
     right = mini Klaviyo profile card (Klaviyo-black #1A1A1F header,
     empty body). A dashed broken connection line between them with a
     small red lock icon. An API key chip (pk_•••) flies in from above,
     lands on the line. Lock flips green, line becomes solid orange.
     caretType writes sullie@flowers.com into the form's email field.
     Subscribe button squashes/glows; a submission pill emerges, traces
     the orange line right, bursts into the Klaviyo card. Avatar + email
     fill in. Green "Subscribed ✓" pill appears. Fade out → mac frame
     fades in. Five distinct animations: line draw, chip flight, caret
     typing, button squash, pill flight + profile fill.

  B. Adapt the klaviyo-quick-connect chain
     The existing klaviyo-quick-connect/storyboard.md describes a 9-phase
     form → submission pill → profile card → audience cascade morph
     chain. It is S/A-tier. Adapt rather than re-invent. The frame is
     "audience growth" (multiple profiles cascading), not "the
     connection itself" (the bridge concept). Different angle.

Propose A or B (or a third variant) in the storyboard with reasoning. Brand
discipline applies either way:
  - --wpf-orange #E27730 for primary brand surfaces (form, Subscribe button,
    caret, bridge line).
  - Klaviyo brand black #1A1A1F for Klaviyo profile card header.
  - --wpf-blue-light #0399ED for info/toggle accents if used.
  - NO purple. Klaviyo is not an AI feature.

Constraints (standing — repeat in case CLAUDE.md isn't in context):
  - Tutorial path, single-HTML (NOT legacy chapter/manifest).
  - No edits to runtime/* or engine/*.
  - No visual QC from you — Umair QCs.
  - Storyboard gate FIRST per wpforms-video skill — write
    videos/klaviyo-addon-tutorial/storyboard.md and WAIT for Umair's
    explicit approval BEFORE authoring index.html or chapter timeline.
  - Use motion-primitives Cursor for all cursor work. gsap.timeline for
    sequencing. Use WPFormsInteractions helpers where they exist; do NOT
    reinvent (openSettingsTab, etc.).
  - For cross-snapshot transitions inside the mac frame, use
    IframeManager.swap(slug) — it crossfades the new iframe over the old
    so there's no cream-bleed seam. (flipBridge is engine vocabulary,
    not relevant to single-HTML pattern.)
  - Real Klaviyo brand visuals only — DO NOT recolor.
  - Deterministic (INV-9): no Date.now, no unseeded Math.random (use
    mulberry32(seed)), no fetch at runtime, no repeat:-1 (use
    boundedRepeats(cycle, visible)).
  - INV-1: stage at native resolution (1440×820 or 1920×1080), no CSS
    transform on stage.
  - INV-15: any inline UI fragment (chips, overlays, action-variant
    field markup) needs a // SOURCE: snapshots/<name>/... citation OR
    // OVERRIDE: <user approval> annotation in the code itself.
  - INV-16: first write of index.html is not from blank. Copy
    videos/klaviyo-quick-connect/index.html as the STRUCTURAL scaffold
    only — keep atmosphere, mac frame, intro/outro shape, brand bug.
    DELETE its tutorial chapter logic (the DOM-puppet helpers like
    expandKlaviyoAccordion / markKlaviyoConnected) — those are obsolete
    now that interactivity.js wires the same hooks. Rebuild chapters
    using cursor clicks on real selectors. Cite the clone with
    // SOURCE: videos/klaviyo-quick-connect/index.html at the top.

Required reading BEFORE authoring:
  - .claude/skills/wpforms-video (Skill tool — procedural gate, file-read
    insufficient)
  - .claude/skills/wpforms-postintro (Skill tool — for postIntro design)
  - .claude/skills/wpforms-primitives (file-read OK — Cursor, IframeManager,
    caretType, statusPillMorph signatures)
  - .claude/skills/wpforms-gsap-rules (file-read OK — registered timelines,
    pausableRaf, boundedRepeats, L0 discipline)
  - .claude/skills/wpforms-transitions (file-read OK — flipBridge swap,
    camera poses)
  - videos/klaviyo-quick-connect/storyboard.md (S/A-tier postIntro reference
    + 5-chapter tutorial scaffolding)
  - docs/video-architecture-invariants-2026-05-12.md (INV-1, INV-9,
    INV-11, INV-15, INV-16)

Deliverables:
  - videos/klaviyo-addon-tutorial/storyboard.md (writes FIRST, gated)
  - videos/klaviyo-addon-tutorial/index.html
  - videos/klaviyo-addon-tutorial/narration/*.txt + rendered *.mp3
    (run: node tts/generate.js --video klaviyo-addon-tutorial)
  - Static checks pass:
      node tools/lint-determinism.js --video klaviyo-addon-tutorial
      (single-HTML path may not need tools/validate-video.js — confirm
      with current validator behavior; lint-determinism is mandatory.)
  - Motion-audit on the postIntro: invoke wpforms-motion-audit Skill tool
    BEFORE handoff, record tier. Bar = tier A. Anything B or below needs
    fix or explicit override.

Plus a playable review URL:
  - http://localhost:4321/videos/klaviyo-addon-tutorial/index.html

Push back if:
  - Any required snapshot is missing or selector-broken after re-verification.
  - Storyboard approval has not happened.
  - PostIntro is being weakened to a generic title/focus beat to save time.
  - Asked to fabricate any Klaviyo or WPForms UI not grounded in a real
    captured snapshot or wired interactivity.
```

---

## Proposed storyboard skeleton (starting point — iterate with Umair)

### Section A — Intro (0 → 3s)
Editorial card centered, no mac frame:
- Sullie SVG (`reference/wpforms-brand/assets/sullie-master.svg`)
- Heading: **"Klaviyo Addon"**
- Subhead: "Connect WPForms to Klaviyo — end to end"
- Fade in (0.7s) → hold (1.6s) → fade out (0.7s)

### Section B — PostIntro (3.5 → ~11.5s, ~8s)
Pick A (data bridge) or B (adapted audience-cascade chain). See Prompt block.

### Section C — Tutorial (~11.5 → ~135s, ~123s)
9 beats matching the surface plan in the Prompt block. Rough timing budget:

| # | Beat | Snapshot | ~Time |
|---|---|---|---|
| 1 | Open WPForms Integrations → expand Klaviyo → Add Account | `admin-settings-integrations` | 10s |
| 2 | Switch to Klaviyo → open account menu | `klaviyo-dashboard` | 7s |
| 3 | Settings (Account context) → sidebar to API Keys | `klaviyo-settings` | 6s |
| 4 | API Keys list → Create Private API Key | `klaviyo-api-keys` | 6s |
| 5 | Name = WPForms, Full Access, Create | `klaviyo-create-api-key` | 10s |
| 6 | Key reveal modal → copy (one-time-only narration) | `klaviyo-private-key-confirmation` | 8s |
| 7 | Back to WPForms → paste key + nickname → Connect | `admin-settings-integrations` (state-preserved) | 14s |
| 8 | Form Builder → Marketing → Klaviyo → Add Connection | `builder-providers-klaviyo` | 8s |
| 9 | Connection panel: Email + List + toggle + Profile fields. Then cycle Unsubscribe (~5s) + Remove from List (~5s) variants. Restore. | `builder-providers-klaviyo-connection` | 38s |
| 10 | Payoff — real Klaviyo profile from a form submission | `klaviyo-example-profile` | 8s |

### Section D — Outro (~135 → ~140s, ~5s)
Editorial card center, no mac frame:
- Heading: **"Connected."**
- Subhead: "Every form submission → a Klaviyo profile."
- Sullie bug bottom-right
- Fade in (0.5s) → hold (3.5s) → fade out (1.0s)

---

## Snapshot inventory check (run before pasting the Prompt)

```bash
node tools/list-snapshots.js --search klaviyo
node tools/list-snapshots.js --search integrations
```

Expected (all real, captured, on disk today):

- `admin-settings-integrations` (with wired interactivity for Klaviyo row open/connect)
- `klaviyo-dashboard`
- `klaviyo-settings`
- `klaviyo-api-keys`
- `klaviyo-create-api-key`
- `klaviyo-private-key-confirmation`
- `builder-providers-klaviyo`
- `builder-providers-klaviyo-connection`
- `klaviyo-example-profile`

If any are missing, capture before pasting the Prompt (workflow: open in LocalWP / Klaviyo, resize browser to 1380×668 to match mac-body inner width per `wpforms-video` skill capture standard, SingleFile capture, drop into `snapshots/<name>/`).

---

## Why this isn't a `BuilderFrontendSplit` job

The split-screen helper is for **single-field tutorials** where one builder option mirrors to one frontend element in real time. This tutorial is multi-surface, cross-snapshot: WPForms admin → Klaviyo dashboard → WPForms admin → WPForms builder → Klaviyo profile result. Different shape. Standard single-HTML + `IframeManager` cross-snapshot navigation is the right path.
