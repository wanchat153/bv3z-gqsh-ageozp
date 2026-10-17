#!/bin/bash
# usage: tools/finish.sh <partsDir> <audio.wav|none> <out.mp4> <WX> <WY> <seconds>
# concatenates part_*/part.mp4 in order (names are zero-padded) and encodes the final 2-pass 6000k MP4 with the @m153_ watermark and AAC audio
set -e
P=$1; AUD=$2; OUT=$3; WX=${4:-380}; WY=${5:-480}; DUR=$6
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
BT='-colorspace bt709 -color_primaries bt709 -color_trc bt709'
ls $P/*/part.mp4 | sort | sed "s#^#file '#;s#\$#'#" > list.txt
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy joined.mp4
VF="drawtext=fontfile=$FONT:text='@m153_':fontsize=30:fontcolor=0x222222@0.20:x=$WX:y=$WY,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
ffmpeg -v error -y -i joined.mp4 -vf "$VF" -c:v libx264 -preset slow -b:v 6000k -maxrate 8000k -bufsize 16000k -profile:v high -pass 1 -passlogfile pl -an -f null /dev/null
if [ "$AUD" != "none" ] && [ -f "$AUD" ]; then
  ffmpeg -v error -y -i joined.mp4 -i "$AUD" -vf "$VF" -c:v libx264 -preset slow -b:v 6000k -maxrate 8000k -bufsize 16000k -pix_fmt yuv420p -profile:v high $BT -pass 2 -passlogfile pl -c:a aac -b:a 256k -ar 48000 -t $DUR -movflags +faststart "$OUT"
else
  ffmpeg -v error -y -i joined.mp4 -vf "$VF" -c:v libx264 -preset slow -b:v 6000k -maxrate 8000k -bufsize 16000k -pix_fmt yuv420p -profile:v high $BT -pass 2 -passlogfile pl -an -t $DUR -movflags +faststart "$OUT"
fi
rm -f pl* list.txt joined.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$OUT"
