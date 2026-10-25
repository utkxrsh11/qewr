/**
 * Retro Sound Effects Engine (Phase 7 Polished)
 * Synthesizes retro 8-bit sound effects using the Web Audio API with Master Gain volume control.
 * Respects user mute setting, volume percentage, and browser interaction policies.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export function getAudioVolume(): number {
  try {
    const raw = localStorage.getItem('studyquest_volume');
    if (raw !== null) {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val >= 0 && val <= 100) return val;
    }
  } catch {}
  return 80; // default 80%
}

export function setAudioVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(100, vol));
  try {
    localStorage.setItem('studyquest_volume', String(clamped));
  } catch {}

  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(clamped / 100, audioCtx.currentTime);
  }
}

function getAudioContext(): { ctx: AudioContext; destination: AudioNode } | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      const initialVol = getAudioVolume();
      masterGain.gain.setValueAtTime(initialVol / 100, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  if (!audioCtx || !masterGain) return null;
  return { ctx: audioCtx, destination: masterGain };
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
  | 'magnify'
  | 'jump'
  | 'land'
  | 'crumble'
  | 'roundComplete';

export function playSound(type: SoundType): void {
  if (isAudioMuted()) return;
  const audio = getAudioContext();
  if (!audio) return;
  const { ctx, destination } = audio;

  const now = ctx.currentTime;

  try {
    if (type === 'click' || type === 'select' || type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.035);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'stamp' || type === 'thud') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'correct' || type === 'caught') {
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.09);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now + i * 0.07);
        osc.stop(now + (i + 1) * 0.09);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.28);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } else if (type === 'hint' || type === 'magnify') {
      const freqs = [880, 1318.51, 1760];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.08, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + i * 0.05);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.26 + i * 0.05);
      });
    } else if (type === 'complete') {
      const fanfare = [
        { f: 523.25, d: 0.1, t: 0 },
        { f: 659.25, d: 0.1, t: 0.11 },
        { f: 783.99, d: 0.1, t: 0.22 },
        { f: 1046.5, d: 0.35, t: 0.34 },
      ];
      fanfare.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.1, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } else if (type === 'jump') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'land') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'crumble') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'roundComplete') {
      const chords = [
        { f: 440, t: 0, d: 0.1 },
        { f: 554.37, t: 0.08, d: 0.12 },
        { f: 659.25, t: 0.16, d: 0.15 },
        { f: 880, t: 0.24, d: 0.28 },
      ];
      chords.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.12, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    }
  } catch (err) {
    console.warn('[SoundEffects] Play sound failed:', err);
  }
}
