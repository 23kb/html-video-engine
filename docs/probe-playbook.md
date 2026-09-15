# Probe playbook — pixel truth, console truth

Rules for every Playwright probe/smoke in this repo, each earned by a
measured failure (fix-round C10, 2026-08-17). The reference implementation
for the pixel-truth pattern is `tools/probe-short.js` (luma-range paint
evidence) — cite it, don't duplicate it.

1. **DOM lies about paint.** Any probe asserting a VISUAL claim needs at
   least one pixel-level check — region variance/brightness off a
   screenshot. DOM probes passed on a BLANK screen (ccs 10: every selector
   resolved, every rect was sane, the page painted nothing). DOM state is
   structure; only pixels are paint.

2. **Console filters must test BOTH `msg.text()` AND `msg.location().url`.**
   Failed-resource errors carry the URL on `location()`, not in the text —
   which is why an `__preview-ws` ignore-filter never matched and the gate
   reported PROBE FAIL on every run until everyone stopped reading it
   (ccs 28). A persistently-failing gate is a bug in the gate: fix the
   filter, never normalize the failure.

3. **Measure each side before trusting any A-vs-B diff.** Brightness +
   stddev per side FIRST — a broken reference is half of every comparison.
   The 132/255 "the capture is destroyed" panic that drove a recapture round
   was the reference's own dim overlay (ccs 11). `tools/capture-gates.js`
   prints per-side stats before its paint diff for exactly this reason.

4. **Route-abort `**/__preview-ws` in every probe** —
   `context.route('**/__preview-ws', r => r.abort())` before navigation.
   The preview server's injected live-reload client otherwise reloads the
   page on ANY repo-file edit: a render shipped a film that restarts at ~30s
   (mp B), and probes get their instrumentation silently wiped mid-run
   (as 7). Corollaries:
   - **Never edit repo files while a probe/smoke/render runs** (as 7).
   - **Stale-serve check** (ssn 17): when a fix provably on disk changes
     nothing, `curl <served-url> | grep <fix marker>` BEFORE debugging the
     fix — preview.js's watcher lags rapid successive edits and can serve a
     copy one edit behind. (Also: rtk can garble `curl | grep` output — a
     plain node fetch is the reliable form of this check.)

5. **Long probes run FOREGROUND with explicit timeout.** Playwright probes
   launched as background Bash tasks get killed repeatably (ccs 18 — left
   undiagnosed by the source session; foreground with a timeout works).

6. **Probe contracts declare the thing the beat EXISTS TO SHOW**, sampled
   inside its visibility window (nvc 5): the ephemeral overlay, the taught
   element — not just "page loaded". The opening record declares the
   composed frame's visual anchor; strict taught-element assertions live in
   the beat that teaches the element.

Measurement integrity (from the same round, C8 carries the process side):
ship renders run SOLO — never two renders (or render + probe) concurrently;
dead-time verdicts from a contended render are invalid evidence (bac G:
identical code measured 2.00s vs 3.03s under contention).
