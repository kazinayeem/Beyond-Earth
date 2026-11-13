import type { CrewRole } from '@/lib/network/crewRoles';
import type { MissionEvent } from '@/types/game';

/**
 * Who may do what inside a squad mission room.
 *
 * IMPORTANT: this file is mirrored in SQL (`private.squad_action_roles`,
 * `private.squad_component_roles`, `private.squad_event_roles`,
 * `private.squad_ops_def` in migration 20261113120000_squad_game.sql). The
 * database is the real authority; this copy only drives the UI (which buttons
 * are enabled, which role names to show). Keep both in sync.
 */

export type SquadStage = 'briefing' | 'builder' | 'launcher_trajectory' | 'launch' | 'mission_control' | 'debrief';
export const SQUAD_STAGES: SquadStage[] = ['briefing', 'builder', 'launcher_trajectory', 'launch', 'mission_control', 'debrief'];

/** Simple one-shot / repeatable actions → the roles that may perform them */
export const ACTION_ROLES = {
  'briefing.approve': ['mission_commander'],
  'budget.adjust': ['mission_director'],
  'plan.trajectory': ['mission_planner'],
  'build.launcher': ['aerospace_engineer'],
  'build.finalize': ['aerospace_engineer'],
  'launch.authorize': ['mission_commander'],
  'launch.go': ['flight_director'],
  'launch.wx': ['flight_director'],
  'launch.waiver': ['risk_manager'],
  'launch.commit': ['flight_controller'],
  'launch.scrub': ['flight_controller', 'flight_director'],
  'sim.speed': ['flight_director'],
  'mission.abort': ['mission_commander'],
} as const satisfies Record<string, readonly CrewRole[]>;
export type SquadAction = keyof typeof ACTION_ROLES;

/** Component id prefix → roles that may add / remove such components */
const COMPONENT_PREFIX_ROLES: [string, CrewRole][] = [
  ['nasa-inst-', 'planetary_scientist'], // must be tested before "inst-"
  ['struct-', 'mechanical_engineer'],
  ['cam-', 'science_officer'],
  ['inst-', 'research_scientist'],
  ['pwr-', 'electrical_engineer'],
  ['comm-', 'communication_officer'],
  ['prop-', 'propulsion_engineer'],
  ['therm-', 'thermal_engineer'],
  ['nav-', 'navigation_officer'],
];
export function componentOwnerRole(componentId: string): CrewRole | null {
  for (const [prefix, role] of COMPONENT_PREFIX_ROLES) if (componentId.startsWith(prefix)) return role;
  return null;
}

/** Mission-event category → roles that may choose the response */
export const EVENT_ROLES: Record<MissionEvent['category'], readonly CrewRole[]> = {
  radiation: ['risk_manager', 'science_officer', 'electrical_engineer'],
  comm: ['communication_officer', 'software_engineer'],
  power: ['electrical_engineer', 'thermal_engineer'],
  trajectory: ['navigation_officer', 'propulsion_engineer', 'mission_planner'],
  discovery: ['planetary_scientist', 'research_scientist', 'data_scientist', 'science_officer'],
  hardware: ['mechanical_engineer', 'aerospace_engineer', 'robotics_engineer'],
};
/** Mirror of src/data/events.ts ids → category (used by the database, which has no copy of events.ts) */
export const EVENT_CATEGORY_BY_ID: Record<string, MissionEvent['category']> = {
  'evt-solar-storm': 'radiation',
  'evt-comm-drop': 'comm',
  'evt-power-fault': 'power',
  'evt-anomaly-discovery': 'discovery',
  'evt-debris-impact': 'hardware',
};

/** In-flight role actions. The server enforces role, per-mission limit and progress window; the host console applies the effects. */
export interface OpsDef {
  id: string;
  role: CrewRole;
  label: string;
  hint: string;
  max: number;
  minProgress: number;
  maxProgress: number;
  effects: { science?: number; risk?: number; fuel?: number; power?: number; comm?: number; spendM?: number };
}
export const OPS: Record<string, OpsDef> = {
  contingency: { id: 'contingency', role: 'mission_director', label: 'Contingency spend $25M', hint: 'Spend unused budget to cut risk', max: 99, minProgress: 5, maxProgress: 100, effects: { risk: -4, spendM: 25 } },
  milestone: { id: 'milestone', role: 'project_manager', label: 'Sign milestone review', hint: 'Clean review: +science, −risk', max: 3, minProgress: 25, maxProgress: 100, effects: { science: 4, risk: -1 } },
  risk_review: { id: 'risk_review', role: 'risk_manager', label: 'Run risk review (FMEA)', hint: 'Find and retire a failure mode', max: 3, minProgress: 10, maxProgress: 100, effects: { risk: -3 } },
  course_correct: { id: 'course_correct', role: 'navigation_officer', label: 'Trajectory correction burn', hint: '−risk, costs fuel', max: 2, minProgress: 15, maxProgress: 80, effects: { risk: -3, fuel: -3 } },
  analyze: { id: 'analyze', role: 'data_scientist', label: 'Run data-fusion analysis', hint: '+science from existing data', max: 3, minProgress: 20, maxProgress: 100, effects: { science: 6 } },
  deploy: { id: 'deploy', role: 'robotics_engineer', label: 'Deploy arm / sampler', hint: '+science, +risk (science phase only)', max: 2, minProgress: 75, maxProgress: 100, effects: { science: 10, risk: 2 } },
  patch: { id: 'patch', role: 'software_engineer', label: 'Upload flight-software patch', hint: '−risk, small power cost', max: 2, minProgress: 10, maxProgress: 100, effects: { risk: -3, power: -4 } },
};

/** The effective roles held by a member: their own, plus — for the leader — every role nobody else holds. */
export function effectiveRoles(
  uid: string,
  members: { player_id: string; role: 'leader' | 'member'; crew_roles: string[] }[],
  allRoles: readonly string[],
): Set<string> {
  const mine = members.find(m => m.player_id === uid);
  const held = new Set<string>(mine?.crew_roles ?? []);
  if (mine?.role === 'leader') {
    const taken = new Set(members.flatMap(m => m.crew_roles));
    allRoles.forEach(r => { if (!taken.has(r)) held.add(r); });
  }
  return held;
}

/** Who currently holds a role (leader inherits unassigned roles) — for "Ask <name>" hints. */
export function holdersOf<M extends { player_id: string; role: 'leader' | 'member'; crew_roles: string[] }>(roleIds: readonly string[], members: M[]): M[] {
  return members.filter(m => {
    const eff = effectiveRoles(m.player_id, members, [...roleIds]);
    return roleIds.some(r => eff.has(r));
  });
}
