// Single source of truth for every overlay visual.
//
// Change values here to tune the ENTIRE system — highlight rings, instruction
// labels, click ripples, zoom trim. No overlay renderer should hard-code a
// value that isn't defined here. No beat/chapter/idea should inline styling.
//
// If you catch yourself adding another config knob at a call site, add it
// here instead and thread it through.

export const OVERLAYS_CONFIG = {
  // ── Camera / zoom ─────────────────────────────────────────────────────
  zoom: {
    defaultFill: 0.5,    // fraction of viewport the target should occupy
    globalTrim: 0.6,     // pulled back from computed rect-fill (more = wider shot)
    minLevel: 1.05,
    maxLevel: 1.8,       // hard ceiling — tight zooms feel claustrophobic
  },

  // ── Highlight ring around the active element ──────────────────────────
  // Clean-minimal aesthetic (phase 4): thin hairline ring + subtle outer
  // glow + no flat dim. Feels like a Figma focus ring, not a 2010-era
  // "follow the bouncing ball" overlay.
  highlight: {
    color: '#E27730',
    ringWidth: 1.5,      // px — hairline
    radius: 8,           // px — corner rounding
    padX: 12,            // extra px added to target width
    padY: 6,             // extra px added to target height
    // Soft double glow — tight inner halo that fades to a wide diffuse outer
    // bloom. No 9999px dim ring: that's the old-school look we're retiring.
    glow: '0 0 0 2px rgba(226,119,48,0.08), 0 0 20px 2px rgba(226,119,48,0.22)',
    // Set to null to skip the backdrop dim entirely (clean minimal default).
    // Set to a rgba string to bring back a subtle vignette if a beat needs it.
    backdropDim: null,
    dropVignette: true,  // drop the engine's built-in dark box-shadow vignette
    fadeIn: 220,         // ms — faster, crisper entry
  },

  // ── Click ripple at the cursor tip ────────────────────────────────────
  ripple: {
    borderColor: 'rgba(226,119,48,0.85)',
    fillColor:   'rgba(226,119,48,0.14)',
    size: 32,            // px diameter baseline (animation scales up)
    durationMs: 560,
  },

  // ── Instruction tooltip (arrow + label like "Click Entries") ─────────
  // Glass card: white-92% bg with backdrop blur, dark ink text, orange
  // left accent bar. Arrow stays orange — the single accent color carries
  // the attention, the label reads as information.
  instruction: {
    bg:      'rgba(255,255,255,0.94)',
    fg:      '#1e1410',
    accent:  '#E27730',          // left-border accent + arrow color
    font:    '600 18px/1.25 -apple-system, "Segoe UI", Roboto, sans-serif',
    padY:    11,
    padX:    16,
    radius:  10,
    arrowSize: 28,               // smaller, finer
    gap:     14,
    defaultDirection: 'down',
    dwellMs: 1100,
    // Label write-on animation — letters fade in staggered so the label
    // feels typed rather than popped. See overlays-layer.js.
    writeOnMs:    360,           // total duration (first char → last char)
    writeOnStep:  22,            // ms between adjacent chars
    // Arrow lands first, label writes on after this delay:
    labelDelayMs: 220,
    // After cursor.click() fires, hold the label + ring on-screen this
    // long before fading out. Without this the overlays vanish the moment
    // the click lands — too fast to read.
    postClickHoldMs: 950,
  },

  // ── UI sound design ───────────────────────────────────────────────────
  // Synthesized at runtime (no files). initSfx() must be called from a user
  // gesture (start-gate click) before any play*() fires; before that,
  // play*() silently no-ops so nothing breaks in headless preview.
  sfx: {
    enabled: true,
    masterVolume: 0.9,
    // Per-channel volumes (0..1). Files live in /assets/sfx/.
    click:       { volume: 0.9 },   // main click on every cursor.click
    clickAlt:    { volume: 0.8 },   // bubble-pop — use sparingly via playClickAlt()
    type:        { volume: 0.55 },  // per-keystroke tick
    hover:       { volume: 0.6 },   // magnetic approach tick
    swoosh:      { volume: 0.15 },  // default transition — whisper-quiet under clicks
    swooshEntry: { volume: 0.20 },  // intro→first-chapter only
    swipe:       { volume: 0.7 },   // swap-push slide
    pop:         { volume: 0.9 },   // drop landing (maps to popDrop file)
    popUi:       { volume: 0.7 },   // highlight appear / surface tick
  },
};

// Convenience accessors so call sites can read the current config without
// importing the whole object tree.
export const cfgZoom         = () => OVERLAYS_CONFIG.zoom;
export const cfgHighlight    = () => OVERLAYS_CONFIG.highlight;
export const cfgRipple       = () => OVERLAYS_CONFIG.ripple;
export const cfgInstruction  = () => OVERLAYS_CONFIG.instruction;
