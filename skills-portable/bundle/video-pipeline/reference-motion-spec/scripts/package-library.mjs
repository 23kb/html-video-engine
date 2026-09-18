#!/usr/bin/env node
// package-library.mjs — turn a working library (one <clip>-motion-spec folder per clip) into a
// shareable library: neutral ids, names redacted, only the cited strips, no mp4, no full sheets.
//
//   node scripts/package-library.mjs <working-library> --out <skill>/library
//        [--id-prefix ref] [--redact "Name One,Name Two,..."] [--scale 0.67] [--keep-decisions]
//
// Per entry (any folder holding motion-spec.json):
//   copies cuts.json, motion-spec.json, motion-spec.md, brief-*.md, meta.json, audio.json,
//   windows/index.json and ONLY the strips the spec or the ledger cite (as JPEG, scaled by --scale;
//   needs ffmpeg on PATH, falls back to a PNG copy), rewrites meta.source to the new id, replaces
//   every --redact name (whole word, case-insensitive; longest first) with "the brand" in every
//   text file, refuses to write if an absolute path survives in a text file, then re-indexes the
//   packaged folder (catalog.json + examples-by-kind.md) so citations point at the new ids.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const args = { _: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v !== undefined && !v.startsWith('--')) { args[k] = v; i++; } else args[k] = true; }
  else args._.push(a);
}
if (!args._[0] || !args.out) { console.error('usage: package-library.mjs <working-library> --out <dir> [--id-prefix ref] [--redact "A,B"] [--scale 0.67] [--keep-decisions]'); process.exit(1); }

const src = path.resolve(args._[0]);
const out = path.resolve(args.out);
const prefix = args['id-prefix'] || 'ref';
const scale = Number(args.scale || 0.67);
const redact = String(args.redact || '').split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
const ffmpeg = process.env.FFMPEG_PATH ? (fs.existsSync(process.env.FFMPEG_PATH) && fs.statSync(process.env.FFMPEG_PATH).isDirectory() ? path.join(process.env.FFMPEG_PATH, 'ffmpeg') : process.env.FFMPEG_PATH) : 'ffmpeg';

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const redactText = (text) => {
  let t = text;
  for (const name of redact) t = t.replace(new RegExp(`(?<![\\w-])${esc(name)}(?![\\w-])`, 'gi'), 'the brand');
  return t;
};
const ABS = /((?<![A-Za-z])[A-Za-z]:[\\/]|\/c\/Users\/|\/home\/|\/Users\/)/;

const entries = fs.readdirSync(src, { withFileTypes: true })
  .filter(d => d.isDirectory() && fs.existsSync(path.join(src, d.name, 'motion-spec.json')))
  .map(d => d.name).sort();
if (!entries.length) { console.error('no entries with motion-spec.json under ' + src); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const citedStrips = (obj) => {
  const set = new Set();
  JSON.stringify(obj, (k, v) => { if (k === 'sheet' && typeof v === 'string' && v.startsWith('w-')) set.add(v); return v; });
  return set;
};

const report = [];
entries.forEach((name, i) => {
  const id = `${prefix}-${String(i + 1).padStart(2, '0')}`;
  const from = path.join(src, name);
  const to = path.join(out, id);
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.join(to, 'windows'), { recursive: true });

  const spec = JSON.parse(fs.readFileSync(path.join(from, 'motion-spec.json'), 'utf8'));
  const cuts = fs.existsSync(path.join(from, 'cuts.json')) ? JSON.parse(fs.readFileSync(path.join(from, 'cuts.json'), 'utf8')) : null;
  const cited = new Set([...citedStrips(spec), ...(cuts ? citedStrips(cuts) : [])]);

  // text files
  const textFiles = ['cuts.json', 'motion-spec.json', 'motion-spec.md', 'meta.json', 'audio.json', ...(args['keep-decisions'] ? ['decisions.md'] : [])];
  for (const f of fs.readdirSync(from)) if (/^brief-.*\.md$/.test(f)) textFiles.push(f);
  let bytes = 0;
  for (const f of textFiles) {
    const p = path.join(from, f);
    if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf8');
    if (f === 'motion-spec.json' || f === 'meta.json' || f === 'cuts.json') {
      const j = JSON.parse(t);
      if (j.meta) { j.meta.source = id; delete j.meta.source_path; }
      if (j.source !== undefined) j.source = id;
      t = JSON.stringify(j, null, 2) + '\n';
    }
    t = redactText(t).replace(new RegExp(esc(name), 'g'), id);
    if (ABS.test(t)) { console.error(`${id}: an absolute path survives in ${f} — fix the source or pass a redaction; not written`); process.exit(2); }
    fs.writeFileSync(path.join(to, f), t);
    bytes += Buffer.byteLength(t);
  }

  // strips: cited only, scaled JPEG
  const idx = path.join(from, 'windows', 'index.json');
  let index = fs.existsSync(idx) ? JSON.parse(fs.readFileSync(idx, 'utf8')) : null;
  let kept = 0, missing = 0;
  for (const sid of cited) {
    const png = path.join(from, 'windows', sid + '.png');
    if (!fs.existsSync(png)) { missing++; continue; }
    const jpg = path.join(to, 'windows', sid + '.jpg');
    const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', png, '-vf', `scale=trunc(iw*${scale}/2)*2:-2`, '-q:v', '4', jpg], { stdio: 'pipe' });
    if (r.status !== 0) { fs.copyFileSync(png, path.join(to, 'windows', sid + '.png')); }
    kept++;
    bytes += fs.statSync(fs.existsSync(jpg) ? jpg : path.join(to, 'windows', sid + '.png')).size;
  }
  if (index) {
    const strips = index.strips || index;
    for (const k of Object.keys(strips)) { const v = strips[k]; if (v && v.file) v.file = v.file.replace(/\.png$/, fs.existsSync(path.join(to, 'windows', v.id + '.jpg')) ? '.jpg' : '.png'); }
    fs.writeFileSync(path.join(to, 'windows', 'index.json'), JSON.stringify(index, null, 1) + '\n');
  }
  fs.writeFileSync(path.join(to, 'PROVENANCE.md'), `# ${id}\n\nA public product ad, analyzed with reference-motion-spec. Internal reference only: names redacted, the source file is not included, only the strips the spec cites are kept (scaled, JPEG). The strips are evidence for the rows that cite them; open a strip to see the example.\n`);
  report.push({ id, from: name, cited: cited.size, kept, missing, kb: Math.round(bytes / 1024) });
});

// library overview (LIBRARY.md, so the driver's README stays the one a skills site shows) + index
fs.writeFileSync(path.join(out, 'LIBRARY.md'), `# Motion library\n\n${entries.length} reference analyses produced by reference-motion-spec, packaged for sharing: neutral ids, brand names redacted, source videos not included, only the cited 24 fps strips kept (scaled JPEG). Internal reference only.\n\nHow to use:\n\n- \`node scripts/library.mjs library --query "fixed lens, word pop, typing"\` — pick a reference by need; \`catalog.json\` carries each entry's \`use_when\`.\n- \`examples-by-kind.md\` — every seam kind, text mechanism and UI motion with the clip, time and strip that shows it. Open the strip; that is the example.\n- Each entry: \`motion-spec.md\` (read this), \`motion-spec.json\` + \`cuts.json\` (machine-readable), \`brief-*.md\` (per tool), \`windows/\` (the cited strips).\n`);
const lib = spawnSync(process.execPath, [path.join(here, 'library.mjs'), out, '--out', path.join(out, 'catalog.json')], { stdio: 'pipe', encoding: 'utf8' });
if (lib.status !== 0) { console.error(lib.stderr || lib.stdout); process.exit(3); }
for (const r of report) console.log(`${r.id}  <- ${r.from}  strips ${r.kept}/${r.cited} cited${r.missing ? ` (${r.missing} missing)` : ''}  ~${r.kb} KB`);
console.log(`packaged ${report.length} entries -> ${out} (catalog.json, examples-by-kind.md, README.md)`);
