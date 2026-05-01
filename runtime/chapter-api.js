// Authoring contract. Chapter files call defineChapter({...}) and export the
// result as default. The runner consumes the returned descriptor.
//
// This module is deliberately pure — no DOM, no side effects. It normalises
// the input so downstream code can rely on defaults.

import { listVerbs } from './verbs.js';
import { normalizePrep } from './prep-ops.js';

/**
 * @param {{
 *   slug: string,
 *   title?: string,
 *   snapshot: string,
 *   chapter: string,                 // camera-continuity tag (shared by all steps by default)
 *   prep?: ((doc: Document) => Promise<void> | void) | Array<{op: string, [k: string]: any}>,
 *   narration?: string,              // slug under /narration/<slug>/ — chapter-level, mutually exclusive with step-level
 *   steps: Array<{
 *     id: string,
 *     label?: string,                // HUD label; falls back to id
 *     do: string,                    // verb name — must be in listVerbs()
 *     chapter?: string,              // override chapter tag for this step only
 *     target?: string,               // selector the runner focuses on before the verb runs
 *     fill?: number,                 // focusOn fill; defaults to 0.5
 *     noScroll?: boolean,
 *     preHold?: number,              // ms to sleep after focus, before verb
 *     postHold?: number,             // ms to sleep after verb, before next step
 *     narration?: string,            // per-beat clip slug; runner waits on `ended` before advancing
 *     [verbArg: string]: any,        // typeInto: text; clickOn: instruction/direction; etc
 *   }>,
 * }} opts
 */
export function defineChapter(opts) {
  if (!opts || typeof opts !== 'object') {
    throw new Error('defineChapter: options object required');
  }
  const { slug, snapshot, chapter, steps, title, prep, narration,
          breakStyle, swapStyle } = opts;
  if (!slug)     throw new Error('defineChapter: slug required');
  if (!snapshot) throw new Error('defineChapter: snapshot required');
  if (!chapter)  throw new Error('defineChapter: chapter (camera tag) required');
  if (!Array.isArray(steps) || !steps.length) {
    throw new Error('defineChapter: steps[] required');
  }

  const normalizedPrep = normalizePrep(prep, 'defineChapter[' + slug + ']');

  const known = new Set(listVerbs());
  const seenIds = new Set();
  let anyStepNarration = false;
  const normSteps = steps.map((s, i) => {
    if (!s.id) throw new Error('defineChapter[' + slug + ']: step ' + i + ' missing id');
    if (seenIds.has(s.id)) throw new Error('defineChapter[' + slug + ']: duplicate step id "' + s.id + '"');
    seenIds.add(s.id);
    if (!known.has(s.do)) {
      throw new Error('defineChapter[' + slug + '] step "' + s.id + '": unknown verb "' + s.do +
        '" (known: ' + [...known].join(', ') + ')');
    }
    if (s.narration !== undefined && s.narration !== null) {
      if (typeof s.narration !== 'string' || !s.narration.trim()) {
        throw new Error('defineChapter[' + slug + '] step "' + s.id + '": narration must be a non-empty string slug');
      }
      anyStepNarration = true;
    }
    let stepPrep = s.prep;
    if (s.do === 'snapshotSwap' && stepPrep != null) {
      stepPrep = normalizePrep(stepPrep,
        'defineChapter[' + slug + '] step "' + s.id + '"');
    }
    let stepAfter = s.after;
    if (stepAfter != null) {
      stepAfter = normalizePrep(stepAfter,
        'defineChapter[' + slug + '] step "' + s.id + '" after');
    }
    return {
      ...s,
      prep: stepPrep,
      after: stepAfter,
      label: s.label || s.id,
      chapter: s.chapter || chapter,
    };
  });

  if (narration && anyStepNarration) {
    throw new Error('defineChapter[' + slug + ']: chapter-level `narration` and step-level `narration` are mutually exclusive — pick one authoring pattern per chapter');
  }

  return {
    kind: 'chapter-descriptor',
    slug,
    title: title || slug,
    snapshot,
    chapter,
    prep: normalizedPrep,
    narration: narration || null,
    // Transition styles — applied when entering this chapter from a prior one.
    // `breakStyle` fires on camera-continuity break (same snapshot, new chapter).
    // `swapStyle` fires on snapshot change. Both fall back to manifest defaults,
    // then to the registered 'dolly'/'cover' baselines.
    breakStyle: breakStyle || null,
    swapStyle:  swapStyle  || null,
    steps: normSteps,
  };
}

export function isChapterDescriptor(x) {
  return !!x && x.kind === 'chapter-descriptor';
}
