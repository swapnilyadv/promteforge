# Launch video

A 30-second vertical launch video, built as an animated page and rendered frame by frame.

```bash
cd launch-video
npm install
python3 audio/make_music.py      # original soundtrack -> out/music.wav
node render.mjs                  # -> out/promptforge-launch-9x16.mp4 (about 100 s)
node render.mjs --stills 3,9,28  # single frames to look at -> out/still-*.png
python3 -m http.server 8800      # live preview: open http://localhost:8800/index.html
```

- `index.html`: every scene, drawn from a time `t` (so each frame is exact).
- `timeline.js`: the cut times, shared by the picture and the sound.
- `audio/make_music.py`: synthesises the soundtrack from scratch (no samples, no licensing), locked to the timeline.
- `render.mjs`: Brave (puppeteer-core) takes one screenshot per frame and pipes it to ffmpeg.

Needs Brave or Chrome (edit `BRAVE` in `render.mjs`), ffmpeg and Node 20+.
