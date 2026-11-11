'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { MISSIONS } from '@/data/missions';
import { NASA_PROVENANCE_CATALOG as DATA_SOURCES } from '@/data/nasa/metadata/provenanceCatalog';
import { HeroOrbitalVisual } from '@/components/canvas/HeroOrbitalVisual';
import { 
  Rocket, 
  HelpCircle, 
  ShieldCheck, 
  ArrowRight, 
  Radio, 
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { PlayedByBadge } from '@/components/ui/PlayedByBadge';

interface TitleScreenProps {
  onOpenTutorial: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onOpenTutorial }) => {
  const setScreen = useGameStore(s => s.setScreen);
  const achievements = useGameStore(s => s.achievements);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none flex-1 flex flex-col justify-center">
      
      {/* =========================================================================
          1. HERO BRIEFING SECTION
          ========================================================================= */}
      <section className="relative flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-14">
        
        {/* Left: Mission Command Header & CTAs */}
        <div className="w-full lg:w-7/12 text-left space-y-5 hero-stagger">
          
          {/* Top Status & Integrity Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Launch System Status */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-xs font-mono text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold tracking-wider">MISSION SYSTEMS READY</span>
            </div>

            {/* Scientific Provenance Tag */}
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>REAL SPACE DATA × FLIGHT SIMULATION</span>
            </div>
          </div>

          {/* Main Title Typography */}
          <div className="space-y-1">
            <h1 className="font-display text-5xl sm:text-7xl lg:text-[5rem] font-bold tracking-[-0.01em] text-white uppercase leading-[0.92] hero-title">
              Mission Control
            </h1>
            <div className="font-display text-2xl sm:text-4xl lg:text-5xl font-light tracking-[0.32em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300">
              Beyond Earth
            </div>
          </div>

          {/* Mission Subtitle & Philosophy */}
          <div className="space-y-2 max-w-xl">
            <p className="text-xs sm:text-sm font-mono text-cyan-400 font-semibold tracking-widest uppercase">
              SPACE MISSION SIMULATION
            </p>
            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
              Design with real astronautical data. Make impossible engineering choices. Command robotic probes to lunar craters, Martian terrain, and deep-space asteroids.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 max-w-2xl whitespace-nowrap">
            {/* Primary CTA: START MISSION */}
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('missions');
              }}
              onMouseEnter={() => sounds.playHover()}
              className="cta-primary group sm:flex-none flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-slate-950 font-semibold text-sm tracking-[0.12em] font-mono"
            >
              {/* Fixed label and a fixed-width arrow slot, so hovering never changes the button's size */}
              <Rocket className="w-4 h-4 text-slate-950 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span>START MISSION</span>
              <ArrowRight className="w-4 h-4 text-slate-950 opacity-0 -translate-x-1.5 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0" aria-hidden />
            </button>

            {/* Tertiary CTA: HOW TO PLAY */}
            <button
              onClick={() => {
                sounds.playClick();
                onOpenTutorial();
              }}
              onMouseEnter={() => sounds.playHover()}
              className="cta-ghost px-5 py-3.5 rounded-xl text-slate-300 hover:text-white font-mono text-sm tracking-wider flex items-center justify-center space-x-1.5"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>HOW TO PLAY</span>
            </button>
          </div>

          {/* Social proof */}
          <PlayedByBadge />

          {/* Live Mission Network Telemetry Strip (hidden on short screens so the hero fits one screen) */}
          <div className="pt-1 [@media(max-height:760px)]:hidden">
            <div className="p-3.5 rounded-xl glass-panel flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
                <span className="font-bold tracking-wider">LIVE MISSION NETWORK</span>
              </div>
              <div className="flex items-center space-x-6 text-slate-300">
                <div>
                  <span className="text-slate-500 mr-1.5">DATA SOURCES:</span>
                  <span className="text-cyan-300 font-bold">{DATA_SOURCES.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 mr-1.5">MISSIONS:</span>
                  <span className="text-cyan-300 font-bold">0{MISSIONS.length}</span>
                </div>
                <div className="hidden sm:inline">
                  <span className="text-slate-500 mr-1.5">ACHIEVEMENTS:</span>
                  <span className="text-emerald-400 font-bold" suppressHydrationWarning>{unlockedCount}/{achievements.length}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Realistic Mission-Control Orbital Visual */}
        <div className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center">
          <div className="relative hero-earth">
            <HeroOrbitalVisual size={440} />
          </div>
        </div>

      </section>

    </div>
  );
};
