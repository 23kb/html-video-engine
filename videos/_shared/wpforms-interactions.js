// videos/_shared/wpforms-interactions.js — compatibility shim.
//
// Since 2026-09-23 (product-neutral rename, Phase 1) the code lives in:
//   videos/_shared/iframe-manager.js               IframeManager (generic)
//   videos/_shared/ui-interactions.js              UIInteractions (generic base)
//   products/wpforms/film/wpforms-interactions.js  WPFormsInteractions extends UIInteractions
//
// Local films import this path, so it keeps the same four exports. A new film
// imports IframeManager from iframe-manager.js and Cursor from
// motion-primitives.js; only a film that drives WPForms UI needs
// WPFormsInteractions.

export { Cursor, clickRipple } from './motion-primitives.js';
export { IframeManager } from './iframe-manager.js';
export { WPFormsInteractions } from '../../products/wpforms/film/wpforms-interactions.js';
