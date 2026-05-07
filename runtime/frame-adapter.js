// Frame Adapter contract.
// Every animation runtime adapter exposes one seekable surface so the driver
// can drive heterogeneous editorial timelines from a single tick loop.
//
// Adapter shape:
// {
//   id: string,
//   duration: number,      // seconds
//   seek(t): void,         // 0 <= t <= duration
//   destroy(): void,
// }

function clampTime(t, duration) {
  const max = Number.isFinite(duration) && duration > 0 ? duration : 0;
  return Math.min(max, Math.max(0, Number.isFinite(t) ? t : 0));
}

export function gsapTimelineAdapter(tl, { id, context } = {}) {
  if (!tl || typeof tl.seek !== 'function') {
    throw new Error('gsapTimelineAdapter: expected a GSAP timeline');
  }
  if (!id) throw new Error('gsapTimelineAdapter: { id } required');

  const duration = typeof tl.duration === 'function' ? tl.duration() : 0;
  return {
    id,
    duration,
    seek(t) {
      tl.seek(clampTime(t, duration), false);
    },
    destroy() {
      try { tl.kill(); } catch (_) {}
      try { context?.revert?.(); } catch (_) {}
    },
  };
}

function animationDurationSeconds(animation) {
  try {
    const computed = animation.effect?.getComputedTiming?.();
    if (Number.isFinite(computed?.endTime)) return computed.endTime / 1000;
  } catch (_) {}
  try {
    const timing = animation.effect?.getTiming?.();
    if (Number.isFinite(timing?.duration)) return timing.duration / 1000;
  } catch (_) {}
  return 0;
}

export function waapiAdapter(animations, { id } = {}) {
  const list = Array.isArray(animations) ? animations : [animations];
  if (!id) throw new Error('waapiAdapter: { id } required');

  const duration = Math.max(0, ...list.map(animationDurationSeconds));
  for (const anim of list) {
    try { anim.pause(); } catch (_) {}
  }

  return {
    id,
    duration,
    seek(t) {
      const ms = clampTime(t, duration) * 1000;
      for (const anim of list) {
        try { anim.currentTime = ms; } catch (_) {}
      }
    },
    destroy() {
      for (const anim of list) {
        try { anim.cancel(); } catch (_) {}
      }
    },
  };
}
