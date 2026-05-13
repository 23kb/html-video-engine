#!/usr/bin/env node
/**
 * trim-builder-markup.js — strip dead-weight markup from builder snapshots.
 *
 * Strips applied (per slug type):
 *   - #wpforms-builder-help, #wpfooter   (all builder snapshots)
 *   - #wpforms-panel-setup children only  (only builder-settings-* that
 *     accidentally captured it: anti_spam, confirmation, general)
 *   - #wpforms-field-option-<id> for every field-id that is NOT the active
 *     field on canvas  (builder-field-options-* only)
 *
 * The "active field" rule: parse the canvas for `.wpforms-field.active`,
 * extract its data-field-id, keep only `#wpforms-field-option-<that-id>`.
 *
 * Usage:
 *   node tools/trim-builder-markup.js --slug <slug> [--dry-run]
 *   node tools/trim-builder-markup.js --all-builders [--dry-run]
 *
 * Element removal uses regex + depth tracking against the captured DOM.
 * Snapshots are static post-capture, so the structure is stable.
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');

// --- low-level DOM-ish helpers ---

/**
 * Find the end index of the matching closing tag for the <div> (or other tag)
 * that begins at openTagStart. Returns the index *after* the closing tag.
 */
function findMatchingClose(s, openTagStart, tagName = 'div') {
  // Step past the opening `<div ...>` first
  const openEnd = s.indexOf('>', openTagStart);
  if (openEnd < 0) return -1;
  // Self-closing? <div ... />
  if (s[openEnd - 1] === '/') return openEnd + 1;
  let depth = 1;
  let cursor = openEnd + 1;
  const reOpen = new RegExp(`<${tagName}\\b`, 'g');
  const reClose = new RegExp(`</${tagName}\\s*>`, 'g');
  while (depth > 0) {
    reOpen.lastIndex = cursor;
    reClose.lastIndex = cursor;
    const o = reOpen.exec(s);
    const c = reClose.exec(s);
    if (!c) return -1;
    if (o && o.index < c.index) {
      depth++;
      cursor = o.index + 1;
    } else {
      depth--;
      cursor = c.index + c[0].length;
      if (depth === 0) return cursor;
    }
  }
  return -1;
}

/** Remove the element matching `matchRe` (a regex that matches the OPENING tag). */
function removeElementByOpenTag(s, matchRe) {
  const m = matchRe.exec(s);
  if (!m) return { html: s, removed: 0 };
  const start = m.index;
  const end = findMatchingClose(s, start, m[0].match(/<(\w+)/)[1]);
  if (end < 0) return { html: s, removed: 0 };
  return { html: s.slice(0, start) + s.slice(end), removed: end - start };
}

/** Remove the CHILDREN of the element but keep its opening + closing tag. */
function emptyElementByOpenTag(s, matchRe) {
  const m = matchRe.exec(s);
  if (!m) return { html: s, removed: 0 };
  const start = m.index;
  const tagName = m[0].match(/<(\w+)/)[1];
  const openEnd = s.indexOf('>', start) + 1;
  const fullEnd = findMatchingClose(s, start, tagName);
  if (fullEnd < 0) return { html: s, removed: 0 };
  const closeTag = `</${tagName}>`;
  const innerEnd = fullEnd - closeTag.length;
  if (innerEnd <= openEnd) return { html: s, removed: 0 };
  const removed = innerEnd - openEnd;
  return { html: s.slice(0, openEnd) + s.slice(innerEnd), removed };
}

// --- active-field detection ---

function getActiveFieldId(html) {
  // Look for `<div class="wpforms-field ... active" ... data-field-id="N">`
  // or active appearing anywhere in the class list.
  const re = /<div[^>]*class="[^"]*\bwpforms-field\b[^"]*\bactive\b[^"]*"[^>]*\bdata-field-id="(\d+)"/g;
  const m = re.exec(html);
  if (m) return m[1];
  // Fallback ordering: data-field-id may appear before class
  const re2 = /<div[^>]*\bdata-field-id="(\d+)"[^>]*class="[^"]*\bwpforms-field\b[^"]*\bactive\b/g;
  const m2 = re2.exec(html);
  if (m2) return m2[1];
  return null;
}

function listFieldOptionPanels(html) {
  // Find all `<div id="wpforms-field-option-N"` openings
  const ids = [];
  const re = /<div[^>]*\bid="wpforms-field-option-(\d+)"/g;
  let m;
  while ((m = re.exec(html))) ids.push(m[1]);
  return ids;
}

function stripInactiveFieldOptionPanels(html, activeId) {
  const allIds = listFieldOptionPanels(html);
  let out = html;
  let removed = 0;
  let stripped = 0;
  let kept = 0;
  for (const id of allIds) {
    if (id === activeId) { kept++; continue; }
    const openRe = new RegExp(`<div[^>]*\\bid="wpforms-field-option-${id}"`, 'g');
    const r = removeElementByOpenTag(out, openRe);
    if (r.removed > 0) {
      out = r.html;
      removed += r.removed;
      stripped++;
    }
  }
  return { html: out, removed, stripped, kept };
}

// --- per-snapshot strip plan ---

function planForSlug(slug) {
  const plan = [];
  // universal: builder-help, wpfooter
  if (slug.startsWith('builder-')) {
    plan.push({ label: '#wpforms-builder-help', op: 'remove', match: /<div[^>]*\bid="wpforms-builder-help"/g });
    plan.push({ label: '#wpfooter', op: 'remove', match: /<div[^>]*\bid="wpfooter"/g });
  }
  // builder-settings-{anti_spam, confirmation, general} carry #wpforms-panel-setup accidentally
  if (
    slug === 'builder-settings-anti_spam' ||
    slug === 'builder-settings-confirmation' ||
    slug === 'builder-settings-general'
  ) {
    plan.push({ label: '#wpforms-panel-setup children', op: 'empty', match: /<div[^>]*\bid="wpforms-panel-setup"/g });
  }
  // builder-field-options-*: strip inactive option panels
  if (slug.startsWith('builder-field-options-')) {
    plan.push({ label: 'inactive #wpforms-field-option-<id>', op: 'strip-inactive-field-panels' });
  }
  return plan;
}

function trimSlug(slug, dryRun) {
  const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
  if (!fs.existsSync(file)) {
    console.error(`Snapshot not found: ${slug}`);
    return null;
  }
  let html = fs.readFileSync(file, 'utf8');
  const beforeBytes = Buffer.byteLength(html, 'utf8');
  const plan = planForSlug(slug);
  const log = [];

  for (const step of plan) {
    if (step.op === 'remove') {
      const r = removeElementByOpenTag(html, step.match);
      html = r.html;
      log.push({ label: step.label, removedKB: (r.removed / 1024).toFixed(1) });
    } else if (step.op === 'empty') {
      const r = emptyElementByOpenTag(html, step.match);
      html = r.html;
      log.push({ label: step.label, removedKB: (r.removed / 1024).toFixed(1) });
    } else if (step.op === 'strip-inactive-field-panels') {
      const activeId = getActiveFieldId(html);
      if (!activeId) {
        log.push({ label: step.label, note: 'no .wpforms-field.active found — SKIPPED' });
        continue;
      }
      const r = stripInactiveFieldOptionPanels(html, activeId);
      html = r.html;
      log.push({
        label: step.label,
        removedKB: (r.removed / 1024).toFixed(1),
        note: `kept #${activeId} (active), stripped ${r.stripped}`,
      });
    }
  }

  if (!dryRun) fs.writeFileSync(file, html, 'utf8');
  const afterBytes = Buffer.byteLength(html, 'utf8');
  return { slug, beforeBytes, afterBytes, log };
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const slugIdx = argv.indexOf('--slug');
  const slug = slugIdx >= 0 ? argv[slugIdx + 1] : null;
  const allBuilders = argv.includes('--all-builders');

  if (!slug && !allBuilders) {
    console.error('Usage: trim-builder-markup.js --slug <slug> | --all-builders  [--dry-run]');
    process.exit(1);
  }

  const slugs = slug
    ? [slug]
    : fs
        .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.startsWith('builder-'))
        .map((d) => d.name);

  let totalBefore = 0;
  let totalAfter = 0;
  for (const s of slugs) {
    const r = trimSlug(s, dryRun);
    if (!r) continue;
    totalBefore += r.beforeBytes;
    totalAfter += r.afterBytes;
    const d = ((r.beforeBytes - r.afterBytes) / 1024).toFixed(1);
    console.log(`${s}: ${(r.beforeBytes / 1024).toFixed(1)} KB → ${(r.afterBytes / 1024).toFixed(1)} KB (saved ${d} KB)`);
    for (const step of r.log) {
      const parts = [`  - ${step.label}`];
      if (step.removedKB !== undefined) parts.push(`removed ${step.removedKB} KB`);
      if (step.note) parts.push(step.note);
      console.log(parts.join(': '));
    }
  }
  console.log('');
  console.log(`Total: ${(totalBefore / 1024).toFixed(1)} KB → ${(totalAfter / 1024).toFixed(1)} KB (saved ${((totalBefore - totalAfter) / 1024).toFixed(1)} KB)`);
  if (dryRun) console.log('(dry run — no files written)');
}

main();
