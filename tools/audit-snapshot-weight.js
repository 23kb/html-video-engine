#!/usr/bin/env node
/**
 * audit-snapshot-weight.js — per-snapshot weight breakdown
 *
 * Usage:
 *   node tools/audit-snapshot-weight.js <slug>              # one snapshot, full report
 *   node tools/audit-snapshot-weight.js --all               # summary table for all snapshots
 *   node tools/audit-snapshot-weight.js --pattern admin-*   # subset summary
 *   node tools/audit-snapshot-weight.js <slug> --json       # machine-readable
 *
 * Reports: total size, CSS/SVG/data-URI/comment weight, element counts,
 * hidden DOM, dedup candidates (CSS hashes shared with other snapshots),
 * tab/panel structure (basic/advanced groups for field-options).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

function pct(part, whole) {
  return whole ? ((part / whole) * 100).toFixed(1) : '0.0';
}

function readHtml(slug) {
  const file = path.join(SNAPSHOTS_DIR, slug, 'index.html');
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function listSnapshots() {
  return fs
    .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(SNAPSHOTS_DIR, n, 'index.html')))
    .sort();
}

function analyze(html) {
  const totalBytes = Buffer.byteLength(html, 'utf8');

  // <style> blocks
  const styleBlocks = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(html))) {
    const body = m[1];
    styleBlocks.push({
      bytes: Buffer.byteLength(body, 'utf8'),
      hash: md5(body),
      tagAttrs: m[0].slice(0, m[0].indexOf('>') + 1),
    });
  }
  const styleBytes = styleBlocks.reduce((a, b) => a + b.bytes, 0);

  // inline <svg> — count outermost only
  const svgBlocks = [];
  const svgRe = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
  while ((m = svgRe.exec(html))) {
    svgBlocks.push({ bytes: Buffer.byteLength(m[0], 'utf8') });
  }
  const svgBytes = svgBlocks.reduce((a, b) => a + b.bytes, 0);

  // data: URIs (rough — match through next quote or paren)
  const dataUriRe = /data:[a-zA-Z0-9+./;-]+(?:;base64)?,[^"')\s]+/g;
  const dataUris = html.match(dataUriRe) || [];
  const dataUriBytes = dataUris.reduce((a, s) => a + Buffer.byteLength(s, 'utf8'), 0);

  // HTML comments
  const commentRe = /<!--[\s\S]*?-->/g;
  const comments = html.match(commentRe) || [];
  const commentBytes = comments.reduce((a, s) => a + Buffer.byteLength(s, 'utf8'), 0);

  // element count (open tags)
  const elementCount = (html.match(/<[a-zA-Z][a-zA-Z0-9-]*\b/g) || []).length;

  // hidden DOM
  const inlineHidden = (html.match(/style="[^"]*display:\s*none[^"]*"/gi) || []).length;
  const hiddenAttr = (html.match(/\bhidden(?:="[^"]*")?(?=[\s>])/g) || []).length;
  const ariaHidden = (html.match(/aria-hidden="true"/g) || []).length;

  // wpforms-specific structural markers
  const basicGroups = (html.match(/wpforms-field-option-group-basic\b/g) || []).length;
  const advancedGroups = (html.match(/wpforms-field-option-group-advanced\b/g) || []).length;
  const smartLogicGroups = (html.match(/wpforms-field-option-group-smart-logic\b/g) || []).length;
  const panelRefs = (html.match(/wpforms-panel-/g) || []).length;
  const choicesItems = (html.match(/choices__item\b/g) || []).length;
  const optionTags = (html.match(/<option\b/g) || []).length;
  const tabToggles = (html.match(/wpforms-field-option-group-toggle\b/g) || []).length;

  // overhead — bytes not in styles/svg/data/comments
  const tracked = styleBytes + svgBytes + dataUriBytes + commentBytes;
  const markupBytes = totalBytes - tracked;

  return {
    totalBytes,
    styleBlocks: styleBlocks.length,
    styleBytes,
    styleHashes: styleBlocks.map((b) => b.hash),
    styleBlocksDetail: styleBlocks,
    svgBlocks: svgBlocks.length,
    svgBytes,
    dataUriCount: dataUris.length,
    dataUriBytes,
    commentCount: comments.length,
    commentBytes,
    markupBytes,
    elementCount,
    inlineHidden,
    hiddenAttr,
    ariaHidden,
    basicGroups,
    advancedGroups,
    smartLogicGroups,
    panelRefs,
    choicesItems,
    optionTags,
    tabToggles,
  };
}

function buildCssHashIndex(slugs) {
  // hash -> [{slug, bytes}]
  const index = new Map();
  for (const slug of slugs) {
    const html = readHtml(slug);
    if (!html) continue;
    const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = styleRe.exec(html))) {
      const h = md5(m[1]);
      const bytes = Buffer.byteLength(m[1], 'utf8');
      if (!index.has(h)) index.set(h, { bytes, slugs: new Set() });
      index.get(h).slugs.add(slug);
    }
  }
  return index;
}

function formatReport(slug, data, cssIndex) {
  const lines = [];
  lines.push(`# Snapshot weight audit: ${slug}`);
  lines.push('');
  lines.push(`Total: ${kb(data.totalBytes)} KB`);
  lines.push('');
  lines.push('## Weight by category');
  lines.push('');
  lines.push(`| Category              | Bytes (KB) | % of total | Count |`);
  lines.push(`| --------------------- | ---------- | ---------- | ----- |`);
  lines.push(`| inline <style>        | ${kb(data.styleBytes).padStart(10)} | ${pct(data.styleBytes, data.totalBytes).padStart(8)}% | ${String(data.styleBlocks).padStart(5)} |`);
  lines.push(`| HTML markup           | ${kb(data.markupBytes).padStart(10)} | ${pct(data.markupBytes, data.totalBytes).padStart(8)}% | ${String(data.elementCount).padStart(5)} |`);
  lines.push(`| inline <svg>          | ${kb(data.svgBytes).padStart(10)} | ${pct(data.svgBytes, data.totalBytes).padStart(8)}% | ${String(data.svgBlocks).padStart(5)} |`);
  lines.push(`| data: URIs            | ${kb(data.dataUriBytes).padStart(10)} | ${pct(data.dataUriBytes, data.totalBytes).padStart(8)}% | ${String(data.dataUriCount).padStart(5)} |`);
  lines.push(`| HTML comments         | ${kb(data.commentBytes).padStart(10)} | ${pct(data.commentBytes, data.totalBytes).padStart(8)}% | ${String(data.commentCount).padStart(5)} |`);
  lines.push('');
  lines.push('## DOM structure');
  lines.push('');
  lines.push(`- Elements:               ${data.elementCount}`);
  lines.push(`- inline display:none:    ${data.inlineHidden}`);
  lines.push(`- hidden attr:            ${data.hiddenAttr}`);
  lines.push(`- aria-hidden="true":     ${data.ariaHidden}`);
  lines.push(`- wpforms-panel- refs:    ${data.panelRefs}`);
  lines.push(`- <option> tags:          ${data.optionTags}`);
  lines.push(`- choices__item:          ${data.choicesItems}`);
  lines.push('');

  if (data.basicGroups || data.advancedGroups || data.tabToggles) {
    lines.push('## Field-option tab structure');
    lines.push('');
    lines.push(`- wpforms-field-option-group-basic:       ${data.basicGroups}`);
    lines.push(`- wpforms-field-option-group-advanced:    ${data.advancedGroups}`);
    lines.push(`- wpforms-field-option-group-smart-logic: ${data.smartLogicGroups}`);
    lines.push(`- tab toggle anchors:                     ${data.tabToggles}`);
    lines.push('');
  }

  if (cssIndex) {
    lines.push('## CSS dedup candidates');
    lines.push('');
    lines.push('CSS blocks in this snapshot that are byte-identical in OTHER snapshots:');
    lines.push('');
    lines.push('| Hash         | KB    | Shared with N other snapshots |');
    lines.push('| ------------ | ----- | ----------------------------- |');
    let sharedBytes = 0;
    for (const hash of data.styleHashes) {
      const entry = cssIndex.get(hash);
      const otherCount = entry.slugs.size - 1;
      if (otherCount > 0) {
        sharedBytes += entry.bytes;
        lines.push(`| ${hash} | ${kb(entry.bytes).padStart(5)} | ${otherCount} |`);
      }
    }
    lines.push('');
    lines.push(`Total CSS bytes shareable via dedup: ${kb(sharedBytes)} KB (${pct(sharedBytes, data.totalBytes)}% of file)`);
    lines.push('');
  }

  return lines.join('\n');
}

function formatSummaryTable(rows) {
  const lines = [];
  lines.push('| Slug | Total KB | CSS KB | Markup KB | Elements | Hidden | Field groups (B/A/SL) |');
  lines.push('| ---- | -------- | ------ | --------- | -------- | ------ | --------------------- |');
  for (const r of rows) {
    const fg = `${r.basicGroups}/${r.advancedGroups}/${r.smartLogicGroups}`;
    lines.push(
      `| ${r.slug} | ${kb(r.totalBytes)} | ${kb(r.styleBytes)} | ${kb(r.markupBytes)} | ${r.elementCount} | ${r.inlineHidden + r.hiddenAttr} | ${fg} |`,
    );
  }
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const wantJson = argv.includes('--json');
  const all = argv.includes('--all');
  const patternIdx = argv.indexOf('--pattern');
  const pattern = patternIdx >= 0 ? argv[patternIdx + 1] : null;
  const slug = argv.find((a) => !a.startsWith('--') && a !== pattern);

  if (all || pattern) {
    let slugs = listSnapshots();
    if (pattern) {
      const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      slugs = slugs.filter((s) => re.test(s));
    }
    const rows = slugs
      .map((s) => {
        const html = readHtml(s);
        if (!html) return null;
        return { slug: s, ...analyze(html) };
      })
      .filter(Boolean)
      .sort((a, b) => b.totalBytes - a.totalBytes);

    if (wantJson) {
      console.log(JSON.stringify(rows, null, 2));
    } else {
      console.log(formatSummaryTable(rows));
      const total = rows.reduce((a, r) => a + r.totalBytes, 0);
      const totalCss = rows.reduce((a, r) => a + r.styleBytes, 0);
      console.log('');
      console.log(`Snapshots: ${rows.length}`);
      console.log(`Combined total: ${kb(total)} KB (${(total / 1024 / 1024).toFixed(1)} MB)`);
      console.log(`Combined CSS:   ${kb(totalCss)} KB (${pct(totalCss, total)}% of total)`);
    }
    return;
  }

  if (!slug) {
    console.error('Usage: audit-snapshot-weight.js <slug> | --all | --pattern <glob>');
    process.exit(1);
  }

  const html = readHtml(slug);
  if (!html) {
    console.error(`Snapshot not found: ${slug}`);
    process.exit(1);
  }

  const data = analyze(html);

  // build dedup index across all snapshots so we can flag shared CSS
  const cssIndex = buildCssHashIndex(listSnapshots());

  if (wantJson) {
    console.log(JSON.stringify({ slug, ...data }, null, 2));
  } else {
    console.log(formatReport(slug, data, cssIndex));
  }
}

main();
