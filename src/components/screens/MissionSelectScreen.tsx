'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { MISSIONS } from '@/data/missions';
import { MissionData } from '@/types/game';
import { ArrowRight, Compass, ShieldAlert, DollarSign, Weight, Zap, Calendar, Sparkles } from 'lucide-react';
import { sounds } from '@/lib/sound';

export const MissionSelectScreen: React.FC = () => {
  const { activeMission, setActiveMission, setScreen } = useGameStore();

  const handleSelectMission = (mission: MissionData) => {
    setActiveMission(mission);
    setScreen('briefing');
  };

  const getDifficultyBadge = (diff: MissionData['difficulty']) => {
    switch (diff) {
      case 'Easy':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">DIFFICULTY: EASY</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">DIFFICULTY: MEDIUM</span>;
      case 'Hard':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/40">DIFFICULTY: HARD</span>;
    }
  };

  const getCelestialIcon = (target: MissionData['target']) => {
    switch (target) {
      case 'Moon':
        return (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center font-bold text-slate-900 text-lg">
            🌙
          </div>
        );
      case 'Mars':
        return (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-orange-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center font-bold text-white text-lg">
            🔴
          </div>
        );
      case 'Asteroid':
        return (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-stone-600 to-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.3)] flex items-center justify-center font-bold text-white text-lg">
            ☄️
          </div>
        );
      case 'Earth Orbit':
        return (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center font-bold text-white text-lg">
            🌍
          </div>
        );
    }
  };

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 select-none">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-400 tracking-wider mb-3">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>FLIGHT DIRECTOR MANIFEST</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
          Select Mission Objective
        </h2>
        <p className="text-xs sm:text-sm font-mono text-slate-400 mt-2">
          Review planetary targets, scientific mandates, and launch budget envelopes.
        </p>
      </div>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MISSIONS.map((mission, idx) => {
          const isSelected = activeMission.id === mission.id;

          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              onClick={() => {
                sounds.playToggle();
                setActiveMission(mission);
              }}
              className={`relative overflow-hidden rounded-2xl border p-6 cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-400 bg-slate-900/90 shadow-[0_0_30px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                  : 'border-slate-800 bg-slate-950/70 hover:border-cyan-500/40 hover:bg-slate-900/60'
              }`}
            >
              {/* Mission Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    {getCelestialIcon(mission.target)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-cyan-400 font-bold">{mission.code}</span>
                        {getDifficultyBadge(mission.difficulty)}
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {mission.name}
                      </h3>
                      <div className="text-xs text-slate-400">{mission.subtitle}</div>
                    </div>
                  </div>

                  {/* Reward badge */}
                  <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+{mission.rewardCredits} CR</span>
                  </div>
                </div>

                {/* Objective Description */}
                <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {mission.objective}
                </p>

                {/* Constraints Badges */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-800/80 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span>BUDGET</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">${mission.budget}M</div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                      <Weight className="w-3 h-3 text-blue-400" />
                      <span>MAX MASS</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">{mission.maxMassKg} kg</div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span>POWER CAP</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">{mission.maxPowerW} W</div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-purple-400" />
                      <span>WINDOW</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-0.5">{mission.missionWindowDays} d</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 flex items-center justify-between border-t border-slate-800/60">
                <span className="text-[11px] font-mono text-slate-500">
                  Target Distance: {mission.targetDistanceKm.toLocaleString()} km
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectMission(mission);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105 active:scale-95"
                >
                  <span>SELECT MISSION</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
