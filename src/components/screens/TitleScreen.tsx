'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { MISSIONS } from '@/data/missions';
import { NASA_PROVENANCE_CATALOG } from '@/data/nasa/metadata/provenanceCatalog';
import { HeroOrbitalVisual } from '@/components/canvas/HeroOrbitalVisual';
import { 
  Rocket, 
  HelpCircle, 
  Trophy, 
  Sliders, 
  Compass, 
  ArrowRight, 
  ShieldCheck, 
  Database, 
  Radio, 
  Cpu, 
  Search, 
  Activity, 
  AlertTriangle, 
  Globe, 
  Satellite 
} from 'lucide-react';
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
  const { setScreen, setActiveMission } = useGameStore();
  const [isStartHovered, setIsStartHovered] = useState(false);
  const [isDataHovered, setIsDataHovered] = useState(false);

  // Default featured mission: Lunar Explorer
  const featuredMission = MISSIONS[0];

  const handleLaunchFeatured = () => {
    sounds.playClick();
    setActiveMission(featuredMission);
    setScreen('briefing');
  };

  const handleSelectMission = (missionId: string) => {
    sounds.playClick();
    const found = MISSIONS.find(m => m.id === missionId) || featuredMission;
    setActiveMission(found);
    setScreen('briefing');
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 select-none flex flex-col space-y-16">
      
      {/* =========================================================================
          1. HERO BRIEFING SECTION
          ========================================================================= */}
      <section className="relative flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 pt-4 pb-8 border-b border-slate-800/80">
        
        {/* Left: Mission Command Header & CTAs */}
        <div className="w-full lg:w-7/12 text-left space-y-6">
          
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
              <span>NASA OPEN DATA × ASTRONAUTICAL SIMULATION</span>
            </div>
          </div>

          {/* Main Title Typography */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_35px_rgba(255,255,255,0.15)] font-mono leading-none">
              MISSION CONTROL
            </h1>
            <div className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 font-mono">
              BEYOND EARTH
            </div>
          </div>

          {/* Mission Subtitle & Philosophy */}
          <div className="space-y-2 max-w-xl">
            <p className="text-xs sm:text-sm font-mono text-cyan-400 font-semibold tracking-widest uppercase">
              NASA OPEN DATA // SPACE MISSION SIMULATION
            </p>
            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
              Design with real astronautical data. Make impossible engineering choices. Command robotic probes to lunar craters, Martian terrain, and deep-space asteroids.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-lg">
            {/* Primary CTA: START MISSION */}
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('missions');
              }}
              onMouseEnter={() => {
                setIsStartHovered(true);
                sounds.playHover();
              }}
              onMouseLeave={() => setIsStartHovered(false)}
              className="flex-1 flex items-center justify-center space-x-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wider font-mono shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:shadow-[0_0_40px_rgba(6,182,212,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Rocket className="w-4 h-4 text-slate-950" />
              <span>{isStartHovered ? 'INITIALIZE MISSION →' : 'START MISSION'}</span>
            </button>

            {/* Secondary CTA: EXPLORE NASA DATA */}
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('data_explorer');
              }}
              onMouseEnter={() => {
                setIsDataHovered(true);
                sounds.playHover();
              }}
              onMouseLeave={() => setIsDataHovered(false)}
              className="px-6 py-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 font-mono text-sm tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center space-x-2 hover:border-cyan-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>{isDataHovered ? 'ACCESS DATA ARCHIVE →' : 'EXPLORE NASA DATA'}</span>
            </button>

            {/* Tertiary CTA: HOW TO PLAY */}
            <button
              onClick={() => {
                sounds.playClick();
                onOpenTutorial();
              }}
              onMouseEnter={() => sounds.playHover()}
              className="px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-sm tracking-wider transition-all flex items-center justify-center space-x-1.5"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>HOW TO PLAY</span>
            </button>
          </div>

          {/* Live Mission Network Telemetry Strip */}
          <div className="pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
                <span className="font-bold tracking-wider">LIVE MISSION NETWORK</span>
              </div>
              <div className="flex items-center space-x-6 text-slate-300">
                <div>
                  <span className="text-slate-500 mr-1.5">DATA SOURCES:</span>
                  <span className="text-cyan-300 font-bold">{NASA_PROVENANCE_CATALOG.length}</span>
                </div>
                <div>
                  <span className="text-slate-500 mr-1.5">MISSIONS:</span>
                  <span className="text-cyan-300 font-bold">0{MISSIONS.length}</span>
                </div>
                <div className="hidden sm:inline">
                  <span className="text-slate-500 mr-1.5">SYSTEM READY:</span>
                  <span className="text-emerald-400 font-bold">98.4%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Sub-Navigation Bar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-slate-400 pt-1">
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('missions');
              }}
              className="hover:text-cyan-400 transition-colors flex items-center space-x-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>MISSIONS</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('data_sources');
              }}
              className="hover:text-emerald-400 transition-colors flex items-center space-x-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>NASA DATA SOURCES</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard();
              }}
              className="hover:text-amber-400 transition-colors flex items-center space-x-1.5"
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
              className="hover:text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>SETTINGS</span>
            </button>
          </div>

        </div>

        {/* Right: Realistic Mission-Control Orbital Visual */}
        <div className="w-full lg:w-5/12 flex flex-col items-center justify-center">
          <div className="relative p-2 rounded-2xl bg-slate-950/60 border border-slate-800/80 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <HeroOrbitalVisual size={400} />
            <div className="mt-2 text-center font-mono text-[11px] text-slate-400">
              ORBITAL TRACKING // DEEP SPACE NETWORK LOCK (8.4 GHz)
            </div>
          </div>
        </div>

      </section>

      {/* =========================================================================
          2. NEXT AVAILABLE MISSION & MISSION CATALOGUE
          ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-mono text-cyan-400 tracking-wider flex items-center space-x-1.5">
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              <span>ACTIVE MISSION ARCHIVE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide">
              FLIGHT PROFILES & TARGETS
            </h2>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              setScreen('missions');
            }}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 self-start sm:self-auto"
          >
            <span>VIEW ALL MISSIONS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Featured Mission Spotlight: Lunar Explorer */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold border-b border-l border-cyan-500/30 rounded-bl-xl flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>NEXT AVAILABLE MISSION</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Target Visual Badge */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              {/* Photorealistic Moon Sphere Representation */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-800 shadow-[0_0_30px_rgba(255,255,255,0.3)] relative overflow-hidden border border-slate-300/40">
                <div className="absolute top-3 left-4 w-6 h-5 rounded-full bg-slate-500/60" />
                <div className="absolute bottom-4 left-6 w-9 h-7 rounded-full bg-slate-600/70" />
                <div className="absolute top-8 right-3 w-5 h-8 rounded-full bg-slate-600/60" />
                {/* 3D Terminator Shadow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-transparent" />
              </div>
              <div className="mt-3 text-center">
                <div className="font-mono font-bold text-white text-sm">MOON</div>
                <div className="font-mono text-[10px] text-slate-400">ORBIT TARGET // 384,400 KM</div>
              </div>
            </div>

            {/* Mission Details */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {featuredMission.code}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  DIFFICULTY: NORMAL
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  BUDGET: ${featuredMission.budget}M
                </span>
              </div>

              <h3 className="text-2xl font-bold font-mono text-white">
                {featuredMission.name} — {featuredMission.subtitle}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {featuredMission.objective}
              </p>

              {/* Data & Science Provenance Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>NASA DATA // LRO LOLA & LROC WAC ARCHIVES</span>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-400">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>GAME SIMULATION ENGINE</span>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <button
                onClick={handleLaunchFeatured}
                className="w-full px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center space-x-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Rocket className="w-4 h-4 text-slate-950" />
                <span>INITIALIZE MISSION →</span>
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setScreen('data_explorer');
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-mono text-xs tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>VIEW LUNAR DATA</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mission 2: Mars Pathfinder */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
                  <span className="font-mono text-xs text-orange-400 font-bold">MARS // 225M KM</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ADVANCED
                </span>
              </div>
              <h4 className="font-mono font-bold text-white text-base">Mars Pathfinder</h4>
              <p className="text-xs text-slate-400 font-sans line-clamp-2">
                Survive deep-space cruise, execute Mars Orbit Insertion, and gather 110+ Science Points on Martian geology.
              </p>
              <div className="font-mono text-[10px] text-slate-500">
                DATA: MGS MOLA & MARS 2020
              </div>
            </div>
            <button
              onClick={() => handleSelectMission('mission-02')}
              className="w-full py-2 rounded-lg border border-slate-700 hover:border-cyan-500/40 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 font-mono text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>SELECT PROFILE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mission 3: Asteroid Surveyor */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.4)]" />
                  <span className="font-mono text-xs text-slate-300 font-bold">BENNU // 140M KM</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                  EXPERT
                </span>
              </div>
              <h4 className="font-mono font-bold text-white text-base">Asteroid Surveyor</h4>
              <p className="text-xs text-slate-400 font-sans line-clamp-2">
                Rendezvous with near-Earth asteroid 101955 Bennu in microgravity and execute laser altimetry surveys.
              </p>
              <div className="font-mono text-[10px] text-slate-500">
                DATA: OSIRIS-REx & DART
              </div>
            </div>
            <button
              onClick={() => handleSelectMission('mission-03')}
              className="w-full py-2 rounded-lg border border-slate-700 hover:border-cyan-500/40 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 font-mono text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>SELECT PROFILE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mission 4: Earth Observer */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="font-mono text-xs text-blue-400 font-bold">EARTH LEO // 700 KM</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  NORMAL
                </span>
              </div>
              <h4 className="font-mono font-bold text-white text-base">Earth Observer</h4>
              <p className="text-xs text-slate-400 font-sans line-clamp-2">
                Deploy a Sun-Synchronous climate sentinel to monitor polar ice sheets, deforestation, and greenhouse levels.
              </p>
              <div className="font-mono text-[10px] text-slate-500">
                DATA: BLUE MARBLE & LANDSAT 9
              </div>
            </div>
            <button
              onClick={() => handleSelectMission('mission-04')}
              className="w-full py-2 rounded-lg border border-slate-700 hover:border-cyan-500/40 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 font-mono text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <span>SELECT PROFILE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. LIVE NASA DATA NETWORK PREVIEW
          ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-mono text-emerald-400 tracking-wider flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>LIVE NASA DATA NETWORK</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide">
              AUTHENTIC OPEN SCIENCE DATASETS
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('data_sources');
              }}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>VIEW ALL {NASA_PROVENANCE_CATALOG.length} SOURCES</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Data Provenance Statement */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-mono text-xs text-white font-bold flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>TRACEABLE SCIENTIFIC PROVENANCE</span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Powered by publicly available NASA mission datasets, planetary elevation rasters, and Deep Space Network feeds. Every scientific dataset used in the simulation is traceable to its official source.
            </p>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              setScreen('data_sources');
            }}
            className="px-4 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold tracking-wider shrink-0 transition-all flex items-center space-x-1.5"
          >
            <span>VIEW SOURCES →</span>
          </button>
        </div>

        {/* Real Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: LRO */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 uppercase">PDS GEOSCIENCES</span>
                <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>AVAILABLE</span>
                </span>
              </div>
              <h4 className="font-mono font-bold text-white text-sm">LUNAR RECONNAISSANCE ORBITER</h4>
              <p className="text-xs text-slate-400 font-sans">
                LOLA laser altimetry topography and LROC camera global mosaics.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900 font-mono text-[10px] text-cyan-400">
              DATASET: LRO-L-LOLA-3-RDR
            </div>
          </div>

          {/* Card 2: MRO */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 uppercase">PDS IMAGING NODE</span>
                <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>AVAILABLE</span>
                </span>
              </div>
              <h4 className="font-mono font-bold text-white text-sm">MARS RECONNAISSANCE ORBITER</h4>
              <p className="text-xs text-slate-400 font-sans">
                High-resolution surface imaging and mineralogical spectral surveys.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900 font-mono text-[10px] text-cyan-400">
              DATASET: MRO-M-HIRISE-3-RDR
            </div>
          </div>

          {/* Card 3: Perseverance */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 uppercase">NASA JPL OPS</span>
                <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>AVAILABLE</span>
                </span>
              </div>
              <h4 className="font-mono font-bold text-white text-sm">MARS 2020 PERSEVERANCE</h4>
              <p className="text-xs text-slate-400 font-sans">
                Jezero crater surface imagery and atmospheric pressure telemetry.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900 font-mono text-[10px] text-cyan-400">
              DATASET: M2020-MEDA-ATMOS
            </div>
          </div>

          {/* Card 4: Earth Blue Marble */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 uppercase">NASA EARTH OBSERVATORY</span>
                <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>AVAILABLE</span>
                </span>
              </div>
              <h4 className="font-mono font-bold text-white text-sm">BLUE MARBLE MOSAIC</h4>
              <p className="text-xs text-slate-400 font-sans">
                MODIS global terrestrial surface reflectance and Rayleigh atmosphere.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900 font-mono text-[10px] text-cyan-400">
              DATASET: MODIS-TERRA-BMNG
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. BUILT AROUND REAL SPACE SCIENCE
          ========================================================================= */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-mono text-cyan-400 tracking-wider">
            SCIENTIFIC CREDIBILITY & ACCURACY
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wide">
            BUILT AROUND REAL SPACE SCIENCE
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            Every subsystem, orbit transition, and event adheres to real physical principles rather than fictional tropes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Real Data */}
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-mono font-bold text-white text-lg">REAL DATA</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Explore public NASA mission datasets, planetary digital elevation models, and Deep Space Network telemetry feeds. Every constant maps to real-world astronomy.
            </p>
          </div>

          {/* Card 2: Real Science */}
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-mono font-bold text-white text-lg">REAL SCIENCE</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Learn about spacecraft propulsion, delta-v orbital mechanics, solar irradiance dropoff, and space radiation shielding through active gameplay.
            </p>
          </div>

          {/* Card 3: Simulated Decisions */}
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-mono font-bold text-white text-lg">SIMULATED DECISIONS</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Experience genuine flight director engineering trade-offs under deterministic simulation rules with strict mass envelopes and finite budgets.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. MISSION WORKFLOW (GAME LOOP)
          ========================================================================= */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <div className="text-xs font-mono text-cyan-400 tracking-wider">
            FLIGHT DIRECTOR OPERATIONS
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide">
            MISSION LIFECYCLE PIPELINE
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { step: '01', title: 'RESEARCH', icon: Search, desc: 'Analyze target gravity & thermal profiles' },
            { step: '02', title: 'DESIGN', icon: Cpu, desc: 'Build bus, power, and scientific payload' },
            { step: '03', title: 'LAUNCH', icon: Rocket, desc: 'Execute staging & survive Max-Q forces' },
            { step: '04', title: 'OPERATE', icon: Activity, desc: 'Monitor telemetry & DSN carrier locks' },
            { step: '05', title: 'DECIDE', icon: AlertTriangle, desc: 'Command crisis mitigation protocols' },
            { step: '06', title: 'DISCOVER', icon: Compass, desc: 'Transmit planetary science back to Earth' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2 group hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">{item.step}</span>
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-white">{item.title}</div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5 leading-snug">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          6. HOW TO PLAY / FLIGHT MANUAL PREVIEW
          ========================================================================= */}
      <section className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-mono text-cyan-400 font-semibold tracking-wider flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>FLIGHT MANUAL BRIEFING</span>
            </div>
            <h3 className="text-lg font-mono font-bold text-white">
              HOW TO PLAY // 5 COMMAND RULES
            </h3>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onOpenTutorial();
            }}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>FULL MANUAL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-cyan-400 font-bold">01 DESIGN</span>
            <p className="text-slate-300 font-sans text-xs mt-1">
              Select spacecraft bus, propulsion thrusters, solar arrays, and scientific instrumentation.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-cyan-400 font-bold">02 TRADE</span>
            <p className="text-slate-300 font-sans text-xs mt-1">
              Balance payload mass against booster capacity and keep total expenditure within budget limits.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-cyan-400 font-bold">03 LAUNCH</span>
            <p className="text-slate-300 font-sans text-xs mt-1">
              Initiate ignition, monitor dynamic pressure (Max-Q), separate stages, and achieve orbital insertion.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-cyan-400 font-bold">04 DECIDE</span>
            <p className="text-slate-300 font-sans text-xs mt-1">
              Respond to space weather emergencies, radiation alerts, and telemetry signal dropouts.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-cyan-400 font-bold">05 DISCOVER</span>
            <p className="text-slate-300 font-sans text-xs mt-1">
              Survive mission duration to collect target science data and maximize your flight debrief score.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. PROFESSIONAL NASA-GRADE FOOTER
          ========================================================================= */}
      <footer className="border-t border-slate-800 pt-8 pb-12 text-slate-500 font-mono text-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-white font-bold text-sm tracking-wider flex items-center space-x-2">
              <span>MISSION CONTROL</span>
              <span className="text-slate-600">{"//"}</span>
              <span className="text-cyan-400">BEYOND EARTH</span>
            </div>
            <p className="text-slate-400 text-xs">
              NASA DATA-DRIVEN SPACE MISSION STRATEGY & FLIGHT SIMULATION
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('data_sources');
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              Data Provenance
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                sounds.playClick();
                setScreen('data_explorer');
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              NASA Data Explorer
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard();
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              Leaderboard
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                sounds.playClick();
                onOpenTutorial();
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              Flight Manual
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-[11px] leading-relaxed text-slate-400 font-sans space-y-1.5">
          <div className="font-mono text-[10px] text-slate-400 uppercase font-semibold">
            SCIENTIFIC DATA PROVENANCE & AFFILIATION NOTICE
          </div>
          <p>
            This application is an independent educational simulation game inspired by NASA mission engineering and flight operations. It is not an official NASA product and is not affiliated with, sponsored by, or endorsed by NASA.
          </p>
          <p>
            Scientific physical parameters, astronomical ephemerides, planetary surface elevations, and imagery are sourced from publicly available datasets provided by the NASA Planetary Data System (PDS), NASA Goddard Space Flight Center (NSSDC), and NOAA Space Weather Prediction Center.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>© 2026 Mission Control: Beyond Earth. Open astronautical simulation.</div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>ALL SYSTEMS NOMINAL</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
