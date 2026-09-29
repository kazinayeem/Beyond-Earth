'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, DollarSign, Weight, Zap, Flame, Sparkles, Shield, Rocket } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_SLIDES = [
  {
    title: 'Welcome, Mission Director',
    subtitle: 'Principles of Space Mission Engineering',
    icon: <Rocket className="w-8 h-8 text-cyan-400" />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <p>
          At NASA and mission control agencies, space exploration is defined by <strong>trade-offs</strong>.
          There is no &ldquo;ultimate ship&rdquo; — every single gram of mass, watt of electrical power, and dollar of budget counts.
        </p>
        <p>
          Your objective is to design a spacecraft, pick a launcher and trajectory, monitor the live flight across deep space, and survive unexpected solar storms and equipment anomalies to collect scientific discoveries.
        </p>
      </div>
    )
  },
  {
    title: 'The Golden Resource Constraints',
    subtitle: 'Mass, Budget & Power Balancing',
    icon: <Weight className="w-8 h-8 text-amber-400" />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex items-start space-x-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
          <DollarSign className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Budget:</span> Every component and rocket launcher has a cost. Exceeding your mission allocation will scrub the flight.
          </div>
        </div>
        <div className="flex items-start space-x-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
          <Weight className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Mass Limits:</span> Both the mission destination and the rocket launcher have maximum payload capacities. Keep dry mass strictly within bounds!
          </div>
        </div>
        <div className="flex items-start space-x-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
          <Zap className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Power Balance:</span> Scientific instruments consume watts. You must install Solar Arrays or RTG modules to generate more power than you consume.
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Propulsion & Trajectory Traps',
    subtitle: 'Delta-V, Fuel Reserves & Transfer Orbits',
    icon: <Flame className="w-8 h-8 text-orange-400" />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <p>
          Choose between <strong>Hohmann Transfer</strong> (fuel efficient, safest, optimal mapping), <strong>Direct Injection</strong> (balanced), or <strong>Fast Overburn</strong> (rapid sprint with higher risk and heavy deceleration burn).
        </p>
        <p>
          Running out of propellant during deep space maneuvers leaves the spacecraft stranded. Maintain reserve margins for unexpected mid-course correction maneuvers!
        </p>
      </div>
    )
  },
  {
    title: 'Scientific Synergies & Discoveries',
    subtitle: 'Multiply Your Mission Science Score',
    icon: <Sparkles className="w-8 h-8 text-purple-400" />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <p>
          Pairing compatible sensors triggers powerful <strong>Engineering Synergies</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          <li><strong>Camera + Spectrometer:</strong> Geological Imaging Bonus (+18 Science)</li>
          <li><strong>Radar + Laser Altimeter:</strong> 3D Topographic Mapping Bonus (+24 Science)</li>
          <li><strong>High-Gain Antenna + Radar:</strong> High-Throughput Lossless Downlink (+12 Science)</li>
        </ul>
        <p className="text-cyan-300 text-xs">
          Watch for unexpected surface anomaly pings during orbit — investigating them unlocks massive science points!
        </p>
      </div>
    )
  },
  {
    title: 'Responding to In-Flight Crises',
    subtitle: 'Solar Flares, Transponder Drops & Anomalies',
    icon: <Shield className="w-8 h-8 text-emerald-400" />,
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <p>
          During the mission, Houston flight controllers will alert you to live crises.
          The simulation pauses while you assess telemetry.
        </p>
        <p>
          Every choice directly influences your final <strong>Safety Score</strong>, remaining fuel, and science haul.
          Make the right call, guide your spacecraft home, and earn the rank of <strong>MISSION LEGEND</strong>!
        </p>
      </div>
    )
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slide = TUTORIAL_SLIDES[currentSlide];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100"
        >
          {/* Close button */}
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Slide Content */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/30">
              {slide.icon}
            </div>
            <div>
              <div className="text-xs font-mono text-cyan-400 tracking-wider">
                FLIGHT MANUAL // STEP {currentSlide + 1} OF {TUTORIAL_SLIDES.length}
              </div>
              <h3 className="text-lg font-bold text-white">{slide.title}</h3>
              <div className="text-xs text-slate-400">{slide.subtitle}</div>
            </div>
          </div>

          <div className="my-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 min-h-[170px]">
            {slide.content}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              disabled={currentSlide === 0}
              onClick={() => {
                sounds.playClick();
                setCurrentSlide((prev) => Math.max(0, prev - 1));
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>PREVIOUS</span>
            </button>

            {/* Dots */}
            <div className="flex items-center space-x-1.5">
              {TUTORIAL_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentSlide ? 'w-6 bg-cyan-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {currentSlide < TUTORIAL_SLIDES.length - 1 ? (
              <button
                onClick={() => {
                  sounds.playClick();
                  setCurrentSlide((prev) => prev + 1);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-mono rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all"
              >
                <span>NEXT</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  sounds.playClick();
                  onClose();
                }}
                className="px-4 py-1.5 text-xs font-mono rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all"
              >
                READY FOR FLIGHT
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
