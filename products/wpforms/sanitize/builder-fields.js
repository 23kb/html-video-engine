import { rebrandLiveDomain } from './_common.js';

// Visual cleanup in the sanitize pipeline: this builder fixture is shared by
// many videos via per-video keep-lists. It is not PII scrubbing.
export const DEFAULT_FIELD_SET = ['name', 'email', 'textarea'];

function normalizeKeepFields(keepFields) {
  return Array.isArray(keepFields) && keepFields.length
    ? keepFields.map(String)
    : DEFAULT_FIELD_SET;
}

function keepBuilderCanvasFields(doc, keepFields) {
  const wrap = doc.querySelector('#wpforms-panel-fields .wpforms-field-wrap')
            || doc.querySelector('.wpforms-field-wrap');
  if (!wrap) return;

  const remaining = new Set(normalizeKeepFields(keepFields));
  Array.from(wrap.children).forEach(child => {
    const type = child.getAttribute?.('data-field-type');
    if (!type || !remaining.has(type)) {
      child.remove();
      return;
    }
    remaining.delete(type);
  });

  const preview = wrap.closest('.wpforms-preview');
  preview?.querySelectorAll('#wpforms-paypal-commerce-buttons-wrapper, [class*="card-fields"]').forEach(el => {
    el.remove();
  });
}

export default function sanitize(doc, opts = {}) {
  rebrandLiveDomain(doc);
  keepBuilderCanvasFields(doc, opts.keepFields);
}
