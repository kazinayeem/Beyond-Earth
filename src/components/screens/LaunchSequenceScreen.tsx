'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { LaunchSequenceCanvas } from '@/components/canvas/LaunchSequenceCanvas';
import { Rocket, ShieldCheck, FastForward, CheckCircle2 } from 'lucide-react';
import { sounds } from '@/lib/sound';

export const LaunchSequenceScreen: React.FC = () => {
  const {
    activeMission,
    launchStatus,
    setLaunchStatus,
    countdown,
    telemetryAltitudeKm,
    telemetryVelocityKmh,
    updateLaunchTelemetry,
    setScreen
  } = useGameStore();

  const [count, setCount] = useState(10);
  const [flightPhaseText, setFlightPhaseText] = useState('FINAL COUNTDOWN STANDBY');

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (count > 0) {
      timer = setTimeout(() => {
        const next = count - 1;
        setCount(next);
        sounds.playCountdown(next);
      }, 1000);
    } else if (count === 0) {
      // Countdown reached zero -> IGNITION & LIFTOFF
      sounds.playCountdown(0);
      sounds.playRocketEngine(8);
      setLaunchStatus('IGNITION');
      setFlightPhaseText('MAIN ENGINE IGNITION // ALL SYSTEMS NOMINAL');

      // Timeline of launch events
      setTimeout(() => {
        setLaunchStatus('LIFTOFF');
        setFlightPhaseText('LIFTOFF! TOWER CLEARED');
        updateLaunchTelemetry(1.2, 850);
      }, 1500);

      setTimeout(() => {
        setLaunchStatus('MAX_Q');
        setFlightPhaseText('MAX-Q: PASSING MAXIMUM DYNAMIC PRESSURE');
        updateLaunchTelemetry(18.5, 4200);
      }, 4500);

      setTimeout(() => {
        setLaunchStatus('STAGING');
        setFlightPhaseText('FIRST STAGE CUTOFF // BOOSTER SEPARATION CONFIRMED');
        updateLaunchTelemetry(68.0, 11500);
      }, 7500);

      setTimeout(() => {
        setLaunchStatus('ORBIT_ACHIEVED');
        setFlightPhaseText('PRELIMINARY ORBIT INSERTION CONFIRMED (200 KM LEO)');
        updateLaunchTelemetry(210.0, 27800);
      }, 10500);

      setTimeout(() => {
        // Transition to Mission Control
        setScreen('mission_control');
      }, 12500);
    }

    return () => clearTimeout(timer);
  }, [count, setLaunchStatus, updateLaunchTelemetry, setScreen]);

  const handleSkipToOrbit = () => {
    sounds.playClick();
    setLaunchStatus('ORBIT_ACHIEVED');
    updateLaunchTelemetry(210.0, 27800);
    setScreen('mission_control');
  };

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-4 select-none flex flex-col min-h-[calc(100vh-80px)] justify-between">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 flex items-center space-x-2">
              <span>KENNEDY SPACE CENTER // LAUNCH COMPLEX 39B</span>
              <span>//</span>
              <span>{activeMission.code}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
              Launch & Ascent Telemetry
            </h2>
          </div>
        </div>

        {/* Skip action */}
        <button
          onClick={handleSkipToOrbit}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors"
        >
          <span>FAST FORWARD TO ORBIT</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="my-4 relative rounded-2xl overflow-hidden border border-cyan-500/30">
        <LaunchSequenceCanvas
          status={launchStatus}
          countdown={count}
          altitudeKm={telemetryAltitudeKm}
          velocityKmh={telemetryVelocityKmh}
        />

        {/* Central Giant Countdown Badge (when counting) */}
        {count > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              key={count}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center p-6 rounded-2xl bg-black/60 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.3)]"
            >
              <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
                TERMINAL COUNTDOWN
              </div>
              <div className="text-6xl sm:text-8xl font-black font-mono text-white tracking-wider my-1 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                T-{count}
              </div>
              <div className="text-xs font-mono text-slate-400">
                AUTONOMOUS FLIGHT CONTROLLER ARMED
              </div>
            </motion.div>
          </div>
        )}

        {/* Live Flight Phase Callout Banner */}
        <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">STATUS:</span>
            <span className="text-white font-bold tracking-wider">{flightPhaseText}</span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
            <span>RANGE SAFETY: GREEN</span>
          </div>
        </div>
      </div>

      {/* Telemetry Dashboard Strip */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px]">ALTITUDE</div>
          <div className="text-white font-bold text-base mt-0.5">
            {telemetryAltitudeKm > 0 ? `${telemetryAltitudeKm.toFixed(1)} km` : '0.0 km (SL)'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Orbital Target: 200 km</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px]">VELOCITY</div>
          <div className="text-cyan-400 font-bold text-base mt-0.5">
            {telemetryVelocityKmh > 0 ? `${telemetryVelocityKmh.toLocaleString()} km/h` : '0 km/h'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Mach {(telemetryVelocityKmh / 1234).toFixed(1)}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px]">PROPULSION CHAMBER</div>
          <div className="text-emerald-400 font-bold text-base mt-0.5">
            {count === 0 ? '104.5% NOMINAL' : 'STANDBY 0.0%'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Main Engine Pressure</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-slate-500 text-[10px]">GUIDANCE MODE</div>
          <div className="text-purple-400 font-bold text-base mt-0.5">
            CLOSED LOOP PITCH
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Trajectory Optimization</div>
        </div>
      </div>
    </div>
  );
};
