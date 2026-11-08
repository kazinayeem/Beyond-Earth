/**
 * Beyond Earth — procedural audio engine.
 *
 * Everything is synthesised at runtime with the Web Audio API (no audio files).
 *
 * Signal flow:
 *   one-shots / layers -> uiBus | envBus | voiceBus -> masterGain -> limiter -> destination
 *
 * The module is SSR-safe: no `window` access happens outside `typeof window` guards,
 * and the AudioContext is only created after a user gesture (see `unlock()`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AudioVolumes {
  master: number;
  /** UI volume. */
  sfx: number;
  /** Environment volume (engines, ambience, radio). */
  ambient: number;
}

export interface LaunchState {
  /** Engine thrust fraction 0..1. */
  throttle: number;
  /** 1 at sea level, 0 in vacuum. */
  atmosphere: number;
  /** Aerodynamic pressure normalised to max-Q, 0..1. */
  q: number;
  stage: 1 | 2;
  running: boolean;
}

export interface SayOptions {
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
  /** Wrap the callout in Quindar intro/outro tones (default true). */
  radio?: boolean;
}

export type AlertSeverity = 'low' | 'medium' | 'critical';

interface Buses {
  master: GainNode;
  limiter: DynamicsCompressorNode;
  ui: GainNode;
  env: GainNode;
  voice: GainNode;
  /** Input of the shared feedback-delay "tail" effect (outputs into uiBus). */
  fxSend: GainNode;
  fxNodes: AudioNode[];
}

type NoiseKind = 'white' | 'brown' | 'crackle';

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Exponential glide target. */
  freqEnd?: number;
  /** Glide duration (defaults to the whole envelope). */
  glide?: number;
  /** Offset from now, seconds. */
  at?: number;
  attack?: number;
  hold?: number;
  decay: number;
  peak: number;
  dest: AudioNode;
  /** Amount sent to the delay tail. */
  send?: number;
  filter?: { type: BiquadFilterType; freq: number; freqEnd?: number; Q?: number };
}

interface NoiseOpts {
  kind?: NoiseKind;
  at?: number;
  attack?: number;
  hold?: number;
  decay: number;
  peak: number;
  dest: AudioNode;
  filter?: { type: BiquadFilterType; freq: number; freqEnd?: number; Q?: number; sweep?: number };
}

interface Graph {
  out: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
}

interface LaunchGraph extends Graph {
  rumbleSrc: AudioBufferSourceNode;
  rumbleLP: BiquadFilterNode;
  rumbleGain: GainNode;
  crackleGain: GainNode;
  subOsc: OscillatorNode;
  subGain: GainNode;
  aeroBP: BiquadFilterNode;
  aeroGain: GainNode;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const KEY_MUTED = 'beyond_earth_muted';
const KEY_MASTER = 'beyond_earth_master_vol';
const KEY_SFX = 'beyond_earth_sfx_vol';
const KEY_AMBIENT = 'beyond_earth_ambient_vol';
const KEY_VOICE = 'beyond_earth_voice';

const MIN_GAIN = 0.0001;
const MIX_TC = 0.03;
const PAUSE_TC = 0.05; // ~0.15 s to settle
const HOVER_INTERVAL_MS = 60;

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/** Random pitch factor within ±3 %. */
const vary = (): number => 1 + (Math.random() * 2 - 1) * 0.03;

function readStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode, quota) — settings stay in memory
  }
}

function readVolume(key: string, fallback: number): number {
  const raw = readStorage(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? clamp01(n) : fallback;
}

/** Disconnects every node once the source finishes. */
function disposeOnEnd(src: AudioScheduledSourceNode, nodes: AudioNode[]): void {
  src.onended = () => {
    for (const n of nodes) {
      try {
        n.disconnect();
      } catch {
        // already disconnected
      }
    }
  };
}

/** Exponential attack / hold / decay envelope (click-free). */
function envelope(param: AudioParam, t: number, attack: number, hold: number, decay: number, peak: number): number {
  const p = Math.max(peak, MIN_GAIN * 2);
  const a = Math.max(attack, 0.001);
  param.setValueAtTime(MIN_GAIN, t);
  param.exponentialRampToValueAtTime(p, t + a);
  if (hold > 0) param.setValueAtTime(p, t + a + hold);
  param.exponentialRampToValueAtTime(MIN_GAIN, t + a + hold + Math.max(decay, 0.005));
  return t + a + hold + Math.max(decay, 0.005);
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bus: Buses | null = null;
  private noise: Partial<Record<NoiseKind, AudioBuffer>> = {};

  private muted = false;
  private volumes: AudioVolumes = { master: 0.8, sfx: 0.7, ambient: 0.75 };
  private voiceEnabled = true;
  private paused = false;
  private unlocked = false;

  private listeners = new Set<() => void>();
  private lastHover = 0;

  private launch: LaunchGraph | null = null;
  private orbit: Graph | null = null;
  private wantLaunch = false;
  private wantOrbit = false;
  private lastLaunchState: LaunchState | null = null;

  private cachedVoice: SpeechSynthesisVoice | null | undefined = undefined;

  constructor() {
    if (typeof window === 'undefined') return;

    this.muted = readStorage(KEY_MUTED) === 'true';
    this.volumes.master = readVolume(KEY_MASTER, 0.8);
    this.volumes.sfx = readVolume(KEY_SFX, 0.7);
    this.volumes.ambient = readVolume(KEY_AMBIENT, 0.75);
    this.voiceEnabled = readStorage(KEY_VOICE) !== 'false';

    try {
      const opts: AddEventListenerOptions = { capture: true, passive: true };
      const onGesture = () => {
        window.removeEventListener('pointerdown', onGesture, opts);
        window.removeEventListener('keydown', onGesture, opts);
        this.unlock();
      };
      window.addEventListener('pointerdown', onGesture, opts);
      window.addEventListener('keydown', onGesture, opts);
    } catch {
      // no event support
    }

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          this.cachedVoice = undefined;
        });
      }
    } catch {
      // speech unsupported
    }
  }

  // -------------------------------------------------------------------------
  // Context lifecycle
  // -------------------------------------------------------------------------

  /** Creates (if needed) and resumes the AudioContext. Call from a user gesture. */
  public unlock(): void {
    this.unlocked = true;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      if (this.wantLaunch && !this.launch) this.startLaunchAudio();
      if (this.wantOrbit && !this.orbit) this.startOrbitAmbience();
    } catch {
      // ignore
    }
  }

  /** Returns a usable context or null. Never throws. */
  private ensure(): AudioContext | null {
    try {
      if (typeof window === 'undefined') return null;
      if (!this.ctx) {
        if (!this.unlocked && !this.hasUserActivation()) return null;
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.buildBuses(this.ctx);
      }
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx.state === 'closed' ? null : this.ctx;
    } catch {
      return null;
    }
  }

  private hasUserActivation(): boolean {
    try {
      const ua = (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation;
      return !!ua?.hasBeenActive;
    } catch {
      return false;
    }
  }

  /** Builds master bus, limiter, sub-buses and the shared delay tail. */
  private buildBuses(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-14, now);
    limiter.knee.setValueAtTime(6, now);
    limiter.ratio.setValueAtTime(6, now);
    limiter.attack.setValueAtTime(0.003, now);
    limiter.release.setValueAtTime(0.25, now);
    limiter.connect(ctx.destination);

    const master = ctx.createGain();
    master.connect(limiter);

    const ui = ctx.createGain();
    const env = ctx.createGain();
    const voice = ctx.createGain();
    ui.connect(master);
    env.connect(master);
    voice.connect(master);

    // Feedback delay tail: send -> delay -> lowpass -> (feedback) ; lowpass -> wet -> ui
    const fxSend = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.setValueAtTime(0.11, now);
    const fxLP = ctx.createBiquadFilter();
    fxLP.type = 'lowpass';
    fxLP.frequency.setValueAtTime(2800, now);
    const feedback = ctx.createGain();
    feedback.gain.setValueAtTime(0.25, now);
    const wet = ctx.createGain();
    wet.gain.setValueAtTime(0.55, now);
    fxSend.connect(delay);
    delay.connect(fxLP);
    fxLP.connect(feedback);
    feedback.connect(delay);
    fxLP.connect(wet);
    wet.connect(ui);

    this.bus = { master, limiter, ui, env, voice, fxSend, fxNodes: [delay, fxLP, feedback, wet] };

    master.gain.setValueAtTime(this.muted ? 0 : this.volumes.master, now);
    ui.gain.setValueAtTime(this.volumes.sfx, now);
    voice.gain.setValueAtTime(this.volumes.sfx, now);
    env.gain.setValueAtTime(this.paused ? 0 : this.volumes.ambient, now);
  }

  /** Smoothly applies current settings to the bus gains. */
  private applyMix(): void {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return;
    try {
      const now = ctx.currentTime;
      bus.master.gain.setTargetAtTime(this.muted ? 0 : this.volumes.master, now, MIX_TC);
      bus.ui.gain.setTargetAtTime(this.volumes.sfx, now, MIX_TC);
      bus.voice.gain.setTargetAtTime(this.volumes.sfx, now, MIX_TC);
      bus.env.gain.setTargetAtTime(this.paused ? 0 : this.volumes.ambient, now, MIX_TC);
    } catch {
      // ignore
    }
  }

  /** Runs a one-shot synthesis callback when audio is available and unmuted. */
  private play(fn: (ctx: AudioContext, bus: Buses) => void): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.bus) return;
    try {
      fn(ctx, this.bus);
    } catch {
      // audio failures are never fatal
    }
  }

  // -------------------------------------------------------------------------
  // Settings / state
  // -------------------------------------------------------------------------

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): string {
    const v = this.volumes;
    return `${this.muted}|${v.master}|${v.sfx}|${v.ambient}|${this.voiceEnabled}`;
  }

  private emit(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        // listener errors must not break audio
      }
    }
  }

  public getMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = !!m;
    writeStorage(KEY_MUTED, String(this.muted));
    if (this.muted) this.cancelSpeech();
    this.applyMix();
    this.emit();
  }

  public getVolumes(): AudioVolumes {
    return { ...this.volumes };
  }

  public setMasterVolume(v: number): void {
    this.volumes.master = clamp01(v);
    writeStorage(KEY_MASTER, String(this.volumes.master));
    this.applyMix();
    this.emit();
  }

  public setSfxVolume(v: number): void {
    this.volumes.sfx = clamp01(v);
    writeStorage(KEY_SFX, String(this.volumes.sfx));
    this.applyMix();
    this.emit();
  }

  public setAmbientVolume(v: number): void {
    this.volumes.ambient = clamp01(v);
    writeStorage(KEY_AMBIENT, String(this.volumes.ambient));
    this.applyMix();
    this.emit();
  }

  public getVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVoiceEnabled(v: boolean): void {
    this.voiceEnabled = !!v;
    writeStorage(KEY_VOICE, String(this.voiceEnabled));
    if (!this.voiceEnabled) this.cancelSpeech();
    this.emit();
  }

  /** Fades the environment bus out/in and pauses/resumes speech. */
  public setPaused(paused: boolean): void {
    this.paused = !!paused;
    const ctx = this.ctx;
    if (ctx && this.bus) {
      try {
        this.bus.env.gain.setTargetAtTime(this.paused ? 0 : this.volumes.ambient, ctx.currentTime, PAUSE_TC);
      } catch {
        // ignore
      }
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (this.paused) window.speechSynthesis.pause();
        else window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }

  /** Backward-compatible alias of `setPaused`. */
  public handleSimulationPause(isPaused: boolean): void {
    this.setPaused(isPaused);
  }

  // -------------------------------------------------------------------------
  // Noise buffers (generated once, cached)
  // -------------------------------------------------------------------------

  private getNoise(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
    const cached = this.noise[kind];
    if (cached) return cached;
    const sr = ctx.sampleRate;
    let buffer: AudioBuffer;

    if (kind === 'white') {
      const len = Math.floor(sr * 2);
      buffer = ctx.createBuffer(1, len, sr);
      const d = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === 'brown') {
      // Integrated (leaky) white noise with a crossfaded seam for seamless looping.
      const len = Math.floor(sr * 4);
      const fade = Math.floor(sr * 0.05);
      const raw = new Float32Array(len + fade);
      let last = 0;
      for (let i = 0; i < raw.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        raw[i] = last;
      }
      buffer = ctx.createBuffer(1, len, sr);
      const d = buffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < len; i++) {
        const v = i < fade ? raw[i] * (i / fade) + raw[len + i] * (1 - i / fade) : raw[i];
        d[i] = v;
        peak = Math.max(peak, Math.abs(v));
      }
      const norm = peak > 0 ? 0.95 / peak : 1;
      for (let i = 0; i < len; i++) d[i] *= norm;
    } else {
      // Sparse decaying impulses — the "crackle" of a large solid/kerolox plume.
      const len = Math.floor(sr * 3);
      buffer = ctx.createBuffer(1, len, sr);
      const d = buffer.getChannelData(0);
      const events = 3 * 160;
      for (let e = 0; e < events; e++) {
        const pos = Math.floor(Math.random() * len);
        const r = Math.random();
        const amp = (0.2 + 0.8 * r * r) * (Math.random() < 0.5 ? -1 : 1);
        const dur = 8 + Math.floor(Math.random() * 140);
        const tau = dur * 0.3;
        for (let j = 0; j < dur; j++) {
          d[(pos + j) % len] += amp * Math.exp(-j / tau) * (Math.random() * 2 - 1);
        }
      }
      let peak = 0;
      for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
      const norm = peak > 0 ? 0.95 / peak : 1;
      for (let i = 0; i < len; i++) d[i] *= norm;
    }

    this.noise[kind] = buffer;
    return buffer;
  }

  // -------------------------------------------------------------------------
  // Synthesis primitives
  // -------------------------------------------------------------------------

  /** Enveloped oscillator one-shot, optionally filtered and sent to the delay tail. */
  private tone(ctx: AudioContext, o: ToneOpts): void {
    const t = ctx.currentTime + (o.at ?? 0);
    const attack = o.attack ?? 0.005;
    const hold = o.hold ?? 0;
    const total = attack + hold + o.decay;

    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + (o.glide ?? total));

    const g = ctx.createGain();
    const end = envelope(g.gain, t, attack, hold, o.decay, o.peak);
    const nodes: AudioNode[] = [osc, g];

    let head: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.setValueAtTime(o.filter.freq, t);
      if (o.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(o.filter.freqEnd, t + total);
      f.Q.setValueAtTime(o.filter.Q ?? 0.7, t);
      osc.connect(f);
      head = f;
      nodes.push(f);
    }
    head.connect(g);
    g.connect(o.dest);

    if (o.send && this.bus) {
      const s = ctx.createGain();
      s.gain.setValueAtTime(o.send, t);
      g.connect(s);
      s.connect(this.bus.fxSend);
      nodes.push(s);
    }

    osc.start(t);
    osc.stop(end + 0.03);
    disposeOnEnd(osc, nodes);
  }

  /** Enveloped, filtered noise one-shot from a cached buffer. */
  private noiseHit(ctx: AudioContext, o: NoiseOpts): void {
    const t = ctx.currentTime + (o.at ?? 0);
    const attack = o.attack ?? 0.002;
    const hold = o.hold ?? 0;
    const total = attack + hold + o.decay;
    const buffer = this.getNoise(ctx, o.kind ?? 'white');

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const g = ctx.createGain();
    const end = envelope(g.gain, t, attack, hold, o.decay, o.peak);
    const nodes: AudioNode[] = [src, g];

    let head: AudioNode = src;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.setValueAtTime(o.filter.freq, t);
      if (o.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(o.filter.freqEnd, t + (o.filter.sweep ?? total));
      f.Q.setValueAtTime(o.filter.Q ?? 0.7, t);
      src.connect(f);
      head = f;
      nodes.push(f);
    }
    head.connect(g);
    g.connect(o.dest);

    src.start(t, Math.random() * Math.max(0, buffer.duration - 0.1));
    src.stop(end + 0.03);
    disposeOnEnd(src, nodes);
  }

  /** Low cinematic boom on the given bus. */
  private impact(ctx: AudioContext, dest: AudioNode, intensity: number, at = 0): void {
    const k = Math.max(0.05, Math.min(1.5, intensity));
    this.tone(ctx, { freq: 90, freqEnd: 32, glide: 0.8, at, attack: 0.006, decay: 1.0, peak: 0.38 * k, dest });
    this.noiseHit(ctx, {
      kind: 'brown',
      at,
      attack: 0.004,
      decay: 0.9,
      peak: 0.32 * k,
      dest,
      filter: { type: 'lowpass', freq: 300, freqEnd: 120, Q: 0.7 },
    });
  }

  /** Quindar-style tone plus squelch, in either order. */
  private radioTone(ctx: AudioContext, dest: AudioNode, freq: number, squelchFirst: boolean): void {
    const squelch = (at: number, len: number) =>
      this.noiseHit(ctx, {
        at,
        attack: 0.006,
        hold: len - 0.02,
        decay: 0.014,
        peak: 0.045,
        dest,
        filter: { type: 'bandpass', freq: 1800, Q: 1.2 },
      });
    const quindar = (at: number) =>
      this.tone(ctx, { freq, at, attack: 0.008, hold: 0.232, decay: 0.01, peak: 0.03, dest });

    if (squelchFirst) {
      squelch(0, 0.1);
      quindar(0.1);
    } else {
      quindar(0);
      squelch(0.25, 0.12);
    }
  }

  // -------------------------------------------------------------------------
  // UI sounds (uiBus)
  // -------------------------------------------------------------------------

  /** Soft tactile tick. */
  public playClick(): void {
    this.play((ctx, bus) => {
      const v = vary();
      this.noiseHit(ctx, {
        attack: 0.001,
        decay: 0.005,
        peak: 0.09,
        dest: bus.ui,
        filter: { type: 'bandpass', freq: 3600 * v, Q: 0.9 },
      });
      this.tone(ctx, { freq: 1800 * v, attack: 0.002, decay: 0.04, peak: 0.035, dest: bus.ui });
    });
  }

  /** Very quiet airy tick, rate-limited to one per 60 ms. */
  public playHover(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastHover < HOVER_INTERVAL_MS) return;
    this.lastHover = now;
    this.play((ctx, bus) => {
      this.noiseHit(ctx, {
        attack: 0.002,
        decay: 0.014,
        peak: 0.018,
        dest: bus.ui,
        filter: { type: 'highpass', freq: 5200 * vary(), Q: 0.6 },
      });
    });
  }

  /** Two-step soft click (low then high), ~90 ms. */
  public playToggle(): void {
    this.play((ctx, bus) => {
      const v = vary();
      [
        { at: 0, f: 900 },
        { at: 0.045, f: 1350 },
      ].forEach(({ at, f }) => {
        this.noiseHit(ctx, {
          at,
          attack: 0.001,
          decay: 0.004,
          peak: 0.06,
          dest: bus.ui,
          filter: { type: 'bandpass', freq: 3000 * v, Q: 1 },
        });
        this.tone(ctx, { freq: f * v, at, attack: 0.002, decay: 0.04, peak: 0.032, dest: bus.ui });
      });
    });
  }

  /** Mission-selection confirm: rising two-tone with a short delay tail. */
  public playSelect(): void {
    this.play((ctx, bus) => {
      const v = vary();
      this.tone(ctx, { type: 'triangle', freq: 523.25 * v, attack: 0.01, decay: 0.3, peak: 0.05, dest: bus.ui, send: 0.5 });
      this.tone(ctx, { freq: 783.99 * v, at: 0.06, attack: 0.012, decay: 0.32, peak: 0.045, dest: bus.ui, send: 0.5 });
    });
  }

  /** System activation: filter-swept saw with sine sub and a relay click. */
  public playSystemOn(): void {
    this.play((ctx, bus) => {
      const v = vary();
      this.tone(ctx, {
        type: 'sawtooth',
        freq: 110 * v,
        attack: 0.06,
        hold: 0.34,
        decay: 0.2,
        peak: 0.04,
        dest: bus.ui,
        filter: { type: 'lowpass', freq: 200, freqEnd: 2400, Q: 3 },
      });
      this.tone(ctx, { freq: 55 * v, attack: 0.08, hold: 0.3, decay: 0.22, peak: 0.07, dest: bus.ui });
      this.noiseHit(ctx, {
        at: 0.58,
        attack: 0.001,
        decay: 0.006,
        peak: 0.08,
        dest: bus.ui,
        filter: { type: 'bandpass', freq: 2200, Q: 1 },
      });
      this.tone(ctx, { freq: 140, at: 0.58, attack: 0.002, decay: 0.03, peak: 0.05, dest: bus.ui });
    });
  }

  /** Plain sine beep (backward compatible). */
  public playBeep(freq = 600, duration = 0.08): void {
    this.play((ctx, bus) => {
      this.tone(ctx, { freq, attack: 0.005, decay: Math.max(0.02, duration), peak: 0.06, dest: bus.ui });
    });
  }

  /** Countdown tick: muted >3, brighter 3..1, deep with tail at 0. */
  public playCountdown(count: number): void {
    this.play((ctx, bus) => {
      if (count > 3) {
        this.tone(ctx, {
          type: 'triangle',
          freq: 880,
          attack: 0.003,
          decay: 0.06,
          peak: 0.045,
          dest: bus.ui,
          filter: { type: 'lowpass', freq: 1800 },
        });
      } else if (count > 0) {
        this.tone(ctx, { freq: 1046.5, attack: 0.003, decay: 0.09, peak: 0.06, dest: bus.ui });
        this.tone(ctx, { freq: 2093, attack: 0.003, decay: 0.05, peak: 0.012, dest: bus.ui });
      } else {
        this.tone(ctx, { freq: 523.25, attack: 0.006, decay: 0.6, peak: 0.08, dest: bus.ui, send: 0.45 });
        this.tone(ctx, { freq: 261.63, attack: 0.01, decay: 0.5, peak: 0.04, dest: bus.ui });
      }
    });
  }

  /** Clean confirmation: E5 then B5 with delay tail. */
  public playMilestone(): void {
    this.play((ctx, bus) => {
      const v = vary();
      this.tone(ctx, { freq: 659.25 * v, attack: 0.015, decay: 0.5, peak: 0.05, dest: bus.ui, send: 0.5 });
      this.tone(ctx, { freq: 987.77 * v, at: 0.07, attack: 0.015, decay: 0.5, peak: 0.045, dest: bus.ui, send: 0.5 });
    });
  }

  /** Shimmering pentatonic arpeggio with delay tail. */
  public playScienceDiscovery(): void {
    this.play((ctx, bus) => {
      const v = vary();
      [1046.5, 1174.66, 1318.51, 1567.98].forEach((f, i) => {
        this.tone(ctx, {
          type: 'triangle',
          freq: f * v,
          at: i * 0.06,
          attack: 0.008,
          decay: 0.35,
          peak: 0.035,
          dest: bus.ui,
          send: 0.6,
        });
      });
    });
  }

  /** Caution: two-tone square through a lowpass, two cycles. */
  public playWarning(): void {
    this.play((ctx, bus) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      [660, 520, 660, 520].forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * 0.14));
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1800, t);
      f.Q.setValueAtTime(0.7, t);
      const g = ctx.createGain();
      const end = envelope(g.gain, t, 0.015, 0.5, 0.06, 0.03);
      osc.connect(f);
      f.connect(g);
      g.connect(bus.ui);
      osc.start(t);
      osc.stop(end + 0.03);
      disposeOnEnd(osc, [osc, f, g]);
    });
  }

  /** Severity-scaled alert. Never loops. */
  public playAlert(severity: AlertSeverity): void {
    if (severity === 'medium') {
      this.playWarning();
      return;
    }
    this.play((ctx, bus) => {
      if (severity === 'low') {
        this.tone(ctx, { freq: 600, attack: 0.02, decay: 0.3, peak: 0.045, dest: bus.ui });
        return;
      }
      // critical: three repeats of a low two-tone klaxon (~1.2 s)
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      for (let r = 0; r < 3; r++) {
        osc.frequency.setValueAtTime(440, t + r * 0.4);
        osc.frequency.setValueAtTime(349.23, t + r * 0.4 + 0.18);
      }
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(900, t);
      bp.Q.setValueAtTime(1.4, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(MIN_GAIN, t);
      for (let r = 0; r < 3; r++) {
        const s = t + r * 0.4;
        g.gain.exponentialRampToValueAtTime(0.07, s + 0.02);
        g.gain.setValueAtTime(0.07, s + 0.34);
        g.gain.exponentialRampToValueAtTime(MIN_GAIN, s + 0.39);
      }
      osc.connect(bp);
      bp.connect(g);
      g.connect(bus.ui);
      osc.start(t);
      osc.stop(t + 1.25);
      disposeOnEnd(osc, [osc, bp, g]);
    });
  }

  /** Warm major-chord swell with a low impact underneath. */
  public playSuccess(): void {
    this.play((ctx, bus) => {
      const chord = [261.63, 329.63, 392.0, 523.25];
      chord.forEach((f, i) => {
        this.tone(ctx, { freq: f, attack: 0.25, decay: 2.5, peak: 0.035, dest: bus.ui, send: 0.3 });
        this.tone(ctx, {
          type: 'triangle',
          freq: f * (i % 2 ? 1.004 : 0.996),
          attack: 0.25,
          decay: 2.3,
          peak: 0.02,
          dest: bus.ui,
          filter: { type: 'lowpass', freq: 2200 },
        });
      });
      this.tone(ctx, { freq: 130.81, attack: 0.3, decay: 2.4, peak: 0.04, dest: bus.ui });
      this.impact(ctx, bus.ui, 0.45);
    });
  }

  /** Dark descending minor sequence over a low drone (~2 s). */
  public playFailure(): void {
    this.play((ctx, bus) => {
      [329.63, 261.63, 220.0].forEach((f, i) => {
        this.tone(ctx, {
          type: 'triangle',
          freq: f,
          at: i * 0.35,
          attack: 0.03,
          decay: 0.9,
          peak: 0.05,
          dest: bus.ui,
          filter: { type: 'lowpass', freq: 900 },
        });
      });
      this.tone(ctx, { freq: 55, attack: 0.3, hold: 1.0, decay: 0.7, peak: 0.08, dest: bus.ui });
      this.tone(ctx, {
        type: 'sawtooth',
        freq: 55.3,
        attack: 0.3,
        hold: 1.0,
        decay: 0.7,
        peak: 0.03,
        dest: bus.ui,
        filter: { type: 'lowpass', freq: 220 },
      });
    });
  }

  /** Low-frequency cinematic boom (envBus). */
  public playImpact(intensity = 1): void {
    this.play((ctx, bus) => this.impact(ctx, bus.env, intensity));
  }

  // -------------------------------------------------------------------------
  // Radio / comms (envBus)
  // -------------------------------------------------------------------------

  /** Quindar intro tone (2525 Hz) followed by a squelch burst. */
  public playRadioIn(): void {
    this.play((ctx, bus) => this.radioTone(ctx, bus.env, 2525, false));
  }

  /** Squelch burst followed by the Quindar outro tone (2475 Hz). */
  public playRadioOut(): void {
    this.play((ctx, bus) => this.radioTone(ctx, bus.env, 2475, true));
  }

  /** Short data-burst chirp: a few rapid FM blips. */
  public playCommSignal(): void {
    this.play((ctx, bus) => {
      const count = 3 + Math.round(Math.random());
      for (let i = 0; i < count; i++) {
        const f = 1200 + Math.random() * 600;
        this.tone(ctx, {
          type: 'square',
          freq: f,
          freqEnd: f * 1.25,
          at: i * 0.055,
          attack: 0.003,
          hold: 0.02,
          decay: 0.02,
          peak: 0.018,
          dest: bus.env,
          filter: { type: 'bandpass', freq: 1600, Q: 2 },
        });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Voice callouts (speechSynthesis)
  // -------------------------------------------------------------------------

  private pickVoice(): SpeechSynthesisVoice | null {
    if (this.cachedVoice !== undefined) return this.cachedVoice;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      const norm = (l: string) => l.replace('_', '-').toLowerCase();
      this.cachedVoice =
        voices.find((v) => norm(v.lang) === 'en-us') ?? voices.find((v) => norm(v.lang).startsWith('en')) ?? null;
      return this.cachedVoice;
    } catch {
      return null;
    }
  }

  /** Speaks a callout, optionally wrapped in Quindar tones. Never throws. */
  public say(text: string, opts: SayOptions = {}): void {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (!this.voiceEnabled || this.muted || !text) return;
      const synth = window.speechSynthesis;
      if (opts.interrupt) synth.cancel();

      const u = new SpeechSynthesisUtterance(text);
      const voice = this.pickVoice();
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = 'en-US';
      }
      u.rate = opts.rate ?? 1.05;
      u.pitch = opts.pitch ?? 0.9;
      u.volume = clamp01(this.volumes.master * this.volumes.sfx);

      if (opts.radio !== false) {
        u.onstart = () => this.play((ctx, bus) => this.radioTone(ctx, bus.voice, 2525, false));
        u.onend = () => this.play((ctx, bus) => this.radioTone(ctx, bus.voice, 2475, true));
      }
      synth.speak(u);
    } catch {
      // speech unsupported
    }
  }

  public cancelSpeech(): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  // -------------------------------------------------------------------------
  // Launch engine (envBus)
  // -------------------------------------------------------------------------

  /** Builds the continuous launch graph (idempotent). Engine layers start silent. */
  public startLaunchAudio(): void {
    this.wantLaunch = true;
    if (this.launch) return;
    const ctx = this.ensure();
    if (!ctx || !this.bus) return;

    try {
      const now = ctx.currentTime;
      const sources: AudioScheduledSourceNode[] = [];
      const nodes: AudioNode[] = [];
      const mk = <T extends AudioNode>(n: T): T => {
        nodes.push(n);
        return n;
      };
      const loop = (kind: NoiseKind): AudioBufferSourceNode => {
        const s = mk(ctx.createBufferSource());
        s.buffer = this.getNoise(ctx, kind);
        s.loop = true;
        sources.push(s);
        return s;
      };
      const osc = (type: OscillatorType, f: number): OscillatorNode => {
        const o = mk(ctx.createOscillator());
        o.type = type;
        o.frequency.setValueAtTime(f, now);
        sources.push(o);
        return o;
      };
      const gain = (v: number): GainNode => {
        const g = mk(ctx.createGain());
        g.gain.setValueAtTime(v, now);
        return g;
      };
      const filter = (type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode => {
        const b = mk(ctx.createBiquadFilter());
        b.type = type;
        b.frequency.setValueAtTime(f, now);
        b.Q.setValueAtTime(q, now);
        return b;
      };

      const out = gain(MIN_GAIN);
      out.gain.setTargetAtTime(1, now, 0.15);
      out.connect(this.bus.env);

      // Pad ambience: low hum + cryo venting hiss with slow random wobble.
      const humGain = gain(0.022);
      osc('sine', 55).connect(humGain);
      const hum2 = gain(0.5);
      osc('sine', 110).connect(hum2);
      hum2.connect(humGain);
      humGain.connect(out);

      const ventHP = filter('highpass', 3200);
      const ventGain = gain(0.012);
      loop('white').connect(ventHP);
      ventHP.connect(ventGain);
      ventGain.connect(out);
      const lfoA = gain(0.006);
      const lfoB = gain(0.004);
      osc('sine', 0.17).connect(lfoA);
      osc('sine', 0.41).connect(lfoB);
      lfoA.connect(ventGain.gain);
      lfoB.connect(ventGain.gain);

      // Engine rumble: brown noise -> lowpass.
      const rumbleSrc = loop('brown');
      const rumbleLP = filter('lowpass', 140);
      const rumbleGain = gain(0);
      rumbleSrc.connect(rumbleLP);
      rumbleLP.connect(rumbleGain);
      rumbleGain.connect(out);

      // Crackle: sparse impulses -> highpass.
      const crackleHP = filter('highpass', 1500);
      const crackleGain = gain(0);
      loop('crackle').connect(crackleHP);
      crackleHP.connect(crackleGain);
      crackleGain.connect(out);

      // Sub-bass sine.
      const subOsc = osc('sine', 40);
      const subGain = gain(0);
      subOsc.connect(subGain);
      subGain.connect(out);

      // Aero / wind: bandpassed white noise.
      const aeroBP = filter('bandpass', 700, 1.2);
      const aeroGain = gain(0);
      loop('white').connect(aeroBP);
      aeroBP.connect(aeroGain);
      aeroGain.connect(out);

      for (const s of sources) {
        if (s instanceof AudioBufferSourceNode && s.buffer) {
          s.start(now, Math.random() * s.buffer.duration);
        } else {
          s.start(now);
        }
      }

      this.launch = { out, sources, nodes, rumbleSrc, rumbleLP, rumbleGain, crackleGain, subOsc, subGain, aeroBP, aeroGain };
      this.lastLaunchState = null;
    } catch {
      this.launch = null;
    }
  }

  /** Drives the engine layers. Cheap: parameter targets only, skipped when unchanged. */
  public setLaunchState(s: LaunchState): void {
    const g = this.launch;
    const ctx = this.ctx;
    if (!g || !ctx) return;

    const prev = this.lastLaunchState;
    if (
      prev &&
      prev.stage === s.stage &&
      prev.running === s.running &&
      Math.abs(prev.throttle - s.throttle) < 0.01 &&
      Math.abs(prev.atmosphere - s.atmosphere) < 0.01 &&
      Math.abs(prev.q - s.q) < 0.01
    ) {
      return;
    }
    this.lastLaunchState = { ...s };

    try {
      const now = ctx.currentTime;
      if (!s.running) {
        g.rumbleGain.gain.setTargetAtTime(0, now, PAUSE_TC);
        g.crackleGain.gain.setTargetAtTime(0, now, PAUSE_TC);
        g.subGain.gain.setTargetAtTime(0, now, PAUSE_TC);
        g.aeroGain.gain.setTargetAtTime(0, now, PAUSE_TC);
        return;
      }

      const thr = clamp01(s.throttle);
      const atm = clamp01(s.atmosphere);
      const q = clamp01(s.q);
      const upper = s.stage === 2;
      // In vacuum only structure-borne rumble remains (~25 % of the in-air level).
      const air = 0.25 + 0.75 * atm;

      const rumble = thr * (upper ? 0.2 : 0.42) * air;
      const cutoff = (upper ? 320 : 120) + (upper ? 300 : 780) * atm * (0.5 + 0.5 * thr);
      const crackle = thr * atm * (upper ? 0.015 : 0.2) * (0.6 + 0.4 * thr);
      const sub = thr * (upper ? 0.1 : 0.28) * (0.4 + 0.6 * atm);
      const subFreq = upper ? 45 : 38 + 4 * thr;
      const aero = q * 0.18;
      const aeroFreq = 700 + 900 * q;

      g.rumbleGain.gain.setTargetAtTime(rumble, now, 0.12);
      g.rumbleLP.frequency.setTargetAtTime(cutoff, now, 0.2);
      g.rumbleSrc.playbackRate.setTargetAtTime(upper ? 1.5 : 1, now, 0.25);
      g.crackleGain.gain.setTargetAtTime(crackle, now, 0.1);
      g.subGain.gain.setTargetAtTime(sub, now, 0.15);
      g.subOsc.frequency.setTargetAtTime(subFreq, now, 0.25);
      g.aeroGain.gain.setTargetAtTime(aero, now, 0.15);
      g.aeroBP.frequency.setTargetAtTime(aeroFreq, now, 0.2);
    } catch {
      // ignore
    }
  }

  /** Engine start: rising roar, a few pops and a medium impact. */
  public playIgnition(): void {
    this.play((ctx, bus) => {
      this.noiseHit(ctx, {
        kind: 'brown',
        attack: 0.4,
        hold: 0.8,
        decay: 0.5,
        peak: 0.35,
        dest: bus.env,
        filter: { type: 'lowpass', freq: 120, freqEnd: 900, Q: 0.8, sweep: 1.2 },
      });
      for (let i = 0; i < 4; i++) {
        this.noiseHit(ctx, {
          at: 0.05 + Math.random() * 0.55,
          attack: 0.001,
          decay: 0.04,
          peak: 0.12 + Math.random() * 0.08,
          dest: bus.env,
          filter: { type: 'bandpass', freq: 500 + Math.random() * 400, Q: 1.2 },
        });
      }
      this.impact(ctx, bus.env, 0.6);
    });
  }

  /** Backward-compatible alias of `playIgnition`. */
  public triggerIgnitionAudio(): void {
    this.playIgnition();
  }

  /** Liftoff: big impact plus metallic hold-down release clang. */
  public playLiftoff(): void {
    this.play((ctx, bus) => {
      this.impact(ctx, bus.env, 1);
      [
        { f: 230, p: 0.05, d: 0.55 },
        { f: 417, p: 0.035, d: 0.4 },
        { f: 631, p: 0.025, d: 0.28 },
      ].forEach(({ f, p, d }) => this.tone(ctx, { freq: f * vary(), attack: 0.002, decay: d, peak: p, dest: bus.env }));
      this.noiseHit(ctx, {
        attack: 0.001,
        decay: 0.02,
        peak: 0.08,
        dest: bus.env,
        filter: { type: 'highpass', freq: 2000 },
      });
    });
  }

  /** Pyrotechnic separation thump followed by two cold-gas thruster puffs. */
  public playStageSeparation(): void {
    this.play((ctx, bus) => {
      this.tone(ctx, { freq: 160, freqEnd: 50, glide: 0.2, attack: 0.003, decay: 0.22, peak: 0.3, dest: bus.env });
      this.noiseHit(ctx, {
        attack: 0.001,
        decay: 0.02,
        peak: 0.18,
        dest: bus.env,
        filter: { type: 'highpass', freq: 2000 },
      });
      [0.3, 0.7].forEach((at) =>
        this.noiseHit(ctx, {
          at,
          attack: 0.02,
          hold: 0.2,
          decay: 0.08,
          peak: 0.05,
          dest: bus.env,
          filter: { type: 'highpass', freq: 1500 },
        }),
      );
    });
  }

  /** Lighter double pop with a metallic rattle. */
  public playFairingSeparation(): void {
    this.play((ctx, bus) => {
      [0, 0.12].forEach((at) => {
        this.tone(ctx, { freq: 220, freqEnd: 80, glide: 0.08, at, attack: 0.002, decay: 0.1, peak: 0.14, dest: bus.env });
        this.noiseHit(ctx, {
          at,
          attack: 0.001,
          decay: 0.015,
          peak: 0.1,
          dest: bus.env,
          filter: { type: 'bandpass', freq: 2500, Q: 0.8 },
        });
      });
      for (let i = 0; i < 6; i++) {
        this.tone(ctx, {
          freq: 1800 + Math.random() * 1400,
          at: 0.2 + i * 0.06 + Math.random() * 0.02,
          attack: 0.001,
          decay: 0.03,
          peak: 0.015,
          dest: bus.env,
        });
      }
    });
  }

  /** Engine shutdown "whoomp": noise with a downward lowpass sweep. */
  public playEngineCutoff(): void {
    this.play((ctx, bus) => {
      this.noiseHit(ctx, {
        kind: 'brown',
        attack: 0.01,
        decay: 0.6,
        peak: 0.28,
        dest: bus.env,
        filter: { type: 'lowpass', freq: 800, freqEnd: 60, Q: 1, sweep: 0.5 },
      });
    });
  }

  /** Fades out and fully disposes the launch graph (idempotent). */
  public stopLaunchAudio(fade = 0.5): void {
    this.wantLaunch = false;
    this.lastLaunchState = null;
    const g = this.launch;
    if (!g) return;
    this.launch = null;
    this.fadeAndDispose(g, fade);
  }

  /** Backward-compatible phase-based wrapper around `setLaunchState`. */
  public updateLaunchAudio(altitudeKm: number, velocityKmh: number, phase: string): void {
    void velocityKmh;
    const atm = Math.exp(-Math.max(0, altitudeKm) / 40);
    const st = (throttle: number, q: number, stage: 1 | 2 = 1, running = true, atmosphere = atm) =>
      this.setLaunchState({ throttle, atmosphere, q, stage, running });

    switch (phase) {
      case 'ENGINE_START':
        st(0.35, 0, 1, true, 1);
        break;
      case 'IGNITION':
        st(0.8, 0, 1, true, 1);
        break;
      case 'LIFTOFF':
      case 'PAD_CLEARANCE':
        st(1, 0.15);
        break;
      case 'ASCENT':
        st(1, 0.6);
        break;
      case 'MAX_Q':
        st(0.85, 1);
        break;
      case 'HIGH_ALTITUDE':
        st(1, 0.25);
        break;
      case 'STAGE_SEPARATION':
        st(0, 0, 1, false);
        break;
      case 'UPPER_STAGE':
      case 'STAGING':
        st(1, 0.03, 2);
        break;
      case 'ORBIT_INSERTION':
        st(0.6, 0, 2);
        break;
      case 'ORBIT_ACHIEVED':
        st(0, 0, 2, false);
        break;
      default:
        if (altitudeKm >= 195) st(0, 0, 2, false);
    }
  }

  /** Calm resolved chord, then the milestone confirmation. */
  public playOrbitAchievedSound(): void {
    this.play((ctx, bus) => {
      [293.66, 369.99, 440.0, 587.33].forEach((f, i) => {
        this.tone(ctx, { freq: f, at: i * 0.03, attack: 0.12, decay: 1.6, peak: 0.03, dest: bus.ui, send: 0.3 });
      });
    });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => this.playMilestone(), 450);
    }
  }

  // -------------------------------------------------------------------------
  // Orbit / mission-control ambience (envBus)
  // -------------------------------------------------------------------------

  /** Subtle control-room tone: brown-noise bed + slowly moving detuned drone (idempotent). */
  public startOrbitAmbience(): void {
    this.wantOrbit = true;
    if (this.orbit) return;
    const ctx = this.ensure();
    if (!ctx || !this.bus) return;

    try {
      const now = ctx.currentTime;
      const sources: AudioScheduledSourceNode[] = [];
      const nodes: AudioNode[] = [];

      const out = ctx.createGain();
      out.gain.setValueAtTime(MIN_GAIN, now);
      out.gain.setTargetAtTime(1, now, 0.6);
      out.connect(this.bus.env);
      nodes.push(out);

      // Noise bed
      const bed = ctx.createBufferSource();
      bed.buffer = this.getNoise(ctx, 'brown');
      bed.loop = true;
      const bedLP = ctx.createBiquadFilter();
      bedLP.type = 'lowpass';
      bedLP.frequency.setValueAtTime(600, now);
      const bedGain = ctx.createGain();
      bedGain.gain.setValueAtTime(0.025, now);
      bed.connect(bedLP);
      bedLP.connect(bedGain);
      bedGain.connect(out);
      sources.push(bed);
      nodes.push(bed, bedLP, bedGain);

      // Drone: A2 + slightly detuned E3
      const droneLP = ctx.createBiquadFilter();
      droneLP.type = 'lowpass';
      droneLP.frequency.setValueAtTime(400, now);
      droneLP.Q.setValueAtTime(0.8, now);
      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.012, now);
      droneLP.connect(droneGain);
      droneGain.connect(out);
      nodes.push(droneLP, droneGain);
      [
        { f: 110, type: 'triangle' as OscillatorType },
        { f: 164.81 * 1.003, type: 'sine' as OscillatorType },
      ].forEach(({ f, type }) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f, now);
        o.connect(droneLP);
        sources.push(o);
        nodes.push(o);
      });

      // Slow LFO on the drone filter for movement
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.07, now);
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(120, now);
      lfo.connect(lfoDepth);
      lfoDepth.connect(droneLP.frequency);
      sources.push(lfo);
      nodes.push(lfo, lfoDepth);

      bed.start(now, Math.random() * (bed.buffer ? bed.buffer.duration : 0));
      for (const s of sources) if (s !== bed) s.start(now);

      this.orbit = { out, sources, nodes };
    } catch {
      this.orbit = null;
    }
  }

  /** Fades the ambience out over 0.6 s and disposes it. */
  public stopOrbitAmbience(): void {
    this.wantOrbit = false;
    const g = this.orbit;
    if (!g) return;
    this.orbit = null;
    this.fadeAndDispose(g, 0.6);
  }

  /** Fades a continuous graph to silence, then stops and disconnects everything. */
  private fadeAndDispose(g: Graph, fade: number): void {
    const f = Math.max(0.02, fade);
    const dispose = () => {
      for (const s of g.sources) {
        try {
          s.stop();
        } catch {
          // already stopped
        }
      }
      for (const n of g.nodes) {
        try {
          n.disconnect();
        } catch {
          // already disconnected
        }
      }
    };
    const ctx = this.ctx;
    if (!ctx || typeof window === 'undefined') {
      dispose();
      return;
    }
    try {
      const now = ctx.currentTime;
      g.out.gain.cancelScheduledValues(now);
      g.out.gain.setValueAtTime(Math.max(g.out.gain.value, MIN_GAIN), now);
      g.out.gain.setTargetAtTime(0, now, f / 4);
    } catch {
      // ignore
    }
    window.setTimeout(dispose, f * 1000 + 100);
  }
}

export const sounds = new SoundEngine();
