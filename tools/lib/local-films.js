// Slugs of local-only films that tests and validator allowlists name. Those
// films are not in this repository, so the slugs live in the gitignored
// tools/local-films.local.json. Without that file every list is empty and the
// film-dependent checks skip.
let data = {};
try { data = require('../local-films.local.json'); } catch (_) { /* fresh clone */ }
module.exports = data;
