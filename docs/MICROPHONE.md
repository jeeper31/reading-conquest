# Microphone: push-to-listen and forgiving matching

## Listening
- **Push-to-listen only.** The mic listens only after a tap on the red button (or Space). It is never on before that.
- **One short window.** Each tap listens for 4 seconds. A yellow ring around the button runs down, and the hint counts 4, 3, 2, 1.
- **Stops early on a match.** It stops the moment the word is heard, even in a partial (interim) result.
- **No restarts.** It never restarts by itself (`continuous = false`, no restart on `end`).
- **Tap again to stop.** A second tap, or Space, stops listening.
- **Nothing heard is not a miss.** Silence, just "um", or a long background chat says "I didn't hear you. Tap and try again!".
- **What counts as a miss.** Only a clear different word of 1 to 3 words counts, and the screen shows what it heard.
- **Hints to the recognizer.** It uses `phrases` contextual biasing when the browser supports it. If not, it falls back without phrases in the same tap. It also sets a legacy grammar, which is harmless when ignored. It asks for 10 alternatives.

## Matching (`src/match.ts`, tested by `scripts/check-match.ts`)
- **Checked everywhere.** Every alternative of every interim and final result is checked. The word may appear anywhere ("the word is cat", "uh cat", "cat cat"), and pairs of words are joined ("in to" counts as "into").
- **Grown-up setting.** Set it with the gear at the top right of the reading screen. It is saved in `localStorage` (`reading-conquest-mic-v1`).

| Setting | What it accepts |
|---|---|
| **Forgiving (default)** | Everything in Normal, plus: one letter off for 3-4 letter words (big/pig, cat/hat); one letter off for longer words, or two letters off if the start and end letters match; any word with the same phonetic key (Metaphone-style consonant key); voiced/unvoiced swaps |
| **Normal** | Exact matches and homophones, plus a curated list of common misrecognitions of short words (a: uh/hey, I: hi, in: and/an, it: eat, is: his/as, up: pup/yup, go: no/goal, he: hey, me: mean, run: ron/won, big: pig...), plus a same phonetic key with 1-2 letters off (kat, phone/fone) |
| **Strict** | Exact matches, homophones, numerals (2/two) and letter names (c/see), within an answer of up to 3 words |
