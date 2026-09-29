'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataSource } from '@/types/nasa';
import { X, ExternalLink, ShieldCheck, Database, Calendar, Server, Tag, Info } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface DataProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: DataSource | null;
  datasetTitle?: string;
  scientificContext?: string;
  gameSimulationNotes?: string;
}

export const DataProvenanceModal: React.FC<DataProvenanceModalProps> = ({
  isOpen,
  onClose,
  metadata,
  datasetTitle = 'NASA Scientific Data Provenance',
  scientificContext,
  gameSimulationNotes
}) => {
  if (!isOpen || !metadata) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-cyan-400 tracking-wider">
                  NASA DATA PROVENANCE & SCIENTIFIC VERIFICATION
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{datasetTitle}</h3>
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

          {/* Real Data vs Game Simulation Banner */}
          <div className="my-4 flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">CLASSIFICATION:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                REAL NASA DATA
              </span>
            </div>
            <span className="text-slate-500 text-[11px]">VERIFIED VIA PDS / OPEN DATA</span>
          </div>

          {/* Provenance Fields Table */}
          <div className="space-y-2.5 my-4 text-xs font-mono">
            <div className="flex items-start justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400 flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>OFFICIAL SOURCE</span>
              </div>
              <div className="text-white font-semibold text-right max-w-[60%]">{metadata.sourceName}</div>
            </div>

            <div className="flex items-start justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span>DATASET NAME</span>
              </div>
              <div className="text-cyan-300 font-semibold text-right max-w-[60%]">{metadata.datasetName}</div>
            </div>

            <div className="flex items-start justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>ARCHIVE NODE</span>
              </div>
              <div className="text-slate-200 text-right max-w-[60%]">
                {metadata.archiveNode || 'NASA Planetary Data System'}
              </div>
            </div>

            <div className="flex items-start justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <div className="text-slate-400 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>RETRIEVED AT</span>
              </div>
              <div className="text-slate-300 text-right">
                {new Date(metadata.retrievedAt).toLocaleDateString()} ({metadata.doiOrId || 'VERIFIED'})
              </div>
            </div>
          </div>

          {/* Scientific Context & Simulation Distinction */}
          {(scientificContext || gameSimulationNotes) && (
            <div className="my-4 space-y-2 text-xs">
              {scientificContext && (
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-200">
                  <div className="font-mono text-cyan-400 font-bold mb-1 flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>REAL SCIENTIFIC PHENOMENON</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">{scientificContext}</p>
                </div>
              )}

              {gameSimulationNotes && (
                <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20 text-purple-200">
                  <div className="font-mono text-purple-400 font-bold mb-1 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>GAME SIMULATION TRANSLATION</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">{gameSimulationNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Direct Link to NASA Official Source */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">
              OFFICIAL REPOSITORY ACCESS
            </span>
            <a
              href={metadata.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <span>OPEN NASA SOURCE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
