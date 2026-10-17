"""Synthesise script/narration.json with VachanaTTS (th_m_2) and build audio.flac + timeline.json.

Every segment is trimmed, then placed on one timeline with fixed gaps, so the visuals can follow the real spoken durations.
"""
import json, os, subprocess, sys, time, wave
from pythaitts import TTS

SPEAKER = os.environ.get("SPEAKER", "th_m_2")
LEAD, GAP, TAIL = 1.5, 1.0, 3.0
TEMPO = float(os.environ.get("TEMPO", "0.88"))  # <1 = slower speech, pitch kept
RATE = 48000
segs = json.load(open(os.environ.get("SCRIPT", "script/narration.json"), encoding="utf-8"))
os.makedirs("out/seg", exist_ok=True)
tts = TTS(pretrained="vachana")


def run(*a):
    subprocess.run(list(a), check=True)


def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode())


pcm = bytearray()
timeline = []
t_cursor = LEAD
pcm += b"\x00\x00" * int(LEAD * RATE)
failed = 0
for s in segs:
    raw, wav = f"out/seg/{s['id']}_raw.wav", f"out/seg/{s['id']}.wav"
    t0 = time.time()
    try:
        tts.tts(s["text"], speaker_idx=SPEAKER, filename=raw)
    except Exception as e:
        print("FAILED", s["id"], type(e).__name__, str(e)[:200], flush=True)
        failed += 1
        continue
    trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    run("ffmpeg", "-v", "error", "-y", "-i", raw, "-ar", str(RATE), "-ac", "1", "-af", f"{trim},atempo={TEMPO}", "-c:a", "pcm_s16le", wav)
    d = dur(wav)
    with wave.open(wav, "rb") as w:
        assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2
        data = w.readframes(w.getnframes())
    pcm += data
    timeline.append({"id": s["id"], "key": s["key"], "text": s["text"], "start": round(t_cursor, 3), "end": round(t_cursor + d, 3)})
    print(f"OK {s['id']} {d:.2f}s synth {time.time() - t0:.1f}s", flush=True)
    t_cursor += d
    pcm += b"\x00\x00" * int(GAP * RATE)
    t_cursor += GAP

pcm += b"\x00\x00" * int(TAIL * RATE)
total = t_cursor + TAIL - GAP
with wave.open("out/narration_raw.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(bytes(pcm))
run("ffmpeg", "-v", "error", "-y", "-i", "out/narration_raw.wav", "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", str(RATE), "out/audio.flac")
run("ffmpeg", "-v", "error", "-y", "-i", "out/audio.flac", "-b:a", "160k", "out/narration_preview.mp3")
audio_len = dur("out/audio.flac")
json.dump({"speaker": SPEAKER, "duration": round(audio_len, 3), "segments": timeline}, open("out/timeline.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"done segments={len(timeline)}/{len(segs)} failed={failed} audio={audio_len:.2f}s", flush=True)
sys.exit(1 if failed else 0)
