#!/usr/bin/env node
// trim-snapshot-bloat.js — strip safely-removable bloat from a builder
// snapshot. Targets DOM that is structurally hidden in the builder's
// Field Options view: provider integration panels (Marketing tab),
// the WP link-insertion modal, the WPForms splash modal, HTML comments.
//
// SAFE for any video that stays in the Fields panel (incl. the smart-edit
// modal, which is a jconfirm overlay on top of the Fields view).
// NOT safe if the video navigates to Marketing / Settings / Providers tabs.
//
// Usage:
//   node tools/trim-snapshot-bloat.js <slug> [<slug2> ...]
//   node tools/trim-snapshot-bloat.js <slug> --dry-run
//   node tools/trim-snapshot-bloat.js <slug> --out <dir>
//
// Default: overwrites snapshots/<slug>/index.html in place.
// With --out <dir>: writes <dir>/<slug>/index.html instead.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const PROVIDERS = [
  'klaviyo', 'drip', 'salesforce', 'zoho-crm', 'hubspot', 'mailchimpv3',
  'zapier', 'stripe', 'n8n', 'convertkit', 'dropbox', 'google-sheets',
  'aweber', 'sendinblue', 'activecampaign', 'campaign-monitor', 'pipedrive',
  'airtable', 'square', 'authorize-net', 'google-drive', 'google-calendar',
  'slack', 'twilio', 'uncanny-automator', 'webhooks', 'notion',
  'constant-contact-v3', 'mailpoet', 'pdf',
];

function findBalancedDiv(html, startIdx) {
  let depth = 0;
  const tagRe = /<(\/?)div\b[^>]*>/g;
  tagRe.lastIndex = startIdx;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[1] === '') depth++; else depth--;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

function removeBlock(html, openTagRe) {
  let totalBytes = 0;
  let count = 0;
  let m;
  while ((m = openTagRe.exec(html))) {
    const end = findBalancedDiv(html, m.index);
    if (end < 0) break;
    totalBytes += end - m.index;
    html = html.slice(0, m.index) + html.slice(end);
    count++;
    openTagRe.lastIndex = m.index;
  }
  return { html, count, bytes: totalBytes };
}

function trim(html) {
  const stats = {};
  const before = html.length;

  let providerBytes = 0;
  let providerCount = 0;
  for (const p of PROVIDERS) {
    const re = new RegExp('<div[^>]+id="' + p.replace(/-/g, '\\-') + '-provider"[^>]*>', 'g');
    const r = removeBlock(html, re);
    html = r.html;
    providerBytes += r.bytes;
    providerCount += r.count;
  }
  stats.providerPanels = { count: providerCount, bytes: providerBytes };

  const splash = removeBlock(html, /<div[^>]+id="wpforms-splash-modal"[^>]*>/g);
  html = splash.html;
  stats.splashModal = { count: splash.count, bytes: splash.bytes };

  const wpLink = removeBlock(html, /<div[^>]+id="wp-link-wrap"[^>]*>/g);
  html = wpLink.html;
  stats.wpLinkModal = { count: wpLink.count, bytes: wpLink.bytes };

  let commentBytes = 0;
  let commentCount = 0;
  html = html.replace(/<!--(?!\[if )[\s\S]*?-->/g, (m) => {
    commentBytes += m.length;
    commentCount++;
    return '';
  });
  stats.comments = { count: commentCount, bytes: commentBytes };

  const after = html.length;
  stats.before = before;
  stats.after = after;
  stats.savedBytes = before - after;
  stats.savedPct = ((before - after) / before) * 100;

  return { html, stats };
}

function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }

function processSlug(slug, opts) {
  const inPath = path.join(REPO_ROOT, 'snapshots', slug, 'index.html');
  if (!fs.existsSync(inPath)) {
    console.error(`Skip ${slug}: not found at ${inPath}`);
    return;
  }
  const html = fs.readFileSync(inPath, 'utf8');
  const { html: out, stats } = trim(html);

  const outPath = opts.outRoot
    ? path.join(opts.outRoot, slug, 'index.html')
    : inPath;

  console.log(`${slug}`);
  console.log(`  providers : ${String(stats.providerPanels.count).padStart(3)} blocks, ${kb(stats.providerPanels.bytes)}`);
  console.log(`  splash    : ${String(stats.splashModal.count).padStart(3)} blocks, ${kb(stats.splashModal.bytes)}`);
  console.log(`  wp-link   : ${String(stats.wpLinkModal.count).padStart(3)} blocks, ${kb(stats.wpLinkModal.bytes)}`);
  console.log(`  comments  : ${String(stats.comments.count).padStart(3)} blocks, ${kb(stats.comments.bytes)}`);
  console.log(`  ${kb(stats.before)} -> ${kb(stats.after)} (saved ${kb(stats.savedBytes)}, ${stats.savedPct.toFixed(1)}%)`);

  if (opts.dryRun) {
    console.log('  (dry run, no write)');
    return;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out, 'utf8');
  console.log(`  wrote: ${path.relative(REPO_ROOT, outPath)}`);
}

function main() {
  const argv = process.argv.slice(2);
  const slugs = argv.filter((a) => !a.startsWith('--'));
  const dryRun = argv.includes('--dry-run');
  let outRoot = null;
  const outIdx = argv.indexOf('--out');
  if (outIdx >= 0) outRoot = path.resolve(argv[outIdx + 1]);

  if (slugs.length === 0) {
    console.error('Usage: node tools/trim-snapshot-bloat.js <slug> [<slug>...] [--dry-run] [--out <dir>]');
    process.exit(1);
  }
  for (const slug of slugs) processSlug(slug, { dryRun, outRoot });
}

main();
