# flat-toon kit

Wordless comedy shorts: **flat 2D characters drawn every frame onto camera-facing planes, living in a bright 3D toon set**, with continuous camera moves, slow motion and synthesised foley + score. 1080×1920, 24 fps, 30–60 s. First film made with it: *Butter Side Down* (`template/`).

## Rules (owner)
- No narration, no subtitles, no text on screen, no end credits, no watermark (`wx=none`).
- Clean and sharp: no film grain, gate weave, fog/haze, mottled particles or depth-of-field blur.
- New setting and new gag every film; original characters (never copy another channel's characters or branding).
- Story shape: hook → setback/escalation (rule of three) → clue (slow motion / ghost trail) → idea → twist payoff.
- Camera moves continuously (push in, orbit, crane, track); at most one or two hard cuts.

## Files (template/)
| file | what |
|---|---|
| `src/three.module.js` | not copied here (1.2 MB): take three.js r170 from `episode/src/` |
| `studio.html` | page contract: loads `src/film.js`; exposes `DUR`, `render(t)`, `grab(t)`, `grabPNG(t)`, `READY` |
| `src/timeline.js` | single source of truth for times (picture AND sound). World time `tau(t)` from a piecewise `rate(t)` gives slow motion; physics runs on world time |
| `src/toon.js` | `toon()` 4-step MeshToonMaterial, `outlined()` inverted-hull ink lines, `sphere/capsule/bone`, `mulberry` seeded RNG |
| `src/flat.js` | `makeFlat(sizeM, px, draw)` billboard + blob shadow; `drawMan`/`drawManArms` (front-view man, IK arms), `drawDog`, `drawCat`, `drawBulb`. Canvas units: 1024 across the plane, origin centre, y down |
| `src/set.js` | 3D toon set built from boxes/cylinders + canvas textures; `makeToast()` prop example |
| `src/film.js` | choreography (`toastAt`, `manAt`, `dogAt`), camera keyframes + dynamic orbit/track, `toCanvas()` (world point → flat canvas units, so 2D hands land on 3D props), clean post (MSAA, mild halation, filmic curve, soft vignette) |
| `mix.py` | numpy/scipy foley + score keyed to `events.json` (export it from timeline.js with node) |
| `../master.sh` | mastering to FLAC (-14 LUFS, true peak < -1 dBFS) |

## Tricks worth keeping
- Hands that touch 3D props: draw arms on a second flat layer at the same plane; set its `depthTest=false` only while the hands rest on the table, otherwise the table top hides them.
- Front-facing characters: pass camera-right as `worldDir` so the drawing never mirrors. Side-view animals: pass their walking direction.
- Animals eating off the floor: `pitch` (whole-body bow about the hind feet) + `headTilt`.
- Shadows: `bias -0.0006`, `normalBias 0.02` (no acne stripes on toon shading). Follow the camera target with the sun and widen the shadow box for wide shots.
- Slow motion: the clock, ambience and idle cycles (tail wag, walk) all run on `tau(t)`, so they slow too; room tone ducks and muffles.
- Ghost trail + dotted arc (transparent clones at past world times) make the physics readable.
- Subframe motion blur (`subframes(t)` returns 3) only around fast impacts; 1 elsewhere keeps the render cheap.

## Workflow
1. Pitch 3 stories (check none repeat an earlier setting/gag) → owner picks.
2. Copy `template/` to a new folder; rewrite timeline, set, characters, choreography, camera. Keep the toolkit files.
3. Stills: `node core/render/still.mjs <dir> t1 t2 ... --size 540x960 --q 'sub=1'` (lemo-opuscar) or any headless page; contact sheet; send the owner a model still first.
4. Sound: `node -e` export events.json → `python mix.py` → `../master.sh out/mix.wav out/audio.flac <DUR>`.
5. Render on this repo: replace `episode/` (studio.html, src/*.js, audio.flac), commit, push, dispatch `render.yml` with `parts=min(20, ceil(frames/48))`, `wx=none`, `fmt=jpg`.
6. Fetch: dispatch `video-to-branch.yml` with the run id, `git fetch --depth 1 origin render-out`, check the commit says `video from run <ID>`, `git show FETCH_HEAD:out.mp4 > film.mp4`. Artifacts download directly is blocked (403).
