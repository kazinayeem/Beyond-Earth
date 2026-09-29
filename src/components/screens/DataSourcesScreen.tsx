'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { NASA_PROVENANCE_CATALOG } from '@/data/nasa/metadata/provenanceCatalog';
import { ArrowLeft, Database, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { sounds } from '@/lib/sound';

export const DataSourcesScreen: React.FC = () => {
  const { setScreen } = useGameStore();

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 select-none flex flex-col min-h-[calc(100vh-80px)] justify-between space-y-6">
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
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>OFFICIAL SCIENTIFIC TRANSPARENCY REGISTRY</span>
              <span>//</span>
              <span>NASA OPEN DATA &amp; PDS ARCHIVES</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              NASA Data Sources &amp; Provenance
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-sans text-slate-300 mt-4 leading-relaxed max-w-3xl">
          In strict compliance with scientific integrity rules, <strong>Mission Control: Beyond Earth</strong> maintains complete provenance.
          No NASA statistics are fabricated. Real planetary parameters and historical spacecraft instruments are sourced from the official NASA archives below.
        </p>

        {/* Provenance Table */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Scientific Topic / Dataset</th>
                <th className="p-3.5">Mission</th>
                <th className="p-3.5">NASA Archive Node</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Used In Game</th>
                <th className="p-3.5">Retrieved</th>
                <th className="p-3.5 text-right">Official Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {NASA_PROVENANCE_CATALOG.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5 font-semibold text-white">
                    <div>{item.title}</div>
                    <div className="text-[10px] text-cyan-400/80 font-normal mt-0.5">{item.datasetName}</div>
                  </td>
                  <td className="p-3.5 text-slate-300 whitespace-nowrap">{item.mission}</td>
                  <td className="p-3.5 text-slate-400">{item.archive}</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] uppercase text-cyan-300">
                      {item.dataType}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300 max-w-xs">{item.notes}</td>
                  <td className="p-3.5 text-slate-400 whitespace-nowrap">{item.lastRetrieved}</td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <a
                      href={item.officialSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] transition-colors"
                    >
                      <span>VIEW NASA</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
        <span>ALL DATASETS VERIFIED AGAINST OFFICIAL NASA PDS CATALOG</span>
        <button
          onClick={() => {
            sounds.playClick();
            setScreen('missions');
          }}
          className="text-cyan-400 hover:underline"
        >
          CONTINUE TO MISSIONS →
        </button>
      </div>
    </div>
  );
};
