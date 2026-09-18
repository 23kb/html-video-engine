// Step runner shared by freeze.mjs and states.mjs. A plan is an array of steps (or {steps:[...]}).
// Every string value passes through resolveEnv, so credentials live in the environment
// ("${ENV:WP_PASS}") and never in the plan file.
//
//   { "click": "<sel>", "settle": 800 }
//   { "hover": "<sel>" }
//   { "type": { "sel": "<sel>", "text": "..." } }        keystrokes (typing events fire)
//   { "fill": { "sel": "<sel>", "text": "..." } }        set the value in one go
//   { "press": "Enter" }  or  { "press": { "sel": "<sel>", "key": "Escape" } }
//   { "select": { "sel": "<select>", "value": "..." } }
//   { "check": "<sel>" }  /  { "uncheck": "<sel>" }
//   { "setFile": { "sel": "<input type=file>", "path": "..." } }
//   { "scroll": { "sel": "<sel>" } }  or  { "scroll": { "y": 600 } }
//   { "eval": "<js>" }                                      runs in the page
//   { "wait": 500 }                                         milliseconds
//   { "waitFor": "<sel>", "timeout": 15000, "state": "visible" }
//   { "waitUrl": "<regex>", "timeout": 30000 }
//   { "goto": "<url>" }
//
// Real Playwright mouse / keyboard events on purpose: synthetic el.click() and framework
// trigger() calls are ignored by delegated bindings, and real events also measure the
// product's own cadence.

import { resolveEnv } from './lib.mjs';

export function normalizePlan(plan) {
  if (Array.isArray(plan)) return { steps: plan };
  if (plan && Array.isArray(plan.steps)) return plan;
  throw new Error('a plan is an array of steps or an object with a "steps" array');
}

export async function runSteps(page, steps, { log = console.log } = {}) {
  let n = 0;
  for (const raw of steps || []) {
    const step = deepResolve(raw);
    n++;
    const settle = step.settle ?? 400;
    if (step.goto) { log(`    -> goto ${step.goto}`); await page.goto(step.goto, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); }
    else if (step.click) { log(`    -> click ${step.click}`); await page.waitForSelector(step.click, { timeout: step.timeout ?? 10000 }); await page.click(step.click); await page.waitForTimeout(step.settle ?? 800); continue; }
    else if (step.hover) { log(`    -> hover ${step.hover}`); await page.hover(step.hover); }
    else if (step.type) { log(`    -> type into ${step.type.sel}`); await page.click(step.type.sel); await page.keyboard.type(String(step.type.text), { delay: step.type.delay ?? 20 }); }
    else if (step.fill) { log(`    -> fill ${step.fill.sel}`); await page.fill(step.fill.sel, String(step.fill.text)); }
    else if (step.press) { const p = typeof step.press === 'string' ? { key: step.press } : step.press; log(`    -> press ${p.key}`); if (p.sel) await page.press(p.sel, p.key); else await page.keyboard.press(p.key); }
    else if (step.select) { log(`    -> select ${step.select.sel} = ${step.select.value}`); await page.selectOption(step.select.sel, String(step.select.value)); }
    else if (step.check) { log(`    -> check ${step.check}`); await page.check(step.check); }
    else if (step.uncheck) { log(`    -> uncheck ${step.uncheck}`); await page.uncheck(step.uncheck); }
    else if (step.setFile) { log(`    -> setFile ${step.setFile.sel}`); await page.setInputFiles(step.setFile.sel, step.setFile.path); }
    else if (step.scroll) { if (step.scroll.sel) { log(`    -> scroll to ${step.scroll.sel}`); await page.locator(step.scroll.sel).first().scrollIntoViewIfNeeded(); } else { log(`    -> scroll y=${step.scroll.y}`); await page.evaluate(y => window.scrollTo(0, y), Number(step.scroll.y || 0)); } }
    else if (step.eval) { log('    -> eval'); await page.evaluate(step.eval); }
    else if (step.wait) { await page.waitForTimeout(Number(step.wait)); continue; }
    else if (step.waitFor) {
      log(`    -> waitFor ${step.waitFor}`);
      if (step.waitFor === 'body' || step.waitFor === 'html' || step.waitFor === '*') log('       (a universal selector matches instantly and voids the wait)');
      await page.waitForSelector(step.waitFor, { state: step.state || 'visible', timeout: step.timeout ?? 15000 }).catch(() => log(`       ! waitFor "${step.waitFor}" not found in time — continuing (a boxless element never becomes visible)`));
      continue;
    }
    else if (step.waitUrl) { log(`    -> waitUrl /${step.waitUrl}/`); await page.waitForURL(new RegExp(step.waitUrl), { timeout: step.timeout ?? 30000 }); continue; }
    else throw new Error('unknown step: ' + JSON.stringify(raw));
    await page.waitForTimeout(settle);
  }
  return n;
}

function deepResolve(v) {
  if (typeof v === 'string') return resolveEnv(v);
  if (Array.isArray(v)) return v.map(deepResolve);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepResolve(x)]));
  return v;
}

// Login plan: { "url": "...", "steps": [...], "success_url": "<regex>" }
export async function runLogin(page, plan, { log = console.log } = {}) {
  const p = deepResolve(plan);
  if (!p.url) throw new Error('login plan needs "url"');
  log(`-> login at ${p.url}`);
  await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await runSteps(page, p.steps || [], { log });
  if (p.success_url) await page.waitForURL(new RegExp(p.success_url), { timeout: p.timeout ?? 30000 });
  else await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  log(`   logged in, now at ${page.url().slice(0, 100)}`);
}
