#!/usr/bin/env node
// Phase 6 Step 1b — selector-provenance validator.
//
// For a given video slug, walks its manifest + chapter descriptors +
// _selectors sheets and asserts:
//
//   1. Every selector resolves against the referenced snapshot's
//      catalog.md.
//   2. Every selector carries provenance (either `{ sel, src }` form
//      in a _selectors sheet, or a trailing `// src: ...` comment
//      inline in a chapter descriptor).
//   3. No deprecated verb (`injectField`; later `setFieldOptions`)
//      appears in a touched file.
//   4. If a cited provenance anchor no longer exists in the catalog,
//      flag drift.
//
// Touched/untouched classification uses a hash baseline at
// `tools/validator-baseline.json`. Files in the baseline with an
// unchanged content hash are "untouched legacy" — warnings instead
// of errors. Everything else is "touched" — hard errors.
//
// Usage:
//   node tools/validate-video.js <slug>
//   node tools/validate-video.js <slug> --strict         # promote warnings to errors
//   node tools/validate-video.js <slug> --report         # print full untouched warnings
//   node tools/validate-video.js <slug> --baseline       # write/refresh baseline, then validate
//   node tools/validate-video.js <slug> --all-chapters   # validate every chapter file
//                                                        # in videos/<slug>/chapters/ even
//                                                        # if not referenced by manifest
//
// By default the validator only inspects chapters listed in manifest.json
// chapters[]. Chapter files that exist on disk but aren't referenced are
// reported as INFO ("orphan chapter file not in manifest") and otherwise
// skipped. Pass --all-chapters to validate orphans too.
//
// Exits non-zero on any error (or on any warning under --strict).

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SNAP = path.join(ROOT, 'snapshots');
const BASELINE_PATH = path.join(__dirname, 'validator-baseline.json');
const ALL_VIDEO_EXCLUDE = new Set([
  'surveys-and-polls-v4-approved',
  'surveys-and-polls-v4-final',
  'surveys-and-polls-v4-final-bgm',
  'surveys-and-polls-v4-final-synced',
]);

// Declarative `prep` op vocabulary — kept in lockstep with
// `runtime/prep-ops.js`. Validator is CommonJS / zero-dep, so we duplicate
// the validation spec rather than dynamic-importing the ES module.
// If you change one, change the other.
const isPosInt = (v) => Number.isInteger(v) && v > 0;
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const isBool = (v) => v === true || v === false;
const VALID_LAYOUT_VALUES = new Set(['1', '2', '3', 'inline']);
const VALID_ICON_STYLE_TAG = new Set(['regular', 'solid', 'brands']);
const VALID_ICON_SIZE = new Set(['large', 'medium', 'small']);
const VALID_ICON_CHOICE_STYLE = new Set(['default', 'modern', 'classic', 'none']);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const PREP_OPS = {
  removeAdminBar:     { fields: [], validate: () => {} },
  removeBuilderCruft: { fields: [], validate: () => {} },
  applyDefaultForm: {
    fields: ['keepIds', 'labels', 'formName'],
    validate: (e, ctx) => {
      if ('keepIds' in e) {
        const v = e.keepIds;
        if (!Array.isArray(v) || v.length === 0 || !v.every(isPosInt))
          throw new Error(ctx + ': applyDefaultForm.keepIds must be a non-empty array of positive integers');
      }
      if ('labels' in e) {
        const v = e.labels;
        if (!v || typeof v !== 'object' || Array.isArray(v))
          throw new Error(ctx + ': applyDefaultForm.labels must be an object map of {id: label}');
        for (const [k, label] of Object.entries(v)) {
          if (!isPosInt(Number(k)) || String(Number(k)) !== k)
            throw new Error(ctx + ': applyDefaultForm.labels key "' + k + '" must be a positive integer');
          if (!isNonEmptyString(label))
            throw new Error(ctx + ': applyDefaultForm.labels["' + k + '"] must be a non-empty string');
        }
      }
      if ('formName' in e && !isNonEmptyString(e.formName))
        throw new Error(ctx + ': applyDefaultForm.formName must be a non-empty string');
    },
  },
  hideFields: {
    fields: ['ids'],
    validate: (e, ctx) => {
      const v = e.ids;
      if (!Array.isArray(v) || v.length === 0 || !v.every(isPosInt))
        throw new Error(ctx + ': hideFields.ids must be a non-empty array of positive integers');
    },
  },
  setFormName: {
    fields: ['name'],
    validate: (e, ctx) => {
      if (!isNonEmptyString(e.name))
        throw new Error(ctx + ': setFormName.name must be a non-empty string');
    },
  },
  setFieldLabel: {
    fields: ['id', 'label'],
    validate: (e, ctx) => {
      if (!isPosInt(e.id))
        throw new Error(ctx + ': setFieldLabel.id must be a positive integer');
      if (!isNonEmptyString(e.label))
        throw new Error(ctx + ': setFieldLabel.label must be a non-empty string');
    },
  },
  setChoiceLabels: {
    fields: ['fieldId', 'labels'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': setChoiceLabels.fieldId must be a positive integer');
      if (!Array.isArray(e.labels) || e.labels.length === 0 || !e.labels.every(isNonEmptyString))
        throw new Error(ctx + ': setChoiceLabels.labels must be a non-empty array of strings');
    },
  },
  setCheckedChoices: {
    fields: ['fieldId', 'indexes'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': setCheckedChoices.fieldId must be a positive integer');
      if (!Array.isArray(e.indexes) || !e.indexes.every((v) => Number.isInteger(v) && v >= 0))
        throw new Error(ctx + ': setCheckedChoices.indexes must be an array of zero-based integers');
    },
  },
  stripQuizEnabled:   { fields: [], validate: () => {} },
  activateFieldOptionGroup: {
    fields: ['fieldId', 'controlName', 'group'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': activateFieldOptionGroup.fieldId must be a positive integer');
      const hasControl = 'controlName' in e;
      const hasGroup = 'group' in e;
      if (hasControl === hasGroup)
        throw new Error(ctx + ': activateFieldOptionGroup requires exactly one of `controlName` or `group`');
      if (hasControl && !isNonEmptyString(e.controlName))
        throw new Error(ctx + ': activateFieldOptionGroup.controlName must be a non-empty string');
      if (hasGroup && !isNonEmptyString(e.group))
        throw new Error(ctx + ': activateFieldOptionGroup.group must be a non-empty string');
    },
  },
  setChoiceLayout: {
    fields: ['fieldId', 'value'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': setChoiceLayout.fieldId must be a positive integer');
      const v = typeof e.value === 'number' ? String(e.value) : e.value;
      if (!isNonEmptyString(v) || !VALID_LAYOUT_VALUES.has(v))
        throw new Error(ctx + ': setChoiceLayout.value must be one of "1", "2", "3", "inline"');
    },
  },
  applyIconChoicesV2: {
    fields: ['fieldId', 'glyph', 'iconStyle', 'color', 'size', 'style'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': applyIconChoicesV2.fieldId must be a positive integer');
      if ('glyph' in e && !isNonEmptyString(e.glyph))
        throw new Error(ctx + ': applyIconChoicesV2.glyph must be a non-empty string');
      if ('iconStyle' in e && !VALID_ICON_STYLE_TAG.has(e.iconStyle))
        throw new Error(ctx + ': applyIconChoicesV2.iconStyle must be one of "regular", "solid", "brands"');
      if ('color' in e && (!isNonEmptyString(e.color) || !HEX_COLOR_RE.test(e.color)))
        throw new Error(ctx + ': applyIconChoicesV2.color must be a hex color like "#066aab"');
      if ('size' in e && !VALID_ICON_SIZE.has(e.size))
        throw new Error(ctx + ': applyIconChoicesV2.size must be one of "large", "medium", "small"');
      if ('style' in e && !VALID_ICON_CHOICE_STYLE.has(e.style))
        throw new Error(ctx + ': applyIconChoicesV2.style must be one of "default", "modern", "classic", "none"');
    },
  },
  applyImageChoices: {
    fields: ['fieldId'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': applyImageChoices.fieldId must be a positive integer');
    },
  },
  setHideLabel: {
    fields: ['fieldId', 'hidden'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': setHideLabel.fieldId must be a positive integer');
      if (!isBool(e.hidden))
        throw new Error(ctx + ': setHideLabel.hidden must be boolean');
    },
  },
  setRequired: {
    fields: ['fieldId', 'on'],
    validate: (e, ctx) => {
      if (!isPosInt(e.fieldId))
        throw new Error(ctx + ': setRequired.fieldId must be a positive integer');
      if (!isBool(e.on))
        throw new Error(ctx + ': setRequired.on must be boolean');
    },
  },
};

function validatePrepEntry(entry, ctx) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry))
    throw new Error(ctx + ': prep entry must be a plain object with an `op` field');
  if (!isNonEmptyString(entry.op))
    throw new Error(ctx + ': prep entry missing `op` (must be a non-empty string)');
  const def = PREP_OPS[entry.op];
  if (!def)
    throw new Error(ctx + ': unknown prep op "' + entry.op + '" (known: ' + Object.keys(PREP_OPS).join(', ') + ')');
  const allowed = new Set(['op', ...def.fields]);
  for (const key of Object.keys(entry)) {
    if (!allowed.has(key))
      throw new Error(ctx + ': unknown field "' + key + '" on op "' + entry.op +
        '" (allowed: ' + (def.fields.length ? def.fields.join(', ') : '<none>') + ')');
  }
  def.validate(entry, ctx);
}

// Literal-only parser for declarative prep arrays. Does NOT execute chapter
// source — `new Function` / `eval` are off-limits because chapters can be
// AI-authored. Supported grammar:
//   value  := array | object | string | number | true | false | null
//   array  := '[' (value (',' value)* ','?)? ']'
//   object := '{' (key ':' value (',' key ':' value)* ','?)? '}'
//   key    := identifier | string
//   string := single- or double-quoted (with \\, \', \", \n, \r, \t, \\)
//   number := /-?\d+(\.\d+)?/
// Anything else (identifier values, function calls, template literals,
// operators, computed expressions) → reject with "not literal declarative
// prep". Comments and whitespace are skipped between tokens.
function parsePrepLiteral(text, start) {
  let i = start;
  function pos() { return i; }
  function eof() { return i >= text.length; }
  function peek() { return text[i]; }

  function skipTrivia() {
    while (!eof()) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      if (c === '/' && text[i+1] === '/') { while (!eof() && text[i] !== '\n') i++; continue; }
      if (c === '/' && text[i+1] === '*') {
        i += 2;
        while (!eof() && !(text[i] === '*' && text[i+1] === '/')) i++;
        if (!eof()) i += 2;
        continue;
      }
      break;
    }
  }

  function fail(msg) {
    const line = lineOf(text, i);
    const e = new Error(msg + ' at line ' + line);
    e._parseFail = true;
    throw e;
  }

  function expect(ch) {
    skipTrivia();
    if (text[i] !== ch) fail('expected "' + ch + '" but got "' + (text[i] || 'EOF') + '"');
    i++;
  }

  function parseString() {
    const quote = text[i];
    if (quote !== '"' && quote !== "'") fail('expected string literal');
    i++;
    let out = '';
    while (!eof() && text[i] !== quote) {
      if (text[i] === '\\') {
        const n = text[i+1];
        const map = { n: '\n', r: '\r', t: '\t', '\\': '\\', "'": "'", '"': '"', '`': '`', '/': '/' };
        if (n in map) { out += map[n]; i += 2; continue; }
        // Unsupported escape — reject rather than guessing.
        fail('unsupported string escape \\' + n);
      }
      if (text[i] === '\n') fail('unterminated string literal');
      out += text[i]; i++;
    }
    if (eof()) fail('unterminated string literal');
    i++; // consume closing quote
    return out;
  }

  function parseNumber() {
    const start = i;
    if (text[i] === '-') i++;
    if (!/[0-9]/.test(text[i] || '')) fail('expected number');
    while (/[0-9]/.test(text[i] || '')) i++;
    if (text[i] === '.') {
      i++;
      while (/[0-9]/.test(text[i] || '')) i++;
    }
    return Number(text.slice(start, i));
  }

  function parseIdentifierOrKeyword() {
    const start = i;
    if (!/[A-Za-z_$]/.test(text[i] || '')) fail('expected identifier');
    while (/[A-Za-z0-9_$]/.test(text[i] || '')) i++;
    return text.slice(start, i);
  }

  function parseValue() {
    skipTrivia();
    if (eof()) fail('unexpected EOF');
    const c = text[i];
    if (c === '[') return parseArray();
    if (c === '{') return parseObject();
    if (c === '"' || c === "'") return parseString();
    if (c === '-' || /[0-9]/.test(c)) return parseNumber();
    if (/[A-Za-z_$]/.test(c)) {
      const ident = parseIdentifierOrKeyword();
      if (ident === 'true')  return true;
      if (ident === 'false') return false;
      if (ident === 'null')  return null;
      // Anything else (variable reference, function call) is forbidden.
      fail('non-literal value "' + ident + '" — declarative prep must be pure data (no expressions, identifiers, or function calls)');
    }
    if (c === '`') fail('template literals are not allowed in declarative prep');
    fail('unexpected character "' + c + '"');
  }

  function parseArray() {
    expect('[');
    const out = [];
    skipTrivia();
    if (text[i] === ']') { i++; return out; }
    while (true) {
      out.push(parseValue());
      skipTrivia();
      if (text[i] === ',') {
        i++;
        skipTrivia();
        if (text[i] === ']') { i++; return out; }
        continue;
      }
      if (text[i] === ']') { i++; return out; }
      fail('expected "," or "]" in array');
    }
  }

  function parseObject() {
    expect('{');
    const out = {};
    skipTrivia();
    if (text[i] === '}') { i++; return out; }
    while (true) {
      skipTrivia();
      let key;
      if (text[i] === '"' || text[i] === "'") key = parseString();
      else if (/[A-Za-z_$]/.test(text[i] || '')) key = parseIdentifierOrKeyword();
      else fail('expected object key');
      skipTrivia();
      expect(':');
      const val = parseValue();
      out[key] = val;
      skipTrivia();
      if (text[i] === ',') {
        i++;
        skipTrivia();
        if (text[i] === '}') { i++; return out; }
        continue;
      }
      if (text[i] === '}') { i++; return out; }
      fail('expected "," or "}" in object');
    }
  }

  const value = parseValue();
  return { value, end: pos() };
}

// Skip whitespace and JS comments starting at `i`. Returns the new index.
// Mirrors the same trivia rules used inside parsePrepLiteral.
function skipTriviaAt(text, i) {
  while (i < text.length) {
    const c = text[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '/' && text[i+1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i+1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i+1] === '/')) i++;
      if (i < text.length) i += 2;
      continue;
    }
    break;
  }
  return i;
}

// Walk a chapter's source text for `prep: [ ... ]` array literals (chapter-
// level and snapshotSwap step-level). Each is parsed with the literal-only
// grammar above. The token immediately after the closing `]` must be one of
// `,` (next sibling property), `}` (last property of an object), or `)`
// (last positional arg) — any other suffix (`.map(...)`, `[0]`, `?.x`, an
// identifier, an operator, etc.) means the prep value is being post-
// processed by an expression and is not pure literal data — reject it.
function parsePrepArrays(text) {
  const found = [];
  const re = /\b(prep|after)\s*:\s*\[/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const kind = m[1];
    const openIdx = text.indexOf('[', m.index);
    if (openIdx < 0) continue;
    let parsed;
    try {
      parsed = parsePrepLiteral(text, openIdx);
    } catch (e) {
      found.push({ kind, line: lineOf(text, m.index),
        error: kind + ' array not literal: ' + e.message });
      continue;
    }
    if (!Array.isArray(parsed.value)) {
      found.push({ kind, line: lineOf(text, m.index),
        error: kind + ' is not an array literal' });
      continue;
    }
    const next = skipTriviaAt(text, parsed.end);
    const nextCh = text[next];
    if (nextCh !== ',' && nextCh !== '}' && nextCh !== ')') {
      found.push({ kind, line: lineOf(text, m.index),
        error: kind + ' array has non-literal suffix (got "' +
          (nextCh || 'EOF') + '") — declarative ' + kind + ' must be a bare array literal, ' +
          'not an expression like `.map(...)`, `[0]`, `?.x`, or any operator' });
      continue;
    }
    found.push({ kind, line: lineOf(text, m.index), entries: parsed.value });
  }
  return found;
}

// ─── Stage 4c authoring-boundary import allowlist ───
// Chapter modules should describe video behavior, not patch core. Direct
// imports from engine/, scenes/, or runtime/ are warned (not errored)
// because legacy packages may already violate the boundary. Promotion to
// error requires baseline cleanup and explicit approval.
//
// Allowed shared imports (exact match on the import specifier):
//   /runtime/chapter-api.js   — defineChapter() entrypoint
// Allowed by pattern:
//   ./<anything>, ../<anything>  — local, **only when the resolved path
//   stays inside the video/chapter package**. Relative traversal that
//   resolves into repo-level `runtime/`, `engine/`, or `scenes/` warns.
const ALLOWED_SHARED_IMPORTS = new Set(['/runtime/chapter-api.js']);

// Resolve a relative import specifier against the importing file to a
// repo-relative POSIX path, e.g. "runtime/dom-prep.js". Returns null if
// the specifier is not relative.
function resolveRelativeToRepo(spec, fromFile) {
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null;
  const fromDir = path.dirname(fromFile);
  const abs = path.resolve(fromDir, spec);
  let rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  // path.relative() may return a path that escapes the repo root with
  // leading "../"; treat that as not-in-repo (no boundary check needed).
  if (rel.startsWith('../')) return null;
  return rel;
}

function classifyImport(spec, fromFile) {
  // Returns { boundary: 'runtime'|'engine'|'scenes'|null, isDomPrep, allowed }.
  if (ALLOWED_SHARED_IMPORTS.has(spec)) {
    return { boundary: null, isDomPrep: false, allowed: true };
  }
  // Resolve relative paths to a repo-rooted POSIX path; absolute paths
  // are normalized by stripping leading slashes.
  let rel = resolveRelativeToRepo(spec, fromFile);
  if (rel == null) {
    if (spec.startsWith('./') || spec.startsWith('../')) {
      // Relative but escapes the repo — treat as non-repo, allow.
      return { boundary: null, isDomPrep: false, allowed: true };
    }
    rel = spec.replace(/^\/+/, '');
  }
  let boundary = null;
  if (rel === 'runtime' || rel.startsWith('runtime/')) boundary = 'runtime';
  else if (rel === 'engine' || rel.startsWith('engine/')) boundary = 'engine';
  else if (rel === 'scenes' || rel.startsWith('scenes/')) boundary = 'scenes';
  if (!boundary) return { boundary: null, isDomPrep: false, allowed: true };
  // Re-check exact-match allowlist against the resolved repo path. The
  // allowlist holds absolute-style specifiers like `/runtime/chapter-api.js`;
  // accept either form.
  if (ALLOWED_SHARED_IMPORTS.has('/' + rel)) {
    return { boundary: null, isDomPrep: false, allowed: true };
  }
  const isDomPrep = rel === 'runtime/dom-prep.js';
  return { boundary, isDomPrep, allowed: false };
}

function findForbiddenImports(text, fromFile) {
  // Match ES static imports and dynamic import('...'). Bare `require('...')`
  // is unlikely in chapter modules but cheap to cover.
  const out = []; // [{spec, line, isDomPrep}]
  const patterns = [
    /\bimport\s+(?:[^'"`;]+?\s+from\s+)?(['"])([^'"`]+)\1/g,
    /\bimport\(\s*(['"])([^'"`]+)\1\s*\)/g,
    /\brequire\(\s*(['"])([^'"`]+)\1\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const spec = m[2];
      const c = classifyImport(spec, fromFile);
      if (c.allowed) continue;
      out.push({
        spec,
        line: lineOf(text, m.index),
        isDomPrep: c.isDomPrep,
      });
    }
  }
  return out;
}

const DEPRECATED_VERBS = new Set([
  'injectField',
  // `setFieldOptions` retired Phase 6 Step 2 — verb deleted, zero call
  // sites. Listed here so any future accidental reintroduction surfaces
  // as an error on touched files (warning on untouched legacy).
  'setFieldOptions',
]);
const DEPRECATED_VERBS_WARN_ONLY = new Set();

// ─── args ───
function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set();
  const slugs = [];
  const skipLints = new Set();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--skip-lint') {
      const name = args[++i];
      if (!name || name.startsWith('--')) {
        throw new Error('--skip-lint requires a rule name');
      }
      skipLints.add(name);
      continue;
    }
    if (a.startsWith('--')) flags.add(a);
    else slugs.push(a);
  }
  return { flags, slugs, skipLints };
}

// ─── hashing / baseline ───
function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return { files: {} };
  try { return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')); }
  catch { return { files: {} }; }
}

function writeBaseline(files) {
  const baseline = {
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Phase 6 Step 1b validator baseline. Hashes snapshot the ' +
          'state at which files are considered "untouched legacy". Any ' +
          'file whose hash differs from this record — or whose path is ' +
          'not present — is classified as touched and subject to hard ' +
          'errors on provenance violations.',
    files,
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
}

function collectBaselineTargets() {
  const out = [];
  const videosDir = path.join(ROOT, 'videos');
  if (!fs.existsSync(videosDir)) return out;
  // Walk up to two levels deep — top-level `videos/<slug>/` and grouped
  // `videos/<group>/<slug>/` (e.g. `videos/_tests/verbs-probe/`).
  const visit = (dir) => {
    const chaptersDir = path.join(dir, 'chapters');
    const manifestPath = path.join(dir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      out.push(manifestPath);
      if (fs.existsSync(chaptersDir)) walkJs(chaptersDir, out);
      return;
    }
    // No manifest here — try one level deeper.
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const sub = path.join(dir, entry.name);
        const subManifest = path.join(sub, 'manifest.json');
        if (fs.existsSync(subManifest)) {
          out.push(subManifest);
          const subChapters = path.join(sub, 'chapters');
          if (fs.existsSync(subChapters)) walkJs(subChapters, out);
        }
      }
    }
  };
  for (const name of fs.readdirSync(videosDir)) {
    visit(path.join(videosDir, name));
  }
  return out;
}

function walkJs(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(p, out);
    else if (entry.isFile() && p.endsWith('.js')) out.push(p);
  }
}

// ─── catalog loading ───
function loadCatalog(snapshotSlug) {
  const catalogPath = path.join(SNAP, snapshotSlug, 'catalog.md');
  if (!fs.existsSync(catalogPath)) {
    return { missing: true, path: catalogPath, anchors: new Set(), atoms: {
      ids: new Set(), classes: new Set(),
      dataAttrs: new Map(), // name → Set(values)
    }};
  }
  const md = fs.readFileSync(catalogPath, 'utf8');
  const anchors = new Set();
  const ids = new Set();
  const classes = new Set();
  const dataAttrs = new Map();

  // Extract anchors from `<a id="kind--key"></a>`.
  const anchorRe = /<a id="([a-zA-Z][a-zA-Z0-9_:-]*--[^"]+)"/g;
  let m;
  while ((m = anchorRe.exec(md)) !== null) anchors.add(m[1]);

  // Extract selectors from backticked cells.
  const selRe = /`(#[A-Za-z][\w-]*|\.[A-Za-z][\w-]*|\[data-[\w-]+="[^"]+"\])`/g;
  while ((m = selRe.exec(md)) !== null) {
    const s = m[1];
    if (s.startsWith('#')) ids.add(s.slice(1));
    else if (s.startsWith('.')) classes.add(s.slice(1));
    else {
      const dm = /^\[data-([\w-]+)="([^"]+)"\]$/.exec(s);
      if (dm) {
        if (!dataAttrs.has(dm[1])) dataAttrs.set(dm[1], new Set());
        dataAttrs.get(dm[1]).add(dm[2]);
      }
    }
  }
  return { missing: false, path: catalogPath, anchors, atoms: { ids, classes, dataAttrs }};
}

// ─── selector resolution ───
// A selector "resolves" if its strongest atomic component (ID > data-attr
// > class) appears in the catalog. Composite selectors like
// `#panel .foo > a` resolve on their leading ID. We intentionally accept
// dynamic value splices (`#wpforms-field-option-basic-' + FIELD_ID` =>
// checked by prefix match on IDs known to follow that pattern — see
// tryPrefixMatch).
function resolveSelector(sel, catalog) {
  if (!sel || typeof sel !== 'string') {
    return { ok: false, reason: 'empty selector' };
  }
  // Extract atoms.
  const idMatch    = sel.match(/#([A-Za-z][\w-]*)/);
  const classAtoms = [...sel.matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => m[1]);
  const dataAtoms  = [...sel.matchAll(/\[data-([\w-]+)(?:=["']([^"']+)["'])?\]/g)]
                       .map(m => ({ name: m[1], value: m[2] || null }));

  // Try ID first.
  if (idMatch) {
    const id = idMatch[1];
    if (catalog.atoms.ids.has(id)) return { ok: true, atom: '#' + id };
    // Prefix-resolve for dynamic-id patterns (e.g. author wrote
    // `'#wpforms-field-option-' + fieldId`; static form may have lost
    // the trailing token — accept if any catalog ID starts with this
    // prefix followed by `-`).
    for (const catId of catalog.atoms.ids) {
      if (catId === id || catId.startsWith(id + '-')) {
        return { ok: true, atom: '#' + id, note: 'prefix-match' };
      }
    }
    return { ok: false, reason: `id "#${id}" not in catalog` };
  }
  // data-attr atoms.
  for (const d of dataAtoms) {
    if (!catalog.atoms.dataAttrs.has(d.name)) continue;
    const values = catalog.atoms.dataAttrs.get(d.name);
    if (!d.value || values.has(d.value)) {
      return { ok: true, atom: `[data-${d.name}${d.value ? `="${d.value}"` : ''}]` };
    }
  }
  // class atoms.
  for (const c of classAtoms) {
    if (catalog.atoms.classes.has(c)) return { ok: true, atom: '.' + c };
  }
  return {
    ok: false,
    reason: `no atomic component of \`${sel}\` resolves in catalog`,
  };
}

// ─── chapter / selector-sheet parsing ───
function readText(p) { return fs.readFileSync(p, 'utf8'); }

function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

// Parse a _selectors/*.js sheet. Returns { entries: [{key, sel, src, line}], path }.
// Two accepted entry shapes:
//   key: '#x',                                      // untagged string
//   key: { sel: '#x', src: 'catalog.md#id--x' },    // tagged object
function parseSelectorSheet(text) {
  const entries = [];
  // Match `key: '...'` or `key: "..."` (untagged).
  const strRe = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(['"])((?:\\.|(?!\2).)*)\2/g;
  // Match `key: { ... }` (tagged object).
  const objRe = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{([^}]*)\}/g;
  const taggedKeys = new Set();

  let m;
  while ((m = objRe.exec(text)) !== null) {
    const key = m[1];
    const body = m[2];
    const selM = /sel\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/.exec(body);
    const srcM = /src\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/.exec(body);
    if (!selM) continue;
    taggedKeys.add(key);
    entries.push({
      key, sel: selM[2],
      src: srcM ? srcM[2] : null,
      line: lineOf(text, m.index),
      tagged: true,
    });
  }
  while ((m = strRe.exec(text)) !== null) {
    const key = m[1];
    if (taggedKeys.has(key)) continue;
    // Filter common non-selector keys (import specifiers, etc).
    if (['import','from','export','default'].includes(key)) continue;
    entries.push({
      key, sel: m[3], src: null,
      line: lineOf(text, m.index),
      tagged: false,
    });
  }
  return entries;
}

// Parse a chapter module for:
//  - snapshot: 'slug'
//  - do: 'verbName'
//  - target / from / to / highlightTarget / anchor — inline string selectors
//  - inline trailing `// src: ...` provenance comments (same line as the selector)
//  - mode: 'per-beat-narration' | 'parallel' | 'audio-cued'
//  - narration: '<key>' string references
//  - camera.level numeric values (per beat)
//  - id: '<beat-id>' beat declarations (used to cross-check narration coverage)
//  - swapToSnapshot('<slug>') call sites (extra snapshot references)
function parseChapter(text) {
  const out = {
    snapshot: null,
    mode: null,
    deprecatedCalls: [], // [{verb, line}]
    inlineSelectors: [], // [{field, sel, src, line}]
    narrationKeys: [],   // [{key, line}]
    cameraLevels: [],    // [{level, line}]
    beatIds: [],         // [{id, line}]
    extraSnapshots: [],  // [{slug, line}]  — swapToSnapshot('...') refs
    narrationBeats: [],  // [{key, duration, line}]
  };

  const snapM = /(?:\bsnapshot\s*:\s*|\bexport\s+const\s+snapshot\s*=\s*)['"]([^'"]+)['"]/.exec(text);
  if (snapM) out.snapshot = snapM[1];

  const modeM = /(?:\bmode\s*:\s*|\bexport\s+const\s+mode\s*=\s*)['"]([^'"]+)['"]/.exec(text);
  if (modeM) out.mode = modeM[1];

  const narrRe = /\bnarration\s*:\s*['"]([^'"]+)['"]/g;
  let nm;
  while ((nm = narrRe.exec(text)) !== null) {
    out.narrationKeys.push({ key: nm[1], line: lineOf(text, nm.index) });
    const tail = text.slice(nm.index, Math.min(text.length, nm.index + 900));
    const durationM = /\bduration\s*:\s*(-?\d+(?:\.\d+)?)/.exec(tail);
    out.narrationBeats.push({
      key: nm[1],
      duration: durationM ? Number(durationM[1]) : null,
      line: lineOf(text, nm.index),
    });
  }

  // camera: { ... level: <n> ... } — `level` may also legally appear inside
  // overlays etc., so we scope to lines within ~120 chars after a `camera:`
  // token. Keeps the heuristic cheap and avoids parsing the full literal.
  const camRe = /\bcamera\s*:\s*\{([^}]*)\}/g;
  let cm;
  while ((cm = camRe.exec(text)) !== null) {
    const body = cm[1];
    const lvlM = /\blevel\s*:\s*(-?\d+(?:\.\d+)?)/.exec(body);
    if (lvlM) {
      out.cameraLevels.push({
        level: Number(lvlM[1]),
        line: lineOf(text, cm.index),
      });
    }
  }

  // Beat id declarations — `id: '<beat-id>'`. Skip _selectors-style files
  // by ignoring `key:` patterns that sit inside an export-const sheet.
  // Cheap heuristic: only count `id: '...'` at indentation depth ≤ 4 so
  // nested helper objects don't inflate the count.
  const idRe = /^[ \t]{0,4}id\s*:\s*['"]([^'"]+)['"]/gm;
  let im;
  while ((im = idRe.exec(text)) !== null) {
    out.beatIds.push({ id: im[1], line: lineOf(text, im.index) });
  }

  const swapRe = /\bswapToSnapshot\(\s*['"]([^'"]+)['"]/g;
  let sm;
  while ((sm = swapRe.exec(text)) !== null) {
    out.extraSnapshots.push({ slug: sm[1], line: lineOf(text, sm.index) });
  }

  // Deprecated `do:` usage.
  const doRe = /\bdo\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = doRe.exec(text)) !== null) {
    const verb = m[1];
    if (DEPRECATED_VERBS.has(verb) || DEPRECATED_VERBS_WARN_ONLY.has(verb)) {
      out.deprecatedCalls.push({ verb, line: lineOf(text, m.index) });
    }
  }

  // Inline selectors — `target: '...'`, `from: '...'`, etc.
  // Only treat the value as a selector if it looks like one (`#`, `.`,
  // `[`). `from`/`to` are also used by the `toggle` verb to carry state
  // values (`'on'`/`'off'`) — those aren't selectors and must not be
  // resolved.
  const fieldRe = /\b(target|from|to|highlightTarget|anchor)\s*:\s*(['"])((?:\\.|(?!\2).)*)\2([^\n]*)/g;
  while ((m = fieldRe.exec(text)) !== null) {
    const field = m[1], sel = m[3], restOfLine = m[4];
    if (!/^[#.\[]/.test(sel)) continue;
    const srcMatch = /\/\/\s*src:\s*(\S+)/.exec(restOfLine);
    out.inlineSelectors.push({
      field, sel,
      src: srcMatch ? srcMatch[1] : null,
      line: lineOf(text, m.index),
    });
  }

  return out;
}

// ─── manifest / file discovery ───
function findVideoDir(slug) {
  const videosDir = path.join(ROOT, 'videos');
  const direct = path.join(videosDir, slug);
  if (fs.existsSync(path.join(direct, 'manifest.json'))) return direct;
  // Search one level deeper (e.g. `videos/_tests/verbs-probe/`).
  for (const name of fs.readdirSync(videosDir)) {
    const nested = path.join(videosDir, name, slug);
    if (fs.existsSync(path.join(nested, 'manifest.json'))) return nested;
  }
  return direct; // fall through so the original error surfaces
}

function listAllVideoSlugs() {
  const videosDir = path.join(ROOT, 'videos');
  if (!fs.existsSync(videosDir)) return [];
  const out = [];
  const visit = (dir) => {
    if (fs.existsSync(path.join(dir, 'manifest.json'))) {
      const slug = path.basename(dir);
      if (!ALL_VIDEO_EXCLUDE.has(slug)) out.push(slug);
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sub = path.join(dir, entry.name);
      if (fs.existsSync(path.join(sub, 'manifest.json')) && !ALL_VIDEO_EXCLUDE.has(entry.name)) out.push(entry.name);
    }
  };
  for (const entry of fs.readdirSync(videosDir, { withFileTypes: true })) {
    if (entry.isDirectory()) visit(path.join(videosDir, entry.name));
  }
  return [...new Set(out)].sort();
}

function loadVideo(slug) {
  const dir = findVideoDir(slug);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const chaptersDir = path.join(dir, 'chapters');
  const allChapterFiles = fs.existsSync(chaptersDir)
    ? fs.readdirSync(chaptersDir, { withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.js') && !e.name.startsWith('_'))
        .map(e => path.join(chaptersDir, e.name))
    : [];

  // Split into manifest-referenced (active) vs orphans. The manifest's
  // chapters[] is the source of truth for what plays; everything else is a
  // file that exists on disk but isn't part of the active video.
  const manifestChapterNames = new Set(
    Array.isArray(manifest.chapters) ? manifest.chapters : []
  );
  const activeChapters = [];
  const orphanChapters = [];
  for (const file of allChapterFiles) {
    const base = path.basename(file, '.js');
    if (manifestChapterNames.has(base)) activeChapters.push(file);
    else orphanChapters.push(file);
  }

  const selectorDir = path.join(chaptersDir, '_selectors');
  const selectorSheets = fs.existsSync(selectorDir)
    ? fs.readdirSync(selectorDir)
        .filter(n => n.endsWith('.js'))
        .map(n => path.join(selectorDir, n))
    : [];
  const legacySheet = path.join(chaptersDir, '_selectors.js');
  if (fs.existsSync(legacySheet)) selectorSheets.push(legacySheet);
  return {
    dir, manifestPath, manifest,
    chapters: activeChapters,
    orphanChapters,
    allChapterFiles,
    selectorSheets,
  };
}

// ─── main ───
const findings = []; // { level, file, line, msg, touched }
function report(level, file, line, msg, touched) {
  findings.push({ level, file, line, msg, touched });
}

function classify(file, baseline) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const current = sha1(fs.readFileSync(file));
  const prior = baseline.files[rel];
  if (!prior) return { touched: true, reason: 'not in baseline' };
  if (prior !== current) return { touched: true, reason: 'hash differs from baseline' };
  return { touched: false, reason: 'baseline match' };
}

function validateSelectorSheet(file, catalog, snapshotSlug, touched) {
  const text = readText(file);
  const entries = parseSelectorSheet(text);
  for (const e of entries) {
    const res = resolveSelector(e.sel, catalog);
    if (!res.ok) {
      report('error', file, e.line,
        `selector \`${e.sel}\` (key=${e.key}) — ${res.reason} [${snapshotSlug}]`,
        touched);
      continue;
    }
    // Provenance check.
    if (!e.tagged || !e.src) {
      report(touched ? 'error' : 'warning', file, e.line,
        `selector \`${e.sel}\` (key=${e.key}) — no provenance tag (expected \`{ sel, src }\` object form)`,
        touched);
    } else if (e.src && !checkSrcAnchor(e.src, catalog)) {
      report('error', file, e.line,
        `selector \`${e.sel}\` (key=${e.key}) — provenance \`${e.src}\` does not resolve to a current catalog anchor`,
        touched);
    }
  }
}

function checkSrcAnchor(src, catalog) {
  // Accept `snapshots/<slug>/catalog.md#<anchor>` or just `catalog.md#<anchor>` or `#<anchor>`.
  const anchorM = /#([a-zA-Z][\w:-]*(?:--[^#\s]+)?)/.exec(src);
  if (!anchorM) {
    // Fallback forms we allow without hard-checking (grep:<path> etc).
    if (/^grep:/i.test(src) || /^inspect-out\//i.test(src)) return true;
    return false;
  }
  return catalog.anchors.has(anchorM[1]);
}

function validateChapter(file, video, baseline) {
  const text = readText(file);
  const info = parseChapter(text);
  const snapshotSlug = info.snapshot || video.manifest.primarySnapshot || null;
  const cls = classify(file, baseline);
  const catalog = snapshotSlug ? loadCatalog(snapshotSlug) : null;

  if (!snapshotSlug) {
    report('warning', file, 1, `chapter has no snapshot declaration; selectors cannot be resolved`, cls.touched);
    return;
  }
  if (!catalog || catalog.missing) {
    report(cls.touched ? 'error' : 'warning', file, 1,
      `snapshot "${snapshotSlug}" has no catalog.md (run \`node tools/generate-snapshot-catalog.js ${snapshotSlug}\`)`,
      cls.touched);
    return;
  }

  for (const sel of info.inlineSelectors) {
    const res = resolveSelector(sel.sel, catalog);
    if (!res.ok) {
      report('error', file, sel.line,
        `${sel.field} \`${sel.sel}\` — ${res.reason} [${snapshotSlug}]`,
        cls.touched);
      continue;
    }
    if (!sel.src) {
      report(cls.touched ? 'error' : 'warning', file, sel.line,
        `${sel.field} \`${sel.sel}\` — no inline provenance (expected trailing \`// src: catalog.md#<anchor>\`)`,
        cls.touched);
    } else if (!checkSrcAnchor(sel.src, catalog)) {
      report('error', file, sel.line,
        `${sel.field} \`${sel.sel}\` — provenance \`${sel.src}\` does not resolve to a current catalog anchor`,
        cls.touched);
    }
  }

  for (const arr of parsePrepArrays(text)) {
    const kind = arr.kind || 'prep';
    if (arr.error) {
      report('error', file, arr.line,
        'declarative `' + kind + '` — ' + arr.error, cls.touched);
      continue;
    }
    arr.entries.forEach((entry, i) => {
      const ctx = kind + '[' + i + ']';
      try {
        validatePrepEntry(entry, ctx);
      } catch (e) {
        report('error', file, arr.line,
          'declarative `' + kind + '` — ' + e.message, cls.touched);
        return;
      }
      if (entry.op === 'stripQuizEnabled' && cls.touched) {
        report('warning', file, arr.line,
          'declarative `' + kind + '` — `stripQuizEnabled` is migration-only debt (REFACTOR-BRIEF item K)',
          cls.touched);
      }
    });
  }

  // Stage 4c boundary: chapter import scan. Warning-only.
  for (const imp of findForbiddenImports(text, file)) {
    report('warning', file, imp.line,
      `Stage 4 authoring boundary: chapter imports shared internals directly (\`${imp.spec}\`); helpers should flow through ctx, descriptor verbs, or prep ops`,
      cls.touched);
    if (imp.isDomPrep) {
      report('warning', file, imp.line,
        `direct import of \`runtime/dom-prep.js\` — new chapters should prefer declarative \`prep\` ops such as \`{ op: 'applyDefaultForm', ... }\``,
        cls.touched);
    }
  }

  for (const dep of info.deprecatedCalls) {
    const level = DEPRECATED_VERBS.has(dep.verb)
      ? (cls.touched ? 'error' : 'warning')
      : 'warning'; // setFieldOptions stays warn-only until step 2 migration.
    report(level, file, dep.line,
      `deprecated verb \`do: '${dep.verb}'\` (Phase 6 scheduled retirement)`,
      cls.touched);
  }
}

// ─── video-level checks (Stage 3 slice 1) ───
//
// These run once per video, after the per-file pass. They produce
// **warnings** by default — most are heuristics that benefit from human
// confirmation. Only definitely-broken cases (missing snapshot folder for
// a referenced snapshot) escalate to error.

// Known postIntro `kind` values. Sourced from `runtime/cinematic-*.js`
// filenames at this level — keeps the list auto-maintained without
// parsing the cinematic-specs registry. Anything outside this set warns
// (does not fail) — custom postIntro variants are allowed.
function knownCinematicKinds() {
  const dir = path.join(ROOT, 'runtime');
  if (!fs.existsSync(dir)) return new Set();
  const out = new Set();
  for (const name of fs.readdirSync(dir)) {
    const m = /^cinematic-(.+)\.js$/.exec(name);
    if (m) out.add(m[1]);
  }
  // Common spec-runner aliases that don't have a 1:1 file.
  out.add('one-answer-enough');
  out.add('rough-thought-to-draft');
  return out;
}

function listNarrationFiles(slug) {
  const dir = path.join(ROOT, 'videos', slug, 'narration');
  if (!fs.existsSync(dir)) return { mp3s: new Set(), txts: new Set(), dirExists: false };
  const mp3s = new Set();
  const txts = new Set();
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.mp3')) mp3s.add(name.slice(0, -4));
    else if (name.endsWith('.txt')) txts.add(name.slice(0, -4));
  }
  return { mp3s, txts, dirExists: true };
}

const mp3DurationCache = new Map();
function mp3DurationSeconds(file) {
  if (mp3DurationCache.has(file)) return mp3DurationCache.get(file);
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const n = Number(out);
    const val = Number.isFinite(n) ? n : null;
    mp3DurationCache.set(file, val);
    return val;
  } catch (_) {
    mp3DurationCache.set(file, null);
    return null;
  }
}

function snapshotFolderExists(slug) {
  return fs.existsSync(path.join(SNAP, slug));
}

function lintAudioVsDuration(video, chapters, slug) {
  for (const file of chapters) {
    const text = readText(file);
    const info = parseChapter(text);
    if (info.mode !== 'per-beat-narration') continue;
    for (const beat of info.narrationBeats) {
      if (!beat.key) continue;
      if (beat.duration != null && beat.duration < 0.6) {
        report('warning', file, beat.line,
          `audio-duration lint: narration beat "${beat.key}" has duration ${beat.duration}s; narration beats below 0.6s tend to rush the audio`,
          true);
      }
      if (beat.duration == null) continue;
      const mp3 = path.join(video.dir, 'narration', `${beat.key}.mp3`);
      if (!fs.existsSync(mp3)) continue;
      const audioSeconds = mp3DurationSeconds(mp3);
      if (audioSeconds == null) {
        report('warning', file, beat.line,
          `audio-duration lint: could not read videos/${slug}/narration/${beat.key}.mp3 duration via ffprobe`,
          true);
        continue;
      }
      if (audioSeconds > beat.duration * 1.5) {
        report('warning', file, beat.line,
          `audio-duration lint: narration "${beat.key}" is ${audioSeconds.toFixed(2)}s but beat duration is ${beat.duration}s (>1.5x); confirm the visual cadence is intentional`,
          true);
      }
    }
  }
}

function lintRawRaf(files) {
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = readText(file);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!/\brequestAnimationFrame\s*\(/.test(line)) return;
      if (/lint-allow:\s*raw-raf/.test(line)) return;
      report('warning', file, i + 1,
        'pausable-raf lint: raw requestAnimationFrame() should use pausableRaf() from videos/_shared/kit.js unless this line is intentionally opted out',
        true);
    });
  }
}

function lintRegisterTimelinePaused(files) {
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = readText(file);
    const timelineDecls = new Map();
    const declRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*gsap\.timeline\s*\(([\s\S]*?)\)\s*;/g;
    let m;
    while ((m = declRe.exec(text)) !== null) {
      timelineDecls.set(m[1], { opts: m[2], line: lineOf(text, m.index) });
    }
    const regRe = /\bregisterTimeline\s*\(\s*([^,\s)]+)/g;
    while ((m = regRe.exec(text)) !== null) {
      const arg = m[1];
      if (/^gsap\.timeline/.test(arg)) {
        const callTail = text.slice(m.index, Math.min(text.length, m.index + 300));
        if (!/paused\s*:\s*true/.test(callTail)) {
          report('warning', file, lineOf(text, m.index),
            'register-timeline lint: inline gsap.timeline() passed to registerTimeline() should be created with { paused: true }',
            true);
        }
        continue;
      }
      const decl = timelineDecls.get(arg);
      if (decl && !/paused\s*:\s*true/.test(decl.opts)) {
        report('warning', file, lineOf(text, m.index),
          `register-timeline lint: ${arg} is registered with registerTimeline() but its gsap.timeline() options do not include paused: true`,
          true);
      }
    }
  }
}

function runVideoChecks(video, opts = {}) {
  const { manifest, manifestPath, dir } = video;
  // Default: only manifest-listed chapters. With --all-chapters, scan
  // every chapter file in the directory (matching the per-file pass).
  const chapters = opts.allChapters ? video.allChapterFiles : video.chapters;
  const slug = path.basename(dir);
  const skipLints = opts.skipLints || new Set();

  // ── Stage 4c manifest schema warnings ──
  // narrationSpeed: must be a number within a soft range. The conservative
  // 0.85–1.25 range matches WPForms AI's chosen 1.1x and leaves headroom for
  // mild slowdowns; values outside warn (not fail).
  if ('narrationSpeed' in manifest && manifest.narrationSpeed != null) {
    const v = manifest.narrationSpeed;
    if (typeof v !== 'number' || Number.isNaN(v)) {
      report('warning', manifestPath, 1,
        `manifest.narrationSpeed must be a number (got ${JSON.stringify(v)})`,
        true);
    } else if (v < 0.85 || v > 1.25) {
      report('warning', manifestPath, 1,
        `manifest.narrationSpeed ${v} is outside the soft range 0.85–1.25 — confirm the value is intentional`,
        true);
    }
  }
  // defaults.breakStyle / defaults.swapStyle: warn on unknown values.
  // Sets aligned with the runtime registries in `runtime/transitions.js`
  // (CHAPTER_BREAKS and SWAPS). Slice 5b-1.7 expanded these from the
  // earlier conservative sets to the actual runtime support surface.
  // breakStyle covers chapter-boundary camera transitions.
  // swapStyle covers snapshot-load handoffs.
  // 'paper-cover' is kept as a legacy alias accepted only at the manifest
  // layer — `runtime/player.js` falls back to its paper-cover hardfix when
  // no swapStyle is supplied; declaring it is a no-op shim.
  const VALID_BREAK_STYLES = new Set(['glide', 'hold', 'soft-dolly', 'dolly', 'whip']);
  const VALID_SWAP_STYLES = new Set(['cover', 'fast', 'morph', 'push', 'whip', 'flipBridge', 'paper-cover']);
  const VALID_SURFACES = new Set(['iframe', 'editorial', 'mixed']);
  if ('surface' in manifest && manifest.surface != null && !VALID_SURFACES.has(manifest.surface)) {
    report('warning', manifestPath, 1,
      `manifest.surface "${manifest.surface}" is not in the known set {${[...VALID_SURFACES].sort().join(', ')}}`,
      true);
  }
  if (manifest.defaults && typeof manifest.defaults === 'object') {
    if ('breakStyle' in manifest.defaults && manifest.defaults.breakStyle != null) {
      const v = manifest.defaults.breakStyle;
      if (!VALID_BREAK_STYLES.has(v)) {
        report('warning', manifestPath, 1,
          `manifest.defaults.breakStyle "${v}" is not in the known set {${[...VALID_BREAK_STYLES].sort().join(', ')}} — confirm the runtime supports it`,
          true);
      }
    }
    if ('swapStyle' in manifest.defaults && manifest.defaults.swapStyle != null) {
      const v = manifest.defaults.swapStyle;
      if (!VALID_SWAP_STYLES.has(v)) {
        report('warning', manifestPath, 1,
          `manifest.defaults.swapStyle "${v}" is not in the known set {${[...VALID_SWAP_STYLES].sort().join(', ')}} — confirm the runtime supports it`,
          true);
      }
    }
  }

  // Slice 5b-1.7: per-chapter `export const breakStyle` / `export const swapStyle`
  // overrides. Scan each active chapter for these literal exports and warn if
  // the value is not in the runtime-supported set above. Warning-only.
  const styleExportRe = /\bexport\s+const\s+(breakStyle|swapStyle)\s*=\s*['"]([^'"]+)['"]/g;
  for (const file of video.chapters) {
    const text = readText(file);
    let m;
    while ((m = styleExportRe.exec(text)) !== null) {
      const kind = m[1], val = m[2];
      const set = kind === 'breakStyle' ? VALID_BREAK_STYLES : VALID_SWAP_STYLES;
      if (!set.has(val)) {
        report('warning', file, lineOf(text, m.index),
          `chapter \`export const ${kind} = "${val}"\` is not in the known set {${[...set].sort().join(', ')}} — confirm the runtime supports it`,
          true);
      }
    }
  }

  // ── Manifest: hud must be explicitly false for a final/recording manifest.
  if (manifest.hud !== false) {
    const detail = manifest.hud === true
      ? 'manifest.hud is `true` — disable for final recording (`"hud": false`)'
      : 'manifest.hud is not set — explicit `"hud": false` is required for final recording';
    report('warning', manifestPath, 1, detail, true);
  }

  // ── Manifest: postIntro.kind sanity. Unknown kind warns (custom variants ok).
  if (manifest.postIntro && manifest.postIntro.kind) {
    const known = knownCinematicKinds();
    if (!known.has(manifest.postIntro.kind)) {
      report('warning', manifestPath, 1,
        `postIntro.kind "${manifest.postIntro.kind}" is not a known archetype — confirm a custom cinematic exists for it (known: ${[...known].sort().join(', ')})`,
        true);
    }
  }

  // ── Snapshot existence: every referenced snapshot must exist as a folder.
  // Catalog presence is already checked elsewhere; this catches the case
  // where a chapter or manifest names a snapshot that was never captured.
  const refs = new Map(); // slug → [{file, line, source}]
  const noteRef = (snap, file, line, source) => {
    if (!snap) return;
    if (!refs.has(snap)) refs.set(snap, []);
    refs.get(snap).push({ file, line, source });
  };
  if (manifest.primarySnapshot) noteRef(manifest.primarySnapshot, manifestPath, 1, 'manifest.primarySnapshot');
  for (const file of chapters) {
    const text = readText(file);
    const info = parseChapter(text);
    if (info.snapshot) noteRef(info.snapshot, file, 1, 'chapter snapshot');
    for (const x of info.extraSnapshots) noteRef(x.slug, file, x.line, 'swapToSnapshot()');
  }

  const runtimeCinematics = fs.existsSync(path.join(ROOT, 'runtime'))
    ? fs.readdirSync(path.join(ROOT, 'runtime'))
        .filter(n => /^cinematic-.+\.js$/.test(n))
        .map(n => path.join(ROOT, 'runtime', n))
    : [];
  if (!skipLints.has('audio-duration')) lintAudioVsDuration(video, chapters, slug);
  if (!skipLints.has('pausable-raf')) lintRawRaf([...chapters, ...runtimeCinematics]);
  if (!skipLints.has('register-timeline')) lintRegisterTimelinePaused([...chapters, ...runtimeCinematics]);
  for (const [snap, sites] of refs) {
    if (snapshotFolderExists(snap)) continue;
    for (const site of sites) {
      report('error', site.file, site.line,
        `referenced snapshot "${snap}" has no folder under snapshots/ (${site.source})`,
        true);
    }
  }

  // ── Stage 4c slice 3: duplicate <body> snapshot health check ──
  // Capture output occasionally contains two real <body> blocks (memory:
  // duplicate-DOM bug class). Selectors then double-match and zoom lands
  // in empty space between. Warn per referenced snapshot whose index.html
  // has more than one real <body> opening tag.
  //
  // Conservative scan: strip HTML comments and <script>/<template>/
  // <noscript> bodies first so a serialized "<body" inside JS, an HTML
  // comment, or a string literal in inline JSON does not produce a false
  // positive. Anything still surviving and matching `<body[\s>]` is
  // counted. Limitation: <body> inside `<style>` or attribute values would
  // still count; current snapshots do not stage that case. Recorded in
  // §9b verification note if it ever fires falsely.
  for (const [snap, sites] of refs) {
    if (!snapshotFolderExists(snap)) continue;
    const indexPath = path.join(SNAP, snap, 'index.html');
    if (!fs.existsSync(indexPath)) continue;
    let html;
    try { html = fs.readFileSync(indexPath, 'utf8'); }
    catch { continue; }
    const stripped = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<template\b[\s\S]*?<\/template\s*>/gi, '')
      .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, '');
    const matches = stripped.match(/<body[\s>]/gi) || [];
    if (matches.length > 1) {
      // Report against the first call site so the warning is attached to
      // a real source location the user can navigate to.
      const site = sites[0];
      report('warning', site.file, site.line,
        `snapshot health: "${snap}" contains ${matches.length} <body> tags in index.html; selectors/camera may resolve against duplicate DOM`,
        true);
    }
  }

  // ── Narration coverage: every referenced narration key must have an mp3.
  const narrFiles = listNarrationFiles(slug);
  const narrRefs = new Map(); // key → [{file, line, source}]
  const noteNarr = (key, file, line, source) => {
    if (!key) return;
    if (!narrRefs.has(key)) narrRefs.set(key, []);
    narrRefs.get(key).push({ file, line, source });
  };
  if (manifest.postIntro && manifest.postIntro.narration) {
    noteNarr(manifest.postIntro.narration, manifestPath, 1, 'manifest.postIntro.narration');
  }
  for (const file of chapters) {
    const text = readText(file);
    const info = parseChapter(text);
    for (const n of info.narrationKeys) noteNarr(n.key, file, n.line, 'chapter narration');
  }
  for (const [key, sites] of narrRefs) {
    if (!narrFiles.dirExists) {
      for (const site of sites) {
        report('warning', site.file, site.line,
          `narration "${key}" referenced but videos/${slug}/narration/ does not exist`,
          true);
      }
      break; // one warning per video is enough; don't repeat per ref
    }
    if (!narrFiles.mp3s.has(key)) {
      for (const site of sites) {
        report('warning', site.file, site.line,
          `narration "${key}" has no mp3 at videos/${slug}/narration/${key}.mp3 — run TTS or remove the reference`,
          true);
      }
    } else if (!narrFiles.txts.has(key)) {
      for (const site of sites) {
        report('warning', site.file, site.line,
          `narration "${key}" has mp3 but no source .txt — render history will be hard to retrace`,
          true);
      }
    }
  }

  // ── Camera floor for builder snapshots: levels < 1.0 expose Mac chrome
  // around the iframe (per WPForms AI handoff). Warn, don't fail.
  for (const file of chapters) {
    const text = readText(file);
    const info = parseChapter(text);
    const snap = info.snapshot || manifest.primarySnapshot || '';
    if (!snap.startsWith('builder-')) continue;
    for (const cam of info.cameraLevels) {
      if (cam.level < 1.0) {
        report('warning', file, cam.line,
          `camera.level ${cam.level} on builder snapshot "${snap}" — values below 1.0 expose the Mac frame chrome; bump to ≥1.0 unless intentional`,
          true);
      }
    }
  }

  // ── Stage 5d-1: per-video authoring mode classifier (INFO only).
  // Scoped strictly to manifest.chapters. Files under manifest.extras or
  // stray files in chapters/ are NOT classified — they are handled by the
  // existing orphan-chapter INFO. Default behavior on every video:
  //   1. one INFO summary line: descriptor / legacy-effect / mixed / empty
  //      with per-mode counts and the active manifest chapter count.
  //   2. one additional INFO line ("audio-cued inventory: …") only when
  //      one or more active chapters declare `mode: 'audio-cued'`.
  // Opt-in via --strict-authoring: promotes the mixed-mode case and the
  // audio-cued case from INFO to warning. Default validator runs preserve
  // locked baselines (INFO only, no warnings or errors). --report does
  // NOT add per-chapter classifier listing — it is the existing flag that
  // surfaces full untouched-legacy warnings, unrelated to this block.
  const modeSummary = classifyAuthoringModes(video, manifest);
  const summaryMsg = formatModeSummary(slug, modeSummary);
  report('info', manifestPath, 1, summaryMsg, true);
  if (modeSummary.audioCuedChapters.length > 0) {
    report('info', manifestPath, 1,
      `audio-cued inventory: ${modeSummary.audioCuedChapters.length} chapter(s) — ${modeSummary.audioCuedChapters.join(', ')}`,
      true);
  }
  if (opts.strictAuthoring) {
    if (modeSummary.kind === 'mixed') {
      report('warning', manifestPath, 1,
        `--strict-authoring: video mixes descriptor and legacy-effect chapters (${modeSummary.descriptorChapters.length} descriptor / ${modeSummary.legacyChapters.length} legacy)`,
        true);
    }
    if (modeSummary.audioCuedChapters.length > 0) {
      report('warning', manifestPath, 1,
        `--strict-authoring: ${modeSummary.audioCuedChapters.length} audio-cued chapter(s) under active manifest — ${modeSummary.audioCuedChapters.join(', ')}`,
        true);
    }
  }

  // ── per-beat-narration coverage: a chapter declaring this mode should
  // have one narration: per beat. Warn if the count of narration: strings
  // is less than the count of beat id: declarations.
  for (const file of chapters) {
    const text = readText(file);
    const info = parseChapter(text);
    if (info.mode !== 'per-beat-narration') continue;
    if (info.beatIds.length === 0) continue;
    if (info.narrationKeys.length < info.beatIds.length) {
      report('warning', file, 1,
        `mode='per-beat-narration' has ${info.beatIds.length} beat id(s) but only ${info.narrationKeys.length} narration ref(s) — every beat in this mode should have its own clip`,
        true);
    }
  }
}

// ─── Stage 5d-1: authoring mode classifier ───
// Inspects each chapter file referenced by manifest.chapters[] and labels it
// as 'descriptor', 'legacy-effect', or 'unknown'. Heuristic-only, regex-
// based, no module execution. Mirrors the dispatch test in
// scenes/player.html (`isChapterDescriptor` on default export) without
// importing it.
function classifyChapterFile(text) {
  const usesDefineChapter =
    /\bimport\s*\{[^}]*\bdefineChapter\b[^}]*\}/.test(text) ||
    /\bdefineChapter\s*\(/.test(text);
  const hasModeConst = /\bexport\s+const\s+mode\s*=\s*['"]([^'"]+)['"]/.exec(text);
  const hasArrayDefault = /\bexport\s+default\s*\[/.test(text);
  const hasEffect = /\beffect\s*:\s*(?:async\s*)?[(\w]/.test(text);
  const audioCued = !!hasModeConst && hasModeConst[1] === 'audio-cued';

  // Descriptor: defineChapter + no array-default / no effect closures.
  if (usesDefineChapter && !hasArrayDefault) {
    return { mode: 'descriptor', audioCued: false };
  }
  // Legacy effect-mode: array default OR `mode:` const OR effect closures.
  if (hasArrayDefault || hasModeConst || hasEffect) {
    return { mode: 'legacy-effect', audioCued };
  }
  return { mode: 'unknown', audioCued: false };
}

function classifyAuthoringModes(video, manifest) {
  const descriptorChapters = [];
  const legacyChapters = [];
  const unknownChapters = [];
  const audioCuedChapters = [];

  const activeNames = Array.isArray(manifest.chapters) ? manifest.chapters : [];
  const activeSet = new Set(activeNames);

  // Walk video.chapters (already filtered to active manifest entries by
  // loadVideo()). Belt-and-suspenders: re-check the basename is in the
  // active set so any future loader change can't accidentally classify
  // extras / orphans.
  const perChapter = [];
  for (const file of video.chapters) {
    const base = path.basename(file, '.js');
    if (!activeSet.has(base)) continue;
    let text;
    try { text = readText(file); } catch { continue; }
    const c = classifyChapterFile(text);
    perChapter.push({ name: base, mode: c.mode, audioCued: c.audioCued });
    if (c.mode === 'descriptor') descriptorChapters.push(base);
    else if (c.mode === 'legacy-effect') legacyChapters.push(base);
    else unknownChapters.push(base);
    if (c.audioCued) audioCuedChapters.push(base);
  }

  let kind;
  if (perChapter.length === 0) kind = 'empty';
  else if (descriptorChapters.length > 0 && legacyChapters.length === 0 && unknownChapters.length === 0) kind = 'descriptor';
  else if (legacyChapters.length > 0 && descriptorChapters.length === 0 && unknownChapters.length === 0) kind = 'legacy-effect';
  else kind = 'mixed';

  return {
    kind,
    activeCount: perChapter.length,
    descriptorChapters,
    legacyChapters,
    unknownChapters,
    audioCuedChapters,
    perChapter,
  };
}

function formatModeSummary(slug, s) {
  if (s.kind === 'empty') {
    return `authoring mode: empty (manifest.chapters = []) [${slug}]`;
  }
  const parts = [];
  if (s.descriptorChapters.length) parts.push(`${s.descriptorChapters.length} descriptor`);
  if (s.legacyChapters.length) parts.push(`${s.legacyChapters.length} legacy-effect`);
  if (s.unknownChapters.length) parts.push(`${s.unknownChapters.length} unknown`);
  return `authoring mode: ${s.kind} (${parts.join(', ')}) — ${s.activeCount} active manifest chapter(s) [${slug}]`;
}

function summarize(flags) {
  let errs = 0, warns = 0, wUntouched = 0, infos = 0;
  for (const f of findings) {
    if (f.level === 'error') errs++;
    else if (f.level === 'warning') {
      warns++;
      if (!f.touched) wUntouched++;
    } else if (f.level === 'info') {
      infos++;
    }
  }
  // Print grouped output.
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, fs] of byFile) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    console.log(`\n${rel}`);
    fs.sort((a, b) => a.line - b.line);
    for (const f of fs) {
      if (f.level === 'warning' && !f.touched && !flags.has('--report')) continue;
      const tag = f.level === 'error' ? 'ERROR'
                : f.level === 'info' ? 'INFO'
                : f.touched ? 'WARN' : 'WARN(legacy)';
      console.log(`  ${rel}:${f.line}  [${tag}] ${f.msg}`);
    }
  }
  console.log(`\nsummary: ${errs} error(s), ${warns} warning(s) (${wUntouched} untouched legacy)${infos ? `, ${infos} info` : ''}`);
  if (flags.has('--strict') && warns > 0) return 1;
  return errs > 0 ? 1 : 0;
}

(function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const { flags, skipLints } = parsed;
  let { slugs } = parsed;
  if (flags.has('--all')) slugs = listAllVideoSlugs();

  if (flags.has('--baseline')) {
    const files = {};
    for (const abs of collectBaselineTargets()) {
      const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
      files[rel] = sha1(fs.readFileSync(abs));
    }
    writeBaseline(files);
    console.log(`[baseline] wrote ${Object.keys(files).length} file hashes → ${path.relative(ROOT, BASELINE_PATH)}`);
    if (slugs.length === 0) process.exit(0);
  }

  if (slugs.length === 0) {
    console.error('Usage: node tools/validate-video.js <slug> [--all] [--strict] [--strict-authoring] [--report] [--baseline] [--skip-lint <rule>]');
    process.exit(1);
  }

  const baseline = loadBaseline();
  if (Object.keys(baseline.files).length === 0) {
    console.warn('[warn] no validator baseline found — every file will be treated as touched.');
    console.warn('       Run `node tools/validate-video.js --baseline` once to snapshot current state as untouched legacy.');
  }

  for (const slug of slugs) {
    const video = loadVideo(slug);
    for (const sheet of video.selectorSheets) {
      const cls = classify(sheet, baseline);
      const snap = inferSnapshotFromSheetName(sheet);
      if (!snap) {
        // Shared / multi-snapshot sheet (e.g. `builder-settings.js`
        // covering every `builder-settings-*` snapshot). Its selectors
        // get validated at the chapter call-site against that
        // chapter's declared snapshot. Skip the sheet-level pass.
        continue;
      }
      const catalog = loadCatalog(snap);
      if (catalog.missing) {
        report(cls.touched ? 'error' : 'warning', sheet, 1,
          `snapshot "${snap}" has no catalog.md (run \`node tools/generate-snapshot-catalog.js ${snap}\`)`,
          cls.touched);
        continue;
      }
      validateSelectorSheet(sheet, catalog, snap, cls.touched);
    }
    const allChapters = flags.has('--all-chapters');
    const chaptersToValidate = allChapters
      ? video.allChapterFiles
      : video.chapters;
    for (const chapter of chaptersToValidate) {
      validateChapter(chapter, video, baseline);
    }
    // Surface orphan chapter files. INFO when not validating them; the
    // file itself is reachable in the report so the user can act on it.
    if (!allChapters) {
      for (const orphan of video.orphanChapters) {
        const rel = path.relative(ROOT, orphan).replace(/\\/g, '/');
        report('info', orphan, 1,
          `orphan chapter file not in manifest.chapters[] — skipped (pass --all-chapters to validate, or remove the file). ${rel}`,
          true);
      }
    }
    runVideoChecks(video, {
      allChapters,
      strictAuthoring: flags.has('--strict-authoring'),
      skipLints,
    });
  }

  const code = summarize(flags);
  process.exit(code);
})();

function inferSnapshotFromSheetName(p) {
  const base = path.basename(p, '.js');
  if (base === '_selectors') return null; // legacy multi-snapshot sheet
  const snapDir = path.join(SNAP, base);
  if (fs.existsSync(snapDir)) return base;
  return null;
}
