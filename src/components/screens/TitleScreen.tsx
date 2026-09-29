'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Rocket, HelpCircle, Trophy, Sliders, Compass, ArrowRight, ShieldCheck } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface TitleScreenProps {
  onOpenTutorial: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onOpenTutorial,
  onOpenLeaderboard,
  onOpenSettings
}) => {
  const { setScreen } = useGameStore();

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-70px)] px-4 py-12 text-center select-none">
      {/* Decorative Celestial Earth/Moon Horizon */}
      <div className="relative mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="relative inline-block"
        >
          {/* Outer glow ring */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-900 p-1 shadow-[0_0_80px_rgba(6,182,212,0.5)]">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden relative">
              {/* Crescent earth limb */}
              <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-transparent opacity-80" />
              <Compass className="w-14 h-14 sm:w-16 sm:h-16 text-cyan-300 relative z-10 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]" />
            </div>
          </div>

          {/* Distant moon satellite orb */}
          <motion.div
            animate={{
              x: [0, 8, 0],
              y: [0, -6, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-3 -right-4 w-7 h-7 rounded-full bg-slate-300 shadow-[0_0_20px_rgba(255,255,255,0.7)] border border-slate-400"
          />
        </motion.div>
      </div>

      {/* Main Title Badge */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="space-y-3 max-w-3xl"
      >
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-xs font-mono text-cyan-400 tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>NASA-INSPIRED FLIGHT DIRECTOR STRATEGY SIMULATION</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">
          MISSION CONTROL
        </h1>

        <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
          BEYOND EARTH
        </div>

        <p className="text-sm sm:text-base font-mono text-slate-400 tracking-widest uppercase pt-2">
          Design. Launch. Survive. Discover.
        </p>
      </motion.div>

      {/* Menu Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md"
      >
        <button
          onClick={() => setScreen('missions')}
          className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wider font-mono shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Rocket className="w-4 h-4" />
          <span>START MISSION</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onOpenTutorial();
          }}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-cyan-500/30 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 hover:text-white font-mono text-sm tracking-wider transition-all"
        >
          HOW TO PLAY
        </button>
      </motion.div>

      {/* Secondary Quick Action Links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="mt-8 flex items-center space-x-6 text-xs font-mono text-slate-400"
      >
        <button
          onClick={() => {
            sounds.playClick();
            setScreen('missions');
          }}
          className="hover:text-cyan-400 transition-colors flex items-center space-x-1"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>MISSIONS</span>
        </button>
        <span className="text-slate-700">|</span>
        <button
          onClick={() => {
            sounds.playClick();
            onOpenLeaderboard();
          }}
          className="hover:text-amber-400 transition-colors flex items-center space-x-1"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>LEADERBOARD</span>
        </button>
        <span className="text-slate-700">|</span>
        <button
          onClick={() => {
            sounds.playClick();
            onOpenSettings();
          }}
          className="hover:text-slate-200 transition-colors flex items-center space-x-1"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>SETTINGS</span>
        </button>
      </motion.div>

      {/* Bottom Technical Note */}
      <div className="mt-16 text-[11px] font-mono text-slate-600">
        POWERED BY NASA OPEN MISSION DATA & ASTRONAUTICAL SIMULATION ENGINE
      </div>
    </div>
  );
};
