# Selector Hygiene

How to keep selectors stable, when they break, and the `_selectors.js` pattern that scales.

Selectors are the most fragile part of any tutorial video — when WPForms ships a UI change, every selector that pointed at the old shape silently breaks. This doc captures the patterns that minimize breakage and the tools that catch it early.

## The `_selectors.js` pattern

Every chapter imports its selectors from a local `_selectors.js` file (or `_selectors/<name>.js` for multi-file packages). Selectors are NOT inlined into chapter beat objects.

```js
// videos/<slug>/chapters/_selectors.js
export default {
  // Sidebar
  sidebarWPForms: 'a[href="admin.php?page=wpforms-overview"]',
  sidebarEntriesLink: 'a[href="admin.php?page=wpforms-entries"]',

  // Forms list
  formsTable: '#wpforms-list',
  formsEntriesColumn: 'th.column-entries',

  // Specific form row
  contactUsForm: 'tr#post-55',
};
```

```js
// videos/<slug>/chapters/where-entries-live.js
import sel from './_selectors.js';

export default [{
  id: 'highlight-entries-column',
  effect: async ({ highlight }) => {
    await highlight([sel.formsEntriesColumn], { label: '...' });
  },
}];
```

**Why this matters:** when the WPForms admin ships a UI change that breaks `formsEntriesColumn`, you fix it once in `_selectors.js`. If selectors were inlined per beat, you'd be hunting through 6 chapter files.

## Selector source hierarchy

Use selectors in this priority order:

1. **`tools/inspect-snapshot.js <snapshot> --emit-selectors`** — auto-emitted from the snapshot's catalog. Always start here.
2. **`tools/verify-selectors.js <snapshot> <selector...>`** — confirm the selector exists in the snapshot before using it.
3. **`snapshots/<name>/catalog.md`** — human-readable inventory of known-good selectors per snapshot.
4. **Inspect the snapshot HTML directly** — last resort. If you find a selector that's not in the catalog, add it (or auto-regenerate the catalog).

**Don't:**
- Eyeball selectors from the running WPForms admin and paste into chapters. The snapshot DOM may differ.
- Use class selectors that look like Tailwind utilities (`.text-sm`, `.flex`) — those are likely auto-generated and unstable across versions.
- Use deeply-nested descendant selectors (`div > div > div > span`) — fragile to any layout change.

**Do:**
- Use ID selectors (`#wpforms-field-7`) when stable IDs exist.
- Use semantic data attributes (`[data-field-id="7"]`).
- Use ARIA roles when meaningful (`[role="button"][aria-label="Save"]`).
- Use single class selectors that name a stable component (`.wpforms-toolbar-btn-save`).

## Validator coverage

`node tools/validate-video.js <slug>` runs selector provenance checks:

- Every selector in chapter beats / descriptor steps must resolve in the chapter's `snapshot:`.
- Every selector should have provenance — either an inline `// src: snapshot/catalog/path` comment or live in `_selectors.js`.
- Drift detection: if the catalog anchor for a selector is no longer in the snapshot, the validator flags it.
- Touched-vs-untouched classification via hash baseline.

Errors block. Warnings surface. Run before every commit.

## When selectors break

Common breakage patterns:

| Cause | Symptom | Detection |
|---|---|---|
| WPForms version bump changed a class name | Validator: "selector not found in snapshot" | Run validator after pulling |
| Snapshot was recaptured from a different WPForms version | Same as above | Re-emit selectors via `inspect-snapshot.js`; update `_selectors.js` |
| Snapshot DOM has multiple matches for a selector that should be unique | Smoke: console warn "multiple matches for X" | Tighten the selector |
| Selector targets a state that requires DOM puppetry to reach | Smoke: silent fail (highlight on element with display:none) | Use `selectDropdown`/`revealSection`/etc. to make the state visible first |
| Inline selector in beat body, not in `_selectors.js` | Validator: "selector lacks provenance" | Move to `_selectors.js` |

## DOM-puppetry-required selectors

Some selectors target elements that exist in the DOM but aren't visible / interactive without first running puppetry helpers:

```js
// _selectors.js — selector exists, but the element is in a collapsed section
toggleConditionalLogic: '.wpforms-conditional-logic-toggle',
conditionalLogicRule: '.wpforms-conditional-rule:first-child',  // doesn't exist until toggle is on
```

Pattern: in chapter `setup({ doc })`, run the puppetry helper that creates the dependent state, THEN use the dependent selector:

```js
async setup({ doc }) {
  // Reveal the section so its children become real DOM
  await revealSection('.wpforms-conditional-logic-section');
  // Now sel.conditionalLogicRule resolves
}
```

Document the dependency in `_selectors.js` with a comment:

```js
// Requires .wpforms-conditional-logic-section revealed first via revealSection()
conditionalLogicRule: '.wpforms-conditional-rule:first-child',
```

## Multi-snapshot selectors

When a chapter swaps snapshots mid-effect (`swapToSnapshot`), the same selector key may need different values per snapshot:

```js
// Bad: one selector that works in snapshot A but not snapshot B
fieldOptions: '.wpforms-field-option',

// Better: namespace by snapshot
export default {
  builderFields: {
    fieldOptions: '.wpforms-field-option',
  },
  builderFieldOptionsCheckbox: {
    fieldOptions: '.wpforms-field-option-row',
  },
};
```

Or split into multiple selector files:
- `_selectors/builder-fields.js`
- `_selectors/builder-field-options-checkbox.js`

The chapter imports the right one per its `snapshot:`.

## When to refactor selectors

Refactor `_selectors.js` when:

1. **Same selector key appears in 2+ chapters with the same value.** Promote to a shared `_selectors/_shared.js` file imported by both.
2. **A snapshot recapture broke 5+ selectors.** Re-emit the whole file via `inspect-snapshot.js --emit-selectors` rather than patch one-by-one.
3. **A new puppetry helper makes a selector obsolete.** Remove the dependent-state selector if the puppetry helper is now the canonical way to reach that state.
4. **The validator flags drift.** Update the catalog anchor or the selector.

Don't refactor mid-storyboard. The locked-shape skeleton has `import sel from './_selectors.js'` for a reason.

## Common mistakes

| Mistake | Fix |
|---|---|
| Inlined selector in a beat: `await highlight(['#some-thing'])` | Move to `_selectors.js`, use `sel.someThing` |
| Tailwind-style class chain: `.bg-white.text-sm.p-4.rounded` | Use a stable component class or data attribute |
| Selector copy-pasted from devtools without verifying in snapshot | Run `verify-selectors.js <snapshot> <selector>` first |
| Selector targets a hidden element directly | Use puppetry helper to reveal first, then target |
| Multiple selectors with similar names (`.btn`, `.button`, `.btn-primary`) | Pick one; document why |
| `_selectors.js` is 200+ lines for one chapter | Split into `_selectors/<chapter>.js` per chapter |

## Tools

- `node tools/inspect-snapshot.js <snapshot> --emit-selectors [--filter <text>]` — emit catalog-grounded selectors.
- `node tools/verify-selectors.js <snapshot> <selector...>` — check existence in snapshot DOM.
- `node tools/validate-video.js <slug>` — validates every selector in the chapters resolves in the right snapshot.
- `node tools/field-state.js --field <name>` — query field-state inventory for selector hints.

## See also

- `wpforms-video` skill — chapter authoring rules; uses `_selectors.js` import.
- `docs/chapter-module-contract.md` — locked interface spec for chapter modules.
- `docs/wpforms-field-state-inventory.md` — canonical product-truth selector reference (query via field-state.js).
