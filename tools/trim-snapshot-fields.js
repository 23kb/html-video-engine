#!/usr/bin/env node
// tools/trim-snapshot-fields.js — compatibility shim.
//
// This WPForms-only snapshot tool lives in the WPForms pack since 2026-09-23
// (rename Phase 3): products/wpforms/tools/trim-snapshot-fields.js. The script runs on load
// and reads process.argv, so requiring it keeps `node tools/trim-snapshot-fields.js …`
// (post-capture.js, tests, snapshot meta.json provenance) working unchanged.
require('../products/wpforms/tools/trim-snapshot-fields.js');
