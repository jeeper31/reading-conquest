import { playWord } from './phonics-audio';
import { anyMatch, normalize, tokens, type Strictness, STRICTNESS_LEVELS } from './match';
// Speech recognition wrapper. Push-to-listen only: one tap = one short listening window, never restarts by itself.

export { normalize };
export type { Strictness };

// ---- Grown-up "how picky" setting (saved in localStorage; default Forgiving) ----
const MIC_KEY = 'reading-conquest-mic-v1';
export function getStrictness(): Strictness {
  try {
    const v = JSON.parse(localStorage.getItem(MIC_KEY) || '{}').strictness;
    return STRICTNESS_LEVELS.includes(v) ? v : 'forgiving';
  } catch { return 'forgiving'; }
}
export function setStrictness(s: Strictness) {
  try { localStorage.setItem(MIC_KEY, JSON.stringify({ strictness: s })); } catch { /* ignore */ }
}

/** How long one tap listens for (ms). */
export const LISTEN_MS = 4000;

export type MicState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'insecure';

export interface ListenResult {
  matched: boolean;
  /** best transcript (for feedback) */
  heard: string;
  error?: string;
  /** true when nothing usable was heard (silence, only "um", or a long chat) -> not a miss */
  nothing?: boolean;
}

const FILLERS = new Set(['um', 'uh', 'umm', 'uhh', 'hmm', 'hm', 'mm', 'er', 'ah', 'oh', 'erm', 'huh']);

/** Was this a clear, different word (a real miss) rather than silence/filler/background chatter? */
export function isClearMiss(heard: string): boolean {
  const t = tokens(heard).filter((w) => !FILLERS.has(w));
  return t.length >= 1 && t.length <= 3;
}

const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const SRPhrase: any = (window as any).SpeechRecognitionPhrase;
const SRGrammarList: any = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
let phrasesOk = !!SRPhrase;

export const speechSupported = !!SR;

export function secureContextOk(): boolean {
  return window.isSecureContext;
}

export async function queryMicPermission(onChange?: (s: MicState) => void): Promise<MicState> {
  if (!secureContextOk()) return 'insecure';
  if (!SR) return 'unsupported';
  try {
    const st = await (navigator as any).permissions?.query({ name: 'microphone' });
    if (!st) return 'unknown';
    if (onChange) st.onchange = () => onChange(st.state as MicState);
    return st.state as MicState;
  } catch {
    return 'unknown'; // Safari / older browsers can't query the mic permission
  }
}

export class Listener {
  private rec: any = null;
  private finishFn: ((r: ListenResult) => void) | null = null;
  active = false;
  /** Number of recognizer starts (for tests: must be 1 per tap, or 2 only after a phrases-not-supported fallback). */
  starts = 0;

  /** Listen for one utterance. Resolves on the first match (interim or final), on end, or after `ms`. */
  listen(target: string, opts: { onInterim?: (heard: string) => void; mode?: Strictness; ms?: number } = {}): Promise<ListenResult> {
    const mode = opts.mode ?? getStrictness();
    const ms = opts.ms ?? LISTEN_MS;
    return new Promise((resolve) => {
      if (!SR) return resolve({ matched: false, heard: '', error: 'unsupported', nothing: true });
      let best = '';
      let done = false;
      const timers: number[] = [];
      const finish = (r: ListenResult) => {
        if (done) return;
        done = true;
        this.active = false;
        this.finishFn = null;
        timers.forEach((t) => clearTimeout(t));
        const rec = this.rec; this.rec = null;
        if (rec) { rec.onresult = rec.onerror = rec.onend = null; try { rec.abort(); } catch { /* ignore */ } }
        if (!r.matched && !r.error && !isClearMiss(r.heard)) r.nothing = true;
        resolve(r);
      };
      this.finishFn = finish;
      const start = (withPhrases: boolean) => {
        const rec = new SR();
        this.rec = rec;
        rec.lang = 'en-US';
        rec.continuous = false; // one utterance only
        rec.interimResults = true; // so we can accept the moment the word appears
        rec.maxAlternatives = 10;
        const hint = normalize(target);
        if (withPhrases) { try { rec.phrases = [new SRPhrase(hint, 5.0)]; } catch { /* ignore */ } }
        if (SRGrammarList) {
          try {
            const g = new SRGrammarList();
            g.addFromString(`#JSGF V1.0; grammar w; public <w> = ${hint.replace(/[^a-z ]/g, '')} ;`, 1);
            rec.grammars = g;
          } catch { /* legacy API; harmless if unsupported */ }
        }
        rec.onresult = (ev: any) => {
          const alts: string[] = [];
          let top = '';
          for (let i = 0; i < ev.results.length; i++) {
            const res = ev.results[i];
            if (res[0]?.transcript) top += ' ' + res[0].transcript;
            for (let j = 0; j < res.length; j++) if (res[j]?.transcript) alts.push(res[j].transcript);
          }
          if (top.trim()) alts.push(top); // whole utterance so far, across result chunks
          const m = anyMatch(alts, target, mode);
          if (m) return finish({ matched: true, heard: m.heard });
          if (top.trim()) { best = top.trim(); opts.onInterim?.(best); }
        };
        rec.onerror = (ev: any) => {
          if (ev.error === 'phrases-not-supported' && !done) {
            // This browser can't take word hints: try once more right away without them (same tap, same window).
            phrasesOk = false;
            rec.onresult = rec.onerror = rec.onend = null;
            try { rec.abort(); } catch { /* ignore */ }
            return start(false);
          }
          finish({ matched: false, heard: best, error: ev.error === 'no-speech' || ev.error === 'aborted' ? undefined : ev.error });
        };
        rec.onend = () => finish({ matched: false, heard: best });
        try {
          rec.start();
          this.starts++;
          this.active = true;
        } catch (e: any) {
          finish({ matched: false, heard: '', error: String(e?.message || e) });
        }
      };
      start(phrasesOk);
      // Hard stop after `ms`: ask for the final result, then give up shortly after.
      timers.push(window.setTimeout(() => { try { this.rec?.stop(); } catch { /* ignore */ } }, ms));
      timers.push(window.setTimeout(() => finish({ matched: false, heard: best }), ms + 900));
    });
  }

  stop() {
    this.finishFn?.({ matched: false, heard: '', error: 'cancelled' });
  }
}

/** Say a word aloud: natural pre-generated clip if there is one, else the browser voice. */
export function speakWord(word: string) {
  return playWord(word);
}
