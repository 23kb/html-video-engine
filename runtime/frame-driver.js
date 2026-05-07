// Single owner for opt-in editorial-layer paused timelines.
//
// Author code registers through videos/_shared/kit.js -> registerTimeline().
// The iframe/camera surface remains wall-clock driven by the legacy runners.

const registry = new Map();
let state = {
  running: false,
  timer: null,
  lastTick: 0,
  rafLate: false,
  now: () => performance.now(),
};

function exposeNamespace() {
  if (typeof window === 'undefined') return;
  const ns = window.__hfTimelines || {};
  ns.registry = registry;
  ns.register = register;
  ns.unregister = unregister;
  ns.clear = clear;
  ns.tick = tick;
  window.__hfTimelines = ns;
}

function clearTimer() {
  if (!state.timer) return;
  if (state.timer.kind === 'raf') cancelAnimationFrame(state.timer.id);
  else clearTimeout(state.timer.id);
  state.timer = null;
}

function shouldUseTimeout(nowMs) {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return true;
  return state.rafLate || (state.lastTick > 0 && nowMs - state.lastTick > 250);
}

function scheduleNext() {
  if (!state.running) return;
  const nowMs = state.now();
  if (shouldUseTimeout(nowMs)) {
    state.timer = {
      kind: 'timeout',
      id: setTimeout(() => loop(state.now(), 'timeout'), 16),
    };
    return;
  }
  state.timer = {
    kind: 'raf',
    id: requestAnimationFrame((ts) => loop(ts, 'raf')),
  };
}

function loop(nowMs, source) {
  if (!state.running) return;
  const previousTick = state.lastTick;
  state.lastTick = nowMs;
  state.rafLate = source === 'raf' && previousTick > 0 && nowMs - previousTick > 250;
  tickAt(nowMs);
  scheduleNext();
}

function tickAt(nowMs) {
  for (const entry of registry.values()) {
    const elapsed = (nowMs - entry.t0) / 1000;
    const t = Math.min(entry.adapter.duration, Math.max(0, elapsed));
    entry.adapter.seek(t);
  }
}

export function register(adapter) {
  if (!adapter || !adapter.id) throw new Error('frame-driver register: adapter.id required');
  if (registry.has(adapter.id)) unregister(adapter.id);
  registry.set(adapter.id, {
    adapter,
    t0: state.now(),
  });
  exposeNamespace();
  return adapter;
}

export function unregister(id) {
  const entry = registry.get(id);
  if (entry) {
    try { entry.adapter.destroy?.(); } catch (e) { console.warn('[frame-driver] destroy failed', id, e); }
  }
  registry.delete(id);
}

export function clear() {
  for (const id of [...registry.keys()]) unregister(id);
}

export function start({ now = () => performance.now() } = {}) {
  state.now = now;
  exposeNamespace();
  if (state.running) return;
  state.running = true;
  state.lastTick = state.now();
  state.rafLate = false;
  scheduleNext();
}

export function stop() {
  state.running = false;
  clearTimer();
}

export function tick(elapsedSeconds) {
  for (const entry of registry.values()) {
    const t = Math.min(entry.adapter.duration, Math.max(0, elapsedSeconds));
    entry.adapter.seek(t);
  }
}

export function registrySize() {
  return registry.size;
}

export function assertRegistryEmpty(label = 'frame-driver') {
  if (registry.size === 0) return true;
  const ids = [...registry.keys()].join(', ');
  console.warn(`[${label}] registered timeline leak: ${ids}`);
  return false;
}

export { registry };

exposeNamespace();
