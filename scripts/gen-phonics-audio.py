#!/usr/bin/env python3
"""Generate phoneme / chunk / whole-word clips for Sound It Out.

Voice: Kokoro-82M (Apache-2.0) run locally via kokoro-onnx, voice "af_heart".
Isolated phonemes are not something a TTS says well (it adds vowels), so each sound is
*cut out of a word* the model says naturally, then cleaned up:
  - voiced continuants (m, n, l, ...) come from the END of a word ("hum" -> mmm),
    where speakers hold the final sound, then stretched to ~0.5 s with ffmpeg atempo;
  - fricatives (f, s, sh, th, v, z) are never stretched; see make_fricative;
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
    'zh': ('tail', 'bˈeɪʒ', 0.5), 'l': ('tail', 'hˈɪl', 0.5),
    # fricatives: never time-stretched (see FRIC_* below and make_fricative)
    'f': ('noise', 'pˈʌf|ˈʌf|pˈæf|lˈiːf', 0), 'th': ('noise', 'bˈʌθ|pˈæθ|ˈʌθ|bˈoʊθ', 0),
    's': ('noise', 'bˈʌs|ˈʌs|jˈɛs', 0), 'sh': ('noise', 'hˈʌʃ|ˈʌʃ|fˈɪʃ', 0),
    'v': ('voiced', 'lˈʌv|ˈʌv|hˈæv', 0), 'z': ('voiced', 'bˈʌz|hˈæz|ˈʌzɚ', 0), 'dh': ('voiced', 'bˈeɪð|ˈʌð|bɹˈiːð', 0),
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

# ---- fricatives -------------------------------------------------------------------------------
# The first version cut the ~0.12 s hiss off the end of a word, boosted it to vowel loudness and stretched it
# 4x with ffmpeg atempo. On noise, atempo's overlapping windows turn hiss into a whirring, tonal buzz, and the
# boost put a quiet /f/ (naturally ~15 dB below the vowel) at full level with all of Kokoro's 8-10 kHz sizzle:
# the "angle grinder". Now: no stretching. Unvoiced hiss is lengthened by overlap-adding short grains taken
# from random places in the real hiss (same spectrum, no periodic artifact); voiced v/z/dh are built the way
# they are produced, real voicing (crossfade-looped in phase) plus the matching unvoiced hiss (f/s/th).
# Then a gentle low-pass, an s/z de-ess, a level ~6 dB under the vowels, and 50 ms / 120 ms fades.
FRIC_DUR = 0.55
SOFT_TOP = 'lowpass=f=8000:p=2,equalizer=f=7000:t=q:w=1.5:g=-3'  # gentle top cut for the sibilant bursts (ch, j, ks)
FRIC_EQ = {'f': 'highpass=f=1000:p=2,lowpass=f=7500:p=2', 'th': 'highpass=f=1000:p=2,lowpass=f=7500:p=2',
           's': 'highpass=f=2500:p=2,lowpass=f=8000:p=2,equalizer=f=7000:t=q:w=1.5:g=-4',
           'sh': 'highpass=f=1200:p=2,lowpass=f=7000:p=2'}
FRIC_VOICED = {'v': ('f', -9), 'z': ('s', -4), 'dh': ('th', -11)}   # matching hiss, its level vs the voicing
FRIC_RMS_DB = {'f': -25.5, 'th': -25.5, 's': -25.5, 'sh': -24.5, 'v': -24.5, 'z': -24.5, 'dh': -24.5}  # vowels -19.5


def frames(a, w=480, hop=240):
    win = np.hanning(w); fr = np.fft.rfftfreq(w, 1 / SR)
    S = np.array([np.abs(np.fft.rfft(a[i:i + w] * win)) ** 2 for i in range(0, max(1, len(a) - w), hop)])
    return S, fr

def steady(a, voiced):
    """The steady middle of a word-final fricative, minus 20 ms at each edge (no vowel transition, no release).
    Unvoiced: frames where energy above 2.5 kHz dominates. Voiced: frames after the vowel where the vowel
    formant band (0.7-3 kHz) has dropped below 3% of the vowel (voicing + frication only)."""
    S, fr = frames(a)
    tot = S.sum(1); mid = S[:, (fr >= 700) & (fr < 3000)].sum(1); hi = S[:, fr >= 2500].sum(1)
    peak = int(np.argmax(S[:, fr < 3000].sum(1)))
    if voiced: ok = mid < mid[peak] * 0.03
    else:
        r = hi / (tot + 1e-12); ok = r > 0.5 * r[peak:].max()
    ok &= tot > tot.max() * 0.003; ok[:peak] = False
    ok[1:-1] |= ok[:-2] & ok[2:]                       # bridge 1-frame gaps
    best, cur = (0, 0), None
    for f in range(len(ok)):
        if ok[f] and cur is None: cur = f
        if (not ok[f] or f == len(ok) - 1) and cur is not None:
            if f - cur > best[1] - best[0]: best = (cur, f)
            cur = None
    s0, s1 = best[0] * 240 + 480, best[1] * 240
    return a[s0:max(s0, s1)]

def extend_noise(seg, dur, grain=0.04, seed=1):
    """Unvoiced: overlap-add short sqrt-Hann grains taken from random places in the real segment.
    Keeps the natural spectrum; no periodic tempo artifacts (what made the old /f/ buzz)."""
    rng = np.random.default_rng(seed); G = int(grain * SR); hop = G // 2; win = np.sqrt(np.hanning(G))
    N = int(dur * SR); out = np.zeros(N + G)
    for p in range(0, N, hop):
        s = rng.integers(0, len(seg) - G); out[p:p + G] += seg[s:s + G] * win
    return out[:N]

def extend_loop(seg, dur, xf=0.025):
    """Voiced: crossfade-loop the real segment, choosing each loop point by waveform correlation so the
    voicing stays in phase."""
    X = int(xf * SR); N = int(dur * SR); out = seg.copy()
    fade = np.linspace(0, 1, X)
    while len(out) < N:
        tail = out[-X:]; best, bo = -2, 0
        for o in range(0, len(seg) // 2 - X):
            c = seg[o:o + X]; v = np.dot(tail, c) / (np.linalg.norm(tail) * np.linalg.norm(c) + 1e-9)
            if v > best: best, bo = v, o
        out = np.concatenate([out[:-X], tail * (1 - fade) + seg[bo:bo + X] * fade, seg[bo + X:]])
    return out[:N]

def voice_bar(a):
    """Longest run after the vowel where the vowel formants are gone (<5% of the vowel) and there is no
    hiss: the voicing murmur of a final voiced fricative (Kokoro devoices the end of it, like English speakers)."""
    S, fr = frames(a)
    tot = S.sum(1); mid = S[:, (fr >= 700) & (fr < 3000)].sum(1); hi = S[:, fr >= 2500].sum(1)
    peak = int(np.argmax(mid))
    ok = (mid < mid[peak] * 0.05) & (hi < mid * 2) & (tot > tot.max() * 0.003); ok[:peak] = False
    ok[1:-1] |= ok[:-2] & ok[2:]
    best, cur = (0, 0), None
    for f in range(len(ok)):
        if ok[f] and cur is None: cur = f
        if (not ok[f] or f == len(ok) - 1) and cur is not None:
            if f - cur > best[1] - best[0]: best = (cur, f)
            cur = None
    return a[best[0] * 240 + 480:best[1] * 240]

def level_out(a, win=0.03):
    """Even out slow level dips (from a quieter grain or loop seam) so the sound is a steady hiss/hum."""
    W = int(win * SR); e = np.sqrt(np.convolve(a ** 2, np.hanning(W) / np.hanning(W).sum(), 'same')) + 1e-9
    g = np.median(e) / e
    return a * np.clip(g, 0.5, 2.0)

def ffilter(a, af):
    tin, tout = tempfile.mktemp(suffix='.wav'), tempfile.mktemp(suffix='.wav')
    sf.write(tin, a.astype(np.float32), SR)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tin, '-af', af, tout], check=True)
    b = sf.read(tout)[0]; os.remove(tin); os.remove(tout)
    return b

def longest(carriers, pick):
    best = None
    for c in carriers.split('|'):
        for sp in (0.5, 0.6):
            seg = pick(synth(c, sp).astype(np.float64))
            if best is None or len(seg) > len(best): best = seg
    return best

def hiss(i, seed=1):
    seg = ffilter(longest(RECIPES[i][1], lambda a: steady(a, False)), FRIC_EQ[i])[240:-240]
    return extend_noise(seg, FRIC_DUR, seed=seed), len(seg) / SR

def make_fricative(i, outp):
    rms = lambda x: np.sqrt((x ** 2).mean()) + 1e-12
    if i in FRIC_EQ: a, src = hiss(i)
    else:
        n, rel = FRIC_VOICED[i]
        vb = ffilter(longest(RECIPES[i][1], voice_bar), 'lowpass=f=2000:p=2')[240:-240]; src = len(vb) / SR
        hum = extend_loop(vb, FRIC_DUR); h = hiss(n, seed=7)[0]
        a = hum / rms(hum) + h / rms(h) * 10 ** (rel / 20)
    a = level_out(a); a = a * 10 ** ((FRIC_RMS_DB[i] + 1) / 20) / rms(a)
    tmp = tempfile.mktemp(suffix='.wav'); sf.write(tmp, a.astype(np.float32), SR)
    ffmpeg(tmp, outp, f'afade=t=in:d=0.05,afade=t=out:st={FRIC_DUR - 0.12:.2f}:d=0.12'); os.remove(tmp)
    return src, FRIC_DUR

def ffmpeg(inp, outp, af):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', inp, '-af', af, '-ac', '1', '-ar', '22050',
                    '-codec:a', 'libmp3lame', '-b:a', '48k', outp], check=True)

def finish(a, outp, stretch_to=0.0, fade_in=0.008, fade_out=0.03, target_rms_db=-19, eq=''):
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
    if eq: af.append(eq)
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
        a = synth(ipa) if method not in ('noise', 'voiced') else None
        if method == 'tail': seg = cut_tail(a); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', extra, fade_out=0.06 if extra else 0.02)
        elif method in ('noise', 'voiced'): n, d = make_fricative(i, f'{OUT}/sounds/{fname(i)}.mp3'); seg = np.zeros(int(n * SR))
        elif method == 'gap': seg = cut_after_gap(a); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', 0, fade_out=0.05, target_rms_db=-20, eq=SOFT_TOP)
        elif method.startswith('onset'): seg = cut_onset(a, extra, method == 'onset_fixed'); d = finish(seg, f'{OUT}/sounds/{fname(i)}.mp3', 0, fade_out=min(0.03, 0.4 * len(seg) / SR), target_rms_db=-20, eq=SOFT_TOP if i in ('ch', 'j') else '')
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
