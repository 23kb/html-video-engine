# Narration Writing

Voice, pacing, structure, and what makes a beat feel landed vs rushed.

The narration is the spine of every tutorial video. Bad narration drags good visuals; good narration salvages mediocre ones. This doc captures the patterns from the videos that worked.

## Voice

WPForms tutorial narration sounds like a competent colleague explaining a feature in casual language. Not a corporate spokesperson. Not a YouTube tutorial host. The tone:

- Direct, present-tense.
- Short sentences. One idea per sentence.
- Uses contractions ("you'll" not "you will").
- Names things plainly ("the Notifications panel," "the email field") — no marketing hyperbole.
- Doesn't condescend ("now, friends, we're going to learn..." — no).
- Doesn't hedge ("perhaps you might consider..." — no).
- Doesn't pad ("as you can see..." — also no).

**WRONG (corporate / padded):**
> In this tutorial, we'll be learning how to add a Checkboxes field to your form, which is a powerful feature that allows your users to select multiple options at once.

**RIGHT (direct):**
> Here's how to add a Checkboxes field. Drag it onto the form, edit the choices, and you're done.

## Per-beat narration shape

For per-beat-narration mode (default), each beat carries one narration clip. Aim for:

- **One sentence per beat.** Two short sentences is the cap.
- **6-second target** at 1.0× TTS speed. That's ~14-16 words.
- **Names the visual state** the viewer is about to see. "Click Save" → click happens. Not "let's now save the form" → ambiguous timing.
- **Ends with a noun or short clause.** "...the Notifications panel" beats "...where you can manage your notifications and integrate with your email service."

## Beat coupling — match audio claim to visual

The narration's verb should align with the visual's moment. If the narration says "click X," the click should land while that word is being spoken (or within ±300ms). If the narration says "the form opens," the opening should happen during the verb.

**WRONG — narration claim, then 3s later visual happens:**
```
Narration (5s): "Click Generate Choices to open the AI prompt panel."
Effect:         click() at t=0.5s. Panel mount at t=4s. Sleep at t=5s.
```
Viewer hears "click" → sees click → narration moves to "to open the AI prompt panel" → 3s of nothing → panel mounts. Disconnected.

**RIGHT — visual lands during the verb:**
```
Narration (5s): "Click Generate Choices to open the AI prompt panel."
Effect:         click() at t=0.5s. Panel mount starts at t=2.0s, settles t=2.6s.
                Highlight panel and stay quiet through t=5s tail.
```

Use `audio-cued` mode with `waitAt(t)` cues when this coupling needs to be precise. Use `per-beat-narration` when the narration sentence is short enough that loose alignment works.

## Splitting narration

When a beat does too much:

**Before split:**
> "Click Field Options to open the right panel, then expand Advanced and toggle Multiple Choice." (~8s)

**After split:**
- Beat A (3.5s): "Click Field Options."  → click happens
- Beat B (3.5s): "Expand Advanced."  → expand happens
- Beat C (4s): "Turn on Multiple Choice." → toggle happens

Three short beats land cleanly. One long beat drags.

## PostIntro narration

PostIntros run 8-15s with one narration clip covering the whole postIntro. The narration here is more conceptual:

- States the problem (1 sentence).
- States the solution (1 sentence).
- Optionally hints at the payoff (1 sentence).

```
Checkboxes one-answer-enough postIntro (~14s):
"Sometimes one answer isn't enough. Radio buttons force you to pick just one.
Checkboxes let users choose every answer that fits — so the form captures
the full picture."
```

Match each phase of the visual to one of those sentences. Don't write 5 sentences for 5 phases — the rhythm gets choppy.

## Intro / outro

Intros and outros use `subtitleVariants` (an array of 3 short subtitle lines). The runtime rotates through them. Each line:

- 6-10 words.
- Different angle from the others. The viewer sees one of the three; you don't know which.
- All three convey the video's promise.

```
"Customize the Checkboxes field":
[
  "Let visitors choose more than one answer.",
  "Turn a basic list into a clear visual choice.",
  "Keep longer choice lists easy to scan."
]
```

Outro CTAs are short, action-led: "Build with WPForms," "Try Form Templates," "Create your first form." Not full sentences.

## Common mistakes

| Mistake | Fix |
|---|---|
| Narration says "let's now do X" — passive, padded | Direct verb: "Do X" |
| Multiple sentences crammed into one beat | Split into multiple beats |
| Verb in narration but visual is 2-3s late | Tighten effect or move to `audio-cued` with `waitAt(t)` |
| "As you can see," "obviously," "simply" | Cut these words; they add nothing |
| Sentence ends with a long subordinate clause | Move clause to its own beat or cut |
| Narration repeats a label that's already on screen as a highlight | Cut redundancy; viewer sees the label |
| PostIntro narration describes 5 phases in 5 sentences | Compress to 2-3 sentences; let visuals carry the rest |
| Outro line is 14 words long | Cap at 8-10 words |
| `narrationSpeed: 1.1` to fit narration into a too-short beat | Wrong direction — split or extend the beat instead |

## TTS rendering

`node tts/generate.js --video <slug>` renders narration `.txt` files into `.mp3`s under `videos/<slug>/narration/`.

- Default speed: 1.0×. The current TTS engine sounds natural at 1.0.
- `manifest.narrationSpeed: 1.1` speeds everything up — useful for cinematic-heavy videos where the visual carries weight and slower narration drags. Don't use it to compensate for too-long narration.
- Per-clip overrides aren't currently supported; speed is manifest-level.

## ElevenLabs / higher-quality TTS (future)

Tracked as a future enhancement (REFACTOR-BRIEF.md L6). Current TTS is sufficient for review URLs. Production MP4 renders may use higher-quality voiceover externally.

## See also

- `wpforms-video` skill — beat-level pacing rules + storyboard gate.
- `docs/beat-pacing.md` — the 6-second rule and splitting heuristics.
- `docs/examples/legacy-manifest-skeleton.md` — `subtitleVariants` shape.
- `docs/examples/legacy-chapter-skeleton.md` — `narration:` field on beats.
- `analysis-quality-and-transitions.md` §1.7 — REST API video lesson on per-beat-narration vs BGM-only.
