// Offline render of a track to a 16-bit stereo WAV (used to make shareable samples).
import { TRACKS, TrackName } from './tracks';
import { indexTrack, playStep, stepDuration } from './synth';

export async function renderTrackWav(name: TrackName, seconds = 20, sampleRate = 44100): Promise<string> {
  const tr = TRACKS[name];
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const out = ctx.createGain();
  out.gain.value = 0.5 * tr.volume * 1.6; // music bus level, normalised up a bit for a standalone file
  out.connect(ctx.destination);
  const idx = indexTrack(tr), sd = stepDuration(tr);
  const fadeAt = seconds - 1.5;
  out.gain.setValueAtTime(out.gain.value, fadeAt);
  out.gain.linearRampToValueAtTime(0, seconds);
  for (let s = 0; s * sd < seconds; s++) {
    if (!tr.loop && s >= tr.len) break;
    playStep(ctx, out, tr, idx[s % tr.len], 0.05 + s * sd, sd);
  }
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
  const wav = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) wav.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); wav.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 2, true);
  wav.setUint32(24, sampleRate, true); wav.setUint32(28, sampleRate * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true);
  str(36, 'data'); wav.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    wav.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 0x7fff, true);
    wav.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 0x7fff, true);
  }
  let bin = '';
  const bytes = new Uint8Array(wav.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
