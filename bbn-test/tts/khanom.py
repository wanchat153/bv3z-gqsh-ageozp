# KhanomTan (pythaitts): discover speakers, synthesise the sample line for each (cap 8)
import os, sys
from pythaitts import TTS
text = os.environ['TEXT']
tts = TTS(pretrained="khanomtan")

def find_speakers(o, depth=0, seen=None):
    seen = seen if seen is not None else set()
    if id(o) in seen or depth > 4: return None
    seen.add(id(o))
    sm = getattr(o, 'speaker_manager', None)
    if sm is not None and hasattr(sm, 'name_to_id'): return list(sm.name_to_id.keys())
    for v in (vars(o).values() if hasattr(o, '__dict__') else []):
        r = find_speakers(v, depth + 1, seen)
        if r: return r
    return None

names = find_speakers(tts) or ['Linda']
print('SPEAKERS', names)
os.makedirs('out', exist_ok=True)
ok = []
for n in names[:8]:
    try:
        tts.tts(text, speaker_idx=n, filename=f'out/khanom_{n}.wav')
        ok.append(n)
    except Exception as e:
        print('FAILED', n, repr(e)[:150])
print('OK', ok)
