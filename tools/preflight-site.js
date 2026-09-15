#!/usr/bin/env node
// preflight-site.js — go/no-go health table before any capture session (FIX-7).
//
// The FA run burned a capture round because the core WPForms plugin was
// silently DEACTIVATED (wp_die pages; MCP surfaced it as `t.map is not a
// function` / rest_no_route — useless for diagnosis). This checks the whole
// toolchain up front:
//
//   · vendored wp-cli phar present
//   · wp-cli boots against the site (bundled PHP + php.ini + --path)
//   · core wpforms plugin ACTIVE + version + license type
//   · active wpforms-* plugin list (with --addons a,b: each named addon gates)
//   · admin login works (HTTP probe of wp-login → expect redirect to wp-admin)
//   · [--tables] wpforms entries / analytics row counts (info)
//   · Voicebox TTS on :17493 — WARNS by default (capture sessions don't need
//     it); gates with --strict-tts
//
// Exit non-zero on any ✗ so capture scripts can gate on it.
//
// Usage:
//   node tools/preflight-site.js [--site sullies-bakery] [--addons wpforms-form-analytics]
//                                [--tables] [--strict-tts]

const fs = require('fs');
const http = require('http');
const path = require('path');
const { siteEval, loadSite } = require('./site-eval.js');

const PHAR = path.join(__dirname, 'vendor', 'wp-cli.phar');

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { site: null, addons: [], tables: false, strictTts: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--site') out.site = a[++i];
    else if (a[i] === '--addons') out.addons = a[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a[i] === '--tables') out.tables = true;
    else if (a[i] === '--strict-tts') out.strictTts = true;
  }
  return out;
}

function probe(url, { method = 'GET', body = null, timeout = 4000 } = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method,
      timeout,
      headers: body ? {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        // WP refuses the login POST outright without its test cookie.
        'Cookie': 'wordpress_test_cookie=WP%20Cookie%20check',
      } : {},
    }, (res) => { res.resume(); resolve({ status: res.statusCode, headers: res.headers }); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const t0 = Date.now();
  let bad = 0;
  const row = (okc, msg) => { console.log(`  ${okc ? '✓' : '✗'} ${msg}`); if (!okc) bad++; };
  const info = (msg) => console.log(`  · ${msg}`);
  const warn = (msg) => console.log(`  ⚠ ${msg}`);

  const { key, site } = loadSite(args.site); // exits 2 with actionable line on bogus site
  console.log(`Preflight — ${key} (${site.url})`);

  // 1. phar
  row(fs.existsSync(PHAR), `wp-cli phar vendored at tools/vendor/wp-cli.phar`);

  // 2+3+4. one eval: boot + core + license + active wpforms plugins
  const php = `
    $out = ['BOOT_OK'];
    if (function_exists('wpforms')) {
      $out[] = 'CORE_OK';
      $out[] = defined('WPFORMS_VERSION') ? WPFORMS_VERSION : '?';
      $out[] = function_exists('wpforms_get_license_type') ? (string) wpforms_get_license_type() : 'lite/unknown';
    } else { $out[] = 'CORE_INACTIVE'; $out[] = ''; $out[] = ''; }
    $act = array_values(array_filter((array) get_option('active_plugins'), function($p){ return strpos($p, 'wpforms') === 0; }));
    $out[] = implode(',', $act);
    echo implode('|', $out);`;
  const r = siteEval(php, args.site);
  const m = (r.out || '').match(/BOOT_OK\|[^\n]*/);
  // "unknown error" swallowed the only two things worth knowing: whether wp-cli
  // TIMED OUT (cold site / LocalWP stopped — rf 1: the 61.9s NO-GO was this, not
  // the imagick startup warning it was blamed on) and, if it spoke, what it said.
  // That warning is benign noise on this box, so it never reads as the cause.
  const why = r.timedOut
    ? `timed out after ${Math.round((r.timeoutMs || 60000) / 1000)}s — site cold or LocalWP stopped? start it, or raise WPF_SITE_EVAL_TIMEOUT`
    : ((r.err || '').split('\n').map(l => l.trim())
        .filter(l => l && !/^Warning: PHP Startup/.test(l)).pop()
       || `exit ${r.status}, no stderr`);
  row(r.status === 0 && Boolean(m), `wp-cli boots against ${site.path}${r.status !== 0 ? ` — ${why}` : ''}`);
  if (m) {
    const [, core, version, license, activeCsv] = m[0].split('|');
    if (core === 'CORE_OK') {
      row(true, `wpforms core ACTIVE — v${version}, license: ${license}`);
    } else {
      row(false, `wpforms core plugin INACTIVE — every wpforms admin page wp_dies until it's re-activated. Fix: node tools/site-eval.js "include_once ABSPATH.'wp-admin/includes/plugin.php'; activate_plugin('wpforms/wpforms.php');"`);
    }
    const active = activeCsv ? activeCsv.split(',') : [];
    info(`active wpforms plugins: ${active.length ? active.join(', ') : '(none)'}`);
    for (const addon of args.addons) {
      row(active.some((p) => p.startsWith(addon + '/') || p.includes('/' + addon + '.php') || p.startsWith(addon)), `addon active: ${addon}`);
    }
  }

  // 5. admin login probe (302 → wp-admin)
  {
    const body = `log=${encodeURIComponent(site.adminUser)}&pwd=${encodeURIComponent(site.adminPass)}&wp-submit=Log+In&testcookie=1`;
    const res = await probe(`${site.url}/wp-login.php`, { method: 'POST', body });
    const okLogin = Boolean(res && res.status === 302 && /wp-admin/.test(res.headers.location || ''));
    row(okLogin, `admin login (${site.adminUser}) → wp-admin redirect${res ? ` (got ${res.status}${res.headers && res.headers.location ? ' → ' + res.headers.location : ''})` : ' (site unreachable — is LocalWP running?)'}`);
  }

  // 6. table counts (opt-in)
  if (args.tables) {
    const tphp = `
      global $wpdb;
      $tables = $wpdb->get_col("SHOW TABLES LIKE '%wpforms%'");
      foreach ($tables as $t) { echo $t . '=' . (int) $wpdb->get_var("SELECT COUNT(*) FROM \`$t\`") . "\\n"; }`;
    const tr = siteEval(tphp, args.site);
    if (tr.status === 0) {
      for (const line of tr.out.split('\n').filter((l) => l.includes('='))) info(line.trim());
    } else {
      row(false, 'table counts query failed');
    }
  }

  // 7. Voicebox TTS
  {
    const res = await probe('http://127.0.0.1:17493/', { timeout: 2000 });
    const up = Boolean(res);
    if (args.strictTts) row(up, `Voicebox TTS listening on :17493${up ? '' : ' — start: Start-Process "shell:AppsFolder\\sh.voicebox.app" (~16s to listen)'}`);
    else if (up) info('Voicebox TTS listening on :17493');
    else warn('Voicebox TTS not running (:17493) — only needed for narration renders; start: Start-Process "shell:AppsFolder\\sh.voicebox.app"');
  }

  console.log(`\n${bad ? `✗ NO-GO — ${bad} check(s) failed` : '✓ GO'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
