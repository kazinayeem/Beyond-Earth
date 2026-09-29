'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Volume2, VolumeX, Trophy, Award, HelpCircle, Sliders, Home, Compass } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface TopNavProps {
  onOpenTutorial: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
}

export const TopNavHeader: React.FC<TopNavProps> = ({
  onOpenTutorial,
  onOpenLeaderboard,
  onOpenAchievements,
  onOpenSettings
}) => {
  const { screen, setScreen, credits, isMuted, toggleMute, activeMission } = useGameStore();
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative z-40 w-full px-4 py-2.5 bg-slate-950/80 backdrop-blur-md border-b border-cyan-500/20 text-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand & Flight Center */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setScreen('title')}
            className="flex items-center space-x-2.5 text-left group"
          >
            {/* NASA-inspired meatball/vector emblem */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black tracking-widest text-white flex items-center space-x-1.5 font-mono">
                <span>MISSION CONTROL</span>
                <span className="text-[10px] px-1 py-0.2 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30">
                  SIM
                </span>
              </div>
              <div className="text-[10px] font-mono text-cyan-400/80">BEYOND EARTH // NASA SPEC</div>
            </div>
          </button>

          {/* Active Mission Pill */}
          {screen !== 'title' && screen !== 'missions' && (
            <div className="hidden sm:flex items-center space-x-2 pl-3 ml-2 border-l border-slate-800">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-slate-300 font-semibold">{activeMission.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {activeMission.code}
              </span>
            </div>
          )}
        </div>

        {/* Center: Live UTC Mission Clock */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-cyan-300">
          <span className="text-slate-500">MET:</span>
          <span>{utcTime}</span>
        </div>

        {/* Right: Credits & Controls */}
        <div className="flex items-center space-x-2">
          {/* Player Credits */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="text-slate-400">CR:</span>
            <span className="font-bold">{credits.toLocaleString()}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* NASA Data Explorer */}
          <button
            onClick={() => {
              sounds.playClick();
              setScreen('data_explorer');
            }}
            className={`p-2 rounded-lg border transition-colors flex items-center space-x-1 ${
              screen === 'data_explorer'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white'
            }`}
            title="Explore NASA Datasets"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline text-[11px] font-mono font-bold text-cyan-300">NASA DATA</span>
          </button>

          {/* NASA Data Sources */}
          <button
            onClick={() => {
              sounds.playClick();
              setScreen('data_sources');
            }}
            className={`p-2 rounded-lg border transition-colors flex items-center space-x-1 ${
              screen === 'data_sources'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white'
            }`}
            title="NASA Data Provenance & Sources"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline text-[11px] font-mono text-emerald-300">SOURCES</span>
          </button>

          {/* Achievements Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenAchievements();
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors"
            title="Achievements"
          >
            <Award className="w-4 h-4 text-purple-400" />
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenLeaderboard();
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors"
            title="Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>

          {/* Tutorial Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenTutorial();
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors"
            title="Flight Manual & Tutorial"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenSettings();
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors"
            title="Settings"
          >
            <Sliders className="w-4 h-4 text-slate-300" />
          </button>

          {/* Home button (if not on title) */}
          {screen !== 'title' && (
            <button
              onClick={() => setScreen('title')}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors"
              title="Return to Main Title"
            >
              <Home className="w-4 h-4 text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
