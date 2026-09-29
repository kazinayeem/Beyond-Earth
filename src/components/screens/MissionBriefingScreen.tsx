'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { ArrowRight, ArrowLeft, Target, DollarSign, Weight, Zap, Calendar, Award, ShieldAlert, BookOpen, Compass } from 'lucide-react';
import { sounds } from '@/lib/sound';

export const MissionBriefingScreen: React.FC = () => {
  const { activeMission, setScreen } = useGameStore();

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 select-none">
      {/* Top back button */}
      <button
        onClick={() => setScreen('missions')}
        className="flex items-center space-x-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>RETURN TO MISSION MANIFEST</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] text-slate-100"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              {activeMission.target === 'Moon' ? '🌙' : activeMission.target === 'Mars' ? '🔴' : activeMission.target === 'Asteroid' ? '☄️' : '🌍'}
            </div>
            <div>
              <div className="text-xs font-mono text-cyan-400 flex items-center space-x-2">
                <span>MISSION DIRECTIVE</span>
                <span>{"//"}</span>
                <span>{activeMission.code}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                {activeMission.name}
              </h2>
              <div className="text-xs text-slate-400 font-mono">{activeMission.subtitle}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-lg text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              TARGET: {activeMission.target.toUpperCase()}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              REWARD: +{activeMission.rewardCredits} CR
            </span>
          </div>
        </div>

        {/* Primary Objective Banner */}
        <div className="my-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="text-xs font-mono text-cyan-400 flex items-center space-x-2 mb-1.5">
            <Target className="w-4 h-4 text-cyan-400" />
            <span>PRIMARY FLIGHT OBJECTIVE</span>
          </div>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
            {activeMission.objective}
          </p>
          <div className="mt-3 flex items-center space-x-4 text-xs font-mono text-slate-400">
            <span>Mandatory Science Threshold: <strong className="text-purple-400">{activeMission.minScienceRequired} pts</strong></span>
            <span>|</span>
            <span>Safety Limit: <strong className="text-emerald-400">&lt; 50% Risk</strong></span>
          </div>
        </div>

        {/* Engineering Resource Constraints */}
        <div className="my-6">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
            Mission Flight Constraints
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>BUDGET CAP</span>
              </div>
              <div className="text-white font-bold text-lg mt-1">${activeMission.budget}M</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Launcher + Spacecraft</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                <Weight className="w-3.5 h-3.5 text-blue-400" />
                <span>MAX PAYLOAD</span>
              </div>
              <div className="text-white font-bold text-lg mt-1">{activeMission.maxMassKg} kg</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Dry mass ceiling</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>MAX POWER</span>
              </div>
              <div className="text-white font-bold text-lg mt-1">{activeMission.maxPowerW} W</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Electrical capacity</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>WINDOW</span>
              </div>
              <div className="text-white font-bold text-lg mt-1">{activeMission.missionWindowDays} Days</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Nominal timeline</div>
            </div>
          </div>
        </div>

        {/* Environmental Telemetry & Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 text-xs font-mono">
          {/* Target Environment */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold flex items-center space-x-1.5 pb-1 border-b border-slate-800">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>DESTINATION ENVIRONMENTAL PROFILE</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Surface Gravity:</span>
              <span className="text-slate-200">{activeMission.targetDetails.gravity}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Atmospheric Density:</span>
              <span className="text-slate-200">{activeMission.targetDetails.atmosphere}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Thermal Extremes:</span>
              <span className="text-slate-200">{activeMission.targetDetails.avgTemp}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Radiation Environment:</span>
              <span className="text-slate-200">{activeMission.targetDetails.radiation}</span>
            </div>
          </div>

          {/* Flight Director Advisory */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-amber-400 font-bold flex items-center space-x-1.5 pb-1 border-b border-slate-800">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>RECOMMENDED FLIGHT STRATEGY</span>
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-sans">
                {activeMission.recommendedStrategy}
              </p>
            </div>
            <div className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-800/80">
              {activeMission.nasaInspiration}
            </div>
          </div>
        </div>

        {/* Action Call */}
        <div className="pt-6 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400">
            Awaiting Flight Director spacecraft engineering specifications.
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              setScreen('builder');
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-sm tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all"
          >
            <span>BEGIN MISSION DESIGN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
