#!/bin/bash
# usage: master.sh <mix.wav> <audio.flac> <seconds>
# Compress, normalise to about -14.5 LUFS, true peak under -1 dBFS. NOTE: alimiter must have level=0,
# otherwise it auto-gains the output back up to 0 dBFS and the AAC encode clips.
set -e
IN=$1; OUT=$2; DUR=$3
CH="acompressor=threshold=-20dB:ratio=2.5:attack=8:release=220:makeup=1.5,alimiter=limit=0.4:level=0"
I=$(ffmpeg -hide_banner -i "$IN" -af "$CH,loudnorm=print_format=json" -f null - 2>&1 | grep input_i | sed 's/[^0-9.-]//g')
G=$(python3 -c "print(round(-14.0-($I),2))")
ffmpeg -y -hide_banner -loglevel error -i "$IN" -af "$CH,volume=${G}dB,alimiter=limit=0.6:level=0:attack=1,atrim=0:$DUR" -ar 48000 -c:a flac "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
