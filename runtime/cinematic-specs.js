// Cinematic specs — example/registry inputs for the lab.
//
// Schema lives in docs/cinematic-spec-contract.md. The runner
// (runtime/cinematic-spec-runner.js) does NOT validate beats — beats
// constrain the AI's implementation pass and give human reviewers a
// concrete sequence to QC against.
//
// Status legend:
//   draft      — proposed, not implemented yet
//   qc-failed  — implemented, rejected at visual QC, kept for traceability
//   approved   — implemented and visually approved by human
//   archived   — superseded; kept for history
//
// Adding a new spec:
//   1. Drop it into the SPECS array below.
//   2. Implement the archetype at runtime/cinematic-<kind>.js if missing.
//   3. Visit /scenes/cinematic-lab.html — the lab auto-renders a button.

export const SPECS = [
  // ---------------------------------------------------------------------
  // 1) cause-effect v1 — the existing Slice 1a output. QC-rejected for
  //    being under-specified: no typing, no inbox surface, email arrives
  //    as an isolated panel rather than from an unread row.
  //    Kept here as evidence of the system gap that motivated the spec
  //    contract.
  // ---------------------------------------------------------------------
  {
    id: 'cause-effect-v1-current',
    kind: 'cause-effect',                  // → runtime/cinematic-cause-effect.js (exists)
    version: 'v1',
    status: 'qc-failed',
    theme: {
      background: 'warm-cream',
      accent: '#E27730',
      mood: 'warm',
    },
    duration: 7,
    narration: null,
    surfaces: [
      { id: 'site',  kind: 'mac-window', notes: 'synthetic pre-filled contact form' },
      { id: 'email', kind: 'glass-card', notes: 'isolated email panel — QC-rejected for not emerging from an inbox' },
    ],
    beats: [
      { at: 0.0, do: 'fade-in',      target: 'site' },
      { at: 1.7, do: 'cursor-glide', target: 'site.submit' },
      { at: 3.2, do: 'cursor-click', target: 'site.submit' },
      { at: 3.7, do: 'dim',          target: 'site' },
      { at: 4.0, do: 'slide-in',     target: 'email' },
      { at: 5.2, do: 'caption',      text:   'Send the right email to the right person.' },
    ],
    motionNotes:
      'GSAP power3.out / cubic-bezier(0.22,1,0.36,1) throughout. ' +
      'Calm Apple-product cadence, no tutorial-snappy easings.',
    qcChecks: [
      'cause/effect reads instantly',
      'no tutorial-snappy motion',
      'gradients tasteful and near WPForms palette',
    ],
    opts: {
      formName:  'Contact Us',
      recipient: 'site-admin@example.com',
      subject:   'New Entry: Contact Us',
      label:     'Send the right email to the right person.',
    },
    notes:
      'Built in Slice 1a. Visual QC verdict: under-specified. ' +
      'No typing, no SFX, no recognizable inbox surface, email arrives ' +
      'as an isolated panel rather than from an unread row. ' +
      'Treat this entry as evidence of the system gap that motivated the ' +
      'spec contract — the architecture should generate cause-effect-gmail ' +
      '(below) instead.',
  },

  // ---------------------------------------------------------------------
  // 2) cause-effect v2 — Gmail-like inbox arrival. QC-PASSED.
  //    This is the first approved mandatory post-intro archetype.
  // ---------------------------------------------------------------------
  {
    id: 'cause-effect-gmail',
    kind: 'cause-effect-gmail',            // → runtime/cinematic-cause-effect-gmail.js
    version: 'v2-gmail',
    status: 'approved',
    theme: {
      background: 'warm-cream',
      accent: '#E27730',
      mood: 'warm',
    },
    duration: null,                        // narration-driven
    narration: ['post-intro-1', 'post-intro-2'],
    surfaces: [
      { id: 'site',         kind: 'mac-window',  notes: 'synthetic browser-chrome contact form' },
      { id: 'inbox',        kind: 'gmail-pane',  notes: 'Gmail-like inbox; rows visible; orange unread accent' },
      { id: 'email-detail', kind: 'detail-card', notes: 'opens FROM the unread row; not floating in space' },
    ],
    beats: [
      { at: 0.0, do: 'fade-in',      target: 'site' },
      { at: 1.0, do: 'type-into',    target: 'site.name',    text: 'Sullie Eloso',                sfx: 'type' },
      { at: 1.9, do: 'type-into',    target: 'site.email',   text: 'sullie@example.com',          sfx: 'type' },
      { at: 2.7, do: 'type-into',    target: 'site.message', text: 'Hi team — quick question.',   sfx: 'type' },
      { at: 4.0, do: 'cursor-glide', target: 'site.submit' },
      { at: 4.6, do: 'cursor-click', target: 'site.submit',  sfx: 'click' },
      { at: 4.9, do: 'dim',          target: 'site' },
      { at: 5.1, do: 'reveal',       target: 'inbox' },
      { at: 5.8, do: 'arrive-row',   target: 'inbox.unread' },
      { at: 6.6, do: 'cursor-click', target: 'inbox.unread', sfx: 'click' },
      { at: 6.9, do: 'open-card',    target: 'email-detail', from: 'inbox.unread' },
      { at: 7.6, do: 'caption',      text:   'Send the right email to the right person.' },
    ],
    motionNotes:
      'Long ease-outs (cubic-bezier(0.22,1,0.36,1)). Type pacing 35–55ms/char with ±10% jitter. ' +
      'Cursor glides on power3.out at ~1.4s. The email-detail card MUST visually emerge from ' +
      'the unread inbox row position (shared layout/origin), not float in from offscreen. ' +
      'SFX use existing runtime/sfx.js channels (type / click).',
    qcChecks: [
      'typing pacing reads as natural, not tutorial-snappy',
      'recognizable Gmail-like inbox surface',
      'unread row visibly arrives at the top of the inbox',
      'email-detail card opens from the unread row, not from offscreen',
      'caption lands only after the cause/effect is visually obvious',
      'gradients tasteful and near WPForms palette',
    ],
    opts: {
      formName:  'Contact Us',
      recipient: 'site-admin@example.com',
      subject:   'New Entry: Contact Us',
      label:     'Send the right email to the right person.',
      site: {
        url:   'sulliesbakery.com/contact',
        brand: "Sullie's Bakery",
        fields: [
          { label: 'Name',    value: 'Sullie Eloso' },
          { label: 'Email',   value: 'sullie@example.com' },
          { label: 'Message', value: 'Hi team — quick question.' },
        ],
      },
      inbox: {
        account: 'you@yoursite.com',
        unread: {
          from:    'WordPress',
          subject: 'New Entry: Contact Us — Name: Sullie Eloso',
          time:    'just now',
        },
      },
    },
    notes:
      'Replaces cause-effect-v1-current. Built and QC-passed by human. ' +
      'This is the approved default post-intro archetype for notification ' +
      'videos until the idea generator selects a better per-video fit.',
  },

  // ---------------------------------------------------------------------
  // 3) workflow-map — three connected glass chips revealing in sequence.
  //    QC-FAILED. The first implementation technically animated but read
  //    as a static slide deck — three cards in a row with lines. The
  //    spec was too thin: it described entry order without committing
  //    to a visible transformation. Kept here as evidence for the
  //    transformation-requirement rule (see docs/cinematic-spec-contract.md
  //    §"Cinematic transformation requirement").
  // ---------------------------------------------------------------------
  {
    id: 'workflow-map-default',
    kind: 'workflow-map',                  // → runtime/cinematic-workflow-map.js
    status: 'qc-failed',
    theme: {
      background: 'cool-paper',
      accent: '#056AAB',
      mood: 'cool',
    },
    duration: 7,
    narration: ['workflow-1', 'workflow-2'],
    surfaces: [
      { id: 'chip-1',    kind: 'glass-chip', notes: 'Form Submitted' },
      { id: 'chip-2',    kind: 'glass-chip', notes: 'Notification Fires' },
      { id: 'chip-3',    kind: 'glass-chip', notes: 'Email Lands' },
      { id: 'arrow-1-2', kind: 'line-draw' },
      { id: 'arrow-2-3', kind: 'line-draw' },
    ],
    transformation:
      '(missing) — original spec described entry order without committing to a visible transformation. ' +
      'Result: three cards with connector lines that read as a slide deck.',
    startPose:         '(missing in original spec)',
    finalPose:         '(missing in original spec)',
    motionPath:        '(missing in original spec)',
    stillFrameRead:    '(missing in original spec)',
    motionRead:        '(missing in original spec)',
    forbiddenOutcomes: [
      'static row of three cards with connector lines',
      'slide-deck composition',
      'parallel reveals without travel paths',
    ],
    beats: [
      { at: 0.0, do: 'fade-in',   target: 'backdrop' },
      { at: 0.4, do: 'spring-in', target: 'chip-1' },
      { at: 1.4, do: 'line-draw', target: 'arrow-1-2' },
      { at: 2.0, do: 'spring-in', target: 'chip-2' },
      { at: 3.0, do: 'line-draw', target: 'arrow-2-3' },
      { at: 3.6, do: 'spring-in', target: 'chip-3' },
      { at: 4.4, do: 'caption',   text: 'A submission becomes the right email.' },
    ],
    motionNotes:
      'Each chip uses the spring-scale-in animate-text preset for its label. ' +
      'Arrows use runtime/line-draw.js with its `parent` parameter targeting the ' +
      'overlay root. No tutorial-snappy easings; chip transitions ≥600ms.',
    qcChecks: [
      'three chips with restrained typography',
      'arrows draw in sequence, not simultaneously',
      'cool-paper gradient stays close to WPForms palette',
      'final caption reveals only after all three chips have landed',
      // Added after the qc-failed verdict; not satisfied by the current spec:
      'scene does not read as a static row of cards',
      'workflow tells a transformation story, not a labeling story',
    ],
    opts: {
      chips: [
        { id: 'chip-1', icon: 'form',     label: 'Form Submitted'     },
        { id: 'chip-2', icon: 'gear',     label: 'Notification Fires' },
        { id: 'chip-3', icon: 'envelope', label: 'Email Lands'        },
      ],
    },
    notes:
      'QC-FAILED 2026-04-27. First implementation reads as a static three-card row ' +
      'with connector lines — correct beat order, wrong cinematic. The lesson: a beat ' +
      'sheet is not a cinematic spec. Future work on this kind must (a) define a real ' +
      'transformation (e.g. chips converging into a single envelope, or a thread of ' +
      'data flowing through them), (b) make the chips travel — not just appear, and ' +
      '(c) add stillFrameRead / motionRead / forbiddenOutcomes per the contract. Do ' +
      'not re-implement workflow-map until a revised spec lands.',
  },

  // ---------------------------------------------------------------------
  // 4) form-build-constellation — "the form takes shape from a cloud of
  //    field chips." Maps to real WPForms docs (creating a contact form,
  //    adding fields, building first form). Designed to be the second
  //    cinematic that exercises the new transformation-requirement rule.
  //    NOT IMPLEMENTED YET. Lab shows "not implemented yet" panel.
  // ---------------------------------------------------------------------
  {
    id: 'form-build-constellation',
    kind: 'form-build-constellation',     // → runtime/cinematic-form-build-constellation.js (exists)
    status: 'draft',
    theme: {
      background: 'warm-cream',           // 'neutral-fog' is also acceptable
      accent: '#E27730',
      mood: 'warm',
    },
    duration: null,                        // narration-driven
    narration: ['form-build-1'],
    surfaces: [
      { id: 'blank-form-outline',  kind: 'glass-surface',
        notes: 'centered glass plate with a faint ruled outline of an empty form (header bar + 3 empty row slots)' },
      { id: 'field-chip-orbit',    kind: 'chip-cloud',
        notes: 'small glass chips drifting in a soft orbit around the form: Name, Email, Message, Dropdown, File Upload' },
      { id: 'selected-field-chips', kind: 'chip-set',
        notes: 'three of the orbit chips pulse and lift slightly to mark themselves as selected (Name, Email, Message)' },
      { id: 'settled-form-rows',   kind: 'form-rows',
        notes: 'real form-row DOM that each selected chip morphs into — label + input rectangle' },
    ],
    transformation:
      'A cloud of floating field chips converges into a blank form outline; the chosen ' +
      'chips morph into clean form rows so the form takes shape in front of the viewer.',
    startPose:
      'Glass form outline centered with three empty row slots. ~5 field chips drift in a soft ' +
      'orbit around it (offset, rotation, parallax). All chips at low saturation.',
    finalPose:
      'Form outline filled with three settled rows (Name, Email, Message). Remaining orbit ' +
      'chips have faded back. Caption sits below the form.',
    motionPath:
      'Each selected chip lifts out of the orbit, travels along a curved path toward its row ' +
      'slot, and on arrival morphs from chip-shape into a row (label + input). Travel paths ' +
      'must be visible — not straight teleports. Origins differ per chip so the eye reads ' +
      '"converging," not "fading in."',
    stillFrameRead:
      'A still mid-scene shows a chip in flight with its travel path implied by motion blur / ' +
      'easing position; another chip mid-morph (half chip, half row); the form outline visibly ' +
      'partially-built. Never a frame that looks like "three chips on top of three rows."',
    motionRead:
      'The viewer sees a form being assembled out of available pieces — exactly the WPForms ' +
      '"add fields to your form" mental model, without showing the live builder UI.',
    forbiddenOutcomes: [
      'static row of three chips that fade in next to the form',
      'no visible travel paths (teleporting chips)',
      'chip-to-row morph that is just a crossfade',
      'orbit chips that never move (decoration without motion)',
      'slide-deck composition',
    ],
    beats: [
      { at: 0.0, do: 'fade-in',   target: 'blank-form-outline' },
      { at: 0.6, do: 'orbit-in',  target: 'field-chip-orbit',
        chips: ['Name', 'Email', 'Message', 'Dropdown', 'File Upload'] },
      { at: 1.6, do: 'select',    target: 'selected-field-chips',
        chips: ['Name', 'Email', 'Message'] },
      { at: 2.4, do: 'glide-in',  target: 'selected-field-chips',
        notes: 'curved travel paths into the form outline; staggered by ~180ms' },
      { at: 3.6, do: 'morph',     target: 'settled-form-rows',
        notes: 'chip → row transformation; chip background expands into row, label re-anchors left, input rectangle resolves' },
      { at: 5.0, do: 'fade-out',  target: 'field-chip-orbit',
        notes: 'remaining orbit chips fade back so the form is the only focus' },
      { at: 5.8, do: 'caption',   text: 'Start with the fields you need.' },
    ],
    motionNotes:
      'Apple-product cadence — long ease-outs (cubic-bezier(0.22, 1, 0.36, 1)). Curved travel ' +
      'paths via GSAP MotionPath OR a hand-built Bezier; do NOT animate left/top linearly. The ' +
      'chip-to-row morph must be obvious — width grows toward row width, label slides left, ' +
      'input rectangle resolves underneath. No straight crossfade. Orbit chips have a slow ' +
      'continuous drift (sine wobble, not random) so the constellation feels alive even at rest.',
    qcChecks: [
      'viewer can tell this is form-building without narration',
      'chips visibly travel into the form (no teleports)',
      'chips become rows (transformation, not crossfade)',
      'scene does not look like a slide diagram',
      'orbit reads as a constellation, not a static decoration',
      'gradients remain premium and WPForms-near',
      'forbidden outcomes from the spec are not present',
    ],
    opts: {
      formTitle: 'Contact Us',
      orbit: [
        { label: 'Name',        icon: 'user' },
        { label: 'Email',       icon: 'at' },
        { label: 'Message',     icon: 'lines' },
        { label: 'Dropdown',    icon: 'chevron' },
        { label: 'File Upload', icon: 'upload' },
      ],
      selected: ['Name', 'Email', 'Message'],
      caption: 'Start with the fields you need.',
    },
    notes:
      'Maps to WPForms docs: "Creating Your First Form", "Setting Up Your Form Fields", ' +
      'and the contact-form how-to. Designed as the second cinematic that exercises the ' +
      'new transformation-requirement rule (after the workflow-map qc-failure). DO NOT ' +
      'auto-implement; awaits a future implementation prompt.',
  },

  // ---------------------------------------------------------------------
  // 5–7) mascot-lottie-pop — three motion variants of the Sullie Lottie
  //     flourish, all powered by runtime/cinematic-mascot-lottie-pop.js.
  //     Lottie is mascot/brand-only — never used for live WPForms UI.
  //     Asset: assets/sullie.lottie (dotLottie zip bundle).
  // ---------------------------------------------------------------------
  {
    id: 'mascot-lottie-pop',
    kind: 'mascot-lottie-pop',
    status: 'draft',
    theme: { background: 'warm-cream', accent: '#E27730', mood: 'warm' },
    duration: null,
    transformation:
      'Sullie pops up from below, settles at center, and the caption ' +
      'mask-reveals beneath.',
    startPose:      'Empty warm-cream gradient backdrop.',
    finalPose:      'Sullie at rest, centered, with caption beneath.',
    motionPath:
      'Backdrop fades up; mascot lifts from translateY(28px) scale(0.92) → ' +
      'translateY(0) scale(1) over 820ms cubic-bezier(0.22,1,0.36,1); Lottie ' +
      'plays once at natural speed; caption mask-reveals.',
    stillFrameRead: 'Any pause shows mascot mid-lift or at rest.',
    motionRead:     'A premium brand flourish, not a sticker pop.',
    forbiddenOutcomes: [
      'sticker-style bounce easing',
      'cartoony squash/stretch',
      'Lottie used for any WPForms UI element',
    ],
    beats: [
      { at: 0.0, do: 'fade-in', target: 'backdrop' },
      { at: 0.6, do: 'enter',   target: 'mascot'   },
      { at: 1.3, do: 'reveal',  target: 'caption'  },
    ],
    qcChecks: [
      'mascot lifts then settles (no bounce)',
      'caption reads cleanly at rest',
      'overlay sits at z-index 600 and dismisses cleanly',
    ],
    opts: {
      variant:   'pop',
      lottieSrc: '/assets/sullie.lottie',
      caption:   "Let's build it in WPForms.",
    },
    notes: 'Variant 1 of 3 — calm pop-up at center.',
  },

  {
    id: 'mascot-lottie-wave',
    kind: 'mascot-lottie-pop',
    status: 'draft',
    theme: { background: 'warm-cream', accent: '#E27730', mood: 'warm' },
    duration: null,
    transformation:
      'Sullie steps into frame from the right, then loops her gesture ' +
      'while the caption reveals.',
    startPose:      'Empty warm-cream backdrop; mascot offscreen-right.',
    finalPose:      'Sullie at rest center, looping; caption beneath.',
    motionPath:
      'Backdrop fades up; mascot translates from translateX(96px) scale(0.95) ' +
      '→ translateX(0) scale(1) over 920ms cubic-bezier(0.22,1,0.36,1); ' +
      'Lottie loops at natural speed; caption mask-reveals.',
    stillFrameRead: 'Any pause shows mascot mid-step or mid-gesture.',
    motionRead:     'Sullie walks in and waves alongside the message.',
    forbiddenOutcomes: [
      'mascot teleports without lateral travel',
      'gesture loop visibly stutters on restart',
      'Lottie used for any WPForms UI element',
    ],
    beats: [
      { at: 0.0, do: 'fade-in',     target: 'backdrop' },
      { at: 0.6, do: 'enter-right', target: 'mascot'   },
      { at: 1.5, do: 'loop',        target: 'mascot'   },
      { at: 1.6, do: 'reveal',      target: 'caption'  },
    ],
    qcChecks: [
      'lateral travel reads clearly (not a fade-in-place)',
      'gesture loop is continuous, not visibly seamed',
      'caption reads cleanly while mascot loops',
    ],
    opts: {
      variant:   'wave',
      lottieSrc: '/assets/sullie.lottie',
      caption:   "Let's build it in WPForms.",
    },
    notes: 'Variant 2 of 3 — lateral entry from right, looping gesture.',
  },

  {
    id: 'mascot-lottie-orbit',
    kind: 'mascot-lottie-pop',
    status: 'draft',
    theme: { background: 'warm-cream', accent: '#E27730', mood: 'warm' },
    duration: null,
    transformation:
      'Sullie fades in centered, then quietly breathes — a slow vertical ' +
      'float — while the caption reveals beneath.',
    startPose:      'Empty warm-cream backdrop.',
    finalPose:      'Sullie centered, gently floating, caption beneath.',
    motionPath:
      'Backdrop fades up; mascot fades in over 720ms, then runs a 2.6s ' +
      'ease-in-out alternate float between translateY(0) and translateY(-12px); ' +
      'Lottie loops at 0.7× speed; caption mask-reveals.',
    stillFrameRead: 'Any pause shows mascot mid-float — never a frozen tableau.',
    motionRead:     'A calm idle — Sullie hangs out while the message lands.',
    forbiddenOutcomes: [
      'visible bobbing that reads as cartoon hover',
      'Lottie playing at full speed (would feel busy paired with the float)',
      'Lottie used for any WPForms UI element',
    ],
    beats: [
      { at: 0.0, do: 'fade-in', target: 'backdrop' },
      { at: 0.6, do: 'fade-in', target: 'mascot'   },
      { at: 1.3, do: 'float',   target: 'mascot'   },
      { at: 1.4, do: 'reveal',  target: 'caption'  },
    ],
    qcChecks: [
      'float reads as a quiet breath, not a bounce',
      'Lottie loops at slowed cadence and stays calm',
      'caption reads cleanly under the floating mascot',
    ],
    opts: {
      variant:   'orbit',
      lottieSrc: '/assets/sullie.lottie',
      caption:   "Let's build it in WPForms.",
    },
    notes: 'Variant 3 of 3 — quiet centered fade-in with continuous breath.',
  },

  // ---------------------------------------------------------------------
  // 8) mascot-lottie-center-pop — friendly intro beat. Sullie scales in
  //    at center with a small bounce/settle, then a caption reveals.
  // ---------------------------------------------------------------------
  {
    id: 'mascot-lottie-center-pop',
    kind: 'mascot-lottie-pop',
    status: 'draft',
    theme: { background: 'warm-cream', accent: '#E27730', mood: 'warm' },
    duration: null,
    transformation:
      'Sullie scales up from small at center with a soft overshoot, ' +
      'settles, and the caption mask-reveals beneath.',
    startPose: 'Empty warm-cream backdrop.',
    finalPose: 'Sullie centered at full size; caption beneath, settled.',
    motionPath:
      'Backdrop fades up; mascot scales from translateY(20px) scale(0.6) → ' +
      'translateY(0) scale(1) over 780ms cubic-bezier(0.34,1.56,0.64,1) (small ' +
      'overshoot, then settle — no second bounce); Lottie plays once; caption ' +
      'mask-reveals.',
    stillFrameRead: 'Any pause shows mascot mid-scale or settled at center.',
    motionRead:     'A friendly hello — premium, not sticker-y.',
    forbiddenOutcomes: [
      'second visible bounce after settle',
      'cartoony squash/stretch',
      'caption appears before mascot has settled',
      'Lottie used for any WPForms UI element',
    ],
    beats: [
      { at: 0.0, do: 'fade-in', target: 'backdrop' },
      { at: 0.6, do: 'pop-in',  target: 'mascot'   },
      { at: 1.4, do: 'settle',  target: 'mascot'   },
      { at: 1.5, do: 'reveal',  target: 'caption'  },
    ],
    qcChecks: [
      'overshoot reads as a single soft bounce, not a spring',
      'caption lands only after mascot has settled',
      'overlay sits at z-index 600 and dismisses cleanly',
    ],
    opts: {
      variant:   'center-pop',
      lottieSrc: '/assets/sullie.lottie',
      caption:   'Hi! I\'m Sullie.',
    },
    notes: 'Friendly intro beat — scales in with a soft bounce, single play.',
  },

  // ---------------------------------------------------------------------
  // 9) mascot-lottie-sidekick-guide — tutorial helper beat. Sullie enters
  //    from the side, leans toward a glass message panel, panel reveals.
  // ---------------------------------------------------------------------
  {
    id: 'mascot-lottie-sidekick-guide',
    kind: 'mascot-lottie-pop',
    status: 'draft',
    theme: { background: 'warm-cream', accent: '#E27730', mood: 'warm' },
    duration: null,
    transformation:
      'Sullie steps in from the left and leans toward a glass message panel ' +
      'on the right; the panel reveals an eyebrow + title + body.',
    startPose:
      'Empty warm-cream backdrop; mascot offscreen-left; panel hidden.',
    finalPose:
      'Sullie at rest mid-left with a slight rightward tilt; glass panel ' +
      'settled to her right, fully revealed.',
    motionPath:
      'Backdrop fades up; mascot translates from translateX(-90px) rotate(0deg) ' +
      'scale(0.95) → translateX(0) rotate(3deg) scale(1) over 880ms ease-out, ' +
      'so the rest pose visibly leans toward the panel; Lottie loops; panel ' +
      'fades + slides from translateX(24px) to 0 over 720ms.',
    stillFrameRead:
      'Any pause shows mascot mid-step or leaning, panel mid-reveal — never ' +
      'a static "two cards side by side" frame.',
    motionRead:
      'Sullie is guiding — she physically angles toward the message.',
    forbiddenOutcomes: [
      'mascot facing forward without lean (reads as decoration, not guide)',
      'panel teleports without the slide-in',
      'panel and mascot reveal in lockstep (kills the guide read)',
      'Lottie used for any WPForms UI element',
    ],
    beats: [
      { at: 0.0, do: 'fade-in',    target: 'backdrop' },
      { at: 0.6, do: 'enter-left', target: 'mascot'   },
      { at: 1.4, do: 'lean',       target: 'mascot'   },
      { at: 1.5, do: 'reveal',     target: 'panel'    },
    ],
    qcChecks: [
      'lateral travel reads clearly (not a fade-in-place)',
      'rest tilt visibly points toward the panel',
      'panel reveals after mascot has settled, not in lockstep',
      'panel typography is restrained and premium',
    ],
    opts: {
      variant:      'sidekick-guide',
      lottieSrc:    '/assets/sullie.lottie',
      panelEyebrow: 'Quick tip',
      panelTitle:   'Drag fields to build your form',
      panelBody:    'Pick a field on the left and drop it on the canvas to add it.',
    },
    notes: 'Tutorial helper beat — Sullie + glass message panel.',
  },

  // ---------------------------------------------------------------------
  // 10) mascot-lottie-outro-signoff — outro/signoff beat. Sullie floats
  //     near the WPForms wordmark, sparks pulse, then a clean fade out.
  // ---------------------------------------------------------------------
  {
    id: 'mascot-lottie-outro-signoff',
    kind: 'mascot-lottie-pop',
    status: 'draft',
    theme: { background: 'warm-cream', accent: '#E27730', mood: 'warm' },
    duration: null,
    transformation:
      'Sullie fades in floating beside the WPForms wordmark; small spark ' +
      'accents pulse around them; the cinematic dismisses on a clean fade.',
    startPose:
      'Empty warm-cream backdrop.',
    finalPose:
      'Sullie at rest gently floating; wordmark settled to her right; ' +
      'sparks pulsing on staggered offsets.',
    motionPath:
      'Backdrop fades up; mascot fades in over 720ms then runs a 3.2s ' +
      'ease-in-out alternate float (translateY 0 ↔ -12px); wordmark fades + ' +
      'lifts from translateY(8px) → 0 over 800ms; 5 spark dots run a 2.4s ' +
      'pulse with 0.32s staggers; Lottie loops at 0.8× speed.',
    stillFrameRead:
      'Any pause shows the mascot mid-float and at least one spark mid-pulse — ' +
      'never a flat tableau.',
    motionRead:
      'A calm celebratory signoff — "thanks, see you again," not confetti.',
    forbiddenOutcomes: [
      'confetti or burst-style sparks',
      'sparks all pulsing in unison (reads as a single blink)',
      'wordmark stretched or filtered beyond a soft drop-shadow',
      'Lottie playing at full speed (would feel busy paired with the float)',
      'Lottie used for any WPForms UI element',
    ],
    beats: [
      { at: 0.0, do: 'fade-in', target: 'backdrop' },
      { at: 0.6, do: 'fade-in', target: 'mascot'   },
      { at: 1.3, do: 'float',   target: 'mascot'   },
      { at: 1.4, do: 'reveal',  target: 'wordmark' },
      { at: 1.6, do: 'pulse',   target: 'sparks'   },
    ],
    qcChecks: [
      'sparks pulse on staggered offsets, never in unison',
      'wordmark reads cleanly beside the floating mascot',
      'final fade-out feels intentional, not abrupt',
    ],
    opts: {
      variant:      'outro-signoff',
      lottieSrc:    '/assets/sullie.lottie',
      wordmarkSrc:  '/assets/wordmark.svg',
    },
    notes: 'Outro/signoff beat — mascot + wordmark + sparks.',
  },

  // ---------------------------------------------------------------------
  // 11) mascot-lottie-intro-wave — friendly intro beat. Sullie appears
  //     and waves while smiling; caption reveals beneath.
  // ---------------------------------------------------------------------
  {
    id: 'mascot-lottie-intro-wave',
    kind: 'mascot-lottie-pop',
    status: 'draft',
    theme: { background: 'warm-cream', accent: '#E27730', mood: 'warm' },
    duration: null,
    transformation:
      'Sullie fades in centered with a small lift, waves continuously, and ' +
      'the caption mask-reveals beneath.',
    startPose: 'Empty warm-cream backdrop.',
    finalPose:
      'Sullie centered, looping her wave; caption beneath, settled.',
    motionPath:
      'Backdrop fades up; mascot lifts from translateY(18px) scale(0.94) → ' +
      'translateY(0) scale(1) over 760ms cubic-bezier(0.22,1,0.36,1); Lottie ' +
      'loops at natural speed (the wave gesture); caption mask-reveals.',
    stillFrameRead:
      'Any pause shows Sullie mid-wave, not a frozen smile-and-stand.',
    motionRead:
      'A warm hello — Sullie greets the viewer.',
    forbiddenOutcomes: [
      'wave loop visibly seams on restart',
      'mascot static (no continuous gesture)',
      'caption appears before mascot has settled',
      'Lottie used for any WPForms UI element',
    ],
    beats: [
      { at: 0.0, do: 'fade-in', target: 'backdrop' },
      { at: 0.6, do: 'lift-in', target: 'mascot'   },
      { at: 1.4, do: 'loop',    target: 'mascot'   },
      { at: 1.5, do: 'reveal',  target: 'caption'  },
    ],
    qcChecks: [
      'wave loop is continuous, not visibly seamed',
      'caption lands after mascot has settled',
      'mascot reads as friendly, not sticker-y',
    ],
    opts: {
      variant:   'intro-wave',
      lottieSrc: '/assets/sullie.lottie',
      caption:   'Hi! Welcome to WPForms.',
    },
    notes: 'Friendly intro beat — Sullie appears and waves.',
  },
];

/** Find a spec by id. Returns null when not found. */
export function getSpec(id) {
  return SPECS.find((s) => s.id === id) || null;
}

/** Convenience: list of `{ id, kind, status }` for lab toolbar rendering. */
export function listSpecs() {
  return SPECS.map((s) => ({ id: s.id, kind: s.kind, status: s.status }));
}
