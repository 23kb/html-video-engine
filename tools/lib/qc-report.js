#!/usr/bin/env node
// tools/lib/qc-report.js — shared emitter for videos/<slug>/qc-report.json,
// the per-video gate ledger the QC dashboard (tools/qc-dashboard/) reads.
//
// Each QC tool writes its own section; the file is a merge of the latest run
// of every tool, each section stamped with an ISO timestamp. Values no tool
// computes (motion-audit tier, notes) are set via the CLI form.
//
// Library:
//   const { writeSection } = require('./lib/qc-report');
//   writeSection(slug, 'seamGate', { pass: true, warnings: 0, cuts: [...] });
//
// CLI (for tool-less values):
//   node tools/lib/qc-report.js <slug> --set motionAudit.tier=A [--set k.k2=v ...]
//   node tools/lib/qc-report.js <slug> --show
//
// Writes are atomic (tmp + rename) — concurrent sessions stage files in this
// repo, and a torn JSON read by the dashboard is worse than a stale one.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function reportPath(slug) {
  return path.join(ROOT, 'videos', slug, 'qc-report.json');
}

function readReport(slug) {
  const file = reportPath(slug);
  if (!fs.existsSync(file)) return { slug, sections: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed.sections || typeof parsed.sections !== 'object') parsed.sections = {};
    parsed.slug = slug;
    return parsed;
  } catch (_) {
    // Corrupt file: start fresh rather than crash the tool that reports.
    return { slug, sections: {} };
  }
}

function atomicWrite(file, data) {
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

// Merge one section into videos/<slug>/qc-report.json. Returns the file path,
// or null (no-throw) when the video folder does not exist — reporting must
// never break the tool doing the measuring.
function writeSection(slug, name, payload) {
  try {
    const dir = path.join(ROOT, 'videos', slug);
    if (!slug || !fs.existsSync(dir)) return null;
    const report = readReport(slug);
    report.sections[name] = { at: new Date().toISOString(), ...payload };
    report.updated = report.sections[name].at;
    const file = reportPath(slug);
    atomicWrite(file, JSON.stringify(report, null, 2) + '\n');
    return file;
  } catch (e) {
    console.error(`[qc-report] write failed for ${slug}/${name}: ${e.message}`);
    return null;
  }
}

// If `input` is a path under videos/<slug>/, return the slug; else null.
// Lets path-taking tools (dead-time.js) report without a slug argument.
function slugFromPath(input) {
  const abs = path.resolve(input);
  const videosDir = path.join(ROOT, 'videos') + path.sep;
  if (!abs.startsWith(videosDir)) return null;
  const rest = abs.slice(videosDir.length);
  const slug = rest.split(path.sep)[0];
  return slug && !slug.startsWith('_') ? slug : null;
}

function coerce(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

function cliMain() {
  const argv = process.argv.slice(2);
  const slug = argv.find((a) => !a.startsWith('--'));
  if (!slug) {
    console.error('Usage: node tools/lib/qc-report.js <slug> --set section.key=value [--set ...] | --show');
    process.exit(2);
  }
  if (argv.includes('--show')) {
    const file = reportPath(slug);
    console.log(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : `(no qc-report.json for ${slug})`);
    return;
  }
  const sets = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--set') {
      const m = String(argv[++i]).match(/^([\w.-]+)=(.*)$/);
      if (!m) { console.error(`bad --set (want section.key=value): ${argv[i]}`); process.exit(2); }
      sets.push(m);
    }
  }
  if (!sets.length) { console.error('nothing to do — pass --set or --show'); process.exit(2); }

  // Group by section so each touched section gets one fresh `at` stamp.
  const bySection = new Map();
  for (const [, dotted, raw] of sets) {
    const parts = dotted.split('.');
    if (parts.length < 2) { console.error(`--set path needs section.key, got: ${dotted}`); process.exit(2); }
    const section = parts[0];
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push({ keys: parts.slice(1), value: coerce(raw) });
  }
  const report = readReport(slug);
  for (const [section, entries] of bySection) {
    const cur = { ...(report.sections[section] || {}) };
    for (const { keys, value } of entries) {
      let node = cur;
      for (let i = 0; i < keys.length - 1; i++) {
        if (typeof node[keys[i]] !== 'object' || node[keys[i]] === null) node[keys[i]] = {};
        node = node[keys[i]];
      }
      node[keys[keys.length - 1]] = value;
    }
    delete cur.at;
    const file = writeSection(slug, section, cur);
    if (!file) { console.error(`no video folder at videos/${slug}`); process.exit(1); }
  }
  console.log(`qc-report updated: videos/${slug}/qc-report.json (${[...bySection.keys()].join(', ')})`);
}

if (require.main === module) cliMain();

module.exports = { writeSection, readReport, reportPath, slugFromPath };
