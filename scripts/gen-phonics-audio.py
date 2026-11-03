#!/usr/bin/env python3
"""Generate phoneme / chunk / whole-word clips for Sound It Out.

Voice: Kokoro-82M (Apache-2.0) run locally via kokoro-onnx, voice "af_heart".
Isolated phonemes are not something a TTS says well (it adds vowels), so each sound is
*cut out of a word* the model says naturally, then cleaned up:
  - continuous sounds (m, s, sh, ...) come from the END of a word ("hum" -> mmm),
    where speakers hold the final sound, then stretched to ~0.5 s with ffmpeg atempo;
  - stops (b, t, k, ...) come from the START of "buh"-style syllables and are clipped
    a few milliseconds after the voice starts, so /b/ is not a big "buh";
  - vowels are said on their own, with any breathy onset removed.
Everything is trimmed, loudness-matched and encoded as small mono MP3s.

Usage: python3 scripts/gen-phonics-audio.py   (needs /workspace/tts-venv, models in /workspace/tts-models)
"""
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio')
VOICE = 'af_heart'
k = Kokoro('/workspace/tts-models/kokoro-v1.0.onnx', '/workspace/tts-models/voices-v1.0.bin')
SR = 24000

# id -> (method, ipa carrier, extra)
#   tail:   take the consonant at the end of the carrier word, stretch to `extra` seconds
#   onset:  take the start of the carrier up to `extra` ms after the voice starts
#   vowel:  say the vowel; trim breathy onset; stretch to `extra` seconds
#   whole:  keep the whole (trimmed) carrier
RECIPES = {
    # continuous consonants (held at the end of a word)
    'm': ('tail', 'hˈʌm', 0.55), 'n': ('tail', 'sˈʌn', 0.55), 'ng': ('tail', 'sˈɪŋ', 0.5),
    's': ('fric0.6', 'bˈʌs', 0.6), 'z': ('fric0.35', 'bˈʌz', 0.55), 'sh': ('fric0.5', 'hˈʌʃ', 0.6),
    'zh': ('tail', 'bˈeɪʒ', 0.5), 'f': ('fric0.4', 'pˈʌf', 0.55), 'v': ('fric0.25', 'lˈʌv', 0.5),
    'th': ('fric0.4', 'bˈæθ', 0.55), 'dh': ('fric0.25', 'bˈeɪð', 0.5), 'l': ('tail', 'hˈɪl', 0.5),
    'r': ('vowel', 'ɹːːː', 0.5),
    # stops & short sounds (start of a syllable, clipped)
    'b': ('onset', 'ə. bˈʌ', 60), 'd': ('onset', 'ə. dˈʌ', 60), 'g': ('onset', 'ə. ɡˈʌ', 60),
    'p': ('onset', 'ə. pˈʌ', 5), 't': ('onset', 'ə. tˈʌ', 5), 'k': ('onset', 'ə. kˈʌ', 5),
    'ch': ('onset', 'ə. tʃˈʌ', 5), 'j': ('onset', 'ə. dʒˈʌ', 50), 'h': ('onset', 'ə. hˈʌ', 25),
    'w': ('onset_fixed', 'ə. wˈʌ', 130), 'y': ('onset_fixed', 'ə. jˈʌ', 130),
    'ks': ('gap', 'bˈɑks', 0),
    # vowels
    'a': ('vowel', 'ˈæ', 0.45), 'e': ('vowel', 'ˈɛ', 0.4), 'i': ('vowel', 'ˈɪ', 0.4),
    'o': ('vowel', 'ˈɑ', 0.45), 'u': ('vowel', 'ˈʌ', 0.4), 'uh': ('vowel', 'ə', 0.3),
    'uu': ('vowel', 'ˈʊ', 0.4), 'ay': ('vowel', 'ˈeɪ', 0), 'ee': ('vowel', 'ˈiː', 0),
    'igh': ('vowel', 'ˈaɪ', 0), 'oa': ('vowel', 'ˈoʊ', 0), 'oo': ('vowel', 'ˈuː', 0),
    'ow': ('vowel', 'ˈaʊ', 0), 'oy': ('vowel', 'ˈɔɪ', 0), 'aw': ('vowel', 'ˈɔː', 0),
    'ar': ('vowel', 'ˈɑːɹ', 0), 'er': ('vowel', 'ˈɜː', 0), 'or': ('vowel', 'ˈɔːɹ', 0),
    'air': ('vowel', 'ˈɛɹ', 0),
    # glued chunks (endings etc.)
    'aw+l': ('whole', 'ˈɔːl', 0), 'i+ng': ('whole', 'ˈɪŋ', 0), 'a+ng+k': ('whole', 'ˈæŋk', 0),
    'i+ng+k': ('whole', 'ˈɪŋk', 0), 'igh+n+d': ('whole', 'ˈaɪnd', 0), 'w+u': ('onset_fixed', 'ə. wˈʌ', 200),
    'w+u+n': ('whole', 'wˈʌn', 0),
}

def synth(ipa, speed=0.8):
    a, sr = k.create(ipa, voice=VOICE, speed=speed, is_phonemes=True, trim=False)
    assert sr == SR
    return a.astype(np.float32)

HOP = 240  # 10 ms
def bands(a):
    w = 720; win = np.hanning(w); fr = np.fft.rfftfreq(w, 1 / SR)
    lo, mid, hi, tot = [], [], [], []
    for i in range(0, max(1, len(a) - w), HOP):
        sp = np.abs(np.fft.rfft(a[i:i + w] * win)) ** 2
        lo.append(sp[fr < 500].sum()); mid.append(sp[(fr >= 500) & (fr < 3000)].sum())
        hi.append(sp[fr >= 3000].sum()); tot.append(sp.sum())
    return [np.array(x) for x in (lo, mid, hi, tot)]

def active(tot, thr=0.003):
    idx = np.nonzero(tot > tot.max() * thr)[0]
    return idx[0], idx[-1] + 1

def cut_tail(a):
    lo, mid, hi, tot = bands(a)
    s, e = active(tot)
    vow = np.nonzero(mid > mid.max() * 0.2)[0]
    L = vow[-1] + 2 if len(vow) else s
    return a[L * HOP:e * HOP]

def cut_fric(a, thr):
    """Final fricative: start where the hiss takes over (high band dominates), after the vowel."""
    lo, mid, hi, tot = bands(a)
    s, e = active(tot)
    peak = int(np.argmax(lo + mid))
    r = hi / (tot + 1e-12)
    thr = min(thr, 0.5 * r[peak:e].max())
    f = next(f for f in range(peak, e - 3) if (r[f:f + 3] > thr).all())
    return a[f * HOP:e * HOP]

def cut_after_gap(a):
    """Final "ks": start at the release after the k closure."""
    lo, mid, hi, tot = bands(a)
    s, e = active(tot)
    peak = int(np.argmax(lo + mid))
    q = np.nonzero(tot[peak:e] < tot.max() * 0.003)[0]
    f = peak + int(q[-1]) + 1 if len(q) else peak
    return a[max(0, f * HOP - HOP):e * HOP]

def cut_onset(a, keep_ms, fixed=False):
    """Carrier is "ə. Cˈʌ": find the pause/closure before C, then keep C up to keep_ms after the voice starts
    (or exactly keep_ms from the start of C when fixed=True, for glides like w and y)."""
    hop = 120  # 5 ms
    w = 480; win = np.hanning(w); fr = np.fft.rfftfreq(w, 1 / SR)
    lo, tot = [], []
    for i in range(0, len(a) - w, hop):
        sp = np.abs(np.fft.rfft(a[i:i + w] * win)) ** 2
        lo.append(sp[fr < 400].sum()); tot.append(sp.sum())
    lo, tot = np.array(lo), np.array(tot)
    quiet = tot < tot.max() * 0.004
    start = int(np.nonzero(tot > tot.max() * 0.1)[0][0]); gap_end = None; run = 0
    for f in range(start, len(tot)):
        if quiet[f]: run += 1
        else:
            if run >= 4: gap_end = f; break
            run = 0
    assert gap_end is not None, 'no pause found'
    s0 = gap_end * hop + w // 2 - 2 * hop
    if fixed:
        return a[s0:s0 + int(SR * keep_ms / 1000)]
    after = lo[gap_end:]
    ratio = lo[gap_end:] / (tot[gap_end:] + 1e-12)
    ok = (after > after.max() * 0.1) & (ratio > 0.3)
    v = next(f for f in range(1, len(after) - 3) if ok[f:f + 3].all()) + gap_end
    end = v * hop + w // 2 + int(SR * keep_ms / 1000)
    # skip a pre-voicing "voice bar" before the burst: start where the high band jumps up
    seg = a[s0:end]
    hi = np.array([(np.abs(np.fft.rfft(seg[i:i + w] * win)) ** 2)[fr >= 2000].sum() for i in range(0, max(1, len(seg) - w), hop)])
    if len(hi) > 2:
        b = int(np.nonzero(hi > hi.max() * 0.15)[0][0])
        s0 += max(0, b * hop + w // 2 - 2 * hop)
    return a[s0:end]

def cut_vowel(a):
    lo, mid, hi, tot = bands(a)
    s, e = active(tot, 0.01)
    strong = np.nonzero((lo + mid) > (lo + mid).max() * 0.12)[0]
    return a[strong[0] * HOP:e * HOP]

def ffmpeg(inp, outp, af):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', inp, '-af', af, '-ac', '1', '-ar', '22050',
                    '-codec:a', 'libmp3lame', '-b:a', '48k', outp], check=True)

def finish(a, outp, stretch_to=0.0, fade_in=0.008, fade_out=0.03, target_rms_db=-19):
    tmp = tempfile.mktemp(suffix='.wav')
    rms = np.sqrt((a ** 2).mean()) + 1e-9
    gain = 10 ** (target_rms_db / 20) / rms
    a = a * gain
    pk = np.abs(a).max()
    if pk > 0.9: a = a * 0.9 / pk
    sf.write(tmp, a, SR)
    dur = len(a) / SR
    af = []
    if stretch_to and dur < stretch_to:
        f = dur / stretch_to
        while f < 0.5: af.append('atempo=0.5'); f /= 0.5
        af.append(f'atempo={f:.4f}')
        dur = stretch_to
    af.append(f'afade=t=in:d={fade_in}')
    af.append(f'afade=t=out:st={max(0, dur - fade_out):.3f}:d={fade_out}')
    ffmpeg(tmp, outp, ','.join(af))
    os.remove(tmp)
    return dur

def fname(i): return i.replace('+', '_')

def gen_sounds(ids):
    done = []
    for i in ids:
        method, ipa, extra = RECIPES[i]
        a = synth(ipa)
        if method == 'tail': seg = cut_tail(a); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', extra, fade_out=0.06 if extra else 0.02)
        elif method.startswith('fric'): seg = cut_fric(a, float(method[4:])); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', extra, fade_out=0.06)
        elif method == 'gap': seg = cut_after_gap(a); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', 0, fade_out=0.05)
        elif method.startswith('onset'): seg = cut_onset(a, extra, method == 'onset_fixed'); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', 0, fade_out=min(0.03, 0.4 * len(seg) / SR), target_rms_db=-20)
        elif method == 'vowel': seg = cut_vowel(a); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', extra, fade_out=0.06)
        else: seg = cut_vowel(a); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', 0, fade_out=0.05)
        print(f'{i:8s} {method:6s} {ipa:8s} {len(seg)/SR:.2f}s -> {d:.2f}s')
        done.append(i)
    return done

def gen_words(words):
    for w in words:
        a, sr = k.create(w + '.', voice=VOICE, speed=0.85, lang='en-us')
        lo, mid, hi, tot = bands(a)
        s, e = active(tot, 0.002)
        finish(a[max(0, s * HOP - 240):e * HOP + 480], f'{OUT}/words/{w}.mp3', 0, fade_out=0.04, target_rms_db=-18)
    print(len(words), 'word clips')

if __name__ == '__main__':
    clips = json.loads(sys.argv[1]); words = json.loads(sys.argv[2])
    only = sys.argv[3].split(',') if len(sys.argv) > 3 else None
    missing = [c for c in clips if c not in RECIPES]
    if missing: sys.exit(f'no recipe for {missing}')
    gen_sounds([c for c in clips if not only or c in only])
    if not only: gen_words(words)
    json.dump({'voice': f'Kokoro-82M {VOICE}', 'sounds': clips, 'words': words}, open(f'{OUT}/manifest.json', 'w'), indent=0)
