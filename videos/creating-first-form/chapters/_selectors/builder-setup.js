// Named selectors for the `builder-setup` snapshot.
// Verified against snapshots/builder-setup/catalog.md (2026-06-10 regen).

export default {
  // Template grid (was `.wpforms-setup-templates`; that wrapper class is no
  // longer catalog-eligible after the 2026-06-10 catalog regen — the inner
  // list ID targets the same visual region and is catalog-anchored).
  templatesGrid: '#wpforms-setup-templates-list',
  // Simple Contact Form card (outer wrapper) + its "Use Template" button.
  simpleContactCard:   '#wpforms-template-simple-contact-form-template',
  simpleContactUseBtn: '#wpforms-template-simple-contact-form-template a.wpforms-template-select',
};
