#!/bin/sh
# Rebuild the Animation3D demo film (The Ship That Sank): events -> mix -> frames -> mux. Everything written goes to $OUT.
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${OUT:-$HOME/animation3d-build}; mkdir -p "$OUT"; export OUT
node "$HERE/export_events.mjs"
"$LIB/.venv/bin/python" "$HERE/mix.py"
cd "$LIB" && node core/render/video.mjs "$HERE" --fps 30 --size 1080x1920 --workers 4 --out "$OUT/video.mp4"
sh "$LIB/core/render/mux.sh" "$OUT/video.mp4" "$OUT/mix.wav" "$OUT/test.mp4" 30 0
