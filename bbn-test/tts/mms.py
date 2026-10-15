# Meta MMS-TTS Thai (VITS) on CPU
import os, torch, scipy.io.wavfile as w
from transformers import VitsModel, AutoTokenizer
text = os.environ['TEXT']
m = VitsModel.from_pretrained('facebook/mms-tts-tha'); tok = AutoTokenizer.from_pretrained('facebook/mms-tts-tha')
with torch.no_grad(): wav = m(**tok(text, return_tensors='pt')).waveform
os.makedirs('out', exist_ok=True)
w.write('out/mms_tha.wav', m.config.sampling_rate, wav.squeeze().numpy())
print('OK mms')
