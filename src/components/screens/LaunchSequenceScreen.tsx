'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { 
  LaunchSequenceCanvas, 
  DetailedLaunchPhase 
} from '@/components/canvas/LaunchSequenceCanvas';
import { 
  Rocket, 
  ShieldCheck, 
  ShieldAlert, 
  FastForward, 
  CheckCircle2, 
  Play, 
  Pause,
  Gauge,
  Flame,
  Activity
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export const LaunchSequenceScreen: React.FC = () => {
  const {
    activeMission,
    setLaunchStatus,
    updateLaunchTelemetry,
    setScreen,
    initMissionSimulation,
    reducedMotion
  } = useGameStore();

  // Core Simulation State
  const [detailedPhase, setDetailedPhase] = useState<DetailedLaunchPhase>('PRELAUNCH');
  const [count, setCount] = useState(10);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState(false);

  // Synchronized Telemetry State (Single source of truth)
  const [altitudeKm, setAltitudeKm] = useState(0);
  const [velocityKmh, setVelocityKmh] = useState(0);
  const [accelerationG, setAccelerationG] = useState(1.0);
  const [dynamicPressureKPa, setDynamicPressureKPa] = useState(0);
  const [fuelPct, setFuelPct] = useState(100);

  // Status & Guidance State
  const [flightPhaseText, setFlightPhaseText] = useState('FINAL COUNTDOWN STANDBY // T-10');
  const [rangeSafety, setRangeSafety] = useState<'GREEN' | 'AMBER' | 'RED'>('GREEN');
  const [chamberStatus, setChamberStatus] = useState('STANDBY 0.0%');
  const [guidanceMode, setGuidanceMode] = useState('INERTIAL PLATFORM ALIGNED');
  const [showOrbitBanner, setShowOrbitBanner] = useState(false);

  const [isFastForwarding, setIsFastForwarding] = useState(false);

  // Simulation Clock Refs
  const simTimeSecRef = useRef(-10); // Starts at T-10 seconds
  const lastRealTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);

  // Last countdown value that had a tick sound played — prevents duplicate tones
  const lastTickedCountRef = useRef(-1);

  // Smooth display interpolation refs (updated every rAF, no React re-render)
  const dispAltRef   = useRef(0);
  const dispVelRef   = useRef(0);
  const dispAccRef   = useRef(1.0);
  const dispQRef     = useRef(0);
  const dispFuelRef  = useRef(100);
  // Display state — only updated when values meaningfully change (batched)
  const [dispAlt,  setDispAlt]  = useState(0);
  const [dispVel,  setDispVel]  = useState(0);
  const [dispAcc,  setDispAcc]  = useState(1.0);
  const [dispQ,    setDispQ]    = useState(0);
  const [dispFuel, setDispFuel] = useState(100);
  const dispFlushRef = useRef(0); // Throttle display state flushes to ~10fps

  // 1. Initial audio start: starts subtle system hum when player enters screen
  useEffect(() => {
    sounds.startLaunchAudio();

    return () => {
      // Audio cleanup on unmount
      sounds.stopLaunchAudio(0.3);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Safe Transition to Mission Control
  const finishAndTransitionToOrbit = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    sounds.stopLaunchAudio(0.3);
    setLaunchStatus('ORBIT_ACHIEVED');
    updateLaunchTelemetry(200.0, 28000);
    initMissionSimulation();
    setScreen('mission_control');
  }, [initMissionSimulation, setLaunchStatus, setScreen, updateLaunchTelemetry]);

  // Pause / Resume handler
  const handleTogglePause = () => {
    sounds.playClick();
    setIsPaused(prev => {
      const next = !prev;
      sounds.handleSimulationPause(next);
      return next;
    });
  };

  // Speed selection handler (1x, 2x, 4x)
  const handleSelectSpeed = (speed: number) => {
    sounds.playClick();
    setSimSpeed(speed);
  };

  // Fast Forward to Orbit handler (rapid simulation acceleration to orbit in ~1.2s)
  const handleFastForward = () => {
    if (isTransitioningRef.current) return;
    sounds.playClick();
    setIsFastForwarding(true);
    setSimSpeed(12); // Accelerate simulation clock by 12x
  };

  // 2. High-Frequency Deterministic Simulation Engine (60fps requestAnimationFrame)
  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      if (lastRealTimeRef.current === null) {
        lastRealTimeRef.current = now;
      }
      const deltaRealSec = Math.min(0.1, (now - lastRealTimeRef.current) / 1000);
      lastRealTimeRef.current = now;

      if (!isPaused && !isTransitioningRef.current) {
        const effectiveSpeed = isFastForwarding ? 12 : simSpeed;
        simTimeSecRef.current += deltaRealSec * effectiveSpeed;
        const tSec = simTimeSecRef.current;

        // Target physics values this frame
        let targetAlt = 0, targetVel = 0, targetAcc = 1.0, targetQ = 0, targetFuel = 100;

        // --- PHASE A: TERMINAL COUNTDOWN (T-10 to T-0) ---
        if (tSec < 0) {
          const remainingSec = Math.max(0, Math.ceil(-tSec));

          // Countdown tick sound — fires once per integer second
          if (remainingSec !== lastTickedCountRef.current && remainingSec > 0 && remainingSec <= 10) {
            lastTickedCountRef.current = remainingSec;
            try { sounds.playClick(); } catch (_) {/* ignore */}
          }

          setCount(remainingSec);
          targetAlt = 0; targetVel = 0; targetAcc = 1.0; targetQ = 0; targetFuel = 100;

          if (tSec < -3.0) {
            setDetailedPhase('PRELAUNCH');
            setFlightPhaseText(`FINAL COUNTDOWN STANDBY // T-${remainingSec}`);
            setChamberStatus('STANDBY 0.0%');
            setGuidanceMode('INERTIAL PLATFORM ALIGNED');
            setRangeSafety('GREEN');
          } else {
            setDetailedPhase('ENGINE_START');
            setFlightPhaseText('MAIN ENGINE START SEQUENCE // TURBOPUMPS AT 35.0%');
            setChamberStatus('SPIN-UP 35.0% (7.2 MPa)');
            setGuidanceMode('AUTONOMOUS FLIGHT CONTROLLER ACTIVE');
            sounds.updateLaunchAudio(0, 0, 'ENGINE_START');
          }
        }
        // --- PHASE B: MAIN ENGINE IGNITION (T+0.0 to T+1.6s) ---
        else if (tSec < 1.6) {
          setCount(0);
          setDetailedPhase('IGNITION');
          setLaunchStatus('IGNITION');
          setFlightPhaseText('MAIN ENGINE IGNITION // ALL SYSTEMS NOMINAL');
          setChamberStatus('104.5% NOMINAL (20.5 MPa)');
          setGuidanceMode('AUTONOMOUS FLIGHT CONTROLLER ACTIVE');
          setRangeSafety('GREEN');
          targetAlt = 0; targetVel = 0; targetAcc = 1.2; targetQ = 0; targetFuel = 99.4;
          sounds.updateLaunchAudio(0, 0, 'IGNITION');
        }
        // --- PHASE C: LIFTOFF (T+1.6 to T+3.2s) ---
        else if (tSec < 3.2) {
          const t = (tSec - 1.6) / 3.4;
          targetAlt = 14.2 * Math.pow(t, 2);
          targetVel = 3200 * Math.pow(t, 1.5);
          targetAcc = 1.2 + (tSec - 1.6) * 0.4;
          targetQ   = targetAlt * 0.9;
          targetFuel = 98 - (tSec * 1.5);
          setDetailedPhase('LIFTOFF');
          setLaunchStatus('LIFTOFF');
          setFlightPhaseText('LIFTOFF! HOLD-DOWN CLAMPS RELEASED');
          setChamberStatus('104.5% NOMINAL');
          setGuidanceMode('PRIMARY ASCENT GUIDANCE PROGRAM');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'LIFTOFF');
        }
        // --- PHASE D: PAD CLEARANCE (T+3.2 to T+5.0s) ---
        else if (tSec < 5.0) {
          const t = (tSec - 1.6) / 3.4;
          targetAlt = 14.2 * Math.pow(t, 2);
          targetVel = 3200 * Math.pow(t, 1.5);
          targetAcc = 1.8; targetQ = targetAlt * 1.4; targetFuel = 94 - (tSec * 1.5);
          setDetailedPhase('PAD_CLEARANCE');
          setLaunchStatus('LIFTOFF');
          setFlightPhaseText('TOWER CLEARED // VEHICLE PITCH PROGRAM INITIATED');
          setChamberStatus('104.5% NOMINAL');
          setGuidanceMode('GRAVITY TURN PITCH PROGRAM');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'PAD_CLEARANCE');
        }
        // --- PHASE E: TRANS-SONIC ASCENT (T+5.0 to T+7.0s) ---
        else if (tSec < 7.0) {
          const t = (tSec - 5.0) / 3.5;
          targetAlt = 14.2 + (52.0 - 14.2) * t;
          targetVel = 3200 + (8600 - 3200) * Math.pow(t, 1.2);
          targetAcc = 2.4; targetQ = 20.0 + (tSec - 5.0) * 7.0; targetFuel = 86 - (tSec * 1.8);
          setDetailedPhase('ASCENT');
          setLaunchStatus('MAX_Q');
          setFlightPhaseText('TRANS-SONIC ASCENT // DYNAMIC PRESSURE BUILDING');
          setChamberStatus('104.5% NOMINAL');
          setGuidanceMode('MAX-Q ADAPTIVE THROTTLE');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'ASCENT');
        }
        // --- PHASE F: MAX-Q (T+7.0 to T+8.5s) ---
        else if (tSec < 8.5) {
          const t = (tSec - 5.0) / 3.5;
          targetAlt = 14.2 + (52.0 - 14.2) * t;
          targetVel = 3200 + (8600 - 3200) * Math.pow(t, 1.2);
          targetAcc = 2.8; targetQ = 34.8; targetFuel = 78 - (tSec * 1.8);
          setDetailedPhase('MAX_Q');
          setLaunchStatus('MAX_Q');
          setFlightPhaseText('MAX-Q // MAXIMUM AERODYNAMIC LOADS NOMINAL');
          setChamberStatus('THROTTLED DOWN TO 85.0% (MAX-Q)');
          setGuidanceMode('AERODYNAMIC LOAD SUPPRESSION');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'MAX_Q');
        }
        // --- PHASE G: HIGH ALTITUDE (T+8.5 to T+10.0s) ---
        else if (tSec < 10.0) {
          const t = (tSec - 8.5) / 3.0;
          targetAlt = 52.0 + (128.0 - 52.0) * t;
          targetVel = 8600 + (19400 - 8600) * t;
          targetAcc = 3.4; targetQ = 7.5; targetFuel = 65 - (tSec * 2.0);
          setDetailedPhase('HIGH_ALTITUDE');
          setLaunchStatus('STAGING');
          setFlightPhaseText('MESOSPHERE TRANSITION // APPROACHING FIRST STAGE MECO');
          setChamberStatus('104.5% NOMINAL (THROTTLED UP)');
          setGuidanceMode('CLOSED LOOP VACUUM OPTIMIZATION');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'HIGH_ALTITUDE');
        }
        // --- PHASE H: STAGE SEPARATION (T+10.0 to T+11.5s) ---
        else if (tSec < 11.5) {
          const t = (tSec - 8.5) / 3.0;
          targetAlt = 52.0 + (128.0 - 52.0) * t;
          targetVel = 8600 + (19400 - 8600) * t;
          targetAcc = 0.2; targetQ = 0.2; targetFuel = 52;
          setDetailedPhase('STAGE_SEPARATION');
          setLaunchStatus('STAGING');
          setFlightPhaseText('FIRST STAGE MECO // BOOSTER SEPARATION CONFIRMED');
          setChamberStatus('INTERSTAGE CUTOFF 0.0%');
          setGuidanceMode('PNEUMATIC SEPARATION LOCK');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'STAGE_SEPARATION');
        }
        // --- PHASE I: UPPER STAGE (T+11.5 to T+13.0s) ---
        else if (tSec < 13.0) {
          const t = (tSec - 11.5) / 2.5;
          targetAlt = 128.0 + (200.0 - 128.0) * Math.sin((t * Math.PI) / 2);
          targetVel = 19400 + (28000 - 19400) * Math.sin((t * Math.PI) / 2);
          targetAcc = 2.2; targetQ = 0; targetFuel = 44;
          setDetailedPhase('UPPER_STAGE');
          setLaunchStatus('STAGING');
          setFlightPhaseText('SECOND STAGE VACUUM IGNITION // FAIRING JETTISONED');
          setChamberStatus('UPPER STAGE 100% NOMINAL (VACUUM)');
          setGuidanceMode('ORBITAL PLANE INSERTION');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'UPPER_STAGE');
        }
        // --- PHASE J: ORBIT INSERTION (T+13.0 to T+14.0s) ---
        else if (tSec < 14.0) {
          const t = (tSec - 11.5) / 2.5;
          targetAlt = 128.0 + (200.0 - 128.0) * Math.sin((t * Math.PI) / 2);
          targetVel = 19400 + (28000 - 19400) * Math.sin((t * Math.PI) / 2);
          targetAcc = 2.6; targetQ = 0; targetFuel = 36;
          setDetailedPhase('ORBIT_INSERTION');
          setLaunchStatus('STAGING');
          setFlightPhaseText('ORBIT INSERTION BURN // CIRCULARIZING 200 KM LEO');
          setChamberStatus('SECO IMMINENT (92.0% THRUST)');
          setGuidanceMode('ORBITAL VELOCITY STABILIZED');
          setRangeSafety('GREEN');
          sounds.updateLaunchAudio(targetAlt, targetVel, 'ORBIT_INSERTION');
        }
        // --- PHASE K: ORBIT ACHIEVED (T+14.0+) ---
        else if (tSec < 16.5) {
          if (detailedPhase !== 'ORBIT_ACHIEVED') {
            setDetailedPhase('ORBIT_ACHIEVED');
            setLaunchStatus('ORBIT_ACHIEVED');
            setFlightPhaseText('✓ ORBIT ACHIEVED // 200 KM PARKING ORBIT CONFIRMED');
            setChamberStatus('STANDBY (ORBITAL)');
            setGuidanceMode('STATIONARY ATTITUDE HOLD');
            setRangeSafety('GREEN');
            setShowOrbitBanner(true);
            sounds.stopLaunchAudio(0.8);
            sounds.playOrbitAchievedSound();
            sounds.startOrbitAmbience();
          }
          targetAlt = 200.0; targetVel = 28000; targetAcc = 0; targetQ = 0; targetFuel = 32;
        }
        // --- TRANSITION TO MISSION CONTROL ---
        else {
          finishAndTransitionToOrbit();
          return;
        }

        // ── Smooth telemetry interpolation (lerp in rAF, no React re-render per frame) ──
        const lerpSpeed = Math.min(1, deltaRealSec * effectiveSpeed * 5);
        dispAltRef.current  += (targetAlt  - dispAltRef.current)  * lerpSpeed;
        dispVelRef.current  += (targetVel  - dispVelRef.current)  * lerpSpeed;
        dispAccRef.current  += (targetAcc  - dispAccRef.current)  * lerpSpeed;
        dispQRef.current    += (targetQ    - dispQRef.current)    * lerpSpeed;
        dispFuelRef.current += (targetFuel - dispFuelRef.current) * lerpSpeed;

        // Flush display state to React ~10fps to keep panel smooth without spam
        dispFlushRef.current += deltaRealSec;
        if (dispFlushRef.current >= 0.08) {
          dispFlushRef.current = 0;
          setDispAlt(dispAltRef.current);
          setDispVel(dispVelRef.current);
          setDispAcc(dispAccRef.current);
          setDispQ(dispQRef.current);
          setDispFuel(dispFuelRef.current);
          // Also sync raw values for canvas props
          setAltitudeKm(targetAlt);
          setVelocityKmh(targetVel);
          setAccelerationG(targetAcc);
          setDynamicPressureKPa(targetQ);
          setFuelPct(targetFuel);
        }

        updateLaunchTelemetry(
          tSec >= 14.0 ? 200.0 : targetAlt,
          tSec >= 14.0 ? 28000 : Math.round(targetVel)
        );
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    isPaused,
    simSpeed,
    isFastForwarding,
    detailedPhase,
    setLaunchStatus,
    updateLaunchTelemetry,
    finishAndTransitionToOrbit
  ]);

  return (
    <div className="relative z-10 max-w-6xl w-full mx-auto px-3 sm:px-4 py-2 select-none flex flex-col h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] justify-between overflow-hidden">
      
      {/* =========================================================================
          1. TOP FLIGHT COMMAND HEADER & SIMULATION CONTROLS
          ========================================================================= */}
      <div className="shrink-0 flex items-center justify-between pb-2 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 flex items-center space-x-2">
              <span className="truncate">KENNEDY SPACE CENTER // LC-39B</span>
              <span>{"//"}</span>
              <span>{activeMission.code}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase">
              Launch & Ascent Telemetry
            </h2>
          </div>
        </div>

        {/* Right: Simulation Speed Controls (1x, 2x, 4x, Pause, Fast Forward) */}
        <div className="flex items-center space-x-2">
          {/* Pause / Resume Button */}
          <button
            onClick={handleTogglePause}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border font-mono text-xs transition-colors flex items-center space-x-1 ${
              isPaused 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
            title={isPaused ? "Resume simulation" : "Pause simulation"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden md:inline">{isPaused ? "RESUME" : "PAUSE"}</span>
          </button>

          {/* 1x / 2x / 4x Speed Selector */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 font-mono text-xs">
            {[1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSelectSpeed(speed)}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  simSpeed === speed && !isFastForwarding
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Set simulation speed to ${speed}x`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Fast Forward to Orbit Action Button */}
          <button
            onClick={handleFastForward}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-xs font-mono text-cyan-300 font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:scale-[1.02] active:scale-[0.98]"
            title="Accelerate flight simulation to orbital insertion"
          >
            <span className="hidden sm:inline">FAST FORWARD TO ORBIT</span>
            <span className="sm:hidden">FAST FORWARD</span>
            <FastForward className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. MAIN LAUNCH SIMULATION VIEWPORT (Flex-1)
          ========================================================================= */}
      <div className="flex-1 min-h-[200px] my-2 relative rounded-2xl overflow-hidden border border-cyan-500/30 flex flex-col">
        <LaunchSequenceCanvas
          phase={detailedPhase}
          countdown={count}
          altitudeKm={altitudeKm}
          velocityKmh={velocityKmh}
          accelerationG={accelerationG}
          dynamicPressureKPa={dynamicPressureKPa}
          fuelPct={fuelPct}
          reducedMotion={reducedMotion}
        />

        {/* ── COUNTDOWN HUD ── Upper-center, never covers the rocket ── */}
        {(detailedPhase === 'PRELAUNCH' || detailedPhase === 'ENGINE_START') && count > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center">
            {/* Thin top label */}
            <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] text-cyan-400/80 uppercase mb-0.5">
              {detailedPhase === 'ENGINE_START' ? 'ENGINE START SEQ' : 'TERMINAL COUNTDOWN'}
            </div>

            {/* Count number with smooth key-based fade+scale */}
            <AnimatePresence mode="wait">
              <motion.div
                key={count}
                initial={{ opacity: 0, scale: 1.18, y: -4 }}
                animate={{ opacity: 1,  scale: 1.0,  y: 0  }}
                exit={{    opacity: 0,  scale: 0.84, y: 4  }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`font-black font-mono tracking-wider leading-none ${
                  count <= 3
                    ? 'text-4xl sm:text-5xl text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.55)]'
                    : 'text-3xl sm:text-4xl text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                }`}
              >
                T‑{count}
              </motion.div>
            </AnimatePresence>

            {/* Thin sub-label */}
            <div className="text-[8px] font-mono text-slate-500 tracking-widest mt-0.5 uppercase">
              {count <= 3 ? 'IGNITION IMMINENT' : 'AUTO FLIGHT CTRL ARMED'}
            </div>
          </div>
        )}

        {/* Engine ignition / liftoff phase label — top HUD */}
        {(detailedPhase === 'IGNITION' || detailedPhase === 'LIFTOFF') && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={detailedPhase}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y:  6 }}
                transition={{ duration: 0.3 }}
                className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] text-orange-300 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)] uppercase"
              >
                {detailedPhase === 'IGNITION' ? '▲ MAIN ENGINE IGNITION' : '▲ LIFTOFF'}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Orbit Achieved Success Banner Overlay */}
        {showOrbitBanner && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center px-6 py-4 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.35)]"
            >
              <div className="flex items-center justify-center space-x-2 text-emerald-400 mb-1">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase">
                  ORBIT ACHIEVED
                </span>
              </div>
              <div className="text-lg sm:text-2xl font-black font-mono text-white tracking-wider">
                LUNAR ORBIT INSERTION SUCCESSFUL
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                200 KM PARKING ORBIT // COMMENCING MISSION OPERATIONS
              </div>
            </motion.div>
          </div>
        )}

        {/* Live Flight Phase Callout Banner */}
        <div className="absolute bottom-2.5 left-3 right-3 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs font-mono z-20">
          <div className="flex items-center space-x-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                rangeSafety === 'AMBER'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="text-slate-400 shrink-0">STATUS:</span>
            <span className="text-white font-bold tracking-wider truncate">{flightPhaseText}</span>
          </div>
          <div
            className={`hidden sm:flex items-center space-x-2 font-bold shrink-0 ${
              rangeSafety === 'AMBER'
                ? 'text-amber-400'
                : rangeSafety === 'RED'
                ? 'text-red-400'
                : 'text-emerald-400'
            }`}
          >
            {rangeSafety === 'AMBER' ? (
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span>RANGE SAFETY: {rangeSafety}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. REAL-TIME SYNCHRONIZED TELEMETRY DASHBOARD STRIP
          Telemetry values use smoothly-interpolated display refs (dispAlt/Vel/Acc/Q/Fuel)
          updated via lerp in the rAF loop — no abrupt jumps.
          ========================================================================= */}
      <div className="shrink-0 p-2.5 sm:p-3 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
        {/* Metric 1: Altitude */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px] flex items-center space-x-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>ALTITUDE</span>
          </div>
          <div className="text-white font-bold text-sm sm:text-base mt-0.5">
            {dispAlt > 0.05 ? `${dispAlt.toFixed(1)} km` : '0.0 km (SL)'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Target: 200.0 km</div>
        </div>

        {/* Metric 2: Velocity & Mach */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px] flex items-center space-x-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>VELOCITY</span>
          </div>
          <div className="text-cyan-400 font-bold text-sm sm:text-base mt-0.5">
            {dispVel > 1 ? `${Math.round(dispVel).toLocaleString()} km/h` : '0 km/h'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Mach {(dispVel / 1234.8).toFixed(1)}</div>
        </div>

        {/* Metric 3: Acceleration / G-Force */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px]">ACCELERATION</div>
          <div className="text-amber-400 font-bold text-sm sm:text-base mt-0.5">
            {dispAcc.toFixed(2)} G
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Structural: 4.5G Max</div>
        </div>

        {/* Metric 4: Dynamic Pressure Q */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px]">DYNAMIC PRESSURE (Q)</div>
          <div className="text-sky-300 font-bold text-sm sm:text-base mt-0.5">
            {dispQ.toFixed(1)} kPa
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Max-Q Limit: 35 kPa</div>
        </div>

        {/* Metric 5: Propulsion Chamber */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 col-span-2 sm:col-span-2 md:col-span-1">
          <div className="text-slate-500 text-[10px] flex items-center space-x-1">
            <Flame className="w-3 h-3 text-orange-400" />
            <span>CHAMBER</span>
          </div>
          <div className="text-emerald-400 font-bold text-sm sm:text-base mt-0.5 truncate">
            {chamberStatus}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Fuel: {dispFuel.toFixed(0)}%</div>
        </div>

        {/* Metric 6: Guidance Mode */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 col-span-2 sm:col-span-2 md:col-span-1">
          <div className="text-slate-500 text-[10px]">GUIDANCE PROGRAM</div>
          <div className="text-purple-400 font-bold text-sm sm:text-base mt-0.5 truncate">
            {guidanceMode}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Autonomous Closed-Loop</div>
        </div>
      </div>

    </div>
  );
};
