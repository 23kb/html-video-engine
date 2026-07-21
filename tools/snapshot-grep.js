#!/usr/bin/env node
// snapshot-grep — first-class content extraction from snapshot HTML (FIX-6,
// fa-retest 2026-07-13).
//
// Grep on ~1 MB single-line snapshot HTML keeps failing usefully: bounded-
// context matches come back "[Omitted long matching line]", HTML-entity
// patterns mangle, and sessions end up writing ad-hoc node extraction scripts
// (two in the fa-retest run alone, more in the 07-11 run). This tool IS that
// script, kept.
//
// Usage:
//   node tools/snapshot-grep.js <slug> <regex> [--around N] [--max M] [--strip] [--flags fl]
//
//   <slug>      snapshots/<slug>/index.html
//   <regex>     JS regular expression source (no delimiters)
//   --around N  chars of context on each side of the match (default 200)
//   --max M     max matches printed (default 5)
//   --strip     collapse tags + whitespace in the printed context (the
//               transform every scratch script re-implemented)
//   --flags fl  regex flags (default "g"; "i" is common)
//
// Exit codes: 0 = matches found, 1 = no match, 2 = usage/file error.

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const slug = positional[0];
const pattern = positional[1];

function flagValue(name, dflt) {
  const i = args.indexOf(name);
  if (i === -1) return dflt;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : dflt;
}
const around = Math.max(0, parseInt(flagValue('--around', '200'), 10) || 200);
const max = Math.max(1, parseInt(flagValue('--max', '5'), 10) || 5);
const strip = args.includes('--strip');
let flags = flagValue('--flags', 'g');
if (!flags.includes('g')) flags += 'g';

if (!slug || !pattern) {
  console.error('Usage: node tools/snapshot-grep.js <slug> <regex> [--around N] [--max M] [--strip] [--flags fl]');
  process.exit(2);
}

// WPF_SNAPSHOTS_DIR override exists for the self-test (fixture snapshots).
const snapRoot = process.env.WPF_SNAPSHOTS_DIR || path.join(__dirname, '..', 'snapshots');
const file = path.join(snapRoot, slug, 'index.html');
if (!fs.existsSync(file)) {
  console.error(`snapshot not found: ${file}`);
  process.exit(2);
}

let re;
try {
  re = new RegExp(pattern, flags);
} catch (e) {
  console.error(`bad regex: ${e.message}`);
  process.exit(2);
}

const html = fs.readFileSync(file, 'utf8');

function stripHtml(s) {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let m;
let shown = 0;
let total = 0;
while ((m = re.exec(html)) !== null) {
  total++;
  if (m[0].length === 0) re.lastIndex++; // zero-width guard
  if (shown >= max) continue;
  shown++;
  const start = Math.max(0, m.index - around);
  const end = Math.min(html.length, m.index + m[0].length + around);
  let ctx = html.slice(start, end);
  if (strip) ctx = stripHtml(ctx);
  else ctx = ctx.replace(/\s+/g, ' ');
  // hard cap per match so a giant --around can't flood the terminal
  if (ctx.length > 2000) ctx = ctx.slice(0, 2000) + '…';
  console.log(`── match ${shown} @ ${m.index} ──`);
  console.log(ctx);
}

if (total === 0) {
  console.error(`no match for /${pattern}/${flags} in ${slug}/index.html`);
  process.exit(1);
}
if (total > shown) console.log(`\n(${total} matches total, showing ${shown} — raise --max to see more)`);
process.exit(0);
