// Stage 3 Slice 3d (pilot) — clean the builder canvas of an existing
// `builder-field-options-*` snapshot down to the desired baseline.
//
// Removes only `<div class="wpforms-field ..." data-field-id="N">` rows
// from the visible canvas (`<div class="wpforms-field-wrap ui-sortable">`).
// Preserves: scripts/styles/assets, the right-rail field-option panels
// (`<div class="wpforms-field-option ..." id="wpforms-field-option-N">`),
// the active field's id, and all builder chrome.
//
// Pilot scope: produce two cleaned outputs under
//   snapshots-clean-builder/<slug>/
// without touching `snapshots/<slug>/`. Existing snapshots remain
// authoritative until the pilot is approved.
//
// Usage:
//   node tools/clean-builder-snapshot-canvas.js <slug> [<slug2> ...]
//
// Default output root: snapshots-clean-builder/. Override with --out <dir>.
//
// Cleaning rule (per slug):
//   1. Identify the active canvas field (`wpforms-field ... active ...`).
//      That field is preserved unconditionally — it is the field under test.
//   2. For each baseline field type, preserve the lowest-data-field-id row
//      of that type, unless the active field already covers it.
//      Baseline types: name, email, textarea, phone, radio, checkbox.
//   3. Every other canvas row is removed.
//   4. Field-option panels (right rail) are not touched.
//
// Output:
//   <out>/<slug>/index.html       cleaned HTML
//   <out>/<slug>/assets/          symlinked or copied from raw snapshot
//   <out>/<slug>/meta.json        original meta + cleaningApplied + report
//
// No edits to runtime, engine, scenes, videos, sanitize, capture, or any
// raw `snapshots/<slug>/` folder.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT, 'snapshots');
const PORT = Number(process.env.CLEAN_PORT) || 4395;

const BASELINE_TYPES = ['name', 'email', 'textarea', 'phone', 'radio', 'checkbox'];
const CLEAN_FORM_TITLE = 'Simple Contact Form';
const QUIZ_TAB_SELECTORS = [
  'ul.js-wpforms-quiz-panel-content-section-tabs-list',
  'ul.wpforms-quiz-panel-content-section-tabs-list',
];
const PAYPAL_SELECTORS = [
  '#wpforms-paypal-commerce-buttons-wrapper',
  '[id^="wpforms-paypal-commerce-buttons"]',
  '[id^="wpforms-paypal-commerce-paypal-checkout-button"]',
];

function parseArgs(argv) {
  const args = { slugs: [], out: 'snapshots-clean-builder' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a.startsWith('--')) { console.error(`Unknown flag: ${a}`); process.exit(2); }
    else args.slugs.push(a);
  }
  if (!args.slugs.length) { console.error('Usage: node tools/clean-builder-snapshot-canvas.js <slug> [<slug>...]'); process.exit(2); }
  return args;
}

function startServer() {
  const proc = spawn(process.execPath, ['serve.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise(resolve => {
    let started = false;
    const onChunk = (b) => {
      if (started) return;
      if (b.toString().includes(`localhost:${PORT}`)) { started = true; resolve(proc); }
    };
    proc.stdout.on('data', onChunk);
    proc.stderr.on('data', onChunk);
    setTimeout(() => { if (!started) { started = true; resolve(proc); } }, 1500);
  });
}

function copyDirSync(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function cleanSlug(page, slug, outRoot) {
  const srcDir = path.join(SNAPSHOTS_DIR, slug);
  if (!fs.existsSync(path.join(srcDir, 'index.html'))) {
    return { slug, ok: false, error: `missing snapshots/${slug}/index.html` };
  }

  const url = `http://localhost:${PORT}/snapshots/${slug}/index.html`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const result = await page.evaluate(({ BASELINE_TYPES, CLEAN_FORM_TITLE, QUIZ_TAB_SELECTORS, PAYPAL_SELECTORS }) => {
    const wrap = document.querySelector('div.wpforms-field-wrap.ui-sortable');
    if (!wrap) return { ok: false, error: 'no .wpforms-field-wrap.ui-sortable container' };

    const rows = Array.from(wrap.querySelectorAll(':scope > div.wpforms-field[data-field-id]'));
    const before = rows.map(r => ({
      id: Number(r.getAttribute('data-field-id')),
      type: r.getAttribute('data-field-type'),
      active: r.classList.contains('active'),
    }));

    const activeRow = rows.find(r => r.classList.contains('active'));
    const activeId = activeRow ? Number(activeRow.getAttribute('data-field-id')) : null;
    const activeType = activeRow ? activeRow.getAttribute('data-field-type') : null;

    const keep = new Set();
    if (activeId != null) keep.add(activeId);

    for (const t of BASELINE_TYPES) {
      const already = [...keep].some(id => {
        const r = rows.find(x => Number(x.getAttribute('data-field-id')) === id);
        return r && r.getAttribute('data-field-type') === t;
      });
      if (already) continue;
      const candidates = rows
        .filter(r => r.getAttribute('data-field-type') === t)
        .sort((a, b) => Number(a.getAttribute('data-field-id')) - Number(b.getAttribute('data-field-id')));
      if (candidates.length) keep.add(Number(candidates[0].getAttribute('data-field-id')));
    }

    const removed = [];
    for (const r of rows) {
      const id = Number(r.getAttribute('data-field-id'));
      if (!keep.has(id)) {
        removed.push({ id, type: r.getAttribute('data-field-type') });
        r.remove();
      }
    }

    const after = Array.from(wrap.querySelectorAll(':scope > div.wpforms-field[data-field-id]')).map(r => ({
      id: Number(r.getAttribute('data-field-id')),
      type: r.getAttribute('data-field-type'),
      active: r.classList.contains('active'),
    }));

    const visibleOptionPanels = Array.from(document.querySelectorAll('div.wpforms-field-option[id^="wpforms-field-option-"]'))
      .filter(el => {
        const s = (el.getAttribute('style') || '').replace(/\s+/g, '');
        return !s.includes('display:none');
      })
      .map(el => Number(el.getAttribute('data-field-id')));

    // Reposition: the active field should be the 3rd visible canvas row.
    // Only reorders direct children of the sortable wrap. Non-active kept
    // fields keep their relative order. Field ids, option-panel DOM, and
    // nested-inside-Layout/Repeater fields are not touched.
    let activeFieldPosition = null;
    {
      const remaining = Array.from(wrap.querySelectorAll(':scope > div.wpforms-field[data-field-id]'));
      const active = remaining.find(r => r.classList.contains('active'));
      if (active && remaining.length >= 3) {
        const targetIndex = 2; // 0-based → row 3 visually
        const others = remaining.filter(r => r !== active);
        const reordered = [...others.slice(0, targetIndex), active, ...others.slice(targetIndex)];
        for (const r of reordered) wrap.appendChild(r); // moves in order
        activeFieldPosition = targetIndex + 1;
      } else if (active) {
        activeFieldPosition = remaining.indexOf(active) + 1;
      }
    }

    // Quiz panel tabs (Questions / Outcomes / Results / Settings strip).
    let removedQuizTabs = 0;
    for (const sel of QUIZ_TAB_SELECTORS) {
      for (const el of document.querySelectorAll(sel)) { el.remove(); removedQuizTabs++; }
    }

    // PayPal Commerce button preview (wrapper + any descendants by id-prefix).
    let removedPaypal = 0;
    for (const sel of PAYPAL_SELECTORS) {
      for (const el of document.querySelectorAll(sel)) { el.remove(); removedPaypal++; }
    }

    // Rename "Master Form" → contextual clean demo title in every visible
    // form-name surface and the form-title settings input.
    const titleChanges = [];
    for (const el of document.querySelectorAll('.wpforms-form-name')) {
      const before = (el.textContent || '').trim();
      if (before) {
        el.textContent = CLEAN_FORM_TITLE;
        titleChanges.push({ where: el.tagName.toLowerCase() + '.wpforms-form-name', before, after: CLEAN_FORM_TITLE });
      }
    }
    const titleInput = document.querySelector('#wpforms-panel-field-settings-form_title');
    if (titleInput && titleInput.getAttribute('value') === 'Master Form') {
      titleInput.setAttribute('value', CLEAN_FORM_TITLE);
      titleChanges.push({ where: 'input#wpforms-panel-field-settings-form_title[value]', before: 'Master Form', after: CLEAN_FORM_TITLE });
    }

    const masterFormStillPresent = (document.documentElement.outerHTML.match(/Master Form/g) || []).length;

    return {
      ok: true,
      activeId, activeType,
      keep: [...keep].sort((a, b) => a - b),
      visibleOptionPanels,
      removed,
      before, after,
      activeFieldPosition,
      removedQuizTabs,
      removedPaypal,
      titleChanges,
      masterFormStillPresent,
      html: '<!doctype html>\n' + document.documentElement.outerHTML,
    };
  }, { BASELINE_TYPES, CLEAN_FORM_TITLE, QUIZ_TAB_SELECTORS, PAYPAL_SELECTORS });

  if (!result.ok) return { slug, ok: false, error: result.error };

  const outDir = path.join(outRoot, slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), result.html);

  // Copy assets/ + meta.json + catalog.md (if present). Catalog will be
  // regenerated later; we copy as a stable starting point.
  const assetsSrc = path.join(srcDir, 'assets');
  if (fs.existsSync(assetsSrc)) copyDirSync(assetsSrc, path.join(outDir, 'assets'));

  let origMeta = {};
  const metaSrc = path.join(srcDir, 'meta.json');
  if (fs.existsSync(metaSrc)) {
    try { origMeta = JSON.parse(fs.readFileSync(metaSrc, 'utf8')); } catch {}
  }
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({
    ...origMeta,
    cleaningApplied: true,
    cleaningTool: 'tools/clean-builder-snapshot-canvas.js',
    cleanedAt: new Date().toISOString(),
    sourceSnapshot: slug,
    cleaningReport: {
      activeFieldId: result.activeId,
      activeFieldType: result.activeType,
      preservedFieldIds: result.keep,
      visibleOptionPanels: result.visibleOptionPanels,
      removedFieldIds: result.removed.map(r => r.id),
      removedFieldTypes: result.removed.map(r => r.type),
      beforeCount: result.before.length,
      afterCount: result.after.length,
      activeFieldPosition: result.activeFieldPosition,
      removedQuizTabs: result.removedQuizTabs,
      removedPaypal: result.removedPaypal,
      titleChanges: result.titleChanges,
      masterFormStillPresent: result.masterFormStillPresent,
      selectorsUsed: {
        canvasContainer: 'div.wpforms-field-wrap.ui-sortable',
        canvasField: ':scope > div.wpforms-field[data-field-id]',
        activeMarker: 'wpforms-field.active',
        optionPanel: 'div.wpforms-field-option[id^="wpforms-field-option-"]',
        baselineTypes: BASELINE_TYPES,
        quizTabs: QUIZ_TAB_SELECTORS,
        paypal: PAYPAL_SELECTORS,
        formTitleNodes: ['.wpforms-form-name', '#wpforms-panel-field-settings-form_title'],
        cleanFormTitle: CLEAN_FORM_TITLE,
      },
    },
  }, null, 2));

  // Minimal truthful catalog-audit.json. Distinct from the upstream
  // selector audit shape (`auditorVersion`/`targets`); declares its own
  // generator so downstream tooling can tell them apart.
  const cleanedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, 'catalog-audit.json'), JSON.stringify({
    slug,
    sourceSnapshot: slug,
    generatedBy: 'tools/clean-builder-snapshot-canvas.js',
    cleanedAt,
    canvasFieldsKept: result.keep,
    canvasFieldsRemoved: result.removed.map(r => r.id),
    activeFieldId: result.activeId,
    activeFieldType: result.activeType,
    activeFieldPosition: result.activeFieldPosition,
    notes: 'Cleaned builder snapshot; visible canvas was reduced and active field repositioned.',
  }, null, 2));

  return {
    slug, ok: true,
    activeId: result.activeId,
    activeType: result.activeType,
    activeFieldPosition: result.activeFieldPosition,
    keep: result.keep,
    visibleOptionPanels: result.visibleOptionPanels,
    beforeCount: result.before.length,
    afterCount: result.after.length,
    removed: result.removed,
  };
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(ROOT, args.out);
  fs.mkdirSync(outRoot, { recursive: true });

  console.log(`→ clean-builder-snapshot-canvas (pilot)`);
  console.log(`  slugs: ${args.slugs.join(', ')}`);
  console.log(`  out:   ${path.relative(ROOT, outRoot)}/`);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const reports = [];
  for (const slug of args.slugs) {
    process.stdout.write(`  · ${slug} ... `);
    try {
      const r = await cleanSlug(page, slug, outRoot);
      reports.push(r);
      if (r.ok) console.log(`OK  (kept ${r.afterCount}, removed ${r.beforeCount - r.afterCount}, active=${r.activeId}/${r.activeType})`);
      else console.log(`FAIL  ${r.error}`);
    } catch (e) {
      reports.push({ slug, ok: false, error: e.message });
      console.log(`ERROR ${e.message}`);
    }
  }

  await browser.close();
  server.kill();

  fs.writeFileSync(path.join(outRoot, '_clean-report.json'), JSON.stringify({ runAt: new Date().toISOString(), reports }, null, 2));

  const ok = reports.filter(r => r.ok).length;
  const fail = reports.length - ok;
  console.log(`\n→ done. ${ok} cleaned, ${fail} failed. Report: ${path.relative(ROOT, path.join(outRoot, '_clean-report.json'))}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
