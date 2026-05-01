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
  ].join('\n');
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
