'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { SPACECRAFT_COMPONENTS } from '@/data/components';
import { ComponentCategory, SpacecraftComponent } from '@/types/game';
import { SpacecraftBlueprintCanvas } from '@/components/canvas/SpacecraftBlueprintCanvas';
import { 
  Box, 
  Camera, 
  Sun, 
  Wifi, 
  Flame, 
  Layers, 
  Locate, 
  AlertOctagon, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Trash2, 
  RotateCcw, 
  DollarSign, 
  Weight, 
  Zap, 
  Gauge, 
  ShieldAlert 
} from 'lucide-react';
import { sounds } from '@/lib/sound';

const CATEGORIES: { id: ComponentCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'structure', label: 'Structure', icon: <Box className="w-4 h-4" /> },
  { id: 'instruments', label: 'Instruments', icon: <Camera className="w-4 h-4" /> },
  { id: 'power', label: 'Power', icon: <Sun className="w-4 h-4" /> },
  { id: 'communication', label: 'Comms', icon: <Wifi className="w-4 h-4" /> },
  { id: 'propulsion', label: 'Propulsion', icon: <Flame className="w-4 h-4" /> },
  { id: 'thermal', label: 'Thermal', icon: <Layers className="w-4 h-4" /> },
  { id: 'navigation', label: 'Navigation', icon: <Locate className="w-4 h-4" /> }
];

export const SpacecraftBuilderScreen: React.FC = () => {
  const {
    activeMission,
    selectedComponentIds,
    toggleComponent,
    clearComponents,
    loadRecommendedBuild,
    totalCostM,
    totalMassKg,
    powerGeneratedW,
    powerConsumedW,
    netPowerW,
    fuelCapacityPct,
    calculatedRiskPct,
    sciencePotential,
    activeSynergies,
    isTooHeavy,
    isPowerDeficit,
    isBudgetExceeded,
    hasInstruments,
    hasPowerSource,
    hasComm,
    hasPropulsion,
    canLaunch,
    setScreen
  } = useGameStore();

  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('instruments');

  const filteredComponents = SPACECRAFT_COMPONENTS.filter((c) => c.category === activeCategory);
  const selectedComponents = SPACECRAFT_COMPONENTS.filter((c) => selectedComponentIds.includes(c.id));

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 select-none flex flex-col min-h-[calc(100vh-80px)] justify-between">
      {/* Top Header & Presets */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-cyan-500/20 gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setScreen('briefing')}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[11px] font-mono text-cyan-400 flex items-center space-x-2">
                <span>STAGE 02: PAYLOAD ENGINEERING</span>
                <span>//</span>
                <span>{activeMission.name}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                Spacecraft Systems Builder
              </h2>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <button
              onClick={loadRecommendedBuild}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>OPTIMAL PRESET</span>
            </button>
            <button
              onClick={clearComponents}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-300 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR</span>
            </button>
          </div>
        </div>

        {/* 3-Column Layout: Left (Categories & Catalog), Center (Live Blueprint Canvas), Right (Selected Inventory & Synergies) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
          {/* LEFT: Category Tabs & Component Catalog (4 cols) */}
          <div className="lg:col-span-4 flex flex-col space-y-3">
            {/* Category Pills */}
            <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const count = selectedComponents.filter((c) => c.category === cat.id).length;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      sounds.playToggle();
                      setActiveCategory(cat.id);
                    }}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                    {count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center justify-center ml-1">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Component Cards */}
            <div className="flex-1 overflow-y-auto max-h-[440px] space-y-2.5 pr-1">
              {filteredComponents.map((comp) => {
                const isEquipped = selectedComponentIds.includes(comp.id);

                return (
                  <div
                    key={comp.id}
                    onClick={() => toggleComponent(comp.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isEquipped
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-white">{comp.name}</span>
                          {isEquipped && (
                            <span className="w-4 h-4 rounded bg-cyan-400 text-slate-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{comp.description}</p>
                      </div>
                    </div>

                    {/* Trade-off tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                        ${comp.costM}M
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400">
                        {comp.massKg} kg
                      </span>

                      {comp.powerGeneratedW ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/40 text-amber-300">
                          +{comp.powerGeneratedW}W Gen
                        </span>
                      ) : comp.powerW > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-yellow-400">
                          {comp.powerW}W Draw
                        </span>
                      ) : null}

                      {comp.scienceValue ? (
                        <span className="px-2 py-0.5 rounded bg-purple-950/50 border border-purple-500/40 text-purple-300 font-bold">
                          +{comp.scienceValue} Science
                        </span>
                      ) : null}

                      {comp.fuelCapacityPct ? (
                        <span className="px-2 py-0.5 rounded bg-orange-950/50 border border-orange-500/40 text-orange-300">
                          +{comp.fuelCapacityPct}% Fuel
                        </span>
                      ) : null}

                      {comp.riskModPct !== 0 && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            comp.riskModPct < 0
                              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                              : 'bg-red-950/50 border-red-500/40 text-red-300'
                          }`}
                        >
                          {comp.riskModPct > 0 ? `+${comp.riskModPct}% Risk` : `${comp.riskModPct}% Risk`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER: Interactive Blueprint Schematic Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col justify-center">
              <SpacecraftBlueprintCanvas
                selectedComponentIds={selectedComponentIds}
                totalMassKg={totalMassKg}
                totalCostM={totalCostM}
                netPowerW={netPowerW}
              />
            </div>
          </div>

          {/* RIGHT: Equipped Manifest & Active Synergies (3 cols) */}
          <div className="lg:col-span-3 flex flex-col space-y-3">
            {/* Synergies Panel */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-purple-400 mb-2">
                <span className="flex items-center space-x-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>INSTRUMENT SYNERGIES</span>
                </span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 border border-purple-500/40 text-[10px]">
                  {activeSynergies.length} ACTIVE
                </span>
              </div>

              {activeSynergies.length === 0 ? (
                <div className="text-[11px] text-slate-500 font-mono italic">
                  Pair complementary sensors (e.g. Camera + Spectrometer or Radar + LIDAR) to trigger scientific bonuses.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSynergies.map((syn) => (
                    <div
                      key={syn.id}
                      className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs"
                    >
                      <div className="font-semibold text-purple-200 flex items-center justify-between">
                        <span>{syn.name}</span>
                        <span className="text-purple-300 font-mono font-bold">+{syn.bonusScience} Sci</span>
                      </div>
                      <div className="text-[10px] text-purple-300/80 mt-1 leading-tight">
                        {syn.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipped Components List */}
            <div className="flex-1 rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 flex flex-col">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>INSTALLED MODULES</span>
                <span>{selectedComponents.length} ITEMS</span>
              </div>

              <div className="overflow-y-auto max-h-[220px] space-y-1.5 pr-1 flex-1">
                {selectedComponents.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 font-mono text-xs">
                    No components installed.
                  </div>
                ) : (
                  selectedComponents.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs group"
                    >
                      <div className="truncate mr-2">
                        <div className="font-medium text-white truncate">{c.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {c.massKg}kg | {c.powerW > 0 ? `${c.powerW}W` : `+${c.powerGeneratedW}W`}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleComponent(c.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Remove component"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Live Resource Telemetry Dashboard & Validation Status */}
      <div className="mt-5 p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-[0_0_30px_rgba(2,6,23,0.8)]">
        {/* Warning Banners if violations exist */}
        <div className="flex flex-wrap gap-2 mb-3">
          {isTooHeavy && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>❌ SPACECRAFT TOO HEAVY (EXCEEDS {activeMission.maxMassKg} KG)</span>
            </div>
          )}
          {isPowerDeficit && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>❌ POWER DEFICIT (CONSUMPTION EXCEEDS GENERATION)</span>
            </div>
          )}
          {isBudgetExceeded && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>❌ BUDGET EXCEEDED (MAX ${activeMission.budget}M)</span>
            </div>
          )}
          {!hasInstruments && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>⚠️ NO SCIENTIFIC SENSORS INSTALLED</span>
            </div>
          )}
          {!hasPowerSource && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>⚠️ NO POWER SOURCE (SOLAR OR RTG REQUIRED)</span>
            </div>
          )}
          {!hasComm && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>⚠️ NO TELEMETRY ANTENNA INSTALLED</span>
            </div>
          )}
          {!hasPropulsion && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>⚠️ NO PROPULSION SYSTEM INSTALLED</span>
            </div>
          )}
        </div>

        {/* Live Gauges Row & Proceed Button */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full lg:w-auto flex-1 text-xs font-mono">
            {/* Budget */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>BUDGET</span>
                <DollarSign className="w-3 h-3 text-emerald-400" />
              </div>
              <div className={`font-bold text-sm mt-0.5 ${isBudgetExceeded ? 'text-red-400' : 'text-emerald-400'}`}>
                ${totalCostM}M / ${activeMission.budget}M
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full ${isBudgetExceeded ? 'bg-red-500' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, (totalCostM / activeMission.budget) * 100)}%` }}
                />
              </div>
            </div>

            {/* Mass */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>MASS</span>
                <Weight className="w-3 h-3 text-blue-400" />
              </div>
              <div className={`font-bold text-sm mt-0.5 ${isTooHeavy ? 'text-red-400' : 'text-blue-400'}`}>
                {totalMassKg} / {activeMission.maxMassKg} kg
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full ${isTooHeavy ? 'bg-red-500' : 'bg-blue-400'}`}
                  style={{ width: `${Math.min(100, (totalMassKg / activeMission.maxMassKg) * 100)}%` }}
                />
              </div>
            </div>

            {/* Power */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>POWER BAL</span>
                <Zap className="w-3 h-3 text-yellow-400" />
              </div>
              <div className={`font-bold text-sm mt-0.5 ${isPowerDeficit ? 'text-red-400' : 'text-yellow-400'}`}>
                {netPowerW >= 0 ? `+${netPowerW}` : netPowerW} W
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Gen: {powerGeneratedW}W | Draw: {powerConsumedW}W
              </div>
            </div>

            {/* Fuel */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>FUEL TANK</span>
                <Flame className="w-3 h-3 text-orange-400" />
              </div>
              <div className="font-bold text-sm text-orange-400 mt-0.5">
                {fuelCapacityPct}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-orange-400"
                  style={{ width: `${fuelCapacityPct}%` }}
                />
              </div>
            </div>

            {/* Science Potential */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>SCIENCE POTENTIAL</span>
                <Sparkles className="w-3 h-3 text-purple-400" />
              </div>
              <div className="font-bold text-sm text-purple-400 mt-0.5">
                {sciencePotential} pts
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Target: {activeMission.minScienceRequired} pts
              </div>
            </div>

            {/* Mission Risk */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px] flex items-center justify-between">
                <span>INITIAL RISK</span>
                <ShieldAlert className="w-3 h-3 text-cyan-400" />
              </div>
              <div className={`font-bold text-sm mt-0.5 ${calculatedRiskPct > 45 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {calculatedRiskPct}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full ${calculatedRiskPct > 45 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                  style={{ width: `${calculatedRiskPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Continue button */}
          <button
            disabled={!canLaunch}
            onClick={() => {
              sounds.playClick();
              setScreen('launcher_trajectory');
            }}
            className={`w-full lg:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold font-mono text-sm tracking-wider transition-all shadow-lg ${
              canLaunch
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 hover:scale-105 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <span>NEXT: LAUNCHER & TRAJECTORY</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
