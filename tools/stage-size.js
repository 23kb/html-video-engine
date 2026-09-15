// stage-size.js — resolve the render/viewport resolution for a single-HTML video.
//
// Landscape tutorials (1920x1080) and portrait shorts (1080x1920) differ only by
// the video's `.stage` CSS box — the stage IS the source of truth, so tools read
// it instead of hardcoding 1920x1080. An explicit --resolution always wins.
//
// This exists to kill one specific failure: recording a portrait page into a
// landscape viewport, which produces the pillar-boxed strip-in-the-middle result
// (the exact artifact Kacie flagged on spliced shorts, 2026-08-05). Forgetting a
// flag should not be able to cause it.
//
// See docs/vertical-shorts.md.

const fs = require('fs');

const DEFAULT = { width: 1920, height: 1080 };

// "1080x1920" → { width, height }. Throws on malformed input (usage error).
function parseResolution(str) {
  const m = /^(\d{2,5})x(\d{2,5})$/i.exec(String(str).trim());
  if (!m) throw new Error(`--resolution must look like 1080x1920, got: ${str}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

// Read `.stage { width: Npx; height: Mpx }` out of a video's HTML. Returns null
// when the file is unreadable or the block isn't in the expected shape — callers
// fall back to DEFAULT rather than guessing.
function stageSizeFromHtml(htmlPath) {
  let html;
  try { html = fs.readFileSync(htmlPath, 'utf8'); } catch (_) { return null; }
  const block = /\.stage\s*\{([^}]*)\}/.exec(html);
  if (!block) return null;
  const w = /(?:^|[;{\s])width:\s*(\d+)px/.exec(block[1]);
  const h = /(?:^|[;{\s])height:\s*(\d+)px/.exec(block[1]);
  if (!w || !h) return null;
  return { width: Number(w[1]), height: Number(h[1]) };
}

// Precedence: explicit flag → the page's own .stage box → 1920x1080.
// `source` is for logging so a surprising resolution is traceable.
function resolveResolution({ resolutionArg, htmlPath } = {}) {
  if (resolutionArg) return { ...parseResolution(resolutionArg), source: 'flag' };
  if (htmlPath) {
    const stage = stageSizeFromHtml(htmlPath);
    if (stage) return { ...stage, source: 'stage' };
  }
  return { ...DEFAULT, source: 'default' };
}

module.exports = { parseResolution, stageSizeFromHtml, resolveResolution, DEFAULT };
