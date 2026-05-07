function previewClientScript() {
  return `
<script>
(() => {
  if (window.__phaseE5PreviewClient) return;
  window.__phaseE5PreviewClient = true;
  const tabId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random());
  const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(wsProto + '//' + location.host + '/__preview-ws');
  const channel = new BroadcastChannel('hf-preview');
  let bootedAt = null;            // performance.now() at first sceneBooted=true
  let chapterStartedAt = null;    // performance.now() when current chapter began
  let chapterIndex = -1;          // last seen currentChapterIndex
  let pausedAcc = 0;              // ms accumulated while paused (current chapter)
  let pausedSince = null;         // performance.now() at last pause-start, or null
  let pauseManagerPromise = null;

  function effectiveChapterClock() {
    if (!chapterStartedAt) return 0;
    const now = performance.now();
    const livePaused = pausedSince != null ? now - pausedSince : 0;
    return Math.max(0, (now - chapterStartedAt - pausedAcc - livePaused) / 1000);
  }

  function pauseManager() {
    if (!pauseManagerPromise) pauseManagerPromise = import('/runtime/pause-manager.js');
    return pauseManagerPromise;
  }

  function timelines() {
    // Hide registered-timeline rows until the user has actually started the
    // video. Some timelines (e.g. the camera timeline registered at
    // engine.loadSnapshot time) live before sceneBooted; their wall-clock
    // would otherwise appear to tick on the scrubber while the Start gate
    // is still waiting.
    if (!bootedAt) return [];
    const registry = window.__hfTimelines && window.__hfTimelines.registry;
    if (!registry || typeof registry.entries !== 'function') return [];
    // pause-manager.shiftFrameDriverClock(pausedMs) bumps each entry.t0 on
    // resume, so paused intervals between pause/resume cycles are already
    // baked out. We only need to subtract the LIVE (currently-paused)
    // interval so the displayed time freezes during a pause.
    const liveLockedMs = pausedSince != null ? performance.now() - pausedSince : 0;
    return Array.from(registry.entries()).map(([id, entry]) => {
      const duration = Number(entry && entry.adapter && entry.adapter.duration) || 0;
      const t0 = Number(entry && entry.t0) || performance.now();
      const elapsed = (performance.now() - t0 - liveLockedMs) / 1000;
      return { id, duration, time: Math.max(0, Math.min(duration, elapsed)) };
    });
  }

  function pauseState() {
    const pm = window.__hfPauseManager;
    return pm && typeof pm.state === 'function' ? pm.state() : {};
  }

  function state() {
    const ps = pauseState();
    const sceneBooted = document.body && document.body.dataset.sceneBooted === 'true';
    if (!bootedAt && sceneBooted) {
      bootedAt = performance.now();
      chapterStartedAt = bootedAt;
      chapterIndex = Number(ps.currentChapterIndex) || 0;
    }
    // Chapter transition — reset the chapter clock to 0.
    const idx = Number(ps.currentChapterIndex) || 0;
    if (sceneBooted && idx !== chapterIndex) {
      chapterStartedAt = performance.now();
      pausedAcc = 0;
      pausedSince = ps.paused ? performance.now() : null;
      chapterIndex = idx;
    }
    if (ps.paused && pausedSince == null) pausedSince = performance.now();
    if (!ps.paused && pausedSince != null) {
      pausedAcc += performance.now() - pausedSince;
      pausedSince = null;
    }
    return {
      type: 'state',
      tabId,
      href: location.href,
      sceneBooted,
      sceneDone: document.body && document.body.dataset.sceneDone === 'true',
      surface: (document.body && document.body.dataset.surface) || '',
      wallClock: effectiveChapterClock(),
      paused: !!ps.paused,
      currentChapterIndex: Number(ps.currentChapterIndex) || 0,
      chapterCount: Number(ps.chapterCount) || 0,
      chapterNames: Array.isArray(ps.chapterNames) ? ps.chapterNames : [],
      timelines: timelines(),
    };
  }

  function postState() {
    channel.postMessage(state());
  }

  function seekTimeline(id, time) {
    const registry = window.__hfTimelines && window.__hfTimelines.registry;
    const entry = registry && registry.get && registry.get(id);
    if (entry && entry.adapter && typeof entry.adapter.seek === 'function') {
      entry.adapter.seek(Number(time) || 0);
    }
  }

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'reload') {
        console.info('[preview] reload', msg.path || '');
        location.reload();
      }
    } catch (_) {}
  });

  function resetChapterClock() {
    chapterStartedAt = performance.now();
    pausedAcc = 0;
    pausedSince = pauseState().paused ? performance.now() : null;
  }

  channel.addEventListener('message', async (event) => {
    const msg = event.data || {};
    if (msg.type === 'query') return postState();
    if (msg.type === 'pause') await (await pauseManager()).pause();
    if (msg.type === 'resume') await (await pauseManager()).resume();
    if (msg.type === 'seekChapter') {
      resetChapterClock();
      (await pauseManager()).seekToChapter(msg.index);
    }
    if (msg.type === 'seekTimeline' || msg.type === 'seek') seekTimeline(msg.id, msg.time);
    if (msg.type !== 'state') postState();
  });

  setInterval(postState, 500);
})();
</script>`;
}

module.exports = { previewClientScript };
