// tools/transition-qc.js
// Phase 0 QC harness: play a video end-to-end in Playwright, record a WebM,
// log every snapshot-swap / chapter-break moment from the page's console
// breadcrumbs, then dump the wall-clock seconds of each event so ffmpeg can
// extract frames around the seams.
//
// Usage: node tools/transition-qc.js <slug>
// Output:
//   tools/qc-out/<slug>/recording.webm
//   tools/qc-out/<slug>/events.json
//   tools/qc-out/<slug>/console.log

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const slug = process.argv[2];
if (!slug) { console.error('usage: node tools/transition-qc.js <slug>'); process.exit(1); }

const PORT = 4321;
const OUT = path.resolve('tools/qc-out', slug);

async function ensureServer() {
  // Try a probe; if not up, spawn serve.js.
  try {
    const r = await fetch(`http://localhost:${PORT}/`);
    if (r.ok || r.status === 404) return null;
  } catch (_) {}
  console.log('[qc] starting serve.js');
  const child = spawn(process.execPath, ['serve.js'], { stdio: 'ignore', detached: true });
  await new Promise(r => setTimeout(r, 1500));
  return child;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await ensureServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();

  const events = [];
  const consoleLog = [];
  const t0 = Date.now();
  const wallclock = () => (Date.now() - t0) / 1000;

  page.on('console', msg => {
    const text = msg.text();
    consoleLog.push({ t: wallclock(), type: msg.type(), text });
    // Tag interesting events
    const lower = text.toLowerCase();
    if (
      lower.includes('transition') ||
      lower.includes('swap') ||
      lower.includes('chapter-break') ||
      lower.includes('zoomto') ||
      lower.includes('chapter') ||
      lower.includes('postintro') ||
      lower.includes('snapshot')
    ) {
      events.push({ t: wallclock(), text });
    }
  });

  page.on('pageerror', err => {
    consoleLog.push({ t: wallclock(), type: 'pageerror', text: err.message });
  });

  // Auto-click the start gate the moment it appears.
  await page.addInitScript(() => {
    const tryAutoStart = () => {
      const btn = document.querySelector('[data-start-gate], .start-gate-btn, button.start, .play-button');
      if (btn) { btn.click(); return true; }
      // Also attempt any visible button containing "play" / "start"
      for (const b of document.querySelectorAll('button')) {
        const t = (b.textContent || '').toLowerCase();
        if (t.includes('play') || t.includes('start')) { b.click(); return true; }
      }
      return false;
    };
    const id = setInterval(() => { if (tryAutoStart()) clearInterval(id); }, 200);
    setTimeout(() => clearInterval(id), 30000);
  });

  const url = `http://localhost:${PORT}/scenes/player.html?video=${slug}`;
  console.log(`[qc] navigating: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Listen for chapter-done / chapter-failed postMessages.
  await page.evaluate(() => {
    window.__qcMessages = [];
    window.addEventListener('message', e => {
      try {
        if (e.data && typeof e.data === 'object' && e.data.kind) {
          window.__qcMessages.push({ t: performance.now(), ...e.data });
        }
      } catch (_) {}
    });
  });

  // Hard cap: 5 minutes. Most tutorials are well under that.
  const HARD_CAP_MS = 5 * 60 * 1000;
  const start = Date.now();

  // Poll for completion: video is "done" when the last chapter posts
  // chapter-done OR an error occurs OR we hit the cap.
  let done = false;
  while (!done && (Date.now() - start) < HARD_CAP_MS) {
    await new Promise(r => setTimeout(r, 1000));
    const msgs = await page.evaluate(() => window.__qcMessages || []);
    if (msgs.some(m => m.kind === 'video-done' || m.kind === 'outro-done')) done = true;
    if (msgs.some(m => m.kind === 'chapter-failed')) {
      consoleLog.push({ t: wallclock(), type: 'qc', text: 'chapter-failed received, stopping' });
      done = true;
    }
  }

  await page.close();
  await context.close();
  await browser.close();

  // Find the recorded webm.
  const fs = await import('node:fs/promises');
  const dirents = await fs.readdir(OUT);
  const webm = dirents.find(f => f.endsWith('.webm'));
  if (webm && webm !== 'recording.webm') {
    await fs.rename(path.join(OUT, webm), path.join(OUT, 'recording.webm'));
  }

  await writeFile(path.join(OUT, 'events.json'), JSON.stringify({
    slug, totalSeconds: wallclock(), events,
  }, null, 2));
  await writeFile(path.join(OUT, 'console.log'), consoleLog.map(l => `[${l.t.toFixed(2)}s][${l.type}] ${l.text}`).join('\n'));

  console.log(`[qc] done. ${events.length} tagged events, ${consoleLog.length} console lines.`);
  console.log(`[qc] output: ${OUT}`);

  if (server) {
    try { process.kill(-server.pid); } catch (_) {}
  }
}

main().catch(err => { console.error(err); process.exit(1); });
