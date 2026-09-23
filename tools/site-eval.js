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
// A cold LocalWP site can take longer than a warm one to boot wp-cli. The
// timeout used to surface as a bare "unknown error" in preflight (rf 1 — the
// 61.9s NO-GO was this, not the imagick startup warning it was blamed on).
const TIMEOUT_MS = Number(process.env.WPF_SITE_EVAL_TIMEOUT || 60000);

function loadSite(name) {
  if (!fs.existsSync(SITES)) {
    console.error(`✗ tools/sites.json not found — copy tools/sites.example.json to tools/sites.json and fill in your LocalWP sites (the real file stays local, never committed)`);
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

// wp-cli boots with NO current user, so any WPForms write API that runs a
// capability check returns false and changes nothing — indistinguishable from
// "nothing needed writing" at the call site (rf 8). Pass { asAdmin: true } (CLI:
// --as-admin) to run as user 1. Still read the value back and assert on the
// READ, never on the return value: current_user_can() was measured false even
// where the write succeeded.
function siteEval(code, siteName, opts) {
  if (opts && opts.asAdmin) code = 'wp_set_current_user( 1 ); ' + code;
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
    encoding: 'utf8', timeout: TIMEOUT_MS, cwd: ROOT,
  });
  const timedOut = Boolean(r.error && (r.error.code === 'ETIMEDOUT' || r.signal));
  return {
    status: r.status === null ? 2 : r.status,
    out: r.stdout || '', err: r.stderr || '', siteKey: key,
    timedOut, timeoutMs: TIMEOUT_MS,
  };
}

module.exports = { siteEval, loadSite };

if (require.main === module) {
  const args = process.argv.slice(2);
  let siteName = null;
  let asAdmin = false;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--site') siteName = args[++i];
    else if (args[i] === '--as-admin') asAdmin = true;
    else rest.push(args[i]);
  }
  const code = rest[0];
  if (!code) {
    console.error('Usage: node tools/site-eval.js "<php code>" [--site <name>] [--as-admin]');
    process.exit(3);
  }
  const r = siteEval(code, siteName, { asAdmin });
  if (r.out) process.stdout.write(r.out);
  if (r.err) process.stderr.write(r.err);
  if (r.timedOut) {
    process.stderr.write(`
✗ wp-cli timed out after ${Math.round(r.timeoutMs / 1000)}s — the site is probably cold or LocalWP is stopped. Start it, or raise WPF_SITE_EVAL_TIMEOUT.
`);
  }
  process.exit(r.status);
}
