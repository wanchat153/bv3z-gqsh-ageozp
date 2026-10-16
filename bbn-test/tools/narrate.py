#!/usr/bin/env python3
"""Thai narration for the educational clip.
usage: narrate.py <outdir> [total_seconds=45]
Reads song/lyrics.txt ([S1] ... one line each), synthesises every line with edge-tts (male Niwat, documentary pace),
measures the real durations, and writes
  <outdir>/timing.json  ({duration, lines:[{id,start,end}]} for tools/cues.mjs --align)
  <outdir>/voice.m4a    (all lines placed on the timeline, padded/trimmed to total_seconds)
"""
import json, os, re, shutil, subprocess, sys, time

OUT = sys.argv[1]; TOTAL = float(sys.argv[2]) if len(sys.argv) > 2 else 45.0
VOICE = 'th-TH-NiwatNeural'; LEAD = 0.7; GAP = 0.45; TAIL = 1.5
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

# lyrics.txt -> [(id, text)] using the same id rule as tools/cues.mjs
lines, seen, sec, n = [], {}, None, 0
for raw in open(os.path.join(HERE, '..', 'song', 'lyrics.txt'), encoding='utf8'):
    s = raw.strip()
    if not s: continue
    m = re.match(r'^\[(.+?)\]$', s)
    if m:
        slug = re.sub(r'[^a-z0-9]', '', m.group(1).split(' - ')[0].lower())
        seen[slug] = seen.get(slug, 0) + 1
        sec = slug if seen[slug] == 1 else f'{slug}{seen[slug]}'; n = 0; continue
    n += 1; lines.append((f'{sec}-{n}', s))

def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True).stdout.strip())

def synth(text, rate, path):
    for attempt in range(12):  # the free service sometimes returns no audio: retry with growing pauses
        r = subprocess.run(['python3', '-m', 'edge_tts', '--voice', VOICE, f'--rate={rate}', '--text', text, '--write-media', path],
                           capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(path) and os.path.getsize(path) > 0: return
        if os.path.exists(path): os.remove(path)
        time.sleep(min(1.5 + attempt, 8))
    raise RuntimeError(f'TTS failed for: {text[:30]}... {r.stderr[-300:]}')

def main():
    global chosen, GAP
    chosen = None
    assets = os.path.join(HERE, '..', 'assets', 'narr')
    if all(os.path.exists(os.path.join(assets, f'{lid}.mp3')) for lid, _ in lines):  # pre-generated ElevenLabs clips
        GAP = 0.6
        durs = []
        for i, (lid, _) in enumerate(lines):
            p = os.path.join(OUT, f'seg_{i}.mp3'); shutil.copy(os.path.join(assets, f'{lid}.mp3'), p); durs.append(dur(p))
        total = LEAD + sum(durs) + GAP * (len(lines) - 1)
        print(f'assets: speech ends at {total:.2f}s (budget {TOTAL - TAIL:.1f}s)')
        if total > TOTAL - TAIL: raise RuntimeError(f'narration {total:.1f}s does not fit {TOTAL}s')
        chosen = ('eleven_v4', durs, total)
    for rate in ([] if chosen else ['-8%', '-4%', '+0%', '+6%', '+12%']):
        durs = []
        for i, (lid, text) in enumerate(lines):
            p = os.path.join(OUT, f'seg_{i}.mp3'); synth(text, rate, p); durs.append(dur(p))
        total = LEAD + sum(durs) + GAP * (len(lines) - 1)
        print(f'rate {rate}: speech ends at {total:.2f}s (budget {TOTAL - TAIL:.1f}s)')
        chosen = (rate, durs, total)
        if total <= TOTAL - TAIL: break
    rate, durs, total = chosen

    t, tl, starts = LEAD, [], []
    for (lid, _), d in zip(lines, durs):
        starts.append(t); tl.append({'id': lid, 'start': round(t, 3), 'end': round(t + d, 3)}); t += d + GAP
    json.dump({'duration': TOTAL, 'bpm': 120, 'offset': 0, 'lines': tl, 'rate': rate}, open(os.path.join(OUT, 'timing.json'), 'w'), indent=1)

    inputs = []; chains = []
    for i, st in enumerate(starts):
        inputs += ['-i', os.path.join(OUT, f'seg_{i}.mp3')]
        ms = int(round(st * 1000)); chains.append(f'[{i}:a]adelay={ms}|{ms}[a{i}]')
    mix = ''.join(f'[a{i}]' for i in range(len(starts)))
    flt = ';'.join(chains) + f';{mix}amix=inputs={len(starts)}:normalize=0:duration=longest,loudnorm=I=-16:LRA=11:TP=-1.5,apad=whole_dur={TOTAL},atrim=0:{TOTAL},afade=t=out:st={TOTAL - 0.6}:d=0.6[a]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', flt, '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    os.path.join(OUT, 'voice.m4a')], check=True)
    print('voice ends at', round(total, 2), 's; rate', rate)

try:
    main()
except Exception as e:
    import traceback
    msg = (str(e) + ' | ' + traceback.format_exc()[-500:]).replace('%', '%25').replace('\n', '%0A')
    print('::error title=narrate failed::' + msg)
    sys.exit(1)
