'use client';

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { OrbitMapCanvas } from '@/components/canvas/OrbitMapCanvas';
import { EventModal } from '@/components/modals/EventModal';
import { 
  Play, 
  Pause, 
  FastForward, 
  Radio, 
  Zap, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  Compass, 
  CheckCircle2, 
  Circle, 
  Activity, 
  Terminal,
  HelpCircle
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export const MissionControlScreen: React.FC<{ onOpenTutorial: () => void }> = ({ onOpenTutorial }) => {
  const {
    activeMission,
    missionPhase,
    missionProgress,
    simSpeed,
    setSimSpeed,
    elapsedDays,
    distanceCoveredKm,
    currentVelocityKms,
    currentFuelPct,
    currentPowerW,
    currentCommPct,
    currentRiskPct,
    scienceCollected,
    discoveriesCount,
    activeEvent,
    resolveEventOption,
    decisionLog,
    tickSimulation
  } = useGameStore();

  const lastTimeRef = useRef<number>(Date.now());

  // Simulation loop tick
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const now = Date.now();
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Bound delta to avoid huge jumps if tab was backgrounded
      const safeDelta = Math.min(deltaSec, 0.2);
      tickSimulation(safeDelta);

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = Date.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [tickSimulation]);

  // Format Elapsed Time (MET)
  const days = Math.floor(elapsedDays);
  const remainingHours = Math.floor((elapsedDays - days) * 24);
  const remainingMins = Math.floor((((elapsedDays - days) * 24) - remainingHours) * 60);
  const metString = `T+${String(days).padStart(2, '0')}d ${String(remainingHours).padStart(2, '0')}h ${String(remainingMins).padStart(2, '0')}m`;

  // Milestone list
  const milestones = [
    { label: 'Liftoff & Ascent', threshold: 0 },
    { label: 'Earth Orbit Parking', threshold: 5 },
    { label: 'Trans-Target Injection (TLI)', threshold: 18 },
    { label: 'Deep Space Cruise', threshold: 35 },
    { label: 'Target Orbit Insertion', threshold: 75 },
    { label: 'Polar Science Survey', threshold: 90 },
    { label: 'Mission Completion', threshold: 100 }
  ];

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 select-none flex flex-col min-h-[calc(100vh-80px)] justify-between space-y-4">
      {/* Event Modal (if critical crisis triggered) */}
      <EventModal event={activeEvent} onSelectOption={resolveEventOption} />

      {/* Top Mission Control Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Mission ID & Target */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center font-bold text-white text-lg">
            {activeMission.target === 'Moon' ? '🌙' : activeMission.target === 'Mars' ? '🔴' : '☄️'}
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>FLIGHT CONTROLLER CONSOLE // LIVE TELEMETRY</span>
              <span>//</span>
              <span>{activeMission.code}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase flex items-center space-x-2">
              <span>{activeMission.name}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                STAGE: {missionPhase}
              </span>
            </h2>
          </div>
        </div>

        {/* Center: Mission Progress Bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>TRAJECTORY PROGRESS</span>
            <span className="text-cyan-400 font-bold">{missionProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${missionProgress}%` }}
            />
          </div>
        </div>

        {/* Right: Simulation Speed & Controls */}
        <div className="flex items-center space-x-2">
          {/* Pause / Play */}
          <button
            onClick={() => setSimSpeed(simSpeed === 0 ? 1 : 0)}
            className={`p-2 rounded-lg border font-mono text-xs transition-colors ${
              simSpeed === 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={simSpeed === 0 ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {simSpeed === 0 ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Speed Buttons */}
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimSpeed(spd)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors ${
                simSpeed === spd
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}

          <button
            onClick={onOpenTutorial}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Flight Manual"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left/Center (Interactive Orbit Map), Right (Mission Timeline & Flight Decisions Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Main Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-2 overflow-hidden flex flex-col justify-center">
            <OrbitMapCanvas
              mission={activeMission}
              progress={missionProgress}
              phase={missionPhase}
            />
          </div>

          {/* Telemetry HUD Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            {/* Time */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>MISSION TIME</span>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-white font-bold text-sm mt-1">{metString}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Day {elapsedDays.toFixed(1)} / {activeMission.missionWindowDays}d</div>
            </div>

            {/* Distance & Velocity */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>DISTANCE & VELOCITY</span>
                <Compass className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-white font-bold text-sm mt-1">
                {Math.round(distanceCoveredKm).toLocaleString()} km
              </div>
              <div className="text-[10px] text-cyan-400 mt-0.5">V: {currentVelocityKms} km/s</div>
            </div>

            {/* Science Points */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>SCIENCE COLLECTED</span>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-purple-300 font-bold text-sm mt-1">
                {scienceCollected.toFixed(1)} pts
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Target: {activeMission.minScienceRequired} pts
                {discoveriesCount > 0 && <span className="text-emerald-400 ml-1">({discoveriesCount} anomaly)</span>}
              </div>
            </div>

            {/* Health / Risk */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>MISSION RISK</span>
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className={`font-bold text-sm mt-1 ${currentRiskPct > 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {currentRiskPct}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {currentRiskPct < 30 ? 'GREEN (NOMINAL)' : currentRiskPct < 60 ? 'CAUTION FLIGHT' : 'CRITICAL WARNING'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Timeline & Flight Decisions Feed (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Subsystems Strip */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono">
            {/* Fuel */}
            <div className="text-center p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-center space-x-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>FUEL</span>
              </div>
              <div className="font-bold text-orange-400 mt-1">{currentFuelPct.toFixed(0)}%</div>
            </div>

            {/* Power */}
            <div className="text-center p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-center space-x-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span>POWER</span>
              </div>
              <div className="font-bold text-yellow-400 mt-1">{currentPowerW}W</div>
            </div>

            {/* Signal */}
            <div className="text-center p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-center space-x-1">
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>SIGNAL</span>
              </div>
              <div className="font-bold text-cyan-400 mt-1">{currentCommPct}%</div>
            </div>
          </div>

          {/* Mission Timeline Milestones */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex-1 flex flex-col">
            <div className="text-xs font-mono text-cyan-400 font-bold mb-3 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>FLIGHT SEQUENCE MILESTONES</span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[170px] pr-1 text-xs font-mono">
              {milestones.map((m, idx) => {
                const isPassed = missionProgress >= m.threshold;
                const isCurrent =
                  isPassed &&
                  (idx === milestones.length - 1 || missionProgress < milestones[idx + 1].threshold);

                return (
                  <div
                    key={idx}
                    className={`flex items-center space-x-2.5 p-1.5 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-cyan-950/50 text-cyan-300 font-bold border border-cyan-500/30'
                        : isPassed
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                    )}
                    <span className="truncate">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Flight Log / Decisions Feed */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 h-[190px] flex flex-col">
            <div className="text-xs font-mono text-slate-400 font-bold mb-2 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>FLIGHT CONTROLLER LOGS</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] text-slate-400">
              <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 text-slate-300">
                [T+00d] Launch vehicle injection verified nominal.
              </div>
              {decisionLog.map((log) => (
                <div
                  key={log.id}
                  className="p-1.5 rounded bg-cyan-950/30 border border-cyan-500/20 text-slate-300"
                >
                  <span className="text-cyan-400 font-semibold">[{log.timestamp}]</span> {log.impactSummary}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
