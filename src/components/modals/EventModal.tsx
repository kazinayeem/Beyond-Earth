'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MissionEvent } from '@/types/game';
import { AlertTriangle, Radio, Zap, Sparkles, ShieldAlert, Cpu } from 'lucide-react';

interface EventModalProps {
  event: MissionEvent | null;
  onSelectOption: (event: MissionEvent, optionIndex: number) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onSelectOption }) => {
  if (!event) return null;

  const getCategoryIcon = () => {
    switch (event.category) {
      case 'radiation':
        return <ShieldAlert className="w-6 h-6 text-amber-400" />;
      case 'comm':
        return <Radio className="w-6 h-6 text-cyan-400" />;
      case 'power':
        return <Zap className="w-6 h-6 text-yellow-400" />;
      case 'discovery':
        return <Sparkles className="w-6 h-6 text-purple-400" />;
      default:
        return <Cpu className="w-6 h-6 text-red-400" />;
    }
  };

  const getSeverityBadge = () => {
    switch (event.severity) {
      case 'critical':
        return <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">CRITICAL ANOMALY</span>;
      case 'medium':
        return <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">CAUTION EVENT</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">SCIENCE OPPORTUNITY</span>;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30">
                {getCategoryIcon()}
              </div>
              <div>
                <div className="text-xs font-mono text-cyan-400 tracking-wider">HOUSTON FLIGHT DIRECTOR DIRECTIVE</div>
                <h2 className="text-xl font-bold tracking-tight text-white">{event.title}</h2>
              </div>
            </div>
            <div>{getSeverityBadge()}</div>
          </div>

          {/* Description */}
          <div className="my-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm leading-relaxed text-slate-300">
            <p>{event.description}</p>
          </div>

          {/* Options Header */}
          <div className="text-xs font-mono text-cyan-400/90 mb-3 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
            <span>SELECT ENGINEERING CONTINGENCY ACTION:</span>
          </div>

          {/* Options Grid */}
          <div className="space-y-3">
            {event.options.map((option, idx) => {
              return (
                <button
                  key={idx}
                  onClick={() => onSelectOption(event, idx)}
                  className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-cyan-950/40 hover:border-cyan-400/60 transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {option.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{option.description}</div>
                    </div>
                  </div>

                  {/* Effects preview badges */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                    {option.effects.science !== undefined && (
                      <span className={`px-2 py-0.5 rounded border ${option.effects.science >= 0 ? 'bg-purple-950/60 text-purple-300 border-purple-500/40' : 'bg-red-950/60 text-red-300 border-red-500/40'}`}>
                        Science {option.effects.science >= 0 ? `+${option.effects.science}` : option.effects.science}
                      </span>
                    )}
                    {option.effects.risk !== undefined && (
                      <span className={`px-2 py-0.5 rounded border ${option.effects.risk <= 0 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' : 'bg-red-950/60 text-red-300 border-red-500/40'}`}>
                        Risk {option.effects.risk <= 0 ? `${option.effects.risk}%` : `+${option.effects.risk}%`}
                      </span>
                    )}
                    {option.effects.fuel !== undefined && (
                      <span className={`px-2 py-0.5 rounded border ${option.effects.fuel >= 0 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' : 'bg-amber-950/60 text-amber-300 border-amber-500/40'}`}>
                        Fuel {option.effects.fuel >= 0 ? `+${option.effects.fuel}%` : `${option.effects.fuel}%`}
                      </span>
                    )}
                    {option.effects.power !== undefined && (
                      <span className={`px-2 py-0.5 rounded border ${option.effects.power >= 0 ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40' : 'bg-red-950/60 text-red-300 border-red-500/40'}`}>
                        Power {option.effects.power >= 0 ? `+${option.effects.power}W` : `${option.effects.power}W`}
                      </span>
                    )}
                    {option.effects.comm !== undefined && (
                      <span className="px-2 py-0.5 rounded border bg-blue-950/60 text-blue-300 border-blue-500/40">
                        Comm {option.effects.comm >= 0 ? `+${option.effects.comm}%` : `${option.effects.comm}%`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-center text-[11px] font-mono text-slate-500">
            SIMULATION PAUSED UNTIL DIRECTIVE COMMAND CONFIRMED
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
