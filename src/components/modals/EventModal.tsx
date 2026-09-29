'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MissionEvent } from '@/types/game';
import { AlertTriangle, Radio, Zap, Sparkles, ShieldAlert, Cpu, Compass } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface EventModalProps {
  event: MissionEvent | null;
  onSelectOption: (event: MissionEvent, optionIndex: number) => void;
}

const emptySubscribe = () => () => {};

export const EventModal: React.FC<EventModalProps> = ({ event, onSelectOption }) => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Lock body scroll while modal is active (Issue #7: Page behind modal can scroll)
  useEffect(() => {
    if (event) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [event]);

  // Keyboard shortcut listener: Keys [1], [2], [3] select corresponding option
  useEffect(() => {
    if (!event) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && event.options[0]) {
        sounds.playClick();
        onSelectOption(event, 0);
      } else if (e.key === '2' && event.options[1]) {
        sounds.playClick();
        onSelectOption(event, 1);
      } else if (e.key === '3' && event.options[2]) {
        sounds.playClick();
        onSelectOption(event, 2);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, onSelectOption]);

  if (!mounted || !event) return null;

  const getCategoryIcon = () => {
    switch (event.category) {
      case 'radiation':
        return <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />;
      case 'comm':
        return <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />;
      case 'power':
        return <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />;
      case 'trajectory':
        return <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />;
      case 'discovery':
        return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />;
      case 'hardware':
        return <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />;
    }
  };

  const getSeverityBadge = () => {
    switch (event.severity) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 text-[11px] sm:text-xs font-mono font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse whitespace-nowrap">
            CRITICAL ANOMALY
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-1 text-[11px] sm:text-xs font-mono font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 whitespace-nowrap">
            CAUTION EVENT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[11px] sm:text-xs font-mono font-bold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 whitespace-nowrap">
            SCIENCE OPPORTUNITY
          </span>
        );
    }
  };

  const modalContent = (
    <AnimatePresence>
      {/* Root Overlay Backdrop: z-[100] renders strictly above TopNavHeader (z-40) and all canvas elements */}
      <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-slate-950/85 backdrop-blur-md">
        {/* Scrollable Center Wrapper: min-h-full ensures perfect centering without clipping top on long content */}
        <div className="min-h-full w-full flex items-center justify-center p-3.5 sm:p-5 md:p-8 lg:p-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl my-auto rounded-2xl border border-cyan-500/40 bg-slate-900/98 p-4 sm:p-6 md:p-8 shadow-[0_0_65px_rgba(6,182,212,0.32)] text-slate-100 flex flex-col"
          >
            {/* Header: Directive Label + Category Icon + Severity Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-cyan-500/20">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 shrink-0">
                  {getCategoryIcon()}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-mono text-cyan-400 tracking-wider">
                    HOUSTON FLIGHT DIRECTOR DIRECTIVE
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate sm:text-wrap">
                    {event.title}
                  </h2>
                </div>
              </div>
              <div className="shrink-0 self-start sm:self-center">{getSeverityBadge()}</div>
            </div>

            {/* Description */}
            <div className="my-3.5 sm:my-4 p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm leading-relaxed text-slate-300">
              <p>{event.description}</p>
            </div>

            {/* Real World Scientific Context (NASA PDS / SWPC / Donki) */}
            {event.realWorldContext && (
              <div className="mb-4 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-cyan-300 font-bold mb-1.5">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>REAL-WORLD SCIENTIFIC CONTEXT (NASA DATA)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400/80">AUTHENTIC PHENOMENON</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">{event.realWorldContext}</p>
                {event.nasaSourceRef && (
                  <div className="mt-2 pt-2 border-t border-cyan-500/20 text-[10px] font-mono text-cyan-400/80 flex items-center justify-between">
                    <span>Reference Archive: {event.nasaSourceRef}</span>
                    <span className="text-slate-400">TRACEABLE CITATION</span>
                  </div>
                )}
              </div>
            )}

            {/* Options Header */}
            <div className="text-xs font-mono text-cyan-400/90 mb-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-semibold">SELECT ENGINEERING CONTINGENCY ACTION:</span>
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline">KEYS [1-3] ACTIVE</span>
            </div>

            {/* Options List */}
            <div className="space-y-2.5 sm:space-y-3">
              {event.options.map((option, idx) => {
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      sounds.playClick();
                      onSelectOption(event, idx);
                    }}
                    onMouseEnter={() => sounds.playToggle()}
                    className="w-full text-left p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-cyan-950/40 hover:border-cyan-400/60 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all duration-150 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded bg-slate-800 group-hover:bg-cyan-500/20 text-cyan-400 font-mono text-xs flex items-center justify-center font-bold border border-slate-700 group-hover:border-cyan-500/40 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                            {option.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 sm:pl-7 leading-relaxed">
                          {option.description}
                        </div>
                      </div>
                    </div>

                    {/* Effects Preview Badges */}
                    <div className="mt-2.5 sm:pl-7 flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono">
                      {option.effects.science !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            option.effects.science >= 0
                              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                              : 'bg-red-950/60 text-red-300 border-red-500/40'
                          }`}
                        >
                          Science {option.effects.science >= 0 ? `+${option.effects.science}` : option.effects.science}
                        </span>
                      )}
                      {option.effects.risk !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            option.effects.risk <= 0
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-950/60 text-red-300 border-red-500/40'
                          }`}
                        >
                          Risk {option.effects.risk <= 0 ? `${option.effects.risk}%` : `+${option.effects.risk}%`}
                        </span>
                      )}
                      {option.effects.fuel !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            option.effects.fuel >= 0
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          Fuel {option.effects.fuel >= 0 ? `+${option.effects.fuel}%` : `${option.effects.fuel}%`}
                        </span>
                      )}
                      {option.effects.power !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            option.effects.power >= 0
                              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                              : 'bg-red-950/60 text-red-300 border-red-500/40'
                          }`}
                        >
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

            {/* Bottom Footer Note with Generous Breathing Room */}
            <div className="mt-4 pt-3 border-t border-cyan-500/20 text-center text-[10px] sm:text-[11px] font-mono text-slate-500 flex items-center justify-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>SIMULATION PAUSED UNTIL DIRECTIVE COMMAND CONFIRMED</span>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
