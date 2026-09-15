# Product truth — targeting WPForms elements with custom CSS

Source: https://wpforms.com/docs/how-to-style-wpforms-with-custom-css-beginners-guide/ (fetched live 2026-08-07, doc updated May 21 2024, author Umair Majeed, reviewed by David Ozokoye).
Site evidence: `sullies-bakery` LocalWP, WPForms **2.0.0.3**, license **elite** (via `tools/preflight-site.js`, 2026-08-07).
Capture evidence: `snapshots/frontend-contact-clean/` (published form **406**), plus the three captures listed under "Capture plan" below.

## The three targeting levels (doc-grounded)

The doc names two of these explicitly and implies the third. The video teaches all three as a ladder, narrowest last.

| Level | Selector shape | Doc source |
|---|---|---|
| **All forms on the site** | `.wpforms-form .wpforms-title` | "Reading CSS" — the doc's own first example |
| **One specific form** | `#wpforms-4 .wpforms-form` (4 = form ID) | "Styling an Individual Form" — verbatim doc example |
| **One specific field, by a name you assign** | `.your-class` | Implied. The doc's "Choosing a CSS Selector" offers only (1) copy from the selector-reference list or (2) browser dev tools. The builder's per-field **Advanced → CSS Classes** input is the WPForms-native third way. |

## Verified facts

- **Form ID 406 = "Sullie's Bakery Contact Form"** (`tools/site-eval.js` over `get_posts(post_type=wpforms)`, 2026-08-07). This is the same form rendered in `snapshots/frontend-contact-clean/`, whose wrapper is `#wpforms-406` and whose fields are `#wpforms-406-field_1` (Name), `_2` (Email), `_3` (Comment or Message, a `textarea`), `_4` (Phone). Verified against that snapshot's `outline.md`.
- **The form ID is discoverable from the Shortcode column** on WPForms → All Forms. The doc says: "go to WPForms » All Forms and look in the Shortcode column." Column header IDs `#shortcode` / `#shortcode-foot` are present in `snapshots/admin-forms-overview/catalog.md`, confirming the column exists in this WPForms version.
- **The per-field CSS Classes input is real and lives in the field's Advanced tab.** Confirmed in `snapshots/builder-field-options-email/catalog.md`: `#wpforms-field-option-advanced-2` (the Advanced section) and `#wpforms-field-option-2-css` (the CSS Classes input). The `-2-` segment is the field ID, so the pattern is `#wpforms-field-option-{fieldId}-css` — per **INV-6**, field IDs vary per capture, so the video resolves this selector from its own capture, never hard-codes `-2-`.
- **`!important` is doc-sanctioned, not a hack.** The doc: "it might be necessary to include !important before the semicolon to ensure your custom styles are applied successfully."

## Doc divergence / gap found while building

**The doc outsources its own last step.** "Styling an Individual Form" ends with: "the next step is to add it to your site. You can learn how to do this by following WPBeginner's guide to adding custom CSS to WordPress." The doc never shows *where* the CSS goes — it hands the reader to a third-party site at the moment of payoff.

The video closes that gap by showing **Appearance → Customize → Additional CSS** directly. Worth folding back into the doc as a short section — flagged for Umair (he owns the doc; he is also its author).

Secondary: the doc's title says "Beginner's Guide" while the backlog classifies the topic **Tier A / Developer**. The video resolves this by taking the *reliability* angle (scope + assign, don't guess) rather than the doc's "what is CSS" opening, which is the read that makes it dev-lane.

## Capture plan (this video)

| Snapshot | State | Status |
|---|---|---|
| `admin-forms-overview-shortcode` | WPForms → All Forms, form 406 row visible with its `[wpforms id="406"]` shortcode | NEEDS CAPTURE — new slug, existing `admin-forms-overview` does not contain 406 and is load-bearing for other videos (do not recapture in place) |
| `builder-406-field-advanced-css` | Builder for form 406, "Comment or Message" field selected, Field Options → **Advanced** expanded, CSS Classes input visible and empty | NEEDS CAPTURE |
| `admin-customizer-additional-css` | Appearance → Customize → **Additional CSS** panel open, editor empty | NEEDS CAPTURE |
| `frontend-contact-clean` | Published form 406, unstyled | EXISTS |

**The styled "after" state is NOT captured.** It is produced by injecting the real CSS rule into the real `frontend-contact-clean` DOM at runtime — real markup + real CSS = the real rendered result, which is exactly what a browser does. This is DOM-derived under the production-truth rule, not a redrawn mock. It is also what the WordPress Customizer genuinely does (live preview), so the beat is accurate to the product.

## CSS used on camera

```css
#wpforms-406 .bakery-note textarea {
  border: 2px solid #E27730 !important;
  border-radius: 8px !important;
}
```

`#wpforms-406` scopes to the one form · `.bakery-note` is the class assigned in the builder's Advanced tab · `!important` per the doc's own note. Accent is the real brand orange `#E27730` from the canonical brand tokens (never the AI purple — this is not an AI feature).
