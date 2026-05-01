// Walk every interactive element in a snapshot and dump
// { selector, tag, text, rect, visible, dataAttrs } to JSON.
// Usage:
//   node tools/inspect-snapshot.js <snapshot-slug> [--sanitize] [--port 4321]
//   node tools/inspect-snapshot.js <snapshot-slug> --emit-selectors [--all] [--filter <substr>]
//
// Default mode: Playwright walk → tools/inspect-out/<slug>.json.
//   The dev server must already be running at http://localhost:<port>.
//
// --emit-selectors mode: read snapshots/<slug>/catalog.md, emit a starter
//   _selectors.js sheet to stdout. Conservative, catalog-grounded authoring
//   aid. Output shape matches the Phase 6 Step 1 provenance model:
//
//     export const <camelSlug> = {
//       <key>: { sel: '<selector>', src: 'catalog.md#<anchor>' },
//       ...
//     };
//
//   Default = starter subset (a few hundred author-useful entries, biased
//   toward panels, settings-panel fields, field-option wrappers, modals,
//   Choices branch, and data-* anchors).
//   --all = full catalog dump (every row). Strict superset of starter.
//
//   Every `sel` is a verbatim copy of a selector already indexed in the
//   catalog; every `src` points to a real catalog anchor. No guessed
//   selectors, no semantic inference. Catalog authority remains
//   `snapshots/<slug>/catalog.md` — regenerate the sheet if they drift.

const fs  = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const doSanitize = args.includes('--sanitize');
const emitSelectors = args.includes('--emit-selectors');
const emitAll = args.includes('--all');
const filter = (args.find(a => a.startsWith('--filter=')) || '').split('=')[1]
             || (args.includes('--filter') ? args[args.indexOf('--filter') + 1] : '');
const port = (args.find(a => a.startsWith('--port=')) || '').split('=')[1]
           || (args.includes('--port') ? args[args.indexOf('--port') + 1] : '4321');

if (!slug) {
  console.error('Usage: node tools/inspect-snapshot.js <slug> [--sanitize] [--port 4321]');
  console.error('       node tools/inspect-snapshot.js <slug> --emit-selectors [--filter <substr>]');
  process.exit(1);
}

// ── --emit-selectors: catalog-only, no Playwright ─────────────────────────
if (emitSelectors) {
  const catalogPath = path.join(__dirname, '..', 'snapshots', slug, 'catalog.md');
  if (!fs.existsSync(catalogPath)) {
    console.error(`catalog not found: ${catalogPath}`);
    process.exit(1);
  }
  const md = fs.readFileSync(catalogPath, 'utf8');

  // Parse every row of the form:
  //   | <a id="<anchor>"></a>`<anchor>` | `<selector>` | ...
  const rowRe = /^\|\s*<a id="([^"]+)"><\/a>`[^`]+`\s*\|\s*`([^`]+)`\s*\|/gm;

  function toCamel(s) {
    const parts = String(s).split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (!parts.length) return '_';
    let out = parts[0].toLowerCase();
    for (let i = 1; i < parts.length; i++) {
      out += parts[i].charAt(0).toUpperCase() + parts[i].slice(1).toLowerCase();
    }
    if (/^[0-9]/.test(out)) out = '_' + out;
    return out;
  }

  // ── Classification ─────────────────────────────────────────────────────
  // Given a catalog row, return either { group, key } (kept) or null
  // (dropped from the starter subset). `--all` bypasses the drop.
  //
  // `group` controls the section heading + comment grouping in the emitted
  // sheet. `key` is author-legible and mechanically derived — no semantic
  // inference about what the node "is".

  const STARTER_EXCLUDE_ID = /^choices--|^builder-themes-preview-/;
  const STARTER_CLASS_ALLOW = new Set([
    'choices',
    'choices__inner',
    'choices__list--dropdown',
    'wpforms-panel-sidebar-section',
    'wpforms-field-option-group-toggle',
    'wpforms-toggle-control',
    'wpforms-field',
  ]);

  // Starter opinionated allowlists. Everything they exclude is still
  // reachable through --all via the otherIds/otherClasses/other fallbacks.
  //
  // Design stance: for noisy field-control families (panel fields, field
  // palette, field types, canvas fields) the default starter does NOT
  // attempt to be broadly representative. It emits only a short, explicit
  // set of high-signal anchors that authors cite across most videos.
  // Anything else — including the long tail of settings/themes controls,
  // Pro/addon field types, additional field-type palette entries, and
  // every `data-field-id` anchor — is available via --all only. This
  // keeps the starter a starter rather than a catalog dump.

  // Sidebar-tab suffixes (after `wpforms-panel-sidebar-section-`) kept in
  // starter — WPForms builder's primary settings subtabs only. Provider /
  // integration sidebar sections drop.
  const STARTER_SIDEBAR_TABS = new Set([
    'general',
    'notifications',
    'confirmation',
    'anti_spam',
    'themes',
    'payments',
    'providers',
    'access',
    'revisions',
  ]);

  // High-signal settings-panel fields (tails after `wpforms-panel-field-`).
  // Explicit allowlist — anchors authors reference across most tutorial
  // videos. Everything else (long-tail settings controls, themes styling
  // controls, CSV-attachment toggles, sender metadata, etc.) is in --all
  // only.
  const HIGH_SIGNAL_PANEL_FIELDS = new Set([
    // Form identity
    'settings-form_title',
    'settings-form_desc',
    'settings-submit_text',
    'settings-submit_text_processing',
    // Primary notification
    'notifications-1-enable',
    'notifications-1-email',
    'notifications-1-subject',
    'notifications-1-sender_name',
    'notifications-1-sender_address',
    'notifications-1-replyto',
    'notifications-1-message',
    // Primary confirmation
    'confirmations-1-type',
    'confirmations-1-message',
    'confirmations-1-page',
    'confirmations-1-redirect',
  ]);

  // High-signal field types. Used for both the palette (addField_) and
  // data-field-type rows. Short, core-only list — the typical starter
  // fields in a form. Everything else drops to --all.
  const HIGH_SIGNAL_FIELD_TYPES = new Set([
    'text', 'textarea', 'email', 'name', 'phone', 'number',
    'select', 'radio', 'checkbox',
  ]);

  // Field-option instance cap — only the first handful of field-option
  // sidebar wrappers in starter.
  const STARTER_FIELD_OPT_MAX_N = 3;

  function classify(anchor, selector) {
    // ── ID-based anchors ────────────────────────────────────────────────
    if (anchor.startsWith('id--')) {
      const id = anchor.slice('id--'.length);

      if (STARTER_EXCLUDE_ID.test(id)) {
        // Dropped from starter; retained under --all via the fallback below.
        return null;
      }

      let m;

      // Modal / popup / wizard wrappers (openModal / dismissModal targets)
      if (/(?:-wizard|-modal|-popup|-goback)(?:-[a-z0-9_-]+)?$/.test(id) ||
          /-embed-wizard/.test(id)) {
        return { group: 'modals', key: 'modal_' + toCamel(id) };
      }

      // Settings panel fields — #wpforms-panel-field-<tail>
      // Checked BEFORE the panel-root pattern so `wpforms-panel-field-...`
      // doesn't get swallowed by the looser `wpforms-panel-[a-z_-]+$`.
      //
      // Starter: only tails in HIGH_SIGNAL_PANEL_FIELDS. Everything else
      // (the long tail of settings/themes/anti-spam controls, framer
      // sub-parts, instance 2+ copies) is kept under --all via otherIds.
      if ((m = /^wpforms-panel-field-(.+)$/.exec(id))) {
        const tail = m[1];
        if (!HIGH_SIGNAL_PANEL_FIELDS.has(tail)) {
          return emitAll
            ? { group: 'otherIds', key: 'id_' + toCamel(id) }
            : null;
        }
        return { group: 'panelFields', key: 'panelField_' + toCamel(tail) };
      }

      // Panel roots — e.g. #wpforms-panel-fields, #wpforms-panel-settings
      if ((m = /^wpforms-panel-([a-z][a-z_-]*)$/.exec(id))) {
        return { group: 'panels', key: 'panel_' + toCamel(m[1]) };
      }

      // Field-palette buttons — #wpforms-add-fields-<tail>
      // Starter: only HIGH_SIGNAL_FIELD_TYPES (core 9). Pro/addon field
      // palette buttons drop to --all.
      if ((m = /^wpforms-add-fields-(.+)$/.exec(id))) {
        const tail = m[1];
        if (!HIGH_SIGNAL_FIELD_TYPES.has(tail)) {
          return emitAll
            ? { group: 'otherIds', key: 'id_' + toCamel(id) }
            : null;
        }
        return { group: 'addFields', key: 'addField_' + toCamel(tail) };
      }

      // Field-option tab wrappers (Advanced/General/Smart Logic containers).
      // Starter caps to N ≤ STARTER_FIELD_OPT_MAX_N.
      if ((m = /^wpforms-field-option-advanced-(\d+)$/.exec(id))) {
        const n = parseInt(m[1], 10);
        if (!emitAll && n > STARTER_FIELD_OPT_MAX_N) return null;
        return { group: 'fieldOpts', key: 'fieldOptAdv_' + m[1] };
      }
      if ((m = /^wpforms-field-option-(general|smart-logic)-(\d+)$/.exec(id))) {
        const n = parseInt(m[2], 10);
        if (!emitAll && n > STARTER_FIELD_OPT_MAX_N) return null;
        return { group: 'fieldOpts', key: 'fieldOpt' + toCamel(m[1]).replace(/^./, c => c.toUpperCase()) + '_' + m[2] };
      }

      // Field-option sidebar root — #wpforms-field-option-<N>
      if ((m = /^wpforms-field-option-(\d+)$/.exec(id))) {
        const n = parseInt(m[1], 10);
        if (!emitAll && n > STARTER_FIELD_OPT_MAX_N) return null;
        return { group: 'fieldOpts', key: 'fieldOpt_' + m[1] };
      }

      // Field-option per-control wrappers (#wpforms-field-option-row-<N>-<ctrl>)
      // are in catalog but dropped from the starter — the DOM contains one
      // per control per field, which floods the sheet (700+ entries on a
      // busy snapshot). Authors can read specific control anchors from
      // catalog.md or use --all. Retained under --all via the fallback.
      if (/^wpforms-field-option-row-\d+-/.test(id)) {
        return emitAll
          ? { group: 'otherIds', key: 'id_' + toCamel(id) }
          : null;
      }

      // Top-level header/action anchors (save, preview, embed, help, logo)
      if (/^wpforms-(save|preview|embed|help|builder-logo|context-menu)(?:$|-)/.test(id)) {
        return { group: 'headerActions', key: 'hdr_' + toCamel(id.replace(/^wpforms-/, '')) };
      }

      // Not starter-worthy by default. `--all` still keeps it via fallback.
      return emitAll
        ? { group: 'otherIds', key: 'id_' + toCamel(id) }
        : null;
    }

    // ── data-* anchors ──────────────────────────────────────────────────
    // data-field-id (canvas fields): dropped from starter entirely. Every
    // form has a different set of instance IDs, so these are per-snapshot
    // and rarely the right authoring anchor for shared _selectors sheets.
    // Retained under --all only.
    if (anchor.startsWith('data-field-id--')) {
      const raw = anchor.slice('data-field-id--'.length);
      if (!emitAll) return null;
      return { group: 'fields', key: 'field_' + raw };
    }
    // data-field-type: HIGH_SIGNAL_FIELD_TYPES only in starter.
    if (anchor.startsWith('data-field-type--')) {
      const raw = anchor.slice('data-field-type--'.length);
      if (!emitAll && !HIGH_SIGNAL_FIELD_TYPES.has(raw)) {
        return null;
      }
      return { group: 'fieldTypes', key: 'fieldType_' + toCamel(raw) };
    }
    if (anchor.startsWith('data-panel--')) {
      return { group: 'dataPanels', key: 'panelData_' + toCamel(anchor.slice('data-panel--'.length)) };
    }
    if (anchor.startsWith('data-section--')) {
      return { group: 'dataSections', key: 'sectionData_' + toCamel(anchor.slice('data-section--'.length)) };
    }

    // ── Class anchors ───────────────────────────────────────────────────
    if (anchor.startsWith('class--')) {
      const cls = anchor.slice('class--'.length);

      // Sidebar tabs — switchTab targets. Parent class + every ...-<name>.
      // Starter: only primary builder settings subtabs (see STARTER_SIDEBAR_TABS).
      let m;
      if ((m = /^wpforms-panel-sidebar-section(?:-(.+))?$/.exec(cls))) {
        if (!m[1]) {
          return { group: 'sidebarTabs', key: 'sidebarTab' };
        }
        if (!emitAll && !STARTER_SIDEBAR_TABS.has(m[1])) {
          return emitAll
            ? { group: 'otherClasses', key: 'cls_' + toCamel(cls) }
            : null;
        }
        return { group: 'sidebarTabs', key: 'sidebarTab_' + toCamel(m[1]) };
      }

      if (STARTER_CLASS_ALLOW.has(cls)) {
        return { group: 'classes', key: 'cls_' + toCamel(cls) };
      }

      return emitAll
        ? { group: 'otherClasses', key: 'cls_' + toCamel(cls) }
        : null;
    }

    return emitAll ? { group: 'other', key: 'x_' + toCamel(anchor) } : null;
  }

  // Group ordering + human-readable headings in the emitted file.
  const GROUP_ORDER = [
    ['panels',         'Panel roots'],
    ['sidebarTabs',    'Sidebar tabs (switchTab targets)'],
    ['panelFields',    'Settings-panel fields'],
    ['addFields',      'Field-palette buttons'],
    ['fieldOpts',      'Field option sidebar (roots, tab wrappers, per-control wraps)'],
    ['modals',         'Modal / wizard / popup wrappers'],
    ['headerActions',  'Header action buttons'],
    ['fields',         'Fields on canvas (data-field-id)'],
    ['fieldTypes',     'Field types (data-field-type)'],
    ['dataPanels',     'data-panel anchors'],
    ['dataSections',   'data-section anchors'],
    ['classes',        'Curated class anchors'],
    ['otherIds',       '--all: other IDs'],
    ['otherClasses',   '--all: other classes'],
    ['other',          '--all: other'],
  ];

  const buckets = new Map();
  const keySeen = new Map();
  let totalRows = 0;
  let m;
  while ((m = rowRe.exec(md)) !== null) {
    totalRows++;
    const anchor   = m[1];
    const selector = m[2];
    if (filter && !anchor.includes(filter) && !selector.includes(filter)) continue;

    const hit = classify(anchor, selector);
    if (!hit) continue;

    let key = hit.key;
    const n = (keySeen.get(key) || 0) + 1;
    keySeen.set(key, n);
    if (n > 1) key += '_' + n;

    if (!buckets.has(hit.group)) buckets.set(hit.group, []);
    buckets.get(hit.group).push({ key, selector, anchor });
  }

  // Deterministic order: by the declared group order, then each bucket
  // sorted by key (so rerun = byte-identical).
  for (const [g] of GROUP_ORDER) {
    const list = buckets.get(g);
    if (list) list.sort((a, b) => a.key.localeCompare(b.key));
  }

  const emittedCount = [...buckets.values()].reduce((n, arr) => n + arr.length, 0);
  const moduleName = toCamel(slug);
  const mode = emitAll ? 'full catalog dump' : 'starter subset';

  const lines = [];
  lines.push('// Auto-generated starter selector sheet — authoring aid only.');
  lines.push('// Catalog authority: `snapshots/' + slug + '/catalog.md`.');
  lines.push('// Every entry is mechanically derived from a real catalog anchor.');
  lines.push('// Safe to rename/delete entries. Do NOT add selectors that are not');
  lines.push('// indexed in catalog.md — if catalog and sheet disagree, catalog wins.');
  lines.push('// Regenerate: node tools/inspect-snapshot.js ' + slug + ' --emit-selectors' + (emitAll ? ' --all' : ''));
  lines.push('// Mode: ' + mode + '. Entries: ' + emittedCount + ' / ' + totalRows + ' catalog rows' + (filter ? ' (filter ' + JSON.stringify(filter) + ')' : '') + '.');
  lines.push('');
  lines.push('export const ' + moduleName + ' = {');

  for (const [g, heading] of GROUP_ORDER) {
    const list = buckets.get(g);
    if (!list || !list.length) continue;
    lines.push('');
    lines.push('  // ── ' + heading + ' (' + list.length + ') ──');
    for (const e of list) {
      const selStr = JSON.stringify(e.selector);
      const srcStr = JSON.stringify('catalog.md#' + e.anchor);
      lines.push('  ' + e.key + ': { sel: ' + selStr + ', src: ' + srcStr + ' },');
    }
  }

  lines.push('};');
  lines.push('');

  process.stdout.write(lines.join('\n'));
  process.exit(0);
}

// Playwright mode needs the dep; load it lazily so --emit-selectors works
// in environments where playwright isn't installed.
const { chromium } = require('playwright');

const OUT_DIR = path.join(__dirname, 'inspect-out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const INTERACTIVE = [
  'button', 'a[href]', 'input', 'select', 'textarea',
  '[role=button]', '[role=tab]', '[role=link]', '[role=menuitem]',
  '[data-field-type]', '[data-field-id]',
  '[id^="wpforms-add-fields-"]',
  '[class*="wpforms-"][class*="-button"]',
  '.wpforms-panel-sidebar-section',
  '.wpforms-field',
  '.wpforms-field-option',
  '.wpforms-toggle-control input[type=checkbox]',
  '.wpforms-row-actions a',
  '.wpforms-setup-template',
  '[data-template]',
  'td.column-name a',
  'th.check-column input',
];

(async () => {
  const url = `http://localhost:${port}/scenes/snapshot-viewer.html?snap=${slug}${doSanitize ? '&sanitize=1' : ''}`;
  console.log('[inspect] opening', url);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => console.warn('[page error]', e.message));

  await page.goto(url, { waitUntil: 'networkidle' });

  // Give sanitize pass + fit() a beat.
  await page.waitForTimeout(600);

  const frame = page.frameLocator('iframe#frame');
  // Wait for body to exist in the iframe.
  await frame.locator('body').first().waitFor({ timeout: 10000 });

  const frameHandle = (await page.$('iframe#frame'));
  const f = await frameHandle.contentFrame();

  const data = await f.evaluate((selectors) => {
    const out = [];
    const seen = new Set();

    function cssPath(el) {
      if (!el || el.nodeType !== 1) return '';
      if (el.id) return '#' + el.id;
      const parts = [];
      while (el && el.nodeType === 1 && el !== document.body) {
        let s = el.tagName.toLowerCase();
        if (el.classList.length) {
          s += '.' + [...el.classList].slice(0, 3).join('.');
        }
        const parent = el.parentElement;
        if (parent) {
          const sibs = [...parent.children].filter(c => c.tagName === el.tagName);
          if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(el) + 1})`;
        }
        parts.unshift(s);
        el = el.parentElement;
        if (parts.length > 6) break;
      }
      return parts.join(' > ');
    }

    function visible(el, r) {
      if (r.width === 0 || r.height === 0) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      return true;
    }

    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      for (const n of nodes) {
        if (seen.has(n)) continue;
        seen.add(n);
        const r = n.getBoundingClientRect();
        const dataAttrs = {};
        for (const a of n.attributes) {
          if (a.name.startsWith('data-')) dataAttrs[a.name] = a.value;
        }
        out.push({
          selector: cssPath(n),
          matchedBy: sel,
          tag: n.tagName.toLowerCase(),
          id: n.id || null,
          type: n.getAttribute ? (n.getAttribute('type') || '') : '',
          name: n.getAttribute ? (n.getAttribute('name') || '') : '',
          value: (n.value || '').toString().slice(0, 120),
          classes: [...n.classList],
          text: (n.innerText || n.value || '').trim().slice(0, 120),
          rect: { x: Math.round(r.left), y: Math.round(r.top),
                  w: Math.round(r.width), h: Math.round(r.height) },
          visible: visible(n, r),
          dataAttrs,
        });
      }
    }
    return out;
  }, INTERACTIVE);

  const outPath = path.join(OUT_DIR, `${slug}${doSanitize ? '.sanitized' : ''}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ slug, sanitized: doSanitize, count: data.length, items: data }, null, 2));
  console.log(`[inspect] wrote ${outPath} (${data.length} elements)`);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
