'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  DollarSign, 
  Flame, 
  Calendar, 
  Compass, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { sounds } from '@/lib/sound';

interface DebriefProps {
  onOpenLeaderboard: () => void;
}

export const DebriefScreen: React.FC<DebriefProps> = ({ onOpenLeaderboard }) => {
  const { debriefResult, resetForNewMission, setScreen } = useGameStore();

  useEffect(() => {
    if (debriefResult && debriefResult.status === 'SUCCESS') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }
  }, [debriefResult]);

  if (!debriefResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center text-slate-400 font-mono">
        No mission debrief on record.
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (debriefResult.status) {
      case 'SUCCESS':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>PRIMARY MISSION SUCCESS</span>
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>PARTIAL MISSION SUCCESS</span>
          </span>
        );
      case 'FAILURE':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-mono font-bold">
            <XCircle className="w-4 h-4 text-red-400" />
            <span>MISSION ANOMALY FAILURE</span>
          </span>
        );
    }
  };

  return (
    <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 select-none flex flex-col min-h-[calc(100vh-80px)] justify-between">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-slate-100"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 flex items-center space-x-2">
              <span>NASA FLIGHT DIRECTOR DEBRIEFING REPORT</span>
              <span>{"//"}</span>
              <span>POST-FLIGHT EVALUATION</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase mt-1">
              {debriefResult.missionName}
            </h2>
            <div className="text-xs font-mono text-slate-400 mt-1">
              Flight Telemetry & Engineering Decision Analysis
            </div>
          </div>

          <div>{getStatusBadge()}</div>
        </div>

        {/* Big Overall Rating Card */}
        <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <Trophy className="w-10 h-10 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
                FLIGHT DIRECTOR CITATION
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                {debriefResult.rankTitle}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                Official NASA Flight Performance Rating
              </div>
            </div>
          </div>

          <div className="text-center md:text-right">
            <div className="text-xs font-mono text-slate-400">TOTAL FLIGHT SCORE</div>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono">
              {debriefResult.totalScore}
              <span className="text-xl text-slate-500"> / 100</span>
            </div>
          </div>
        </div>

        {/* 4 Score Indicators (Science, Safety, Budget, Efficiency) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-slate-500 text-[10px] flex items-center justify-between">
              <span>SCIENCE RATING</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-purple-300 font-bold text-xl mt-1">
              {debriefResult.scienceScore}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-purple-400"
                style={{ width: `${debriefResult.scienceScore}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-slate-500 text-[10px] flex items-center justify-between">
              <span>SAFETY RATING</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-emerald-400 font-bold text-xl mt-1">
              {debriefResult.safetyScore}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${debriefResult.safetyScore}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-slate-500 text-[10px] flex items-center justify-between">
              <span>BUDGET EFFICIENCY</span>
              <DollarSign className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-blue-400 font-bold text-xl mt-1">
              {debriefResult.budgetScore}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-blue-400"
                style={{ width: `${debriefResult.budgetScore}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-slate-500 text-[10px] flex items-center justify-between">
              <span>MISSION EFFICIENCY</span>
              <Flame className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-orange-400 font-bold text-xl mt-1">
              {debriefResult.efficiencyScore}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-orange-400"
                style={{ width: `${debriefResult.efficiencyScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mission Telemetry Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">SCIENCE COLLECTED</span>
            <span className="text-white font-bold text-sm">
              {debriefResult.scienceCollected} / {debriefResult.targetScience} pts
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">DOWNLINKED DATA</span>
            <span className="text-cyan-400 font-bold text-sm">
              {(debriefResult.scienceCollected * 0.048).toFixed(1)} Terabytes
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">FUEL REMAINING</span>
            <span className="text-orange-400 font-bold text-sm">
              {debriefResult.fuelRemainingPct}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">FLIGHT DURATION</span>
            <span className="text-slate-200 font-bold text-sm">
              {debriefResult.missionDurationDays} Days
            </span>
          </div>
        </div>

        {/* Decision Analysis (Key Decisions Timeline) */}
        <div className="my-6">
          <div className="text-xs font-mono text-cyan-400 font-bold mb-3 flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>FLIGHT DIRECTOR DECISION ANALYSIS</span>
          </div>

          {debriefResult.decisions.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-500 italic">
              Nominal flight executed without critical emergency directives.
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {debriefResult.decisions.map((dec) => (
                <div
                  key={dec.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span className="text-cyan-400">[{dec.timestamp}] {dec.title}</span>
                    <span className="text-[11px] text-slate-400">{dec.chosenOptionLabel}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">{dec.impactSummary}</div>
                  <div className="mt-2 flex space-x-3 text-[10px]">
                    {dec.scienceDelta !== 0 && (
                      <span className={dec.scienceDelta > 0 ? 'text-purple-400' : 'text-red-400'}>
                        Science {dec.scienceDelta > 0 ? `+${dec.scienceDelta}` : dec.scienceDelta}
                      </span>
                    )}
                    {dec.riskDelta !== 0 && (
                      <span className={dec.riskDelta < 0 ? 'text-emerald-400' : 'text-red-400'}>
                        Risk {dec.riskDelta < 0 ? `${dec.riskDelta}%` : `+${dec.riskDelta}%`}
                      </span>
                    )}
                    {dec.fuelDelta !== 0 && (
                      <span className={dec.fuelDelta > 0 ? 'text-emerald-400' : 'text-orange-400'}>
                        Fuel {dec.fuelDelta > 0 ? `+${dec.fuelDelta}%` : `${dec.fuelDelta}%`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: WHAT REAL NASA DATA INFORMED */}
        <div className="my-6 p-4 rounded-xl bg-slate-950/70 border border-cyan-500/20 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-mono text-cyan-300 font-bold">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>WHAT REAL NASA DATA INFORMED</span>
            </span>
            <span className="text-slate-500 text-[10px]">SCIENTIFIC REALITY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 font-sans text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="font-mono text-white font-semibold text-xs mb-1">Polar Cold Traps (PSRs)</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                NASA Diviner &amp; Mini-RF confirmed water ice deposits preserved at 25 K in shadowed craters like Shackleton and Faustini.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="font-mono text-white font-semibold text-xs mb-1">Deep Space Radiation</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                LRO CRaTER detectors measured 60 µSv/hr cosmic ray dosage, verifying proton storm risks to deep-space avionics.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="font-mono text-white font-semibold text-xs mb-1">Global 3D Geodetics</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                LOLA laser altimetry supplied the millimeter-accurate topography models enabling pinpoint autonomous landing site validation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-6 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard();
              }}
              className="px-4 py-3 rounded-xl border border-amber-500/40 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 font-mono text-xs tracking-wider transition-all"
            >
              VIEW LEADERBOARD
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('data_sources');
              }}
              className="px-4 py-3 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 font-mono text-xs tracking-wider transition-all"
            >
              NASA DATA SOURCES
            </button>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              resetForNewMission();
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-sm tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>START NEXT MISSION</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
