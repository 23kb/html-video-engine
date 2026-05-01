// Production cinematic lifecycle runner.
//
// Small wrapper around the lab spec runner. Owns production concerns:
// resolving manifest config, optional narration sequencing, awaiting the
// mounted cinematic, and dismissing it cleanly.

import { runSpec } from './cinematic-spec-runner.js';
import { getSpec } from './cinematic-specs.js';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeSpec(base, overrides = {}) {
  const spec = clone(base);
  for (const [key, value] of Object.entries(overrides)) {
    if (key === 'specId' || key === 'id') continue;
    if (key === 'opts') spec.opts = { ...(spec.opts || {}), ...(value || {}) };
    else if (key === 'theme') spec.theme = { ...(spec.theme || {}), ...(value || {}) };
    else spec[key] = value;
  }
  return spec;
}

export function resolveCinematicSpec(config) {
  if (!config) return null;
  if (typeof config === 'string') {
    const spec = getSpec(config);
    if (!spec) throw new Error(`cinematic-runner: unknown spec "${config}"`);
    return clone(spec);
  }

  const specId = config.specId || config.id;
  if (specId) {
    const base = getSpec(specId);
    if (!base) throw new Error(`cinematic-runner: unknown spec "${specId}"`);
    return mergeSpec(base, config);
  }

  if (config.kind) return clone(config);
  throw new Error('cinematic-runner: postIntro requires specId, id, string id, or kind');
}

async function playNarrationList(narration, playNarration) {
  if (!playNarration || !narration) return null;
  const list = Array.isArray(narration) ? narration : [narration];
  if (!list.length) return null;
  return (async () => {
    for (const item of list) {
      if (!item) continue;
      const { ended } = await playNarration(item, { keepDucked: true });
      await ended;
    }
  })();
}

export async function playCinematic(config, { playNarration, onMounted } = {}) {
  const spec = resolveCinematicSpec(config);
  if (!spec) return null;

  const handle = await runSpec(spec);
  try { onMounted?.(handle); } catch (e) { console.warn('[cinematic] onMounted failed', e); }
  const hasNarrationOverride =
    config &&
    typeof config === 'object' &&
    Object.prototype.hasOwnProperty.call(config, 'narration');
  const narration = hasNarrationOverride ? config.narration : spec.narration;
  const narrationPromise = playNarrationList(narration, playNarration);

  try {
    if (narrationPromise) {
      await Promise.all([handle.animPromise, narrationPromise]);
    } else {
      await handle.animPromise;
    }
  } finally {
    await handle.dismiss();
  }
  return { done: true, spec };
}
