interface AudioVolumes {
  master: number;
  sfx: number;
  ambient: number;
}

interface LaunchAudioNodes {
  // Pre-launch / systems hum
  humOsc1: OscillatorNode;
  humOsc2: OscillatorNode;
  humFilter: BiquadFilterNode;
  humGain: GainNode;
  
  // Engine core rumble (noise buffer + sub oscillator)
  noiseSource: AudioBufferSourceNode;
  engineFilter: BiquadFilterNode;
  engineGain: GainNode;
  subOsc: OscillatorNode;
  subGain: GainNode;

  // Aerodynamic atmospheric shear (bandpass noise)
  aeroSource: AudioBufferSourceNode;
  aeroFilter: BiquadFilterNode;
  aeroGain: GainNode;

  // Master launch mixer gain
  masterLaunchGain: GainNode;
  telemetryTimerId?: number;
}

interface OrbitAmbienceNodes {
  droneOsc1: OscillatorNode;
  droneOsc2: OscillatorNode;
  droneFilter: BiquadFilterNode;
  droneGain: GainNode;
  telemetryTimerId?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volumes: AudioVolumes = {
    master: 0.8,
    sfx: 0.8,
    ambient: 0.5
  };
  private launchNodes: LaunchAudioNodes | null = null;
  private orbitNodes: OrbitAmbienceNodes | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('beyond_earth_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }

      const savedMaster = localStorage.getItem('beyond_earth_master_vol');
      if (savedMaster !== null) this.volumes.master = Math.max(0, Math.min(1, Number(savedMaster)));

      const savedSfx = localStorage.getItem('beyond_earth_sfx_vol');
      if (savedSfx !== null) this.volumes.sfx = Math.max(0, Math.min(1, Number(savedSfx)));

      const savedAmb = localStorage.getItem('beyond_earth_ambient_vol');
      if (savedAmb !== null) this.volumes.ambient = Math.max(0, Math.min(1, Number(savedAmb)));
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          // Web Audio not supported
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyond_earth_muted', String(this.isMuted));
    }
    if (this.isMuted) {
      this.stopLaunchAudio(0.1);
      this.stopOrbitAmbience();
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyond_earth_muted', String(muted));
    }
    if (this.isMuted) {
      this.stopLaunchAudio(0.1);
      this.stopOrbitAmbience();
    }
  }

  public getVolumes(): AudioVolumes {
    return { ...this.volumes };
  }

  public setMasterVolume(vol: number) {
    this.volumes.master = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyond_earth_master_vol', String(this.volumes.master));
    }
    this.applyVolumeUpdate();
  }

  public setSfxVolume(vol: number) {
    this.volumes.sfx = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyond_earth_sfx_vol', String(this.volumes.sfx));
    }
    this.applyVolumeUpdate();
  }

  public setAmbientVolume(vol: number) {
    this.volumes.ambient = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyond_earth_ambient_vol', String(this.volumes.ambient));
    }
    this.applyVolumeUpdate();
  }

  private applyVolumeUpdate() {
    if (!this.ctx) return;
    const effectiveSfx = this.volumes.master * this.volumes.sfx;
    const effectiveAmb = this.volumes.master * this.volumes.ambient;

    if (this.launchNodes) {
      try {
        const now = this.ctx.currentTime;
        this.launchNodes.masterLaunchGain.gain.setTargetAtTime(this.isMuted ? 0 : effectiveSfx, now, 0.05);
        this.launchNodes.humGain.gain.setTargetAtTime(this.isMuted ? 0 : effectiveAmb * 0.15, now, 0.05);
      } catch {
        // ignore
      }
    }

    if (this.orbitNodes) {
      try {
        const now = this.ctx.currentTime;
        this.orbitNodes.droneGain.gain.setTargetAtTime(this.isMuted ? 0 : effectiveAmb * 0.18, now, 0.05);
      } catch {
        // ignore
      }
    }
  }

  private getEffectiveSfxVolume(): number {
    return this.isMuted ? 0 : this.volumes.master * this.volumes.sfx;
  }

  private getEffectiveAmbientVolume(): number {
    return this.isMuted ? 0 : this.volumes.master * this.volumes.ambient;
  }

  // --- UI SOUNDS ---

  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);

      gain.gain.setValueAtTime(0.12 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio playback fails silently if restricted
    }
  }

  public playHover() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(1300, now + 0.02);

      gain.gain.setValueAtTime(0.04 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.025);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Audio playback fails silently if restricted
    }
  }

  public playToggle() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.15 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // ignore
    }
  }

  public playBeep(freq = 600, duration = 0.08) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // ignore
    }
  }

  public playCountdown(count: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (count > 3) {
      this.playBeep(700, 0.09);
    } else if (count > 0) {
      // Final 3 seconds: higher pitch, urgent
      this.playBeep(920, 0.14);
    } else {
      // Ignition GO tone
      this.playBeep(1350, 0.35);
    }
  }

  public playWarning() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.setValueAtTime(320, now + 0.12);
      osc.frequency.setValueAtTime(450, now + 0.24);

      gain.gain.setValueAtTime(0.18 * this.getEffectiveSfxVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // ignore
    }
  }

  public playScienceDiscovery() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12 * this.getEffectiveSfxVolume(), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.26);
      });
    } catch {
      // ignore
    }
  }

  public playSuccess() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      // Triumphant chord progression
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2 * this.getEffectiveSfxVolume(), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.85);
      });
    } catch {
      // ignore
    }
  }

  public playFailure() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const notes = [440, 415.3, 392, 349.23];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.18;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.15 * this.getEffectiveSfxVolume(), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch {
      // ignore
    }
  }

  // --- MULTI-LAYER LAUNCH & ASCENT AUDIO SYSTEM ---

  /**
   * Generates a 4-second looping white noise buffer for continuous procedural engines.
   */
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    } catch {
      return null;
    }
  }

  /**
   * Initializes the launch audio layers:
   * 1. Spacecraft pre-launch electronics & cryogenic systems hum
   * 2. Engine core combustion noise + sub-bass resonance
   * 3. Atmospheric shear & aerodynamic roar layer
   */
  public startLaunchAudio() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // If already running, clean up first
    if (this.launchNodes) {
      this.stopLaunchAudio(0.05);
    }

    try {
      const now = this.ctx.currentTime;
      const sfxVol = this.getEffectiveSfxVolume();
      const ambVol = this.getEffectiveAmbientVolume();

      // Master launch gain node
      const masterLaunchGain = this.ctx.createGain();
      masterLaunchGain.gain.setValueAtTime(sfxVol, now);
      masterLaunchGain.connect(this.ctx.destination);

      // --- Layer 1: Systems Hum (Dual sine 58Hz & 62Hz) ---
      const humOsc1 = this.ctx.createOscillator();
      const humOsc2 = this.ctx.createOscillator();
      const humFilter = this.ctx.createBiquadFilter();
      const humGain = this.ctx.createGain();

      humOsc1.type = 'sine';
      humOsc1.frequency.setValueAtTime(58, now);
      humOsc2.type = 'sine';
      humOsc2.frequency.setValueAtTime(62, now);

      humFilter.type = 'lowpass';
      humFilter.frequency.setValueAtTime(140, now);

      // Pre-launch hum volume (subtle)
      humGain.gain.setValueAtTime(0.08 * ambVol, now);

      humOsc1.connect(humFilter);
      humOsc2.connect(humFilter);
      humFilter.connect(humGain);
      humGain.connect(masterLaunchGain);

      humOsc1.start(now);
      humOsc2.start(now);

      // --- Layer 2: Main Engine Rumble (Filtered noise + sub-oscillator) ---
      const noiseBuffer = this.createNoiseBuffer();
      if (!noiseBuffer) return;

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.setValueAtTime(180, now);
      engineFilter.Q.setValueAtTime(3.5, now);

      const engineGain = this.ctx.createGain();
      // Starts silent during countdown, ramps up at ignition
      engineGain.gain.setValueAtTime(0.0001, now);

      const subOsc = this.ctx.createOscillator();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(50, now);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.0001, now);

      noiseSource.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(masterLaunchGain);

      subOsc.connect(subGain);
      subGain.connect(masterLaunchGain);

      noiseSource.start(now);
      subOsc.start(now);

      // --- Layer 3: Aerodynamic Airflow / Max-Q Shear (Bandpass noise) ---
      const aeroSource = this.ctx.createBufferSource();
      aeroSource.buffer = noiseBuffer;
      aeroSource.loop = true;

      const aeroFilter = this.ctx.createBiquadFilter();
      aeroFilter.type = 'bandpass';
      aeroFilter.frequency.setValueAtTime(950, now);
      aeroFilter.Q.setValueAtTime(1.8, now);

      const aeroGain = this.ctx.createGain();
      aeroGain.gain.setValueAtTime(0.0001, now);

      aeroSource.connect(aeroFilter);
      aeroFilter.connect(aeroGain);
      aeroGain.connect(masterLaunchGain);

      aeroSource.start(now);

      // Soft telemetry periodic pings
      const telemetryTimerId = window.setInterval(() => {
        if (!this.launchNodes || this.isMuted) return;
        this.playBeep(1400 + Math.random() * 300, 0.04);
      }, 3500);

      this.launchNodes = {
        humOsc1,
        humOsc2,
        humFilter,
        humGain,
        noiseSource,
        engineFilter,
        engineGain,
        subOsc,
        subGain,
        aeroSource,
        aeroFilter,
        aeroGain,
        masterLaunchGain,
        telemetryTimerId
      };
    } catch {
      // Audio fails gracefully
    }
  }

  /**
   * Triggers ignition burst and begins mechanical engine roar
   */
  public triggerIgnitionAudio() {
    if (!this.launchNodes || !this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Mechanical ignition burst
      this.playBeep(320, 0.18);

      // Ramp engine rumble from 0.0001 to ignition power
      this.launchNodes.engineGain.gain.cancelScheduledValues(now);
      this.launchNodes.engineGain.gain.setValueAtTime(0.01, now);
      this.launchNodes.engineGain.gain.exponentialRampToValueAtTime(0.28, now + 0.6);

      this.launchNodes.subGain.gain.cancelScheduledValues(now);
      this.launchNodes.subGain.gain.setValueAtTime(0.01, now);
      this.launchNodes.subGain.gain.exponentialRampToValueAtTime(0.20, now + 0.6);

      // Low rumble filter frequency expands
      this.launchNodes.engineFilter.frequency.cancelScheduledValues(now);
      this.launchNodes.engineFilter.frequency.setValueAtTime(160, now);
      this.launchNodes.engineFilter.frequency.exponentialRampToValueAtTime(320, now + 0.8);
    } catch {
      // ignore
    }
  }

  /**
   * Updates audio filters and gains dynamically according to altitude and ascent velocity:
   * - 0 km: Heavy low-frequency engine rumble
   * - 10-35 km (Max-Q): Aerodynamic shear peaks
   * - 50 km: Thinner atmosphere, lower shear, higher resonance
   * - 80-120 km: Vacuum transition; engine rumble transitions to clean upper-stage burn
   * - 150-200 km: Main Engine Cut-Off (MECO); engine fades to silent space
   */
  public updateLaunchAudio(altitudeKm: number, velocityKmh: number, phase: string) {
    if (!this.launchNodes || !this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const nodes = this.launchNodes;

      if (phase === 'ENGINE_START') {
        nodes.engineFilter.frequency.setTargetAtTime(180, now, 0.15);
        nodes.engineGain.gain.setTargetAtTime(0.12, now, 0.15);
        nodes.subGain.gain.setTargetAtTime(0.08, now, 0.15);
        nodes.aeroGain.gain.setTargetAtTime(0.0001, now, 0.1);
      } else if (phase === 'IGNITION') {
        nodes.engineFilter.frequency.setTargetAtTime(280, now, 0.1);
        nodes.engineGain.gain.setTargetAtTime(0.28, now, 0.1);
        nodes.subGain.gain.setTargetAtTime(0.24, now, 0.1);
        nodes.aeroGain.gain.setTargetAtTime(0.0001, now, 0.1);
      } else if (phase === 'LIFTOFF' || phase === 'PAD_CLEARANCE') {
        // Deep full roar
        nodes.engineFilter.frequency.setTargetAtTime(450, now, 0.2);
        nodes.engineGain.gain.setTargetAtTime(0.38, now, 0.2);
        nodes.subGain.gain.setTargetAtTime(0.26, now, 0.2);
        nodes.subOsc.frequency.setTargetAtTime(58, now, 0.2);
        // Slight aerodynamic shear starts
        nodes.aeroGain.gain.setTargetAtTime(0.08, now, 0.3);
      } else if (phase === 'ASCENT') {
        nodes.engineFilter.frequency.setTargetAtTime(520, now, 0.2);
        nodes.engineGain.gain.setTargetAtTime(0.40, now, 0.2);
        nodes.aeroGain.gain.setTargetAtTime(0.16, now, 0.25);
      } else if (phase === 'MAX_Q') {
        // Maximum aerodynamic shear & buffeting
        nodes.engineFilter.frequency.setTargetAtTime(580, now, 0.2);
        nodes.engineGain.gain.setTargetAtTime(0.42, now, 0.2);
        nodes.aeroFilter.frequency.setTargetAtTime(1400, now, 0.2);
        nodes.aeroGain.gain.setTargetAtTime(0.26, now, 0.2); // peak air rush
        nodes.subOsc.frequency.setTargetAtTime(64, now, 0.2);
      } else if (phase === 'HIGH_ALTITUDE') {
        // Thinner atmosphere
        nodes.aeroGain.gain.setTargetAtTime(0.06, now, 0.3);
        nodes.engineFilter.frequency.setTargetAtTime(460, now, 0.2);
      } else if (phase === 'STAGE_SEPARATION') {
        // MECO engine cutoff
        nodes.engineGain.gain.setTargetAtTime(0.04, now, 0.08);
        nodes.subGain.gain.setTargetAtTime(0.02, now, 0.08);
        nodes.aeroGain.gain.setTargetAtTime(0.0001, now, 0.1);
      } else if (phase === 'UPPER_STAGE' || phase === 'STAGING') {
        // Staging: vacuum upper stage burn is higher-frequency and cleaner
        nodes.aeroGain.gain.setTargetAtTime(0.0001, now, 0.2);
        nodes.engineFilter.frequency.setTargetAtTime(340, now, 0.2);
        nodes.engineGain.gain.setTargetAtTime(0.22, now, 0.2);
        nodes.subGain.gain.setTargetAtTime(0.10, now, 0.2);
      } else if (phase === 'ORBIT_INSERTION') {
        // Space vacuum: 0 atmospheric shear
        nodes.aeroGain.gain.setTargetAtTime(0.0001, now, 0.2);
        // Upper stage final orbital circularization burn
        nodes.engineGain.gain.setTargetAtTime(0.12, now, 0.3);
        nodes.subGain.gain.setTargetAtTime(0.04, now, 0.3);
      } else if (phase === 'ORBIT_ACHIEVED' || altitudeKm >= 195) {
        // Engine cuts off completely (SECO)
        nodes.engineGain.gain.setTargetAtTime(0.0001, now, 0.5);
        nodes.subGain.gain.setTargetAtTime(0.0001, now, 0.5);
        nodes.aeroGain.gain.setTargetAtTime(0.0001, now, 0.2);
        nodes.humGain.gain.setTargetAtTime(0.0001, now, 0.5);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Smoothly stops all launch audio and completely disposes nodes
   */
  public stopLaunchAudio(fadeDuration = 0.5) {
    if (!this.launchNodes) return;
    const nodes = this.launchNodes;
    this.launchNodes = null;

    if (nodes.telemetryTimerId) {
      clearInterval(nodes.telemetryTimerId);
    }

    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      nodes.masterLaunchGain.gain.cancelScheduledValues(now);
      nodes.masterLaunchGain.gain.setValueAtTime(nodes.masterLaunchGain.gain.value, now);
      nodes.masterLaunchGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeDuration);

      setTimeout(() => {
        try {
          nodes.humOsc1.stop();
          nodes.humOsc2.stop();
          nodes.noiseSource.stop();
          nodes.subOsc.stop();
          nodes.aeroSource.stop();

          nodes.humOsc1.disconnect();
          nodes.humOsc2.disconnect();
          nodes.humFilter.disconnect();
          nodes.humGain.disconnect();
          nodes.noiseSource.disconnect();
          nodes.engineFilter.disconnect();
          nodes.engineGain.disconnect();
          nodes.subOsc.disconnect();
          nodes.subGain.disconnect();
          nodes.aeroSource.disconnect();
          nodes.aeroFilter.disconnect();
          nodes.aeroGain.disconnect();
          nodes.masterLaunchGain.disconnect();
        } catch {
          // ignore
        }
      }, fadeDuration * 1000 + 50);
    } catch {
      // ignore
    }
  }

  /**
   * Triumphant subtle chime + telemetry tone when orbit is achieved
   */
  public playOrbitAchievedSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const sfxVol = this.getEffectiveSfxVolume();
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.14;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18 * sfxVol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.95);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Ambient Mission Control / Orbit space tone
   */
  public startOrbitAmbience() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.orbitNodes) return; // already active

    try {
      const now = this.ctx.currentTime;
      const ambVol = this.getEffectiveAmbientVolume();

      const droneOsc1 = this.ctx.createOscillator();
      const droneOsc2 = this.ctx.createOscillator();
      const droneFilter = this.ctx.createBiquadFilter();
      const droneGain = this.ctx.createGain();

      droneOsc1.type = 'sine';
      droneOsc1.frequency.setValueAtTime(110, now);
      droneOsc2.type = 'sine';
      droneOsc2.frequency.setValueAtTime(164.81, now); // E3

      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(280, now);

      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.exponentialRampToValueAtTime(0.15 * ambVol, now + 1.5);

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.ctx.destination);

      droneOsc1.start(now);
      droneOsc2.start(now);

      const telemetryTimerId = window.setInterval(() => {
        if (!this.orbitNodes || this.isMuted) return;
        this.playBeep(880 + Math.random() * 400, 0.05);
      }, 5000);

      this.orbitNodes = {
        droneOsc1,
        droneOsc2,
        droneFilter,
        droneGain,
        telemetryTimerId
      };
    } catch {
      // ignore
    }
  }

  public stopOrbitAmbience() {
    if (!this.orbitNodes) return;
    const nodes = this.orbitNodes;
    this.orbitNodes = null;

    if (nodes.telemetryTimerId) {
      clearInterval(nodes.telemetryTimerId);
    }

    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      nodes.droneGain.gain.setTargetAtTime(0.0001, now, 0.3);
      setTimeout(() => {
        try {
          nodes.droneOsc1.stop();
          nodes.droneOsc2.stop();
          nodes.droneOsc1.disconnect();
          nodes.droneOsc2.disconnect();
          nodes.droneFilter.disconnect();
          nodes.droneGain.disconnect();
        } catch {
          // ignore
        }
      }, 500);
    } catch {
      // ignore
    }
  }

  public handleSimulationPause(isPaused: boolean) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const ambVol = this.getEffectiveAmbientVolume();
      if (this.orbitNodes) {
        if (isPaused) {
          this.orbitNodes.droneGain.gain.setTargetAtTime(0.04 * ambVol, now, 0.2);
        } else {
          this.orbitNodes.droneGain.gain.setTargetAtTime(0.18 * ambVol, now, 0.2);
        }
      }
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundEngine();

