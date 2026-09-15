#!/usr/bin/env node
/**
 * video-guard.js — PreToolUse hook for the WPForms video repo.
 *
 * Purpose: hard-gate the recurring authoring mistakes catalogued in
 * `videos/wpforms-ai-smart-edit-notes/implementation-notes.html`. Those
 * mistakes were written as prose rules in CLAUDE.md and ignored anyway — the
 * notes' own conclusion was "this only works if it's hard-gated in the harness."
 * This is that hard gate.
 *
 * Wired in `.claude/settings.json` as a PreToolUse hook on Edit|Write|Read.
 *
 * Two behaviours:
 *   1. BLOCK (deny) — Edit/Write to a video file that introduces a motion
 *      anti-pattern (hand-mounted cursor, single-tween camera, infinite repeat).
 *      Escape per-line with `// OVERRIDE: <reason>` or `lint-allow: <rule>`.
 *   2. WARN (allow + additionalContext) — Read of a 1 MB snapshot index.html.
 *      Points at `inspect-snapshot.js --emit-selectors` so the agent stops
 *      burning context on the raw file.
 *
 * Contract: reads the PreToolUse JSON on stdin, prints a hookSpecificOutput
 * JSON decision on stdout, exits 0. Exit 2 is reserved for hook crashes.
 *
 * Self-test:
 *   echo '{"tool_name":"Write","tool_input":{"file_path":"videos/x/index.html","content":"tl.to(camera,{scale:2})"}}' | node tools/hooks/video-guard.js
 *   echo '{"tool_name":"Read","tool_input":{"file_path":"snapshots/builder-setup/index.html"}}' | node tools/hooks/video-guard.js
 *   # anti-pattern #3 (BLOCK): native <select> in an authored video file
 *   echo '{"tool_name":"Write","tool_input":{"file_path":"videos/x/index.html","content":"<select id=\"pick\"><option>A</option></select>"}}' | node tools/hooks/video-guard.js
 *   # anti-pattern #4 (WARN): parent-doc absolute overlay, no elementToStageCoords/contentDocument
 *   echo '{"tool_name":"Write","tool_input":{"file_path":"videos/x/index.html","content":"overlay.style.position=\"absolute\"; stage.appendChild(overlay)"}}' | node tools/hooks/video-guard.js
 *   # anti-pattern #6 (WARN): invented UI fragment with no SOURCE citation
 *   echo '{"tool_name":"Write","tool_input":{"file_path":"videos/x/index.html","content":"<div class=\"chip\">9 entries</div>"}}' | node tools/hooks/video-guard.js
 *   # OVERRIDE escape clears all three:
 *   echo '{"tool_name":"Write","tool_input":{"file_path":"videos/x/index.html","content":"<select> <!-- OVERRIDE: approved real-form replica -->"}}' | node tools/hooks/video-guard.js
 */

'use strict';

function allow() {
  // Silent allow — no output needed; absence of a deny is an allow.
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

function warn(context, reason = 'video-guard advisory') {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: reason,
        additionalContext: context,
      },
    })
  );
  process.exit(0);
}

// Normalize Windows backslashes + drive paths to forward-slash for matching.
function norm(p) {
  return String(p || '').replace(/\\/g, '/');
}

// Anti-pattern rules. Each: { id, re, msg }. `re` runs per-line.
// A line is exempt if it contains `OVERRIDE:` or `lint-allow`.
const RULES = [
  {
    id: 'hand-mounted-cursor',
    re: /gsap\.\w+\(\s*(?:cursor|cursorEl|this\.cursor)\b/,
    msg:
      'Hand-tweened cursor element detected (`gsap.to(cursor…)`). Anti-pattern #1. ' +
      'Use the `Cursor` class from videos/_shared/motion-primitives.js — `.glide(to,{via})`, `.click()`, `.hover()`. ' +
      'It exists exactly because hand-rolled cursor tweens go jerky.',
  },
  {
    id: 'hand-mounted-cursor-div',
    re: /<div[^>]*class=["'][^"']*\bcursor\b[^"']*["']/,
    msg:
      'Hand-mounted `<div class="cursor">` detected. Anti-pattern #1. ' +
      'Mount the cursor via `new Cursor(...)` from motion-primitives.js instead of a raw div.',
  },
  {
    id: 'single-tween-camera',
    re: /\.to\(\s*camera\b[^)]*\b(?:scale|x|y)\b/,
    msg:
      'Single-tween camera move detected (`tl.to(camera,{x,y,scale})`). Anti-pattern #2 — slide-projector failure mode. ' +
      'Use `cinematicFlight` / `figjamFlight` / `focusStationOverview` / `cameraToElement` from motion-primitives.js.',
  },
  {
    id: 'infinite-repeat',
    re: /\brepeat\s*:\s*-1\b/,
    msg:
      'Infinite `repeat: -1` detected. Breaks deterministic --seek render (INV-9). ' +
      'Use `boundedRepeats(cycle, visibleWindow)` from motion-primitives.js for a finite loop.',
  },
  {
    id: 'native-select-dropdown',
    re: /<select[\s>]/i,
    msg:
      'Native `<select>` detected in a video file. Anti-pattern #3 — JS cannot open a native select, ' +
      'so the dropdown can never animate on screen. Use the faux-overlay pattern: `selectFromDropdown` ' +
      'in videos/_shared/wpforms-interactions.js.',
  },
];

// Content-level heuristics — judged across the whole new content, not per
// line, because the signal spans lines (a mount + a style + a missing import).
// These WARN (allow + additionalContext) instead of blocking: both have a
// legitimate look-alike, so a hard deny would false-positive. A content-wide
// `OVERRIDE:` skips them.
const CONTENT_RULES = [
  {
    id: 'iframe-sibling-overlay',
    test: (c) =>
      /\b(?:stage|stageEl|document\.body)\s*\.(?:appendChild|insertAdjacentHTML|append|prepend)\b/.test(c) &&
      /position\s*:\s*(?:absolute|fixed)|\.style\.position\s*=\s*["'](?:absolute|fixed)/.test(c) &&
      !/contentDocument|elementToStageCoords/.test(c),
    msg:
      'Possible overlay mounted as an iframe SIBLING (parent-doc append + absolute positioning, with no ' +
      '`elementToStageCoords` or `contentDocument` in this edit). Anti-pattern #4 — inject into the iframe ' +
      'DOM directly, OR mount in the parent doc positioned via `elementToStageCoords`. If this mount is ' +
      'deliberate and correctly positioned, add `// OVERRIDE: <reason>`.',
  },
  {
    id: 'invented-ui-fragment',
    test: (c) =>
      /class=["'][^"']*\b(?:chip|result-card|payoff)\b/.test(c) &&
      !/SOURCE:\s*snapshots\//.test(c),
    msg:
      'Inline UI fragment (`chip` / `result-card` / `payoff`) with no `// SOURCE: snapshots/<name>/...` ' +
      'citation in this edit. Anti-pattern #6 / INV-15 — every invented UI fragment needs a snapshot ' +
      'citation or an explicit `// OVERRIDE: <user approval>` annotation.',
  },
  {
    id: 'hand-rolled-drag',
    test: (c) =>
      /\bcursor\.drag\(/.test(c) &&
      /wpforms-add-fields-button|data-field-type|\.wpforms-field\b|wpforms-field-wrap/.test(c) &&
      !/dragFieldToForm/.test(c),
    msg:
      'Hand-rolled `cursor.drag(` aimed at a builder field (AP-11). ' +
      '`dragFieldToForm(slug, { camera: \'follow\' })` in videos/_shared/wpforms-interactions.js already does the ' +
      'full ghost-carry + FLIP-reveal drop, and `camera: \'follow\'` keeps the camera on the carried subject ' +
      '(rulebook §4: never pre-frame the destination — sfc 6 / lf shipped exactly that). If this drag is ' +
      'genuinely non-palette (column reorder etc.), add `// OVERRIDE: <reason>`.',
  },
];

// Paths under videos/ that are libraries/harnesses, not authored videos — skip.
const SKIP_DIRS = ['/videos/_shared/', '/videos/_qc-', '/videos/_examples/', '/tools/hooks/'];

function isAuthoredVideoFile(path) {
  // (?:^|\/) — match both absolute harness paths and relative self-test paths.
  if (!/(?:^|\/)videos\/[^/]+\//.test(path)) return false;
  if (SKIP_DIRS.some((d) => ('/' + path).includes(d))) return false;
  return /\.(html|js)$/.test(path);
}

function isSnapshotIndex(path) {
  return /(?:^|\/)snapshots\/[^/]+\/index\.html$/.test(path) && !path.includes('_shared/');
}

// Comment-aware scan (fix-round B4, mp I): the select rule fired on the WORD
// inside comments/prose. RULES/CONTENT_RULES run against a copy with
// `<!-- … -->` blocks and full-line `//` comments blanked out — but the
// OVERRIDE/lint-allow escapes are checked on the ORIGINAL lines, so a
// same-line `<!-- OVERRIDE: … -->` escape still works (header self-test 4).
// Blanking (not deleting) preserves line indices for the per-line escape map.
// Trailing `//` and `/* … */` are blanked too (rf-election 7). The full-line
// case alone was not enough: the anti-pattern NAMES are exactly what authors
// type in comments, so `// no repeat:-1 here` next to the code it describes
// blocked a Write and cost a full re-send of a ~700-line file. `//` preceded
// by `:` is left alone so a URL in a string does not blank the rest of its
// line and hide a real violation behind it.
function commentBlanked(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

// Shared scanner for the stdin hook and the --file CLI. Returns
// { blocks: [rule…], warns: [rule…] } (deduped, in rule order).
function scanContent(content) {
  const origLines = content.split('\n');
  const scanLines = commentBlanked(content).split('\n');
  const hits = [];
  for (let i = 0; i < scanLines.length; i++) {
    if (/OVERRIDE:|lint-allow/.test(origLines[i] || '')) continue; // explicit escape
    for (const rule of RULES) {
      if (rule.re.test(scanLines[i])) hits.push(rule);
    }
  }
  const seen = new Set();
  const blocks = hits.filter((h) => !seen.has(h.id) && seen.add(h.id));
  let warns = [];
  if (!/OVERRIDE:/.test(content)) {
    warns = CONTENT_RULES.filter((r) => r.test(commentBlanked(content)));
  }
  return { blocks, warns };
}

function main() {
  let raw = '';
  try {
    raw = require('fs').readFileSync(0, 'utf-8');
  } catch {
    allow(); // no stdin → nothing to judge
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    allow(); // unparseable → don't block real work on a hook bug
  }

  const tool = input.tool_name;
  const ti = input.tool_input || {};
  const path = norm(ti.file_path);

  // --- WARN: reading a giant snapshot index.html ---
  if (tool === 'Read' && isSnapshotIndex(path)) {
    const slug = (path.match(/\/snapshots\/([^/]+)\//) || [])[1] || '<slug>';
    warn(
      `You are about to Read a full snapshot index.html (often ~1 MB). For selectors/structure, ` +
        `prefer: \`node tools/inspect-snapshot.js ${slug} --emit-selectors [--filter <text>]\` ` +
        `or \`node tools/verify-selectors.js ${slug} ...\` or \`node tools/field-state.js --field <name>\`. ` +
        `Only full-read if you genuinely need the raw markup.`,
      'snapshot raw-read nudge'
    );
  }

  // --- BLOCK: motion anti-patterns in authored video files ---
  if ((tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') && isAuthoredVideoFile(path)) {
    // Gather the new content across the possible field shapes.
    let content = '';
    if (typeof ti.content === 'string') content += ti.content + '\n';
    if (typeof ti.file_text === 'string') content += ti.file_text + '\n';
    if (typeof ti.new_string === 'string') content += ti.new_string + '\n';
    if (Array.isArray(ti.edits)) {
      for (const e of ti.edits) if (typeof e.new_string === 'string') content += e.new_string + '\n';
    }

    if (content.trim()) {
      const { blocks, warns } = scanContent(content);
      if (blocks.length) {
        const msgs = blocks.map((h, i) => `${i + 1}. [${h.id}] ${h.msg}`);
        deny(
          `Motion anti-pattern(s) in this edit to ${path}:\n\n${msgs.join('\n\n')}\n\n` +
            `Fix by using the primitive, or — if this is a deliberate, approved exception — add ` +
            `\`// OVERRIDE: <reason>\` (or \`lint-allow: <rule-id>\`) on the offending line and retry.`
        );
      }

      // Content-level WARN heuristics (anti-patterns #4, #6). A content-wide
      // OVERRIDE: skips them — the author already declared the exception.
      if (warns.length) {
        warn(
          `Heads-up on this edit to ${path}:\n\n` +
            warns.map((w, i) => `${i + 1}. [${w.id}] ${w.msg}`).join('\n\n')
        );
      }
    }
  }

  allow();
}

// --file <path> CLI (fix-round B4, ccs-A25): the stdin hook only sees
// Edit/Write TOOL calls — any file written by a script bypasses it (ccs 29).
// This entry scans a file on disk with the same rules. Exit 1 on blocks,
// 0 clean (warns print but don't fail). Not wired into `npm run lint`
// (rtk garbles composed npm scripts — standing note); invoke directly:
//   node tools/hooks/video-guard.js --file videos/<slug>/index.html
function fileMain(filePath) {
  const fs = require('fs');
  const p = norm(filePath);
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`video-guard --file: cannot read ${filePath}: ${e.message}`);
    process.exit(1);
  }
  if (!isAuthoredVideoFile(p)) {
    console.log(`video-guard: ${p} is not an authored video file (videos/<slug>/*.html|js) — nothing to scan.`);
    process.exit(0);
  }
  const { blocks, warns } = scanContent(content);
  for (const w of warns) console.log(`WARN  [${w.id}] ${w.msg}`);
  for (const b of blocks) console.log(`BLOCK [${b.id}] ${b.msg}`);
  if (blocks.length) {
    console.log(`\n✗ ${blocks.length} blocking anti-pattern(s) in ${p}`);
    process.exit(1);
  }
  console.log(`✓ ${p}: no blocking anti-patterns${warns.length ? ` (${warns.length} warn)` : ''}`);
  process.exit(0);
}

// Rules are also consumed by tools/validate-singlehtml.js (file-wide re-scan).
module.exports = { RULES, CONTENT_RULES, isAuthoredVideoFile, scanContent };

if (require.main === module) {
  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx !== -1 && process.argv[fileIdx + 1]) {
    fileMain(process.argv[fileIdx + 1]);
  } else {
    main();
  }
}
