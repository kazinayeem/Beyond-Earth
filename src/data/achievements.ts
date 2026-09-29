import { Achievement } from '@/types/game';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-first-orbit',
    title: 'Cosmic Pioneer',
    icon: '🛰️',
    description: 'Complete your first successful space mission to orbit.',
    unlocked: false
  },
  {
    id: 'ach-zero-waste',
    title: 'Zero Waste',
    icon: '💰',
    description: 'Complete a mission with less than 5% of your available budget remaining.',
    unlocked: false
  },
  {
    id: 'ach-safe-hands',
    title: 'Safe Hands',
    icon: '🛡️',
    description: 'Complete a mission with final accumulated risk below 15%.',
    unlocked: false
  },
  {
    id: 'ach-scientist',
    title: 'Master Scientist',
    icon: '🔬',
    description: 'Gather more than 90 Science Points during a single expedition.',
    unlocked: false
  },
  {
    id: 'ach-fuel-pinch',
    title: 'Fumes & Orbit',
    icon: '⛽',
    description: 'Complete a mission with under 15% remaining propellant.',
    unlocked: false
  },
  {
    id: 'ach-perfect',
    title: 'Mission Legend',
    icon: '🏆',
    description: 'Attain an overall Mission Flight Director rating of 90 or higher.',
    unlocked: false
  },
  {
    id: 'ach-synergy',
    title: 'System Architect',
    icon: '⚡',
    description: 'Equip two or more complementary instruments to unlock an engineering synergy bonus.',
    unlocked: false
  }
];
