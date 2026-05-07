// Runs a chapter descriptor (from defineChapter) on a page.
//
// Owns:
//   - HUD + start gate + cream cover lifecycle
//   - Snapshot boot / swap (under cover)
//   - Selector-resolves guard (pre-boot, via resolveOrThrow inside verbs)
//   - Camera continuity: same-chapter → smooth pan; chapter-break → dolly out/in
//     (mirrors engine/engine.js runScene's `sameChapter` logic)
//   - Per-step focusOn before dispatching the verb
//   - chapter-done postMessage on success / chapter-failed on error
//   - Error-report tail on failure
//
// Runs one chapter OR a chain of chapters in the SAME page. Chain mode
// preserves camera state across chapter boundaries because the iframe and
// engine state live on one page — this is the fix for the drone-bobbing bug
// in the old cff-chained.html (iframe-per-chapter reset zoom every mount).

import {
  cursor as engineCursor, sleep, zoomTo, clearHighlights,
} from '../engine/engine.js';
import { focusOn, cursor, installMacCursor } from '../engine/interactions.js';
import { installOverlayStyles } from '../engine/overlays-layer.js';
import { installGlobalErrorLogger, diag } from '../engine/diag.js';
import {
  iframeDoc, bootSnapshot, swapSnapshot, createHud, errorReport,
  waitForStartClick, signalChapterDone, signalChapterFailed,
  setWatermarkEnabled, unmountWatermark, mountCover, dropCover,
} from './scene-helpers.js';
import { runVerb } from './verbs.js';
import { isChapterDescriptor } from './chapter-api.js';
import { startBGM, stopBGM, playNarration, setNarrationBase } from '../scenes/shared.js';
import { playTitleCard } from './title-card.js';
import { runChapterBreak } from './transitions.js';
import { initSfx } from './sfx.js';
import { playCinematic } from './cinematic-runner.js';
import * as frameDriver from './frame-driver.js';

// Stage 5b-1: paint-anchored gate. Resolves when `root` has computed opacity
// >= threshold, non-zero size, and one rAF has committed past that state.
// Hard timeout so a misbehaving cinematic cannot strand the cover. Keep in
// sync with runtime/player.js#awaitPostIntroReady.
async function awaitPostIntroReady(root, { threshold = 0.95, timeoutMs = 800 } = {}) {
  if (!root) return;
  const t0 = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const cs = getComputedStyle(root);
      const op = parseFloat(cs.opacity || '1');
      const r = root.getBoundingClientRect();
      if (op >= threshold && r.width > 0 && r.height > 0) {
        requestAnimationFrame(() => resolve());
        return;
      }
      if (performance.now() - t0 > timeoutMs) {
        console.warn('[postintro] paint-ready timeout — removing cover');
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function loadTeaser(name) {
  if (!name) return null;
  const mod = await import(`./teaser-${name}.js`);
  return mod;
}

installGlobalErrorLogger();

function createSilentHud(steps) {
  return {
    state: Object.fromEntries(steps.map(s => [s.id, { ok: null, msg: '' }])),
    mark(id, ok, msg) {
      if (!this.state[id]) return;
      this.state[id] = { ok, msg: msg || '' };
    },
    appendError() {},
    remove() {},
  };
}

/**
 * Run one or more chapter descriptors sequentially on the current page.
 * First chapter boots the snapshot; subsequent chapters swap if needed.
 * Camera state carries across — that's the whole point of the refactor.
 *
 * @param {Array<Object>} descriptors - from defineChapter()
 * @param {{onProgress?: (i, descriptor) => void}} [opts]
 */
export async function runChapters(descriptors, opts = {}) {
  if (!Array.isArray(descriptors)) descriptors = [descriptors];
  for (const d of descriptors) {
    if (!isChapterDescriptor(d)) {
      throw new Error('runChapters: not a chapter descriptor — did you forget defineChapter()?');
    }
  }

  const multi = descriptors.length > 1;
  const defaults = opts.defaults || {};
  // `initialSnapshot` lets runChain preload the primary snapshot behind the
  // intro/teaser and skip the first boot. Without it we'd body-wipe the
  // already-loaded iframe on the first chapter.
  let currentSnapshot = opts.initialSnapshot || null;
  let prevStep = null; // carries .chapter across chapter boundaries for continuity logic
  let narrationEnded = null; // promise from the current chapter's narration

  const debugRegistry = new URLSearchParams(location.search).get('debug') === '1';

  for (let ci = 0; ci < descriptors.length; ci++) {
    const desc = descriptors[ci];
    opts.onProgress?.(ci, desc);

    // HUD per chapter (replaces previous one on chain transitions). Recording
    // builds can pass { hud:false } to keep diagnostics in console/postMessage
    // without rendering the checklist over the video.
    document.getElementById('hud')?.remove();
    const hudSteps = desc.steps.map(s => ({ id: s.id, label: s.label }));
    const hud = opts.hud === false
      ? createSilentHud(hudSteps)
      : createHud({ title: desc.title, steps: hudSteps });

    let justSwapped = false;
    try {
      // Snapshot boot or swap. Only swap on snapshot-name change — same-name
      // transitions just re-run prep (no cream cover flash between chapters).
      if (!currentSnapshot) {
        await bootSnapshot(desc.snapshot, { prep: desc.prep || undefined });
      } else if (desc.snapshot !== currentSnapshot) {
        // Reset iframe transform to identity before the swap so the post-cover
        // drops onto a scale(1) iframe (not the outgoing camera's zoom).
        const swapStyle = desc.swapStyle || defaults.swapStyle || 'cover';
        if (swapStyle !== 'morph') {
          // Cover swaps should drop onto an identity iframe. Morph swaps need
          // the outgoing camera transform intact so the crossfade starts from
          // the viewer's current framing.
          const ui = document.querySelector('iframe.ui');
          if (ui) {
            ui.style.transition = 'none';
            ui.style.transform  = 'scale(1) translate(0px, 0px)';
          }
        }
        await swapSnapshot(desc.snapshot, { prep: desc.prep || undefined, style: swapStyle });
        justSwapped = true;
      } else if (desc.prep) {
        await desc.prep(iframeDoc());
      }
      currentSnapshot = desc.snapshot;

      // Kick off this chapter's narration (fire-and-forget; awaited at end).
      // BGM ducks automatically via playNarration() / shared.js.
      if (desc.narration) {
        try {
          const { ended } = await playNarration(desc.narration, { keepDucked: true });
          narrationEnded = ended;
        } catch (e) { console.warn('narration failed', desc.narration, e); }
      }

      // Walk steps with camera continuity
      for (const step of desc.steps) {
        diag('runner', desc.slug + ' :: ' + step.id + ' (' + step.do + ')');

        const sameChapter = prevStep && prevStep.chapter === step.chapter;

        // Clear any overlays from the previous step
        await clearHighlights({ fadeOut: sameChapter ? 180 : 280 });

        // Chapter-break transition — only when we did NOT just swap snapshots.
        // A swap already provides its own transition + swoosh; running the
        // break on top of it doubles the sound and muddies the visual.
        if (!sameChapter && prevStep && !justSwapped) {
          const breakStyle = desc.breakStyle || defaults.breakStyle || 'dolly';
          await runChapterBreak(breakStyle);
        }
        justSwapped = false;

        // Kick off step-level narration (parallel with camera move). BGM ducks
        // via playNarration(). We await `ended` after postHold so the next
        // step doesn't start until this clip finishes.
        let stepNarrationEnded = null;
        if (step.narration) {
          try {
            const { ended } = await playNarration(step.narration, { keepDucked: true });
            stepNarrationEnded = ended;
          } catch (e) { console.warn('step narration failed', step.narration, e); }
        }

        // Camera move. The verb decides target; runner focuses it with the
        // right smoothness. If the step has no target (hold / snapshotSwap),
        // skip the camera move.
        if (step.target) {
          // First cursor entry of the whole chain: park at the off-screen edge
          // nearest this target, so the first moveTo glides in instead of
          // popping. bootSnapshot parks at off-right as a placeholder; this
          // reassigns to the "right" edge based on actual target geometry.
          if (!prevStep) {
            try { await cursor.parkNearest(step.target); } catch {}
          }
          await focusOn(step.target, {
            fill:   step.fill ?? 0.5,
            noScroll: step.noScroll ?? false,
            smooth: !!sameChapter,
          });
        }

        if (step.preHold) await sleep(step.preHold);

        // Dispatch the verb
        const ctx = {
          doc: iframeDoc(),
          cursor, engineCursor, sleep,
          focusOn,
          sameChapter,
          chapterSlug: desc.slug,
          snapshot: currentSnapshot,
          catalogPath: '/snapshots/' + currentSnapshot + '/catalog.md',
        };
        await runVerb(step, ctx);

        // Step-level `after` — runs a payoff DOM op against the iframe doc
        // after the verb resolves, mirroring the live builder's reaction to
        // the click/select. Used to make static-snapshot canvas state visibly
        // reflect the just-performed action (icon choices, columns, hide
        // label, required asterisk). See runtime/prep-ops.js for vocabulary.
        if (step.after) {
          try {
            await step.after(iframeDoc());
          } catch (e) { console.warn('step.after failed', step.id, e); }
          if (step.postHold == null) await sleep(600);
        }

        if (step.postHold) await sleep(step.postHold);

        // Hold on this step until its narration clip finishes, so beats don't
        // race ahead of the voice. This is the core of the video-first timing
        // model described in PLAN phase 2.
        if (stepNarrationEnded) { try { await stepNarrationEnded; } catch {} }

        hud.mark(step.id, true);
        prevStep = step;
      }

      // Wait for narration audio to finish (if steps ran shorter than the clip)
      // before moving on, so we never overlap two chapters' narration.
      if (narrationEnded) { try { await narrationEnded; } catch {} narrationEnded = null; }

      signalChapterDone(desc.slug);
    } catch (err) {
      const pending = desc.steps.find(s => hud.state[s.id].ok !== true);
      errorReport(hud, err, { slug: desc.slug, pendingId: (pending || desc.steps.at(-1)).id, descriptor: desc });
      signalChapterFailed(desc.slug, err.message);
      // Re-throw so a chain aborts rather than silently marching on.
      throw err;
    } finally {
      frameDriver.clear();
      if (debugRegistry) frameDriver.assertRegistryEmpty('descriptor teardown: ' + desc.slug);
    }
  }

  await clearHighlights({ fadeOut: 400 });
  await engineCursor.hide();
  return { done: true };
}

/**
 * Solo-mode entry: show a start gate, then run one chapter.
 * Used by authoring/runner.html?video=<slug>&chapter=<id>.
 * `manifest` is accepted for API symmetry with runChain but isn't used —
 * solo mode skips intro/teaser/outro.
 */
export async function runSolo(descriptor, { video, manifest } = {}) {
  if (!video) throw new Error('runSolo: { video } required (pass ?video=<slug>)');
  frameDriver.start();
  setNarrationBase('/videos/' + video + '/narration/');
  await waitForStartClick(descriptor.title, {
    onClick: () => { initSfx(); if (descriptor.narration) startBGM(); },
  });
  document.body.classList.add('with-stage-chrome');
  try {
    const r = await runChapters([descriptor]);
    await stopBGM(1500);
    return r;
  } finally {
    frameDriver.clear();
    frameDriver.stop();
  }
}

/**
 * Chain-mode entry: show a start gate, then run chapters in order on ONE page.
 * Camera state carries. Used by authoring/runner.html?video=<slug>&chain=a,b,c.
 *
 * The caller (authoring/runner.html) fetches the manifest once at boot and
 * threads it in here — the runner itself doesn't fetch. Keeps video-level
 * I/O out of the runtime.
 */
export async function runChain(descriptors, { label = 'Play chained', video, manifest } = {}) {
  if (!video) throw new Error('runChain: { video } required (pass ?video=<slug>)');
  if (!manifest) throw new Error('runChain: { manifest } required — fetch in the caller and thread it down');
  frameDriver.start();
  const base = '/videos/' + video + '/';
  setNarrationBase(base + 'narration/');

  // Thread the video title through to boot/swap so the mac-chrome titlebar
  // carries the video's brand copy.
  const videoTitle = manifest.intro?.title || manifest.slug || video;
  window.__wpfVideoTitle = videoTitle;

  // Per-video cover color. Manifest `coverColor` is a CSS color string
  // (e.g. "#0E1116" for a dark-theme video). Falls back to the cream
  // default defined in player.css. Applied to :root so every cover —
  // flash guard, pre-teaser, teaser handoff, outro — picks it up.
  if (manifest.coverColor) {
    document.documentElement.style.setProperty('--cover-color', manifest.coverColor);
  }

  // URL-param overrides for ad-hoc style testing. `?breakStyle=whip&swapStyle=push`
  // flips every chapter's transition without touching the manifest. Also accepts
  // `?coverColor=<hex>` (urlencoded). Logged to console so the active cadence
  // is visible during playback.
  const qs = new URLSearchParams(location.search);
  const urlBreak = qs.get('breakStyle');
  const urlSwap  = qs.get('swapStyle');
  const urlCover = qs.get('coverColor');
  if (urlCover) {
    document.documentElement.style.setProperty('--cover-color', urlCover);
  }
  if (urlBreak || urlSwap) {
    manifest = { ...manifest, defaults: { ...(manifest.defaults || {}) } };
    if (urlBreak) manifest.defaults.breakStyle = urlBreak;
    if (urlSwap)  manifest.defaults.swapStyle  = urlSwap;
  }
  const activeBreak = manifest.defaults?.breakStyle || 'dolly';
  const activeSwap  = manifest.defaults?.swapStyle  || 'cover';
  console.log('%c[motion] active cadence', 'color:#E27730;font-weight:600',
              '— breakStyle=' + activeBreak + ', swapStyle=' + activeSwap +
              ', coverColor=' + (urlCover || manifest.coverColor || 'default'));

  // Editorial theme / preset / position configuration. Layer 2 of the
  // override order (L1 = runtime defaults, L3 = per-beat step.* fields).
  // Manifest shape — all fields optional, merged over tutorial-default:
  //   "editorial": {
  //     "theme": "tutorial-default" | "mode-c",
  //     "fonts":    { "display": "...", "body": "..." },
  //     "presets":  { "<verb>": "<preset-name>" },
  //     "positions":{ "<verb>": { left/right/top/bottom/transform } }
  //   }
  try {
    const { configureEditorial } = await import('./animate-text.js');
    configureEditorial(manifest.editorial || { theme: 'tutorial-default' });
  } catch (e) { console.warn('[editorial] configure failed', e); }

  // Preload the first snapshot behind the intro/teaser so the iframe is
  // already built when the first chapter's camera moves. Matches player.js.
  const primary = manifest.primarySnapshot || descriptors[0]?.snapshot;
  if (primary) {
    await bootSnapshot(primary, {
      prep: descriptors[0]?.snapshot === primary ? descriptors[0].prep : undefined,
      videoTitle,
    });
  }

  const anyNarr = descriptors.some(d => d.narration || (d.steps || []).some(s => s.narration));
  await waitForStartClick(label, {
    onClick: () => { initSfx(); if (anyNarr || manifest?.intro) {
        const bgmOpts = (manifest?.bgm && typeof manifest.bgm === 'object') ? manifest.bgm : {};
        startBGM(bgmOpts);
      } },
  });

  if (manifest?.intro) {
    const introCard = playTitleCard({
      role: 'intro',
      variant: manifest.intro.variant ?? null,
      logo: manifest.intro.logo ?? { kind: 'video', src: '/assets/logo-animated.mp4' },
      eyebrow: manifest.intro.eyebrow ?? '',
      title: manifest.intro.title ?? '',
      subtitleHTML: manifest.intro.subtitleHTML ?? manifest.intro.subtitle ?? '',
      subtitleVariants: manifest.intro.subtitleVariants ?? null,
      cta: manifest.intro.cta ?? '',
      pill: manifest.intro.pill ?? null,
      wordmark: manifest.intro.wordmark ?? null,
      sullie: manifest.intro.sullie ?? null,
      sullieFallback: manifest.intro.sullieFallback ?? null,
      meta: manifest.intro.meta ?? null,
      hold: manifest.intro.hold ?? 3.5,
    });

    // Mount pre-teaser cream cover BEFORE the intro dismisses, so there's
    // no one-frame gap between "intro gone" and "teaser mounted" where the
    // raw iframe would flash through. Ported from player.js.
    if (manifest.postIntro) {
      const pre = document.createElement('div');
      pre.className = 'fade-cover cream on prepostintro';
      pre.style.cssText = 'z-index: 595; opacity: 1; transition: none;';
      document.body.appendChild(pre);
    } else if (manifest.teaser) {
      const pre = document.createElement('div');
      pre.className = 'fade-cover cream on preteaser';
      pre.style.cssText = 'z-index: 595; opacity: 1; transition: none;';
      document.body.appendChild(pre);
    }
    await introCard;
  }

  if (manifest?.postIntro) {
    await playCinematic(manifest.postIntro, {
      playNarration,
      onMounted: (handle) => awaitPostIntroReady(handle?.root)
        .then(() => document.querySelector('.fade-cover.cream.prepostintro')?.remove()),
    });
    frameDriver.clear();
    if (new URLSearchParams(location.search).get('debug') === '1') {
      frameDriver.assertRegistryEmpty('postIntro teardown');
    }
  }

  // Teaser (entry screen) — e.g. dual-path. Runs between intro and chapters.
  if (manifest?.teaser) {
    const teaser = await loadTeaser(manifest.teaser);
    if (teaser) {
      const t = await teaser.mount(manifest.teaserOpts || {});
      // Teaser overlay sits above the pre-cover; drop pre-cover now that the
      // teaser is visible (teaser covers everything).
      document.querySelector('.fade-cover.cream.preteaser')?.remove();
      // Watermark goes on AFTER teaser mounts — it rides on top during play
      // and stays visible across every chapter/snapshot swap.
      setWatermarkEnabled(true);
      if (manifest.teaserNarration) {
        const { ended } = await playNarration(manifest.teaserNarration);
        await Promise.all([t.animPromise, ended]);
      } else {
        await t.animPromise;
      }
      // Mount cream cover above teaser before dismissing — keeps the viewer
      // from seeing the bare page during teardown. The first chapter's
      // bootSnapshot body-wipe will clear this cover; its own z:999
      // flashguard cover takes over instantly.
      const handoff = document.createElement('div');
      handoff.id = 'teaser-handoff';
      handoff.style.cssText =
        'position:fixed;inset:0;z-index:650;background:var(--cover-color, #FAF6EF);' +
        'opacity:1;pointer-events:none;';
      document.body.appendChild(handoff);
      await sleep(420);
      await t.dismiss();
      await sleep(120);
    }
  } else {
    setWatermarkEnabled(true);
  }

  document.body.classList.add('with-stage-chrome');
  let result;
  try {
    result = await runChapters(descriptors, {
      initialSnapshot: primary,
      defaults: manifest.defaults || {},
      hud: manifest.hud !== false,
    });
  } finally {
    frameDriver.clear();
  }

  // Outro sequence (ported from player.js): cream cover over the iframe
  // first, then unmount watermark under it, then play the outro card on top.
  // Cover STAYS after outro — never remove it, or the raw iframe flashes
  // back in during the BGM fade and the "scene done" idle state.
  mountCover({ id: 'outro-cover' });
  unmountWatermark();
  await sleep(700);

  if (manifest?.outro) {
    document.body.classList.remove('with-stage-chrome');
    await playTitleCard({
      role: 'outro',
      variant: manifest.outro.variant ?? null,
      logo: manifest.outro.logo ?? { kind: 'image', src: '/assets/wpforms-logo.png' },
      eyebrow: manifest.outro.eyebrow ?? 'Thanks for watching',
      title: manifest.outro.title ?? '',
      subtitleHTML: manifest.outro.subtitleHTML ?? manifest.outro.subtitle ?? '',
      subtitleVariants: manifest.outro.subtitleVariants ?? null,
      cta: manifest.outro.cta ?? null,
      pill: manifest.outro.pill ?? null,
      url: manifest.outro.url ?? null,
      wordmark: manifest.outro.wordmark ?? null,
      sullie: manifest.outro.sullie ?? null,
      sullieFallback: manifest.outro.sullieFallback ?? null,
      meta: manifest.outro.meta ?? null,
      signoff: manifest.outro.signoff ?? null,
      hold: manifest.outro.hold ?? 3.4,
    });
  }
  await stopBGM(1500);
  frameDriver.stop();
  return result;
}
