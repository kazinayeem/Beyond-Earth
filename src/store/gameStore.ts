import { create } from 'zustand';
import { 
  ScreenState, 
  MissionData, 
  SpacecraftComponent, 
  SynergyBonus, 
  LaunchVehicle, 
  TrajectoryProfile, 
  MissionEvent, 
  MissionDecisionRecord, 
  MissionDebriefResult, 
  LeaderboardEntry, 
  Achievement,
  MissionPhase 
} from '@/types/game';
import { MISSIONS } from '@/data/missions';
import { SPACECRAFT_COMPONENTS, SYNERGY_BONUSES } from '@/data/components';
import { LAUNCH_VEHICLES } from '@/data/launchers';
import { TRAJECTORY_PROFILES } from '@/data/trajectories';
import { MISSION_EVENTS } from '@/data/events';
import { INITIAL_ACHIEVEMENTS } from '@/data/achievements';
import { sounds } from '@/lib/sound';

interface GameState {
  // Navigation
  screen: ScreenState;
  previousScreen: ScreenState | null;
  setScreen: (screen: ScreenState) => void;

  // Sound & Settings
  isMuted: boolean;
  toggleMute: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;

  // Player Progression
  credits: number;
  unlockedMissionIds: string[];
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  unlockAchievement: (id: string) => void;

  // Active Mission
  activeMission: MissionData;
  setActiveMission: (mission: MissionData) => void;

  // Spacecraft Builder
  selectedComponentIds: string[];
  toggleComponent: (componentId: string) => void;
  clearComponents: () => void;
  loadRecommendedBuild: () => void;
  loadLroBuild: () => void;

  // Launch Vehicle & Trajectory
  selectedLauncherId: string;
  setLauncherId: (id: string) => void;
  selectedTrajectoryId: 'direct' | 'hohmann' | 'fast';
  setTrajectoryId: (id: 'direct' | 'hohmann' | 'fast') => void;

  // Computed Spacecraft Stats
  totalCostM: number;
  totalMassKg: number;
  powerGeneratedW: number;
  powerConsumedW: number;
  netPowerW: number;
  batteryCapacityWh: number;
  fuelCapacityPct: number;
  calculatedRiskPct: number;
  sciencePotential: number;
  activeSynergies: SynergyBonus[];

  // Validation
  isTooHeavy: boolean;
  isPowerDeficit: boolean;
  isBudgetExceeded: boolean;
  hasStructure: boolean;
  hasInstruments: boolean;
  hasPowerSource: boolean;
  hasComm: boolean;
  hasPropulsion: boolean;
  canLaunch: boolean;

  // Launch Simulation
  launchStatus: 'STANDBY' | 'COUNTING' | 'IGNITION' | 'LIFTOFF' | 'MAX_Q' | 'STAGING' | 'ORBIT_ACHIEVED' | 'ABORTED';
  countdown: number;
  telemetryAltitudeKm: number;
  telemetryVelocityKmh: number;
  startCountdown: () => void;
  setLaunchStatus: (status: GameState['launchStatus']) => void;
  updateLaunchTelemetry: (alt: number, vel: number) => void;

  // Mission Control Live Simulation
  missionPhase: MissionPhase;
  missionProgress: number; // 0 to 100
  simSpeed: number; // 0 (pause), 1, 2, 4
  setSimSpeed: (speed: number) => void;
  elapsedDays: number;
  distanceCoveredKm: number;
  currentVelocityKms: number;
  currentFuelPct: number;
  currentPowerW: number;
  currentCommPct: number;
  currentRiskPct: number;
  scienceCollected: number;
  discoveriesCount: number;
  
  // Events & Decisions
  activeEvent: MissionEvent | null;
  resolvedEventIds: string[];
  decisionLog: MissionDecisionRecord[];
  resolveEventOption: (event: MissionEvent, optionIndex: number) => void;
  triggerEventById: (eventId: string) => void;
  
  // Simulation Loop Tick
  tickSimulation: (deltaSeconds: number) => void;
  initMissionSimulation: () => void;

  // Debrief & Completion
  debriefResult: MissionDebriefResult | null;
  completeMission: (status: 'SUCCESS' | 'PARTIAL' | 'FAILURE') => void;
  resetForNewMission: () => void;
}

// Helper to compute stats
function calculateStats(
  selectedIds: string[], 
  mission: MissionData, 
  launcherId: string, 
  trajectoryId: 'direct' | 'hohmann' | 'fast'
) {
  const selectedComponents = SPACECRAFT_COMPONENTS.filter(c => selectedIds.includes(c.id));
  const launcher = LAUNCH_VEHICLES.find(l => l.id === launcherId) || LAUNCH_VEHICLES[1];
  const trajectory = TRAJECTORY_PROFILES.find(t => t.id === trajectoryId) || TRAJECTORY_PROFILES[0];

  let cost = launcher.costM;
  let mass = 0;
  let powerGen = 0;
  let powerCons = 0;
  let batteryCap = 0;
  let fuelCap = 0;
  let riskMod = 0;
  let science = 0;

  let hasStructure = false;
  let hasInstruments = false;
  let hasPowerSource = false;
  let hasComm = false;
  let hasPropulsion = false;

  for (const c of selectedComponents) {
    cost += c.costM;
    mass += c.massKg;
    if (c.powerGeneratedW) powerGen += c.powerGeneratedW;
    if (c.powerW) powerCons += c.powerW;
    if (c.batteryCapacity) batteryCap += c.batteryCapacity;
    if (c.fuelCapacityPct) fuelCap += c.fuelCapacityPct;
    riskMod += c.riskModPct;
    if (c.scienceValue) science += c.scienceValue;

    if (c.category === 'structure') hasStructure = true;
    if (c.category === 'instruments') hasInstruments = true;
    if (c.category === 'power') hasPowerSource = true;
    if (c.category === 'communication') hasComm = true;
    if (c.category === 'propulsion') hasPropulsion = true;
  }

  // Active Synergies
  const activeSynergies: SynergyBonus[] = [];
  for (const syn of SYNERGY_BONUSES) {
    const hasAll = syn.requiredComponentIds.every(id => selectedIds.includes(id));
    if (hasAll) {
      activeSynergies.push(syn);
      science += syn.bonusScience;
      riskMod -= syn.bonusRiskReduction;
    }
  }

  // Factor in launcher reliability
  const launcherRisk = (100 - launcher.reliabilityPct);
  // Factor in trajectory trade-offs
  const trajRisk = trajectory.riskModPct;
  const trajScience = Math.round(science * (trajectory.scienceBonusPct / 100));
  science += trajScience;

  const baseRisk = Math.max(5, Math.min(85, 20 + launcherRisk + trajRisk + riskMod));
  const netPower = powerGen - powerCons;

  const isTooHeavy = mass > mission.maxMassKg || mass > launcher.maxPayloadKg;
  const isPowerDeficit = powerGen < powerCons && powerGen > 0;
  const isBudgetExceeded = cost > mission.budget;

  const canLaunch = 
    !isTooHeavy && 
    !isBudgetExceeded && 
    hasInstruments && 
    hasPowerSource && 
    hasComm && 
    hasPropulsion &&
    mass > 0;

  return {
    totalCostM: cost,
    totalMassKg: mass,
    powerGeneratedW: powerGen,
    powerConsumedW: powerCons,
    netPowerW: netPower,
    batteryCapacityWh: batteryCap,
    fuelCapacityPct: Math.min(100, fuelCap),
    calculatedRiskPct: baseRisk,
    sciencePotential: science,
    activeSynergies,
    isTooHeavy,
    isPowerDeficit,
    isBudgetExceeded,
    hasStructure,
    hasInstruments,
    hasPowerSource,
    hasComm,
    hasPropulsion,
    canLaunch
  };
}

// Initial defaults
const initialMission = MISSIONS[0];
const initialLauncher = 'launch-medium';
const initialTrajectory = 'hohmann';
const defaultComponentIds = [
  'struct-light',
  'cam-hires',
  'inst-spectrometer',
  'pwr-solar-adv',
  'pwr-battery-std',
  'comm-high-gain',
  'prop-medium',
  'therm-blanket',
  'nav-imu'
];

export const useGameStore = create<GameState>((set, get) => {
  // Read persisted data if in browser
  let initialCredits = 1000;
  const initialUnlocked = ['mission-01', 'mission-02', 'mission-03', 'mission-04'];
  let initialAch = INITIAL_ACHIEVEMENTS;
  let initialLeaderboard: LeaderboardEntry[] = [
    {
      id: 'lb-1',
      playerName: 'FlightDir_Vance',
      missionName: 'Lunar Explorer',
      score: 94,
      science: 92,
      safety: 96,
      efficiency: 91,
      date: '2026-09-28',
      status: 'SUCCESS'
    },
    {
      id: 'lb-2',
      playerName: 'AstroKranz',
      missionName: 'Mars Pathfinder',
      score: 88,
      science: 85,
      safety: 89,
      efficiency: 87,
      date: '2026-09-25',
      status: 'SUCCESS'
    },
    {
      id: 'lb-3',
      playerName: 'Commander_Nova',
      missionName: 'Asteroid Surveyor',
      score: 82,
      science: 89,
      safety: 74,
      efficiency: 84,
      date: '2026-09-21',
      status: 'SUCCESS'
    }
  ];

  if (typeof window !== 'undefined') {
    try {
      const savedCredits = localStorage.getItem('beyond_earth_credits');
      if (savedCredits) initialCredits = Number(savedCredits);

      const savedAch = localStorage.getItem('beyond_earth_achievements');
      if (savedAch) initialAch = JSON.parse(savedAch);

      const savedLb = localStorage.getItem('beyond_earth_leaderboard');
      if (savedLb) initialLeaderboard = JSON.parse(savedLb);
    } catch {
      // ignore
    }
  }

  const initialStats = calculateStats(defaultComponentIds, initialMission, initialLauncher, initialTrajectory);

  return {
    screen: 'title',
    previousScreen: null,
    setScreen: (screen) => {
      const current = get().screen;
      sounds.playClick();
      set({ screen, previousScreen: current });
    },

    isMuted: sounds.getMuted(),
    toggleMute: () => {
      const muted = sounds.toggleMute();
      set({ isMuted: muted });
    },

    reducedMotion: false,
    toggleReducedMotion: () => {
      sounds.playClick();
      set((state) => ({ reducedMotion: !state.reducedMotion }));
    },

    credits: initialCredits,
    unlockedMissionIds: initialUnlocked,
    achievements: initialAch,
    leaderboard: initialLeaderboard,

    unlockAchievement: (id: string) => {
      const state = get();
      const currentAch = [...state.achievements];
      const target = currentAch.find(a => a.id === id);
      if (target && !target.unlocked) {
        target.unlocked = true;
        target.unlockedAt = new Date().toISOString();
        if (typeof window !== 'undefined') {
          localStorage.setItem('beyond_earth_achievements', JSON.stringify(currentAch));
        }
        sounds.playScienceDiscovery();
        set({ achievements: currentAch });
      }
    },

    activeMission: initialMission,
    setActiveMission: (mission: MissionData) => {
      sounds.playToggle();
      const stats = calculateStats(get().selectedComponentIds, mission, get().selectedLauncherId, get().selectedTrajectoryId);
      set({ activeMission: mission, ...stats });
    },

    selectedComponentIds: defaultComponentIds,
    toggleComponent: (componentId: string) => {
      sounds.playClick();
      const current = get().selectedComponentIds;
      let next: string[];
      if (current.includes(componentId)) {
        next = current.filter(id => id !== componentId);
      } else {
        next = [...current, componentId];
      }
      const stats = calculateStats(next, get().activeMission, get().selectedLauncherId, get().selectedTrajectoryId);
      
      // Check synergy achievement
      if (stats.activeSynergies.length > 0) {
        get().unlockAchievement('ach-synergy');
      }

      set({ selectedComponentIds: next, ...stats });
    },

    clearComponents: () => {
      sounds.playClick();
      const next: string[] = [];
      const stats = calculateStats(next, get().activeMission, get().selectedLauncherId, get().selectedTrajectoryId);
      set({ selectedComponentIds: next, ...stats });
    },

    loadRecommendedBuild: () => {
      sounds.playToggle();
      const next = [
        'struct-light',
        'cam-hires',
        'inst-spectrometer',
        'inst-altimeter',
        'pwr-solar-adv',
        'pwr-battery-std',
        'comm-high-gain',
        'prop-medium',
        'therm-blanket',
        'nav-imu'
      ];
      const stats = calculateStats(next, get().activeMission, get().selectedLauncherId, get().selectedTrajectoryId);
      set({ selectedComponentIds: next, ...stats });
    },

    loadLroBuild: () => {
      sounds.playToggle();
      const next = [
        'struct-light',
        'nasa-inst-lroc',
        'nasa-inst-lola',
        'nasa-inst-diviner',
        'nasa-inst-minirf',
        'pwr-solar-adv',
        'pwr-battery-std',
        'comm-high-gain',
        'prop-medium',
        'therm-blanket',
        'nav-imu'
      ];
      const stats = calculateStats(next, get().activeMission, get().selectedLauncherId, get().selectedTrajectoryId);
      set({ selectedComponentIds: next, ...stats });
    },

    selectedLauncherId: initialLauncher,
    setLauncherId: (id: string) => {
      sounds.playToggle();
      const stats = calculateStats(get().selectedComponentIds, get().activeMission, id, get().selectedTrajectoryId);
      set({ selectedLauncherId: id, ...stats });
    },

    selectedTrajectoryId: initialTrajectory,
    setTrajectoryId: (id: 'direct' | 'hohmann' | 'fast') => {
      sounds.playToggle();
      const stats = calculateStats(get().selectedComponentIds, get().activeMission, get().selectedLauncherId, id);
      set({ selectedTrajectoryId: id, ...stats });
    },

    ...initialStats,

    // Launch Simulation
    launchStatus: 'STANDBY',
    countdown: 10,
    telemetryAltitudeKm: 0,
    telemetryVelocityKmh: 0,

    startCountdown: () => {
      set({ launchStatus: 'COUNTING', countdown: 10 });
    },

    setLaunchStatus: (status) => set({ launchStatus: status }),
    updateLaunchTelemetry: (alt, vel) => set({ telemetryAltitudeKm: alt, telemetryVelocityKmh: vel }),

    // Live Mission Control Simulation
    missionPhase: 'COUNTDOWN',
    missionProgress: 0,
    simSpeed: 1,
    setSimSpeed: (simSpeed) => {
      sounds.playClick();
      set({ simSpeed });
    },
    elapsedDays: 0,
    distanceCoveredKm: 0,
    currentVelocityKms: 0,
    currentFuelPct: 100,
    currentPowerW: 0,
    currentCommPct: 95,
    currentRiskPct: 20,
    scienceCollected: 0,
    discoveriesCount: 0,

    activeEvent: null,
    resolvedEventIds: [],
    decisionLog: [],

    initMissionSimulation: () => {
      const stats = calculateStats(get().selectedComponentIds, get().activeMission, get().selectedLauncherId, get().selectedTrajectoryId);
      set({
        missionPhase: 'LIFTOFF',
        missionProgress: 0,
        simSpeed: 1,
        elapsedDays: 0,
        distanceCoveredKm: 0,
        currentVelocityKms: 1.2,
        currentFuelPct: stats.fuelCapacityPct,
        currentPowerW: stats.powerGeneratedW > 0 ? stats.powerGeneratedW : 250,
        currentCommPct: 98,
        currentRiskPct: stats.calculatedRiskPct,
        scienceCollected: 0,
        discoveriesCount: 0,
        activeEvent: null,
        resolvedEventIds: [],
        decisionLog: []
      });
    },

    triggerEventById: (eventId: string) => {
      const evt = MISSION_EVENTS.find(e => e.id === eventId);
      if (evt && !get().resolvedEventIds.includes(eventId)) {
        sounds.playWarning();
        set({ activeEvent: evt, simSpeed: 0 }); // pause during critical choice
      }
    },

    resolveEventOption: (event: MissionEvent, optionIndex: number) => {
      const opt = event.options[optionIndex];
      const state = get();
      sounds.playClick();

      let nextSci = state.scienceCollected;
      let nextRisk = state.currentRiskPct;
      let nextFuel = state.currentFuelPct;
      let nextPower = state.currentPowerW;
      let nextComm = state.currentCommPct;
      let nextDays = state.elapsedDays;

      if (opt.effects.science) nextSci = Math.max(0, nextSci + opt.effects.science);
      if (opt.effects.risk) nextRisk = Math.max(2, Math.min(99, nextRisk + opt.effects.risk));
      if (opt.effects.fuel) nextFuel = Math.max(0, Math.min(100, nextFuel + opt.effects.fuel));
      if (opt.effects.power) nextPower = Math.max(0, nextPower + opt.effects.power);
      if (opt.effects.comm) nextComm = Math.max(5, Math.min(100, nextComm + opt.effects.comm));
      if (opt.effects.timeDays) nextDays += opt.effects.timeDays;

      const record: MissionDecisionRecord = {
        id: `dec-${Date.now()}`,
        timestamp: `Day ${Math.floor(nextDays)}`,
        title: event.title,
        chosenOptionLabel: opt.label,
        impactSummary: opt.decisionLogText,
        scienceDelta: opt.effects.science || 0,
        riskDelta: opt.effects.risk || 0,
        fuelDelta: opt.effects.fuel || 0
      };

      let discoveriesInc = 0;
      if (event.category === 'discovery' && (opt.effects.science || 0) > 10) {
        discoveriesInc = 1;
        sounds.playScienceDiscovery();
      }

      set({
        scienceCollected: nextSci,
        currentRiskPct: nextRisk,
        currentFuelPct: nextFuel,
        currentPowerW: nextPower,
        currentCommPct: nextComm,
        elapsedDays: nextDays,
        discoveriesCount: state.discoveriesCount + discoveriesInc,
        activeEvent: null,
        simSpeed: 1, // resume normal simulation
        resolvedEventIds: [...state.resolvedEventIds, event.id],
        decisionLog: [...state.decisionLog, record]
      });
    },

    tickSimulation: (deltaSec: number) => {
      const state = get();
      if (state.simSpeed === 0 || state.activeEvent !== null) return;
      if (state.missionPhase === 'MISSION_COMPLETE' || state.missionPhase === 'MISSION_FAILED') return;

      const rate = 0.8 * state.simSpeed * deltaSec;
      const nextProgress = Math.min(100, state.missionProgress + rate);

      // Advance mission elapsed time & distance
      const totalDays = state.activeMission.missionWindowDays;
      const nextElapsedDays = (nextProgress / 100) * totalDays;
      const nextDistance = (nextProgress / 100) * state.activeMission.targetDistanceKm;

      // Dynamic velocity curve
      let nextVel = 2.4;
      if (nextProgress < 15) nextVel = 7.8; // Low Earth Orbit orbital speed
      else if (nextProgress < 30) nextVel = 10.9; // TLI escape velocity
      else if (nextProgress < 75) nextVel = 1.4; // Mid-course cruise
      else if (nextProgress < 90) nextVel = 2.1; // Orbit capture burn
      else nextVel = 1.6; // Orbital science mapping speed

      // Incremental science accumulation
      const maxPotential = state.sciencePotential;
      const incrementalSci = (deltaSec * state.simSpeed * 0.4 * (maxPotential / 100));
      const nextScience = Math.min(maxPotential * 1.5, state.scienceCollected + incrementalSci);

      // Slight fuel burn over time
      const fuelBurn = deltaSec * state.simSpeed * 0.08;
      const nextFuel = Math.max(0, state.currentFuelPct - fuelBurn);

      // Phase transitions based on progress
      let nextPhase = state.missionPhase;
      if (nextProgress >= 95) nextPhase = 'SCIENCE_OPERATIONS';
      else if (nextProgress >= 80) nextPhase = 'ORBITAL_INSERTION';
      else if (nextProgress >= 30) nextPhase = 'CRUISE';
      else if (nextProgress >= 15) nextPhase = 'TRANSIT_INJECTION';
      else if (nextProgress >= 5) nextPhase = 'EARTH_ORBIT';

      // Check for triggerable events along progress
      const pRatio = nextProgress / 100;
      for (const evt of MISSION_EVENTS) {
        if (!state.resolvedEventIds.includes(evt.id) && pRatio >= evt.triggeredAtProgress) {
          get().triggerEventById(evt.id);
          return;
        }
      }

      // Check mission failure conditions: Fuel ran out or Risk reached 100% or Power depleted to 0
      if (nextFuel <= 0 && nextProgress < 70) {
        get().completeMission('FAILURE');
        return;
      }
      if (state.currentRiskPct >= 98) {
        get().completeMission('FAILURE');
        return;
      }

      // Check completion
      if (nextProgress >= 100) {
        const meetsSci = nextScience >= state.activeMission.minScienceRequired;
        const meetsSafety = state.currentRiskPct < 70;
        if (meetsSci && meetsSafety) {
          get().completeMission('SUCCESS');
        } else {
          get().completeMission('PARTIAL');
        }
        return;
      }

      set({
        missionProgress: nextProgress,
        missionPhase: nextPhase,
        elapsedDays: nextElapsedDays,
        distanceCoveredKm: nextDistance,
        currentVelocityKms: Number(nextVel.toFixed(2)),
        scienceCollected: Number(nextScience.toFixed(1)),
        currentFuelPct: Number(nextFuel.toFixed(1))
      });
    },

    debriefResult: null,

    completeMission: (status) => {
      const state = get();
      const mission = state.activeMission;

      if (status === 'SUCCESS') {
        sounds.playSuccess();
      } else if (status === 'FAILURE') {
        sounds.playFailure();
      } else {
        sounds.playWarning();
      }

      // Calculate component scores 0 - 100
      const targetSci = mission.minScienceRequired;
      const scienceRatio = Math.min(1.2, state.scienceCollected / targetSci);
      const scienceScore = Math.min(100, Math.round(scienceRatio * 85));

      const safetyScore = Math.max(10, Math.min(100, Math.round(100 - state.currentRiskPct)));
      const fuelScore = Math.min(100, Math.round(state.currentFuelPct * 1.1));
      const budgetScore = Math.min(100, Math.round(100 - ((state.totalCostM / mission.budget) * 20)));
      const efficiencyScore = Math.round((fuelScore + budgetScore) / 2);

      let totalScore = Math.round((scienceScore * 0.4) + (safetyScore * 0.3) + (efficiencyScore * 0.2) + (budgetScore * 0.1));
      if (status === 'FAILURE') totalScore = Math.min(45, totalScore);

      let rankTitle = 'MISSION LEARNING EXPERIENCE';
      if (totalScore >= 90) rankTitle = 'MISSION LEGEND';
      else if (totalScore >= 75) rankTitle = 'MISSION SPECIALIST';
      else if (totalScore >= 60) rankTitle = 'MISSION SURVIVOR';

      // Check achievements
      const unlockedAch: string[] = [];
      if (status === 'SUCCESS' || status === 'PARTIAL') {
        get().unlockAchievement('ach-first-orbit');
        unlockedAch.push('ach-first-orbit');
      }
      if (state.totalCostM >= mission.budget * 0.95 && state.totalCostM <= mission.budget) {
        get().unlockAchievement('ach-zero-waste');
        unlockedAch.push('ach-zero-waste');
      }
      if (state.currentRiskPct < 15) {
        get().unlockAchievement('ach-safe-hands');
        unlockedAch.push('ach-safe-hands');
      }
      if (state.scienceCollected >= 90) {
        get().unlockAchievement('ach-scientist');
        unlockedAch.push('ach-scientist');
      }
      if (state.currentFuelPct < 15 && status !== 'FAILURE') {
        get().unlockAchievement('ach-fuel-pinch');
        unlockedAch.push('ach-fuel-pinch');
      }
      if (totalScore >= 90) {
        get().unlockAchievement('ach-perfect');
        unlockedAch.push('ach-perfect');
      }

      // Add to local leaderboard
      const newEntry: LeaderboardEntry = {
        id: `entry-${Date.now()}`,
        playerName: 'Director Player',
        missionName: mission.name,
        score: totalScore,
        science: Math.round(state.scienceCollected),
        safety: safetyScore,
        efficiency: efficiencyScore,
        date: new Date().toISOString().split('T')[0],
        status
      };

      const updatedLb = [newEntry, ...state.leaderboard].sort((a, b) => b.score - a.score).slice(0, 15);
      if (typeof window !== 'undefined') {
        localStorage.setItem('beyond_earth_leaderboard', JSON.stringify(updatedLb));
      }

      // Reward credits on success
      let nextCredits = state.credits;
      if (status === 'SUCCESS') {
        nextCredits += mission.rewardCredits;
      } else if (status === 'PARTIAL') {
        nextCredits += Math.round(mission.rewardCredits * 0.5);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('beyond_earth_credits', String(nextCredits));
      }

      const debrief: MissionDebriefResult = {
        missionId: mission.id,
        missionName: mission.name,
        status,
        totalScore,
        rankTitle,
        scienceScore,
        safetyScore,
        efficiencyScore,
        budgetScore,
        scienceCollected: Math.round(state.scienceCollected),
        targetScience: mission.minScienceRequired,
        fuelRemainingPct: Math.round(state.currentFuelPct),
        riskFinalPct: Math.round(state.currentRiskPct),
        remainingBudgetM: Math.max(0, mission.budget - state.totalCostM),
        missionDurationDays: Math.round(state.elapsedDays),
        discoveriesCount: state.discoveriesCount,
        decisions: state.decisionLog,
        achievementsUnlocked: unlockedAch
      };

      set({
        missionPhase: status === 'FAILURE' ? 'MISSION_FAILED' : 'MISSION_COMPLETE',
        simSpeed: 0,
        debriefResult: debrief,
        screen: 'debrief',
        credits: nextCredits,
        leaderboard: updatedLb
      });
    },

    resetForNewMission: () => {
      sounds.playClick();
      const stats = calculateStats(defaultComponentIds, get().activeMission, get().selectedLauncherId, get().selectedTrajectoryId);
      set({
        screen: 'missions',
        missionProgress: 0,
        missionPhase: 'COUNTDOWN',
        simSpeed: 1,
        activeEvent: null,
        resolvedEventIds: [],
        decisionLog: [],
        debriefResult: null,
        selectedComponentIds: defaultComponentIds,
        ...stats
      });
    }
  };
});
