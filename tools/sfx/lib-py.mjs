// Locate and run the SFX venv's Python (tools/sfx/.venv) for the reference-copy
// DSP in tools/sfx/py/sfxref.py. Override with SFX_PYTHON=<path to python>.
// One-time setup:
//   python -m venv tools/sfx/.venv
//   tools/sfx/.venv/Scripts/python -m pip install demucs soundfile librosa
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SFXREF = path.join(HERE, 'py', 'sfxref.py');

export function pythonPath() {
  if (process.env.SFX_PYTHON) return process.env.SFX_PYTHON;
  const win = path.join(HERE, '.venv', 'Scripts', 'python.exe');
  const nix = path.join(HERE, '.venv', 'bin', 'python');
  if (fs.existsSync(win)) return win;
  if (fs.existsSync(nix)) return nix;
  console.error('[sfx] no SFX venv. Create it once:\n  python -m venv tools/sfx/.venv\n  tools/sfx/.venv/Scripts/python -m pip install demucs soundfile librosa');
  process.exit(1);
}

// Runs `sfxref.py <args>` with inherited stdio; exits with its status on failure.
export function runSfxref(args) {
  const r = spawnSync(pythonPath(), [SFXREF, ...args], { stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Runs `sfxref.py <args>` and parses its stdout as JSON (for plan-levels).
export function sfxrefJson(args) {
  const r = spawnSync(pythonPath(), [SFXREF, ...args], { encoding: 'utf8', maxBuffer: 64 << 20, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0) { process.stderr.write(r.stderr || ''); process.exit(r.status ?? 1); }
  return JSON.parse(r.stdout);
}

// Tiny flag parser shared by the wrappers.
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[k] = true;
      else { (out[k] = out[k] === undefined ? next : [].concat(out[k], next)); i++; }
    } else out._.push(a);
  }
  return out;
}
