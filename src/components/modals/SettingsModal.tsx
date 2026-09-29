'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, RotateCcw, Sliders } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { sounds } from '@/lib/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { isMuted, toggleMute, reducedMotion, toggleReducedMotion } = useGameStore();
  const [, setVolState] = useState(0);

  if (!isOpen) return null;

  const handleResetProgress = () => {
    if (typeof window !== 'undefined') {
      const confirmReset = window.confirm(
        'Are you sure you want to reset all mission records, credits, and achievements?'
      );
      if (confirmReset) {
        localStorage.removeItem('beyond_earth_credits');
        localStorage.removeItem('beyond_earth_achievements');
        localStorage.removeItem('beyond_earth_leaderboard');
        window.location.reload();
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/30">
                <Sliders className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white">System Settings</h3>
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

          <div className="my-6 space-y-4">
            {/* Audio Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-cyan-400" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">Telemetry & SFX Audio</div>
                    <div className="text-xs text-slate-400">Web Audio synthesis sound effects</div>
                  </div>
                </div>
                <button
                  onClick={toggleMute}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                    !isMuted
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {!isMuted ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              {/* Volume Sliders */}
              {!isMuted && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">MASTER</span>
                    <span className="text-cyan-400 font-bold">{Math.round(sounds.getVolumes().master * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sounds.getVolumes().master}
                    onChange={(e) => {
                      sounds.setMasterVolume(parseFloat(e.target.value));
                      // Force re-render of modal
                      setVolState(s => s + 1);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px]">SFX (RUMBLE / CHIRP)</span>
                    <span className="text-cyan-400 font-bold">{Math.round(sounds.getVolumes().sfx * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sounds.getVolumes().sfx}
                    onChange={(e) => {
                      sounds.setSfxVolume(parseFloat(e.target.value));
                      setVolState(s => s + 1);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px]">AMBIENT (ROOM / VACUUM)</span>
                    <span className="text-cyan-400 font-bold">{Math.round(sounds.getVolumes().ambient * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sounds.getVolumes().ambient}
                    onChange={(e) => {
                      sounds.setAmbientVolume(parseFloat(e.target.value));
                      setVolState(s => s + 1);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* Reduced Motion Toggle (Accessibility) */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <div className="text-sm font-semibold text-white">Reduced Motion Mode</div>
                <div className="text-xs text-slate-400">Disables launch screen shake & particles</div>
              </div>
              <button
                onClick={toggleReducedMotion}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                  reducedMotion
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {reducedMotion ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Display FPS target info */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold">Simulation Engine</div>
              <div>Renderer: Canvas 2D + WebGL Particle Shader</div>
              <div>Telemetry Refresh: 60 Hz Lockstep</div>
            </div>

            {/* Reset Data Button */}
            <div className="pt-2">
              <button
                onClick={handleResetProgress}
                className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-mono transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESET LOCAL PROGRESS & CACHE</span>
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] font-mono text-slate-500">
            MISSION CONTROL: BEYOND EARTH v1.0.4
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
