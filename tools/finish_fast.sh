#!/bin/bash
# usage: tools/finish_fast.sh <partsDir> <audio> <out.mp4> <seconds>
# parts are already final-quality (same encode settings, closed 1-s GOPs): join them with stream copy and mux AAC audio. No re-encode of the video.
set -e
P=$1; AUD=$2; OUT=$3; DUR=$4
ls $P/*/part.mp4 | sort | sed "s#^#file '#;s#\$#'#" > list.txt
ffmpeg -v error -y -f concat -safe 0 -i list.txt -i "$AUD" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -t $DUR -movflags +faststart "$OUT"
rm -f list.txt
ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$OUT"
