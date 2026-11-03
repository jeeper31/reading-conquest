# Sound it out

On the reading screen, tap **Sound it out**, tap the word itself, or press **S**.
After a first miss, the button pulses. After a second miss, the view opens on its own and blends the word.

## How words are chunked
Each word in `src/data/words.ts` has a hand-written breakdown in `src/data/phonics.ts`, using the notation described at the top of that file. Each chunk becomes one big tile, and tapping a tile plays its sound.

| Word | Tiles | Why |
|---|---|---|
| ship | sh · i · p | digraph: 2 letters, 1 sound |
| black | b-l · a · ck | blend (b and l are separate sounds on adjacent tiles joined by a green bar), plus ck |
| make | m · a · k · e | magic e: an arc runs from the e to the a, so a says its name and the e is silent |
| eat / good / see | ea · t / g · oo · d / s · ee | vowel teams |
| her / under | h · er / u · n · d · er | bossy r |
| going / all / thank / find | g · o · ing / all / th · ank / f · ind | word chunks (no -ight word is in the list yet; igh is a supported sound) |
| well / pretty | w · e · ll / p-r · ♥e · tt · y | double letters make one sound |
| said | s · ♥ai · d | sight word: the tricky part has a heart and is said the way it sounds in the word (short e) |

`npm test` (`scripts/check-phonics.ts`) checks that every word has a breakdown, that its chunks spell the word, that every sound id exists, and that every clip file is present.

## Audio
- **Voice:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0), voice `af_heart`. It runs locally through [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) (MIT), which accepts IPA phoneme input.
- **Generator:** `scripts/gen-phonics-audio.py` writes `public/audio/sounds/*.mp3` (one clip per sound), `public/audio/words/*.mp3` (one clip per whole word), and `manifest.json`.
- **Method:** TTS voices pronounce isolated phonemes poorly, so each sound is cut out of a carrier word that the voice says naturally:
  - Voiced continuants (m, n, ng, l, r) come from the end of a word and are stretched to about 0.5 s.
  - Fricatives are never time-stretched (stretching noise made the first /f/ sound like a grinder):
    - f, s, sh and th take the real hiss from the end of a word and lengthen it by overlap-adding short grains from random spots in it.
    - v, z and th (as in "this") are built as real voicing, looped in phase, plus the matching hiss.
    - All of them get a gentle low-pass (7 to 8 kHz), a de-ess on s and z, a level about 6 dB under the vowels, and soft 50 ms / 120 ms fades.
  - Stops are clipped just after voicing begins, so b sounds like /b/ and not "buh".
  - All clips are RMS-normalized, trimmed, and saved as mono 22 kHz MP3.
- **Playback:** if a word clip is missing, the browser's `speechSynthesis` reads the word instead. Background music ducks while the sounds play.
- **Demo:** `audio-samples/blend-make.mp3` plays the blend sequence: slow, then fast, then the whole word.
- **Fricative fix:** `audio-samples/f-old.mp3` / `f-new.mp3`, `fricatives-old.mp3` / `fricatives-new.mp3` (f s sh th v z dh in a row), and before/after plots in `audio-samples/*.png`.
