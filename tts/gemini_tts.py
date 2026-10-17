import base64, json, os, subprocess, sys, time, urllib.error, urllib.request

KEY = os.environ["GEMINI_API_KEY"]
MODEL = os.environ.get("MODEL", "gemini-3.8-flash-tts")
STYLE = os.environ.get("STYLE", "อ่านด้วยเสียงผู้ชายหนุ่ม สดใส อบอุ่น เหมือนนักเล่านิทาน จังหวะช้าสบาย:")
TEXT = os.environ["GEN_TEXT"]
VOICES = [v.strip() for v in os.environ.get("VOICES", "Puck,Charon,Fenrir,Orus,Achird,Sadachbia,Iapetus,Algenib").split(",") if v.strip()]

URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
os.makedirs("out", exist_ok=True)
report = open("out/report.txt", "a", encoding="utf-8")


def log(msg):
    print(msg, flush=True)
    report.write(msg + "\n")
    report.flush()


def synth(voice, text):
    body = {
        "contents": [{"parts": [{"text": f"{STYLE} {text}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    req = urllib.request.Request(
        URL, data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
    return base64.b64decode(part["data"]), part.get("mimeType", "")


ok = 0
for i, voice in enumerate(VOICES):
    t0 = time.time()
    for attempt in (1, 2):
        try:
            pcm, mime = synth(voice, TEXT)
            raw = f"out/gemini_{voice}.pcm"
            open(raw, "wb").write(pcm)
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", raw,
                 "-ar", "44100", "-b:a", "192k", f"out/gemini_{voice}.mp3"], check=True)
            os.remove(raw)
            log(f"OK {voice} {time.time() - t0:.1f}s mime={mime}")
            ok += 1
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")
            try:
                msg = json.loads(msg)["error"]["message"]
            except Exception:
                pass
            log(f"HTTP {e.code} {voice} attempt={attempt}: {msg[:300]}")
            if e.code == 429 and attempt == 1:
                time.sleep(20)
                continue
            break
        except Exception as e:
            log(f"ERROR {voice}: {type(e).__name__}: {str(e)[:300]}")
            break
    if i == 0 and ok == 0:
        log("first voice failed, stopping to avoid wasting quota")
        sys.exit(1)
    time.sleep(6)

log(f"done ok={ok}/{len(VOICES)}")
