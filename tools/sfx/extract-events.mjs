// SFX pipeline step 1: walk a composition's GSAP timelines headlessly and
// dump every tween/label with GLOBAL timestamps (offset by each scene's
// actual rendered-clip duration, so events line up with the stitched MP4).
//
// Usage: node tools/sfx/extract-events.mjs --video <slug>
// Reads:  videos/<slug>/sfx/scenes.json  [{ slug, legacy?, offset, dur }]
// Writes: videos/<slug>/sfx/events.json
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:4321';

const argv = process.argv.slice(2);
const video = argv[argv.indexOf('--video') + 1];
if (!video || video.startsWith('--')) {
  console.error('Usage: node tools/sfx/extract-events.mjs --video <slug>');
  process.exit(1);
}
const sfxDir = path.resolve('videos', video, 'sfx');
const scenes = JSON.parse(fs.readFileSync(path.join(sfxDir, 'scenes.json'), 'utf8'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const out = { video, extractedAt: null, scenes: [] };

for (const scene of scenes) {
  const url = `${BASE}/videos/${scene.slug}/index.html${scene.legacy ? '?paused' : ''}`;
  await page.goto(url, { waitUntil: 'load' });

  // Ready signals match tools/tmp-stitch-smart-edit.mjs: legacy scenes are
  // ready once the scrubber shows a total; new scenes flag data-scene-booted.
  if (scene.legacy) {
    await page.waitForFunction(() => {
      const t = document.getElementById('time')?.textContent || '';
      return parseFloat(t.split('/')[1]) > 0;
    }, { timeout: 30000 });
  } else {
    await page.waitForSelector('body[data-scene-booted="true"]', { timeout: 30000 });
  }
  // Outwait new-scene autoplay timers so the structure is final.
  await page.waitForTimeout(800);

  const dump = await page.evaluate(() => {
    const CONTROL_KEYS = new Set([
      'duration', 'delay', 'ease', 'repeat', 'repeatDelay', 'yoyo', 'paused',
      'stagger', 'overwrite', 'immediateRender', 'onComplete', 'onStart',
      'onUpdate', 'onRepeat', 'onReverseComplete', 'callbackScope', 'data',
      'id', 'defaults', 'autoRemoveChildren', 'smoothChildTiming', 'parent',
      'targets', 'lazy', 'inherit', 'runBackwards', 'startAt', 'keyframes',
    ]);

    const describeTarget = (t) => {
      if (!t) return 'null';
      if (t.nodeType === 1) {
        const id = t.id ? '#' + t.id : '';
        const cls = (t.classList ? [...t.classList].slice(0, 3) : []).map((c) => '.' + c).join('');
        const text = (t.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        return t.tagName.toLowerCase() + id + cls + (text ? ` "${text}"` : '');
      }
      if (t === window) return 'window';
      try { return 'obj{' + Object.keys(t).slice(0, 4).join(',') + '}'; } catch { return 'obj'; }
    };

    // Same master-timeline heuristic as the full-preview wrapper: the
    // longest root timeline in this window.
    const roots = window.gsap.globalTimeline.getChildren(false, false, true);
    if (!roots.length) return { error: 'no root timelines' };
    const master = roots.reduce((a, b) => (b.duration() > a.duration() ? b : a));

    const tweens = [];
    const labels = [];

    const walk = (tl, start) => {
      if (tl.labels) {
        for (const [name, t] of Object.entries(tl.labels)) labels.push({ t: start + t, name });
      }
      for (const child of tl.getChildren(false, true, true)) {
        const childStart = start + child.startTime() / (tl.timeScale() || 1);
        if (child.getChildren) { walk(child, childStart); continue; }
        const vars = child.vars || {};
        const props = Object.keys(vars).filter((k) => !CONTROL_KEYS.has(k));
        let targets = [];
        try { targets = (child.targets() || []).slice(0, 3).map(describeTarget); } catch {}
        tweens.push({
          t: Math.round(childStart * 1000) / 1000,
          dur: Math.round(child.duration() * 1000) / 1000,
          props,
          ease: typeof vars.ease === 'string' ? vars.ease : undefined,
          targets,
          set: child.duration() === 0 || undefined,
        });
      }
    };
    walk(master, 0);
    tweens.sort((a, b) => a.t - b.t);
    labels.sort((a, b) => a.t - b.t);
    return { masterDuration: master.duration(), tweens, labels };
  });

  if (dump.error) {
    console.error(`[extract] ${scene.slug}: ${dump.error}`);
    process.exitCode = 1;
    continue;
  }

  // Re-base local times to global MP4 time. Events past the declared cut
  // (scenes 2/3 overshoot their cut point) are kept but flagged.
  const globalize = (e) => ({ ...e, t: Math.round((scene.offset + e.t) * 1000) / 1000, cut: e.t > scene.dur ? true : undefined });
  out.scenes.push({
    slug: scene.slug,
    offset: scene.offset,
    dur: scene.dur,
    masterDuration: dump.masterDuration,
    labels: dump.labels.map(globalize),
    tweens: dump.tweens.map(globalize),
  });
  console.log(`[extract] ${scene.slug}: ${dump.tweens.length} tweens, ${dump.labels.length} labels (master ${dump.masterDuration.toFixed(2)}s, cut at ${scene.dur}s)`);
}

await browser.close();
fs.writeFileSync(path.join(sfxDir, 'events.json'), JSON.stringify(out, null, 1));
console.log(`[extract] wrote ${path.join('videos', video, 'sfx', 'events.json')}`);
