'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { SPACECRAFT_COMPONENTS, SYNERGY_BONUSES } from '@/data/components';
import { LAUNCH_VEHICLES } from '@/data/launchers';
import { ComponentCategory, SpacecraftComponent } from '@/types/game';
import { SpacecraftHangar3D, HangarApi, HangarView } from '@/components/canvas/SpacecraftHangar3D';
import { DataProvenanceModal } from '@/components/modals/DataProvenanceModal';
import { DataSource } from '@/types/nasa';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';
import {
  Box, Camera, Sun, Wifi, Flame, Layers, Locate, ArrowRight, ArrowLeft, Sparkles, Check, X, Trash2,
  Wand2, Search, Zap, Weight, DollarSign, ShieldAlert, Radio, RotateCcw, ScanLine, CircleAlert,
  CircleCheck, Plus, Minus, Database,
} from 'lucide-react';
import { sounds } from '@/lib/sound';

const CATEGORIES: { id: ComponentCategory; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'structure', label: 'Structure', Icon: Box },
  { id: 'instruments', label: 'Instruments', Icon: Camera },
  { id: 'power', label: 'Power', Icon: Sun },
  { id: 'communication', label: 'Comms', Icon: Wifi },
  { id: 'propulsion', label: 'Propulsion', Icon: Flame },
  { id: 'thermal', label: 'Thermal', Icon: Layers },
  { id: 'navigation', label: 'Navigation', Icon: Locate },
];
const CAT_ICON = Object.fromEntries(CATEGORIES.map(c => [c.id, c.Icon])) as Record<ComponentCategory, React.ComponentType<{ className?: string }>>;

type SortKey = 'default' | 'cost' | 'mass' | 'science';

const shortName = (n: string) => n.replace(/\s*\(.*?\)\s*/g, ' ').trim();

export const SpacecraftBuilderScreen: React.FC = () => {
  const activeMission = useGameStore(s => s.activeMission);
  const selectedComponentIds = useGameStore(s => s.selectedComponentIds);
  const toggleComponent = useGameStore(s => s.toggleComponent);
  const clearComponents = useGameStore(s => s.clearComponents);
  const loadRecommendedBuild = useGameStore(s => s.loadRecommendedBuild);
  const loadLroBuild = useGameStore(s => s.loadLroBuild);
  const totalCostM = useGameStore(s => s.totalCostM);
  const totalMassKg = useGameStore(s => s.totalMassKg);
  const powerGeneratedW = useGameStore(s => s.powerGeneratedW);
  const powerConsumedW = useGameStore(s => s.powerConsumedW);
  const netPowerW = useGameStore(s => s.netPowerW);
  const fuelCapacityPct = useGameStore(s => s.fuelCapacityPct);
  const calculatedRiskPct = useGameStore(s => s.calculatedRiskPct);
  const sciencePotential = useGameStore(s => s.sciencePotential);
  const activeSynergies = useGameStore(s => s.activeSynergies);
  const isTooHeavy = useGameStore(s => s.isTooHeavy);
  const isPowerDeficit = useGameStore(s => s.isPowerDeficit);
  const isBudgetExceeded = useGameStore(s => s.isBudgetExceeded);
  const hasStructure = useGameStore(s => s.hasStructure);
  const hasInstruments = useGameStore(s => s.hasInstruments);
  const hasPowerSource = useGameStore(s => s.hasPowerSource);
  const hasComm = useGameStore(s => s.hasComm);
  const hasPropulsion = useGameStore(s => s.hasPropulsion);
  const canLaunch = useGameStore(s => s.canLaunch);
  const selectedLauncherId = useGameStore(s => s.selectedLauncherId);
  const setScreen = useGameStore(s => s.setScreen);
  const reducedMotion = useGameStore(s => s.reducedMotion);

  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('instruments');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [view, setView] = useState<HangarView>('iso');
  const [toast, setToast] = useState<{ id: number; text: string; tone: 'ok' | 'warn' | 'info' } | null>(null);
  const [provenance, setProvenance] = useState<{ meta: DataSource; title: string } | null>(null);
  const hangar = useRef<HangarApi>(null);

  const launcher = LAUNCH_VEHICLES.find(l => l.id === selectedLauncherId) ?? LAUNCH_VEHICLES[1];
  const massLimit = Math.min(activeMission.maxMassKg, launcher.maxPayloadKg);
  const installed = useMemo(() => SPACECRAFT_COMPONENTS.filter(c => selectedComponentIds.includes(c.id)), [selectedComponentIds]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = SPACECRAFT_COMPONENTS.filter(c =>
      (activeCategory === 'all' || c.category === activeCategory) &&
      (!showInstalledOnly || selectedComponentIds.includes(c.id)) &&
      (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
    );
    if (sort === 'cost') items.sort((a, b) => a.costM - b.costM);
    if (sort === 'mass') items.sort((a, b) => a.massKg - b.massKg);
    if (sort === 'science') items.sort((a, b) => (b.scienceValue ?? 0) - (a.scienceValue ?? 0));
    return items;
  }, [activeCategory, query, sort, showInstalledOnly, selectedComponentIds]);

  // Synergies one component away (hint, derived from existing synergy table)
  const nearSynergies = useMemo(() => SYNERGY_BONUSES
    .filter(s => !activeSynergies.some(a => a.id === s.id))
    .map(s => ({ s, missing: s.requiredComponentIds.filter(id => !selectedComponentIds.includes(id)) }))
    .filter(x => x.missing.length === 1), [activeSynergies, selectedComponentIds]);

  // ── Feedback: sounds + toasts on meaningful state changes ──
  const notify = (text: string, tone: 'ok' | 'warn' | 'info') => setToast({ id: Date.now(), text, tone });
  const prev = useRef({ synergies: activeSynergies.length, heavy: isTooHeavy, budget: isBudgetExceeded, power: isPowerDeficit, ready: canLaunch });
  useEffect(() => {
    const p = prev.current;
    if (activeSynergies.length > p.synergies) {
      sounds.playScienceDiscovery();
      notify(`Synergy unlocked · ${activeSynergies[activeSynergies.length - 1].name}`, 'ok');
    } else if (isTooHeavy && !p.heavy) {
      sounds.playWarning();
      notify(`Over mass limit · ${massLimit} kg max`, 'warn');
    } else if (isBudgetExceeded && !p.budget) {
      sounds.playWarning();
      notify(`Over budget · $${activeMission.budget}M cap`, 'warn');
    } else if (isPowerDeficit && !p.power) {
      sounds.playAlert('low');
      notify('Power deficit · consumption exceeds generation', 'warn');
    } else if (canLaunch && !p.ready) {
      sounds.playMilestone();
      notify('Spacecraft flight-ready', 'ok');
    }
    prev.current = { synergies: activeSynergies.length, heavy: isTooHeavy, budget: isBudgetExceeded, power: isPowerDeficit, ready: canLaunch };
  }, [activeSynergies, isTooHeavy, isBudgetExceeded, isPowerDeficit, canLaunch, massLimit, activeMission.budget]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const install = (c: SpacecraftComponent) => {
    const was = selectedComponentIds.includes(c.id);
    toggleComponent(c.id);
    if (was) sounds.playToggle(); else sounds.playSelect();
  };
  const applyPreset = (fn: () => void, label: string) => {
    fn();
    sounds.playSystemOn();
    hangar.current?.scan();
    notify(label, 'info');
  };
  const changeView = (v: HangarView) => {
    sounds.playClick();
    setView(v);
    hangar.current?.setView(v);
  };
  const openProvenance = (c: SpacecraftComponent) => {
    sounds.playClick();
    setProvenance({
      title: `${c.name} provenance`,
      meta: {
        sourceName: c.nasaRef || 'NASA Planetary Data System (PDS)',
        sourceType: 'NASA_PDS',
        datasetName: c.pdsDatasetId || c.name,
        sourceUrl: c.isRealNasaInstrument ? 'https://pds-geosciences.wustl.edu/missions/lro/' : 'https://nssdc.gsfc.nasa.gov/',
        retrievedAt: '2026-09-29T12:00:00Z',
        archiveNode: 'NASA PDS Imaging / Geosciences Node',
        doiOrId: c.pdsDatasetId || 'NASA-PDS-LRO',
        isSimulated: !c.isRealNasaInstrument,
      },
    });
  };

  const hovered = hoverId ? SPACECRAFT_COMPONENTS.find(c => c.id === hoverId) ?? null : null;

  const checklist = [
    { ok: hasStructure, label: 'Structural bus', advisory: true },
    { ok: hasInstruments, label: 'Science instrument' },
    { ok: hasPowerSource, label: 'Power source' },
    { ok: hasComm, label: 'Communications' },
    { ok: hasPropulsion, label: 'Propulsion' },
    { ok: !isTooHeavy && totalMassKg > 0, label: `Mass ≤ ${massLimit} kg` },
    { ok: !isBudgetExceeded, label: `Budget ≤ $${activeMission.budget}M` },
    { ok: !isPowerDeficit, label: 'Power balance', advisory: true },
  ];
  const blockers = checklist.filter(c => !c.ok && !c.advisory).length;

  return (
    <div className="relative z-10 w-full max-w-[1500px] mx-auto px-3 sm:px-4 py-3 flex flex-col gap-3 lg:h-[calc(100dvh-56px)] min-h-0 select-none">
      <DataProvenanceModal isOpen={!!provenance} onClose={() => setProvenance(null)} metadata={provenance?.meta ?? null} datasetTitle={provenance?.title ?? ''} />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setScreen('briefing')} className="hud-btn" aria-label="Back to mission briefing">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="hud-label">Stage 02 · {activeMission.name}</div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-wide text-white">Spacecraft Systems Builder</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => applyPreset(loadLroBuild, 'NASA LRO configuration loaded')} className="preset-btn text-violet-200 border-violet-400/30 hover:border-violet-300/60">
            <Radio className="w-3.5 h-3.5" /> LRO preset
          </button>
          <button type="button" onClick={() => applyPreset(loadRecommendedBuild, 'Recommended configuration loaded')} className="preset-btn text-cyan-100 border-cyan-400/30 hover:border-cyan-300/60">
            <Wand2 className="w-3.5 h-3.5" /> Recommended
          </button>
          <button type="button" onClick={() => applyPreset(clearComponents, 'All modules removed')} className="preset-btn text-slate-300 border-white/10 hover:text-rose-200 hover:border-rose-400/40">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* ── Main: inventory · workshop · intelligence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_280px] gap-3 lg:flex-1 lg:min-h-0">
        {/* LEFT · Component engineering bay */}
        <section aria-label="Component inventory" className="builder-panel flex flex-col h-[62vh] lg:h-auto min-h-0 order-2 lg:order-none">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2" role="tablist" aria-label="Categories">
            <CatTab active={activeCategory === 'all'} onClick={() => { sounds.playToggle(); setActiveCategory('all'); }} label="All" count={installed.length} />
            {CATEGORIES.map(({ id, label, Icon }) => (
              <CatTab key={id} active={activeCategory === id} onClick={() => { sounds.playToggle(); setActiveCategory(id); }}
                label={label} count={installed.filter(c => c.category === id).length} Icon={Icon} />
            ))}
          </div>
          <div className="flex gap-2 pb-2">
            <label className="relative flex-1">
              <span className="sr-only">Search components</span>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" aria-hidden />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search modules"
                className="w-full rounded-lg bg-white/[0.04] border border-white/10 pl-8 pr-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
              />
            </label>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" value={sort} onChange={e => setSort(e.target.value as SortKey)}
              className="rounded-lg bg-white/[0.04] border border-white/10 px-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/60">
              <option value="default">Sort</option>
              <option value="cost">Cost ↑</option>
              <option value="mass">Mass ↑</option>
              <option value="science">Science ↓</option>
            </select>
          </div>
          <button type="button" onClick={() => setShowInstalledOnly(v => !v)} aria-pressed={showInstalledOnly}
            className={`self-start mb-2 text-[11px] font-mono px-2 py-1 rounded-md border transition-colors ${showInstalledOnly ? 'border-cyan-400/50 text-cyan-200 bg-cyan-400/10' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>
            {showInstalledOnly ? 'Showing installed' : 'Show installed only'}
          </button>
          <ul className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5" onMouseLeave={() => setHoverId(null)}>
            {list.map(c => {
              const on = selectedComponentIds.includes(c.id);
              const overBudget = !on && totalCostM + c.costM > activeMission.budget;
              const overMass = !on && totalMassKg + c.massKg > massLimit;
              const Icon = CAT_ICON[c.category];
              const pw = c.powerGeneratedW ? `+${c.powerGeneratedW}` : c.powerW ? `−${c.powerW}` : '0';
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => install(c)}
                    onMouseEnter={() => { setHoverId(c.id); sounds.playHover(); }}
                    onFocus={() => setHoverId(c.id)}
                    onBlur={() => setHoverId(null)}
                    aria-pressed={on}
                    className={`module-tile group w-full text-left ${on ? 'module-tile-on' : ''}`}
                  >
                    <span className={`module-icon ${on ? 'text-slate-950 bg-cyan-300' : 'text-cyan-200 bg-cyan-400/10'}`}>
                      {on ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-slate-100">{shortName(c.name)}</span>
                        {c.isRealNasaInstrument && <span className="shrink-0 text-[9px] font-mono px-1 rounded bg-violet-400/15 text-violet-200">NASA</span>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-[11px] font-mono text-slate-400 tabular-nums">
                        <span className={overBudget ? 'text-rose-300' : ''}>${c.costM}M</span>
                        <span className={overMass ? 'text-rose-300' : ''}>{c.massKg}kg</span>
                        <span className={c.powerGeneratedW ? 'text-emerald-300' : ''}>{pw}W</span>
                        {c.scienceValue ? <span className="text-violet-300">+{c.scienceValue} sci</span> : null}
                      </span>
                    </span>
                    {(overBudget || overMass) && (
                      <CircleAlert className="w-4 h-4 shrink-0 text-amber-300" aria-label={overBudget ? 'Would exceed budget' : 'Would exceed mass limit'} />
                    )}
                    {!on && !overBudget && !overMass && <Plus className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-cyan-200" aria-hidden />}
                    {on && <Minus className="w-4 h-4 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100" aria-hidden />}
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="text-sm text-slate-500 text-center py-6">No modules match</li>}
          </ul>
        </section>

        {/* CENTER · 3D workshop */}
        <section aria-label="Spacecraft workshop" className="relative h-[52vh] lg:h-auto lg:min-h-0 rounded-2xl overflow-hidden border border-white/10 hangar-bg order-1 lg:order-none">
          <SpacecraftHangar3D
            installedIds={selectedComponentIds}
            hoverId={hoverId}
            reducedMotion={reducedMotion}
            apiRef={hangar}
            onPartClick={id => { setHoverId(id); setActiveCategory(SPACECRAFT_COMPONENTS.find(c => c.id === id)?.category ?? 'all'); sounds.playClick(); }}
          />
          <div className="absolute top-3 left-3 flex items-center gap-1 p-1 rounded-xl bg-black/45 backdrop-blur-md border border-white/10" role="toolbar" aria-label="Camera views">
            {(['iso', 'front', 'side', 'top'] as HangarView[]).map(v => (
              <button key={v} type="button" onClick={() => changeView(v)} aria-pressed={view === v}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-colors ${view === v ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
                {v}
              </button>
            ))}
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            <button type="button" className="cam-btn !w-7 !h-7" aria-label="Engineering scan" title="Engineering scan" onClick={() => { sounds.playSystemOn(); hangar.current?.scan(); }}><ScanLine className="w-3.5 h-3.5" /></button>
            <button type="button" className="cam-btn !w-7 !h-7" aria-label="Reset camera" title="Reset camera" onClick={() => { sounds.playClick(); setView('iso'); hangar.current?.reset(); }}><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
          <div className="absolute top-3 right-3 text-right pointer-events-none">
            <div className="hud-label">{installed.length} modules</div>
            <div className="font-mono text-[10px] text-slate-500 mt-0.5 hidden sm:block">Drag rotate · Scroll zoom · Right-drag pan</div>
          </div>

          {/* Hover inspector */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                key={hovered.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                className="absolute left-3 bottom-3 right-3 sm:right-auto sm:w-[340px] rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 p-3 pointer-events-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="hud-label">{hovered.category}{hovered.isRealNasaInstrument ? ' · NASA flight hardware' : ''}</div>
                    <div className="text-sm font-semibold text-white truncate">{hovered.name}</div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${selectedComponentIds.includes(hovered.id) ? 'bg-emerald-400/15 text-emerald-200' : 'bg-cyan-400/15 text-cyan-100'}`}>
                    {selectedComponentIds.includes(hovered.id) ? 'INSTALLED' : 'PREVIEW'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{hovered.description}</p>
                <div className="mt-2 grid grid-cols-5 gap-1 text-center font-mono tabular-nums">
                  <Spec label="Cost" value={`$${hovered.costM}M`} />
                  <Spec label="Mass" value={`${hovered.massKg}kg`} />
                  <Spec label="Power" value={hovered.powerGeneratedW ? `+${hovered.powerGeneratedW}W` : `−${hovered.powerW}W`} tone={hovered.powerGeneratedW ? 'ok' : undefined} />
                  <Spec label="Sci" value={hovered.scienceValue ? `+${hovered.scienceValue}` : '—'} />
                  <Spec label="Risk" value={`${hovered.riskModPct > 0 ? '+' : ''}${hovered.riskModPct}%`} tone={hovered.riskModPct < 0 ? 'ok' : hovered.riskModPct > 4 ? 'warn' : undefined} />
                </div>
                {!selectedComponentIds.includes(hovered.id) && (
                  <div className="mt-2 text-[11px] font-mono">
                    {totalCostM + hovered.costM > activeMission.budget
                      ? <span className="text-rose-300">Installing exceeds budget by ${totalCostM + hovered.costM - activeMission.budget}M</span>
                      : totalMassKg + hovered.massKg > massLimit
                        ? <span className="text-rose-300">Installing exceeds mass limit by {totalMassKg + hovered.massKg - massLimit} kg</span>
                        : <span className="text-emerald-300">Compatible · fits budget and mass envelope</span>}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toasts */}
          <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none" aria-live="polite">
            <AnimatePresence>
              {toast && (
                <motion.div key={toast.id} initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono backdrop-blur-md border ${toast.tone === 'ok' ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100' : toast.tone === 'warn' ? 'bg-amber-500/15 border-amber-400/40 text-amber-100' : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-100'}`}>
                  {toast.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* RIGHT · Engineering intelligence */}
        <section aria-label="Engineering intelligence" className="builder-panel flex flex-col gap-3 [&>*]:shrink-0 lg:min-h-0 lg:overflow-y-auto order-3 lg:order-none">
          <div>
            <div className="flex items-center justify-between">
              <span className="hud-label">Flight readiness</span>
              <span className={`text-[11px] font-mono ${canLaunch ? 'text-emerald-300' : 'text-amber-300'}`}>{canLaunch ? 'GO' : `${blockers} open`}</span>
            </div>
            <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
              {checklist.map(c => (
                <li key={c.label} className="flex items-center gap-1.5 text-[11px]">
                  {c.ok
                    ? <CircleCheck className="w-3.5 h-3.5 shrink-0 text-emerald-300" aria-hidden />
                    : <CircleAlert className={`w-3.5 h-3.5 shrink-0 ${c.advisory ? 'text-amber-300' : 'text-rose-300'}`} aria-hidden />}
                  <span className={c.ok ? 'text-slate-300' : c.advisory ? 'text-amber-200' : 'text-rose-200'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="hud-label">Power budget</span>
              <span className={`text-[11px] font-mono tabular-nums ${netPowerW >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{netPowerW >= 0 ? '+' : ''}{netPowerW} W</span>
            </div>
            <PowerBar gen={powerGeneratedW} cons={powerConsumedW} />
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-500 tabular-nums">
              <span>Gen {powerGeneratedW} W</span><span>Load {powerConsumedW} W</span>
            </div>
          </div>

          <div className="shrink-0">
            <div className="hud-label mb-1.5">Installed modules</div>
            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {installed.map(c => {
                  const Icon = CAT_ICON[c.category];
                  return (
                    <motion.li key={c.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}
                      onMouseEnter={() => setHoverId(c.id)} onMouseLeave={() => setHoverId(null)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-white/[0.03] hover:bg-white/[0.06]">
                      <Icon className="w-3.5 h-3.5 text-cyan-200 shrink-0" aria-hidden />
                      <span className="flex-1 min-w-0 truncate text-xs text-slate-200">{shortName(c.name)}</span>
                      {c.isRealNasaInstrument && (
                        <button type="button" onClick={() => openProvenance(c)} className="text-violet-300 hover:text-violet-100" aria-label={`Data provenance for ${c.name}`}><Database className="w-3.5 h-3.5" /></button>
                      )}
                      <button type="button" onClick={() => install(c)} className="text-slate-500 hover:text-rose-300" aria-label={`Remove ${c.name}`}><X className="w-3.5 h-3.5" /></button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
              {installed.length === 0 && <li className="text-xs text-slate-500">Empty bus — install modules from the bay.</li>}
            </ul>
          </div>

          <div>
            <div className="hud-label mb-1.5 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-violet-300" aria-hidden /> Synergies</div>
            <ul className="space-y-1">
              {activeSynergies.map(s => (
                <li key={s.id} className="rounded-lg px-2 py-1.5 bg-violet-500/10 border border-violet-400/20">
                  <div className="text-xs text-violet-100">{s.name}</div>
                  <div className="text-[10px] font-mono text-violet-300">+{s.bonusScience} science · −{s.bonusRiskReduction}% risk</div>
                </li>
              ))}
              {nearSynergies.slice(0, 3).map(({ s, missing }) => {
                const need = SPACECRAFT_COMPONENTS.find(c => c.id === missing[0]);
                return (
                  <li key={s.id}>
                    <button type="button"
                      onClick={() => need && install(need)}
                      onMouseEnter={() => setHoverId(missing[0])} onMouseLeave={() => setHoverId(null)}
                      className="w-full text-left rounded-lg px-2 py-1.5 border border-dashed border-white/15 hover:border-violet-400/50">
                      <div className="text-xs text-slate-300">{s.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">Add {need ? shortName(need.name) : missing[0]} → +{s.bonusScience} sci</div>
                    </button>
                  </li>
                );
              })}
              {activeSynergies.length === 0 && nearSynergies.length === 0 && <li className="text-xs text-slate-500">Combine complementary instruments to unlock bonuses.</li>}
            </ul>
          </div>
        </section>
      </div>

      {/* ── Engineering instruments + progression ── */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(6,minmax(0,1fr))_220px] gap-2">
        <Gauge2 Icon={DollarSign} label="Budget" value={totalCostM} max={activeMission.budget} fmt={v => `$${Math.round(v)}M`} sub={`of $${activeMission.budget}M`} bad={isBudgetExceeded} reduced={reducedMotion} />
        <Gauge2 Icon={Weight} label="Mass" value={totalMassKg} max={massLimit} fmt={v => `${Math.round(v)} kg`} sub={`limit ${massLimit} kg`} bad={isTooHeavy} reduced={reducedMotion} />
        <Gauge2 Icon={Zap} label="Power" value={netPowerW} max={Math.max(powerGeneratedW, powerConsumedW, 1)} fmt={v => `${v >= 0 ? '+' : ''}${Math.round(v)} W`} sub={`${powerGeneratedW} gen / ${powerConsumedW} load`} bad={isPowerDeficit || netPowerW < 0} signed reduced={reducedMotion} />
        <Gauge2 Icon={Flame} label="Fuel tank" value={fuelCapacityPct} max={100} fmt={v => `${Math.round(v)}%`} sub={fuelCapacityPct === 0 ? 'no propulsion' : 'propellant capacity'} bad={fuelCapacityPct === 0} reduced={reducedMotion} />
        <Gauge2 Icon={Sparkles} label="Science" value={sciencePotential} max={Math.max(activeMission.minScienceRequired * 1.5, sciencePotential)} fmt={v => `${Math.round(v)}`} sub={`target ${activeMission.minScienceRequired}`} good={sciencePotential >= activeMission.minScienceRequired} marker={activeMission.minScienceRequired} reduced={reducedMotion} />
        <Gauge2 Icon={ShieldAlert} label="Risk" value={calculatedRiskPct} max={85} fmt={v => `${Math.round(v)}%`} sub={calculatedRiskPct < 30 ? 'nominal' : calculatedRiskPct < 55 ? 'elevated' : 'high'} bad={calculatedRiskPct >= 55} warn={calculatedRiskPct >= 30} invert reduced={reducedMotion} />
        <button
          type="button"
          disabled={!canLaunch}
          onClick={() => { sounds.playSystemOn(); setScreen('launcher_trajectory'); }}
          className={`col-span-2 sm:col-span-3 lg:col-span-1 rounded-xl px-4 py-3 flex items-center justify-between gap-2 font-display font-semibold tracking-wide transition-all ${canLaunch ? 'cta-primary text-slate-950 ready-pulse' : 'bg-white/[0.04] border border-white/10 text-slate-500'}`}
        >
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-mono tracking-[0.18em] opacity-80">{canLaunch ? 'FLIGHT READY' : `${blockers} REQUIREMENT${blockers === 1 ? '' : 'S'} OPEN`}</span>
            <span className="block text-sm">Launcher &amp; trajectory</span>
          </span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>
      </div>
    </div>
  );
};

const CatTab: React.FC<{ active: boolean; onClick: () => void; label: string; count: number; Icon?: React.ComponentType<{ className?: string }> }> = ({ active, onClick, label, count, Icon }) => (
  <button type="button" role="tab" aria-selected={active} onClick={onClick}
    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${active ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.06]'}`}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    <span>{label}</span>
    {count > 0 && <span className={`text-[10px] font-mono px-1 rounded ${active ? 'bg-slate-950/20' : 'bg-cyan-400/15 text-cyan-200'}`}>{count}</span>}
  </button>
);

const Spec: React.FC<{ label: string; value: string; tone?: 'ok' | 'warn' }> = ({ label, value, tone }) => (
  <div className="rounded-md bg-white/[0.04] py-1">
    <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`text-[11px] ${tone === 'ok' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-slate-100'}`}>{value}</div>
  </div>
);

const PowerBar: React.FC<{ gen: number; cons: number }> = ({ gen, cons }) => {
  const max = Math.max(gen, cons, 1);
  return (
    <div className="mt-1.5 space-y-1" aria-hidden>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-emerald-300 rounded-full transition-[width] duration-500" style={{ width: `${(gen / max) * 100}%` }} /></div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full rounded-full transition-[width] duration-500 ${cons > gen ? 'bg-rose-400' : 'bg-amber-300'}`} style={{ width: `${(cons / max) * 100}%` }} /></div>
    </div>
  );
};

const Gauge2: React.FC<{
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; max: number; fmt: (v: number) => string; sub: string;
  bad?: boolean; warn?: boolean; good?: boolean; signed?: boolean; invert?: boolean; marker?: number; reduced?: boolean;
}> = ({ Icon, label, value, max, fmt, sub, bad, warn, good, signed, marker, reduced }) => {
  const v = useAnimatedNumber(value, reduced);
  const frac = signed ? Math.min(1, Math.abs(v) / Math.max(1, max)) : Math.min(1, Math.max(0, v / Math.max(1, max)));
  const tone = bad ? 'rose' : warn ? 'amber' : good ? 'emerald' : 'cyan';
  const bar = { rose: 'bg-rose-400', amber: 'bg-amber-300', emerald: 'bg-emerald-300', cyan: 'bg-cyan-300' }[tone];
  const text = { rose: 'text-rose-200', amber: 'text-amber-200', emerald: 'text-emerald-200', cyan: 'text-white' }[tone];
  return (
    <div className={`gauge ${bad ? 'gauge-bad' : ''}`} role="group" aria-label={`${label}: ${fmt(value)}, ${sub}`}>
      <div className="flex items-center justify-between">
        <span className="hud-label flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</span>
      </div>
      <div className={`mt-0.5 font-mono tabular-nums text-lg leading-tight ${text}`}>{fmt(v)}</div>
      <div className="relative mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
        {signed ? (
          <div className={`absolute top-0 h-full ${bar}`} style={{ left: v >= 0 ? '50%' : `${50 - frac * 50}%`, width: `${frac * 50}%` }} />
        ) : (
          <div className={`h-full ${bar}`} style={{ width: `${frac * 100}%` }} />
        )}
        {signed && <div className="absolute left-1/2 top-0 h-full w-px bg-white/40" />}
        {marker !== undefined && <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: `${Math.min(100, (marker / Math.max(1, max)) * 100)}%` }} />}
      </div>
      <div className="mt-1 text-[10px] font-mono text-slate-500 truncate">{sub}</div>
    </div>
  );
};
