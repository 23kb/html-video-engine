#!/usr/bin/env node
// site-eval.js — stable wp-cli `eval` wrapper for the LocalWP test sites (FIX-9).
//
// The working wp-cli invocation is 4 long paths (bundled PHP, its php.ini,
// the phar, --path) that previously lived only in a memory note, with the
// phar one temp-clean away from gone. This wraps it:
//
//   node tools/site-eval.js "echo wpforms()->version;"
//   node tools/site-eval.js "echo 1+1;" --site sullies-bakery
//
// Paths come from tools/sites.json; the phar is vendored at
// tools/vendor/wp-cli.phar. Use `wp eval` semantics only — `wp db query`
// does not work on LocalWP/Windows (mysql child-path issue).
//
// LocalWP quirk: the php.ini lives under AppData/Roaming/Local/run/<run-id>/
// and the run-id changes across LocalWP restarts. When the configured path
// is gone, we glob the run dir for a replacement.
//
// Exit: wp-cli's own exit code · 2 config/toolchain problem · 3 usage.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PHAR = path.join(__dirname, 'vendor', 'wp-cli.phar');
const SITES = path.join(__dirname, 'sites.json');

function loadSite(name) {
  if (!fs.existsSync(SITES)) {
    console.error(`✗ tools/sites.json not found`);
    process.exit(2);
  }
  const reg = JSON.parse(fs.readFileSync(SITES, 'utf8'));
  const key = name || reg.default;
  const site = reg.sites[key];
  if (!site) {
    console.error(`✗ site "${key}" not in tools/sites.json (have: ${Object.keys(reg.sites).join(', ')})`);
    process.exit(2);
  }
  return { key, site };
}

function resolvePhpIni(site) {
  if (site.phpIni && fs.existsSync(site.phpIni)) return site.phpIni;
  // LocalWP rotated its run-id — find the current one.
  const runRoot = path.join(process.env.APPDATA || 'C:/Users/PC/AppData/Roaming', 'Local', 'run');
  try {
    for (const id of fs.readdirSync(runRoot)) {
      const cand = path.join(runRoot, id, 'conf', 'php', 'php.ini');
      if (fs.existsSync(cand)) {
        console.error(`  (php.ini moved — using ${cand}; update tools/sites.json)`);
        return cand;
      }
    }
  } catch (_) {}
  return null;
}

function siteEval(code, siteName) {
  const { key, site } = loadSite(siteName);
  if (!fs.existsSync(PHAR)) {
    console.error(`✗ vendored phar missing at tools/vendor/wp-cli.phar`);
    return { status: 2, out: '', err: 'phar missing' };
  }
  if (!fs.existsSync(site.php)) {
    console.error(`✗ bundled PHP not found: ${site.php} (LocalWP moved/updated? fix tools/sites.json)`);
    return { status: 2, out: '', err: 'php missing' };
  }
  if (!fs.existsSync(site.path)) {
    console.error(`✗ site path not found: ${site.path}`);
    return { status: 2, out: '', err: 'site path missing' };
  }
  const ini = resolvePhpIni(site);
  if (!ini) {
    console.error(`✗ no LocalWP php.ini found (is LocalWP installed/started?)`);
    return { status: 2, out: '', err: 'php.ini missing' };
  }
  const r = spawnSync(site.php, ['-c', ini, PHAR, `--path=${site.path}`, 'eval', code], {
    encoding: 'utf8', timeout: 60000, cwd: ROOT,
  });
  return { status: r.status === null ? 2 : r.status, out: r.stdout || '', err: r.stderr || '', siteKey: key };
}

module.exports = { siteEval, loadSite };

if (require.main === module) {
  const args = process.argv.slice(2);
  let siteName = null;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--site') siteName = args[++i];
    else rest.push(args[i]);
  }
  const code = rest[0];
  if (!code) {
    console.error('Usage: node tools/site-eval.js "<php code>" [--site <name>]');
    process.exit(3);
  }
  const r = siteEval(code, siteName);
  if (r.out) process.stdout.write(r.out);
  if (r.err) process.stderr.write(r.err);
  process.exit(r.status);
}
