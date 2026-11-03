import { setDuck } from './music/player';
// Speech recognition wrapper + forgiving word matching.

const HOMOPHONE_GROUPS: string[][] = [
  ['to', 'two', 'too', '2'],
  ['for', 'four', 'fore', '4'],
  ['there', 'their', 'theyre'],
  ['one', 'won', '1'],
  ['ate', 'eight', '8'],
  ['know', 'no'],
  ['knew', 'new'],
  ['by', 'buy', 'bye'],
  ['right', 'write'],
  ['hi', 'high'],
  ['so', 'sew', 'sow'],
  ['our', 'hour', 'are'],
  ['red', 'read'],
  ['sun', 'son'],
  ['see', 'sea', 'c'],
  ['be', 'bee', 'b'],
  ['would', 'wood'],
  ['here', 'hear'],
  ['which', 'witch'],
  ['way', 'weigh'],
  ['some', 'sum'],
  ['been', 'bin'],
  ['zero', '0'], ['three', '3'], ['five', '5'], ['six', '6'], ['seven', '7'],
  ['nine', '9'], ['ten', '10'],
];

// Very short words get misheard as names / similar words by recognizers.
// These are extra spellings we accept for a target word (one direction only).
// Only spellings that SOUND the same as the target (names, odd spellings) — never a
// different real word a child might misread (no pig/big, were/where, then/than...).
const EXTRA_ACCEPT: Record<string, string[]> = {
  an: ['ann', 'anne'],
  him: ['hymn'],
  ask: ['asc'],
  he: ['hee'],
  let: ['lett'],
  cat: ['kat'],
  net: ['nett'],
  zip: ['zipp'],
  bus: ['buss'],
  kid: ['kidd'],
  lip: ['lipp'],
  web: ['webb'],
  do: ['due', 'dew'],
  walk: ['wok'],
  ran: ['rann'],
  ten: ['10'],
  fox: ['foxx'],
  max: ['macs'],
  saw: ['sa'],
  we: ['wee'],
  i: ['eye', 'aye'],
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function acceptableForms(target: string): Set<string> {
  const t = normalize(target);
  const out = new Set<string>([t]);
  for (const g of HOMOPHONE_GROUPS) if (g.includes(t)) g.forEach((w) => out.add(w));
  (EXTRA_ACCEPT[t] || []).forEach((w) => out.add(normalize(w)));
  return out;
}

/** True if a recognized phrase counts as reading `target`. */
export function phraseMatches(phrase: string, target: string): boolean {
  const forms = acceptableForms(target);
  const p = normalize(phrase);
  if (!p) return false;
  if (forms.has(p) || forms.has(p.replace(/ /g, ''))) return true;
  // Accept if the target appears as one of the words (e.g. "cat cat" or "um cat"),
  // but only for short utterances so random sentences don't count.
  const tokens = p.split(' ');
  if (tokens.length <= 3 && tokens.some((tk) => forms.has(tk))) return true;
  return false;
}

export type MicState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'insecure';

export interface ListenResult {
  matched: boolean;
  heard: string; // best transcript (for feedback)
  error?: string;
}

const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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
  active = false;

  /** Listen for one utterance. Resolves when it matches, or when the recognizer stops. */
  listen(target: string, onInterim?: (heard: string) => void): Promise<ListenResult> {
    return new Promise((resolve) => {
      if (!SR) return resolve({ matched: false, heard: '', error: 'unsupported' });
      const rec = new SR();
      this.rec = rec;
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      rec.continuous = false;
      let best = '';
      let done = false;
      const finish = (r: ListenResult) => {
        if (done) return;
        done = true;
        this.active = false;
        try { rec.abort(); } catch { /* ignore */ }
        resolve(r);
      };
      rec.onresult = (ev: any) => {
        for (let i = 0; i < ev.results.length; i++) {
          const res = ev.results[i];
          for (let j = 0; j < res.length; j++) {
            const tr = res[j].transcript as string;
            if (j === 0 && tr.trim()) best = tr.trim();
            if (phraseMatches(tr, target)) return finish({ matched: true, heard: tr.trim() });
          }
        }
        if (onInterim && best) onInterim(best);
      };
      rec.onerror = (ev: any) => finish({ matched: false, heard: best, error: ev.error });
      rec.onend = () => finish({ matched: false, heard: best });
      try {
        rec.start();
        this.active = true;
      } catch (e: any) {
        finish({ matched: false, heard: '', error: String(e?.message || e) });
      }
      // Safety timeout in case the recognizer hangs
      setTimeout(() => finish({ matched: false, heard: best, error: best ? undefined : 'no-speech' }), 9000);
    });
  }

  stop() {
    try { this.rec?.stop(); } catch { /* ignore */ }
  }
}

export function speakWord(word: string, rate = 0.8) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = rate;
  u.pitch = 1.1;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((v) => v.lang === 'en-US' && /Google|Samantha|Natural/i.test(v.name)) || voices.find((v) => v.lang.startsWith('en'));
  if (v) u.voice = v;
  setDuck('speech', true);
  let done = false;
  const release = () => { if (!done) { done = true; setDuck('speech', false); } };
  u.onend = release; u.onerror = release;
  setTimeout(release, 4000);
  window.speechSynthesis.speak(u);
}
