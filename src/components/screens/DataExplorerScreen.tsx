'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { REAL_PLANETARY_DATA } from '@/data/nasa/planets/planetaryData';
import { REAL_LRO_INSTRUMENTS } from '@/data/nasa/instruments/lroInstruments';
import { REAL_NASA_MISSIONS } from '@/data/nasa/missions/missionProfiles';
import { DataProvenanceModal } from '@/components/modals/DataProvenanceModal';
import { DataSource } from '@/types/nasa';
import { 
  Database, 
  ExternalLink, 
  ArrowLeft, 
  Compass, 
  Radio, 
  Camera, 
  Sun, 
  Thermometer, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Rocket, 
  Info 
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export const DataExplorerScreen: React.FC = () => {
  const { setScreen } = useGameStore();

  const [activeTab, setActiveTab] = useState<'planets' | 'instruments' | 'missions'>('planets');
  const [selectedPlanetKey, setSelectedPlanetKey] = useState<string>('moon');
  const [activeProvenance, setActiveProvenance] = useState<DataSource | null>(null);
  const [provenanceTitle, setProvenanceTitle] = useState('');

  const planet = REAL_PLANETARY_DATA[selectedPlanetKey] || REAL_PLANETARY_DATA.moon;

  const openProvenance = (meta: DataSource, title: string) => {
    sounds.playClick();
    setProvenanceTitle(title);
    setActiveProvenance(meta);
  };

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 select-none flex flex-col min-h-[calc(100vh-80px)] justify-between space-y-6">
      {/* Provenance Dialog */}
      <DataProvenanceModal
        isOpen={activeProvenance !== null}
        onClose={() => setActiveProvenance(null)}
        metadata={activeProvenance}
        datasetTitle={provenanceTitle}
      />

      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 pb-4 border-b border-cyan-500/20">
          <button
            onClick={() => setScreen('title')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>NASA OPEN DATA EXPLORER & PDS ARCHIVE</span>
              <span>//</span>
              <span>VERIFIED SCIENTIFIC DATASETS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Planetary & Mission Science Explorer
            </h2>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 my-5">
          {[
            { id: 'planets', label: 'Planetary Properties', icon: <Compass className="w-4 h-4" /> },
            { id: 'instruments', label: 'NASA Instruments (LRO)', icon: <Radio className="w-4 h-4" /> },
            { id: 'missions', label: 'Robotic Missions', icon: <Rocket className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playToggle();
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: Planetary Bodies */}
        {activeTab === 'planets' && (
          <div className="space-y-5">
            {/* Target Select Buttons */}
            <div className="flex space-x-2">
              {[
                { key: 'moon', label: 'The Moon (Target)', icon: '🌙' },
                { key: 'mars', label: 'Mars (Red Planet)', icon: '🔴' },
                { key: 'earth', label: 'Earth (Base)', icon: '🌍' }
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedPlanetKey(p.key);
                  }}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    selectedPlanetKey === p.key
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Planet Detail Card */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="text-xs font-mono text-cyan-400">{planet.designation}</div>
                  <h3 className="text-2xl font-bold text-white uppercase">{planet.name}</h3>
                </div>
                <button
                  onClick={() => openProvenance(planet.metadata, `${planet.name} Physical Constants`)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono hover:bg-cyan-900 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DATA PROVENANCE</span>
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">MASS</div>
                  <div className="text-white font-bold text-sm mt-0.5">{planet.massKg}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">SURFACE GRAVITY</div>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">{planet.surfaceGravityMs2} m/s²</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">MEAN RADIUS</div>
                  <div className="text-white font-bold text-sm mt-0.5">{planet.meanRadiusKm} km</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">ESCAPE VELOCITY</div>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">{planet.escapeVelocityKms} km/s</div>
                </div>
              </div>

              {/* Environmental In-depth blocks */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="font-mono text-cyan-400 font-bold mb-1">ATMOSPHERIC COMPOSITION</div>
                  <p className="text-slate-300 leading-relaxed font-sans">{planet.atmosphereComposition}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="font-mono text-amber-400 font-bold mb-1">THERMAL EXTREMES</div>
                  <p className="text-slate-300 leading-relaxed font-sans">{planet.surfaceTemperatureRangeC}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="font-mono text-red-400 font-bold mb-1">RADIATION ENVIRONMENT</div>
                  <p className="text-slate-300 leading-relaxed font-sans">{planet.radiationEnvironment}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NASA Instruments (LRO) */}
        {activeTab === 'instruments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REAL_LRO_INSTRUMENTS.map((inst) => (
              <div
                key={inst.id}
                className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-cyan-400 text-lg">{inst.acronym}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                          {inst.realMassKg} kg | {inst.realPowerW} W
                        </span>
                      </div>
                      <h4 className="font-semibold text-white text-sm mt-0.5">{inst.fullName}</h4>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        PI: {inst.principalInvestigator} ({inst.leadInstitution})
                      </div>
                    </div>

                    <button
                      onClick={() => openProvenance(inst.metadata, `${inst.acronym} Instrument PDS Data`)}
                      className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:text-white"
                      title="View Data Provenance"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed font-sans">
                    {inst.realScienceDescription}
                  </p>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] font-mono">
                    <span className="text-purple-400 font-semibold">GAME MECHANIC: </span>
                    <span className="text-slate-300">{inst.gameMapping.gameEffectSummary}</span>
                    <span className="text-purple-300 font-bold ml-1.5">(+{inst.gameMapping.gameScienceValue} Sci)</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>PDS ID: {inst.pdsDatasetId}</span>
                  <a
                    href={inst.pdsArchiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <span>PDS NODE</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: NASA Missions */}
        {activeTab === 'missions' && (
          <div className="space-y-4">
            {REAL_NASA_MISSIONS.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div>
                    <div className="text-xs font-mono text-cyan-400">{m.spacecraftName}</div>
                    <h3 className="text-xl font-bold text-white">{m.name}</h3>
                  </div>

                  <button
                    onClick={() => openProvenance(m.metadata, `${m.name} Mission Archive`)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono hover:bg-cyan-900 transition-colors self-start sm:self-auto"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DATA PROVENANCE</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">LAUNCH DATE</span>
                    <span className="text-white font-semibold">{m.launchDate.split(' (')[0]}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">VEHICLE</span>
                    <span className="text-cyan-400 font-semibold">{m.launchVehicle}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STATUS</span>
                    <span className="text-emerald-400 font-semibold">{m.missionStatus.split(' (')[0]}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">TOTAL SCIENCE</span>
                    <span className="text-purple-400 font-semibold">{m.totalScienceReturnTB} TB PDS</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-mono text-slate-400 font-bold block">OFFICIAL MISSION OBJECTIVES:</span>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300 font-sans">
                    {m.officialGoals.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800 text-center text-xs font-mono text-slate-500">
        ALL SCIENTIFIC DATASETS SOURCED FROM NASA PDS &amp; OPEN DATA ARCHIVES // SIMULATION SEPARATED
      </div>
    </div>
  );
};
