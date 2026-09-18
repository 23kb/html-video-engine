# Installing

One folder, one skill. Copy `video-pipeline/` whole into your skills directory and keep its name;
the three workers live inside it and find each other as siblings:

```
# project-local
cp -r video-pipeline  <your-project>/.claude/skills/
# or user-wide
cp -r video-pipeline  ~/.claude/skills/
cd <skills>/video-pipeline/html-snapshot && npm install     # Playwright, for html-snapshot only
```

Requirements: Node 18+; `ffmpeg` / `ffprobe` on PATH for the reference read; Playwright
(installed by the `npm install` above) for snapshots. Nothing else. Nothing leaves the machine.

Never split the folder: `video-storyboard` borrows `reference-motion-spec`'s brief renderer from
the folder beside it, and the driver's handoff reads `references/tool-notes.md` beside its own
script. To use one worker alone, open its `SKILL.md` and run its scripts by path; it needs no
driver.

Where the set is published: <link>
