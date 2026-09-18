# Installing the set

Four folders, each a skill. Copy the ones you need into your skills directory and keep the
folder names:

```
# project-local
cp -r video-pipeline reference-motion-spec video-storyboard html-snapshot  <your-project>/.claude/skills/
# or user-wide
cp -r video-pipeline reference-motion-spec video-storyboard html-snapshot  ~/.claude/skills/
cd <skills>/html-snapshot && npm install          # Playwright, for html-snapshot only
```

Requirements: Node 18+; `ffmpeg` / `ffprobe` on PATH for reference-motion-spec; Playwright
(installed by the `npm install` above) for html-snapshot. Nothing else. Nothing leaves the machine.

Dependencies between them:

- `video-storyboard` needs `reference-motion-spec` beside it (it borrows the brief renderer;
  without it the storyboard writes but the brief does not).
- `video-pipeline` needs all three to run a whole pass; with fewer it runs the steps it can and
  says which one is missing.
- `html-snapshot` needs nothing else.

Download: `<link to the shared package — fill in when published>`
