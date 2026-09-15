#!/usr/bin/env node
// generate-snapshot-outline.js — emits snapshots/<slug>/outline.md, the
// per-snapshot SIDECAR: a 3–8 KB map an author can read instead of the
// 0.6–5.2 MB index.html (~190K tokens → ~1.5K tokens).
//
// Two payloads:
//   #1  Compact selector outline — the few dozen elements an author would
//       actually target (ids / data-* anchors / role classes / labelled
//       controls), role-grouped. Candidate selectors come from the catalog's
//       static parser (generate-snapshot-catalog.js#extractEntries, incl. its
//       Rule-A active-panel scoping); every one is then validated against the
//       LIVE DOM so the outline can never carry a dangling selector.
//   #2  Interactivity manifest — which interactivity.js TRANSITIONS[] entries
//       actually fire on THIS snapshot's DOM, evaluated INSIDE the video-iframe
//       harness (scenes/snapshot-viewer.html, where window.top !== window).
//       Cross-snapshot nav / entrance fx are NOT registry entries — they live
//       in their own inits and bail in-iframe — so they are reported
//       separately as HAND-BROWSE-ONLY (use ifm.swap instead).
//
// Loading: scenes/snapshot-viewer.html?snap=<slug> embeds the snapshot in an
// <iframe>, exactly like the player. The registry holds match()/apply()
// FUNCTIONS that can't cross the Playwright boundary, so ALL matching runs
// inside frame.evaluate(); only serializable results come back.
//
// Determinism: stable sorts, no timestamps, no Date.now/Math.random. Same
// index.html → byte-identical outline.md (idempotency is a tested gate).
//
// Usage:
//   node tools/generate-snapshot-outline.js <slug> [<slug2> ...]
//   node tools/generate-snapshot-outline.js --all
//   node tools/generate-snapshot-outline.js <slug> --port 4321 --keep-server
//
// Exit codes: 0 ok · 1 one or more slugs failed · 3 usage error

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { extractEntries } = require('./generate-snapshot-catalog.js');

const ROOT = path.resolve(__dirname, '..');
const SNAP_DIR = path.join(ROOT, 'snapshots');

// Size guidance: target 3–8 KB; >12 KB is reported as an outlier (a genuinely
// huge interaction surface is allowed, silent bloat is not).
const SIZE_SOFT_MAX = 8 * 1024;
const SIZE_HARD_MAX = 12 * 1024;
// Per-group cap in #1 keeps a 5.2 MB snapshot's outline as small as a 0.6 MB
// one — the interaction surface is bounded even when the markup isn't.
const GROUP_CAP = 10;
// Combined builder snapshots genuinely support 150+ transitions; cap the list
// (visibly, never silently) so the sidecar stays skimmable. Sorted A–Z, so
// activate-canvas-field is always shown.
const TRANSITION_CAP = 40;
// Admin/builder chrome carries ~20 identical cross-snapshot nav links; cap the
// list (the message — "inert in-video, swap instead" — needs a few examples,
// not all 20).
const NAV_CAP = 10;

// One-line effect glosses for high-traffic transitions. Anything not listed
// falls back to a generic phrase; interactivity.js stays the source of truth.
const EFFECT_GLOSS = {
  'activate-canvas-field': 'activates the field, reveals its option panel, switches sidebar to Field Options',
  'universal-label': 'mirrors the typed label onto the canvas field title',
  'universal-required': 'toggles the required asterisk on the field',
  'universal-label-hide': 'hides/shows the field label (fadeSwap)',
  'universal-size': 'sets field width Small/Medium/Large',
  'universal-placeholder': 'sets the input placeholder text',
  'switch-sidebar-tab': 'switches the builder sidebar tab',
};

// ───────────────────────── CLI ─────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set();
  const slugs = [];
  let port = process.env.PORT ? Number(process.env.PORT) : 4321;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--port') { port = Number(args[++i]); continue; }
    if (a.startsWith('--port=')) { port = Number(a.split('=')[1]); continue; }
    if (a.startsWith('--')) { flags.add(a); continue; }
    slugs.push(a);
  }
  return { flags, slugs, port };
}

function allSnapshotSlugs() {
  return fs.readdirSync(SNAP_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_') && d.name !== 'node_modules')
    .map(d => d.name)
    .filter(s => fs.existsSync(path.join(SNAP_DIR, s, 'index.html')))
    .sort();
}

// ───────────────────────── server ─────────────────────────

function probeServer(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/scenes/snapshot-viewer.html`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(750, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer(port) {
  if (await probeServer(port)) return null; // already up — leave it running
  const child = spawn(process.execPath, [path.join(ROOT, 'serve.js')], {
    cwd: ROOT, stdio: 'ignore', detached: false, env: { ...process.env, PORT: String(port) },
  });
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (await probeServer(port)) return child;
  }
  try { child.kill(); } catch (_) {}
  throw new Error(`could not start serve.js on port ${port}`);
}

// ───────────────────────── in-frame analysis ─────────────────────────
// Runs entirely inside the snapshot's iframe. Receives the catalog's candidate
// selectors; returns only serializable data. NB: this whole function body is
// serialized to the browser — keep it self-contained (no Node closures).

function analyzeInFrame() {
  return (candidates) => {
    // — class / id hygiene (mirrors generate-snapshot-catalog.js intent) —
    const STATE_CLASSES = new Set([
      'active', 'is-active', 'wpforms-active', 'open', 'is-open', 'selected',
      'wpforms-hidden', 'hidden', 'focus', 'hover', 'wpforms-error',
      'size-small', 'size-medium', 'size-large', 'label_empty', 'required',
    ]);
    const CHROME_ID_PREFIX = [
      'wp-admin-bar-', 'wpadminbar', 'adminmenu', 'wpwrap', 'wpbody',
      'wpcontent', 'wpfooter', 'a11y-speak-', 'screen-meta', 'contextual-help',
      'wp-link-', 'menu-', 'tab-panel-', 'tab-link-',
    ];
    function isChromeId(id) {
      return CHROME_ID_PREFIX.some(p => id.startsWith(p));
    }
    function isHashedClass(c) {
      if (/^css-[0-9a-z]+$/i.test(c)) return true;     // emotion
      if (/^sc-[A-Za-z]+$/.test(c)) return true;        // styled-components
      // mixed-case+digit short token (content-hash like jTrPJq / a1B2c3)
      if (c.length <= 8 && /[a-z]/.test(c) && /[A-Z]/.test(c) && /[0-9]/.test(c)) return true;
      return false;
    }
    function stableClasses(el) {
      return [...el.classList].filter(c =>
        c && !STATE_CLASSES.has(c) && !isHashedClass(c));
    }
    // Prefer wpforms-/choices classes (bundled-CSS stable), then the rest.
    function pickStableClasses(classes, max) {
      const pref = classes.filter(c => c.startsWith('wpforms-') || c === 'choices' || c.startsWith('choices__'));
      const rest = classes.filter(c => !pref.includes(c));
      return [...pref, ...rest].slice(0, max);
    }
    function esc(s) {
      return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&');
    }
    function visibleText(el) {
      let t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t && el.value) t = String(el.value);
      if (!t) t = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || '';
      t = t.replace(/\s+/g, ' ').trim();
      return t.length > 60 ? t.slice(0, 59) + '…' : t;
    }
    function dataAttrSel(el, max) {
      const out = [];
      for (const a of el.attributes) {
        if (a.name.startsWith('data-') && out.length < max) {
          // value-bearing for type-like attrs, presence otherwise
          if (/^data-(field-type|template|provider|panel|section)$/.test(a.name) && a.value) {
            out.push(`[${a.name}="${a.value}"]`);
          }
        }
      }
      return out.join('');
    }

    // A node's own compact handle: unique id → tag + ≤2 stable classes + data.
    function ownLocal(el) {
      if (el.id && !isChromeId(el.id) && document.querySelectorAll('#' + esc(el.id)).length === 1) {
        return '#' + esc(el.id);
      }
      const tag = el.tagName.toLowerCase();
      const cls = pickStableClasses(stableClasses(el), 2);
      return tag + cls.map(c => '.' + esc(c)).join('') + dataAttrSel(el, 2);
    }
    const isSpecific = (sel) => /[.#\[]/.test(sel);
    function firstAccepts(sel, matchFn) {
      try { const f = document.querySelector(sel); return !!(f && (!matchFn || matchFn(f))); }
      catch (_) { return false; }
    }
    // Precise nth-of-type path — correctness fallback when nothing cleaner
    // points at an accepted node. Always resolves.
    function preciseCssPath(el) {
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && node !== document.body) {
        let s = node.tagName.toLowerCase();
        const cls = pickStableClasses(stableClasses(node), 1);
        if (cls.length) s += '.' + cls.map(esc).join('.');
        const parent = node.parentElement;
        if (parent) {
          const sibs = [...parent.children].filter(c => c.tagName === node.tagName);
          if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(node) + 1})`;
        }
        parts.unshift(s);
        if (node.id && !isChromeId(node.id)) { parts[0] = '#' + esc(node.id); break; }
        node = node.parentElement;
        if (parts.length >= 4) break;
      }
      return parts.join(' > ');
    }
    // Compact, resolvable selector for one node. Prefer its own handle; climb a
    // few ancestors for context if needed; precise path only as last resort.
    function repSelector(el, matchFn) {
      const own = ownLocal(el);
      if (isSpecific(own) && firstAccepts(own, matchFn)) return own;
      let node = el;
      const chain = [own];
      for (let i = 0; i < 3 && node.parentElement; i++) {
        node = node.parentElement;
        chain.unshift(ownLocal(node));
        if (isSpecific(chain[0]) && firstAccepts(chain.join(' '), matchFn)) return chain.join(' ');
      }
      const precise = preciseCssPath(el);
      if (firstAccepts(precise, matchFn)) return precise;
      return isSpecific(own) ? own : precise;
    }

    // Generalized selector for a set of nodes that all fire one transition:
    // the intersection of their stable classes + common data-* keys, if that
    // resolves to an accepted node; else a concrete path for the first node.
    function generalizedSelector(nodes, matchFn) {
      if (nodes.length === 1) return repSelector(nodes[0], matchFn);
      const tags = new Set(nodes.map(n => n.tagName.toLowerCase()));
      const tag = tags.size === 1 ? [...tags][0] : '';
      let common = null;
      for (const n of nodes) {
        const cs = new Set(stableClasses(n));
        common = common === null ? cs : new Set([...common].filter(c => cs.has(c)));
      }
      const cls = pickStableClasses([...(common || [])].sort(), 2);
      let dataKeys = null;
      for (const n of nodes) {
        const ks = new Set([...n.attributes].map(a => a.name).filter(k => k.startsWith('data-')));
        dataKeys = dataKeys === null ? ks : new Set([...dataKeys].filter(k => ks.has(k)));
      }
      const attrSel = [...(dataKeys || [])].sort().slice(0, 2).map(k => `[${k}]`).join('');
      const sel = (cls.length ? '' : tag) + cls.map(c => '.' + esc(c)).join('') + attrSel;
      if (isSpecific(sel) && firstAccepts(sel, matchFn)) return sel;
      return repSelector(nodes[0], matchFn);
    }

    // — #1: validate + enrich + role-classify the candidate selectors —
    const ROLE = { actions: [], inputs: [], fields: [], tabsNav: [], panelsModals: [], other: [] };
    const seenNodes = new Set();
    const seenSel = new Set();
    let dropped = 0;

    // A hidden node resolves but can't be aimed at by a beat (#wp-auth-check
    // "Session expired" shipped as a plausible target in two runs' outlines).
    function isHiddenTarget(el) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return true;
      return false;
    }

    function roleOf(el, sel) {
      const tag = el.tagName.toLowerCase();
      const cl = el.className && el.className.baseVal !== undefined ? '' : String(el.className || '');
      const role = el.getAttribute('role') || '';
      if (el.matches('[data-field-type], .wpforms-field')) return 'fields';
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return 'inputs';
      if (tag === 'button' || (tag === 'a' && el.hasAttribute('href')) || role === 'button' ||
          /-(button|btn|add|save|submit|close|dismiss|toggle)\b/.test(cl) || /-(button|btn|add|save|submit)$/.test(sel)) {
        return 'actions';
      }
      if (role === 'tab' || /sidebar-section|nav-|\bnav\b|-tab\b/.test(cl) || /sidebar-section|-tab/.test(sel)) return 'tabsNav';
      if (/panel|modal|wizard|popup|-section\b/.test(cl) || /panel|modal|wizard|popup|data-panel|data-section/.test(sel)) return 'panelsModals';
      return 'other';
    }

    for (const sel of candidates) {
      if (seenSel.has(sel)) continue;
      seenSel.add(sel);
      let el;
      try { el = document.querySelector(sel); } catch (_) { dropped++; continue; }
      if (!el) { dropped++; continue; }
      if (seenNodes.has(el)) continue;          // same node via 2 selectors
      seenNodes.add(el);
      const count = (() => { try { return document.querySelectorAll(sel).length; } catch (_) { return 1; } })();
      const entry = {
        sel,
        tag: el.tagName.toLowerCase(),
        text: visibleText(el),
        count,
        hidden: isHiddenTarget(el),
      };
      ROLE[roleOf(el, sel)].push(entry);
    }

    // Synthesize the generic canvas-field selector when fields exist (the
    // per-instance data-field-id selectors are intentionally omitted as noise).
    if (document.querySelector('.wpforms-field[data-field-id]')) {
      const n = document.querySelectorAll('.wpforms-field[data-field-id]').length;
      if (!ROLE.fields.some(e => e.sel === '.wpforms-field[data-field-id]')) {
        ROLE.fields.unshift({ sel: '.wpforms-field[data-field-id]', tag: 'div', text: 'any canvas field', count: n });
      }
    }

    // — #2a: drivable transitions (registry match against this DOM) —
    const T = window.__wpfTransitions || null;
    const registryPresent = Array.isArray(T);
    const transitions = [];
    if (registryPresent) {
      const all = Array.from(document.querySelectorAll('*'));
      for (const t of T) {
        if (!t || typeof t.match !== 'function') continue;
        const matched = [];
        for (const el of all) {
          let ok = false;
          try { ok = !!t.match(el); } catch (_) { ok = false; }
          if (ok) matched.push(el);
        }
        if (!matched.length) continue;
        // Roots = matched nodes not nested inside another matched node — the
        // natural click/change targets (e.g. the .wpforms-field itself, not
        // its every descendant).
        const set = new Set(matched);
        const roots = matched.filter(el => {
          let p = el.parentElement;
          while (p) { if (set.has(p)) return false; p = p.parentElement; }
          return true;
        });
        const repNodes = roots.length ? roots : matched;
        const selector = generalizedSelector(repNodes, t.match);
        transitions.push({
          label: String(t.label || '(unlabeled)'),
          event: String(t.event || 'click'),
          selector,
          // Count distinct trigger targets (roots), not every matched
          // descendant — clicking any descendant of a canvas field fires
          // activate-canvas-field, but the author targets the field.
          count: roots.length || matched.length,
        });
      }
    }

    // — #2b: hand-browse-only cross-snapshot nav —
    // Mirrors interactivity.js adminSnapshotSlugFor (~line 7559). These links
    // are real in the DOM but their handler bails in-iframe, so an author must
    // ifm.swap() to the mapped sibling instead of "clicking" them.
    function adminSnapshotSlugFor(url) {
      let page, view;
      try { page = url.searchParams.get('page'); view = url.searchParams.get('view'); }
      catch (_) { return null; }
      if (!page || page.indexOf('wpforms') !== 0) return null;
      switch (page) {
        case 'wpforms-settings':  return 'admin-settings-' + (view || 'general');
        case 'wpforms-tools':     return 'admin-tools-' + (view || 'import');
        case 'wpforms-payments':  return view ? 'admin-payments-' + view : 'admin-payments';
        case 'wpforms-overview':  return 'admin-forms-overview';
        case 'wpforms-entries':   return 'admin-entries-overview';
        case 'wpforms-addons':    return 'admin-addons';
        case 'wpforms-templates': return 'admin-templates';
        case 'wpforms-builder':
          if (!view || view === 'setup') return 'builder-setup';
          if (view === 'fields') return 'builder-fields';
          return null;
        default: return null;
      }
    }
    const navMap = {};
    for (const a of document.querySelectorAll('a[href*="admin.php?page=wpforms"]')) {
      let url;
      try { url = new URL(a.href); } catch (_) { continue; }
      const target = adminSnapshotSlugFor(url);
      if (!target) continue;
      const page = url.searchParams.get('page');
      const view = url.searchParams.get('view');
      // Include view so same-page-different-view links (e.g. all the
      // wpforms-tools sub-tabs) get distinct, resolvable selectors.
      const hrefSel = `a[href*="page=${page}"]` + (view ? `[href*="view=${view}"]` : '');
      if (!navMap[target]) navMap[target] = { target, page, hrefSel };
    }

    // — #2c (AP-15, 2026-09-02): per-entry wiring, computed HERE where real
    // `matches()` semantics exist. WIRED = clicking this element (or an
    // ancestor the click bubbles to) fires a registry transition;
    // HAND-BROWSE = it is / contains a mapped admin nav link. Stored per
    // Actions/Tabs entry so inspect-snapshot --emit-actions never re-derives
    // it with regexes (the old regex pass reported WIRED 0 on every snapshot).
    const wiredOf = (el) => {
      if (!registryPresent) return null;
      for (const t of T) {
        if (!t || typeof t.match !== 'function') continue;
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          let hit = false;
          try { hit = !!t.match(n); } catch (_) { hit = false; }
          if (hit) return { label: String(t.label || '(unlabeled)'), event: String(t.event || 'click') };
        }
      }
      return null;
    };
    const navTargets = Object.values(navMap);
    const navOf = (el) => {
      for (const n of navTargets) {
        try {
          if (el.matches(n.hrefSel) || (el.closest && el.closest(n.hrefSel)) || el.querySelector(n.hrefSel)) return n.target;
        } catch (_) { /* selector engine quirk — skip */ }
      }
      return null;
    };
    for (const key of ['actions', 'tabsNav']) {
      for (const e of ROLE[key]) {
        let el = null;
        try { el = document.querySelector(e.sel); } catch (_) { el = null; }
        if (!el) continue;
        const w = wiredOf(el);
        if (w) { e.wired = w.label; e.wiredEvent = w.event; }
        else {
          const nv = navOf(el);
          if (nv) e.nav = nv;
        }
      }
    }

    return {
      roles: ROLE,
      dropped,
      registryPresent,
      transitions,
      nav: Object.values(navMap),
      elementCount: document.querySelectorAll('*').length,
    };
  };
}

// ───────────────────────── markdown ─────────────────────────

// (AP-17, 2026-09-02) transition labels whose interactivity.js block banner
// carries `@source synthetic` — drivable rows get a marker so storyboards
// never trust a fabricated UI as product truth (ee 1: the PDF block
// fabricates a retired UI and would have production-truth-trapped a build).
let _synthLabelsCache = null;
function syntheticLabels() {
  if (_synthLabelsCache) return _synthLabelsCache;
  const out = new Set();
  try {
    const src = fs.readFileSync(path.join(SNAP_DIR, '_shared', 'interactivity.js'), 'utf8');
    let synthetic = false;
    for (const line of src.split(/\r?\n/)) {
      if (/^\s*\/\/ ─ .+─{3,}\s*$/.test(line)) synthetic = false; // banner resets the span
      if (/^\s*\/\/ @since \S+ @source synthetic\b/.test(line)) synthetic = true;
      const m = line.match(/label:\s*'([^']+)'/);
      if (m && synthetic && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(m[1])) out.add(m[1]);
    }
  } catch (_) { /* no registry — no markers */ }
  _synthLabelsCache = out;
  return out;
}

function fmtEntry(e) {
  const text = e.text ? ` — "${e.text.replace(/"/g, '”')}"` : '';
  const cnt = e.count > 1 ? ` _(×${e.count})_` : '';
  const hid = e.hidden ? ' _(hidden)_' : '';
  return `- \`${e.sel}\` — ${e.tag}${text}${cnt}${hid}`;
}

function groupBlock(title, entries) {
  if (!entries.length) return '';
  // Alphabetical, hidden entries NOT demoted: demoting below the GROUP_CAP
  // silently removes them, and the whole point is the visible _(hidden)_ flag
  // (an author may still deliberately reveal one via DOM puppetry).
  const sorted = entries.slice().sort((a, b) => a.sel.localeCompare(b.sel));
  const shown = sorted.slice(0, GROUP_CAP);
  let out = `### ${title}\n`;
  for (const e of shown) out += fmtEntry(e) + '\n';
  if (sorted.length > shown.length) {
    out += `- _… +${sorted.length - shown.length} more — see catalog.md_\n`;
  }
  return out + '\n';
}

function renderOutline(slug, data, kb) {
  const r = data.roles;
  let md = '';
  md += `# Outline — ${slug}\n`;
  md += `> Auto-generated by tools/generate-snapshot-outline.js. Do not hand-edit; regenerate after recapture.\n`;
  md += `> Source: index.html (${data.elementCount} els, ${kb} KB). Deep reference: catalog.md.\n\n`;

  md += `## Targets\n`;
  md += `_Selectors validated against the live DOM — every one resolves._\n\n`;
  const anyTargets = ['actions', 'inputs', 'fields', 'tabsNav', 'panelsModals', 'other']
    .some(k => r[k].length);
  if (!anyTargets) md += `_No author-targetable handles found._\n\n`;
  md += groupBlock('Actions (buttons / links)', r.actions);
  md += groupBlock('Inputs & controls', r.inputs);
  md += groupBlock('Fields (canvas)', r.fields);
  md += groupBlock('Tabs & nav', r.tabsNav);
  md += groupBlock('Panels & modals', r.panelsModals);
  md += groupBlock('Other anchors', r.other);

  md += `## Interactions — drivable inside the video iframe\n`;
  md += `_Fire by driving the real control (click/change/type); interactivity.js mutates the DOM in place._\n\n`;
  if (!data.registryPresent) {
    md += `_interactivity.js is not linked on this snapshot — no in-page transitions._\n\n`;
  } else if (!data.transitions.length) {
    md += `_No interactivity.js transitions fire on this snapshot's DOM._\n\n`;
  } else {
    const synth = syntheticLabels();
    const sorted = data.transitions.slice().sort((a, b) =>
      a.label.localeCompare(b.label) || a.event.localeCompare(b.event));
    const shown = sorted.slice(0, TRANSITION_CAP);
    for (const t of shown) {
      // The label is self-describing; only add a gloss for curated entries to
      // avoid a 45-char boilerplate phrase repeated 100+ times on builders.
      const gloss = EFFECT_GLOSS[t.label] ? ` — ${EFFECT_GLOSS[t.label]}` : '';
      const cnt = t.count > 1 ? ` _(×${t.count})_` : '';
      const syn = synth.has(t.label) ? ' _(synthetic — verify product UI)_' : '';
      md += `- ${t.event} \`${t.selector}\` → \`${t.label}\`${gloss}${cnt}${syn}\n`;
    }
    if (sorted.length > shown.length) {
      md += `- _… +${sorted.length - shown.length} more drivable transitions — see interactivity.js_\n`;
    }
    md += '\n';
  }

  md += `## Interactions — HAND-BROWSE ONLY (inert in video; use ifm.swap)\n`;
  md += `_These admin links navigate when hand-browsing /snapshots/ but their handler bails in-iframe (window.top !== window). In a video, swap snapshots instead._\n\n`;
  if (!data.nav.length) {
    md += `_None._\n`;
  } else {
    const sorted = data.nav.slice().sort((a, b) => a.target.localeCompare(b.target));
    const shown = sorted.slice(0, NAV_CAP);
    for (const n of shown) {
      md += `- click \`${n.hrefSel}\` → cross-snapshot nav → use \`ifm.swap('${n.target}')\`\n`;
    }
    if (sorted.length > shown.length) {
      md += `- _… +${sorted.length - shown.length} more admin links — all inert in-video; swap instead_\n`;
    }
  }
  return md;
}

// ───────────────────────── per-slug ─────────────────────────

async function emitFor(slug, browser, port, knownSlugs) {
  const snapDir = path.join(SNAP_DIR, slug);
  const htmlPath = path.join(snapDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(`[skip] ${slug}: no index.html`);
    return { slug, ok: false };
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const kb = Math.round(fs.statSync(htmlPath).size / 1024);

  // #1 candidate selectors from the catalog's static parser (+ Rule A scoping).
  // Drop per-instance / volatile noise: choices.js generated option items (one
  // ID per dropdown option — 100+ on a forms picker) and TinyMCE `mceu_*` IDs
  // (counter-assigned, not stable authoring targets) carry no value.
  const NOISE_SEL = /^#choices--|item-choice-|^#wpforms-field-option-row-\d+-|mceu_/;
  const entries = extractEntries(html);
  const candidates = [];
  for (const e of entries.ids) candidates.push(e.selector);
  for (const e of entries.dataFieldTypes) candidates.push(e.selector);
  for (const e of entries.dataPanels) candidates.push(e.selector);
  for (const e of entries.dataSections) candidates.push(e.selector);
  for (const e of entries.classes) candidates.push(e.selector);
  const filtered = candidates.filter(s => !NOISE_SEL.test(s));

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  let data;
  try {
    const url = `http://localhost:${port}/scenes/snapshot-viewer.html?snap=${slug}`;
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    const frameHandle = await page.waitForSelector('iframe#frame', { state: 'attached', timeout: 15000 });
    const frame = await frameHandle.contentFrame();
    if (!frame) throw new Error('no iframe content frame');
    // CRITICAL: wait for the FULL parse. A 5.2 MB snapshot is still streaming
    // when <body> first attaches, so reading then misses late elements and the
    // result varies per load (non-deterministic dangling selectors). readyState
    // 'complete' = fully parsed + subresources done + interactivity.js run.
    await frame.waitForFunction(() => document.readyState === 'complete', { timeout: 25000 });
    await frame.waitForFunction(
      () => window.__wpfTransitions !== undefined || !document.querySelector('script[src*="interactivity"]'),
      { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(300); // settle any init-time rAF/setTimeout DOM tweaks
    data = await frame.evaluate(analyzeInFrame(), filtered);
  } finally {
    await page.close().catch(() => {});
  }

  // Filter nav targets to siblings that actually exist on disk.
  data.nav = data.nav.filter(n => knownSlugs.has(n.target));

  const md = renderOutline(slug, data, kb);
  const outPath = path.join(snapDir, 'outline.md');
  fs.writeFileSync(outPath, md);

  // outline.json (AP-15, 2026-09-02): the UNCAPPED machine-readable twin —
  // outline.md caps at 40 transitions / 10 nav / 10 rows per group for human
  // reading; this carries everything, plus the per-entry wired/nav fields.
  // No timestamp: regeneration from the same index.html stays byte-identical
  // (the outline.md idempotency principle applies here too).
  const outlineJson = {
    slug,
    registryPresent: !!data.registryPresent,
    transitions: data.transitions,
    nav: data.nav,
    groups: {
      actions: data.roles.actions,
      tabsNav: data.roles.tabsNav,
      inputs: data.roles.inputs,
      fields: data.roles.fields,
      panelsModals: data.roles.panelsModals,
      other: data.roles.other,
    },
  };
  fs.writeFileSync(path.join(snapDir, 'outline.json'), JSON.stringify(outlineJson, null, 2) + '\n');

  const bytes = Buffer.byteLength(md, 'utf8');
  const flag = bytes > SIZE_HARD_MAX ? ' ⚠OVER-HARD' : bytes > SIZE_SOFT_MAX ? ' ·over-soft' : '';
  const drv = data.registryPresent ? `${data.transitions.length} drivable` : 'no-interactivity';
  console.log(`[outline] ${slug} → ${(bytes / 1024).toFixed(1)} KB${flag}  (${drv}, ${data.nav.length} nav, ${data.dropped} dangling dropped)`);
  return { slug, ok: true, bytes, transitions: data.transitions.length, nav: data.nav.length, dropped: data.dropped };
}

// ───────────────────────── main ─────────────────────────

async function main() {
  const { flags, slugs, port } = parseArgs(process.argv);
  const list = flags.has('--all') ? allSnapshotSlugs() : slugs;
  if (!list.length) {
    console.error('Usage: node tools/generate-snapshot-outline.js <slug> [<slug> ...] | --all [--port N] [--keep-server]');
    process.exit(3);
  }
  const knownSlugs = new Set(allSnapshotSlugs());

  const server = await ensureServer(port);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const slug of list) {
      try {
        results.push(await emitFor(slug, browser, port, knownSlugs));
      } catch (e) {
        console.error(`[fail] ${slug}: ${e.message}`);
        results.push({ slug, ok: false });
      }
    }
  } finally {
    await browser.close().catch(() => {});
    if (server && !flags.has('--keep-server')) { try { server.kill(); } catch (_) {} }
  }

  const ok = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  if (ok.length) {
    const sizes = ok.map(r => r.bytes);
    const avg = (sizes.reduce((a, b) => a + b, 0) / sizes.length / 1024).toFixed(1);
    const max = (Math.max(...sizes) / 1024).toFixed(1);
    const over = ok.filter(r => r.bytes > SIZE_HARD_MAX).map(r => r.slug);
    console.log(`\n[outline] ${ok.length} ok, ${failed.length} failed · avg ${avg} KB · max ${max} KB`);
    if (over.length) console.log(`[outline] over ${SIZE_HARD_MAX / 1024} KB: ${over.join(', ')}`);
  }
  if (failed.length) {
    console.log(`[outline] failed: ${failed.map(r => r.slug).join(', ')}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { ensureServer, probeServer, allSnapshotSlugs, analyzeInFrame, renderOutline };
