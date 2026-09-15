// Repair UTF-8-decoded-as-cp1252-then-re-encoded text (mojibake) in place.
//
//   "Entries list â€” submissions table"  ->  "Entries list — submissions table"
//
// The corruption: real UTF-8 bytes were decoded with cp1252, and the resulting
// characters were re-encoded as UTF-8. Reversing it means encoding each
// character back to its cp1252 BYTE, then decoding that byte run as UTF-8.
// Node has no cp1252 encoder, so the 27 cp1252-only slots (0x80-0x9F) are
// mapped explicitly; every other char in 0x00-0xFF is its own byte (latin1).
//
// Scans left to right; at each lead byte it tries the longest plausible run
// first (4 chars, then 3, then 2) and accepts the first that decodes cleanly
// to exactly one character. Adjacent mojibake sequences therefore both repair,
// which a single greedy regex pass cannot do.
//
// Usage: node fix-mojibake.js <file> [<file> ...] [--write]

const fs = require('fs');

const CP1252 = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

// UTF-8 lead bytes as they look after a cp1252 misdecode.
const LEADS = new Set(['Â', 'Ã', 'â', 'ã', 'ð']);

function cp1252Byte(ch) {
  const cp = ch.codePointAt(0);
  if (CP1252[cp] !== undefined) return CP1252[cp];
  if (cp <= 0xFF) return cp;
  return null;
}

function repair(text) {
  const chars = [...text];
  const out = [];
  let hits = 0;
  const samples = [];
  for (let i = 0; i < chars.length; i++) {
    if (!LEADS.has(chars[i])) { out.push(chars[i]); continue; }
    let matched = false;
    for (let len = 4; len >= 2; len--) {
      const run = chars.slice(i, i + len);
      if (run.length < len) continue;
      const bytes = [];
      let ok = true;
      for (const ch of run) {
        const b = cp1252Byte(ch);
        if (b === null) { ok = false; break; }
        bytes.push(b);
      }
      if (!ok) continue;
      const decoded = Buffer.from(bytes).toString('utf8');
      if (decoded.includes('�') || [...decoded].length !== 1) continue;
      if (samples.length < 3) samples.push(`${JSON.stringify(run.join(''))} -> ${JSON.stringify(decoded)}`);
      out.push(decoded);
      i += len - 1;
      hits++;
      matched = true;
      break;
    }
    if (!matched) out.push(chars[i]);
  }
  return { fixed: out.join(''), hits, samples };
}

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const write = process.argv.includes('--write');
if (!files.length) { console.error('usage: node fix-mojibake.js <file> ... [--write]'); process.exit(1); }

for (const f of files) {
  const before = fs.readFileSync(f, 'utf8');
  const { fixed, hits, samples } = repair(before);
  const tag = !hits ? 'clean' : write ? 'WRITTEN' : 'dry run';
  console.log(`${f}: ${hits} sequence(s) [${tag}]${samples.length ? ` — ${samples.join(' · ')}` : ''}`);
  if (write && hits) fs.writeFileSync(f, fixed, 'utf8');
}
