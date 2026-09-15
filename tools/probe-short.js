#!/usr/bin/env node
// tools/probe-short.js — framing + beat-target probe for 9:16 shorts
// (A7 + A11, shorts fix round 2026-08-13).
//
// Long-form films have probe-singlehtml.js, which SEEKS window.__tl. Shorts
// are await-driven — there is no master timeline to seek — so this probe runs
// the film LIVE (headless, autoplay) and measures each beat as it lands,
// reading the beat contract the film itself declares:
//
//   window.__beats.push({
//     key,            // beat id ('open' = the first-frame framing record)
//     t,              // seconds since __T0 at beat start
//     durS,           // the beat's DUR entry
//     target,         // iframe-doc selector for the taught element (A11:
//                     //   every narration claim names its surface)
//     fill,           // fly fill used (for the natural-zoom warning)
//     centerTol,      // optional per-beat center tolerance px (default 80)
//     probeAt,        // optional seconds-into-beat to measure (default 1.4,
//                     //   after the opening motion has landed)
//   })
//
// Per record with a target, measured at t+probeAt (and again at 60% of the
// beat when the first sample fails — targets that enter frame mid-beat):
//
//   FAIL  target missing from the iframe doc            (A11 — narrated,
//         target has no layout (hidden / collapsed)       never shown)
//         target not fully inside the device band
//         target center off frame center by > centerTol (field-center ±80px)
//         camera zoom below the 1.78 portrait floor     (bars on screen)
//         target region PAINTS FLAT — pixel-level check (luma range below
//         --luma-range over the region's screenshot). DOM lies about paint:
//         one tutorial (ISSUES #4) shipped blank cards past a DOM-only
//         probe. Geometry alone never certifies a beat here.
//   WARN  natural (unclamped) zoom below the floor — the camera clamped, so
//         the slice may crop the taught region; frame a tighter subgroup
//
// A film with no __beats contract exits 0 with a note (old shorts predate it).
//
// Usage:
//   node tools/probe-short.js <slug> [--seconds 120] [--port 4321]
//        [--center-tol 80] [--floor 1.78] [--luma-range 10]
//
// Exit: 0 pass · 1 failures · 2 usage/not-instrumented.

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const { ensureServer } = require('./generate-snapshot-outline.js');
const { resolveResolution } = require('./stage-size');
const { collectTextBoxesSource, judgeText } = require('./lib/text-overlap.js');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { slug: null, seconds: 120, port: Number(process.env.PORT) || 4321, centerTol: 80, floor: 1.78, lumaRange: 10 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--seconds') out.seconds = Number(a[++i]);
    else if (a[i] === '--port') out.port = Number(a[++i]);
    else if (a[i] === '--center-tol') out.centerTol = Number(a[++i]);
    else if (a[i] === '--floor') out.floor = Number(a[++i]);
    else if (a[i] === '--luma-range') out.lumaRange = Number(a[++i]);
    else if (!a[i].startsWith('--') && !out.slug) out.slug = a[i];
  }
  return out;
}

// Pixel-level paint evidence (the brief's hard-won rule: DOM lies about
// paint). Screenshot the target's on-band region and measure its luma
// spread with ffmpeg signalstats. A real UI region (text, toggles, borders)
// spans a wide luma range; a blank/flat region spans almost none.
// Returns { avg, range } or null when the region is unmeasurable.
async function pixelStats(page, bandBox, rect, viewport) {
  if (!bandBox) return null;
  // Clamp the stage-local rect to the visible band, then map to page coords.
  const x0 = Math.max(0, rect.x), y0 = Math.max(0, rect.y);
  const x1 = Math.min(viewport.w, rect.x + rect.w), y1 = Math.min(viewport.h, rect.y + rect.h);
  const w = Math.floor(x1 - x0), h = Math.floor(y1 - y0);
  if (w < 8 || h < 8) return null;
  let buf;
  try {
    buf = await page.screenshot({ clip: { x: bandBox.x + x0, y: bandBox.y + y0, width: w, height: h } });
  } catch (e) { return null; }
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-f', 'image2pipe', '-i', 'pipe:0',
    '-vf', 'format=gray,signalstats,metadata=print:file=-',
    '-f', 'null', '-',
  ], { input: buf, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return null;
  const grab = (key) => {
    const m = r.stdout.match(new RegExp(`lavfi\\.signalstats\\.${key}=([\\d.eE+-]+)`));
    return m ? Number(m[1]) : null;
  };
  const min = grab('YMIN'), max = grab('YMAX'), avg = grab('YAVG');
  if (min == null || max == null) return null;
  return { avg, range: max - min };
}

// Runs inside the page: resolve the target through the film's own
// IframeManager (window._ifm — the skeleton exposes it) and return raw
// geometry. All assertions happen Node-side.
//
// Targets prefixed "stage:" are PARENT-document editorial surfaces (payoff
// composites, editorial cards): measured against the device band's own box
// instead of the camera; zoom checks don't apply, the in-frame / centered /
// paint checks all still do (a blank composite is exactly the DOM-lies-
// about-paint class this probe exists for).
function measureInPage({ sel, fill }) {
  if (typeof sel === 'string' && sel.startsWith('stage:')) {
    const el = document.querySelector(sel.slice(6));
    if (!el) return { err: 'MISSING — stage selector not found in parent doc' };
    const band = document.querySelector('#deviceBand');
    if (!band) return { err: 'no #deviceBand to measure the stage target against' };
    const r = el.getBoundingClientRect();
    const b = band.getBoundingClientRect();
    if (!r.width && !r.height) return { err: 'NO LAYOUT — stage target has empty rect' };
    // Composite control-overlap check (QC2 2026-08-13: a lifted form shipped
    // with the Submit button colliding with the Phone field and no
    // instrument saw it — Umair's eye did). Any two visible form controls
    // inside a stage composite overlapping >25% of the smaller one is a
    // layout collision, not design.
    let overlap = null;
    const ctrls = [...el.querySelectorAll('input, textarea, select, button')]
      .filter(c => c.offsetWidth > 0 && c.offsetHeight > 0);
    outer:
    for (let i = 0; i < ctrls.length; i++) {
      for (let j = i + 1; j < ctrls.length; j++) {
        if (ctrls[i].contains(ctrls[j]) || ctrls[j].contains(ctrls[i])) continue;
        const a = ctrls[i].getBoundingClientRect(), c = ctrls[j].getBoundingClientRect();
        const ix = Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left));
        const iy = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
        const aA = a.width * a.height, aC = c.width * c.height;
        const smaller = Math.min(aA, aC), larger = Math.max(aA, aC);
        const inter = ix * iy;
        if (smaller > 0 && inter / smaller > 0.25) {
          // Embedded widgets are designed overlays, not collisions: a small
          // control fully inside a much larger host (intl-tel's flag button
          // in the tel input, a reveal button in a password field).
          const embedded = inter / smaller > 0.9 && smaller / larger < 0.4;
          if (!embedded) {
            overlap = `${ctrls[i].tagName.toLowerCase()} × ${ctrls[j].tagName.toLowerCase()} (${Math.round(100 * inter / smaller)}% of smaller)`;
            break outer;
          }
        }
      }
    }
    const k = b.width / 1080; // page px → band-local px (headless: 1)
    return {
      rect: { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k },
      v: { w: 1080, h: b.height / k },
      zoom: null,
      natural: null,
      overlap,
    };
  }
  const ifm = window._ifm;
  if (!ifm) return { err: 'window._ifm not exposed' };
  let el = null;
  try { el = ifm.query(sel); } catch (e) { /* fall through */ }
  if (!el) return { err: 'MISSING — selector not found in iframe doc' };
  let rect;
  try { rect = ifm.elementToStageRect(el); }
  catch (e) { return { err: 'NO LAYOUT — ' + String(e.message).slice(0, 80) }; }
  const v = ifm.viewport();
  const cam = ifm.cameraState();
  let natural = null;
  try { natural = ifm.cameraToElement(el, { fill: fill || 0.62, pad: 24, minZoom: 0.01, maxZoom: 99 }).zoom; }
  catch (e) { /* warning-only path */ }
  // Was centering this target even POSSIBLE at the current zoom? The crop
  // model means the camera cannot leave the raster, so an element near a
  // raster edge can never reach frame centre — vertically that window is
  // only ~46px tall at the 1.78 floor. Compare the clamped pose against the
  // unclamped one at the SAME zoom: a difference means the clamp moved it,
  // i.e. geometry forbade centring rather than the author framing badly.
  let clamped = { x: false, y: false };
  try {
    const opt = { fill: fill || 0.62, pad: 24, minZoom: cam.zoom, maxZoom: cam.zoom };
    const free = ifm.cameraToElement(el, { ...opt, clamp: false });
    const held = ifm.cameraToElement(el, { ...opt, clamp: true });
    clamped = { x: Math.abs(free.tx - held.tx) > 1, y: Math.abs(free.ty - held.ty) > 1 };
  } catch (e) { /* leave both false — treated as "centring was possible" */ }
  return {
    rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
    v: { w: v.w, h: v.h },
    zoom: cam.zoom,
    natural,
    clamped,
  };
}

function judge(m, { centerTol, floor, lumaRange }) {
  if (m.err) return { pass: false, fails: [m.err], warns: [] };
  const fails = [];
  const warns = [];
  if (m.overlap) {
    fails.push(`CONTROLS OVERLAP — ${m.overlap}: composite layout collision (QC2: Submit-over-Phone shipped unseen)`);
  }
  if (m.pixel && m.pixel.range != null && m.pixel.range < lumaRange) {
    fails.push(`PAINTS FLAT (luma range ${m.pixel.range.toFixed(1)}, avg ${m.pixel.avg != null ? m.pixel.avg.toFixed(0) : '?'}) — region is blank on screen; DOM lies about paint (tutorial ISSUES #4)`);
  } else if (!m.pixel) {
    warns.push('no pixel evidence for this sample (screenshot/ffmpeg unavailable) — geometry-only verdict');
  }
  const M = 4; // px slack on the band edge
  const { rect, v, zoom, natural } = m;
  if (rect.x < -M || rect.y < -M || rect.x + rect.w > v.w + M || rect.y + rect.h > v.h + M) {
    const over = [];
    if (rect.x < -M) over.push(`left ${(-rect.x).toFixed(0)}px out`);
    if (rect.y < -M) over.push(`top ${(-rect.y).toFixed(0)}px out`);
    if (rect.x + rect.w > v.w + M) over.push(`right ${(rect.x + rect.w - v.w).toFixed(0)}px out`);
    if (rect.y + rect.h > v.h + M) over.push(`bottom ${(rect.y + rect.h - v.h).toFixed(0)}px out`);
    fails.push(`NOT FULLY IN-FRAME (${over.join(', ')})${natural != null && natural < floor ? ' — target too wide/tall for the floor zoom; frame a tighter subgroup' : ''}`);
  }
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const dx = cx - v.w / 2, dy = cy - v.h / 2;
  const offX = Math.abs(dx) > centerTol, offY = Math.abs(dy) > centerTol;
  if (offX || offY) {
    const cl = m.clamped || { x: false, y: false };
    const inFrame = !fails.some((f) => f.startsWith('NOT FULLY IN-FRAME'));
    // Off-centre on an axis the clamp pinned is a GEOMETRY limit, not an
    // authoring miss — and only forgivable while the target is fully
    // visible. Portrait's vertical centring window is ~46px tall at the
    // floor, so chrome near a raster edge can never satisfy ±80px.
    const unavoidable = inFrame && (!offX || cl.x) && (!offY || cl.y);
    const msg = `OFF-CENTER (Δx ${dx.toFixed(0)}px, Δy ${dy.toFixed(0)}px > ±${centerTol}px field-center rule)`;
    if (unavoidable) {
      warns.push(`${msg} — camera clamped at the raster edge${cl.x && cl.y ? ' on both axes' : cl.x ? ' horizontally' : ' vertically'}; centring is geometrically impossible here, target is fully in frame`);
    } else {
      fails.push(msg);
    }
  }
  if (zoom != null && zoom < floor - 0.02) {
    fails.push(`ZOOM ${zoom.toFixed(2)} BELOW THE ${floor} PORTRAIT FLOOR — bars on screen`);
  }
  // The clamp warning only matters when clamping actually cost pixels — a
  // deliberately wide group that still FITS at the floor zoom is fine.
  if (natural != null && natural < floor && fails.length) {
    warns.push(`natural zoom ${natural.toFixed(2)} < floor ${floor} — the camera clamped and the clamp cropped/off-centered the target (the stop-fast-bots opening bug mechanism)`);
  }
  return { pass: fails.length === 0, fails, warns };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    console.error('usage: node tools/probe-short.js <slug> [--seconds 120] [--port 4321] [--center-tol 80] [--floor 1.78]');
    process.exit(2);
  }
  const htmlPath = path.join(ROOT, 'videos', args.slug, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(`✗ videos/${args.slug}/index.html not found`);
    process.exit(2);
  }
  const RES = resolveResolution({ resolutionArg: null, htmlPath });
  const url = `http://localhost:${args.port}/videos/${args.slug}/index.html`;

  const server = await ensureServer(args.port);
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: RES.width, height: RES.height } });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e).split('\n')[0]));

    console.log(`probe-short ${args.slug} (${RES.width}×${RES.height}, center ±${args.centerTol}px, floor ${args.floor})`);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });

    try { await page.waitForFunction(() => window.__T0 != null, null, { timeout: 20000, polling: 100 }); }
    catch (_) {
      console.log('  ✗ window.__T0 never set — not instrumented');
      process.exitCode = 2;
      return;
    }

    // Device-band page box — anchors the pixel-evidence screenshots.
    let bandBox = null;
    try { bandBox = await page.locator('#deviceBand').first().boundingBox(); } catch (e) { /* warn below */ }
    if (!bandBox) console.log('  ⚠ #deviceBand not found — pixel-level paint checks skipped (geometry only)');

    // Live loop: poll for new beat records + schedule measurements at
    // t+probeAt in PAGE time (never wall-clock guesses).
    const results = [];   // { key, samples: [judged...], warns, pass }
    const pending = [];   // { rec, dueAt, secondDue, sampled1 }
    let seen = 0;
    let contractless = false;
    const deadline = Date.now() + args.seconds * 1000 * 1.2;

    // Films swap snapshots mid-run; an evaluate landing inside a swap can
    // hit "Execution context was destroyed". That is a sampling collision,
    // not a film defect — retry rather than aborting the probe.
    const evalSafe = async (fn, arg, fallback = null) => {
      for (let tries = 0; tries < 3; tries++) {
        try { return await page.evaluate(fn, arg); }
        catch (e) {
          if (!/context was destroyed|Target closed|detached/i.test(String(e.message))) throw e;
          await new Promise(r => setTimeout(r, 120));
        }
      }
      return fallback;
    };

    // C6 (AP-13): parent-doc text sweep at each beat sample (scs 8's
    // duplicate-copy class + the qri 12 overlap class). WARN-only.
    try { await page.evaluate(collectTextBoxesSource); } catch (_) {}
    const textFindings = [];
    const sampleText = async (atS) => {
      try {
        const boxes = await page.evaluate(() => window.__wpfCollectTextBoxes('#stage'));
        const vp = page.viewportSize() || { width: 1080, height: 1920 };
        const j = judgeText(boxes, { w: vp.width, h: vp.height });
        if (j.offFrame.length || j.overlaps.length || j.duplicates.length) {
          textFindings.push({ at: Number(atS.toFixed(1)), offFrame: j.offFrame, overlaps: j.overlaps, duplicates: j.duplicates });
        }
      } catch (_) { /* text sweep is a nicety */ }
    };

    for (;;) {
      const state = await evalSafe(() => ({
        n: (window.__beats || []).length,
        now: window.__T0 != null ? (performance.now() - window.__T0) / 1000 : 0,
        done: window.__done === true,
        hasContract: Array.isArray(window.__beats),
      }), undefined, { n: seen, now: 0, done: false, hasContract: true });
      if (!state.hasContract && state.done) { contractless = true; break; }

      if (state.n > seen) {
        const fresh = await evalSafe((from) => (window.__beats || []).slice(from), seen, []);
        seen = state.n;
        for (const rec of fresh) {
          if (!rec || !rec.target) continue;
          const probeAt = Number.isFinite(rec.probeAt) ? rec.probeAt : 1.4;
          const durS = Number.isFinite(rec.durS) ? rec.durS : 4;
          pending.push({
            rec,
            dueAt: rec.t + Math.min(probeAt, Math.max(0.2, durS - 0.2)),
            secondDue: rec.t + Math.max(probeAt, durS * 0.6),
            sampled1: null,
          });
        }
      }

      for (const p of pending) {
        if (p.settled) continue;
        const tol = Number.isFinite(p.rec.centerTol) ? p.rec.centerTol : args.centerTol;
        const crit = { centerTol: tol, floor: args.floor, lumaRange: args.lumaRange };
        if (p.sampled1 == null && state.now >= p.dueAt) {
          const m = await evalSafe(measureInPage, { sel: p.rec.target, fill: p.rec.fill }, { err: "sample collided with a snapshot swap" });
          if (!m.err) m.pixel = await pixelStats(page, bandBox, m.rect, m.v);
          p.sampled1 = { m, judged: judge(m, crit), at: state.now };
          await sampleText(state.now);
          if (p.sampled1.judged.pass || p.secondDue <= p.dueAt + 0.05) p.settled = true;
        } else if (p.sampled1 != null && !p.sampled1.judged.pass && state.now >= p.secondDue) {
          const m = await evalSafe(measureInPage, { sel: p.rec.target, fill: p.rec.fill }, { err: "sample collided with a snapshot swap" });
          if (!m.err) m.pixel = await pixelStats(page, bandBox, m.rect, m.v);
          p.sampled2 = { m, judged: judge(m, crit), at: state.now };
          await sampleText(state.now);
          p.settled = true;
        }
      }

      if (state.done || Date.now() > deadline) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (contractless) {
      console.log('  no __beats contract in this film — nothing to assert (old-skeleton short; rebuild to gain the probe)');
      return;
    }

    let measured = 0;
    for (const p of pending) {
      const best = (p.sampled2 && p.sampled2.judged.pass) ? p.sampled2 : (p.sampled1 || p.sampled2);
      if (!best) {
        console.log(`  ✗ ${p.rec.key}: beat never reached its probe window (video ended early?)`);
        failures++;
        continue;
      }
      measured++;
      const j = best.judged;
      const warns = [...new Set([...(p.sampled1 ? p.sampled1.judged.warns : []), ...(p.sampled2 ? p.sampled2.judged.warns : [])])];
      if (j.pass) {
        const paint = best.m.pixel ? `, paint range ${best.m.pixel.range.toFixed(0)}` : '';
        console.log(`  ✓ ${p.rec.key} @${best.at.toFixed(1)}s: "${p.rec.target}" in-frame + centered (zoom ${best.m.zoom ? best.m.zoom.toFixed(2) : '?'}${paint})`);
      } else {
        failures++;
        console.log(`  ✗ ${p.rec.key} @${best.at.toFixed(1)}s: "${p.rec.target}"`);
        for (const f of j.fails) console.log(`      ${f}`);
        if (p.sampled2 && p.sampled1 && !p.sampled1.judged.pass) console.log(`      (re-sampled at ${p.sampled2.at.toFixed(1)}s — still failing)`);
      }
      for (const w of warns) console.log(`      ⚠ ${w}`);
    }

    {
      const totals = textFindings.reduce(
        (a, f) => ({ off: a.off + f.offFrame.length, ov: a.ov + f.overlaps.length, dup: a.dup + f.duplicates.length }),
        { off: 0, ov: 0, dup: 0 });
      if (totals.ov || totals.dup || totals.off) {
        console.log(`  ⚠ text sweep: ${totals.ov} overlap(s), ${totals.dup} duplicate(s), ${totals.off} off-frame (WARN-only)`);
        for (const f of textFindings.slice(0, 3)) {
          for (const o of f.overlaps.slice(0, 2)) console.log(`      @${f.at}s ${o.a} ∩ ${o.b} (${o.ox}x${o.oy}px)`);
          for (const d of f.duplicates.slice(0, 1)) console.log(`      @${f.at}s duplicate "${d.text}" in ${d.ids.join(' + ')}`);
        }
      }
      require('./lib/qc-report').writeSection(args.slug, 'textOverlap', {
        pass: !(totals.ov || totals.dup || totals.off), source: 'probe-short',
        samples: textFindings.length, overlaps: totals.ov, duplicates: totals.dup, offFrame: totals.off,
      });
    }

    if (!measured && !pending.length) {
      console.log('  __beats contract present but no records carried a target — declare targets per beat (A11)');
      failures++;
    }
    if (pageErrors.length) {
      failures += pageErrors.length;
      console.log(`  ✗ page errors: ${pageErrors.slice(0, 5).join(' | ')}`);
    }
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { server.kill(); } catch (_) {} }
  }
  console.log(failures ? `✗ PROBE FAIL (${failures})` : '✓ PROBE PASS — every declared target framed per the field-center rule');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
