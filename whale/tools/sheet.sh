#!/bin/bash
# usage: tools/sheet.sh <out.jpg> <cols> t1 t2 ...   renders 540x960 stills and tiles them at 270 px wide with time labels
OUT=$1; COLS=$2; shift 2; D=$(mktemp -d); node ../tools/stills.mjs . $D 540x960 "$@" >/dev/null 2>&1
i=0; for t in "$@"; do f=$(ls $D | grep -F "$(printf %06s $t | tr ' ' 0).jpg" | head -1); ffmpeg -loglevel error -y -i "$D/$f" -vf "scale=270:-1,drawtext=text='$t':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5" $D/l_$(printf %03d $i).jpg; i=$((i+1)); done
ffmpeg -loglevel error -y -pattern_type glob -i "$D/l_*.jpg" -vf "tile=${COLS}x$(( ( $# + COLS - 1 ) / COLS ))" -frames:v 1 $OUT; rm -rf $D
