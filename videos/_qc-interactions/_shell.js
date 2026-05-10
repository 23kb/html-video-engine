// videos/_qc-interactions/_shell.js
//
// Shared QC harness for interaction demos. Each page imports `bootQc` and
// passes a `run` function that receives a configured WPFormsInteractions
// instance. The harness handles:
//   • stage fit-to-viewport
//   • iframe slot mount via IframeManager
//   • initial snapshot load
//   • cursor mount at a starting position
//   • run / reset buttons + state-label updates
//   • console-error logging (so preview_eval can detect failures)

import { Cursor } from '/videos/_shared/motion-primitives.js';
import { IframeManager, WPFormsInteractions } from '/videos/_shared/wpforms-interactions.js';

/**
 * Mount the QC harness on a page.
 *
 * @param {Object} opts
 * @param {string} opts.startSnapshot — initial snapshot slug to load
 * @param {{x:number,y:number}} [opts.cursorStart={x:1180,y:660}] — cursor mount point
 * @param {(api:{interactions:WPFormsInteractions,setState:(s:string)=>void}) => Promise<void>} opts.run
 *   — function that performs the interaction when the user clicks "run"
 * @returns {Promise<void>}
 */
export async function bootQc(opts) {
  const {
    startSnapshot,
    cursorStart = { x: 1180, y: 660 },
    onReady = null,
    run,
  } = opts;

  const stage = document.getElementById('stage');
  const phaseLabel = document.getElementById('phaseLabel');
  const runBtn = document.getElementById('runBtn');
  const resetBtn = document.getElementById('resetBtn');
  const timeLabel = document.getElementById('timeLabel');

  // Fit 1280×720 stage to the available stage-wrap area.
  function fitStage() {
    const wrap = document.querySelector('.stage-wrap');
    const sx = wrap.clientWidth / 1280;
    const sy = wrap.clientHeight / 720;
    stage.style.transform = `scale(${Math.min(sx, sy) * 0.96})`;
  }
  fitStage();
  window.addEventListener('resize', fitStage);

  function setState(s, t = 'running') {
    phaseLabel.textContent = `state: ${s}`;
    timeLabel.textContent = t;
  }
  function disable(yes) {
    runBtn.disabled = yes;
    resetBtn.disabled = yes;
    document.querySelectorAll('.controls select').forEach(s => s.disabled = yes);
  }

  // Mount iframe + cursor.
  let iframeManager = new IframeManager(stage);
  let cursor = new Cursor(stage, { initialX: cursorStart.x, initialY: cursorStart.y });
  let interactions = new WPFormsInteractions(stage, cursor, iframeManager);

  setState('loading snapshot', startSnapshot);
  await iframeManager.load(startSnapshot);
  if (onReady) {
    try { await onReady({ interactions, setState }); } catch (e) { console.error('[onReady]', e); }
  }
  setState('ready', 'idle');

  // Surface iframe console errors to the host page console (preview_eval-friendly).
  function wireIframeConsole() {
    const ifm = iframeManager.iframe();
    if (!ifm || !ifm.contentWindow) return;
    try {
      ifm.contentWindow.addEventListener('error', (e) => {
        console.error('[iframe error]', e.message, e.filename, e.lineno);
      });
    } catch (_) { /* cross-origin guard — unreachable for same-origin snapshots */ }
  }
  wireIframeConsole();

  runBtn.addEventListener('click', async () => {
    disable(true);
    try {
      setState('running interaction', '…');
      await run({ interactions, setState });
      setState('complete', 'done');
    } catch (err) {
      console.error('[QC run failed]', err);
      setState('error: ' + err.message, 'failed');
    } finally {
      disable(false);
    }
  });

  resetBtn.addEventListener('click', async () => {
    disable(true);
    setState('resetting', '…');
    cursor.remove();
    // Re-mount iframe slot from scratch.
    const slots = stage.querySelectorAll('.ifm-slot, .ml-cursor, .click-ripple, .ml-click-ripple, .ifm-field-ghost');
    slots.forEach(s => s.remove());
    iframeManager = new IframeManager(stage);
    cursor = new Cursor(stage, { initialX: cursorStart.x, initialY: cursorStart.y });
    interactions = new WPFormsInteractions(stage, cursor, iframeManager);
    await iframeManager.load(startSnapshot);
    if (onReady) {
      try { await onReady({ interactions, setState }); } catch (e) { console.error('[onReady]', e); }
    }
    wireIframeConsole();
    setState('ready', 'idle');
    disable(false);
  });
}
