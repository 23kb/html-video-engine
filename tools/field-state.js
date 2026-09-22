#!/usr/bin/env node
// Query docs/wpforms-field-state-inventory.md without full-reading it in chat.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INVENTORY = path.join(ROOT, 'docs', 'wpforms-field-state-inventory.md');

const ALIASES = new Map([
  ['dropdown', 'Dropdown'],
  ['select', 'Dropdown'],
  ['multiple choice', 'Multiple Choice'],
  ['multiple-choice', 'Multiple Choice'],
  ['radio', 'Multiple Choice'],
  ['checkbox', 'Checkboxes'],
  ['checkboxes', 'Checkboxes'],
]);

function usage() {
  return [
    'Usage:',
    '  node tools/field-state.js --list',
    '  node tools/field-state.js --field dropdown',
    '  node tools/field-state.js --field dropdown --section advanced',
    '  node tools/field-state.js --field checkbox --summary',
    '  node tools/field-state.js --search "Generate Choices"',
    '  node tools/field-state.js --interactivity            # every registered transition + provenance',
    '  node tools/field-state.js --interactivity ranking    # filtered',
    '  node tools/field-state.js --interactivity --synthetic # only fabricated blocks (verify product UI!)',
    '  node tools/field-state.js --interactivity --stale 30  # blocks whose @since is older than N days',
  ].join('\n');
}

// Which field types actually have snapshot interactivity?
//
// Handlers are added reactively, per video, so the gap is normally discovered
// mid-build instead of at storyboard time — a beat gets promised, then the grep
// says there is nothing to drive it (rf 4: ranking had zero handlers and
// nothing flagged it). This lists what the shared registry really carries,
// read from the source, so the question is answerable while planning.
function printInteractivity(filter, opts = {}) {
  const { staleDays = null, syntheticOnly = false } = opts;
  const file = path.join(require('./lib/paths').snapshotsRoot(), '_shared', 'interactivity.js');
  if (!fs.existsSync(file)) {
    console.error(`Not found: ${file}`);
    process.exit(1);
  }
  const src = fs.readFileSync(file, 'utf8');
  // Parse banner spans + their provenance line (AP-17, 2026-09-02):
  //   // ─ Title ─────
  //   // @since YYYY-MM-DD|uncommitted @source synthetic|captured|mirrors:<f> @verified DATE [@product v]
  // Registry transition labels are kebab-case; the other `label:` strings in
  // that file are field-palette display names ("Single Line Text"), not handlers.
  const spans = [];
  let cur = { title: '(top matter)', labels: [] };
  spans.push(cur);
  for (const line of src.split(/\r?\n/)) {
    const b = line.match(/^\s*\/\/ ─ (.+?) ─+\s*$/);
    if (b) { cur = { title: b[1].trim(), labels: [] }; spans.push(cur); continue; }
    const meta = line.match(/^\s*\/\/ @since (\S+) @source (\S+) @verified (\S+)(?: @product (\S+))?/);
    if (meta) { cur.since = meta[1]; cur.source = meta[2]; cur.verified = meta[3]; cur.product = meta[4]; continue; }
    if (/fabricat/i.test(line) && !/label:/.test(line)) cur.sawFabricate = true;
    const m = line.match(/label:\s*'([^']+)'/);
    if (m && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(m[1]) && !cur.labels.includes(m[1])) cur.labels.push(m[1]);
  }
  const now = Date.now();
  const rows = [];
  const seen = new Set();
  for (const s of spans) {
    const syn = s.source === 'synthetic' || (!s.source && s.sawFabricate);
    for (const l of s.labels) {
      if (seen.has(l)) continue;
      seen.add(l);
      rows.push({
        label: l, syn,
        since: s.since || '—',
        verified: s.verified || '—',
        source: s.source || (s.sawFabricate ? 'synthetic (untagged)' : '—'),
      });
    }
  }
  let shown = rows;
  if (filter) shown = shown.filter(r => r.label.includes(filter.toLowerCase()));
  if (syntheticOnly) shown = shown.filter(r => r.syn);
  if (staleDays != null) {
    shown = shown.filter(r => {
      const d = Date.parse(r.since);
      return Number.isFinite(d) && (now - d) / 86400000 > staleDays;
    });
  }
  shown.sort((a, b) => a.label.localeCompare(b.label));
  const suffix = [filter && `matching "${filter}"`, syntheticOnly && 'SYNTHETIC only', staleDays != null && `@since older than ${staleDays}d`].filter(Boolean).join(', ');
  console.log(`# ${shown.length}${shown.length !== rows.length ? ` of ${rows.length}` : ''} registered transition(s) in snapshots/_shared/interactivity.js${suffix ? ` (${suffix})` : ''}`);
  const pad = Math.max(12, ...shown.map(r => r.label.length));
  for (const r of shown) {
    console.log(`  ${r.syn ? 'SYNTHETIC ' : '          '}${r.label.padEnd(pad)}  since=${r.since}  verified=${r.verified}  source=${r.source}`);
  }
  if (!shown.length) {
    console.log('  (none matching the filters)');
  }
  console.log('');
  console.log('A field type with no entry here has NO per-field handlers — a beat that');
  console.log('needs one is a build task, not a given. Universal handlers (label,');
  console.log('description, size, required, placeholder) apply to every field.');
  console.log('SYNTHETIC blocks fabricate UI with no captured template — verify the');
  console.log('product still ships that UI before storyboarding on one (ee 1: the PDF');
  console.log('block fabricates a retired UI).');
}

function argValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return null;
  return process.argv[idx + 1] || '';
}

function hasArg(name) {
  return process.argv.includes(name);
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseInventory() {
  if (!fs.existsSync(INVENTORY)) {
    throw new Error(`Missing inventory: ${path.relative(ROOT, INVENTORY)}`);
  }
  const text = fs.readFileSync(INVENTORY, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
    if (m) {
      if (current) current.endLine = i;
      const rawTitle = m[2].trim();
      const slugMatch = rawTitle.match(/`([^`]+)`/);
      const name = rawTitle
        .replace(/\s*\(`[^`]+`\)\s*$/, '')
        .replace(/\s+field$/i, '')
        .trim();
      current = {
        index: Number(m[1]),
        name,
        rawTitle,
        snapshot: slugMatch ? slugMatch[1] : null,
        startLine: i,
        endLine: lines.length,
      };
      sections.push(current);
    }
  }

  for (const section of sections) {
    section.text = lines.slice(section.startLine, section.endLine).join('\n').trimEnd();
    const base = section.text.match(/^Base snapshot:\s*`snapshots\/([^`/]+)\/?`/m);
    if (!section.snapshot && base) section.snapshot = base[1];
    section.aliases = buildAliases(section);
  }

  return { lines, sections };
}

function buildAliases(section) {
  const out = new Set();
  const name = normalize(section.name);
  const dashed = name.replace(/\s*\/\s*/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const noSlash = name.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
  out.add(name);
  out.add(dashed);
  out.add(dashed.replace(/-/g, ''));
  out.add(noSlash);
  out.add(noSlash.replace(/\s+/g, '-'));
  out.add(name.replace(/\s+field$/, ''));
  if (section.snapshot) out.add(normalize(section.snapshot));

  for (const [alias, canonical] of ALIASES) {
    if (canonical === section.name) out.add(alias);
  }
  return [...out].filter(Boolean).sort();
}

function findSection(sections, query) {
  const q = normalize(query);
  const canonical = ALIASES.get(q);
  const wanted = canonical ? normalize(canonical) : q;
  return sections.find(s => s.aliases.includes(wanted) || normalize(s.name) === wanted);
}

function subsection(section, query) {
  const q = normalize(query);
  const lines = section.text.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^###\s+(.+?)\s*$/);
    if (m && normalize(m[1]).includes(q)) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^###\s+/.test(lines[i]) || /^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trimEnd();
}

function summary(section) {
  const filmability = subsection(section, 'filmability summary');
  if (filmability) return filmability;

  const lines = section.text.split('\n');
  const out = [];
  for (const line of lines) {
    if (/^\s*```/.test(line)) break;
    if (out.length === 0 || line.trim()) out.push(line);
    if (out.length >= 14) break;
  }
  return out.join('\n').trimEnd();
}

function printList(sections) {
  for (const s of sections) {
    const snapshot = s.snapshot ? `snapshot: ${s.snapshot}` : 'snapshot: (not listed)';
    const aliases = s.aliases.filter(a => a !== normalize(s.name) && a !== normalize(s.snapshot || ''));
    console.log(`${s.index}. ${s.name} — ${snapshot}`);
    if (aliases.length) console.log(`   aliases: ${aliases.join(', ')}`);
  }
}

function printSearch(lines, sections, query) {
  const q = normalize(query);
  const maxMatches = 30;
  let count = 0;
  let current = null;
  const byStart = new Map(sections.map(s => [s.startLine, s]));

  for (let i = 0; i < lines.length; i++) {
    if (byStart.has(i)) current = byStart.get(i);
    if (!normalize(lines[i]).includes(q)) continue;
    count++;
    const label = current ? `${current.name}${current.snapshot ? ` (${current.snapshot})` : ''}` : 'Top matter';
    const start = Math.max(0, i - 1);
    const end = Math.min(lines.length, i + 2);
    console.log(`\n[${label}] line ${i + 1}`);
    for (let j = start; j < end; j++) {
      const mark = j === i ? '>' : ' ';
      console.log(`${mark} ${lines[j]}`);
    }
    if (count >= maxMatches) {
      console.log(`\n... truncated after ${maxMatches} matches. Use --field <name> or a narrower --search query for more context.`);
      break;
    }
  }

  if (!count) {
    const phrase = String(query).trim();
    console.log(`No exact inventory phrase match for "${phrase}".`);
    console.log('');
    console.log('This tool cannot prove that interaction from the field-state inventory text alone.');
    console.log('Use local product-truth sources next:');
    console.log('');
    console.log(`  node tools/list-snapshots.js --search "${phrase}"`);
    console.log(`  node tools/inspect-snapshot.js <snapshot> --emit-selectors --filter "${phrase}"`);
    console.log('  node tools/field-state.js --list');
    console.log('  node tools/field-state.js --field <name> --summary');
    console.log('');
    console.log('If the full phrase is too narrow, retry with a single distinctive token.');
    console.log('Do not infer product HTML from this search miss.');
  }
}

function main() {
  if (hasArg('--help') || process.argv.length <= 2) {
    console.log(usage());
    return;
  }

  if (hasArg('--interactivity')) {
    const raw = argValue('--interactivity') || '';
    const staleRaw = argValue('--stale');
    printInteractivity(raw.startsWith('--') ? '' : raw.toLowerCase(), {
      staleDays: staleRaw != null && staleRaw !== '' && !staleRaw.startsWith('--') ? Number(staleRaw) : null,
      syntheticOnly: hasArg('--synthetic'),
    });
    return;
  }

  const { lines, sections } = parseInventory();

  if (hasArg('--list')) {
    printList(sections);
    return;
  }

  const search = argValue('--search');
  if (search !== null) {
    if (!search) throw new Error('--search requires a query');
    printSearch(lines, sections, search);
    return;
  }

  const field = argValue('--field');
  if (field !== null) {
    if (!field) throw new Error('--field requires a field name, alias, or snapshot slug');
    const section = findSection(sections, field);
    if (!section) {
      console.error(`Unknown field: ${field}`);
      console.error('Run `node tools/field-state.js --list` for available fields.');
      process.exit(1);
    }

    const sectionName = argValue('--section');
    if (sectionName !== null) {
      if (!sectionName) throw new Error('--section requires a subheading name');
      const found = subsection(section, sectionName);
      if (!found) {
        console.error(`No subsection matching "${sectionName}" in ${section.name}.`);
        process.exit(1);
      }
      console.log(found);
      return;
    }

    console.log(hasArg('--summary') ? summary(section) : section.text);
    return;
  }

  console.error(usage());
  process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
