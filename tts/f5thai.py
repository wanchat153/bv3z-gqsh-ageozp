import os, sys, time, traceback

# Narration + reference clips are made by the workflow; this script runs F5-TTS-THAI on each reference.
GEN = os.environ.get("GEN_TEXT", "")
REF_TEXT = os.environ.get("REF_TEXT", "")
STEP = int(os.environ.get("STEP", "32"))
SPEED = float(os.environ.get("SPEED", "0.9"))

refs = [("plain", "out/ref_plain.wav"), ("bright", "out/ref_bright.wav")]

from f5_tts_th.tts import TTS

tts = TTS(model="v1")
for name, ref in refs:
    t0 = time.time()
    try:
        tts.infer(
            ref_audio=ref,
            ref_text=REF_TEXT,
            gen_text=GEN,
            step=STEP,
            cfg=2.0,
            speed=SPEED,
            file_wave=f"out/f5_{name}.wav",
        )
        print(f"OK {name} {time.time() - t0:.0f}s", flush=True)
    except Exception:
        traceback.print_exc()
        print(f"FAILED {name}", flush=True)
