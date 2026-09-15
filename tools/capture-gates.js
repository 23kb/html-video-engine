#!/usr/bin/env node
// capture-gates.js — WARN-level capture-quality gates (fix-round C6).
//
// Five cheap checks that would have caught, in minutes: the 32,766px WPCode
// page (ccs 1), the CSSOM-broken paint (ccs 12), the PK phone flag that
// survived FOUR QC rounds (ccs 21, bac D), the missing admin menu (as 4),
// and the baked-transform stacking traps that buried overlays (as 5).
//
// REPORT-ONLY: every finding is a WARN; exit code is 0 unless the tool
// itself breaks. Capture judgment stays human — these gates inform, they
// never fail a snapshot. Safe to run standalone against ANY snapshot
// (read-only); only `--write-outline` (used by post-capture.js) touches
// outline.md, and only inside its own marked section.
//
// Gates:
//   G1 geometry   — WARN when scrollHeight > 3× the capture viewport height
//                   (expressed in multiples, not absolutes — the 668 capture
//                   height is a known liability, README decision 3).
//   G2 paint diff — live-reference.png (saved by capture.js at capture time)
//                   vs a fresh headless screenshot of the frozen snapshot at
//                   the same viewport. Method rule (ccs 11): brightness +
//                   stddev are printed for EACH side before the diff — a
//                   broken reference is half of every comparison. WARN when
//                   mean abs diff > 8/255. A skip is NEVER silent — it is
//                   reported as "NOT RUN", because a gate that never fired is
//                   not a gate that passed (rf 2). Waits for network idle plus
//                   <body data-wpf-paint-settle="ms"> before screenshotting, so
//                   runtime rehydration is not read as a paint defect (rf 14).
//                   A WARN is cleared by LOOKING at the two PNGs or by fixing
//                   the capture — never by explaining it (rf 9).
//   G3 locale     — WARN on iti__XX country classes ≠ iti__us, DD/MM/YYYY
//                   date placeholders, and non-$ currency symbols (€ £ ₹ ¥).
//                   Phone country / date format / currency inherit the
//                   capture machine's locale and read wrong to a US audience.
//                   The FIX at authoring time: swap the class in the LOADER
//                   doc BEFORE lifting (bac D).
//   G4 admin      — admin-* slugs: WARN when #adminmenumain is absent; the
//                   #wpadminbar presence is noted either way (as 4).
//   G6 wiring     — WARN when _shared/interactivity.js is not linked, or when
//                   a frontend capture has no _shared/frontend.js (rf 11 — such
//                   a snapshot renders perfectly and does nothing).
//   G7 chrome     — frontend captures only: WARN on surviving theme header /
//                   nav / search / sidebar / footer / admin bar, on admin-only
//                   edit links (a truth defect — no visitor sees them), and on
//                   the "Please enable JavaScript" notice (rf 9).
//   G8 raster     — WARN on every <canvas> baked to PNG at capture time: the
//                   still looks right and the region is dead (rf 10).
//   G5 stacking   — computed transform/filter/contain on the ancestor chains
//                   of known-interactive blocks (builder panels, settings
//                   groups) create stacking contexts / containing blocks that
//                   trap overlays and break camera math (as 5).
//
// Usage:
//   node tools/capture-gates.js <slug> [<slug2> ...] [--no-paint-diff] [--write-outline]

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const SNAPSHOTS_DIR = path.join(REPO, 'snapshots');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

// Interactive blocks whose ancestor chains G5 audits.
const INTERACTIVE_ROOTS = [
  '.wpforms-panel-content-wrap', '.wpforms-panel-content',
  '.wpforms-panel-sidebar', '.wpforms-panel-fields-group',
  '#wpforms-builder-form', '.wpforms-field-options',
];

// G5b (AP-12, 2026-09-02): captured-hidden REVEAL targets — dropdowns,
// popovers, option groups a beat later un-hides. Audited hidden included,
// because both failure modes live in the hidden state: the sibling
// stacking-context trap (ee 6: identity-transformed .wpforms-setting-row
// siblings painted over a z-100 export dropdown) and stripped presentation
// (capture inlines styles for VISIBLE elements only — geo 3 / fuf 2: the
// hidden state can have no box at all).
const REVEAL_TARGETS = [
  '.choices__list--dropdown',
  '.wpforms-builder-dropdown-list',
  '.wpforms-field-option-group-inner',
  '.wpforms-panel-field-keyword-filter-keywords-container',
  '.wpforms-datepicker-popover-content',
  '[class*="popover"]',
  '[class*="dropdown-list"]',
];

function grayRaw(file, width, crop) {
  const vf = (crop ? `${crop},` : '') + `scale=${width}:-2,format=gray`;
  const r = spawnSync('ffmpeg', ['-i', file, '-vf', vf, '-f', 'rawvideo', '-'],
    { maxBuffer: 128 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout || !r.stdout.length) return null;
  return r.stdout;
}

function stats(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i];
  const mean = sum / buf.length;
  let varSum = 0;
  for (let i = 0; i < buf.length; i++) { const d = buf[i] - mean; varSum += d * d; }
  return { mean, std: Math.sqrt(varSum / buf.length) };
}

function staticScan(html) {
  const warns = [];
  // (The iti__ flag check is DOM-scoped in runGates — the raw HTML carries
  // every country's class in the widget's own dropdown list + CSS, so a
  // text-level scan over-fires on all ~240 codes.)
  if (/DD\/MM\/YYYY|dd\/mm\/yyyy/.test(html)) {
    warns.push('locale: DD/MM/YYYY date format found — non-US date order in a field preview');
  }
  const currency = [...new Set((html.match(/[€£₹¥]/g) || []))];
  if (currency.length) {
    warns.push(`locale: non-$ currency symbol(s) in markup: ${currency.join(' ')} — check field previews/settings`);
  }
  return warns;
}

async function runGates(slug, opts) {
  const dir = path.join(SNAPSHOTS_DIR, slug);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch (_) {}
  const viewport = (meta.viewport && meta.viewport.width) ? meta.viewport : { width: 1440, height: 900 };
  const warns = [];
  const notes = [];
  const skipped = [];   // gates that DID NOT RUN — reported loudly (rf 2)

  // G3 static locale scan (no browser needed)
  warns.push(...staticScan(html));

  // Browser-backed gates — serve the repo so /snapshots/_shared/... resolves.
  const { chromium } = require('playwright');
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    const fp = path.join(REPO, p);
    fs.readFile(fp, (e, buf) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(`http://localhost:${port}/snapshots/${slug}/index.html`, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(600);

    // G1 geometry
    const geo = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight,
      sw: document.documentElement.scrollWidth,
    }));
    const mult = geo.sh / viewport.height;
    if (mult > 3) {
      warns.push(`geometry: scrollHeight ${geo.sh}px = ${mult.toFixed(1)}× the ${viewport.height}px capture viewport (>3× — hidden overlays may have serialized expanded inline, ccs 1)`);
    } else {
      notes.push(`geometry ok: scrollHeight ${geo.sh}px (${mult.toFixed(1)}× viewport)`);
    }

    // G3 (DOM half): the SELECTED intl-tel flag — the widget's dropdown list
    // legitimately carries every country's class; only the selected flag
    // reads on camera (ccs 21, bac D — the PK flag survived FOUR QC rounds).
    const selectedFlags = await page.evaluate(() => {
      const out = [];
      // Container classes vary across intl-tel-input versions:
      // .iti__selected-flag (v17-), .iti__selected-country-primary (v19+).
      for (const f of document.querySelectorAll('.iti__selected-flag .iti__flag, .iti__selected-country-primary .iti__flag')) {
        const code = [...f.classList].find(c => /^iti__[a-z]{2}$/.test(c));
        if (code) out.push(code.slice(5));
      }
      return out;
    });
    const badFlags = [...new Set(selectedFlags.filter(c => c !== 'us'))];
    if (badFlags.length) {
      warns.push(`locale: SELECTED intl-tel flag(s) ≠ us: ${badFlags.join(', ')} — the phone flag reads wrong to a US audience (ccs 21, bac D; swap the class in the loader doc before lifting)`);
    }

    // G4 admin chrome
    if (slug.startsWith('admin-')) {
      const chrome = await page.evaluate(() => ({
        menu: !!document.querySelector('#adminmenumain'),
        bar: !!document.querySelector('#wpadminbar'),
      }));
      if (!chrome.menu) warns.push('admin chrome: #adminmenumain ABSENT — the admin menu is missing from this capture (as 4)');
      notes.push(`admin chrome: #wpadminbar ${chrome.bar ? 'present' : 'absent'}`);
    }

    // G5 stacking hazards + G5b reveal targets (AP-12). G5b exists because
    // the original G5 anchored on 6 BUILDER selectors, first match only — on
    // the admin page where ee 6 happened it checked nothing and reported
    // nothing. Report-only, like every gate; and when NEITHER builder anchors
    // nor reveal targets exist, G5 declares itself NOT RUN (rf 2: a silent
    // skip reads exactly like a pass).
    const g5 = await page.evaluate(({ roots, revealTargets }) => {
      const found = [];
      const seen = new Set();
      const push = (kind, anchor, node) => {
        const id = kind + '|' + anchor + '|' + node;
        if (!seen.has(id)) { seen.add(id); found.push({ kind, anchor, node }); }
      };
      const badOf = (el) => {
        const cs = getComputedStyle(el);
        const bad = [];
        if (cs.transform && cs.transform !== 'none') bad.push(`transform:${cs.transform.slice(0, 40)}`);
        if (cs.filter && cs.filter !== 'none') bad.push(`filter:${cs.filter.slice(0, 40)}`);
        if (cs.contain && cs.contain !== 'none') bad.push(`contain:${cs.contain}`);
        return bad;
      };
      const nameOf = (n) => (n.id ? '#' + n.id : n.className && String(n.className).trim() ? '.' + String(n.className).trim().split(' ')[0] : n.tagName);
      let anchorsFound = 0;
      for (const sel of roots) {
        const el = document.querySelector(sel);
        if (!el) continue;
        anchorsFound++;
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const bad = badOf(n);
          if (bad.length) push('ancestor', sel, nameOf(n) + '→' + bad.join(','));
        }
      }
      // G5b — every reveal-target match, hidden included.
      let revealFound = 0;
      for (const sel of revealTargets) {
        let matches = [];
        try { matches = Array.from(document.querySelectorAll(sel)); } catch (_) { continue; }
        for (const el of matches.slice(0, 40)) {
          revealFound++;
          // (i) ancestor transform/filter/contain walk (the original G5 shape)
          for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
            const bad = badOf(n);
            if (bad.length) push('reveal-ancestor', sel, nameOf(n) + '→' + bad.join(','));
          }
          // (ii) sibling stacking contexts of the nearest stacking-context
          // ancestor (the ee 6 shape: SIBLING rows with identity transforms
          // paint over the dropdown whatever its z-index).
          let sc = null;
          for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
            const cs = getComputedStyle(n);
            const isSC = cs.transform !== 'none' || cs.filter !== 'none' || cs.contain !== 'none'
              || parseFloat(cs.opacity) < 1 || (cs.position !== 'static' && cs.zIndex !== 'auto');
            if (isSC) { sc = n; break; }
          }
          const host = sc || el;
          if (host.parentElement) {
            for (const sib of host.parentElement.children) {
              if (sib === host) continue;
              const bad = badOf(sib);
              if (bad.length) push('reveal-sibling', sel, nameOf(sib) + '→' + bad.join(','));
            }
          }
          // (iii) stripped presentation — measure the SHOWN state on an
          // off-screen clone (own position/background preserved; only
          // display/visibility forced).
          try {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:absolute;left:-99999px;top:0;width:800px;';
            const clone = el.cloneNode(true);
            clone.style.setProperty('display', 'block', 'important');
            clone.style.setProperty('visibility', 'visible', 'important');
            wrap.appendChild(clone);
            document.body.appendChild(wrap);
            const cs2 = getComputedStyle(clone);
            const h = clone.offsetHeight;
            const bg = cs2.backgroundColor;
            const transparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
            const overlayish = /dropdown|choices__list|popover/i.test(sel);
            if (h === 0) push('reveal-stripped', sel, nameOf(el) + '→offsetHeight=0 when shown');
            else {
              if (overlayish && cs2.position === 'static') push('reveal-stripped', sel, nameOf(el) + '→position:static when shown (overlay presentation stripped)');
              if (overlayish && transparent) push('reveal-stripped', sel, nameOf(el) + '→transparent background when shown (panel chrome stripped)');
            }
            wrap.remove();
          } catch (_) { /* clone probe is best-effort */ }
        }
      }
      return { found, anchorsFound, revealFound };
    }, { roots: INTERACTIVE_ROOTS, revealTargets: REVEAL_TARGETS });
    for (const h of g5.found) {
      if (h.kind === 'ancestor') {
        warns.push(`stacking: ${h.node} on the ancestor chain of ${h.anchor} — creates a stacking context/containing block that traps overlays and breaks camera math (as 5)`);
      } else if (h.kind === 'reveal-ancestor') {
        warns.push(`stacking (reveal target): ${h.node} on the ancestor chain of ${h.anchor} — the revealed overlay is trapped in that context whatever its z-index (as 5 / qrd 6)`);
      } else if (h.kind === 'reveal-sibling') {
        warns.push(`sibling stacking context: ${h.node} beside a ${h.anchor} reveal target — siblings with transform/filter/contain paint OVER the revealed overlay (ee 6; strip identity transforms or add a targeted transform:none)`);
      } else if (h.kind === 'reveal-stripped') {
        warns.push(`stripped presentation: ${h.anchor} ${h.node} — capture inlined styles for visible elements only, so this reveal target has no box/overlay chrome when shown (geo 3 / fuf 2; restore the product's own box inline)`);
      }
    }
    if (!g5.anchorsFound && !g5.revealFound) {
      skipped.push('G5 — no interactive/reveal anchors found on this capture (nothing audited)');
    } else {
      notes.push(`G5: ${g5.anchorsFound} builder anchor(s) + ${g5.revealFound} reveal target(s) audited`);
    }

    // G6 wiring + G7 theme chrome + G8 dead raster.
    //
    // All three exist because Umair found their defects in seconds on a batch
    // that had passed every automated check: a frontend capture that was "a
    // shot of a website, not of the form", with drag and arrows dead and an
    // admin-only Edit Form link visible to nobody but us (rf 9).
    const surface = await page.evaluate(() => {
      const classTokens = (sel) => [...document.querySelectorAll(sel)];
      const isFrontend = !document.querySelector('#wpforms-builder')
        && !document.querySelector('#adminmenumain, #wpcontent, #wpwrap')
        && [...document.querySelectorAll('[class]')].some(el => el.classList.contains('wpforms-form'));
      const present = (sel) => classTokens(sel).filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      }).length;
      return {
        isFrontend,
        linkedInteractivity: /_shared\/interactivity\.js/.test(document.documentElement.innerHTML),
        linkedFrontend: /_shared\/frontend\.js/.test(document.documentElement.innerHTML),
        rasters: classTokens('img[data-from-canvas]').map(i => ({
          w: Math.round(i.getBoundingClientRect().width),
          h: Math.round(i.getBoundingClientRect().height),
        })),
        chrome: {
          header: present('body > header, .site-header, #masthead'),
          nav: present('body nav, .main-navigation, #site-navigation'),
          search: present('form[role="search"], .search-form'),
          sidebar: present('#secondary, .widget-area, body > aside'),
          footer: present('body > footer, .site-footer, #colophon'),
          adminBar: present('#wpadminbar'),
        },
        editLinks: classTokens('.post-edit-link, #wp-admin-bar-edit, a[href*="action=edit"]').length,
        jsNotice: /Please enable JavaScript/i.test(document.body.innerText || ''),
      };
    });

    if (!surface.linkedInteractivity) {
      warns.push('wiring: _shared/interactivity.js is not linked — every registered transition is dead in this snapshot');
    }
    if (surface.isFrontend && !surface.linkedFrontend) {
      warns.push('wiring: frontend capture with no _shared/frontend.js — its handlers never run, so the snapshot renders perfectly and does nothing (rf 11)');
    }
    if (surface.isFrontend) {
      const bits = Object.entries(surface.chrome).filter(([, n]) => n > 0).map(([k, n]) => `${k}×${n}`);
      if (bits.length) {
        warns.push(`chrome: frontend capture still carries theme chrome (${bits.join(', ')}) — that is a shot of a website, not of the form. Strip it in the capture plan (rf 9)`);
      }
      if (surface.editLinks) {
        warns.push(`chrome: ${surface.editLinks} admin-only edit link(s) in a frontend capture — a TRUTH defect, no visitor ever sees these`);
      }
      if (surface.jsNotice) {
        warns.push('chrome: the "Please enable JavaScript" notice is visible — it renders because capture strips scripts, and no visitor sees it');
      }
    }
    for (const r of surface.rasters) {
      warns.push(`raster: a ${r.w}×${r.h} <canvas> was baked to PNG at capture time — DEAD region (no hover, no resize, not animatable as DOM). Rehydrate it if a beat needs it live (rf 10)`);
    }

    // G2 paint diff
    const refPath = path.join(dir, 'live-reference.png');
    if (!opts.paintDiff) {
      skipped.push('G2 paint diff — suppressed by --no-paint-diff');
    } else if (!fs.existsSync(refPath)) {
      skipped.push('G2 paint diff — no live-reference.png (this capture pre-dates the gate). Re-capture, or backfill a reference, if the snapshot matters');
    } else {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-gates-'));
      const frozenPath = path.join(tmp, 'frozen.png');
      try {
        // Runtime rehydration (chart re-init and friends) paints AFTER load.
        // Without this wait the gate screenshots a still-empty region and then
        // WARNs forever on a snapshot that just became MORE faithful (rf 14).
        // A snapshot can declare its own budget: <body data-wpf-paint-settle="800">.
        const settle = await page.evaluate(() => {
          const b = document.body;
          if (!b) return 0;
          const v = b.getAttribute('data-wpf-paint-settle');
          if (v) return Math.min(parseInt(v, 10) || 0, 5000);
          return b.hasAttribute('data-wpf-charts') ? 1200 : 0;
        });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        if (settle) {
          notes.push(`paint settle: waited ${settle}ms for runtime rehydration before screenshotting`);
          await page.waitForTimeout(settle);
        }
        await page.screenshot({ path: frozenPath });

        // Capture strips WP chrome ON PURPOSE — the admin bar always, the
        // sidebar for non-`admin-` slugs — but live-reference.png is saved
        // BEFORE those strips run. Unmasked, the gate charges us for our own
        // edit: sp-results-ranking-full measured 31.0 full-frame vs 7.2 with
        // the two bands excluded, i.e. the entire WARN was the chrome (rf 9).
        // Each band is masked only after confirming it is actually dark in the
        // reference, so a folded/absent sidebar can't mask live content.
        const chrome = await page.evaluate(() => ({
          isWpAdmin: !!document.querySelector('#wpcontent, #wpbody, body.wp-admin'),
          hasMenu: !!document.querySelector('#adminmenumain'),
          hasBar: !!document.querySelector('#wpadminbar'),
        }));
        const bands = [];
        let maskL = 0, maskT = 0;
        if (chrome.isWpAdmin && !chrome.hasMenu) {
          const band = grayRaw(refPath, 120, 'crop=160:ih:0:0');
          if (band && stats(band).mean < 100) { maskL = 160; bands.push('sidebar 160px'); }
        }
        if (chrome.isWpAdmin && !chrome.hasBar) {
          const band = grayRaw(refPath, 480, 'crop=iw:32:0:0');
          if (band && stats(band).mean < 100) { maskT = 32; bands.push('admin bar 32px'); }
        }
        const crop = (maskL || maskT) ? `crop=iw-${maskL}:ih-${maskT}:${maskL}:${maskT}` : null;
        if (crop) notes.push(`paint mask: excluded stripped WP chrome (${bands.join(' + ')}) — capture removes it after the reference is saved`);
        const a = grayRaw(refPath, 480, crop);
        const b = grayRaw(frozenPath, 480, crop);
        if (!a || !b) {
          warns.push('paint diff: could not decode one side (ffmpeg) — comparison not run');
        } else {
          const sa = stats(a), sb = stats(b);
          // ccs 11 method rule: measure each side BEFORE trusting any diff.
          notes.push(`paint sides: live mean ${sa.mean.toFixed(1)} std ${sa.std.toFixed(1)} · frozen mean ${sb.mean.toFixed(1)} std ${sb.std.toFixed(1)} (a near-zero std side = blank/broken reference — distrust the diff)`);
          if (a.length !== b.length) {
            warns.push(`paint diff: dimension mismatch (live ${a.length}B vs frozen ${b.length}B raw) — viewports differ, comparison not run`);
          } else {
            let sum = 0;
            for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
            const mad = sum / a.length;
            if (mad > 8) warns.push(`paint diff: mean abs diff ${mad.toFixed(1)}/255 (>8) — the frozen snapshot paints differently from the live page (ccs 12; CSSOM-injected styles are the usual cause). CLEAR THIS BY OPENING BOTH PNGs (snapshots/${slug}/live-reference.png vs the frozen render) OR BY FIXING THE CAPTURE — never by reasoning about it. rf 9: this gate was right 4/4 on its first batch and every WARN got explained away`);
            else notes.push(`paint diff ok: mean abs diff ${mad.toFixed(1)}/255`);
          }
        }
      } finally {
        try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
      }
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
  return { warns, notes, skipped };
}

// Replace/append the marked gates section in outline.md (idempotent).
function writeOutlineSection(slug, warns) {
  const outlinePath = path.join(SNAPSHOTS_DIR, slug, 'outline.md');
  if (!fs.existsSync(outlinePath)) return;
  let text = fs.readFileSync(outlinePath, 'utf8');
  const START = '<!-- capture-gates:start -->';
  const END = '<!-- capture-gates:end -->';
  const section = warns.length
    ? `${START}\n## Capture gates (auto, ${new Date().toISOString().slice(0, 10)})\n\n${warns.map(w => `- ⚠ ${w}`).join('\n')}\n${END}`
    : `${START}\n${END}`;
  if (text.includes(START)) {
    text = text.replace(new RegExp(`${START}[\\s\\S]*?${END}`), section);
  } else {
    text = text.trimEnd() + '\n\n' + section + '\n';
  }
  fs.writeFileSync(outlinePath, text, 'utf8');
}

async function main() {
  const argv = process.argv.slice(2);
  const slugs = [];
  let paintDiff = true;
  let writeOutline = false;
  for (const a of argv) {
    if (a === '--no-paint-diff') paintDiff = false;
    else if (a === '--write-outline') writeOutline = true;
    else if (!a.startsWith('--')) slugs.push(a);
    else { console.error('unknown arg: ' + a); process.exit(1); }
  }
  if (!slugs.length) {
    console.error('Usage: node tools/capture-gates.js <slug> [<slug2> ...] [--no-paint-diff] [--write-outline]');
    process.exit(1);
  }
  for (const slug of slugs) {
    if (!fs.existsSync(path.join(SNAPSHOTS_DIR, slug, 'index.html'))) {
      console.error(`Unknown snapshot: ${slug}`);
      process.exit(1);
    }
  }
  for (const slug of slugs) {
    console.log(`\n── capture-gates: ${slug}`);
    const { warns, notes, skipped } = await runGates(slug, { paintDiff });
    for (const n of notes) console.log(`   ${n}`);
    for (const k of skipped) console.log(`   ⚠ NOT RUN  ${k}`);
    for (const w of warns) console.log(`   ⚠ WARN ${w}`);
    if (!warns.length) {
      console.log(skipped.length
        ? `   ✓ no gate warnings — but ${skipped.length} gate(s) DID NOT RUN (above). A gate that never fired is not a gate that passed (rf 2)`
        : '   ✓ no gate warnings');
    }
    if (writeOutline) writeOutlineSection(slug, warns);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
