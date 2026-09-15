// headless-lock.js — advisory single-runner lock for timing-sensitive tools.
//
// Why it exists: smoke failed "__done not reached within 79s" on a 56.5s film,
// with the page's own timeline clock reading 7.1 → 5.9 → 12.9 → 3.1. No reload,
// no error, nothing in the instrumentation. The cause was three Chromium
// instances (seam-gate + smoke + a probe) running in one command; under that
// contention the harness's own sampling is unreliable. Re-run alone: clean 1:1
// with wall clock, __done at 56.4s, PASS (rf-video 25).
//
// So: a timing-sensitive check runs ALONE, and a failure of one is re-run in
// isolation before it is believed. This makes that mechanical instead of
// remembered.
//
// Usage:
//   const { acquire } = require('./headless-lock');
//   const release = acquire('smoke', { force: args.force });
//   try { ...work... } finally { release(); }
//
// Advisory on purpose: it refuses to START a second timing run, but it never
// kills anything, and `--force` always wins. Locks older than STALE_MS are
// ignored (a crashed run must not block the next one forever).

const fs = require('fs');
const path = require('path');

const LOCK = path.join(__dirname, '..', 'tmp', '.headless-lock.json');
const STALE_MS = 15 * 60 * 1000;

function readLock() {
  try {
    const j = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
    if (!j || typeof j.at !== 'number') return null;
    if (Date.now() - j.at > STALE_MS) return null;
    // A lock whose process is gone is stale regardless of age.
    if (j.pid) { try { process.kill(j.pid, 0); } catch (_) { return null; } }
    return j;
  } catch (_) { return null; }
}

function acquire(name, opts = {}) {
  const held = readLock();
  if (held && !opts.force) {
    const ageS = Math.round((Date.now() - held.at) / 1000);
    console.error(`✗ ${name}: another timing-sensitive run holds the lock — "${held.name}" (pid ${held.pid}, ${ageS}s ago).`);
    console.error('  Timing measurements taken under contention are not evidence: a concurrent headless run makes the');
    console.error('  sampler read the timeline going backwards, and the failure looks like the film\'s fault (rf-video 25).');
    console.error('  Wait for it to finish, or pass --force if you know the other run is dead.');
    process.exit(3);
  }
  if (held && opts.force) {
    console.warn(`⚠ ${name}: --force over a live lock held by "${held.name}" — any timing in this run is suspect.`);
  }
  try {
    fs.mkdirSync(path.dirname(LOCK), { recursive: true });
    fs.writeFileSync(LOCK, JSON.stringify({ name, pid: process.pid, at: Date.now() }));
  } catch (_) { return () => {}; }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      const cur = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
      if (cur && cur.pid === process.pid) fs.unlinkSync(LOCK);
    } catch (_) { /* someone else's lock, or already gone */ }
  };
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  return release;
}

module.exports = { acquire, LOCK, STALE_MS };
