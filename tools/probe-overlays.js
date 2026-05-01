#!/usr/bin/env node
// Stage 5c-2 overlay/effect probe.
//
// Read-only inspector for the player's overlay layer. Sibling of
// `tools/probe-transitions.js` (transitions probe is timing-of-handoffs;
// this probe is structure-of-overlays at any moment). Both share the same
// Playwright + serve.js bootstrap and write to `probe-out/<slug>/<window>/`.
//
// Usage:
//   node tools/probe-overlays.js <slug> [--window <name>] [--from <s>] [--to <s>]
//                                       [--chapter <id[,id...]>]
//                                       [--breakStyle <s>] [--swapStyle <s>]
//                                       [--shot-every <ms>]    # default 200
//                                       [--sample-every <ms>]  # default 100
//                                       [--escape-allow <csv>] # default popOut,tiltFocus,cover,sectionTitle
//                                       [--assert-glass]       # strict: #overlays-layer-css must exist whenever .hl visible
//                                       [--assert-in-frame]    # any disallowed escape → fail
//                                       [--align-tolerance <px>] # delta budget for highlight-alignment finding (default 4)
//                                       [--expect-target <sel>]  # repeatable; iframe-doc selectors of expected highlight targets
//                                       [--raw-findings]       # emit per-sample raw events instead of per-lifetime
//
// Output:
//   probe-out/<slug>/<window>/timeline.json
//   probe-out/<slug>/<window>/console.log
//   probe-out/<slug>/<window>/findings.json
//   probe-out/<slug>/<window>/shots/<elapsed>ms.png
//   probe-out/<slug>/<window>/summary.txt
//
// Exit codes:
//   0 — probe completed cleanly (and assertions passed if requested)
//   1 — probe failed to boot the page or write artifacts
//   2 — assertion failure (--assert-glass or --assert-in-frame)
//   3 — usage error

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;
const BASE = `http://localhost:${PORT}`;

function usage(msg) {
  process.stderr.write((msg ? msg + '\n' : '') +
    'Usage: node tools/probe-overlays.js <slug> [--window <name>] [--from <s>] [--to <s>]\n' +
    '                                    [--chapter <id[,id...]>] [--breakStyle <s>] [--swapStyle <s>]\n' +
    '                                    [--shot-every <ms>] [--sample-every <ms>]\n' +
    '                                    [--escape-allow <csv>] [--assert-glass] [--assert-in-frame]\n' +
    '                                    [--align-tolerance <px>] [--raw-findings]\n');
  process.exit(3);
}

function parseArgs(argv) {
  const args = {
    slug: null, windowName: 'overlays', from: 0, to: 60,
    chapter: null, breakStyle: null, swapStyle: null,
    shotEvery: 200, sampleEvery: 100,
    escapeAllow: 'popOut,tiltFocus,cover,sectionTitle',
    assertGlass: false, assertInFrame: false,
    alignTolerance: 4,
    expectTargets: [],
    expectedPad: 12,
    rawFindings: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if      (a === '--window')           args.windowName = argv[++i];
    else if (a === '--from')             args.from = Number(argv[++i]);
    else if (a === '--to')               args.to = Number(argv[++i]);
    else if (a === '--chapter')          args.chapter = argv[++i];
    else if (a === '--breakStyle')       args.breakStyle = argv[++i];
    else if (a === '--swapStyle')        args.swapStyle = argv[++i];
    else if (a === '--shot-every')       args.shotEvery = Number(argv[++i]);
    else if (a === '--sample-every')     args.sampleEvery = Number(argv[++i]);
    else if (a === '--escape-allow')     args.escapeAllow = argv[++i];
    else if (a === '--assert-glass')     args.assertGlass = true;
    else if (a === '--assert-in-frame')  args.assertInFrame = true;
    else if (a === '--align-tolerance')  args.alignTolerance = Number(argv[++i]);
    else if (a === '--expect-target')    args.expectTargets.push(argv[++i]);
    else if (a === '--expected-pad')     args.expectedPad = Number(argv[++i]);
    else if (a === '--raw-findings')     args.rawFindings = true;
    else if (!args.slug && !a.startsWith('--')) args.slug = a;
    else usage('unknown arg: ' + a);
  }
  if (!args.slug) usage('missing <slug>');
  if (!Number.isFinite(args.from) || !Number.isFinite(args.to) || args.to <= args.from) {
    usage('--from/--to must be numeric and --to > --from');
  }
  return args;
}

function probeServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/scenes/player.html`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(750, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await probeServer()) return null;
  const child = spawn(process.execPath, [path.join(REPO_ROOT, 'serve.js')], {
    cwd: REPO_ROOT, stdio: 'ignore', detached: false,
  });
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (await probeServer()) return child;
  }
  try { child.kill(); } catch (_) {}
  return null;
}

function buildUrl(args) {
  const params = new URLSearchParams();
  params.set('video', args.slug);
  if (args.chapter)    params.set('chapter', args.chapter);
  if (args.breakStyle) params.set('breakStyle', args.breakStyle);
  if (args.swapStyle)  params.set('swapStyle', args.swapStyle);
  return `${BASE}/scenes/player.html?` + params.toString();
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

// ── In-page sampler ──────────────────────────────────────────────────────────
// Returns a structured snapshot of the overlay surface. Capped sizes prevent
// massive arrays from bloating the bridge.
function sampleEval(probeArgs) {
  const expectedSelectors = (probeArgs && probeArgs.expectedSelectors) || [];
  const expectedPad = (probeArgs && Number.isFinite(probeArgs.expectedPad)) ? probeArgs.expectedPad : 0;
  const result = {
    head: {
      overlaysLayerCss: !!document.getElementById('overlays-layer-css'),
      flashbangKiller:  !!document.getElementById('flashbang-killer'),
      popoutFonts:      !!document.head.querySelector('[data-popout-fonts]'),
    },
    body: {
      withStageChrome: document.body.classList.contains('with-stage-chrome'),
      sceneDone: document.body && document.body.dataset && document.body.dataset.sceneDone === 'true',
    },
  };

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }
  function firstClass(el) {
    return (el && el.className && typeof el.className === 'string')
      ? el.className.split(/\s+/)[0] || null
      : null;
  }

  const macFrame  = document.querySelector('.mac-frame');
  const macChrome = document.querySelector('.mac-chrome');
  const stage     = document.querySelector('.stage');
  const iframe    = document.querySelector('iframe.ui');

  const macFrameR  = rect(macFrame);
  const macChromeR = rect(macChrome);

  // Frame interior: from .mac-frame outer rect minus the chrome bar.
  // Falls back gracefully if either is missing or chrome class is off.
  let interior = null;
  if (macFrameR && result.body.withStageChrome) {
    const top = macChromeR
      ? macChromeR.y + macChromeR.h
      : macFrameR.y;
    interior = {
      top,
      left:   macFrameR.x,
      right:  macFrameR.x + macFrameR.w,
      bottom: macFrameR.y + macFrameR.h,
    };
  }

  result.frame = {
    macFrame: macFrameR,
    macChrome: macChromeR,
    stage: stage ? Object.assign(rect(stage), { clipPath: getComputedStyle(stage).clipPath }) : null,
    interior,
    viewport: { w: window.innerWidth, h: window.innerHeight },
  };

  if (iframe) {
    const cs = getComputedStyle(iframe);
    const tf = iframe.style.transform || '';
    const sM = /scale\(([-\d.]+)\)/.exec(tf);
    const tM = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(tf);
    result.iframe = {
      rect: rect(iframe),
      opacity: parseFloat(cs.opacity || '1'),
      transform: tf || null,
      filter: iframe.style.filter || cs.filter || null,
      parsedZoom: sM ? parseFloat(sM[1]) : null,
      parsedTx:   tM ? parseFloat(tM[1]) : null,
      parsedTy:   tM ? parseFloat(tM[2]) : null,
    };
  } else {
    result.iframe = null;
  }

  // ── Overlay elements (engine + overlays-layer outputs) ───────────────────
  const overlayKinds = [
    ['.hl',             'hl'],
    ['.label',          'label'],
    ['.pointer',        'pointer'],
    ['.pointer-label',  'pointer-label'],
    ['.cursor-ripple',  'cursor-ripple'],
  ];
  result.overlays = [];
  for (const [sel, kind] of overlayKinds) {
    const nodes = document.querySelectorAll(sel);
    nodes.forEach((el) => {
      if (result.overlays.length >= 50) return;
      const cs = getComputedStyle(el);
      const r  = rect(el);
      let pseudoBefore = null;
      if (kind === 'label' || kind === 'pointer-label') {
        try { pseudoBefore = getComputedStyle(el, '::before').display; } catch (_) {}
      }
      result.overlays.push({
        kind,
        rect: r,
        opacity: parseFloat(cs.opacity || '1'),
        zIndex:  cs.zIndex,
        parentTag:   el.parentElement ? el.parentElement.tagName.toLowerCase() : null,
        parentClass: el.parentElement ? firstClass(el.parentElement) : null,
        text: (el.textContent || '').slice(0, 60),
        computed: {
          borderWidth:     cs.borderWidth,
          borderColor:     cs.borderColor,
          boxShadow:       (cs.boxShadow || '').slice(0, 240),
          backgroundColor: cs.backgroundColor,
          backdropFilter:  cs.backdropFilter || cs.webkitBackdropFilter || '',
        },
        pseudoBeforeDisplay: pseudoBefore,
      });
    });
  }

  // ── Effect clones (focusPull / popOut / tiltFocus / covers) ──────────────
  // Detect by multiple signals; require a position:fixed root with z-index in
  // the helper range. Skip core overlays/cursors/chrome/cover-by-id.
  result.clones = [];
  const SKIP_CLASSES = new Set([
    'hl','label','pointer','pointer-label','cursor','cursor-ripple',
    'mac-frame','mac-chrome','overlay','stage','start-gate','start-btn',
    'fade-cover','swap-cover',
  ]);
  const SKIP_IDS = new Set([
    'flashbang-killer','overlays-layer-css','wpf-watermark','start','go','boot-error',
  ]);
  const all = document.querySelectorAll('div, section, article, span');
  const seen = new Set();
  all.forEach((el) => {
    if (result.clones.length >= 20) return;
    if (seen.has(el)) return;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return;
    const z = parseInt(cs.zIndex, 10);
    if (!Number.isFinite(z) || z < 789 || z > 2147483647) return;
    if (SKIP_IDS.has(el.id)) return;
    let skip = false;
    el.classList.forEach((c) => { if (SKIP_CLASSES.has(c)) skip = true; });
    if (skip) return;
    seen.add(el);
    const r = rect(el);
    if (!r || (r.w === 0 && r.h === 0)) return;

    const tf = el.style.transform || cs.transform || '';
    const hasScale   = /scale\(/.test(tf) || /matrix\(/.test(tf);
    const hasPersp   = /perspective\(/.test(tf);
    const hasRotate  = /rotate[XY]?\(/.test(tf);
    const hasShadow  = cs.boxShadow && cs.boxShadow !== 'none';
    const isFullInset = (
      r.x <= 1 && r.y <= 1 &&
      Math.abs(r.w - window.innerWidth)  <= 2 &&
      Math.abs(r.h - window.innerHeight) <= 2
    );

    let kind = 'unknown-fixed';
    if (z >= 990) {
      kind = 'cover';
    } else if (z === 789 && isFullInset) {
      // focusPull dimmer
      kind = 'focusPull-dimmer';
    } else if (z === 790) {
      // focusPull clone — fixed, scaled, hosted in .stage by default
      kind = 'focusPull-clone';
    } else if (z === 800) {
      // popOut/tiltFocus clone. tiltFocus passes shadow:false + perspective
      // still present (popOut.tiltFocus wraps popOut). Distinguish by shadow.
      if (hasPersp || hasRotate || hasScale) {
        kind = hasShadow ? 'popOut-clone' : 'tiltFocus-clone';
      }
    }

    result.clones.push({
      kind,
      rect: r,
      opacity: parseFloat(cs.opacity || '1'),
      zIndex: cs.zIndex,
      parentTag:   el.parentElement ? el.parentElement.tagName.toLowerCase() : null,
      parentClass: el.parentElement ? firstClass(el.parentElement) : null,
      transform:   tf ? tf.slice(0, 200) : null,
      boxShadow:   (cs.boxShadow || '').slice(0, 200) || null,
      signals: { hasScale, hasPersp, hasRotate, hasShadow, isFullInset },
    });
  });

  // ── Iframe-internal manual outlines (chapter-authored workarounds) ───────
  result.iframeOutlines = [];
  if (iframe && iframe.contentDocument) {
    try {
      const idoc = iframe.contentDocument;
      const nodes = idoc.querySelectorAll('[style*="outline"]');
      nodes.forEach((el) => {
        if (result.iframeOutlines.length >= 30) return;
        const ol = el.style.outline || '';
        if (!ol || ol === 'none' || ol === '0' || ol.startsWith('0px')) return;
        const r = el.getBoundingClientRect();
        result.iframeOutlines.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          classFirst: (el.className && typeof el.className === 'string')
            ? el.className.split(/\s+/)[0] : null,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          outline: ol.slice(0, 100),
        });
      });
    } catch (_) { /* cross-doc / not loaded */ }
  }

  // ── Expected highlight targets — iframe-doc rect + stage projection ──────
  // For each --expect-target selector, query inside the iframe contentDocument,
  // measure its rect (in iframe-viewport coords), and project to stage coords
  // mirroring the engine's `toStage()` math used by `engine.highlight()`.
  //
  // Critical: the engine writes
  //   iframe.style.transform = `scale(${z}) translate(${tx/z}px, ${ty/z}px)`
  // so the parsed `translate` value is tx/z, NOT tx. Recover stage tx/ty by
  // multiplying the parsed value back by z. Without this multiplication the
  // projected stage rect ignores the pan component entirely and matches the
  // wrong target on every camera with non-zero translate.
  //
  // Pad: when caller supplies --expected-pad, inflate the iframe rect by `pad`
  // BEFORE projecting. The engine's highlight() does the same (`pad` is in
  // iframe-pixels), so the inflated→projected stage rect is what the .hl
  // should actually paint as.
  result.expectedTargets = [];
  if (expectedSelectors.length && iframe && iframe.contentDocument) {
    const z  = result.iframe.parsedZoom ?? 1;
    // parsed translate is in iframe-pixels (because the engine writes tx/z);
    // convert to stage-pixels by multiplying by z.
    const tx = (result.iframe.parsedTx ?? 0) * z;
    const ty = (result.iframe.parsedTy ?? 0) * z;
    const iframeW = 1440, iframeH = 900;
    const iframeOriginX = (window.innerWidth  - iframeW) / 2;
    const iframeOriginY = (window.innerHeight - iframeH) / 2;
    const pad = expectedPad;
    try {
      const idoc = iframe.contentDocument;
      for (const sel of expectedSelectors) {
        let el = null;
        try { el = idoc.querySelector(sel); } catch (_) { /* invalid sel */ }
        if (!el) {
          result.expectedTargets.push({ selector: sel, found: false });
          continue;
        }
        const r = el.getBoundingClientRect();
        const iframeRect = { x: r.x, y: r.y, w: r.width, h: r.height };
        // Inflated rect = what the engine actually highlights at pad>0.
        const inflatedIframe = {
          x: r.x - pad,
          y: r.y - pad,
          w: r.width  + pad * 2,
          h: r.height + pad * 2,
        };
        const projectStage = (ir) => ({
          x: iframeOriginX + ir.x * z + tx,
          y: iframeOriginY + ir.y * z + ty,
          w: ir.w * z,
          h: ir.h * z,
        });
        result.expectedTargets.push({
          selector: sel,
          found: true,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          pad,
          iframeRect,
          stageRect:         projectStage(iframeRect),
          inflatedIframeRect: inflatedIframe,
          inflatedStageRect:  projectStage(inflatedIframe),
        });
      }
    } catch (_) { /* cross-doc */ }
  }

  return result;
}

// ── Findings aggregation ─────────────────────────────────────────────────────
// Per-issue-lifetime: keyed by (category, signature). New samples extend
// lastTms; duplicate categories on the same target collapse into one finding.
function processFindings(snap, args, agg) {
  const allowKinds = new Set(args.escapeAllow.split(',').map(s => s.trim()).filter(Boolean));
  const interior = snap.frame && snap.frame.interior;

  function escapesInterior(rect) {
    if (!interior || !rect) return false;
    if (rect.w === 0 || rect.h === 0) return false;
    return (
      rect.x < interior.left  - 1 ||
      rect.y < interior.top   - 1 ||
      rect.x + rect.w > interior.right  + 1 ||
      rect.y + rect.h > interior.bottom + 1
    );
  }
  function record(category, severity, sigKey, message, evidence) {
    const key = `${category}|${sigKey}`;
    const e = agg.get(key);
    if (!e) {
      agg.set(key, {
        category, severity, sigKey, message,
        firstTms: snap.tMs, lastTms: snap.tMs,
        samples: 1, lastEvidence: evidence,
      });
    } else {
      e.lastTms = snap.tMs;
      e.samples += 1;
      e.lastEvidence = evidence;
    }
  }

  // 1. Glass CSS missing while .hl is visible (regression net for 5c-1)
  const visibleHl = snap.overlays.find(o =>
    o.kind === 'hl' && o.opacity >= 0.05 && o.rect && o.rect.w * o.rect.h > 0
  );
  if (visibleHl && !snap.head.overlaysLayerCss) {
    record('glass-css-missing', 'error', 'global',
      '#overlays-layer-css is missing while .hl is on screen',
      { hlRect: visibleHl.rect, boxShadow: visibleHl.computed.boxShadow });
  }

  // 2. Engine-default highlight signature (3px ring + 9999px vignette)
  for (const o of snap.overlays) {
    if (o.kind !== 'hl' || o.opacity < 0.05) continue;
    const bs = o.computed.boxShadow || '';
    const bw = parseFloat(o.computed.borderWidth || '0');
    const looksDefault = /9999px/.test(bs) || bw >= 2.5;
    if (looksDefault) {
      record('engine-default-hl', 'warning', `${o.kind}-engine-default`,
        '.hl appears to use engine default styling (no glass override)',
        { borderWidth: o.computed.borderWidth, boxShadow: bs.slice(0, 160) });
    }
  }

  // 3. Frame escape — non-clone overlays
  for (const o of snap.overlays) {
    if (!o.rect || o.opacity < 0.05) continue;
    if (o.rect.w === 0 || o.rect.h === 0) continue;
    if (!escapesInterior(o.rect)) continue;
    const sig = `${o.kind}|${Math.round(o.rect.w)}x${Math.round(o.rect.h)}@${Math.round(o.rect.x)},${Math.round(o.rect.y)}`;
    record('frame-escape-overlay', 'warning', sig,
      `${o.kind} extends outside Mac frame interior`,
      { rect: o.rect, parent: `${o.parentTag}.${o.parentClass}`, text: o.text });
  }

  // 4. Frame escape — clones, with allow-list + dimmer carve-out
  for (const c of snap.clones) {
    if (!c.rect || c.opacity < 0.05) continue;
    if (c.rect.w === 0 || c.rect.h === 0) continue;
    // focusPull dimmer: clipped by .stage if hosted there → not an escape
    if (c.kind === 'focusPull-dimmer' && c.parentClass === 'stage') continue;
    // Allow-listed escape kinds: popOut, tiltFocus, cover, sectionTitle
    const baseKind = c.kind.replace(/-clone$/, '').replace(/-dimmer$/, '');
    if (allowKinds.has(baseKind)) continue;
    if (!escapesInterior(c.rect)) continue;
    const sig = `${c.kind}|${c.parentTag}|${Math.round(c.rect.w)}x${Math.round(c.rect.h)}@${Math.round(c.rect.x)},${Math.round(c.rect.y)}`;
    record('frame-escape-clone', 'warning', sig,
      `${c.kind} extends outside Mac frame interior`,
      { rect: c.rect, parent: `${c.parentTag}.${c.parentClass}`, transform: c.transform, zIndex: c.zIndex });
  }

  // 5. Multi-hl simultaneous (informational)
  const visibleHls = snap.overlays.filter(o => o.kind === 'hl' && o.opacity >= 0.05 && o.rect && o.rect.w * o.rect.h > 0);
  if (visibleHls.length > 1) {
    record('multi-hl', 'info', `count-${visibleHls.length}`,
      `${visibleHls.length} .hl elements visible simultaneously`,
      { count: visibleHls.length });
  }

  // 6. Zero-rect visible overlay
  for (const o of snap.overlays) {
    if (o.opacity < 0.05) continue;
    if (!o.rect || (o.rect.w !== 0 && o.rect.h !== 0)) continue;
    record('zero-rect-overlay', 'info', `${o.kind}|zero`,
      `${o.kind} mounted with zero size`, { rect: o.rect, parent: `${o.parentTag}.${o.parentClass}` });
  }

  // 7. Highlight alignment vs expected target (only fires when caller passes
  // --expect-target). Match prefers "inflated stage rect (target+pad) contains
  // hl-centroid" over raw centroid distance — disambiguates targets that
  // overlap in centroid space. Delta is computed vs the INFLATED stage rect,
  // i.e. what the engine actually paints; near-zero delta means perfect
  // alignment within the configured pad. Pairs the nearest visible .label.
  const expected = (snap.expectedTargets || []).filter(e => e.found);
  if (expected.length) {
    const visibleHls = snap.overlays.filter(o =>
      o.kind === 'hl' && o.opacity >= 0.05 && o.rect && o.rect.w * o.rect.h > 0);
    const visibleLabels = snap.overlays.filter(o =>
      o.kind === 'label' && o.opacity >= 0.05 && o.rect && o.rect.w * o.rect.h > 0);
    function centroid(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function rectContainsPoint(r, p) {
      return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }
    for (const hl of visibleHls) {
      const hc = centroid(hl.rect);
      // Phase 1: prefer expected whose inflated stage rect contains the hl
      // centroid. Phase 2: tiebreak by centroid distance to inflated rect.
      const containing = expected.filter(e => rectContainsPoint(e.inflatedStageRect, hc));
      let best = null, bestD = Infinity;
      const pool = containing.length ? containing : expected;
      for (const e of pool) {
        const d = dist(hc, centroid(e.inflatedStageRect));
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) continue;
      let nearestLabel = null, nearestLabelD = Infinity;
      for (const lab of visibleLabels) {
        const d = dist(hc, centroid(lab.rect));
        if (d < nearestLabelD) { nearestLabelD = d; nearestLabel = lab; }
      }
      const inflated = best.inflatedStageRect;
      const delta = {
        dx: hl.rect.x - inflated.x,
        dy: hl.rect.y - inflated.y,
        dw: hl.rect.w - inflated.w,
        dh: hl.rect.h - inflated.h,
        centroidDistance: Math.round(bestD * 10) / 10,
      };
      const tol = args.alignTolerance;
      const withinTol =
        Math.abs(delta.dx) <= tol &&
        Math.abs(delta.dy) <= tol &&
        Math.abs(delta.dw) <= tol * 2 &&
        Math.abs(delta.dh) <= tol * 2;
      const sig = `${best.selector}|${Math.round(hl.rect.w)}x${Math.round(hl.rect.h)}@${Math.round(hl.rect.x)},${Math.round(hl.rect.y)}`;
      record('highlight-alignment', withinTol ? 'info' : 'warning', sig,
        withinTol
          ? `.hl aligned to ${best.selector} within ±${tol}px (pad=${best.pad})`
          : `.hl misaligned vs ${best.selector} pad=${best.pad} (Δx=${delta.dx.toFixed(1)} Δy=${delta.dy.toFixed(1)} Δw=${delta.dw.toFixed(1)} Δh=${delta.dh.toFixed(1)})`,
        {
          selector: best.selector,
          pad: best.pad,
          targetIframeRect: best.iframeRect,
          targetStageRect: best.stageRect,
          inflatedIframeRect: best.inflatedIframeRect,
          inflatedStageRect: best.inflatedStageRect,
          hlRect: hl.rect,
          labelRect: nearestLabel ? nearestLabel.rect : null,
          labelText: nearestLabel ? nearestLabel.text : null,
          iframeTransform: snap.iframe ? snap.iframe.transform : null,
          iframeZoom: snap.iframe ? snap.iframe.parsedZoom : null,
          delta,
        });
    }
  }
}

// ── Strict glass assertion over the timeline ─────────────────────────────────
function checkGlassStrict(timeline) {
  const failures = [];
  for (const s of timeline) {
    const visibleHl = (s.overlays || []).some(o =>
      o.kind === 'hl' && o.opacity >= 0.05 && o.rect && o.rect.w * o.rect.h > 0
    );
    if (visibleHl && !s.head.overlaysLayerCss) {
      failures.push(s.tMs);
      if (failures.length >= 5) break;
    }
  }
  return failures.length ? failures : null;
}

async function main() {
  const args = parseArgs(process.argv);
  const outDir   = path.join(REPO_ROOT, 'probe-out', args.slug, args.windowName);
  const shotsDir = path.join(outDir, 'shots');
  ensureDir(shotsDir);

  const server = await ensureServer();
  const url = buildUrl(args);
  const consoleLog = [];
  const timeline = [];
  const findingsAgg = new Map();
  const summary = [];
  let exitCode = 0;

  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    page.on('console', (msg) => {
      consoleLog.push({ t: Date.now(), type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      consoleLog.push({ t: Date.now(), type: 'pageerror', text: String(err && err.message || err) });
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.max(30000, args.to * 1000) });

    try {
      const btn = await page.waitForSelector(
        '#start #go, .start-gate .start-btn, #start, .start-gate',
        { timeout: 8000 }
      );
      if (btn) await btn.click().catch(() => {});
    } catch (_) {}

    const t0 = Date.now();
    const fromMs = args.from * 1000;
    const toMs   = args.to   * 1000;
    let nextShotAt = fromMs;

    while (true) {
      const elapsed = Date.now() - t0;
      if (elapsed > toMs) break;

      if (elapsed >= fromMs) {
        const snap = await page.evaluate(sampleEval, {
          expectedSelectors: args.expectTargets,
          expectedPad: args.expectedPad,
        }).catch(() => null);
        if (snap) {
          snap.tMs = elapsed;
          timeline.push(snap);
          processFindings(snap, args, findingsAgg);
        }
        if (elapsed >= nextShotAt) {
          const fname = String(elapsed).padStart(6, '0') + 'ms.png';
          await page.screenshot({ path: path.join(shotsDir, fname), fullPage: false }).catch(() => {});
          nextShotAt += args.shotEvery;
        }
      }

      await new Promise(r => setTimeout(r, args.sampleEvery));
    }

    await ctx.close();
  } catch (err) {
    summary.push('probe failed: ' + (err && err.message || err));
    exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }

  // Persist artifacts
  fs.writeFileSync(path.join(outDir, 'timeline.json'),
    JSON.stringify({ slug: args.slug, window: args.windowName, url,
                     from: args.from, to: args.to, samples: timeline }, null, 2));
  fs.writeFileSync(path.join(outDir, 'console.log'),
    consoleLog.map(e => `${e.t}\t${e.type}\t${e.text}`).join('\n'));

  const findings = [...findingsAgg.values()].sort((a, b) =>
    a.firstTms - b.firstTms || a.category.localeCompare(b.category));
  fs.writeFileSync(path.join(outDir, 'findings.json'),
    JSON.stringify({ slug: args.slug, window: args.windowName,
                     mode: args.rawFindings ? 'raw' : 'per-issue-lifetime',
                     escapeAllow: args.escapeAllow.split(',').map(s => s.trim()).filter(Boolean),
                     findings }, null, 2));

  // Summary
  summary.push('slug:           ' + args.slug);
  summary.push('window:         ' + args.windowName);
  summary.push('range:          ' + args.from + 's → ' + args.to + 's');
  summary.push('samples:        ' + timeline.length);
  summary.push('findings:       ' + findings.length);
  if (findings.length) {
    const byCat = findings.reduce((m, f) => (m[f.category] = (m[f.category] || 0) + 1, m), {});
    for (const [cat, n] of Object.entries(byCat).sort()) {
      summary.push('  ' + cat + ': ' + n);
    }
    const top = findings.slice(0, 5);
    summary.push('  first 5:');
    for (const f of top) {
      summary.push(`    [${f.severity}] ${f.category} t=${f.firstTms}–${f.lastTms}ms × ${f.samples} — ${f.message}`);
    }
  }
  const lastSceneDone = [...timeline].reverse().find(s => s.body && s.body.sceneDone);
  summary.push('sceneDone:      ' + (lastSceneDone ? 'true at t=' + lastSceneDone.tMs + 'ms' : 'never within window'));

  // Assertions
  if (args.assertGlass) {
    const failed = checkGlassStrict(timeline);
    if (failed) {
      summary.push(`FAIL --assert-glass: #overlays-layer-css missing during .hl visibility (sample tMs: ${failed.join(', ')}${failed.length === 5 ? ', …' : ''})`);
      exitCode = exitCode || 2;
    } else {
      summary.push('--assert-glass: pass');
    }
  }
  if (args.assertInFrame) {
    const escapes = findings.filter(f => f.category === 'frame-escape-overlay' || f.category === 'frame-escape-clone');
    if (escapes.length) {
      summary.push(`FAIL --assert-in-frame: ${escapes.length} disallowed escape(s) detected`);
      for (const f of escapes.slice(0, 5)) {
        summary.push('   - ' + f.category + ' ' + f.message + ' [' + f.sigKey + ']');
      }
      exitCode = exitCode || 2;
    } else {
      summary.push('--assert-in-frame: pass');
    }
  }

  fs.writeFileSync(path.join(outDir, 'summary.txt'), summary.join('\n') + '\n');
  process.stdout.write(summary.join('\n') + '\n');
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write('probe error: ' + (err && err.message || err) + '\n');
  process.exit(1);
});
