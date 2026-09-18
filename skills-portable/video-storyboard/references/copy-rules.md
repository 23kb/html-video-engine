# Copy rules — literal copy is a contract

The copy table is the part of the storyboard a human edits most and the build copies verbatim.
It is short, complete and literal.

## Every on-screen line, in one table

One row per line that appears on screen: titles, statements, headings, placeholder text, typed
prompts (the full string, including where the seam cuts it off), button labels, chips, badges,
captions, closing lines, URLs. Real-UI text that the screen already carries (a field label, a
menu item) is copy too when the scene depends on it being readable — the capture must show it,
and the reviewer must be able to veto it.

Each row: `id` (C1, C2, …), `where` (the element, in words), `scene` (the scene ids that show
it), `text` (exact, with punctuation and case). A line that appears in two scenes has one row
and two ids in the scene column; the scene map cites the id.

## Literal means literal

- Write the text as it will render, not a description of it. `Build a conference registration
  form` — not "a prompt asking for a form".
- A typed line that the seam cuts off is written whole, and `our.motion` says where it stops
  ("cut at `registr|`").
- Numbers, dates and names are the ones that will be on screen. Placeholders (`{{date}}`) are an
  open question, not copy.
- Keep the reference's line lengths where the reference's framing depends on them (a two-word
  title at 0.16 of frame height does not become a sentence). If our line must be longer, the
  row is an `override` and says the type size changes.

## The product name is written the way the product writes it

Case, spacing and punctuation follow the product's own style guide or its own UI: `WordPress`,
`GitHub`, `iPhone`, `ChatGPT`. Never re-case a product name to fit a headline. With a product
profile, the profile says how; without one, the product's own site is the source and the
decision goes into `decisions.md`.

## Tone from the reference, words from the topic

The reference gives the shape (a two-word title, a one-line statement, a mid-sentence cut);
the topic gives the words. Do not copy the reference's copy, its taglines or its claims.
Claims about the product are the topic's claims; a claim the topic does not make is an open
question, not copy.

## One text change per payoff

When a payoff changes text (a label gains "(optional)", a badge reads "Paid"), the before and
the after are both in the table, and the row's `motion` says which id lands when.

## Length check

Before rendering: count characters against the reference's `type_roles` (size as a fraction of
frame height) and the framing width. A title that overflows the reference's line width at the
reference's size is a framing change, and framing changes are overrides.
