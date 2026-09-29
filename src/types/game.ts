export type ScreenState = 
  | 'title' 
  | 'missions' 
  | 'briefing' 
  | 'builder' 
  | 'launcher_trajectory' 
  | 'launch' 
  | 'mission_control' 
  | 'debrief' 
  | 'leaderboard' 
  | 'tutorial';

export type MissionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface MissionData {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  target: 'Moon' | 'Mars' | 'Asteroid' | 'Earth Orbit';
  targetDistanceKm: number;
  objective: string;
  difficulty: MissionDifficulty;
  rewardCredits: number;
  unlocked: boolean;
  budget: number; // in Millions USD
  maxMassKg: number;
  maxPowerW: number;
  missionWindowDays: number;
  minScienceRequired: number;
  recommendedStrategy: string;
  description: string;
  targetDetails: {
    gravity: string;
    atmosphere: string;
    avgTemp: string;
    radiation: string;
    orbitalPeriod: string;
  };
  nasaInspiration: string;
}

export type ComponentCategory = 
  | 'structure'
  | 'instruments'
  | 'power'
  | 'communication'
  | 'propulsion'
  | 'thermal'
  | 'navigation';

export interface SpacecraftComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  costM: number;
  massKg: number;
  powerW: number; // positive = consumes, negative or generation handled by type
  powerGeneratedW?: number;
  batteryCapacity?: number;
  scienceValue?: number;
  fuelCapacityPct?: number;
  riskModPct: number;
  commRangePct?: number;
  description: string;
  nasaRef?: string;
  iconName: string;
}

export interface SynergyBonus {
  id: string;
  name: string;
  requiredComponentIds: string[];
  bonusScience: number;
  bonusRiskReduction: number;
  description: string;
}

export interface LaunchVehicle {
  id: string;
  name: string;
  costM: number;
  maxPayloadKg: number;
  reliabilityPct: number;
  stages: number;
  thrustKn: number;
  description: string;
  icon: string;
}

export interface TrajectoryProfile {
  id: 'direct' | 'hohmann' | 'fast';
  name: string;
  description: string;
  fuelCostPct: number;
  durationMultiplier: number;
  riskModPct: number;
  scienceBonusPct: number;
  transferType: string;
}

export interface MissionEventOption {
  label: string;
  description: string;
  effects: {
    science?: number;
    risk?: number;
    fuel?: number;
    power?: number;
    comm?: number;
    timeDays?: number;
  };
  decisionLogText: string;
}

export interface MissionEvent {
  id: string;
  title: string;
  category: 'radiation' | 'comm' | 'power' | 'trajectory' | 'discovery' | 'hardware';
  severity: 'low' | 'medium' | 'critical';
  description: string;
  triggeredAtProgress: number; // between 0.15 and 0.85
  options: MissionEventOption[];
}

export type MissionPhase = 
  | 'COUNTDOWN' 
  | 'LIFTOFF' 
  | 'EARTH_ORBIT' 
  | 'TRANSIT_INJECTION' 
  | 'CRUISE' 
  | 'ORBITAL_INSERTION' 
  | 'SCIENCE_OPERATIONS' 
  | 'MISSION_COMPLETE' 
  | 'MISSION_FAILED';

export interface MissionDecisionRecord {
  id: string;
  timestamp: string;
  title: string;
  chosenOptionLabel: string;
  impactSummary: string;
  scienceDelta: number;
  riskDelta: number;
  fuelDelta: number;
}

export interface MissionDebriefResult {
  missionId: string;
  missionName: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
  totalScore: number;
  rankTitle: string;
  scienceScore: number; // 0 - 100
  safetyScore: number; // 0 - 100
  efficiencyScore: number; // 0 - 100
  budgetScore: number; // 0 - 100
  scienceCollected: number;
  targetScience: number;
  fuelRemainingPct: number;
  riskFinalPct: number;
  remainingBudgetM: number;
  missionDurationDays: number;
  discoveriesCount: number;
  decisions: MissionDecisionRecord[];
  achievementsUnlocked: string[];
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  missionName: string;
  score: number;
  science: number;
  safety: number;
  efficiency: number;
  date: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}
