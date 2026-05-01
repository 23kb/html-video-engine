// Offline repair for snapshots whose WP-admin core CSS bundle was dropped at
// capture time by the regex-vs-entity-encoded-href bug (I-011, fixed forward
// in capture/capture.js). Reads each snapshot's existing assets/, identifies
// the load-styles.php response by content signature, and writes a side-by-
// side `index.repaired.html` next to the canonical `index.html`. Never
// overwrites `index.html`.
//
// Validate the repaired file through the local HTTP server before any
// promotion. Recommended:
//   node serve.js                                           # http://localhost:4321
//   open http://localhost:4321/snapshots/<slug>/index.repaired.html
//
// Promotion (replacing index.html with the repaired copy) is a separate,
// human-driven step and intentionally NOT automated by this tool.
//
// Usage:
//   node tools/replay-inline-css.js <slug>
//   node tools/replay-inline-css.js --all
//   node tools/replay-inline-css.js --list   # report top bundle candidate per slug, no writes
//
// Boundaries: no recapture, no catalog/audit regeneration, no edits to
// engine/runtime/scenes/state-map. No emit/TTS/render. Phase 7 / Sub-step 9
// remain open. Companion: docs/i-011-repair-plan.md.

const fs   = require('fs');
const path = require('path');

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node tools/replay-inline-css.js <slug|--all|--list>');
  process.exit(1);
}

function listSlugs() {
  return fs.readdirSync(SNAPSHOTS_DIR)
    .filter(n => {
      const p = path.join(SNAPSHOTS_DIR, n);
      return fs.statSync(p).isDirectory()
        && fs.existsSync(path.join(p, 'index.html'));
    });
}

// Score an asset file as a candidate for the WP-admin core CSS bundle.
// The bundle WordPress emits via `wp-admin/load-styles.php?...&load=
// dashicons,admin-bar,common,forms,admin-menu,dashboard,list-tables,...`
// has a stable content signature: an auto-generated comment, a dashicons
// @font-face block at the top, and admin-chrome class rules throughout.
// Higher score = more confidence it's the bundle.
function scoreCssAsset(text) {
  if (text.length < 50_000) return 0; // individual stylesheets are smaller
  let score = 0;
  const head = text.slice(0, 5000);
  if (/@font-face\s*\{[^}]*font-family\s*:\s*["']?dashicons/i.test(head)) score += 5;
  if (/This file is auto-generated/i.test(head)) score += 1;
  if (/#adminmenu\b/.test(text))       score += 3;
  if (/#wpwrap\b/.test(text))          score += 2;
  if (/#wpcontent\b/.test(text))       score += 2;
  if (/\.wp-core-ui\b/.test(text))     score += 2;
  if (/\.wp-list-table\b/.test(text))  score += 2;
  if (/\.notice-(?:success|error|warning|info)\b/.test(text)) score += 1;
  return score;
}

function findCoreBundles(assetsDir) {
  if (!fs.existsSync(assetsDir)) return [];
  const candidates = [];
  for (const name of fs.readdirSync(assetsDir)) {
    if (!/\.(css|php)$/i.test(name)) continue;
    const filePath = path.join(assetsDir, name);
    let stat;
    try { stat = fs.statSync(filePath); } catch { continue; }
    if (!stat.isFile() || stat.size < 50_000) continue;
    let text;
    try { text = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
    const score = scoreCssAsset(text);
    if (score >= 5) candidates.push({ name, size: stat.size, score, text });
  }
  // Highest score first; tiebreak by largest file (most complete bundle).
  candidates.sort((a, b) => b.score - a.score || b.size - a.size);
  return candidates;
}

function alreadyRecovered(html) {
  return /data-origin=["']recovered:wp-admin\/load-styles\.php["']/.test(html);
}

function injectAfterPrintShim(html, css) {
  const escaped = css.replace(/<\/style>/gi, '<\\/style>');
  const block = `<style data-origin="recovered:wp-admin/load-styles.php">\n${escaped}\n</style>`;
  // Preferred anchor: WP's own print-only inline <style> with the
  // sourceURL=css-inline-concat-... marker (always present in admin pages).
  const m = html.match(/<style>[\s\S]*?sourceURL=css-inline-concat[\s\S]*?<\/style>/i);
  if (m) {
    return html.replace(m[0], m[0] + '\n' + block);
  }
  // Fallback: right after the snapshot-base-font shim, if present.
  const baseFont = html.match(/<style data-snapshot-base-font[^>]*>[\s\S]*?<\/style>/i);
  if (baseFont) {
    return html.replace(baseFont[0], baseFont[0] + '\n' + block);
  }
  // Last resort: directly after <head>.
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, h => h + '\n' + block);
  }
  return block + '\n' + html;
}

function repairSlug(slug) {
  const snapDir   = path.join(SNAPSHOTS_DIR, slug);
  const indexPath = path.join(snapDir, 'index.html');
  const outPath   = path.join(snapDir, 'index.repaired.html');
  const assetsDir = path.join(snapDir, 'assets');

  if (!fs.existsSync(indexPath)) {
    console.log(`  ${slug}: skip — no index.html`);
    return { slug, status: 'skip-no-index' };
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  if (alreadyRecovered(html)) {
    console.log(`  ${slug}: skip — index.html already contains a recovered bundle`);
    return { slug, status: 'skip-already-recovered' };
  }

  const candidates = findCoreBundles(assetsDir);
  if (candidates.length === 0) {
    console.log(`  ${slug}: no core CSS bundle found in assets/ — recapture may be required`);
    return { slug, status: 'no-bundle' };
  }

  const top = candidates[0];
  const repaired = injectAfterPrintShim(html, top.text);
  fs.writeFileSync(outPath, repaired);

  const others = candidates
    .slice(1, 4)
    .map(c => `${c.name}(${c.size}b,score=${c.score})`)
    .join(', ');
  const tail = others ? ` — also matched: ${others}` : '';
  console.log(`  ${slug}: wrote index.repaired.html — injected ${top.name} (${top.size}b, score=${top.score})${tail}`);
  return { slug, status: 'ok', injected: top.name, size: top.size, score: top.score };
}

function main() {
  if (arg === '--list') {
    for (const slug of listSlugs()) {
      const assetsDir = path.join(SNAPSHOTS_DIR, slug, 'assets');
      const c = findCoreBundles(assetsDir);
      const top = c[0];
      console.log(top
        ? `${slug}: ${top.name} (${top.size}b, score=${top.score})`
        : `${slug}: no bundle`);
    }
    return;
  }

  const slugs = arg === '--all' ? listSlugs() : [arg];
  for (const slug of slugs) {
    repairSlug(slug);
  }
}

main();
