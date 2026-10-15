#!/bin/bash
# usage: audio.sh <voice.mp3|none> <out.m4a> <seconds>
# server-room ambience (fan hum, footsteps, sparse beeps) synthesised with ffmpeg; optional Thai voice-over starting at 1.0 s
set -e
V=$1; OUT=$2; D=${3:-6.4}
IN=(-f lavfi -i "anoisesrc=d=$D:c=brown:r=48000:a=0.9"
    -f lavfi -i "aevalsrc='0.10*sin(2*PI*2200*t)*lt(mod(t,1.7),0.05)+0.07*sin(2*PI*1500*t)*lt(mod(t+0.9,2.3),0.04)':d=$D:s=48000"
    -f lavfi -i "aevalsrc='0.9*sin(2*PI*68*t)*exp(-26*mod(t,0.62))':d=$D:s=48000")
F="[0:a]lowpass=f=420,volume=0.55[hum];[1:a]volume=1[bp];[2:a]lowpass=f=160,volume=0.45[st]"
if [ "$V" != "none" ] && [ -f "$V" ]; then
  ffmpeg -v error -y "${IN[@]}" -i "$V" -filter_complex "$F;[3:a]adelay=1000|1000,volume=2.6[vo];[hum][bp][st][vo]amix=inputs=4:normalize=0,afade=t=in:d=0.4,afade=t=out:st=$(python3 -c "print($D-0.4)"):d=0.4,atrim=0:$D[a]" -map "[a]" -c:a aac -b:a 192k -ar 48000 "$OUT"
else
  ffmpeg -v error -y "${IN[@]}" -filter_complex "$F;[hum][bp][st]amix=inputs=3:normalize=0,afade=t=in:d=0.4,afade=t=out:st=$(python3 -c "print($D-0.4)"):d=0.4,atrim=0:$D[a]" -map "[a]" -c:a aac -b:a 192k -ar 48000 "$OUT"
fi
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
