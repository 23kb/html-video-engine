#!/usr/bin/env node
// tools/machine-qc.js — ADVISORY semantic QC pass on a rendered MP4 via the
// Gemini API (video understanding). Catches the layer the measured gates
// can't see: cursor missing its click target, text clipping, mojibake in
// rendered frames, narration/visual mismatch, brand violations, missing or
// static Sullie bookends.
//
// What this is NOT:
//   - NOT a merge gate. LLM output is non-deterministic — findings vary run
//     to run. It never sets pass/fail and never affects the dashboard dot.
//     Umair owns visual QC; this pre-screens candidates for his pass.
//   - NOT a freeze/dead-time detector. dead-time.js measures that exactly;
//     the prompt tells the model to skip it.
//
// Sends the render to Google's Files API (third-party upload — Umair
// approved 2026-09-02).
//
// Two passes by default (2026-09-08 "full juice" upgrade — the 1 fps /
// low-res default of the first version could not see motion at all):
//   static  — every frame at --fps (default 24, the API max; the same rate
//             Umair reads references at) and MEDIA_RESOLUTION_HIGH, so
//             one-frame cuts, blinks, pop-ins and cursor paths are in view.
//             fps is clamped so the video part stays under ~700k tokens.
//   agentic — the model navigates the timeline itself (Gemini 3.7 Flash+),
//             re-sampling windows and pulling the transcript/audio on demand.
// Findings from both passes are merged (same category within 1.5 s = one
// finding, tagged with who saw it).
//
// Usage:
//   node tools/machine-qc.js <slug | path.mp4> [--model gemini-3.7-flash]
//        [--mode both|static|agentic] [--fps 24] [--res high|low]
//        [--focus "extra instruction"] [--no-report]
//
// Given a slug, prefers videos/<slug>/<slug>-audio.mp4 (narration muxed in,
// so the narration/visual crosscheck can hear it) over <slug>.mp4.
// Context sent with the video: storyboard.md + narration/*.txt when present.
//
// Writes the `machineQc` section of videos/<slug>/qc-report.json
// (advisory chip on the dashboard). Exit: 0 analysis completed (regardless
// of findings) · 2 usage/infra error.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API = 'https://generativelanguage.googleapis.com';

// Minimal .env loader — no dotenv dependency (same pattern as tts/generate.js).
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
} catch { /* no .env — env var may still be set directly */ }

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { input: null, model: 'gemini-3.7-flash', mode: 'both', fps: 24, res: 'high', focus: null, report: true };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--model') out.model = a[++i];
    else if (a[i] === '--mode') out.mode = a[++i];
    else if (a[i] === '--fps') out.fps = Number(a[++i]);
    else if (a[i] === '--res') out.res = a[++i];
    else if (a[i] === '--focus') out.focus = a[++i];
    else if (a[i] === '--no-report') out.report = false;
    else if (!a[i].startsWith('--') && !out.input) out.input = a[i];
  }
  if (!['both', 'static', 'agentic'].includes(out.mode)) throw new Error(`--mode must be both|static|agentic, got ${out.mode}`);
  if (!['high', 'low'].includes(out.res)) throw new Error(`--res must be high|low, got ${out.res}`);
  if (!(out.fps > 0 && out.fps <= MAX_FPS)) throw new Error(`--fps must be in (0, ${MAX_FPS}] (API limit), got ${out.fps}`);
  return out;
}

const MAX_FPS = 24;                 // API rejects video_metadata.fps > 24 (probed 2026-09-08)
const TOKENS_PER_FRAME = { high: 280, low: 70 };
const VIDEO_TOKEN_BUDGET = 700000;  // keep the static pass well inside the 1M context

// mp4 duration via ffprobe (same probe as dead-time.js); null when unavailable.
function probeDuration(file) {
  const r = require('child_process').spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = r.status === 0 ? parseFloat(r.stdout) : NaN;
  return Number.isFinite(d) ? d : null;
}

// Highest fps (<= requested) whose frame tokens fit the budget for this duration.
function clampFps(requested, duration, res) {
  if (!duration) return requested;
  const fit = Math.floor(VIDEO_TOKEN_BUDGET / (duration * TOKENS_PER_FRAME[res]));
  return Math.max(1, Math.min(requested, fit));
}

function resolveVideo(input) {
  if (/\.mp4$/i.test(input)) {
    const abs = path.resolve(ROOT, input);
    if (!fs.existsSync(abs)) return { err: `mp4 not found: ${input}` };
    return { file: abs, slug: require('./lib/qc-report').slugFromPath(abs) };
  }
  const dir = path.join(ROOT, 'videos', input);
  if (!fs.existsSync(dir)) return { err: `no video folder at videos/${input}` };
  // renders land in videos/<slug>/render/ (render-singlehtml-audio.js, render-frames.js);
  // older films kept them at the folder root.
  for (const cand of [`${input}-audio.mp4`, `${input}.mp4`, `render/${input}-audio.mp4`, `render/${input}.mp4`]) {
    const f = path.join(dir, cand);
    if (fs.existsSync(f)) return { file: f, slug: input };
  }
  return { err: `no render in videos/${input} — expected ${input}{,-audio}.mp4 at the folder root or under render/` };
}

// Storyboard + narration scripts give the model the film's CLAIMS to check
// the footage against. Both optional; capped so a huge storyboard can't
// crowd out the video tokens.
function gatherContext(slug) {
  const parts = [];
  if (!slug) return parts;
  const sb = path.join(ROOT, 'videos', slug, 'storyboard.md');
  if (fs.existsSync(sb)) {
    parts.push(`## Storyboard (what each beat is supposed to show)\n\n${fs.readFileSync(sb, 'utf8').slice(0, 12000)}`);
  }
  const narrDir = path.join(ROOT, 'videos', slug, 'narration');
  if (fs.existsSync(narrDir)) {
    const lines = fs.readdirSync(narrDir).filter(f => f.endsWith('.txt')).sort()
      .map(f => `[${f.replace(/\.txt$/, '')}] ${fs.readFileSync(path.join(narrDir, f), 'utf8').trim()}`);
    if (lines.length) parts.push(`## Narration script (clip key → spoken line)\n\n${lines.join('\n')}`);
  }
  return parts;
}

const CHECKLIST = `You are a QC reviewer for short WPForms product videos (tutorials and ad-style spots built as deterministic HTML films, rendered to MP4). Videos reach you because defects are suspected — be adversarial, not charitable. {{SAMPLING}} For EVERY beat: (a) check each narration/storyboard claim actually appears on screen at that moment, (b) inspect all four frame edges for UI cut off mid-content, (c) check whether animations the storyboard promises actually fire, and how they move. Check specifically:

1. CURSOR/CLICK INTEGRITY — the animated cursor must visually land ON its click target (button, field, menu item) before the UI reacts. Flag clicks that miss, UI that reacts with no cursor near it, or a cursor that teleports.
2. TEXT RENDERING — clipped/overflowing text, truncated labels, garbled characters (mojibake like "â€"" instead of an em dash), typos in on-screen copy, lorem-ipsum placeholders.
3. NARRATION/VISUAL SYNC — if narration is audible or a script is provided: does the footage show what the words claim, at roughly the time they claim it? Flag mismatches (narration names a button/tab/field that never appears or appears much later).
4. BRAND — "WPForms" must be capitalized exactly like that in all rendered text. Primary brand color is orange (#E27730); purple accents are only legitimate on AI features. Flag lowercase "wpforms" in text, or purple used as the primary/dominant brand color on non-AI content.
5. COMPOSITION — the UI element being discussed should be clearly framed (not half off-screen, not tiny in a corner). Flag beats where the subject of the moment is hard to find.
6. VISUAL DEFECTS — blur on UI that should be sharp, low-resolution scaling artifacts, elements popping in/out with no transition, overlapping/z-fighting layers, an obviously broken layout.
7. ENDING — the video should end deliberately (outro/lockup/end state), not cut off mid-motion.
8. MOTION — you have enough frames to see transitions, so judge them: a one- or two-frame flash/blink of a wrong or half-built frame at a cut; an element that appears in one frame with no fade or move where the storyboard promises one; a transition that starts and is cut short before it settles; a cursor that jumps rather than glides, or arrives after the UI already reacted; a camera move that overshoots, jitters, or snaps; two things animating at once that fight for the eye; a storyboard-promised animation that never fires at all. Give timestamps to a tenth of a second.
9. AUDIO — the soundtrack is part of the film: narration that starts before its subject is on screen or lags far behind it; a click sound with no click on screen, or a click with no sound when other clicks had one; music or narration that cuts off abruptly at the end instead of resolving; a stretch where the narration is inaudible under the music; audible glitches, clipping, or a doubled line.

Do NOT report: frozen frames / dead time / pacing (measured by a dedicated frame-diff tool), music taste, or stylistic preferences. Only report things that are wrong, with the timestamp where you saw them.

Severity: "high" = a viewer would notice and lose trust (wrong click, garbled text, narration contradicts footage). "medium" = noticeable on second watch. "low" = minor polish.

If the video is clean, return an empty findings array — do not invent findings.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two or three sentences: overall state of the video.' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          t: { type: 'number', description: 'Timestamp in seconds where the defect is visible' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string', enum: ['cursor', 'text', 'narration-sync', 'brand', 'composition', 'visual-defect', 'ending', 'motion', 'audio', 'other'] },
          finding: { type: 'string', description: 'One sentence: what is wrong' },
          evidence: { type: 'string', description: 'What was seen/heard on screen at that moment' },
        },
        required: ['t', 'severity', 'category', 'finding'],
      },
    },
  },
  required: ['summary', 'findings'],
};

async function api(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${opts && opts.method || 'GET'} ${url.replace(/key=[^&]+/, 'key=***')} → ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res;
}

async function uploadVideo(key, file) {
  const bytes = fs.readFileSync(file);
  const start = await api(`${API}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': 'video/mp4',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: path.basename(file) } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Files API did not return an upload URL');
  const done = await api(uploadUrl, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' },
    body: bytes,
  });
  let info = (await done.json()).file;
  // Poll until the server finishes processing the upload (usually seconds).
  const deadline = Date.now() + 5 * 60 * 1000;
  while (info.state === 'PROCESSING') {
    if (Date.now() > deadline) throw new Error('file stuck in PROCESSING for 5 min');
    await new Promise(r => setTimeout(r, 3000));
    info = await (await api(`${API}/v1beta/${info.name}`, { headers: { 'x-goog-api-key': key } })).json();
  }
  if (info.state !== 'ACTIVE') throw new Error(`file state ${info.state} after upload`);
  return info;
}

// One Gemini pass. pass = { kind: 'static', fps } | { kind: 'agentic' }.
async function analyze(key, model, fileInfo, contextParts, focus, pass, mediaRes) {
  const sampling = pass.kind === 'static'
    ? `You are seeing every frame sampled at ${pass.fps} frames per second plus the full audio track, so sub-second events (a ${(1 / pass.fps).toFixed(2)}s blink, a cursor path, an ease that snaps) are visible to you — inspect them.`
    : 'You can navigate the video yourself: re-sample any window at a higher frame rate and pull the audio or transcript when a beat looks suspicious — do that around every cut, click and transition rather than trusting a single pass.';
  const prompt = [
    CHECKLIST.replace('{{SAMPLING}}', sampling),
    ...contextParts,
    focus ? `## Extra reviewer instruction for this run\n\n${focus}` : null,
  ].filter(Boolean).join('\n\n---\n\n');
  const videoPart = { file_data: { file_uri: fileInfo.uri, mime_type: 'video/mp4' } };
  if (pass.kind === 'static') videoPart.video_metadata = { fps: pass.fps };
  else videoPart.media_processing = 'AGENTIC';
  const res = await api(`${API}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [videoPart, { text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        mediaResolution: mediaRes === 'high' ? 'MEDIA_RESOLUTION_HIGH' : 'MEDIA_RESOLUTION_LOW',
      },
    }),
  });
  const data = await res.json();
  const text = data.candidates && data.candidates[0] && data.candidates[0].content
    && data.candidates[0].content.parts && data.candidates[0].content.parts.map(p => p.text || '').join('');
  if (!text) throw new Error(`no text in response: ${JSON.stringify(data).slice(0, 400)}`);
  // Agentic responses interleave toolCall/toolResponse parts (the navigation
  // trace) before the text — count them so the run can prove it navigated.
  const navSteps = (data.candidates[0].content.parts || []).filter(p => p.toolCall).length;
  return { parsed: JSON.parse(text), usage: data.usageMetadata || {}, navSteps };
}

// Merge findings from both passes: same category within 1.5 s is one defect
// seen twice (the stronger signal); everything else is kept, tagged by pass.
const rank = (s) => ({ low: 1, medium: 2, high: 3 })[s] || 0;
function mergeFindings(lists) {
  const out = [];
  for (const { pass, findings } of lists) {
    for (const f of findings || []) {
      const dup = out.find(o => o.category === f.category && Math.abs(o.t - f.t) <= 1.5 && !o.seenBy.includes(pass));
      if (dup) {
        dup.seenBy.push(pass);
        if (rank(f.severity) > rank(dup.severity)) dup.severity = f.severity;
      } else out.push({ ...f, seenBy: [pass] });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Usage: node tools/machine-qc.js <slug | path.mp4> [--model gemini-3.7-flash] [--mode both|static|agentic] [--fps 24] [--res high|low] [--focus "..."] [--no-report]');
    process.exit(2);
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error('✗ GEMINI_API_KEY not set (checked env + .env)'); process.exit(2); }

  const vid = resolveVideo(args.input);
  if (vid.err) { console.error(`✗ ${vid.err}`); process.exit(2); }
  const sizeMb = (fs.statSync(vid.file).size / 1024 / 1024).toFixed(1);
  const duration = probeDuration(vid.file);
  const fps = clampFps(args.fps, duration, args.res);
  const passes = [];
  if (args.mode !== 'agentic') passes.push({ kind: 'static', fps });
  if (args.mode !== 'static') passes.push({ kind: 'agentic' });
  console.log(`machine QC — ${path.relative(ROOT, vid.file)} (${sizeMb} MB${duration ? `, ${duration.toFixed(1)}s` : ''}, model ${args.model}, ADVISORY)`);
  console.log(`  passes: ${passes.map(p => p.kind === 'static' ? `static @ ${p.fps} fps` : 'agentic').join(' + ')} · media resolution ${args.res}${fps !== args.fps ? ` · fps clamped ${args.fps}→${fps} to fit the token budget` : ''}`);

  const contextParts = gatherContext(vid.slug);
  console.log(`  context: ${contextParts.length ? contextParts.map(p => p.split('\n')[0].replace(/^## /, '')).join(' + ') : 'none (no storyboard/narration found)'}`);

  console.log('  uploading to Gemini Files API…');
  const fileInfo = await uploadVideo(key, vid.file);
  const results = [];
  for (const pass of passes) {
    const t0 = Date.now();
    console.log(`  analyzing (${pass.kind})…`);
    const r = await analyze(key, args.model, fileInfo, contextParts, args.focus, pass, args.res);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`    ${(r.parsed.findings || []).length} finding(s) · ${r.usage.totalTokenCount || 0} tokens${pass.kind === 'agentic' ? ` · ${r.navSteps} navigation step(s)` : ''} · ${secs}s`);
    results.push({ pass: pass.kind, ...r });
  }

  const findings = mergeFindings(results.map(r => ({ pass: r.pass, findings: r.parsed.findings })));
  console.log();
  for (const r of results) console.log(`  [${r.pass}] ${r.parsed.summary}`);
  console.log();
  if (!findings.length) {
    console.log('  no findings.');
  } else {
    for (const f of findings) {
      const who = passes.length > 1 ? ` (${f.seenBy.join('+')})` : '';
      console.log(`  [${fmtT(f.t)}] ${f.severity.toUpperCase().padEnd(6)} ${f.category.padEnd(14)} ${f.finding}${who}${f.evidence ? `\n           ${f.evidence}` : ''}`);
    }
  }
  const high = findings.filter(f => f.severity === 'high').length;
  const totalTokens = results.reduce((n, r) => n + (r.usage.totalTokenCount || 0), 0);
  console.log(`\n  ${findings.length} finding(s) — ${high} high. Advisory only: verify each against the film before acting; the model can hallucinate.`);
  console.log(`  tokens: ${totalTokens} total across ${results.length} pass(es)`);

  if (args.report && vid.slug) {
    const file = require('./lib/qc-report').writeSection(vid.slug, 'machineQc', {
      advisory: true,
      model: args.model,
      mode: args.mode,
      fps: passes.some(p => p.kind === 'static') ? fps : null,
      mediaResolution: args.res,
      tokens: totalTokens,
      video: path.basename(vid.file),
      summary: results.map(r => `[${r.pass}] ${r.parsed.summary}`).join(' '),
      high,
      findings,
    });
    if (file) console.log(`  qc-report updated: ${path.relative(ROOT, file)}`);
  }

  // Delete the upload — no reason to leave renders sitting in Google's file store.
  try { await api(`${API}/v1beta/${fileInfo.name}`, { method: 'DELETE', headers: { 'x-goog-api-key': key } }); } catch { /* expires in 48h anyway */ }
}

main().catch(e => { console.error(`✗ ${e.message}`); process.exit(2); });
