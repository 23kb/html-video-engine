# Keep SFX placements and imported audio (VO/music/ambience) as distinct clip types

Status: accepted

As soundlab grows into a full multitrack timeline (VO, music, SFX, ambience),
we decided **not** to unify all timeline content under one "clip references a
source" model. SFX are a reusable, AI-generated source library — one Sound
("click") is generated once and placed many times — whereas voiceover, music,
and ambience are unique imported files placed (usually) once, each with their
own fades. We keep two structurally distinct **Clip** types: a **Sound clip**
(`type:"sound"`, references `plan.sounds` by name, gets the generate / trim /
auto-tail treatment) and a **Media clip** (`type:"media"`, references an
imported file, carries explicit fade-in/out). Tracks are typed lanes holding
one kind or the other.

## Considered Options

- **Unify** every clip as a placement of a generic `source` (a source being
  either a generated Sound or an imported file). Rejected: the SFX
  "one source, many placements" + prompt/generate lifecycle does not fit
  imported files, and forcing both into one shape muddied each.
- **Keep distinct** (chosen).

## Consequences

- `plan.sounds` stays top-level, so `generate.mjs` needs zero changes.
- `mux.mjs` and the editor must branch on clip `type` rather than treating all
  audio uniformly.
- `rebase-plan.mjs` re-times only Sound clips; Media clips are not
  scene-anchored and stay put.
