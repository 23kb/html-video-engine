function scrubberHtml({ video, port }) {
  const playerUrl = `/scenes/player.html?video=${encodeURIComponent(video)}&preview=1`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phase E.5 Scrubber - ${video}</title>
  <style>
    :root { color-scheme: dark; --bg:#0e141a; --panel:#151d25; --ink:#eef5ff; --muted:#91a1b5; --accent:#f28b3c; --cyan:#69d5ff; --line:#2a3746; --danger:#ff6b57; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.4 Inter, ui-sans-serif, system-ui, sans-serif; }
    .shell { display: grid; grid-template-rows: minmax(0, 1fr) 230px; height: 100vh; }
    iframe { width: 100%; height: 100%; border: 0; background: #071018; }
    .panel { border-top: 1px solid var(--line); background: var(--panel); padding: 14px 18px; display: grid; gap: 12px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .status { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .pill { border: 1px solid var(--line); border-radius: 7px; padding: 4px 8px; color: var(--muted); white-space: nowrap; }
    .pill.paused { color: #fff; border-color: var(--danger); background: rgba(255,107,87,.14); }
    .controls { display: flex; gap: 8px; flex-wrap: wrap; }
    button { appearance: none; border: 1px solid var(--line); background: #202a35; color: var(--ink); border-radius: 7px; padding: 8px 12px; font: inherit; cursor: pointer; }
    button:hover { border-color: var(--cyan); }
    button.primary { background: var(--accent); border-color: var(--accent); color: #10151c; font-weight: 700; }
    .meta { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tracks { display: grid; grid-template-columns: 240px minmax(0,1fr); gap: 12px; min-height: 100px; }
    .chapters, .timelineBox { border: 1px solid var(--line); border-radius: 8px; background: #0f151c; overflow: hidden; }
    .chapters { display: grid; align-content: start; max-height: 110px; overflow-y: auto; }
    .chapter { padding: 7px 10px; color: var(--muted); border-bottom: 1px solid rgba(42,55,70,.55); cursor: pointer; }
    .chapter.active { color: #fff; background: rgba(105,213,255,.12); }
    .timelineBox { position: relative; padding: 10px 12px; }
    .clock { height: 12px; border-radius: 999px; background: #202b38; overflow: hidden; margin-bottom: 10px; }
    .clock > span { display: block; height: 100%; width: var(--p, 0%); background: var(--cyan); }
    .timeline { position: relative; height: 28px; margin: 6px 0; border-radius: 6px; background: #202b38; cursor: pointer; overflow: hidden; }
    .timeline::before { content: ""; position: absolute; inset: 0; width: var(--p, 0%); background: linear-gradient(90deg, var(--accent), var(--cyan)); opacity: .85; }
    .timeline span { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 10px; color: #fff; pointer-events: none; font-size: 12px; }
    .empty { color: var(--muted); padding: 10px 0; }
  </style>
</head>
<body>
  <div class="shell">
    <iframe src="${playerUrl}" title="Preview player"></iframe>
    <section class="panel">
      <div class="top">
        <div class="status">
          <strong>${video}</strong>
          <span class="pill" id="boot">waiting</span>
          <span class="pill" id="pauseState">playing</span>
          <span id="chapterNow" class="pill">chapter --</span>
        </div>
        <div class="controls">
          <button id="pauseBtn" class="primary">Pause</button>
          <button id="prevBtn">Prev</button>
          <button id="restartBtn">Restart</button>
          <button id="nextBtn">Next</button>
        </div>
      </div>
      <div class="meta">http://localhost:${port}${playerUrl}</div>
      <div class="tracks">
        <div class="chapters" id="chapters"></div>
        <div class="timelineBox">
          <div class="clock" title="Wall-clock is read-only. Chapter restart/prev/next are supported."><span id="clockFill"></span></div>
          <div id="timelines"></div>
          <div class="meta">Wall-clock is read-only. Chapter seek restarts at chapter boundaries; mid-chapter wall-clock seek is not supported.</div>
        </div>
      </div>
    </section>
  </div>
  <script>
    const channel = new BroadcastChannel('hf-preview');
    const boot = document.getElementById('boot');
    const pauseState = document.getElementById('pauseState');
    const pauseBtn = document.getElementById('pauseBtn');
    const chapterNow = document.getElementById('chapterNow');
    const chapters = document.getElementById('chapters');
    const timelines = document.getElementById('timelines');
    const clockFill = document.getElementById('clockFill');
    let latest = null;
    let activeTabId = null;

    function currentIndex() {
      return Math.max(0, Number(latest && latest.currentChapterIndex) || 0);
    }

    function seekChapter(index) {
      channel.postMessage({ type: 'seekChapter', index });
    }

    pauseBtn.onclick = () => channel.postMessage({ type: latest && latest.paused ? 'resume' : 'pause' });
    document.getElementById('prevBtn').onclick = () => seekChapter(Math.max(0, currentIndex() - 1));
    document.getElementById('restartBtn').onclick = () => seekChapter(currentIndex());
    document.getElementById('nextBtn').onclick = () => seekChapter(Math.min((latest?.chapterCount || 1) - 1, currentIndex() + 1));

    function render(state) {
      if (!activeTabId) activeTabId = state.tabId;
      if (state.tabId !== activeTabId) return;
      latest = state;
      boot.textContent = state.sceneDone ? 'done' : state.sceneBooted ? 'booted' : 'booting';
      pauseState.textContent = state.paused ? 'PAUSED' : 'playing';
      pauseState.classList.toggle('paused', !!state.paused);
      pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
      const idx = currentIndex();
      const names = state.chapterNames || [];
      chapterNow.textContent = 'chapter ' + (idx + 1) + '/' + (state.chapterCount || names.length || 0);
      clockFill.style.setProperty('--p', Math.min(100, ((state.wallClock || 0) / Math.max(10, state.wallClock || 0)) * 100) + '%');

      chapters.innerHTML = '';
      (names.length ? names : Array.from({ length: state.chapterCount || 0 }, (_, i) => 'chapter-' + (i + 1))).forEach((name, i) => {
        const row = document.createElement('div');
        row.className = 'chapter' + (i === idx ? ' active' : '');
        row.textContent = (i + 1) + '. ' + name;
        row.onclick = () => seekChapter(i);
        chapters.appendChild(row);
      });

      timelines.innerHTML = '';
      const rows = state.timelines || [];
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = state.paused ? 'PAUSED. No registered timelines are active right now.' : 'No registered timelines are active right now.';
        timelines.appendChild(empty);
        return;
      }
      rows.forEach(t => {
        const row = document.createElement('div');
        row.className = 'timeline';
        const pct = t.duration ? Math.max(0, Math.min(100, (t.time || 0) / t.duration * 100)) : 0;
        row.style.setProperty('--p', pct + '%');
        row.innerHTML = '<span>' + t.id + ' · ' + (t.time || 0).toFixed(2) + '/' + (t.duration || 0).toFixed(2) + 's</span>';
        row.onclick = event => {
          const rect = row.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          channel.postMessage({ type: 'seekTimeline', id: t.id, time: x * (t.duration || 0) });
        };
        timelines.appendChild(row);
      });
    }

    channel.addEventListener('message', event => {
      if ((event.data || {}).type === 'state') render(event.data);
    });
    setInterval(() => channel.postMessage({ type: 'query' }), 500);
  </script>
</body>
</html>`;
}

module.exports = { scrubberHtml };
