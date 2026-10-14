// narration-mix.js — narration clips at their cue times + a low, side-chain-ducked music bed,
// muxed onto a silent render. Used by tools/render.js for films with no sfx/plan.json
// (tutorials, real-UI shorts).
//
// The filtergraph and constants are copied from tools/render-singlehtml-audio.js (buildFilter,
// DUCK, LIMIT), which keeps its own copy until tools/render.js replaces it. Bed level rulings
// and their measurements are in that file's header: 0.17 default (shorts), 0.12 for long-form.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DUCK = { threshold: 0.025, ratio: 8, attack: 15, release: 350 };
const LIMIT = 0.95;

function buildFilter(clips, DUR, hasBgm, bgmIdx, bgmVolume) {
  const clipCount = clips.length;
  if (clipCount === 0 && !hasBgm) return { fc: null, outLabel: null };
  let fc = '';
  let narr = null;
  if (clipCount >= 1) {
    for (let i = 0; i < clipCount; i++) {
      const ms = Math.round(clips[i].t * 1000);
      fc += `[${i + 1}:a]adelay=${ms}|${ms},apad=whole_dur=${DUR}[a${i}];`;
    }
    if (clipCount === 1) {
      narr = 'a0';
    } else {
      for (let i = 0; i < clipCount; i++) fc += `[a${i}]`;
      fc += `amix=inputs=${clipCount}:normalize=0:duration=longest[narr];`;
      narr = 'narr';
    }
  }
  const d = `threshold=${DUCK.threshold}:ratio=${DUCK.ratio}:attack=${DUCK.attack}:release=${DUCK.release}`;
  if (clipCount >= 1 && hasBgm) {
    fc += `[${narr}]asplit=2[narrA][narrSC];`;
    fc += `[${bgmIdx}:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,volume=${bgmVolume}[bglow];`;
    fc += `[bglow][narrSC]sidechaincompress=${d}[bgduck];`;
    fc += `[narrA][bgduck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=${LIMIT}[aout]`;
    return { fc, outLabel: 'aout' };
  }
  if (clipCount >= 1) {
    fc += `[${narr}]alimiter=limit=${LIMIT}[aout]`;
    return { fc, outLabel: 'aout' };
  }
  fc += `[${bgmIdx}:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,volume=${bgmVolume},alimiter=limit=${LIMIT}[aout]`;
  return { fc, outLabel: 'aout' };
}

// clips: [{ file, t }] (absolute mp3 paths, cue seconds). bgm: absolute path or null.
// Returns the ffmpeg exit status.
function mixNarration({ videoIn, out, clips, DUR, bgm, bgmVolume }) {
  const inputs = ['-i', videoIn];
  clips.forEach((c) => inputs.push('-i', c.file));
  if (bgm) inputs.push('-i', bgm);
  const { fc, outLabel } = buildFilter(clips, DUR, !!bgm, clips.length + 1, bgmVolume);
  const args = ['-y', '-hide_banner', '-loglevel', 'error', ...inputs];
  let script = null;
  if (fc) {
    script = path.join(os.tmpdir(), `narration-mix-${process.pid}.txt`); // avoids Windows command-length limits
    fs.writeFileSync(script, fc);
    args.push('-filter_complex_script', script, '-map', '0:v', '-map', `[${outLabel}]`, '-c:a', 'aac', '-b:a', '192k');
  } else {
    args.push('-map', '0:v', '-an');
  }
  args.push('-c:v', 'copy', '-movflags', '+faststart', '-t', String(DUR), out);
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (script) fs.rmSync(script, { force: true });
  return r.status;
}

module.exports = { buildFilter, mixNarration, DUCK, LIMIT };
