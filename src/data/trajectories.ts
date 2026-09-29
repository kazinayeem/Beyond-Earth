import { TrajectoryProfile } from '@/types/game';

export const TRAJECTORY_PROFILES: TrajectoryProfile[] = [
  {
    id: 'hohmann',
    name: 'Fuel-Efficient Hohmann Transfer',
    transferType: 'Low-Energy Ballistic Resonance',
    fuelCostPct: 22,
    durationMultiplier: 1.3,
    riskModPct: -5,
    scienceBonusPct: 10,
    description: 'Calculates minimum-energy orbital ellipse using planetary gravity wells. Takes slightly longer, preserves fuel reserves, and provides smooth orbital stabilization.'
  },
  {
    id: 'direct',
    name: 'Direct Trans-Lunar Injection (TLI)',
    transferType: 'Standard Hyperbolic Insertion',
    fuelCostPct: 35,
    durationMultiplier: 1.0,
    riskModPct: 0,
    scienceBonusPct: 0,
    description: 'NASA Apollo-heritage direct insertion flight path. Balanced flight time and fuel consumption, providing nominal encounter speed.'
  },
  {
    id: 'fast',
    name: 'Fast High-Energy Interplanetary Transfer',
    transferType: 'Hyperbolic Overburn Sprint',
    fuelCostPct: 52,
    durationMultiplier: 0.65,
    riskModPct: 14,
    scienceBonusPct: 15,
    description: 'High-thrust burn cutting transit time dramatically. Demands heavy retro-braking upon arrival, higher thermal loads, but delivers rapid scientific discoveries.'
  }
];
