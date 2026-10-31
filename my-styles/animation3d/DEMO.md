# Animation3D demo — The Ship That Sank

One example among many. Don't reuse its story, arc, shots, props or timings.

**Topic.** The Swedish warship Vasa (1628): top-heavy, it sank on its maiden voyage in Stockholm harbour and was raised 333 years later. Wordless (no narration, no captions). 54 s, 1080×1920, 30 fps. Facts in `demo/facts.md`.

**Shots** (`demo/src/shots.js`): harbour crane-down (4.0 s) → the king below the gilded stern (3.2) → gun deck dolly (3.0) → stability test, sailors stampede, deck rolls (4.4) → admiral stops it, reads the king's letter, shrugs (3.4) → crowd from behind, sails set (4.0) → gust 1, lean and recover (3.0) → gust 2 (2.2) → gun ports dip under (1.6) → flooding interior (1.4) → wide sinking over the crowd (4.8) → shocked faces (2.0) → inquiry, everyone points (3.0) → seabed, the cold shipworm gives up (4.4) → 1961 salvage with flashbulbs (4.4) → museum today (5.2).

**Palette.** Golden afternoon harbour (ochre/terracotta town, blue water, red-and-gold ship); amber gun deck; warm panelled inquiry room; teal seabed; overcast 1961; dark museum with warm spots.

**Score structure.** Brass fanfare → harpsichord march in D → nervous accelerating pizzicato for the test → whistle stop and gulp → bells + march with drums at departure → wind and groans, music gone at gust 2 → descending strings while she sinks → near silence → comic plucks and a gavel → music box underwater → rising strings + flashbulbs → hushed final chord. All synthesised in `demo/mix.py`.

**Build notes.**
- `src/stick.js` — characters (`drawPerson`, `drawWorm`, faces, hats, props, back view, roll) and `makeBoard` (upright billboard + blob shadow).
- `src/post.js` — MSAA, depth pass DOF, bloom, ACES-style curve, grade, vignette.
- `src/world.js` — sky dome, PMREM environment, normal-mapped water, harbour, town, gulls.
- `src/ship.js` — the procedural ship (lofted hull, transom cap, ports, masts, sails, flags; `wreck` mode).
- `src/sets.js` — gun deck, inquiry room, seabed, salvage rig, museum.
- `src/film.js` — per-shot staging (`STAGE`), the ship's path, heel and sinking, crowd, foam, wind streaks.
- `build.sh` — events → mix → frames (`$LIB/core/render/video.mjs`) → mux (`$LIB/core/render/mux.sh`, grain 0).
