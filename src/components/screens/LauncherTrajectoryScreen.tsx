'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { LAUNCH_VEHICLES } from '@/data/launchers';
import { TRAJECTORY_PROFILES } from '@/data/trajectories';
import { ArrowRight, ArrowLeft, Rocket, Compass, Check, AlertCircle, ShieldCheck, DollarSign, Weight, Zap } from 'lucide-react';
import { sounds } from '@/lib/sound';

export const LauncherTrajectoryScreen: React.FC = () => {
  const {
    activeMission,
    totalMassKg,
    totalCostM,
    selectedLauncherId,
    setLauncherId,
    selectedTrajectoryId,
    setTrajectoryId,
    calculatedRiskPct,
    fuelCapacityPct,
    sciencePotential,
    setScreen,
    initMissionSimulation,
    startCountdown
  } = useGameStore();

  const currentLauncher = LAUNCH_VEHICLES.find((l) => l.id === selectedLauncherId) || LAUNCH_VEHICLES[1];
  const currentTrajectory = TRAJECTORY_PROFILES.find((t) => t.id === selectedTrajectoryId) || TRAJECTORY_PROFILES[0];

  const handleProceedToLaunch = () => {
    sounds.playClick();
    initMissionSimulation();
    startCountdown();
    setScreen('launch');
  };

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 select-none flex flex-col min-h-[calc(100vh-80px)] justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center space-x-3 pb-4 border-b border-cyan-500/20">
          <button
            onClick={() => setScreen('builder')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[11px] font-mono text-cyan-400 flex items-center space-x-2">
              <span>STAGE 03: LAUNCH VEHICLE & ORBITAL MECHANICS</span>
              <span>//</span>
              <span>{activeMission.name}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Launch Vehicle & Trajectory Design
            </h2>
          </div>
        </div>

        {/* 2 Main Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* SECTION 1: Launch Vehicle Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold">
              <Rocket className="w-4 h-4" />
              <span>SELECT LAUNCH VEHICLE (PAYLOAD MASS: {totalMassKg} KG)</span>
            </div>

            <div className="space-y-3">
              {LAUNCH_VEHICLES.map((launcher) => {
                const isSelected = selectedLauncherId === launcher.id;
                const isCompatible = totalMassKg <= launcher.maxPayloadKg;

                return (
                  <div
                    key={launcher.id}
                    onClick={() => {
                      if (isCompatible) setLauncherId(launcher.id);
                    }}
                    className={`p-4 rounded-xl border transition-all duration-150 ${
                      !isCompatible
                        ? 'opacity-40 bg-slate-950/40 border-red-500/30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400 cursor-pointer'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-base">{launcher.name}</span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded bg-cyan-400 text-slate-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-snug">{launcher.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                        Cost: ${launcher.costM}M
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded border ${
                          isCompatible
                            ? 'bg-slate-900 border-slate-800 text-blue-400'
                            : 'bg-red-950/60 border-red-500 text-red-300'
                        }`}
                      >
                        Max Payload: {launcher.maxPayloadKg} kg
                      </span>
                      <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                        Reliability: {launcher.reliabilityPct}%
                      </span>
                    </div>

                    {!isCompatible && (
                      <div className="mt-2 text-xs font-mono text-red-400 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>SPACECRAFT ({totalMassKg} kg) EXCEEDS PAYLOAD CAPACITY ({launcher.maxPayloadKg} kg)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Trajectory Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold">
              <Compass className="w-4 h-4" />
              <span>SELECT ORBITAL TRAJECTORY PROFILE</span>
            </div>

            <div className="space-y-3">
              {TRAJECTORY_PROFILES.map((traj) => {
                const isSelected = selectedTrajectoryId === traj.id;

                return (
                  <div
                    key={traj.id}
                    onClick={() => setTrajectoryId(traj.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-base">{traj.name}</span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded bg-cyan-400 text-slate-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400 mt-0.5">{traj.transferType}</div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-snug">{traj.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-orange-400">
                        Propellant Burn: ~{traj.fuelCostPct}%
                      </span>
                      <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-purple-400">
                        Duration: {traj.durationMultiplier}x
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded border ${
                          traj.riskModPct <= 0
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {traj.riskModPct <= 0 ? `${traj.riskModPct}% Risk` : `+${traj.riskModPct}% Risk`}
                      </span>
                      {traj.scienceBonusPct > 0 && (
                        <span className="px-2.5 py-1 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300">
                          +{traj.scienceBonusPct}% Science Opp
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Flight Readiness Checklist & Launch Pad Action */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-[0_0_30px_rgba(2,6,23,0.8)]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Readiness Telemetry */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center space-x-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>FLIGHT READINESS REVIEW: GO FOR FLIGHT</span>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="text-slate-300">
              Launcher: <strong className="text-white">{currentLauncher.name.split(' (')[0]}</strong>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="text-slate-300">
              Total Budget: <strong className="text-emerald-400">${totalCostM}M / ${activeMission.budget}M</strong>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="text-slate-300">
              Calculated Flight Risk: <strong className="text-cyan-400">{calculatedRiskPct}%</strong>
            </div>
          </div>

          {/* Launch Pad Button */}
          <button
            onClick={handleProceedToLaunch}
            className="w-full lg:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold font-mono text-sm tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95 transition-all"
          >
            <Rocket className="w-4 h-4" />
            <span>PROCEED TO LAUNCH PAD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
