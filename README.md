# ink-render
Parallel frame renderer on GitHub Actions. One workflow (`render`), run by hand: it splits a 60 fps render into N parallel jobs (default 20), each job renders its frame range with headless Chrome and encodes a near-lossless segment, and the last job joins the segments, adds `episode/audio.wav` and the watermark and produces `out.mp4` (artifact `video`).
- `episode/` = the episode to render (`studio.html` exposing `window.READY` and `window.grabPNG(t)`, plus `src/`). Replace it with another episode to render that one.
- Run: Actions tab -> render -> Run workflow (seconds, parts, watermark position).
- Public repo: everything here is public, keep only what you are happy to publish.
