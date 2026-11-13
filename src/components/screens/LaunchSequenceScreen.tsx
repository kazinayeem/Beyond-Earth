'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { LaunchScene3D, LaunchViewState, CameraMode, LaunchCameraApi } from '@/components/canvas/LaunchScene3D';
import {
  AscentPhase,
  EVENTS,
  MAX_Q,
  TARGET_ALTITUDE_KM,
  formatMET,
  sampleAscent,
  timeCompression,
} from '@/lib/flight/ascentProfile';
import { Pause, Play, FastForward, CheckCircle2, Radio, Rocket, ZoomIn, ZoomOut, RotateCcw, Move3d, Clapperboard, Video, Orbit, PanelRight, Eye, Globe2 } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useLaunchWeather } from '@/lib/weather/useLaunchWeather';
import { rollLaunchOutcome, type WxScenario } from '@/lib/weather/launchWeather';
import { WeatherPanel, spaceSummary } from '@/components/weather/WeatherPanel';
import { WeatherOverlay } from '@/components/weather/WeatherOverlay';
import { ExplosionOverlay } from '@/components/weather/ExplosionOverlay';
import { CloudRain } from 'lucide-react';
import { SquadLaunchPanel } from '@/components/squadgame/SquadLaunchPanel';

type Stage = 'poll' | 'ready' | 'flight' | 'orbit' | 'lost';

const STATIONS = ['Range', 'Weather', 'Propulsion', 'Guidance', 'Network', 'Payload'] as const;

const PHASE_LABEL: Record<AscentPhase, string> = {
  PRELAUNCH: 'Terminal count',
  ENGINE_START: 'Ignition sequence',
  IGNITION: 'Ignition',
  LIFTOFF: 'Liftoff',
  PAD_CLEARANCE: 'Tower cleared · pitch program',
  ASCENT: 'Gravity turn',
  MAX_Q: 'Max-Q · throttle bucket',
  HIGH_ALTITUDE: 'Stage 1 burn · thinning atmosphere',
  STAGE_SEPARATION: 'MECO · stage separation',
  UPPER_STAGE: 'Stage 2 vacuum burn',
  ORBIT_INSERTION: 'Orbit insertion',
  ORBIT_ACHIEVED: 'Orbit achieved',
};

const TIMELINE = [
  { t: 0, label: 'Liftoff' },
  { t: MAX_Q.t, label: 'Max-Q' },
  { t: EVENTS.MECO, label: 'MECO · Sep' },
  { t: EVENTS.FAIRING_SEP, label: 'Fairing' },
  { t: EVENTS.SECO, label: 'SECO' },
];
const TIMELINE_END = EVENTS.SECO;

const CAMERAS: { id: CameraMode; label: string; key: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'cinematic', label: 'Cinematic', key: '1', Icon: Clapperboard },
  { id: 'chase', label: 'Chase', key: '2', Icon: Video },
  { id: 'orbit', label: 'Free orbit', key: '3', Icon: Orbit },
  { id: 'side', label: 'Side view', key: '4', Icon: PanelRight },
  { id: 'cockpit', label: 'Cockpit', key: '5', Icon: Eye },
  { id: 'far', label: 'Far space', key: '6', Icon: Globe2 },
];

const NEXT_BURN: Record<string, string> = {
  Moon: 'Next: trans-lunar injection',
  Mars: 'Next: trans-Mars injection',
  Asteroid: 'Next: departure burn to Bennu',
  'Earth Orbit': 'Next: raise to 700 km sun-synchronous orbit',
};

export const LaunchSequenceScreen: React.FC = () => {
  const activeMission = useGameStore(s => s.activeMission);
  const reducedMotion = useGameStore(s => s.reducedMotion);
  const setLaunchStatus = useGameStore(s => s.setLaunchStatus);
  const updateLaunchTelemetry = useGameStore(s => s.updateLaunchTelemetry);
  const setScreen = useGameStore(s => s.setScreen);
  const initMissionSimulation = useGameStore(s => s.initMissionSimulation);

  const [stage, setStage] = useState<Stage>('poll');
  const [polled, setPolled] = useState(0);
  const [phase, setPhase] = useState<AscentPhase>('PRELAUNCH');
  const [count, setCount] = useState(10);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [skipping, setSkipping] = useState(false);
  const [eventsPassed, setEventsPassed] = useState(0);
  const [camMode, setCamMode] = useState<CameraMode>('cinematic');
  const squad = useGameStore(s => s.squad);
  const squadLaunch = useGameStore(s => s.squadRemote?.launch);
  const squadDo = useGameStore(s => s.squadDo);
  const [soloScenario, setSoloScenario] = useState<WxScenario>('live');
  const scenario: WxScenario = squad ? (squadLaunch?.wxScenario ?? 'live') : soloScenario;
  const isFD = !!squad?.myRoles.includes('flight_director');
  const setScenario = (v: WxScenario) => { if (squad) void squadDo('launch.wx', { scenario: v }); else setSoloScenario(v); };
  const [showWx, setShowWx] = useState(false);
  const [lost, setLost] = useState(false);
  const wx = useLaunchWeather(activeMission.id, scenario);
  const wxRef = useRef(wx); wxRef.current = wx;
  const failAtRef = useRef<number | null>(null);
  const failCauseRef = useRef<string>('');
  const camApi = useRef<LaunchCameraApi>(null);
  const eventsPassedRef = useRef(0);

  // Simulation state lives in refs — the render loop never waits on React.
  const stageRef = useRef<Stage>('poll');
  const tRef = useRef(-10);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const viewRef = useRef<LaunchViewState>({ sample: sampleAscent(-10), paused: false, speed: 1, compression: 1 });
  const lastCountRef = useRef(11);
  const phaseRef = useRef<AscentPhase>('PRELAUNCH');
  const orbitHoldRef = useRef(0);
  const doneRef = useRef(false);
  const flushRef = useRef(0);
  const stageNumRef = useRef<1 | 2>(1);
  const fairingRef = useRef(true);

  // DOM refs for direct telemetry writes (no re-render per frame)
  const elMet = useRef<HTMLSpanElement>(null);
  const elAlt = useRef<HTMLSpanElement>(null);
  const elVel = useRef<HTMLSpanElement>(null);
  const elMach = useRef<HTMLSpanElement>(null);
  const elAcc = useRef<HTMLSpanElement>(null);
  const elQ = useRef<HTMLSpanElement>(null);
  const elQBar = useRef<HTMLDivElement>(null);
  const elS1 = useRef<HTMLDivElement>(null);
  const elS2 = useRef<HTMLDivElement>(null);
  const elS1t = useRef<HTMLSpanElement>(null);
  const elS2t = useRef<HTMLSpanElement>(null);
  const elProg = useRef<HTMLDivElement>(null);
  const elComp = useRef<HTMLSpanElement>(null);
  const elDown = useRef<HTMLSpanElement>(null);

  useEffect(() => { pausedRef.current = paused; sounds.setPaused(paused); }, [paused]);
  useEffect(() => { speedRef.current = skipping ? 14 : speed; }, [speed, skipping]);

  // Audio lifecycle
  useEffect(() => {
    sounds.startLaunchAudio();
    return () => {
      sounds.stopLaunchAudio(0.4);
      sounds.cancelSpeech();
      sounds.setPaused(false);
    };
  }, []);

  // Go / No-Go poll — each console reports in turn
  useEffect(() => {
    if (stage !== 'poll') return;
    sounds.playSystemOn();
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setPolled(i);
      sounds.playToggle();
      if (i >= STATIONS.length) {
        window.clearInterval(id);
        stageRef.current = 'ready';
        setStage('ready');
        sounds.say('All stations go. Flight, you are go for launch.');
      }
    }, 520);
    return () => window.clearInterval(id);
  }, [stage]);

  const commitLaunch = useCallback(() => {
    if (stageRef.current !== 'ready' || useGameStore.getState().squad) return;
    sounds.playSelect();
    sounds.say('T minus ten', { interrupt: true });
    void useGameStore.getState().startOnlineRun(); // server-side run registration (rewards need it)
    const w = wxRef.current;
    const roll = rollLaunchOutcome(w.assessment, Math.random);
    failAtRef.current = roll.outcome === 'failure' ? roll.failAtT : null;
    failCauseRef.current = roll.cause ?? '';
    useGameStore.getState().setLaunchEnvironment({
      externalRiskPts: w.liveRiskPts,
      failureReason: null,
      note: `${w.assessment.overall} at ${w.site.short} (${Math.round(w.assessment.failureProbability * 100)}% loss risk)${w.space?.available ? ' · ' + spaceSummary(w.space) : ''}`,
    });
    stageRef.current = 'flight';
    setStage('flight');
    setLaunchStatus('COUNTING');
  }, [setLaunchStatus]);

  // Squad room: the Flight Controller's LAUNCH (stored on the server) starts the same countdown on every console.
  useEffect(() => {
    if (!squad || squadLaunch?.phase !== 'counting' || stageRef.current === 'flight' || stageRef.current === 'orbit' || stageRef.current === 'lost') return;
    const late = Math.min(4, Math.max(0, (Date.now() - (squadLaunch.startedAt ?? Date.now())) / 1000));
    tRef.current = -10 + late;
    failAtRef.current = squadLaunch.outcome === 'failure' ? (squadLaunch.failAtT ?? 60) : null;
    failCauseRef.current = squadLaunch.cause ?? '';
    const w = wxRef.current;
    useGameStore.getState().setLaunchEnvironment({
      externalRiskPts: w.liveRiskPts, failureReason: null,
      note: squadLaunch.wx ? `${squadLaunch.wx.overall} at ${w.site.short} (${Math.round(squadLaunch.wx.p * 100)}% loss risk)` : null,
    });
    stageRef.current = 'flight';
    setStage('flight');
    setLaunchStatus('COUNTING');
    sounds.say('T minus ten', { interrupt: true });
  }, [squad, squadLaunch?.phase, squadLaunch?.startedAt, squadLaunch?.outcome, squadLaunch?.failAtT, squadLaunch?.cause, squadLaunch?.wx, setLaunchStatus]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    sounds.stopLaunchAudio(0.6);
    setLaunchStatus('ORBIT_ACHIEVED');
    updateLaunchTelemetry(TARGET_ALTITUDE_KM, 27900);
    if (useGameStore.getState().squad) {
      // squad room: any console may report orbit; the server moves everyone to Mission Control together
      void (async () => {
        for (let i = 0; i < 10; i++) {
          const ok = await useGameStore.getState().squadDo('launch.finish', {}, { silent: true });
          if (ok || useGameStore.getState().squadRemote?.stage !== 'launch') return;
          await new Promise(r => setTimeout(r, 2500));
        }
      })();
      return;
    }
    initMissionSimulation();
    setScreen('mission_control');
  }, [initMissionSimulation, setLaunchStatus, setScreen, updateLaunchTelemetry]);

  const onPhaseChange = useCallback((p: AscentPhase) => {
    setPhase(p);
    switch (p) {
      case 'ENGINE_START':
        sounds.say('Ignition sequence start', { interrupt: true, radio: false });
        sounds.playIgnition();
        setLaunchStatus('IGNITION');
        break;
      case 'LIFTOFF':
        sounds.playLiftoff();
        sounds.say(`Liftoff. ${activeMission.name} has cleared the tower.`, { interrupt: true, radio: false });
        setLaunchStatus('LIFTOFF');
        break;
      case 'MAX_Q':
        sounds.say('Vehicle is supersonic. Max Q.');
        setLaunchStatus('MAX_Q');
        break;
      case 'STAGE_SEPARATION':
        sounds.playEngineCutoff();
        sounds.say('MECO. Stage separation confirmed.', { interrupt: true });
        setLaunchStatus('STAGING');
        break;
      case 'UPPER_STAGE':
        sounds.say('Second stage ignition.');
        break;
      case 'ORBIT_INSERTION':
        sounds.say('Approaching orbit insertion.');
        break;
      case 'ORBIT_ACHIEVED':
        sounds.playEngineCutoff();
        sounds.playOrbitAchievedSound();
        sounds.say('SECO. Orbit achieved.', { interrupt: true });
        setLaunchStatus('ORBIT_ACHIEVED');
        updateLaunchTelemetry(TARGET_ALTITUDE_KM, 27900);
        stageRef.current = 'orbit';
        setStage('orbit');
        break;
    }
  }, [activeMission.name, setLaunchStatus, updateLaunchTelemetry]);

  // Called by the canvas once per animation frame
  const onFrame = useCallback((dt: number) => {
    const st = stageRef.current;
    let t = tRef.current;
    const spd = speedRef.current;
    const isPaused = pausedRef.current;
    if ((st === 'flight' || st === 'orbit') && !isPaused) {
      const c = t < 0 ? 1 : timeCompression(t);
      t = Math.min(EVENTS.SECO + 30, t + dt * c * spd);
      tRef.current = t;
      if (st === 'orbit') {
        orbitHoldRef.current += dt;
        if (orbitHoldRef.current > 4.2) finish();
      }
    }
    if (st === 'flight' && failAtRef.current !== null && t >= failAtRef.current) {
      failAtRef.current = null;
      stageRef.current = 'lost';
      setStage('lost');
      setLost(true);
      sounds.stopLaunchAudio(0.2);
      sounds.say('Vehicle lost. Anomaly on ascent.', { interrupt: true });
      useGameStore.getState().setLaunchEnvironment({ failureReason: failCauseRef.current || 'Vehicle lost during ascent' });
      window.setTimeout(() => { if (!doneRef.current) { doneRef.current = true; useGameStore.getState().completeMission('FAILURE'); } }, 6500);
    }
    const sample = sampleAscent(t);
    const compression = t < 0 ? 1 : timeCompression(t);
    viewRef.current = { sample, paused: isPaused || st === 'poll' || st === 'ready' || stageRef.current === 'lost', speed: Math.min(spd, 4), compression, destroyed: stageRef.current === 'lost' };

    // Countdown ticks
    if (t < 0 && st === 'flight') {
      const n = Math.ceil(-t);
      if (n !== lastCountRef.current) {
        lastCountRef.current = n;
        setCount(n);
        sounds.playCountdown(n);
      }
    }
    // Timeline markers
    let ep = 0;
    while (ep < TIMELINE.length && t >= TIMELINE[ep].t) ep++;
    if (ep !== eventsPassedRef.current) {
      eventsPassedRef.current = ep;
      setEventsPassed(ep);
      if (ep > 1) sounds.playMilestone();
    }
    // Discrete events
    if (sample.phase !== phaseRef.current && st !== 'poll' && st !== 'ready') {
      phaseRef.current = sample.phase;
      onPhaseChange(sample.phase);
    }
    if (sample.stage !== stageNumRef.current) {
      stageNumRef.current = sample.stage;
      sounds.playStageSeparation();
    }
    if (sample.fairingAttached !== fairingRef.current) {
      fairingRef.current = sample.fairingAttached;
      if (!sample.fairingAttached) {
        sounds.playFairingSeparation();
        sounds.say('Fairing separation.');
      }
    }

    // Continuous engine audio (engine cheaply ignores tiny changes)
    sounds.setLaunchState({
      throttle: sample.throttle,
      atmosphere: sample.atmosphere,
      q: Math.min(1, sample.dynamicPressureKPa / MAX_Q.q),
      stage: sample.stage,
      running: sample.engineRunning && !isPaused,
    });

    // Telemetry → DOM at ~15 Hz
    flushRef.current += dt;
    if (flushRef.current >= 0.066) {
      flushRef.current = 0;
      const set = (el: React.RefObject<HTMLElement | null>, v: string) => { if (el.current) el.current.textContent = v; };
      set(elMet, formatMET(t));
      set(elAlt, sample.altitudeKm < 10 ? sample.altitudeKm.toFixed(2) : sample.altitudeKm.toFixed(1));
      set(elVel, Math.round(sample.velocityKmh).toLocaleString('en-US'));
      set(elMach, sample.mach.toFixed(2));
      set(elAcc, sample.accelerationG.toFixed(2));
      set(elQ, sample.dynamicPressureKPa.toFixed(1));
      set(elDown, sample.downrangeKm.toFixed(0));
      set(elComp, t < 0 ? '1×' : `${Math.round(compression * Math.min(spd, 14))}×`);
      set(elS1t, `${sample.stage1PropPct.toFixed(0)}%`);
      set(elS2t, `${sample.stage2PropPct.toFixed(0)}%`);
      if (elQBar.current) elQBar.current.style.transform = `scaleX(${Math.min(1, sample.dynamicPressureKPa / MAX_Q.q)})`;
      if (elS1.current) elS1.current.style.transform = `scaleX(${sample.stage1PropPct / 100})`;
      if (elS2.current) elS2.current.style.transform = `scaleX(${sample.stage2PropPct / 100})`;
      if (elProg.current) elProg.current.style.transform = `scaleX(${Math.max(0, Math.min(1, t / TIMELINE_END))})`;
    }
  }, [finish, onPhaseChange]);

  const getState = useCallback(() => viewRef.current, []);

  // Keyboard: Space = pause, Enter = commit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space' && stageRef.current === 'flight') {
        e.preventDefault();
        setPaused(p => !p);
      } else if (/^Digit[1-6]$/.test(e.code)) {
        const cam = CAMERAS[Number(e.code.slice(5)) - 1];
        if (cam) { sounds.playToggle(); setCamMode(cam.id); }
      } else if (e.code === 'Enter' && stageRef.current === 'ready') {
        e.preventDefault();
        commitLaunch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commitLaunch]);

  const inFlight = stage === 'flight' || stage === 'orbit';
  const wxVisual = wx.assessment.visual;
  const showCount = stage === 'flight' && (phase === 'PRELAUNCH' || phase === 'ENGINE_START') && count > 0;

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-col h-[calc(100dvh-56px)] min-h-0 select-none">
      <div className="relative flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-white/10 bg-black">
        <LaunchScene3D
          getState={getState}
          onFrame={onFrame}
          reducedMotion={reducedMotion}
          mode={camMode}
          onModeChange={setCamMode}
          apiRef={camApi}
          vehicleLabel={activeMission.code}
          destination={activeMission.target}
        />
        {(stage !== 'orbit') && <WeatherOverlay visual={wxVisual} reducedMotion={reducedMotion} />}
        <ExplosionOverlay active={lost} reducedMotion={reducedMotion} />
        {lost && (
          <div className="absolute inset-x-0 top-[22%] z-30 flex justify-center pointer-events-none" aria-live="assertive">
            <div className="px-6 py-4 rounded-2xl bg-rose-950/80 border border-rose-400/40 backdrop-blur-md text-center max-w-md">
              <div className="hud-label text-rose-300">Vehicle lost</div>
              <div className="mt-1 font-display text-xl text-white">Mission failed on ascent</div>
              <div className="mt-1 text-sm text-rose-200/80">{failCauseRef.current}</div>
            </div>
          </div>
        )}

        {/* ── Camera toolbar (left edge, vertically centred) ── */}
        <div className="absolute left-3 sm:left-4 top-20 sm:top-24 z-20 flex flex-col gap-1 p-1 rounded-xl bg-black/45 backdrop-blur-md border border-white/10" role="toolbar" aria-label="Camera">
          {CAMERAS.map(({ id, label, key, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { sounds.playToggle(); setCamMode(id); }}
              aria-pressed={camMode === id}
              aria-label={`${label} camera (${key})`}
              title={`${label} · ${key}`}
              className={`cam-btn ${camMode === id ? 'cam-btn-active' : ''}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="h-px my-0.5 bg-white/10" />
          <button type="button" className="cam-btn" aria-label="Zoom in" title="Zoom in · scroll" onClick={() => { sounds.playClick(); camApi.current?.zoomIn(); }}><ZoomIn className="w-4 h-4" /></button>
          <button type="button" className="cam-btn" aria-label="Zoom out" title="Zoom out · scroll" onClick={() => { sounds.playClick(); camApi.current?.zoomOut(); }}><ZoomOut className="w-4 h-4" /></button>
          <button type="button" className="cam-btn" aria-label="Reset camera (R)" title="Reset camera · R" onClick={() => { sounds.playClick(); camApi.current?.reset(); }}><RotateCcw className="w-4 h-4" /></button>
        </div>
        <div className="absolute left-16 sm:left-[4.25rem] top-20 sm:top-24 z-10 pointer-events-none hidden md:block">
          <div className="hud-label text-cyan-200/80 flex items-center gap-1.5">
            <Move3d className="w-3 h-3" aria-hidden />
            {CAMERAS.find(c => c.id === camMode)?.label}
          </div>
          {camMode === 'orbit' && <div className="mt-1 text-[10px] font-mono text-slate-500 leading-relaxed">Drag orbit · Right-drag pan<br />Scroll zoom · WASD QE move</div>}
        </div>

        {/* ── Top bar: mission + clock + controls ── */}
        <div className="absolute top-0 inset-x-0 p-3 sm:p-4 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="min-w-0">
            <div className="hud-label">{activeMission.code} · LC-39B</div>
            <div className="text-white font-display font-semibold text-base sm:text-lg tracking-wide truncate">{activeMission.name}</div>
          </div>
          <div className="text-center">
            <div className="hud-label">Mission elapsed</div>
            <span ref={elMet} className="font-mono tabular-nums text-xl sm:text-2xl text-white">T−00:10</span>
          </div>
          <div className="flex items-center gap-1.5 pointer-events-auto" role="group" aria-label="Simulation controls">
            <button
              type="button"
              onClick={() => { sounds.playClick(); setPaused(p => !p); }}
              disabled={!inFlight || !!squad}
              aria-label={paused ? 'Resume simulation' : 'Pause simulation'}
              aria-pressed={paused}
              className="hud-btn"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <div className="hidden sm:flex rounded-lg bg-black/50 border border-white/10 p-0.5" role="radiogroup" aria-label="Simulation speed">
              {[1, 2, 4].map(v => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={speed === v && !skipping}
                  onClick={() => { sounds.playClick(); setSkipping(false); setSpeed(v); }}
                  className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${speed === v && !skipping ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                >
                  {v}×
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { sounds.playClick(); setSkipping(true); }}
              disabled={!inFlight || skipping || !!squad}
              aria-label="Fast-forward to orbit"
              className="hud-btn gap-1.5 px-3"
            >
              <FastForward className="w-4 h-4" />
              <span className="hidden md:inline text-xs font-mono">Skip</span>
            </button>
          </div>
        </div>

        {/* ── Go / No-Go poll ── */}
        <AnimatePresence>
          {(stage === 'poll' || stage === 'ready') && (
            <motion.div
              key="poll"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 flex items-end sm:items-center justify-center sm:justify-end p-4 sm:pr-8 pb-24 sm:pb-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 p-5">
                <div className="flex items-center gap-2 hud-label mb-3">
                  <Radio className="w-3.5 h-3.5 text-cyan-300" aria-hidden />
                  Launch readiness poll
                </div>
                <ul className="grid grid-cols-2 gap-1.5" aria-live="polite">
                  {STATIONS.map((name, i) => {
                    const go = i < polled;
                    return (
                      <li key={name} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                        <span className="text-sm text-slate-300">{name}</span>
                        <span className={`font-mono text-xs transition-colors duration-300 ${go ? 'text-emerald-300' : 'text-slate-600'}`}>
                          {go ? 'GO' : '···'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => setShowWx(v => !v)}
                  className={`mt-3 w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-mono ${wx.assessment.overall === 'GO' ? 'border-emerald-400/30 text-emerald-300' : wx.assessment.overall === 'MARGINAL' ? 'border-amber-400/30 text-amber-300' : 'border-rose-400/40 text-rose-300'}`}
                  aria-expanded={showWx}
                >
                  <span className="flex items-center gap-1.5"><CloudRain className="w-3.5 h-3.5" aria-hidden />Weather: {wx.assessment.overall}</span>
                  <span>{Math.round(wx.assessment.failureProbability * 100)}% loss risk · {showWx ? 'hide' : 'details'}</span>
                </button>
                {showWx && <WeatherPanel wx={wx} scenario={scenario} onScenario={setScenario} canChangeScenario={squad ? isFD : true} className="mt-2 max-h-[40vh] overflow-y-auto" />}
                {squad ? <SquadLaunchPanel assessment={wx.assessment} pollDone={stage === 'ready'} /> : (<>
                <button
                  type="button"
                  onClick={commitLaunch}
                  disabled={stage !== 'ready'}
                  className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-display font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 ${wx.assessment.overall === 'NO-GO' ? 'bg-rose-400 hover:bg-rose-300' : 'bg-cyan-400 hover:bg-cyan-300 enabled:shadow-[0_0_24px_rgba(34,211,238,0.35)]'}`}
                >
                  <Rocket className="w-4 h-4" aria-hidden />
                  {stage !== 'ready' ? 'Polling consoles…' : wx.assessment.overall === 'NO-GO' ? 'Launch anyway · weather NO-GO' : 'Commit launch'}
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">You are Flight Director · Enter to commit</p>
                </>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Countdown ── */}
        {showCount && (
          <div className="absolute top-[18%] inset-x-0 flex flex-col items-center pointer-events-none" aria-live="assertive">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={count}
                initial={{ opacity: 0, scale: 1.25 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`font-mono tabular-nums font-bold leading-none ${count <= 3 ? 'text-6xl sm:text-7xl text-white' : 'text-5xl sm:text-6xl text-cyan-200'}`}
              >
                {count}
              </motion.div>
            </AnimatePresence>
            <div className="hud-label mt-2">{phase === 'ENGINE_START' ? 'Ignition sequence start' : 'Terminal count'}</div>
          </div>
        )}

        {/* ── Phase callout ── */}
        {inFlight && !showCount && (
          <div className="absolute top-[16%] inset-x-0 flex justify-center pointer-events-none" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.4 }}
                className="px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-xs sm:text-sm font-mono uppercase tracking-[0.18em] text-cyan-100"
              >
                {PHASE_LABEL[phase]}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── Orbit achieved ── */}
        <AnimatePresence>
          {stage === 'orbit' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none p-4"
            >
              <div className="text-center px-8 py-5 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-emerald-400/30">
                <div className="flex items-center justify-center gap-2 text-emerald-300 hud-label">
                  <CheckCircle2 className="w-4 h-4" aria-hidden /> Orbit achieved
                </div>
                <div className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-white">200 km parking orbit</div>
                <div className="mt-1 text-sm text-slate-400">{NEXT_BURN[activeMission.target]}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Left telemetry column ── */}
        <div className={`absolute left-3 sm:left-4 bottom-20 sm:bottom-24 space-y-2.5 p-3 pointer-events-none rounded-xl bg-black/35 backdrop-blur-[2px] transition-opacity duration-500 ${inFlight ? 'opacity-100' : 'opacity-0'}`}>
          <Readout label="Altitude" unit="km"><span ref={elAlt}>0.00</span></Readout>
          <Readout label="Velocity" unit="km/h"><span ref={elVel}>0</span></Readout>
          <div className="flex gap-4">
            <Readout label="Mach" small><span ref={elMach}>0.00</span></Readout>
            <Readout label="Accel" unit="g" small><span ref={elAcc}>1.00</span></Readout>
          </div>
        </div>

        {/* ── Right telemetry column ── */}
        <div className={`absolute right-3 sm:right-4 bottom-20 sm:bottom-24 pointer-events-none w-40 sm:w-48 space-y-3 p-3 rounded-xl bg-black/35 backdrop-blur-[2px] transition-opacity duration-500 ${inFlight ? 'opacity-100' : 'opacity-0'}`}>
          <Bar label="Dyn. pressure" valueRef={elQ} unit="kPa" barRef={elQBar} color="bg-amber-300" initial="0.0" />
          <Bar label="Stage 1 prop" valueRef={elS1t} barRef={elS1} color="bg-cyan-300" initial="100%" />
          <Bar label="Stage 2 prop" valueRef={elS2t} barRef={elS2} color="bg-sky-400" initial="100%" />
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Downrange <span ref={elDown} className="text-slate-200 tabular-nums">0</span> km</span>
          </div>
        </div>

        {/* ── Flight event timeline ── */}
        <div className="absolute bottom-0 inset-x-0 px-4 sm:px-6 pb-3 pt-8 pointer-events-none bg-gradient-to-t from-black/75 to-transparent">
          <div className="relative h-1 rounded-full bg-white/10">
            <div ref={elProg} className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r from-cyan-400 to-sky-300" style={{ transform: 'scaleX(0)' }} />
            {TIMELINE.map((ev, idx) => {
              const passed = idx < eventsPassed;
              return (
                <div key={ev.label} className="absolute -top-1 -translate-x-1/2" style={{ left: `${(ev.t / TIMELINE_END) * 100}%` }}>
                  <div className={`w-3 h-3 rounded-full border-2 transition-colors duration-300 ${passed ? 'bg-cyan-300 border-cyan-200' : 'bg-slate-900 border-slate-600'}`} />
                  <div className={`absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono ${passed ? 'text-cyan-100' : 'text-slate-500'} hidden sm:block`}>{ev.label}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 sm:mt-7 flex justify-between text-[10px] font-mono text-slate-500">
            <span>Time compression <span ref={elComp} className="text-slate-300">1×</span></span>
            <span>Simulated ascent model · not live telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Readout: React.FC<{ label: string; unit?: string; small?: boolean; children: React.ReactNode }> = ({ label, unit, small, children }) => (
  <div>
    <div className="hud-label">{label}</div>
    <div className={`font-mono tabular-nums text-white leading-tight ${small ? 'text-base' : 'text-2xl sm:text-3xl'}`}>
      {children}
      {unit && <span className="ml-1 text-xs text-slate-400">{unit}</span>}
    </div>
  </div>
);

const Bar: React.FC<{
  label: string;
  unit?: string;
  initial: string;
  color: string;
  valueRef: React.RefObject<HTMLSpanElement | null>;
  barRef: React.RefObject<HTMLDivElement | null>;
}> = ({ label, unit, initial, color, valueRef, barRef }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <span className="hud-label">{label}</span>
      <span className="font-mono tabular-nums text-xs text-slate-200">
        <span ref={valueRef}>{initial}</span>
        {unit && <span className="text-slate-500"> {unit}</span>}
      </span>
    </div>
    <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
      <div ref={barRef} className={`h-full w-full origin-left ${color} transition-transform duration-100`} style={{ transform: 'scaleX(1)' }} />
    </div>
  </div>
);
