# Animation3D · 三维动画 — Style Prompt

Made from a blank page; techniques from HD-2D (hd-2d) in Lemo-Opuscar.
Default size: 1080×1920.

> Flat, hand-drawn round-head characters with a dark marker outline, standing in rich, warmly lit, fully 3D story sets: a cinematic toy world where every place feels real and every person is a doodle.
> References (grammar only): the vertical explainer-short genre of 2D "bean" characters composited into detailed 3D environments. Take the grammar: billboard characters in lit 3D sets, cut every 2–4 s, warm cinematic light, shallow focus on close-ups, bold word-by-word captions when narrated. Never copy any channel's characters, names, logos, title cards or music.

## 1. Essence, and what it is not

- **Two worlds in one frame**: characters are flat 2D drawings (flat fills, marker outline, minimal faces) while everything around them is a solid, lit, shadowed 3D set with depth.
- **The round-head figure**: a big off-white egg head (no neck) on a tall bean body in one clothes colour, arms and legs as single thick dark strokes ending in small round dots. Faces are a few marks: dot or half-lidded eyes, thick short brows, a tiny mouth.
- **Cinematic sets**: real-scale architecture, ships, rooms, props in quantity; warm key light, soft shadows, bloom on bright sources, depth of field in close shots, fog for distance.
- **Story-first shots**: a new shot every 2–4 s, each one a single readable idea (who, where, what changed).

Not HD-2D (no pixel sprites, no tilt-shift toy band, no RPG UI), not a 3D animated film (characters are never modelled in 3D), not a flat 2D cartoon (the sets are real 3D with real light), not a whiteboard explainer.

## 2. Materials & rendering

- **Characters**: drawn every frame with Canvas2D on camera-facing, upright planes (yaw toward the camera, never pitched), 384–1024 px canvases in a 1024-unit space, feet at a fixed canvas point so they stand on the set. A soft blob shadow on the ground under each one. Characters take the scene's light as a tint (cooler at night, warmer by fire), never 3D shading.
- **Angles are drawings, not rotations**: every character has front, three-quarter (left/right), profile (left/right) and back drawings, plus sitting, lying (seen from above) and carrying poses as a film needs. A character walking across the frame is drawn in profile or three-quarter facing its direction of travel.
- **Turning**: a turn is a snap through those drawings (back → three-quarter → profile → … → front), each held at least 2 frames at 30 fps. The card itself always faces the camera squarely; it is never rotated, scaled thin or seen edge-on (the frame checker flags any card more than ~14° off the camera).
- Animals and creatures are drawn in the same 2D style (same ink, flat fills, minimal faces).
- **Outline**: one ink colour, a warm near-black brown (e.g. `#2a1d1d`), ~3% of head width; limbs are the same ink at about the outline width; round caps and joins.
- **Fills**: flat, with one soft inner gradient (lighter upper-left, darker lower-right) on head and body; the head is off-white, never pure white.
- **Sets** range from painterly lit 3D to ink-outlined toon sets (flat bright colours with dark contour lines, as in the references' interiors); pick one per film and keep it.
- **Sets**: three.js `MeshStandardMaterial` (roughness/metal), canvas-painted textures for planks, stone, plaster, carvings; procedural geometry at real scale (metres). An environment map from the sky for reflections; one shadow-casting key, a hemisphere fill, practical point lights where the story has lamps.
- **Post chain**: MSAA scene → depth-of-field from a depth pass (two blur levels mixed by circle of confusion) → bloom from bright areas → filmic tone map → grade (exposure, tint, saturation per shot) → vignette. No film grain, no chromatic aberration.

## 3. Colour logic

- Sets carry the colour mood: one key temperature per place (golden afternoon, cool underwater teal, dark museum with warm spots). A cut to a new place changes the whole key.
- Characters' clothes are mid-saturated solid colours that differ from the set behind them, so a small figure is always findable; the hero's colour stays fixed for the whole film.
- Ink is never pure black; highlights are the light sources themselves, bloomed.
- Example only: harbour = ochre and terracotta houses, blue water, gold carvings; characters in navy, striped white, burgundy.

## 4. Type & subtitles

- **Default: no on-screen text.** Story is told by picture and sound.
- **When narrated**: word-by-word captions, 1–2 words at a time, bold geometric sans (e.g. Montserrat ExtraBold or Poppins Bold, OFL), white with a 6–8 px dark outline and soft shadow, centred about 55–60% down the frame, 64–80 px at 1080 wide; each word appears on its spoken onset (from the voice's word timings) and holds until the next.
- In-world text (signs, labels, a date painted on a wall) is allowed and drawn as part of the set.

## 5. Motion quality

- 30 fps. Characters move on ones: walk and run cycles drawn per frame (legs swing, small bob), arms re-posed by targets, faces switch expression on the beat (snap, not morph).
- Sets and cameras move smoothly (eased keyframes, monotone curves); heavy things (ships, crates) move with weight and settle.
- Water, flags, sails, foliage, particles always have a little life, even in a held shot.
- Subframe motion blur only for genuinely fast objects; otherwise crisp.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| crane/descend into a place | scale, establishing a world | a city, a harbour, a building's arrival |
| slow push-in on a face | realisation, emotion | a decision; a worry; a smirk |
| dolly along a row | quantity, order | rows of machines, cannons, people, shelves |
| low angle up at a big object | awe, power | a ship, a statue, a monument |
| tracking a moving object | journey, momentum | departure, a chase, a fall |
| handheld-free roll (camera rolls with the floor) | instability | a tilting deck, an earthquake, dizziness |
| reverse shot onto faces | reaction | shock, laughter, a crowd's verdict |

**Framing rules** (measured by `demo/tools/framecheck.mjs`, from the page's `window.SUBJECTS(t)`):
- **One world → screen function** (`toScreen`) drives every framing check, focus pull and caption position, so they track the subject while the camera moves.
- Every shot names its **hero** (the first character placed, or a named object). Outside wide establishing shots the hero reaches **≥ 1/3 of the frame height** at its key moment; it is ≥ 85% inside the frame and its centre stays in the **middle 70% of the width**.
- No face cut by the frame edge; no two faces overlapping more than ~35% (stagger depth or spread them).
- Heads sit at or above the upper third line in close and medium shots; when narrated, captions live in the band 55–65% down and never cover a face.
- **Focus follows the hero every frame** (distance from the camera to the hero), unless a shot deliberately racks to something else.
- Camera paths are a few keys on a monotone curve (no overshoot). At least four different camera moves per film and one signature shot.
- Pace varies: fast cuts against at least one held breath (a 3–5 s take); a gag or failure stays on screen long enough to read.
- Hard cuts between shots are the default grammar; a dip to black only at the very start and end.

**Benchmark = the reference videos, never our own earlier films.** Compare every film with `demo/tools/refcompare.py ours.mp4 <reference videos>` (the references stay on the user's machine; never commit them) and match these measured targets (from the four references: The Ancient Jar, The Window, The Town Built Around a Button, The Burglar Who Only Moved Furniture):

| Measure | Target |
|---|---|
| a new shot or framing every | 2.2–4.5 s |
| hard cuts | 11–20 per minute |
| in-camera transitions (push-in into a detail then cut on the motion, an object sweeping across the lens, a pull-back revealing a new framing) | 3–11 per minute; never zero |
| motion (mean frame difference at 90×160) | 10.8–16.7: the camera is almost never still |
| average luma | 86–140 / 255 |
| average saturation | 22–30 %: rich colour, warm vs cool practicals, purple-blue nights |
| hero head width in medium shots | 30–45 % of frame width; characters stand beside the props they use, at the same scale |
| set density | every frame has foreground, midground and background props; no empty floors or blank sky above a character |

## 7. Sound palette

- Location ambience per set (wind and water, room tone, underwater rumble, hall hush) under everything.
- Foley for each visible action: footsteps, wood creaks, cloth, water, mechanical clunks, crowd beds (cheer, murmur, gasp).
- Score: light orchestral and plucked colours (pizzicato, harpsichord or marimba, strings pad, brass stings, music box), cut dead for shock moments; silence is allowed for one beat after a disaster.
- Comic stings for character reactions (a gulp, a slide whistle, a "dun-dun").
- Mix at −14 LUFS, true peak < −1 dBFS; music ducks under narration when there is a voice.

## 8. Native moves

- **The deadpan reaction cut.** Big event → hard cut to a front-on close-up of one face holding a blank expression for a beat. *Fits content like:* a failed product launch; a rocket that tips over; a cake that collapses.
- **Doodle in a real place.** A flat character standing in a richly lit, real-scale 3D set, the contrast itself is the joke and the charm. *Fits content like:* a medieval castle; a modern trading floor; a deep-sea lab.
- **Everyone points at everyone.** A row of flat characters swaps blame with arm-pose snaps on the beat. *Fits content like:* an inquiry; a broken vase; a missed deadline.
- **The crowd from behind.** A wall of round heads (hair or hats only) in the foreground watching something big. *Fits content like:* a launch; a parade; a fire.
- **Light shafts and dust.** A beam through a window, porthole or water surface with drifting particles. *Fits content like:* a vault opening; an archive; a shipwreck.

## 9. Pitfalls of the medium

- A billboard character seen from behind still shows its face: use the back-view pose (hair/hat only) whenever the camera is behind people.
- The vertical frame is narrow: two characters 3 m apart don't fit a close two-shot; stage them close and check.
- Cameras inside geometry (masts, walls, hulls) at real scale; check every shot's first and last frame.
- Additive light shafts stack into solid slabs: fade them at the edges and keep opacity tiny.
- Fog and DOF together can erase the subject: check the hero reads in a 270 px wide thumbnail.
- Characters must not take 3D shading; tint only, or they stop reading as drawings.
- Statues and ornaments repeated identically read as toy soldiers: vary size, pose and spacing.
- Poses switched inside an `if` pop; blend every pose with keyframes and easing (a deliberate one-frame comic pop is the only exception). Held props sit between the palms; a hand-over interpolates from one palm to the other.
- An upright card standing next to a mast, wall or rack gets sliced by it (a head or hat pokes through the set): give the whole card ONE depth, its body centre nudged ~0.35 m toward the camera (`makeBoard` does this in the vertex shader), so a character is entirely in front of or behind a set piece.
- A board placed (or an arm solved) before the shot's camera is set faces the previous shot's camera and turns edge-on: stage each frame in two passes (camera first, then cast).
- Billboards are lit from the front only: keep a front fill on heroes in dark sets, and lift mid-tones in dark scenes except the one beat that must go dark.
- Review before delivery: contact sheets every 1–2 s, 0.2 s strips of every key action, `framecheck.mjs` with 0 problems or each one justified, `blackdetect` and −14 LUFS on the final file.

## 10. Engine

The demo's own code: `demo/src/stick.js` draws the characters (`drawPerson`, faces, hair, hats, props, `makeBoard`), `demo/src/post.js` is the post chain, `demo/src/world.js` and `demo/src/sets.js` build sets, `demo/src/film.js` stages shots. Technique base: `$LIB/styles/hd-2d/STYLE.md` (billboards in a lit 3D diorama, DOF, bloom).

## 11. Variation space

Free in every film: story, era, places, cast, costumes, number of shots, pacing, whether there is narration (and in which language), the music's instruments within §7, the camera route, the ending.
