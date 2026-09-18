#!/usr/bin/env node
// states.mjs — capture a UI state that only exists after interaction (an open menu,
// a popover, a dialog) as a portable fragment: <root>/<slug>/states/<name>.json.
//
// Usage:
//   node scripts/states.mjs <url> --slug <slug> --name <state-name> --target <css selector>
//        [--root <dir>] [--steps <plan.json>] [--login <plan.json>] [--viewport 1440x900]
//        [--note "..."] [--keep-remote]
//
// Plans: --login is { "url": "...", "steps": [...], "success_url": "<regex>" } and runs first;
// --steps is the shared step vocabulary of steps.mjs (goto, click, hover, type, fill, press, select,
// check, uncheck, setFile, scroll, eval, wait, waitFor, waitUrl; per-step "settle" ms), as an array
// or {"steps":[...]}. Every string passes through resolveEnv: credentials are "${ENV:NAME}", never literal.
//
// The serializer is scripts/state-snippet.js, evaluated in the page, so the headless
// path and the console-paste path produce byte-identical JSON shapes by construction.
//
// Gotchas (each cost a rebuild somewhere):
//   - Anchor-positioned / portal-rendered menus serialize EMPTY from their trigger:
//     the DOM lives in a portal at the end of <body>. Point --target at the portal
//     node (often [role=menu], [role=dialog], [role=listbox], [class*=popover]).
//   - Popover CSS is often absent from a page save (injected at runtime, adopted
//     stylesheets, CSS-in-JS). The scoped computed-style sheet in .css is the fix:
//     mount html + css together and the fragment paints without the page's CSS.
//   - Shells sized in viewport units (100vh sidebars, vw grids) GROW when the host
//     film mounts the fragment zoomed; pin the mount box with the recorded rect.
//   - The fragment is a fossil of ONE state; re-run with a new --name per state.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseArgs, usage, ensureDir, readJson, writeJson, snapshotDir, loadPlaywright,
} from './lib.mjs';
import { runSteps, runLogin, normalizePlan } from './steps.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SNIPPET = path.join(HERE, 'state-snippet.js');
const USAGE = 'Usage: node scripts/states.mjs <url> --slug <slug> --name <state-name> --target <css selector> [--root <dir>] [--steps <plan.json>] [--login <plan.json>] [--viewport 1440x900] [--note "..."] [--keep-remote]';

let args;
try {
  args = parseArgs(process.argv.slice(2), {
    slug: 'string', name: 'string', target: 'string', root: 'string', steps: 'string', login: 'string',
    viewport: 'string', note: 'string', 'keep-remote': 'boolean',
  });
} catch (e) { usage(e.message + '\n' + USAGE, 2); }

const url = args._[0];
if (!url || !args.slug || !args.name || !args.target) usage(USAGE, 2);
if (!/^[a-z0-9][a-z0-9._-]*$/i.test(args.name)) usage(`--name "${args.name}" - use letters, digits, dot, dash, underscore`, 2);
const [vw, vh] = (args.viewport || '1440x900').split('x').map(Number);
if (!vw || !vh) usage(`bad --viewport: ${args.viewport}`, 2);

// Plans use the shared step vocabulary in steps.mjs (the same one freeze.mjs runs); every
// string passes through resolveEnv there, so credentials stay in the environment.
function loadPlan(file) { return normalizePlan(readJson(path.resolve(file))); }

async function main() {
  const outDir = snapshotDir(args.root, args.slug);
  const statesDir = ensureDir(path.join(outDir, 'states'));
  const outFile = path.join(statesDir, args.name + '.json');
  const login = args.login ? loadPlan(args.login) : null;
  const plan = args.steps ? loadPlan(args.steps) : { steps: [] };
  const snippet = fs.readFileSync(SNIPPET, 'utf8');

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    // bypassCSP: a strict page CSP would otherwise refuse the injected serializer.
    const context = await browser.newContext({ viewport: { width: vw, height: vh }, bypassCSP: true });
    const page = await context.newPage();
    if (login) await runLogin(page, login);
    console.log('goto', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await runSteps(page, plan.steps);

    const count = await page.locator(args.target).count();
    if (!count) throw new Error(`--target "${args.target}" matches nothing after the steps (portal menus live at the end of <body>: try [role=menu] / [role=dialog] / [role=listbox])`);
    if (count > 1) console.warn(`  WARN --target matches ${count} elements; serializing the first`);

    await page.evaluate(snippet);
    const state = await page.evaluate(
      ([sel, opts]) => window.__snapState(sel, opts),
      [args.target, { name: args.name, note: args.note || '', stripRemote: !args['keep-remote'] }],
    );
    if (!state.html || state.html.length < 20) console.warn('  WARN fragment html is tiny - the target may be an anchor whose content is portal-rendered elsewhere');
    if (state.rect.w === 0 || state.rect.h === 0) console.warn('  WARN target rect is 0x0 - the state may not be visible yet (add {waitFor} or {wait} steps)');

    writeJson(outFile, state);
    const rules = state.css ? state.css.split('\n').length : 0;
    console.log(`state "${state.state}" from ${state.url} theme=${state.theme} rect=${state.rect.x},${state.rect.y} ${state.rect.w}x${state.rect.h} html=${state.html.length}ch css=${rules} rules stripped=${state.stripped_assets}`);
    console.log('wrote ' + outFile);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(e => { console.error('FAIL ' + (e && e.message || e)); process.exit(1); });
