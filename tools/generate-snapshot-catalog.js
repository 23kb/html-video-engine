#!/usr/bin/env node
// Emits snapshots/<slug>/catalog.md — the canonical, machine-readable
// selector registry for a snapshot.
//
// Phase 6 Step 1a. Static parser; no browser, no server, no dependencies.
// Deterministic: identical input HTML → byte-identical catalog.md.
//
// Usage:
//   node tools/generate-snapshot-catalog.js <slug> [<slug2> ...]
//   node tools/generate-snapshot-catalog.js --all
//   node tools/generate-snapshot-catalog.js --consumer-surface
//
// --all                  emit for every directory under snapshots/
// --consumer-surface     emit for snapshots referenced by videos
//                        creating-first-form and _tests/verbs-probe only
//
// Also refreshes snapshots/CATALOG.md as a generated index by shelling
// out to capture/generate-catalog.js at the end (unless --no-index).

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT     = path.join(__dirname, '..');
const SNAP_DIR = path.join(ROOT, 'snapshots');

// Consumer surface for Phase 6 Step 1a — snapshots referenced by the
// videos currently touched by the phase. Bumped as the surface grows.
const CONSUMER_SURFACE = [
  'admin-forms-overview',
  'builder-setup',
  'builder-fields',
  'builder-settings-notifications',
  'builder-settings-confirmation',
  'builder-settings-confirmation-dropdown-closed',
  'builder-settings-confirmation-dropdown-open',
  'builder-field-options-radio',
  'builder-embed-modal',
];

// IDs matching these prefixes are WP admin chrome / framework noise,
// not chapter targets. Filtered out of the catalog so the entries that
// remain are the ones authors can realistically target.
const ID_EXCLUDE_PREFIXES = [
  'wp-admin-bar-', 'wpadminbar', 'wp-toolbar',
  'adminmenu', 'adminmenuback', 'adminmenuwrap', 'adminmenumain',
  'wpwrap', 'wpbody', 'wpcontent', 'wpfooter',
  'a11y-speak-', 'screen-meta', 'contextual-help',
  'wp-link-', 'link-selector', 'link-options',
  'menu-', 'footer-upgrade', 'footer-thankyou',
  'tab-panel-', 'tab-link-',
  'user_ID', 'user_login', 'wp_http_referer', 'closedpostboxesnonce',
  '_wpnonce', '_wp_http_referer', '_ajax_linking_nonce',
];

// IDs matching these exact names are also framework noise.
const ID_EXCLUDE_EXACT = new Set([
  'a', 'b', 'search-submit', 'query-submit',
  'wp-fullscreen-body', 'wp-fullscreen-title', 'wp-fullscreen-tagline',
  'wpbody-content', 'wpbody-content-container',
]);

// Class names matching these suffixes/keywords are treated as
// "role-like" selectors and surface in the catalog's class section.
// Keeps the catalog readable instead of dumping every wpforms-* class.
//
// Action-verb suffixes (`-add`, `-save`, etc.) cover real visible
// buttons whose only catalog-eligible selector is a class — e.g.
// `<button class="wpforms-notifications-add">Add New Notification</button>`.
const CLASS_ROLE_PATTERNS = [
  /-button$/, /-btn$/, /-tab$/, /-toggle(?:-control)?$/,
  /-option(?:s)?$/, /-input$/, /-link$/, /-section$/,
  /-row$/, /-actions$/, /-container$/, /-field$/,
  /-panel$/, /-sidebar$/, /-header$/, /-content$/,
  /-modal$/, /-notice$/, /-message$/, /-label$/,
  /-select$/, /-dropdown$/, /-search$/, /-filter$/,
  /-active$/, /-open$/, /-close$/, /-dismiss$/,
  /-add$/,
];

function classMatchesRolePattern(name) {
  for (const re of CLASS_ROLE_PATTERNS) if (re.test(name)) return true;
  return false;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set();
  const slugs = [];
  for (const a of args) {
    if (a.startsWith('--')) flags.add(a);
    else slugs.push(a);
  }
  return { flags, slugs };
}

function stripNoise(html) {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

// Minimal HTML attribute parser — single or double-quoted values.
// Good enough for snapshot HTML; we do not need full spec compliance.
function parseAttrs(attrStr) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    const name = m[1].toLowerCase();
    const val  = m[3] !== undefined ? m[3]
              : m[4] !== undefined ? m[4]
              : m[5] !== undefined ? m[5]
              : '';
    out[name] = val;
  }
  return out;
}

function truncate(s, n) {
  if (!s) return '';
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// Extract a short text hint for an element by grabbing the substring
// from the end of its open tag to the next matching close tag (naive,
// doesn't handle nesting) and stripping inner markup.
function quickText(text, innerStart, tag) {
  const closeRe = new RegExp(`</${tag}\\b`, 'i');
  const rest = text.slice(innerStart, innerStart + 400);
  const m = closeRe.exec(rest);
  const slice = m ? rest.slice(0, m.index) : rest;
  const stripped = slice.replace(/<[^>]+>/g, ' ').replace(/<[^>]*$/, '');
  return truncate(stripped, 60);
}

function isChromeId(id) {
  if (ID_EXCLUDE_EXACT.has(id)) return true;
  for (const p of ID_EXCLUDE_PREFIXES) if (id.startsWith(p)) return true;
  return false;
}

// Rule A — Active-panel scoping (Phase 7 Sub-step 8 follow-up).
//
// WPForms server-renders every builder panel into the same HTML
// document; only one panel carries `class="… active"` at a time
// (see plugin source: includes/admin/builder/panels/class-base.php
// `$classes[] = 'active'`). The static catalog generator can't tell
// active from inactive, so it emits selectors for every panel —
// flooding `builder-fields` with airtable / themes-preview /
// notifications-2 entries that belong to other surfaces.
//
// Rule A: when one or more `.wpforms-panel` containers exist,
// catalog only entries whose nearest `.wpforms-panel` ancestor is
// the active one. Entries OUTSIDE any panel (toolbar, top chrome,
// modals at body level, panel switch buttons) are unaffected.
//
// Failure-safe defaults:
//   - No `.wpforms-panel` element at all  → rule is a no-op.
//   - Panels exist but none is `active`   → rule is skipped, one
//     deterministic warning is emitted by the caller; existing
//     keep-all behavior preserved.
//
// No DOM parser added; uses the same stripped HTML text the main
// extractor walks, so byte offsets line up.
function findMatchingClose(text, fromIdx, tag) {
  const re = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = fromIdx;
  let depth = 1;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[0][1] === '/') {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else {
      depth++;
    }
  }
  return text.length;
}

function computeInactivePanelRanges(text) {
  const ranges = [];
  let panelCount = 0;
  let activeCount = 0;

  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(text)) !== null) {
    const attrStr = m[2];
    if (!attrStr || !/=/.test(attrStr)) continue;
    const attrs = parseAttrs(attrStr);
    if (!attrs.class) continue;
    const classes = attrs.class.split(/\s+/);
    if (!classes.includes('wpforms-panel')) continue;
    panelCount++;
    const isActive = classes.includes('active');
    if (isActive) { activeCount++; continue; }
    const start = m.index;
    const innerStart = m.index + m[0].length;
    const end = findMatchingClose(text, innerStart, m[1].toLowerCase());
    ranges.push([start, end]);
  }

  // Sort ranges by start offset for deterministic iteration.
  ranges.sort((a, b) => a[0] - b[0]);
  let scoping;
  if (panelCount === 0) scoping = 'no-panels';
  else if (activeCount > 0) scoping = 'has-active';
  else scoping = 'panels-no-active';

  return { ranges, scoping };
}

function isInsideAnyRange(idx, ranges) {
  // Linear scan — there are typically ≤ 5 panels per snapshot.
  for (const [s, e] of ranges) {
    if (idx >= s && idx < e) return true;
    if (idx < s) return false; // ranges are sorted
  }
  return false;
}

function extractEntries(html) {
  const text = stripNoise(html);
  const ids = new Map();
  const dataFieldIds = new Map();
  const dataFieldTypes = new Map();
  const dataPanels = new Map();
  const dataSections = new Map();
  // classData: c -> { count, tag, text }
  // tag/text are captured from the first in-scope occurrence so that
  // low-frequency text-bearing controls (e.g. `.wpforms-notifications-add`
  // → button "Add New Notification") become addressable in the catalog
  // instead of disappearing into a count-only row. Iteration order over
  // the static HTML is deterministic, so first-occurrence is stable.
  const classData = new Map();

  const { ranges: inactiveRanges, scoping } = computeInactivePanelRanges(text);
  // Only apply Rule A when at least one panel is active. The
  // `panels-no-active` failure-safe fallback must keep all entries
  // (including those inside non-active panels) so the snapshot is
  // not silently emptied when WPForms renders the builder in a
  // state we don't recognize. A single deterministic stderr warning
  // is emitted by the caller (emitFor).
  const skipInactive = scoping === 'has-active' && inactiveRanges.length > 0;

  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(text)) !== null) {
    const tag = m[1].toLowerCase();
    const attrStr = m[2];
    if (!attrStr || !/=/.test(attrStr)) continue;
    if (skipInactive && isInsideAnyRange(m.index, inactiveRanges)) continue;
    const attrs = parseAttrs(attrStr);
    const innerStart = m.index + m[0].length;

    const record = (map, key, selector) => {
      if (map.has(key)) { map.get(key).count++; return; }
      map.set(key, {
        key, selector, tag,
        text: quickText(text, innerStart, tag),
        count: 1,
      });
    };

    if (attrs.id && !isChromeId(attrs.id)) {
      record(ids, attrs.id, `#${attrs.id}`);
    }
    if (attrs['data-field-id']) {
      const v = attrs['data-field-id'];
      record(dataFieldIds, v, `[data-field-id="${v}"]`);
    }
    if (attrs['data-field-type']) {
      const v = attrs['data-field-type'];
      record(dataFieldTypes, v, `[data-field-type="${v}"]`);
    }
    if (attrs['data-panel']) {
      const v = attrs['data-panel'];
      record(dataPanels, v, `[data-panel="${v}"]`);
    }
    if (attrs['data-section']) {
      const v = attrs['data-section'];
      record(dataSections, v, `[data-section="${v}"]`);
    }
    // `name` attributes are deliberately omitted from the catalog —
    // chapter authoring targets IDs / data-attrs / role classes, and
    // WPForms field `name="fields[N][...]"` values flood the registry
    // without adding useful selector surface. If a future chapter
    // needs a `name=` selector we revisit here.

    if (attrs.class) {
      for (const c of attrs.class.split(/\s+/)) {
        if (!c) continue;
        if (!c.startsWith('wpforms-') && c !== 'choices' && !c.startsWith('choices__')) continue;
        const existing = classData.get(c);
        if (existing) {
          existing.count++;
        } else {
          classData.set(c, {
            count: 1,
            tag,
            text: quickText(text, innerStart, tag),
          });
        }
      }
    }
  }

  // Two filters in series:
  //   1. count ≤ CLASS_COUNT_CAP — drops layout/utility classes that
  //      apply to dozens of nodes (`.wpforms-panel-field`,
  //      `.wpforms-active`, etc.).
  //   2. role-pattern OR rich-row predicate — keeps the catalog narrow
  //      to interaction-shaped classes. A class qualifies if its name
  //      matches a CLASS_ROLE_PATTERNS suffix, OR if its first in-scope
  //      occurrence is on an interactive tag (button, a, input,
  //      textarea, select, li) carrying non-empty text. The second
  //      branch covers real visible action targets whose class name
  //      doesn't end with a canonical role suffix but which a planner
  //      legitimately needs (e.g. an `<a>` anchor or `<button>` whose
  //      class is feature-named rather than role-named).
  const CLASS_COUNT_CAP = 50;
  const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'textarea', 'select', 'li']);
  const classes = [];
  for (const [c, data] of classData.entries()) {
    if (data.count > CLASS_COUNT_CAP) continue;
    const matchesRole = classMatchesRolePattern(c);
    const interactiveWithText =
      INTERACTIVE_TAGS.has(data.tag) && !!(data.text && data.text.length);
    if (!matchesRole && !interactiveWithText) continue;
    classes.push({
      key: c,
      selector: `.${c}`,
      tag: data.tag,
      text: data.text,
      count: data.count,
    });
  }
  classes.sort((a, b) => a.key.localeCompare(b.key));

  return {
    ids: [...ids.values()].sort((a, b) => a.key.localeCompare(b.key)),
    dataFieldIds: [...dataFieldIds.values()].sort((a, b) => a.key.localeCompare(b.key)),
    dataFieldTypes: [...dataFieldTypes.values()].sort((a, b) => a.key.localeCompare(b.key)),
    dataPanels: [...dataPanels.values()].sort((a, b) => a.key.localeCompare(b.key)),
    dataSections: [...dataSections.values()].sort((a, b) => a.key.localeCompare(b.key)),
    classes,
    panelScoping: scoping,
  };
}

// Anchor IDs are derived from the selector so they are stable across
// reruns regardless of order of appearance in the source HTML. The
// validator cites these anchors via `src: catalog.md#<anchor>`.
function anchorFor(kind, key) {
  // WPForms IDs/classes/data values are already slug-safe; normalize
  // anyway so any pathological value stays a valid markdown anchor.
  const safe = key.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${kind}--${safe}`;
}

function section(title, kind, rows, headerCols, rowFn) {
  if (!rows.length) return '';
  let out = `## ${title}\n\n`;
  out += `_${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}_\n\n`;
  out += `| Anchor | ${headerCols.join(' | ')} |\n`;
  out += `| --- | ${headerCols.map(() => '---').join(' | ')} |\n`;
  for (const r of rows) {
    const anchor = anchorFor(kind, r.key);
    out += `| <a id="${anchor}"></a>\`${anchor}\` | ${rowFn(r).map(mdEscape).join(' | ')} |\n`;
  }
  out += '\n';
  return out;
}

function renderCatalog(slug, entries, sourceRel) {
  const total = entries.ids.length + entries.dataFieldIds.length
              + entries.dataFieldTypes.length + entries.dataPanels.length
              + entries.dataSections.length + entries.classes.length;

  let md = '';
  md += `# Catalog — \`${slug}\`\n\n`;
  md += `> Auto-generated. Do not edit by hand.\n`;
  md += `> Source: \`${sourceRel}\`\n`;
  md += `> Generator: \`tools/generate-snapshot-catalog.js\`\n`;
  md += `> ${total} selector entries across ${countNonEmpty(entries)} sections.\n\n`;
  md += `Provenance anchor form: \`snapshots/${slug}/catalog.md#<anchor>\`.\n`;
  md += `Anchors are derived from the selector value and are stable across reruns.\n\n`;
  md += `---\n\n`;

  md += section(
    'IDs', 'id', entries.ids,
    ['Selector', 'Tag', 'Text', 'Count'],
    r => [`\`${r.selector}\``, r.tag, r.text, r.count]
  );
  md += section(
    'data-field-id', 'data-field-id', entries.dataFieldIds,
    ['Selector', 'Tag', 'Text', 'Count'],
    r => [`\`${r.selector}\``, r.tag, r.text, r.count]
  );
  md += section(
    'data-field-type', 'data-field-type', entries.dataFieldTypes,
    ['Selector', 'Tag', 'Text', 'Count'],
    r => [`\`${r.selector}\``, r.tag, r.text, r.count]
  );
  md += section(
    'data-panel', 'data-panel', entries.dataPanels,
    ['Selector', 'Tag', 'Text', 'Count'],
    r => [`\`${r.selector}\``, r.tag, r.text, r.count]
  );
  md += section(
    'data-section', 'data-section', entries.dataSections,
    ['Selector', 'Tag', 'Text', 'Count'],
    r => [`\`${r.selector}\``, r.tag, r.text, r.count]
  );
  md += section(
    'Role-like classes', 'class', entries.classes,
    ['Selector', 'Tag', 'Text', 'Count'],
    r => [`\`${r.selector}\``, r.tag, r.text, r.count]
  );

  md += `---\n\n`;
  md += `## Notes\n\n`;
  md += `- This catalog lists *candidate* selectors extracted statically from the snapshot's \`index.html\`. Not every entry is a stable chapter target — authors still pick the selector that best matches intent.\n`;
  md += `- Role-like classes are filtered to (a) names matching a known interaction suffix (\`-button\`, \`-tab\`, \`-toggle\`, \`-add\`, …) OR (b) classes whose first in-scope occurrence is on an interactive tag (\`button\`, \`a\`, \`input\`, \`textarea\`, \`select\`, \`li\`) carrying non-empty text. \`Tag\` and \`Text\` columns are sourced from that first occurrence. The full WPForms class vocabulary is larger; run \`tools/inspect-snapshot.js\` for visibility-aware detail.\n`;
  md += `- Duplicate IDs in captured HTML (a known sanitization debt) surface here as \`Count > 1\` — prefer a more specific selector when this happens.\n`;

  return md;
}

function countNonEmpty(entries) {
  return ['ids','dataFieldIds','dataFieldTypes','dataPanels','dataSections','classes']
    .filter(k => entries[k].length).length;
}

function emitFor(slug) {
  const snapDir = path.join(SNAP_DIR, slug);
  const htmlPath = path.join(snapDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(`[skip] ${slug}: no index.html`);
    return { slug, ok: false };
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const entries = extractEntries(html);
  if (entries.panelScoping === 'panels-no-active') {
    console.error(`[scoping] ${slug}: .wpforms-panel elements present but none carries 'active'; rule A skipped (keep-all fallback)`);
  }
  const md = renderCatalog(slug, entries, `snapshots/${slug}/index.html`);
  const outPath = path.join(snapDir, 'catalog.md');
  fs.writeFileSync(outPath, md);
  const total = entries.ids.length + entries.dataFieldIds.length
              + entries.dataFieldTypes.length + entries.dataPanels.length
              + entries.dataSections.length + entries.classes.length;
  console.log(`[catalog] ${slug}  →  ${path.relative(ROOT, outPath)}  (${total} entries)`);
  return { slug, ok: true, total };
}

function resolveSlugs(flags, slugs) {
  if (flags.has('--all')) {
    return fs.readdirSync(SNAP_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'node_modules')
      .map(d => d.name)
      .sort();
  }
  if (flags.has('--consumer-surface')) {
    return CONSUMER_SURFACE.slice();
  }
  return slugs;
}

function refreshGlobalIndex() {
  const script = path.join(ROOT, 'capture', 'generate-catalog.js');
  if (!fs.existsSync(script)) return;
  try {
    execFileSync(process.execPath, [script], { stdio: 'inherit' });
  } catch (e) {
    console.warn('[warn] capture/generate-catalog.js failed:', e.message);
  }
}

(function main() {
  const { flags, slugs } = parseArgs(process.argv);
  const list = resolveSlugs(flags, slugs);
  if (!list.length) {
    console.error('Usage: node tools/generate-snapshot-catalog.js <slug> [<slug> ...]');
    console.error('       node tools/generate-snapshot-catalog.js --all');
    console.error('       node tools/generate-snapshot-catalog.js --consumer-surface');
    process.exit(1);
  }
  const results = list.map(emitFor);
  const ok = results.filter(r => r.ok).length;
  console.log(`\n[catalog] emitted ${ok}/${results.length} catalogs`);
  if (!flags.has('--no-index')) refreshGlobalIndex();
})();
