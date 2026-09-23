#!/usr/bin/env node
// tools/clean-builder-snapshot-canvas.js — compatibility shim.
//
// This WPForms-only snapshot tool lives in the WPForms pack since 2026-09-23
// (rename Phase 3): products/wpforms/tools/clean-builder-snapshot-canvas.js. The script runs on load
// and reads process.argv, so requiring it keeps `node tools/clean-builder-snapshot-canvas.js …`
// (post-capture.js, tests, snapshot meta.json provenance) working unchanged.
require('../products/wpforms/tools/clean-builder-snapshot-canvas.js');
