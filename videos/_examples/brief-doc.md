---
slug: confirmations-redirect
mode: doc
feature: "Redirect confirmations"
audience: intermediate
length: standard
depth: walkthrough
bgm: default
status: clarified
---

## Source

_Synthetic doc-style source written for this example. Not copied from
any real WPForms help article — the goal is to show the handoff shape
end-to-end, not mirror live article content._

After someone submits your form you can send them to a thank-you
page instead of showing a confirmation message. Open the form
builder and switch to the Settings tab, then click Confirmations.
Change the Confirmation Type dropdown to "Go to URL (Redirect),"
paste your destination URL into the field that appears, and save
the form. WPForms will route every new submission to that page.

## Notes

- Emphasize the dropdown choice as the key decision moment.

## Clarifications

_Recorded 2026-04-25_

1. Start state — viewer lands on the form builder with the Settings tab already open after the standard intro.
2. Workflow + depth — confirmations flow only: open Settings → Confirmations, switch type to redirect, paste URL, save. Balanced depth (~2 min). Emphasize the redirect dropdown choice.
3. End state — final shot is the saved confirmation with the redirect URL filled. Standard outro included.
4. Animated moment(s) — cursor-guided aha highlight on the Confirmations tab as the post-intro mandatory moment. No additional animated moments requested.
5. Background music — default tutorial BGM.

## Plan

```json
{
  "schemaVersion": 1,
  "animatedMoments": [
    {
      "id": "aha-confirmations",
      "slot": "post-intro",
      "chapter": "open-confirmations",
      "kind": "cursor-aha",
      "targetHint": "Confirmations",
      "label": "Start here"
    }
  ],
  "manifest": {
    "intro": {
      "eyebrow": "WPForms Tutorial",
      "title": "Redirect confirmations",
      "subtitleHTML": "Send people to a thank-you page after they submit.",
      "hold": 3.0
    },
    "outro": {
      "eyebrow": "Thanks for watching",
      "title": "That's redirect confirmations.",
      "subtitleHTML": "Learn more at wpforms.com/docs",
      "hold": 3.0
    }
  },
  "chapters": [
    {
      "id": "open-confirmations",
      "title": "Open the Confirmations tab",
      "stateCue": "form builder confirmations settings panel",
      "beats": [
        {
          "id": "click-confirmations",
          "intent": "Open the Confirmations tab",
          "targetHint": "Confirmations",
          "narration": "Open the Confirmations tab on the left."
        }
      ]
    },
    {
      "id": "pick-redirect",
      "title": "Choose the redirect option",
      "stateCue": "confirmation type dropdown open",
      "beats": [
        {
          "id": "select-redirect",
          "intent": "Pick Go to URL (Redirect) from the dropdown",
          "targetHint": "Confirmation Type",
          "narration": "Pick Go to URL Redirect from the Confirmation Type dropdown."
        }
      ]
    }
  ]
}
```
