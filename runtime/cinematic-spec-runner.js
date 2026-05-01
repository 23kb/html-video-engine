// Cinematic spec runner — tiny dispatcher for lifecycle cinematics.
//
// Given a spec (see docs/cinematic-spec-contract.md), resolves
// spec.kind → runtime/cinematic-<kind>.js, flattens opts, calls
// mount(), and returns the lifecycle contract:
//
//   const result = await runSpec(spec);
//   // result: { root, animPromise, dismiss }
//
// Lab-only entry point. Does NOT orchestrate narration, BGM, or
// covers — those belong to the future postIntro lifecycle slot
// (Slice 1c). Keep this module deliberately small.

/**
 * Typed error thrown by `runSpec`. The lab discriminates on `.code`
 * to render the right "not implemented yet" / diagnostic panel.
 */
export class SpecRunnerError extends Error {
  constructor({ code, kind, cause }) {
    super(`cinematic-spec-runner: ${code} (kind=${kind})`);
    this.name = 'SpecRunnerError';
    this.code = code;                 // string discriminator
    this.kind = kind;                 // string — spec.kind at fail time
    if (cause) this.cause = cause;    // underlying error, if any
  }
}

/**
 * Map a spec to the opts object the archetype's mount() expects.
 * The runner's whole transformation: bring `theme` and `duration`
 * up alongside the archetype-specific `opts.*` payload.
 */
function flattenOpts(spec) {
  return {
    theme: spec.theme || {},
    duration: spec.duration,
    ...(spec.opts || {}),
  };
}

/**
 * Resolve `spec.kind` → archetype module → call mount().
 *
 * @param {object} spec — see docs/cinematic-spec-contract.md
 * @returns {Promise<{root: HTMLElement, animPromise: Promise<void>, dismiss: () => Promise<void>}>}
 * @throws {SpecRunnerError}
 */
export async function runSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new SpecRunnerError({ code: 'spec-missing', kind: '<none>' });
  }
  if (!spec.kind || typeof spec.kind !== 'string') {
    throw new SpecRunnerError({ code: 'spec-missing-kind', kind: '<none>' });
  }

  const url = `./cinematic-${spec.kind}.js`;
  let mod;
  try {
    mod = await import(url);
  } catch (e) {
    // Browsers throw TypeError on a 404 dynamic import. Treat any
    // import failure as "kind not implemented" — that's the actionable
    // message the lab reviewer needs.
    throw new SpecRunnerError({ code: 'kind-not-implemented', kind: spec.kind, cause: e });
  }

  if (typeof mod.mount !== 'function') {
    throw new SpecRunnerError({ code: 'kind-missing-mount', kind: spec.kind });
  }

  const opts = flattenOpts(spec);
  const result = await mod.mount(opts);

  if (
    !result ||
    typeof result.dismiss !== 'function' ||
    !('animPromise' in result)
  ) {
    throw new SpecRunnerError({ code: 'kind-bad-return', kind: spec.kind });
  }

  return result;
}
