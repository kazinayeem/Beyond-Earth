'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Award, Flame, Calendar, User } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { sounds } from '@/lib/sound';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const { leaderboard } = useGameStore();
  const [sortBy, setSortBy] = useState<'score' | 'science' | 'safety'>('score');

  if (!isOpen) return null;

  const sortedList = [...leaderboard].sort((a, b) => b[sortBy] - a[sortBy]);

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
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-mono text-cyan-400 tracking-wider">GLOBAL FLIGHT LOG ARCHIVES</div>
                <h3 className="text-xl font-bold text-white">Mission Director Leaderboard</h3>
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

          {/* Sort Controls */}
          <div className="flex items-center justify-between my-4 text-xs font-mono text-slate-400">
            <span>SORT RECORDS BY:</span>
            <div className="flex space-x-2">
              {(['score', 'science', 'safety'] as const).map((criteria) => (
                <button
                  key={criteria}
                  onClick={() => {
                    sounds.playClick();
                    setSortBy(criteria);
                  }}
                  className={`px-3 py-1 rounded-lg border transition-all ${
                    sortBy === criteria
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {criteria.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-2.5">
            {sortedList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-sm">
                No mission logs recorded yet. Launch a mission to register your record!
              </div>
            ) : (
              sortedList.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all text-xs font-mono"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : idx === 1
                          ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40'
                          : idx === 2
                          ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-white font-semibold">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{entry.playerName}</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{entry.missionName}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold text-sm">{entry.score} pts</div>
                      <div className="text-slate-500 text-[10px]">
                        Sci: {entry.science} | Saf: {entry.safety}%
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        entry.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>NASA FLIGHT DIRECTOR REGISTRY</span>
            <span>STORED LOCALLY</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
