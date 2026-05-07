# Beat Pacing

The 6-second rule, splitting heuristics, what breaks at 8s, what works at 4s, and how narration length should map to beat duration.

A beat is one entry in a chapter's `default export` array (the per-beat-narration mode default) or one phase of a multi-phase audio-cued effect. Pacing rules apply to either.

## The 6-second rule

**Keep beats near 6 seconds.** That's the practical default for a single narration clip + visual choreography.

Why:
- Below 4s: the visual doesn't have time to land. Viewer barely registers what changed before the next beat.
- 4-8s: the sweet spot. One narration sentence, one visual moment, room for a click + 250ms settle + reaction shot.
- 8-12s: works for postIntro phases or audio-cued beats with multiple internal cues. Risky for normal tutorial beats — viewer attention drops without a new visual cue every ~6s.
- 12s+: split. Period.

The 6-second rule isn't enforced by validators. The user enforces it on visual QC. Beats that consistently feel "long" usually trace back to one narration clip carrying multiple ideas.

## Splitting heuristics

Split a beat when ANY of these are true:

1. **Narration has multiple sentences** that name distinct visual states. One sentence per beat is the default.
2. **Visual choreography has more than one "moment"** — a click + a panel opening + a result is three moments, three beats.
3. **The beat needs `await sleep(>2000)`** between visual events. The sleep means there's no narration coverage; that's a content gap, not a pacing requirement.
4. **The narration mp3 duration is >7s.** TTS at 1.0× will produce ~6s of audio for ~14-16 words; longer than that means the beat is doing too much.

When you split, give each new beat its own `id`, narration clip, and `chapter` group (if appropriate).

## When 4s works

Short beats are valid for:

- **Reactions** — narration says "and there it is" while the visual settles. 3-4s, no internal cues.
- **Confirmations** — visual confirms a previous beat's action. "Saved." → 3-4s.
- **Counter / counter-counter** — "Click X. Notice Y." → two short beats stacked.
- **Mid-postIntro phase changes** — postIntro phases are often 1.5-3s each; the multi-animation rule is what matters, not the per-phase length.

Don't make a 4s beat the default. Use it deliberately for these patterns.

## When 8-12s works

- **Audio-cued chapters** with `waitAt(t)` — one narration clip drives a multi-phase effect. The clip itself can be 10-12s.
- **PostIntro phases** in a per-beat-narration postIntro chapter — sometimes one phase wants more breathing room.
- **`parallel` mode chapters** — the narration runs alongside continuous visual choreography, no per-beat coupling.

## Narration ↔ duration mapping

For per-beat-narration:

- Narration clip duration drives the beat. The runner waits for the audio `ended` event before advancing.
- The `duration` field on the beat is post-narration trailing dwell. Default 0.2s. Use higher (1-2s) when the visual needs time to land before the next beat.

```js
{
  id: 'select-required',
  narration: 'select-required',  // ~5.5s clip
  effect: async ({ ... }) => {
    await highlight(...);
    await cursor.clickOn(...);
    // Effect finishes at ~4s. Narration still has ~1.5s.
    // Runner waits for narration to end. Then `duration` adds dwell.
  },
  duration: 0.5,  // 500ms post-narration settle
}
```

If the effect finishes BEFORE the narration ends, the runner waits for narration. **If the effect runs LONGER than the narration, the narration ends mid-effect and the runner waits for the effect.** Either is OK; just don't be surprised by the timing.

## The validator audio-vs-duration warning

`tools/validate-video.js` includes an audio-vs-duration warning:

- Warns if the narration mp3 duration is more than **1.5×** the beat's `duration` field. (For per-beat-narration, this catches "long narration with no dwell.")
- Warns if `duration` is **<0.6s** for a narration beat. Rushes the audio.

These are warnings, not errors. The user reviews them on smoke output.

## Common mistakes

| Mistake | Fix |
|---|---|
| One beat with 3 sentences of narration | Split into 3 beats, each with its own clip |
| Narration mentions "and now we'll click X" but the cursor click happens 4s later | Tighten the effect or split — visual should match narration claim |
| 12s beat in `per-beat-narration` mode | Switch to `audio-cued` with `waitAt(t)` if the choreography genuinely needs that long, or split |
| `duration: 0.2` after a 6s narration with the visual settling state important | Bump to 1-2s so the viewer can read the result |
| Multiple `await sleep(2000)` calls inside one effect with no visual changes between | Replace with a hold beat or chapter break; sleep without coverage is wasted runtime |
| Postintro phases averaging 1s each | Phases that short don't register; combine or extend |

## Per-mode notes

- **`per-beat-narration`** (default tutorial mode): each beat has its own clip. 4-8s sweet spot. Easiest to split when too long.
- **`parallel`**: one chapter-level narration runs alongside timed beats. Use when narration is loose / abstract / doesn't name specific states.
- **`audio-cued`**: one clip + `waitAt(t)` cues. Use for precise timestamp choreography (typing landing on a sentence, swap landing on a reveal). The narration here can be 10-15s because internal cues drive the visual.

## Postintro pacing (special case)

PostIntros run 8-15s with 5+ phases. That's 1.5-3s per phase on average. The multi-animation rule (see `wpforms-postintro` skill) is what matters; the 6-second rule doesn't apply to postIntro phases internally.

The postIntro AS A WHOLE is one chapter with one narration clip in most cases. Per-phase ≠ per-beat for pacing rules.

## See also

- `wpforms-video` skill — beat-level pacing rule embedded in chapter authoring.
- `wpforms-postintro` skill — postIntro phase pacing rules.
- `docs/examples/legacy-chapter-skeleton.md` — beat shape with narration coupling.
- `docs/examples/legacy-audio-cued-skeleton.md` — `waitAt(t)` for long-cue beats.
- `analysis-quality-and-transitions.md` §1.7 — the REST API video lesson on per-beat-narration vs BGM-only.
