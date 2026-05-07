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
  const startedAt = performance.now();
  let pauseManagerPromise = null;

  function pauseManager() {
    if (!pauseManagerPromise) pauseManagerPromise = import('/runtime/pause-manager.js');
    return pauseManagerPromise;
  }

  function timelines() {
    const registry = window.__hfTimelines && window.__hfTimelines.registry;
    if (!registry || typeof registry.entries !== 'function') return [];
    return Array.from(registry.entries()).map(([id, entry]) => ({
      id,
      duration: Number(entry && entry.adapter && entry.adapter.duration) || 0,
      time: Math.max(0, Math.min(
        Number(entry && entry.adapter && entry.adapter.duration) || 0,
        (performance.now() - (Number(entry && entry.t0) || performance.now())) / 1000
      )),
    }));
  }

  function pauseState() {
    const pm = window.__hfPauseManager;
    return pm && typeof pm.state === 'function' ? pm.state() : {};
  }

  function state() {
    const ps = pauseState();
    return {
      type: 'state',
      tabId,
      href: location.href,
      sceneBooted: document.body && document.body.dataset.sceneBooted === 'true',
      sceneDone: document.body && document.body.dataset.sceneDone === 'true',
      surface: (document.body && document.body.dataset.surface) || '',
      wallClock: (performance.now() - startedAt) / 1000,
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

  channel.addEventListener('message', async (event) => {
    const msg = event.data || {};
    if (msg.type === 'query') return postState();
    if (msg.type === 'pause') await (await pauseManager()).pause();
    if (msg.type === 'resume') await (await pauseManager()).resume();
    if (msg.type === 'seekChapter') (await pauseManager()).seekToChapter(msg.index);
    if (msg.type === 'seekTimeline' || msg.type === 'seek') seekTimeline(msg.id, msg.time);
    if (msg.type !== 'state') postState();
  });

  setInterval(postState, 500);
})();
</script>`;
}

module.exports = { previewClientScript };
