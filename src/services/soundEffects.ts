/**
 * Retro Sound Effects Engine
 * Synthesizes retro 8-bit sound effects using the Web Audio API (zero audio files needed).
 * Respects user mute setting and browser interaction policies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  try {
    return localStorage.getItem('studyquest_muted') === 'true';
  } catch {
    return false;
  }
}

export function setAudioMuted(muted: boolean): void {
  try {
    localStorage.setItem('studyquest_muted', muted ? 'true' : 'false');
  } catch {}
}

export type SoundType =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'complete'
  | 'select'
  | 'tick'
  | 'stamp'
  | 'thud'
  | 'caught'
  | 'hint'
  | 'magnify';

export function playSound(type: SoundType): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    if (type === 'click' || type === 'select' || type === 'tick') {
      // Crisp subtle parchment/wood tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.035);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'stamp' || type === 'thud') {
      // Heavy rubber/wooden stamp impact
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'correct' || type === 'caught') {
      // Detective triumphant catch: fast ascending brassy arpeggio
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + (i + 1) * 0.09);
      });
    } else if (type === 'wrong') {
      // Descending buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.28);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } else if (type === 'hint' || type === 'magnify') {
      // Shimmering mystery glass inspection
      const freqs = [880, 1318.51, 1760];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.08, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + i * 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.26 + i * 0.05);
      });
    } else if (type === 'complete') {
      // Fanfare: C5 -> E5 -> G5 -> C6
      const fanfare = [523.25, 659.25, 783.99, 1046.5];
      fanfare.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + i * 0.12;
        const dur = i === 3 ? 0.4 : 0.12;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      });
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

