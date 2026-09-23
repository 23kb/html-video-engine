// videos/_shared/builder-frontend-split.js — compatibility shim.
//
// BuilderFrontendSplit is WPForms-specific (it bridges the WPForms snapshot
// runtime's wpf:* messages), so since 2026-09-23 (rename Phase 3) it lives in
// the WPForms pack: products/wpforms/film/builder-frontend-split.js. Films that
// import this path keep working.

export { BuilderFrontendSplit } from '../../products/wpforms/film/builder-frontend-split.js';
