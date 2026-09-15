# Narration Writing

> **HISTORICAL API NOTE (2026-08-28):** code examples below predate the 2026-08-22 engine retirement. The craft rules stand; the `engine/`/`runtime/`/manifest APIs they mention are gone — implement in single-HTML per CLAUDE.md.
Voice, pacing, structure, and what makes a beat feel landed vs rushed.

The narration is the spine of every tutorial video. Bad narration drags good visuals; good narration salvages mediocre ones. This doc captures the patterns from the videos that worked.

## The measured bar (2026-09-03)

Umair designated 7 reference narrations (44 min of audio); the numbers below are measured from them (`reference/New folder/_extraction/_analysis/analysis-tts-script.md`). Where this section and older guidance below disagree — notably the "short sentences" instinct under Voice — the measured bar wins for narration copy: the bar reads as flowing prose, not choppy fragments.

**The numbers:**

- 172–175 wpm sustained; the voice is never silent >0.91s anywhere in 44 min.
- ~0.6s gaps at sentence boundaries; 0.8–0.9s reserved for section pivots ("Number N…", CTA turns).
- Median delivery chunk: 15 words / 5.0s (validates the 6-second beat as the chunk size).
- Sentences: flowing 15–25 words, ~30% over 25w, zero fragments. Long sentences breathe on commas.
- Imperative-start ≤15% — steps ride the demonstrator voice ("I'm going to…", "you can…"); bare imperatives appear mid-flow at the action moment, not as sentence-openers marching in a row.
- you/your-dense (36–81% of sentences). Questions are hook-position only (plus the standard ad outro) — zero mid-body rhetorical questions.

**The 5 rules:**

1. **Write flowing prose FIRST, then chunk** to ~15w / 5–6s clips — sentences may span beats. Never draft fragment-style clip copy directly.
2. **Demonstrator POV** — "I'm going to… / you can…", not imperative drill.
3. **Pauses are baked via punctuation, never clip gaps** — in-chapter VO gap ≤0.7s, ≤1.0s at chapter seams.
4. **Mechanical signposting** — "Number N on our list is…", connective step openers (Afterwards / Next / Then / Once / From there) roughly every third sentence.
5. **Hooks come from the 4-type taxonomy** — pain/goal question, relatable observation, "Maybe you… Or maybe you…" scenario pair, or (tutorial register) brand-first promise. Sentence 2 empathizes or affirms; ads stay product-free until the ~30–40% pivot.

## Warmth mechanics (the craft layer, 2026-09-03)

Umair's ruling: the MAIN point of the bar is the WRITING — what is spoken, style, arrangement, warmth. The numbers above are the floor; these twelve mechanics, extracted from the 7 reference scripts, are the register itself:

1. **"Probably" empathy** — guess at the viewer's life kindly, without presuming: *"As a busy business owner, you've probably got a lot going on all at once."*
2. **Validation before teaching** — affirm their goal before instructing: *"If so, that's a really good idea for a number of reasons."*
3. **Advice, not commands** — wrap imperatives in counsel: *"you'll want to make sure…"*, "be sure to", "it would be a good idea to", "definitely look into".
4. **Permission + modeled choice** — model a choice, then hand it over: *"In my case, I'm going to…"*, "or whatever you chose to name it", "change it to whatever you like".
5. **ONE homely domestic joke per video, never a tech joke** — the vampire houseguest; a server as *"an old closet or garage"*. One concrete image, then straight back to work.
6. **Plain-talk seasoning, ~1–2 per minute** — *"some folks out there"*, "a world of hurt", "clean house", "big bucks", "crazy simple". Seasoning, never the dish.
7. **People, not a manual** — contractions throughout; a named human presenter in the bookends (*"I'm Daisy with WPForms"*); brand-as-people (*"At WPForms, we believe…"*).
8. **Co-doing on hard parts** — *"So let's write it out together"*, followed by a meaning recap: *"What this formula is saying is…"*
9. **Rhythm punch** — a long flowing sentence, then a short one: *"…incredibly useful. It can also be incredibly risky."*
10. **Show BOTH branches at the payoff** — *"the field will appear. But if you don't pick the right date, it won't appear at all."*
11. **Concrete specifics carry authority** — real numbers, five NAMED apps "and more", real example values; never vague plurals.
12. **Situation-first ordering** — the viewer's world opens the script; the product enters only at the pivot.

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
- `docs/examples/single-html-tutorial-skeleton.html` — one narration `.txt` per `beat()` key; DUR pasted from `tools/measure-narration.js` (the legacy manifest / chapter skeletons retired 2026-08-22).
- `analysis-quality-and-transitions.md` §1.7 — REST API video lesson on per-beat-narration vs BGM-only.
