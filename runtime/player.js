// Video player — orchestrates intro → chapters → outro based on a manifest.
// Input: videos/<slug>/manifest.json + videos/<slug>/chapters/*.js + narration/
// Output: a playable page. Record with OBS / ffmpeg for mp4.

import {
  runScene, cursor, sleep, type,
  zoomTo, highlight, clearHighlights, pointer as ptrOverlay, spotlight,
} from '../engine/engine.js';
import {
  revealSection, toggleControl, selectDropdown,
  duplicateBlock, showPrompt, collapseBlock, toggleBlockActive,
} from '../engine/wpforms.js';
import { focusOn, cursor as richCursor } from '../engine/interactions.js';
import {
  loadSnapshot as _loadSnapshot, startBGM, stopBGM, playNarration, setNarrationBase,
  setNarrationSpeed, setNarrationVolume, mountMeshBg, mountWatermark,
} from '../scenes/shared.js';
import { initSfx, playType } from './sfx.js';
import { popOut } from './pop-out.js';
import { focusPull } from './focus-pull.js';
import { playCinematic } from './cinematic-runner.js';
import { runChapterBreak, runSwapTransition } from './transitions.js';
import { installFlashGuard, removeFlashGuard, preloadSnapshot, commitPreloadedSnapshot } from './scene-helpers.js';
import { installOverlayStyles } from '../engine/overlays-layer.js';
import { diag } from '../engine/diag.js';

// Run the per-snapshot sanitize pass (if present) on the current iframe doc.
// Swallows missing modules — sanitize is opt-in per snapshot.
async function applySanitize(slug) {
  try {
    const mod = await import(`../sanitize/${slug}.js`);
    const doc = document.querySelector('iframe.ui')?.contentDocument;
    if (doc && mod.default) mod.default(doc);
  } catch (e) {
    if (!String(e).includes('Failed to fetch') && !String(e).includes('dynamically imported')) {
      console.warn(`[sanitize] ${slug}`, e);
    }
  }
}

async function loadSnapshot(slug) {
  await _loadSnapshot(slug);
  await applySanitize(slug);
}
import { playTitleCard } from './title-card.js';
import * as frameDriver from './frame-driver.js';
import * as pauseManager from './pause-manager.js';
import { resolveCameraPose } from './camera-poses.js';

// ────────────────────────────────────────────────────────────────────────────
// Chrome mounting (mesh bg, Mac frame, watermark)
// ────────────────────────────────────────────────────────────────────────────
function ensurePlayerStylesheet() {
  if (document.getElementById('player-css')) return;
  const link = document.createElement('link');
  link.id = 'player-css';
  link.rel = 'stylesheet';
  link.href = '/runtime/player.css';
  document.head.appendChild(link);
}

function mountStageChrome(title) {
  document.body.classList.add('with-stage-chrome');
  if (!document.querySelector('.mac-frame')) {
    const f = document.createElement('div');
    f.className = 'mac-frame';
    document.body.appendChild(f);
  }
  if (!document.querySelector('.mac-chrome')) {
    const c = document.createElement('div');
    c.className = 'mac-chrome';
    c.innerHTML = `
      <div class="tl r"></div><div class="tl y"></div><div class="tl g"></div>
      <div class="title">${title || 'WPForms'}</div>
    `;
    document.body.appendChild(c);
  }
}

function mountCover({ cream = true, z = 650 } = {}) {
  const c = document.createElement('div');
  c.className = 'fade-cover' + (cream ? ' cream' : '');
  c.style.zIndex = z;
  document.body.appendChild(c);
  requestAnimationFrame(() => c.classList.add('on'));
  return c;
}
async function dropCover(c, ms = 500) {
  c.classList.remove('on');
  await sleep(ms);
  c.remove();
}

async function waitForStartClick(label = '▶ Start') {
  const g = document.createElement('div');
  g.className = 'start-gate';
  g.innerHTML = `<button class="start-btn">${label}</button>`;
  document.body.appendChild(g);
  await new Promise(r => g.addEventListener('click', r, { once: true }));
  return g;
}
async function exitStartGate(g) {
  g.classList.add('exit');
  await sleep(500);
  g.remove();
}

async function transitionSnapshots(newSlug, setupFn, videoTitle, swapStyle) {
  if (swapStyle === 'flipBridge') {
    diag('player', 'transitionSnapshots → flipBridge slug=' + newSlug);
    const preloaded = await preloadSnapshot(newSlug, { prep: setupFn });
    if (preloaded) {
      mountMeshBg();
      mountStageChrome(videoTitle);
      mountWatermark();
      installOverlayStyles();
      diag('overlays', 'styles installed (transitionSnapshots flipBridge branch)');
      await commitPreloadedSnapshot(preloaded, { preserveCamera: true });
      return;
    }
  }
  // Stage 5b-1.6: when a `swapStyle` is supplied (URL `?swapStyle=…` or
  // `manifest.defaults.swapStyle`), route through `runSwapTransition` so the
  // viewer gets the requested visual treatment (cover|fast|morph|push|whip)
  // instead of the paper-cover hardfix. The inner `doSwap` mirrors the
  // chapter-runner.js path (`runtime/scene-helpers.swapSnapshot`):
  //   1. installFlashGuard — a <style> in <head> that survives the body-wipe
  //      done by engine.loadSnapshot. Hides iframe + chrome + mesh until
  //      removeFlashGuard fires, so any cover the swap style mounts inside
  //      runSwapTransition is backed up by a head-level CSS guard.
  //   2. loadSnapshot + applySanitize (loadSnapshot wraps both).
  //   3. mountMeshBg / mountStageChrome / mountWatermark — re-mount chrome
  //      after the body-wipe.
  //   4. setupFn — chapter setup runs UNDER the cover (setup-under-cover
  //      invariant preserved).
  //   5. removeFlashGuard — safe to reveal the new iframe; runSwapTransition
  //      handles the cover fade-out and incoming iframe fade-in.
  if (swapStyle) {
    diag('player', 'transitionSnapshots → runSwapTransition style=' + swapStyle + ' slug=' + newSlug);
    const doSwap = async () => {
      installFlashGuard();
      await loadSnapshot(newSlug);
      mountMeshBg();
      mountStageChrome(videoTitle);
      mountWatermark();
      // Slice 5c-1: re-install designed overlay styles after every body-wipe.
      // engine.loadSnapshot wipes body, but the <style id="overlays-layer-css">
      // we inject lives in <head> and survives — call is idempotent. Without
      // this call on the player.js path, highlights fall back to the engine
      // default plain-orange ring + dark vignette + filled-orange label.
      installOverlayStyles();
      diag('overlays', 'styles installed (transitionSnapshots swapStyle branch)');
      if (setupFn) await setupFn();
      removeFlashGuard();
    };
    await runSwapTransition(swapStyle, doSwap);
    return;
  }

  // Legacy paper-cover hardfix path. Preserved as the default when no
  // swapStyle is configured, so videos that did not set
  // `manifest.defaults.swapStyle` (or pass `?swapStyle=`) keep their
  // current visual behavior.
  const cover = mountCover({ cream: true, z: 900 });
  await sleep(320);
  await loadSnapshot(newSlug);
  mountMeshBg();
  mountStageChrome(videoTitle);
  mountWatermark();
  // Slice 5c-1: same call after the legacy paper-cover body-wipe.
  installOverlayStyles();
  diag('overlays', 'styles installed (transitionSnapshots legacy branch)');
  if (setupFn) await setupFn();
  await sleep(180);
  await dropCover(cover, 520);
}

async function typeWithSfx(target, text, opts = {}) {
  const doc = document.querySelector('iframe.ui')?.contentDocument;
  const el = doc?.querySelector(target);
  const tick = () => playType();
  el?.addEventListener('input', tick, true);
  try {
    await type(target, text, opts);
  } finally {
    el?.removeEventListener('input', tick, true);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Beat context — what each chapter's effect() receives.
// All engine + wpforms helpers flow through here so chapter modules don't import.
// ────────────────────────────────────────────────────────────────────────────
const BASE_CTX_FACTORY = (extra = {}) => (engineCtx) => ({
  ...engineCtx,                 // doc, cursor, sleep, type, clearSpot, zoomTo
  type: typeWithSfx,
  cursor: richCursor,           // semantic verbs: clickOn/toggle/parkAt/…
  focusOn,
  highlight,
  clearHighlights,
  clearLabels: () => clearHighlights({ fadeOut: 200 }),
  // wpforms helpers
  revealSection, toggleControl, selectDropdown,
  duplicateBlock, showPrompt, collapseBlock, toggleBlockActive,
  // motion-library verbs
  popOut, focusPull,
  ...extra,                     // waitAt for audio-cued mode, etc.
});

// Wrap beat effects so they receive our enriched context on top of whatever
// engine.runScene passes in.
function wrapBeats(beats, ctxBuilder) {
  return beats.map(b => {
    const camera = resolveCameraPose(b.camera) || b.camera;
    return b.effect
      ? { ...b, camera, effect: (engineCtx) => b.effect(ctxBuilder(engineCtx)) }
      : { ...b, camera };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Audio-cued helper: makes a waitAt(t) bound to a specific narration clip.
// ────────────────────────────────────────────────────────────────────────────
function makeWaitAt(audio) {
  return (t) => new Promise(resolve => {
    if (audio.currentTime >= t) return resolve();
    const tick = () => {
      if (audio.currentTime >= t || audio.ended) {
        audio.removeEventListener('timeupdate', tick);
        resolve();
      }
    };
    audio.addEventListener('timeupdate', tick);
    const id = setInterval(() => {
      if (audio.currentTime >= t || audio.ended) { clearInterval(id); tick(); }
    }, 80);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Per-beat-narration runner (each beat carries its own narration slug).
// Mirrors shared.js's runBeatsSequential but injects our enriched context.
// ────────────────────────────────────────────────────────────────────────────
async function runBeatsPerNarration(beats, ctxBuilder) {
  const doc = () => document.querySelector('iframe.ui').contentDocument;

  for (let bi = 0; bi < beats.length; bi++) {
    const beat = beats[bi];
    const isLast = bi === beats.length - 1;
    await clearHighlights({ fadeOut: 180 });

    const narr = beat.narration ? await playNarration(beat.narration, { keepDucked: !isLast }) : null;

    const cam = resolveCameraPose(beat.camera) || {};
    if (cam.focus) {
      await zoomTo(Array.isArray(cam.focus) ? cam.focus : [cam.focus], {
        level:    cam.level ?? 2.2,
        pad:      cam.pad   ?? 14,
        smooth:   true,
        noScroll: cam.noScroll ?? false,
        scrollBehavior: 'smooth',
      });
    }

    let spotHandle = beat.spotlight ? await spotlight(beat.spotlight) : null;
    const clearSpot = async () => { if (spotHandle) { await spotHandle(); spotHandle = null; } };

    for (const o of (beat.overlays || [])) {
      if (o.pointer)         await ptrOverlay(o.pointer, { direction: o.direction || 'down', label: o.label, size: o.size, gap: o.gap });
      else if (o.highlights) await highlight(o.highlights, { label: o.label, pad: o.pad ?? 10 });
      else if (o.highlight)  await highlight([o.highlight], { label: o.label, pad: o.pad ?? 10 });
    }

    if (beat.labelDwell) await sleep(beat.labelDwell * 1000);

    if (beat.effect) {
      if (!beat.keepLabels) await clearHighlights();
      const engineCtx = { doc: doc(), cursor, type, sleep, clearSpot, zoomTo };
      await beat.effect(ctxBuilder(engineCtx));
    }

    if (narr) await narr.ended;
    if (beat.postHold ?? 0.15) await sleep((beat.postHold ?? 0.15) * 1000);

    await clearSpot();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Chapter runner — dispatches on mode.
// ────────────────────────────────────────────────────────────────────────────
async function runChapter(chapterModule, { videoTitle, prevSnapshot, swapStyle, onAfterSetup }) {
  const {
    snapshot, mode = 'per-beat-narration', narration, setup,
    default: beats,
  } = chapterModule;

  // Bespoke scene treatments (e.g. the v3 hero-transform chapter) need to
  // trigger a snapshot swap from inside an effect, not only at chapter
  // boundaries. Expose the runner's private transitionSnapshots + tracking
  // state through ctx so the effect can coordinate the swap with its own
  // overlay choreography (sweep, cover handoff, etc).
  const baseBuilder = BASE_CTX_FACTORY({
    swapToSnapshot: async (newSlug, { setup: setupFn } = {}) => {
      if (!newSlug || newSlug === prevSnapshot.current) return;
      await transitionSnapshots(newSlug, setupFn, videoTitle, swapStyle);
      prevSnapshot.current = newSlug;
    },
  });

  // Snapshot swap if chapter requests a different one
  let setupRanDuringTransition = false;
  if (snapshot && snapshot !== prevSnapshot.current) {
    await transitionSnapshots(snapshot, setup ? async (targetDoc = null) => {
      const doc = targetDoc || document.querySelector('iframe.ui')?.contentDocument;
      if (doc) await setup(baseBuilder({ doc, cursor, sleep, type, clearSpot: () => {}, zoomTo }));
      setupRanDuringTransition = true;
    } : null, videoTitle, swapStyle);
    prevSnapshot.current = snapshot;
  }

  // One-time DOM seeding — receives the same enriched context as effects.
  if (setup && !setupRanDuringTransition) {
    const doc = document.querySelector('iframe.ui')?.contentDocument ?? null;
    await setup(baseBuilder({ doc, cursor, sleep, type, clearSpot: () => {}, zoomTo }));
  }

  // Stage 7: chapter-mode postIntro flash guard.
  // Setup has run (or was run during transition); the chapter has had its
  // chance to mount any covering editorial layers. Now safe to drop a
  // pre-first-chapter cover the boot path may have installed.
  if (typeof onAfterSetup === 'function') {
    try { onAfterSetup(); } catch (_) {}
  }

  if (mode === 'editorial') {
    const beatsList = Array.isArray(beats) ? beats : [];
    for (const beat of beatsList) {
      if (beat.effect) {
        const engineCtx = {
          doc: document.querySelector('iframe.ui')?.contentDocument ?? null,
          cursor,
          type,
          sleep,
          clearSpot: () => {},
          zoomTo,
        };
        await beat.effect(baseBuilder(engineCtx));
      }
      if (beat.duration) await sleep(beat.duration * 1000);
    }
    return;
  }

  if (mode === 'parallel') {
    if (narration) {
      const { ended } = await playNarration(narration);
      await runScene(wrapBeats(beats, baseBuilder));
      await ended;
    } else {
      // Silent parallel — beats advance on their own durations.
      await runScene(wrapBeats(beats, baseBuilder));
    }
    return;
  }

  if (mode === 'audio-cued') {
    if (!narration) throw new Error(`audio-cued chapter missing \`narration\``);
    const { audio, ended } = await playNarration(narration);
    const waitAt = makeWaitAt(audio);
    const builder = BASE_CTX_FACTORY({ waitAt });
    await runScene(wrapBeats(beats, builder));
    await ended;
    return;
  }

  if (mode === 'per-beat-narration') {
    await runBeatsPerNarration(beats, baseBuilder);
    return;
  }

  throw new Error(`unknown chapter mode: ${mode}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Teaser loader — dynamic import based on manifest.teaser name.
// ────────────────────────────────────────────────────────────────────────────
async function loadTeaser(name) {
  if (!name) return null;
  const mod = await import(`./teaser-${name}.js`);
  return mod;
}

// ────────────────────────────────────────────────────────────────────────────
// Main: play a video by slug
// ────────────────────────────────────────────────────────────────────────────
export async function playVideo(slug) {
  ensurePlayerStylesheet();
  frameDriver.start();

  const base = `/videos/${slug}/`;
  const manifest = await fetch(base + 'manifest.json').then(r => r.json());
  const surface = manifest.surface || 'iframe';
  document.body.dataset.surface = surface;
  document.body.classList.toggle('surface-editorial', surface === 'editorial');
  document.body.classList.toggle('surface-mixed', surface === 'mixed');
  if (manifest.coverColor) {
    document.documentElement.style.setProperty('--cover-color', manifest.coverColor);
  }
  setNarrationBase(base + 'narration/');
  setNarrationSpeed(manifest.narrationSpeed ?? 1);
  setNarrationVolume(manifest.narrationVolume ?? 1);

  // Stage 5b-1.7: URL overrides are kept SEPARATE from manifest.defaults so
  // per-chapter `export const breakStyle` / `export const swapStyle` are not
  // silently shadowed when the URL is unset. Resolution order at each chapter
  // boundary is:
  //   1. URL override (`?breakStyle=` / `?swapStyle=`) — QC/lab debug knob
  //   2. incoming chapter export — author intent
  //   3. manifest.defaults.<style>                     — video-wide default
  //   4. runtime default ('dolly' / null=paper-cover)  — engine fallback
  const _qs = new URLSearchParams(location.search);
  const urlOverrides = {
    breakStyle: _qs.get('breakStyle') || null,
    swapStyle:  _qs.get('swapStyle')  || null,
  };
  diag('player', 'cadence break=' +
      (urlOverrides.breakStyle ? 'URL:' + urlOverrides.breakStyle :
       (manifest.defaults?.breakStyle ? 'manifest:' + manifest.defaults.breakStyle : 'per-chapter|default')) +
    ' swap=' +
      (urlOverrides.swapStyle ? 'URL:' + urlOverrides.swapStyle :
       (manifest.defaults?.swapStyle ? 'manifest:' + manifest.defaults.swapStyle : 'per-chapter|default')));

  // QC chapter-scope. `?chapter=<name>` (or comma-separated) trims the
  // chapter list to just those entries, skips intro/teaser/outro, and
  // jumps straight into the camera. The match is exact against
  // manifest.chapters (slugs as written by the compiler).
  const qcChapter = new URLSearchParams(location.search).get('chapter');
  if (qcChapter) {
    const wanted = qcChapter.split(',').map(s => s.trim()).filter(Boolean);
    const trimmed = manifest.chapters.filter(name => wanted.includes(name));
    if (trimmed.length) {
      manifest.chapters = trimmed;
      manifest.intro = null;
      manifest.postIntro = null;
      manifest.teaser = null;
      manifest.outro = null;
    }
  }

  const videoTitle = manifest.intro?.title || manifest.slug;

  // Load first chapter's snapshot so iframe is ready behind the intro/teaser
  const prevSnapshot = { current: null };
  const firstSnapshot = findFirstSnapshot(manifest);
  if (firstSnapshot && surface !== 'editorial') {
    await loadSnapshot(firstSnapshot);
    mountMeshBg();
    if (surface !== 'editorial') mountStageChrome(videoTitle);
    // Slice 5c-1: install designed overlay styles after the boot body-wipe.
    // Mirrors scene-helpers.bootSnapshot. Idempotent — head-level <style>.
    installOverlayStyles();
    diag('overlays', 'styles installed (playVideo boot)');
    prevSnapshot.current = firstSnapshot;
  }

  // Start gate (also primes BGM autoplay + SFX audio-context)
  const gate = await waitForStartClick();
  initSfx();
  if (manifest.bgm !== false) {
    const bgmOpts = (manifest.bgm && typeof manifest.bgm === 'object') ? manifest.bgm : {};
    startBGM(bgmOpts);
  }

  // Intro title card
  if (manifest.intro) {
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
    // Exit start gate once intro is mounted
    await sleep(100);
    await exitStartGate(gate);

    // Mount pre-teaser cover BEFORE the intro dismisses, while the intro is
    // still on top at higher z. This eliminates the one-frame gap between
    // "intro removed" and "teaser mounted" where the iframe would flash.
    // Also kick off teaser module preload in parallel with intro's hold.
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
      playVideo._teaserPreload = loadTeaser(manifest.teaser);
    } else if (Array.isArray(manifest.chapters) && manifest.chapters.length > 0) {
      // Stage 7: chapter-mode postIntro flash guard.
      // No manifest.postIntro and no teaser — the first chapter is the visual
      // entry point (often a video-local chapter-mode postIntro). Without a
      // cover, the snapshot iframe loaded at boot would flash between intro
      // dismiss and the first chapter's first paint. Mount a cover at the
      // same z-layer as the postIntro/teaser pre-covers; runChapter will drop
      // it via onAfterSetup once the first chapter's setup() has run.
      const pre = document.createElement('div');
      pre.className = 'fade-cover cream on prefirstchapter';
      pre.style.cssText = 'z-index: 595; opacity: 1; transition: none;';
      document.body.appendChild(pre);
    }

    await introCard;
  } else {
    await exitStartGate(gate);
  }

  // Phase A.5: smoke milestone — intro/start-gate cleared; the runtime is
  // alive and about to play postIntro/teaser/chapters. Smoke tool gates
  // exit-0 on this flag. PostIntros run 8–15s and tutorial chapters run
  // minutes, so `sceneDone` is impractical for short smoke timeouts;
  // `sceneBooted` answers the real question — "did boot fail or not?"
  document.body.dataset.sceneBooted = 'true';

  if (manifest.postIntro) {
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

  // Optional welcome teaser
  if (manifest.teaser) {
    // Cover already mounted above before intro dismissed. Preload also in
    // flight, so mount is effectively instant here.
    const preCover = document.querySelector('.fade-cover.cream.preteaser')
      || (() => {
        const pre = document.createElement('div');
        pre.className = 'fade-cover cream on preteaser';
        pre.style.cssText = 'z-index: 595; opacity: 1; transition: none;';
        document.body.appendChild(pre);
        return pre;
      })();
    const teaser = await (playVideo._teaserPreload || loadTeaser(manifest.teaser));
    if (teaser) {
      const t = await teaser.mount(manifest.teaserOpts || {});
      // Teaser overlay sits at z:600 above the pre-cover; remove pre-cover
      // immediately — the teaser is already covering everything beneath.
      preCover.remove();
      mountWatermark();
      if (manifest.teaserNarration) {
        const { ended } = await playNarration(manifest.teaserNarration);
        await Promise.all([t.animPromise, ended]);
      } else {
        await t.animPromise;
      }
      // Handoff: cover, then dismiss teaser under it, then drop cover
      const handoff = mountCover({ cream: true, z: 650 });
      await sleep(520);
      await t.dismiss();
      // Cover drops after first chapter has settled its camera
      playVideo._handoffCover = handoff;
    }
  } else {
    mountWatermark();
  }

  // Chapters
  pauseManager.setChapterState({
    index: 0,
    count: manifest.chapters.length,
    names: manifest.chapters,
  });
  for (let i = 0; i < manifest.chapters.length; i++) {
    const seekTarget = pauseManager.consumeSeekTarget();
    if (seekTarget != null) {
      const clamped = Math.max(0, Math.min(manifest.chapters.length - 1, Number(seekTarget) || 0));
      if (clamped !== i) frameDriver.clear();
      i = clamped;
    }
    pauseManager.setChapterState({
      index: i,
      count: manifest.chapters.length,
      names: manifest.chapters,
    });
    const name = manifest.chapters[i];
    const mod = await import(`/videos/${slug}/chapters/${name}.js`);

    // Stage 5b-1.7: resolve break/swap styles per-chapter at the boundary.
    // The incoming chapter (`mod`) owns both:
    //   - breakStyle for same-snapshot boundaries arriving at `mod`
    //   - swapStyle for snapshot-changed boundaries arriving at `mod` AND for
    //     mid-chapter `swapToSnapshot()` calls inside `mod`'s effect
    const breakStyle = urlOverrides.breakStyle
                    ?? mod.breakStyle
                    ?? manifest.defaults?.breakStyle
                    ?? 'dolly';
    const swapStyle = urlOverrides.swapStyle
                    ?? mod.swapStyle
                    ?? manifest.defaults?.swapStyle
                    ?? null;

    if (i > 0) {
      const nextSnap = mod.snapshot ?? prevSnapshot.current;
      if (nextSnap === prevSnapshot.current) {
        await runChapterBreak(breakStyle);
      }
    }

    // Stage 7: pass the prefirstchapter cover-drop to runChapter so it fires
    // right after the chapter's setup() — the editorial layer (if any) is
    // already painted by then, so the cover can fade out cleanly.
    const onAfterSetup = (i === 0)
      ? () => {
          const preFirst = document.querySelector('.fade-cover.cream.prefirstchapter');
          if (!preFirst) return;
          requestAnimationFrame(() => {
            preFirst.style.transition = 'opacity 360ms ease';
            preFirst.style.opacity = '0';
            setTimeout(() => preFirst.remove(), 420);
          });
        }
      : undefined;

    try {
      await runChapter(mod, { videoTitle, prevSnapshot, swapStyle, onAfterSetup });
    } finally {
      frameDriver.clear();
      if (new URLSearchParams(location.search).get('debug') === '1') {
        frameDriver.assertRegistryEmpty(`chapter teardown: ${name}`);
      }
    }

    // Drop the teaser-handoff cover after the first chapter has started
    if (i === 0 && playVideo._handoffCover) {
      dropCover(playVideo._handoffCover, 500);
      playVideo._handoffCover = null;
    }
  }

  try {
    await cursor.hide();
  } catch (e) {
    // Intro/postIntro-only QC slices may never initialize the engine cursor.
    // Chaptered videos still use the normal cursor lifecycle.
  }

  // Outro title card. The warm cream cover belongs to the legacy promo-card
  // outro; editorial-v4 uses an opaque cool-paper background of its own, so
  // the cream flash would clash. Skip the cover for that variant.
  const useLegacyCover = !!manifest.outro && manifest.outro.variant !== 'editorial-v4';
  if (useLegacyCover) {
    const outCover = document.createElement('div');
    outCover.className = 'fade-cover cream';
    document.body.appendChild(outCover);
    requestAnimationFrame(() => outCover.classList.add('on'));
  }
  unmountWatermark();
  await sleep(useLegacyCover ? 700 : 220);

  if (manifest.outro) {
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
      hold: manifest.outro.hold ?? 3.8,
    });
  }

  await stopBGM(1500);
  frameDriver.clear();
  frameDriver.stop();
  document.body.dataset.sceneDone = 'true';
}

function unmountWatermark() {
  const el = document.getElementById('wpf-watermark');
  if (!el) return;
  el.classList.remove('on');
  setTimeout(() => el.remove(), 700);
}

// Stage 5b-1: paint-anchored gate. Resolves when `root` has computed opacity
// >= threshold, non-zero size, and one rAF has committed past that state.
// Hard timeout so a misbehaving cinematic cannot strand the cover. Keep in
// sync with runtime/chapter-runner.js#awaitPostIntroReady.
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

function findFirstSnapshot(manifest) {
  // Intro/teaser don't need the real snapshot, but loading it early means the
  // iframe + frame are already built when the first chapter's camera moves.
  // If manifest declares it, honor; else the first chapter will trigger a swap.
  return manifest.primarySnapshot || null;
}
