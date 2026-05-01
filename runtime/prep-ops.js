// Declarative `prep` op registry — Phase 6 Step 7.
//
// Maps op-entry objects (e.g. `{ op: 'applyDefaultForm', keepIds: [1,2,4] }`)
// to invocations of existing `runtime/dom-prep.js` helpers. This module is the
// single adapter layer: zero DOM code lives here, only validation + dispatch.
//
// JS-function `prep: (doc) => …` is normalized in `runtime/chapter-api.js`
// without going through this file — it remains the escape hatch for cases
// the declarative vocabulary doesn't cover.
//
// See `docs/dom-prep.md` for the op vocabulary and `docs/chapter-module-contract.md`
// for the descriptor shape.

import {
  activateFieldOptionGroup,
  applyDefaultForm,
  applyIconChoices,
  applyIconChoicesV2,
  applyImageChoices,
  hideFields,
  removeAdminBar,
  removeBuilderCruft,
  setCheckedChoices,
  setChoiceLabels,
  setChoiceLayout,
  setFieldLabel,
  setFormName,
  setHideLabel,
  setRequired,
  stripQuizEnabled,
} from './dom-prep.js';

const isPosInt = (v) => Number.isInteger(v) && v > 0;
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const isBool = (v) => v === true || v === false;
const VALID_LAYOUT_VALUES = new Set(['1', '2', '3', 'inline']);
const VALID_ICON_STYLE_TAG = new Set(['regular', 'solid', 'brands']);
const VALID_ICON_SIZE      = new Set(['large', 'medium', 'small']);
const VALID_ICON_CHOICE_STYLE = new Set(['default', 'modern', 'classic', 'none']);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const OPS = {
  removeAdminBar: {
    allowedFields: [],
    validate: () => {},
    run: (doc /*, entry */) => removeAdminBar(doc),
  },

  removeBuilderCruft: {
    allowedFields: [],
    validate: () => {},
    run: (doc) => removeBuilderCruft(doc),
  },

  applyDefaultForm: {
    allowedFields: ['keepIds', 'labels', 'formName'],
    validate: (entry, ctx) => {
      if ('keepIds' in entry) {
        const v = entry.keepIds;
        if (!Array.isArray(v) || v.length === 0 || !v.every(isPosInt)) {
          throw new Error(ctx + ': applyDefaultForm.keepIds must be a non-empty array of positive integers');
        }
      }
      if ('labels' in entry) {
        const v = entry.labels;
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
          throw new Error(ctx + ': applyDefaultForm.labels must be an object map of {id: label}');
        }
        for (const [k, label] of Object.entries(v)) {
          if (!isPosInt(Number(k)) || String(Number(k)) !== k) {
            throw new Error(ctx + ': applyDefaultForm.labels key "' + k + '" must be a positive integer');
          }
          if (!isNonEmptyString(label)) {
            throw new Error(ctx + ': applyDefaultForm.labels["' + k + '"] must be a non-empty string');
          }
        }
      }
      if ('formName' in entry && !isNonEmptyString(entry.formName)) {
        throw new Error(ctx + ': applyDefaultForm.formName must be a non-empty string');
      }
    },
    run: (doc, entry) => {
      const opts = {};
      if (entry.keepIds)  opts.keepIds  = entry.keepIds;
      if (entry.labels)   opts.labels   = entry.labels;
      if (entry.formName) opts.formName = entry.formName;
      applyDefaultForm(doc, opts);
    },
  },

  hideFields: {
    allowedFields: ['ids'],
    validate: (entry, ctx) => {
      const v = entry.ids;
      if (!Array.isArray(v) || v.length === 0 || !v.every(isPosInt)) {
        throw new Error(ctx + ': hideFields.ids must be a non-empty array of positive integers');
      }
    },
    run: (doc, entry) => hideFields(doc, entry.ids),
  },

  setFormName: {
    allowedFields: ['name'],
    validate: (entry, ctx) => {
      if (!isNonEmptyString(entry.name)) {
        throw new Error(ctx + ': setFormName.name must be a non-empty string');
      }
    },
    run: (doc, entry) => setFormName(doc, entry.name),
  },

  setFieldLabel: {
    allowedFields: ['id', 'label'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.id)) {
        throw new Error(ctx + ': setFieldLabel.id must be a positive integer');
      }
      if (!isNonEmptyString(entry.label)) {
        throw new Error(ctx + ': setFieldLabel.label must be a non-empty string');
      }
    },
    run: (doc, entry) => setFieldLabel(doc, entry.id, entry.label),
  },

  setChoiceLabels: {
    allowedFields: ['fieldId', 'labels'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': setChoiceLabels.fieldId must be a positive integer');
      }
      if (!Array.isArray(entry.labels) || entry.labels.length === 0 || !entry.labels.every(isNonEmptyString)) {
        throw new Error(ctx + ': setChoiceLabels.labels must be a non-empty array of strings');
      }
    },
    run: (doc, entry) => setChoiceLabels(doc, entry.fieldId, entry.labels),
  },

  setCheckedChoices: {
    allowedFields: ['fieldId', 'indexes'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': setCheckedChoices.fieldId must be a positive integer');
      }
      if (!Array.isArray(entry.indexes) || !entry.indexes.every((v) => Number.isInteger(v) && v >= 0)) {
        throw new Error(ctx + ': setCheckedChoices.indexes must be an array of zero-based integers');
      }
    },
    run: (doc, entry) => setCheckedChoices(doc, entry.fieldId, entry.indexes),
  },

  stripQuizEnabled: {
    allowedFields: [],
    validate: () => {},
    run: (doc) => stripQuizEnabled(doc),
  },

  activateFieldOptionGroup: {
    allowedFields: ['fieldId', 'controlName', 'group'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': activateFieldOptionGroup.fieldId must be a positive integer');
      }
      const hasControl = 'controlName' in entry;
      const hasGroup = 'group' in entry;
      if (hasControl === hasGroup) {
        throw new Error(ctx + ': activateFieldOptionGroup requires exactly one of `controlName` or `group`');
      }
      if (hasControl && !isNonEmptyString(entry.controlName)) {
        throw new Error(ctx + ': activateFieldOptionGroup.controlName must be a non-empty string');
      }
      if (hasGroup && !isNonEmptyString(entry.group)) {
        throw new Error(ctx + ': activateFieldOptionGroup.group must be a non-empty string');
      }
    },
    run: (doc, entry) => activateFieldOptionGroup(doc, entry.fieldId, {
      controlName: entry.controlName,
      group: entry.group,
    }),
  },

  setChoiceLayout: {
    allowedFields: ['fieldId', 'value'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': setChoiceLayout.fieldId must be a positive integer');
      }
      const v = entry.value;
      const norm = typeof v === 'number' ? String(v) : v;
      if (!isNonEmptyString(norm) || !VALID_LAYOUT_VALUES.has(norm)) {
        throw new Error(ctx + ': setChoiceLayout.value must be one of "1", "2", "3", "inline"');
      }
    },
    run: (doc, entry) => setChoiceLayout(doc, entry.fieldId, entry.value),
  },

  applyIconChoices: {
    allowedFields: ['fieldId', 'glyph'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': applyIconChoices.fieldId must be a positive integer');
      }
      if ('glyph' in entry && !isNonEmptyString(entry.glyph)) {
        throw new Error(ctx + ': applyIconChoices.glyph must be a non-empty string when provided');
      }
    },
    run: (doc, entry) => applyIconChoices(doc, entry.fieldId, entry.glyph ? { glyph: entry.glyph } : {}),
  },

  // Generic Use Icon Choices payoff for radio + checkbox fields. Replaces
  // the deprecated `applyIconChoices` (unicode-star stand-in). See
  // dom-prep.js applyIconChoicesV2 + docs/wpforms-field-state-inventory.md
  // § 6 Multiple Choice → Use Icon Choices.
  applyIconChoicesV2: {
    allowedFields: ['fieldId', 'glyph', 'iconStyle', 'color', 'size', 'style'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': applyIconChoicesV2.fieldId must be a positive integer');
      }
      if ('glyph' in entry && !isNonEmptyString(entry.glyph)) {
        throw new Error(ctx + ': applyIconChoicesV2.glyph must be a non-empty string (FA name without prefix, e.g. "face-smile")');
      }
      if ('iconStyle' in entry) {
        if (!VALID_ICON_STYLE_TAG.has(entry.iconStyle)) {
          throw new Error(ctx + ': applyIconChoicesV2.iconStyle must be one of "regular", "solid", "brands"');
        }
      }
      if ('color' in entry) {
        if (!isNonEmptyString(entry.color) || !HEX_COLOR_RE.test(entry.color)) {
          throw new Error(ctx + ': applyIconChoicesV2.color must be a hex color like "#066aab"');
        }
      }
      if ('size' in entry && !VALID_ICON_SIZE.has(entry.size)) {
        throw new Error(ctx + ': applyIconChoicesV2.size must be one of "large", "medium", "small"');
      }
      if ('style' in entry && !VALID_ICON_CHOICE_STYLE.has(entry.style)) {
        throw new Error(ctx + ': applyIconChoicesV2.style must be one of "default", "modern", "classic", "none"');
      }
    },
    run: (doc, entry) => applyIconChoicesV2(doc, entry.fieldId, {
      ...(entry.glyph != null     ? { glyph: entry.glyph }         : {}),
      ...(entry.iconStyle != null ? { iconStyle: entry.iconStyle } : {}),
      ...(entry.color != null     ? { color: entry.color }         : {}),
      ...(entry.size != null      ? { size: entry.size }           : {}),
      ...(entry.style != null     ? { style: entry.style }         : {}),
    }),
  },

  applyImageChoices: {
    allowedFields: ['fieldId'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': applyImageChoices.fieldId must be a positive integer');
      }
    },
    run: (doc, entry) => applyImageChoices(doc, entry.fieldId),
  },

  setHideLabel: {
    allowedFields: ['fieldId', 'hidden'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': setHideLabel.fieldId must be a positive integer');
      }
      if (!isBool(entry.hidden)) {
        throw new Error(ctx + ': setHideLabel.hidden must be boolean');
      }
    },
    run: (doc, entry) => setHideLabel(doc, entry.fieldId, entry.hidden),
  },

  setRequired: {
    allowedFields: ['fieldId', 'on'],
    validate: (entry, ctx) => {
      if (!isPosInt(entry.fieldId)) {
        throw new Error(ctx + ': setRequired.fieldId must be a positive integer');
      }
      if (!isBool(entry.on)) {
        throw new Error(ctx + ': setRequired.on must be boolean');
      }
    },
    run: (doc, entry) => setRequired(doc, entry.fieldId, entry.on),
  },
};

export function listOps() {
  return Object.keys(OPS);
}

export function hasOp(name) {
  return Object.prototype.hasOwnProperty.call(OPS, name);
}

/**
 * Validate one op entry and return a runner closure `(doc) => void`.
 * Throws on shape errors so `defineChapter()` (and the validator)
 * surface malformed prep at define time, not run time.
 */
export function compileOp(entry, ctx) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(ctx + ': prep entry must be a plain object with an `op` field');
  }
  if (!isNonEmptyString(entry.op)) {
    throw new Error(ctx + ': prep entry missing `op` (must be a non-empty string)');
  }
  if (!hasOp(entry.op)) {
    throw new Error(ctx + ': unknown prep op "' + entry.op + '" (known: ' + listOps().join(', ') + ')');
  }
  const def = OPS[entry.op];
  const allowed = new Set(['op', ...def.allowedFields]);
  for (const key of Object.keys(entry)) {
    if (!allowed.has(key)) {
      throw new Error(ctx + ': unknown field "' + key + '" on op "' + entry.op +
        '" (allowed: ' + (def.allowedFields.length ? def.allowedFields.join(', ') : '<none>') + ')');
    }
  }
  def.validate(entry, ctx);
  return (doc) => def.run(doc, entry);
}

/**
 * Compile a prep value (function | array | null) into a runner function.
 * Returns null for null/undefined input. Throws on malformed shape.
 */
export function normalizePrep(prep, ctx) {
  if (prep == null) return null;
  if (typeof prep === 'function') return prep;
  if (!Array.isArray(prep)) {
    throw new Error(ctx + ': prep must be a function, an array of op entries, or null');
  }
  const compiled = prep.map((entry, i) => compileOp(entry, ctx + ' prep[' + i + ']'));
  return async (doc) => {
    for (const run of compiled) await run(doc);
  };
}
