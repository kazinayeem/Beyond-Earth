import type { MissionDebriefResult } from '@/types/game';
import type { SquadStage } from './permissions';

export interface SquadMember {
  id: string;
  name: string;
  leader: boolean;
  /** roles assigned by the leader */
  roles: string[];
  /** assigned roles + (for the leader) every role nobody else holds */
  effective: string[];
}

export interface SquadCtx {
  gameId: string;
  groupId: string;
  groupName: string;
  userId: string;
  members: SquadMember[];
  myRoles: string[];
  /** The Flight Director's console runs the shared simulation. */
  isHost: boolean;
  hostName: string;
  /** Team-combination bonus applied by the host's simulation */
  bonus: { sciencePct: number; riskPts: number };
}

export interface SquadLaunchState {
  phase: 'idle' | 'go' | 'nogo' | 'counting';
  wxScenario?: 'live' | 'clear' | 'windy' | 'rain' | 'storm';
  waiver?: boolean;
  goBy?: string;
  wx?: { overall: 'GO' | 'MARGINAL' | 'NO-GO'; p: number; cause: string; summary: string };
  outcome?: 'nominal' | 'failure';
  failAtT?: number;
  cause?: string | null;
  startedAt?: number;
}

export interface SquadSim {
  missionPhase: string;
  missionProgress: number;
  simSpeed: number;
  elapsedDays: number;
  distanceCoveredKm: number;
  currentVelocityKms: number;
  currentFuelPct: number;
  currentPowerW: number;
  currentCommPct: number;
  currentRiskPct: number;
  scienceCollected: number;
  discoveriesCount: number;
  activeEventId: string | null;
  resolvedEventIds: string[];
  decisionLog: unknown[];
}

export type SquadCmd =
  | { id: number; kind: 'event'; eventId: string; optionIndex: number; by: string }
  | { id: number; kind: 'ops'; op: string; by: string }
  | { id: number; kind: 'abort'; by: string };

export interface SquadGameState {
  v: number;
  stage: SquadStage;
  baseBudgetM: number;
  budgetM: number;
  costM: number;
  reserveSpentM: number;
  selectedComponentIds: string[];
  selectedLauncherId: string;
  selectedTrajectoryId: 'direct' | 'hohmann' | 'fast';
  launch: SquadLaunchState;
  sim: SquadSim | null;
  cmds: SquadCmd[];
  cmdSeq: number;
  ops: Record<string, number>;
  result: null | { status: 'SUCCESS' | 'PARTIAL' | 'FAILURE'; science: number; fuelPct: number; riskPct: number; cause?: string; debrief?: MissionDebriefResult };
  log: { t: number; by: string; msg: string }[];
}

export interface SquadGameRow {
  id: string;
  group_id: string;
  mission_id: string;
  status: 'active' | 'completed' | 'abandoned';
  state: SquadGameState;
  version: number;
}
