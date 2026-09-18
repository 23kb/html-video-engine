#!/usr/bin/env node
// screens.mjs <folder | scene-map.json> [--profile <name>] [--out file]
//
// Derives screens-needed.json — the to-do list the snapshot step consumes — from the filled
// scene map: one entry per unique screen × state, which scenes need it, what must be visible
// (the union of the rows' `visible` lines), and the capture route. With a product profile
// (map.profile, or --profile) each surface gets its capture path, login route and chrome to
// strip from the profile's machine hints; without one, the route is decided by surface only.

import path from 'node:path';
import { parseArgs, usage, loadMap, writeJson, loadProfile, isEditorial } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { profile: 'string', out: 'string' });
if (!args._[0]) usage('usage: screens.mjs <folder | scene-map.json> [--profile <name>] [--out file]');
const { folder, map } = loadMap(args._[0]);
const profileName = args.profile || map.profile || null;
const profile = loadProfile(profileName);
if (profileName && !profile) console.error(`warning: profile "${profileName}" not found in profiles/; working product-neutral`);
const hints = profile?.hints || null;

const NEUTRAL = {
  app: 'path B — a SingleFile save of the logged-in app (a human saves the page; ingest.mjs packages it); states via the DevTools snippet',
  page: 'path A — public page (freeze.mjs <url> <slug>)',
  own: 'path C — your own site behind a login (freeze.mjs --login plan.json); states via states.mjs',
  admin: 'path C — your own site behind a login (freeze.mjs --login plan.json); states via states.mjs',
  builder: 'path C — your own site behind a login (freeze.mjs --login plan.json); one state fragment per open panel',
  frontend: 'path A — public page (freeze.mjs <url> <slug>), or path C if the page is private',
};

const byKey = new Map();
const editorial = [];
for (const r of map.rows || []) {
  if (r.our?.status === 'dropped') continue;
  if (isEditorial(r)) { editorial.push(r.ref_scene || '(added)'); continue; }
  const o = r.our;
  const slug = o.screen.trim();
  const state = (o.state || '').trim() || 'default';
  const key = `${slug}::${state}`;
  if (!byKey.has(key)) byKey.set(key, { slug, surface: (o.surface || '').trim() || (hints?.default_surface_for_app || 'app'), page: (o.page || '').trim(), state, visible: [], scenes: [], triggers: [] });
  const e = byKey.get(key);
  if (o.visible && !e.visible.includes(o.visible.trim())) e.visible.push(o.visible.trim());
  const sceneId = r.ref_scene || `added-${(map.rows.indexOf(r) + 1)}`;
  e.scenes.push(sceneId);
  // The presses and hovers the film performs on this screen: the snapshot step checks each target
  // exists in the fossil (and that a switch flip restyles) before the slug is handed to the film.
  for (const t of (Array.isArray(o.triggers) ? o.triggers : [])) if (t && t.target) e.triggers.push({ scene: sceneId, action: t.action || 'press', target: String(t.target).trim() });
  if (!e.page && o.page) e.page = o.page.trim();
}

const screens = [...byKey.values()].map(e => {
  const surf = e.surface.toLowerCase();
  const h = hints?.surfaces?.[surf];
  const capture = h?.capture || NEUTRAL[surf] || 'decide at capture time: path A (public page) / path B (SingleFile save of a logged-in app) / path C (your own site behind a login)';
  return {
    slug: e.slug, surface: e.surface, page: e.page || (h?.page_hint ? `(${h.page_hint})` : ''), state: e.state,
    visible: e.visible.join(' · '), scenes: e.scenes, capture,
    ...(e.triggers.length ? { triggers: e.triggers } : {}),
    ...(h?.login ? { login: h.login } : {}),
    ...(h?.strip ? { strip: h.strip } : {}),
  };
});

const out = {
  version: 1,
  topic: map.topic, slug: map.slug,
  product: map.product ?? null, profile: profile?.name ?? null,
  count: { screens: new Set(screens.map(s => s.slug)).size, states: screens.length },
  screens,
  editorial_scenes: editorial,
};
const outFile = path.resolve(args.out || path.join(folder, 'screens-needed.json'));
writeJson(outFile, out);
console.log(`wrote ${outFile} — ${out.count.screens} screen(s), ${out.count.states} state(s)${profile ? ` · profile ${profile.name}` : ' · product-neutral'}; editorial scenes: ${editorial.join(', ') || 'none'}`);
for (const s of screens) console.log(`  ${s.slug} / ${s.state}  [${s.surface}]  ← ${s.scenes.join(', ')}`);
