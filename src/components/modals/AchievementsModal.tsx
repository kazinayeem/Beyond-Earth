'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, CheckCircle2, Lock } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { sounds } from '@/lib/sound';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose }) => {
  const { achievements } = useGameStore();

  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-mono text-cyan-400 tracking-wider">
                  FLIGHT MERIT CITATIONS // {unlockedCount} / {achievements.length} UNLOCKED
                </div>
                <h3 className="text-xl font-bold text-white">Engineering Achievements</h3>
              </div>
            </div>
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid */}
          <div className="overflow-y-auto flex-1 my-4 space-y-3 pr-1">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                  ach.unlocked
                    ? 'bg-slate-950/80 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="text-2xl p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                    {ach.icon}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">{ach.title}</span>
                      {ach.unlocked ? (
                        <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>UNLOCKED</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ach.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 text-center text-xs font-mono text-slate-500">
            ACHIEVEMENTS EARNED REPUTATION & BONUS MISSION DESIGN CREDITS
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
