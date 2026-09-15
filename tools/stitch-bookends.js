#!/usr/bin/env node
// stitch-bookends.js — avatar intro + film body + avatar outro → one MP4.
//
// Socials avatar track (2026-09-07). Bookends come from tools/avatar-bookends.js,
// the body is the film's own render. Cuts are slide+fade (xfade smoothleft) that
// START after the bookend has finished speaking (a hold of the last frame first),
// audio is per-piece loudnorm'd to -14 LUFS and crossfaded. Optional handheld
// wobble on the bookends for the phone-held look.
//
// Usage:
//   node tools/stitch-bookends.js <slug> [--intro <mp4>] [--outro <mp4>] [--body <mp4>]
//        [--out <mp4>] [--xfade 0.5] [--hold 0.6] [--transition smoothleft] [--handheld] [--lufs -14]
// Defaults: intro/outro = videos/<slug>/bookends/{intro,outro}.mp4,
//           body = videos/<slug>/render/<slug>.mp4, out = videos/<slug>/render/<slug>.avatar.mp4

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

function arg(name, def) { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : def; }
const slug = process.argv[2];
if (!slug || slug.startsWith('--')) { console.error('Usage: node tools/stitch-bookends.js <slug> [--intro f] [--outro f] [--body f] [--out f] [--xfade s] [--hold s] [--transition name] [--handheld] [--lufs n]'); process.exit(1); }
const dir = path.join(ROOT, 'videos', slug);
const intro = path.resolve(ROOT, arg('--intro', path.join(dir, 'bookends', 'intro.mp4')));
const outro = path.resolve(ROOT, arg('--outro', path.join(dir, 'bookends', 'outro.mp4')));
const body = path.resolve(ROOT, arg('--body', path.join(dir, 'render', `${slug}.mp4`)));
const out = path.resolve(ROOT, arg('--out', path.join(dir, 'render', `${slug}.avatar.mp4`)));
const X = parseFloat(arg('--xfade', '0.5'));
const HOLD = parseFloat(arg('--hold', '0.6'));
const TRANS = arg('--transition', 'smoothleft');
const LUFS = arg('--lufs', '-14');
const handheld = process.argv.includes('--handheld');
for (const f of [intro, outro, body]) if (!fs.existsSync(f)) { console.error(`missing: ${f}`); process.exit(1); }

function probe(f, entries) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', entries, '-of', 'csv=p=0', f], { encoding: 'utf8' });
  return r.stdout.trim();
}
const dur = f => parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout);
const [W, H] = probe(body, 'stream=width,height').split(',').map(Number);
for (const f of [intro, outro]) {
  const [w, h] = probe(f, 'stream=width,height').split(',').map(Number);
  if (w !== W || h !== H) { console.error(`${path.basename(f)} is ${w}x${h}, body is ${W}x${H} — run avatar-bookends with the matching --aspect`); process.exit(1); }
}

// Handheld: slow non-harmonic drift + ±0.5° sway, from the UGC research. Applied
// to bookends only; the body stays locked.
const ow = Math.round(W * 1.05), oh = Math.round(H * 1.05);
const wob = `scale=${ow}:${oh},rotate='0.009*sin(2*PI*t*0.37)+0.006*sin(2*PI*t*0.91+1.3)':ow=${ow}:oh=${oh}:c=none,` +
  `crop=${W}:${H}:x='${Math.round((ow - W) / 2)}+14*sin(2*PI*t*0.29)+7*sin(2*PI*t*0.83+0.7)':y='${Math.round((oh - H) / 2)}+18*sin(2*PI*t*0.23+2.1)+9*sin(2*PI*t*0.71)',`;
const v = (i, hold) => `[${i}:v]setpts=PTS-STARTPTS,${handheld && i !== 1 ? wob : ''}${hold ? `tpad=stop_mode=clone:stop_duration=${hold},` : ''}format=yuv420p[v${i}]`;
const a = (i, pad) => `[${i}:a]aresample=48000,${pad ? `apad=pad_dur=${pad},` : ''}loudnorm=I=${LUFS}:TP=-1.5:LRA=11,aformat=channel_layouts=stereo[a${i}]`;

const d0 = dur(intro) + HOLD, d1 = dur(body);
const off1 = (d0 - X).toFixed(3), off2 = (d0 + d1 - 2 * X).toFixed(3);
const fc = [
  v(0, HOLD), v(1, 0), v(2, 0),
  `[v0][v1]xfade=transition=${TRANS}:duration=${X}:offset=${off1}[v01]`,
  `[v01][v2]xfade=transition=${TRANS}:duration=${X}:offset=${off2}[v]`,
  a(0, HOLD), a(1, 0), a(2, 0),
  `[a0][a1]acrossfade=d=${X}[a01]`, `[a01][a2]acrossfade=d=${X}[a]`,
].join(';');

console.log(`stitch-bookends ${slug}\n  intro ${path.relative(ROOT, intro)} (${dur(intro).toFixed(2)}s +${HOLD}s hold)\n  body  ${path.relative(ROOT, body)} (${d1.toFixed(2)}s)\n  outro ${path.relative(ROOT, outro)} (${dur(outro).toFixed(2)}s)\n  ${TRANS} ${X}s at ${off1}s and ${off2}s${handheld ? ', handheld on bookends' : ''} → ${path.relative(ROOT, out)}`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', intro, '-i', body, '-i', outro, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
  '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
const ln = spawnSync('ffmpeg', ['-hide_banner', '-i', out, '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const lufs = (ln.match(/Input Integrated:\s*([-\d.]+)/) || [])[1], tp = (ln.match(/Input True Peak:\s*([-\d.]+)/) || [])[1];
console.log(`done. ${dur(out).toFixed(2)}s, ${lufs} LUFS, peak ${tp} dBTP`);
