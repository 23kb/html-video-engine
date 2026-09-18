#!/usr/bin/env node
// build-zip.mjs — assemble the one-skill bundle and zip it.
//
//   node build-zip.mjs            → bundle/video-pipeline/ (SKILL.md at the root, the three workers inside)
//                                   and video-pipeline.zip beside this script (the zip's root IS the bundle's
//                                   contents, so SKILL.md sits at the top level of the zip)
//
// Sources stay in the four sibling folders here; the bundle is generated, never edited by hand.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workers = ['reference-motion-spec', 'video-storyboard', 'html-snapshot'];
const bundle = path.join(here, 'bundle', 'video-pipeline');
const skip = new Set(['node_modules', '.DS_Store']);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

fs.rmSync(path.join(here, 'bundle'), { recursive: true, force: true });
copyDir(path.join(here, 'video-pipeline'), bundle);
for (const w of workers) copyDir(path.join(here, w), path.join(bundle, w));

const zip = path.join(here, 'video-pipeline.zip');
fs.rmSync(zip, { force: true });
const tar = 'C:/Windows/System32/tar.exe';
execFileSync(tar, ['-a', '-cf', zip, ...fs.readdirSync(bundle)], { cwd: bundle, stdio: 'inherit' });

// checks
const list = execFileSync(tar, ['-tf', zip], { encoding: 'utf8' }).split('\n').map(x => x.trim().replace(/\\/g, '/').replace(/^\.\//, '')).filter(Boolean);
const rootSkill = list.includes('SKILL.md');
const workerSkills = workers.filter(w => list.includes(`${w}/SKILL.md`));
const nm = list.filter(x => /node_modules/.test(x)).length;
const bad = list.filter(x => /\.mp4$|\.mov$/i.test(x)).length;
const size = Math.round(fs.statSync(zip).size / 1024);
console.log(`video-pipeline.zip: ${size} KB, ${list.length} entries, SKILL.md at root: ${rootSkill}, worker SKILL.md: ${workerSkills.length}/3, node_modules: ${nm}, video files: ${bad}`);
if (!rootSkill || workerSkills.length !== 3 || nm || bad) process.exit(1);
