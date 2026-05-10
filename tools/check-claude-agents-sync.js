#!/usr/bin/env node
// check-claude-agents-sync.js — Verify CLAUDE.md (read by Claude Code) and
// AGENTS.md (read by Codex) are byte-identical.
//
// Two parallel files are intentional: each agent reads its own filename. The
// content must stay synchronized so both agents follow the same rules. This
// tool fails fast when they drift.
//
// Usage:
//   node tools/check-claude-agents-sync.js          # exit 0 if synced, exit 1 if not
//   node tools/check-claude-agents-sync.js --fix    # copy CLAUDE.md → AGENTS.md
//
// Run before any commit that touches CLAUDE.md or AGENTS.md. Also part of QC
// gates per docs/editorial-direction-audit-2026-05-10.md Phase 6.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLAUDE = path.join(ROOT, 'CLAUDE.md');
const AGENTS = path.join(ROOT, 'AGENTS.md');

const fix = process.argv.includes('--fix');

function read(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error(`[error] cannot read ${p}: ${e.message}`);
    process.exit(2);
  }
}

const claudeText = read(CLAUDE);
const agentsText = read(AGENTS);

if (claudeText === agentsText) {
  console.log('[ok] CLAUDE.md and AGENTS.md are in sync');
  process.exit(0);
}

if (fix) {
  fs.writeFileSync(AGENTS, claudeText, 'utf8');
  console.log('[fixed] copied CLAUDE.md → AGENTS.md');
  process.exit(0);
}

// Drift detected — show a brief diff hint
const claudeLines = claudeText.split('\n');
const agentsLines = agentsText.split('\n');
const maxLines = Math.max(claudeLines.length, agentsLines.length);
let firstDiff = -1;
for (let i = 0; i < maxLines; i++) {
  if (claudeLines[i] !== agentsLines[i]) {
    firstDiff = i + 1;
    break;
  }
}

console.error('[drift] CLAUDE.md and AGENTS.md differ.');
console.error(`        CLAUDE.md: ${claudeLines.length} lines, ${claudeText.length} bytes`);
console.error(`        AGENTS.md: ${agentsLines.length} lines, ${agentsText.length} bytes`);
if (firstDiff > 0) {
  console.error(`        first diff at line ${firstDiff}:`);
  console.error(`          CLAUDE: ${(claudeLines[firstDiff - 1] || '<EOF>').slice(0, 120)}`);
  console.error(`          AGENTS: ${(agentsLines[firstDiff - 1] || '<EOF>').slice(0, 120)}`);
}
console.error('');
console.error('To synchronize: node tools/check-claude-agents-sync.js --fix');
console.error('(this copies CLAUDE.md → AGENTS.md; edit AGENTS.md only if Codex needs a divergent rule)');
process.exit(1);
