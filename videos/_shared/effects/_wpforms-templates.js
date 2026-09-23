// videos/_shared/effects/_wpforms-templates.js — compatibility shim.
//
// The real WPForms template data + card markup live in the WPForms pack since
// 2026-09-23 (rename Phase 3): products/wpforms/film/wpforms-templates.js.
// Films that import this path keep working.

export {
  REAL_TEMPLATES,
  DEFAULT_THUMB_BASE,
  templateCardInnerHTML,
  templateCardInnerCSS,
  TEMPLATE_BASE_STYLES,
} from '../../../products/wpforms/film/wpforms-templates.js';
