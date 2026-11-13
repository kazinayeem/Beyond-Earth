import { CREW_ROLES, CREW_ROLE_IDS, SQUAD_MAX_MEMBERS, SQUAD_MIN_MEMBERS, crewRole } from '@/lib/network/crewRoles';

/**
 * Team-building logic: how the 20 roles should be spread over 2–4 people.
 *
 * Ideas encoded here (all rooted in real mission-management practice):
 *  1. COVERAGE      – every role needs an owner; tier-1 roles gate the flight.
 *  2. BALANCE       – nobody should carry a disproportionate load, nobody sits idle.
 *  3. COHESION      – related roles (e.g. all power / thermal / structure) work better in one head,
 *                     because the handover chatter is the part that fails in real teams.
 *  4. CHECKS        – some pairs must NOT be the same person (separation of duties):
 *                     budget vs risk sign-off, go/no-go vs the person who presses the button.
 *  5. SYNERGY BONUS – a well-formed team earns a cohesion bonus in the simulation.
 */

/** Roles ordered so neighbours are synergistic; split into contiguous chunks per member. */
const SYNERGY_CHAIN = [
  // command & control
  'mission_commander', 'mission_director', 'mission_planner', 'project_manager', 'risk_manager',
  // flight operations
  'flight_director', 'flight_controller', 'navigation_officer', 'communication_officer', 'software_engineer',
  // vehicle engineering
  'aerospace_engineer', 'propulsion_engineer', 'mechanical_engineer', 'electrical_engineer', 'thermal_engineer',
  // science & data
  'science_officer', 'planetary_scientist', 'research_scientist', 'data_scientist', 'robotics_engineer',
] as const;

/** Pairs that should be held by different people (soft rule: lowers the team score) */
export const SEPARATION_PAIRS: { a: string; b: string; why: string }[] = [
  { a: 'mission_director', b: 'risk_manager', why: 'The person who owns the budget should not also sign off the risk they are tempted to accept.' },
  { a: 'flight_director', b: 'flight_controller', why: 'The Go / No-Go call and the launch button should need two different people.' },
  { a: 'mission_commander', b: 'flight_controller', why: 'The commander who authorises the campaign should not also be the one pressing ignition.' },
  { a: 'aerospace_engineer', b: 'risk_manager', why: 'Whoever builds the rocket should not also be the independent reviewer of it.' },
];

export type Assignment = Record<string, string[]>; // playerId → role ids

/** Spread the 20 roles over the given players (leader first). Leader always keeps Mission Commander. */
export function suggestAssignment(playerIds: string[], leaderId: string): Assignment {
  const ids = [leaderId, ...playerIds.filter(p => p !== leaderId)];
  const n = Math.max(1, Math.min(SQUAD_MAX_MEMBERS, ids.length));
  const out: Assignment = Object.fromEntries(ids.map(i => [i, []]));
  const chain = [...SYNERGY_CHAIN];
  const total = chain.length;
  // contiguous chunks, sizes differ by at most 1
  let cursor = 0;
  const chunks: string[][] = [];
  for (let i = 0; i < n; i++) {
    const size = Math.floor(total / n) + (i < total % n ? 1 : 0);
    chunks.push(chain.slice(cursor, cursor + size));
    cursor += size;
  }
  chunks.forEach((c, i) => { out[ids[i]] = c; });

  // Fix separation conflicts by swapping the second role of a pair into the lightest other member
  for (const pair of SEPARATION_PAIRS) {
    const holderA = ids.find(i => out[i].includes(pair.a));
    const holderB = ids.find(i => out[i].includes(pair.b));
    if (holderA && holderA === holderB && n > 1) {
      const other = ids.filter(i => i !== holderA).sort((x, y) => out[x].length - out[y].length)[0];
      // never take Mission Commander away from the leader
      const moving = pair.b === 'mission_commander' ? pair.a : pair.b;
      out[holderA] = out[holderA].filter(r => r !== moving);
      out[other] = [...out[other], moving];
    }
  }
  return out;
}

export interface TeamEvaluation {
  score: number; // 0..100
  grade: 'Excellent' | 'Good' | 'Workable' | 'Risky';
  assigned: number;
  unassigned: string[];
  warnings: { level: 'info' | 'warn' | 'bad'; text: string }[];
  /** Applied in the simulation: extra science (%) and risk reduction (percentage points) */
  bonus: { sciencePct: number; riskPts: number };
}

export function evaluateTeam(assignment: Assignment, memberIds: string[], leaderId: string): TeamEvaluation {
  const warnings: TeamEvaluation['warnings'] = [];
  const n = memberIds.length;
  const owner = new Map<string, string>();
  const dup: string[] = [];
  for (const [pid, roles] of Object.entries(assignment)) {
    for (const r of roles) {
      if (owner.has(r)) dup.push(r);
      owner.set(r, pid);
    }
  }
  const unassigned = CREW_ROLE_IDS.filter(r => !owner.has(r));
  let score = 100;

  if (n < SQUAD_MIN_MEMBERS) {
    score -= 40;
    warnings.push({ level: 'bad', text: `A squad mission needs at least ${SQUAD_MIN_MEMBERS} crew members.` });
  }
  if (dup.length) { score -= 20; warnings.push({ level: 'bad', text: 'A role is assigned to two people — each role must have one owner.' }); }

  // Coverage: leader inherits unassigned roles, but that concentrates load and removes checks
  const t1Missing = unassigned.filter(r => crewRole(r).tier === 1);
  if (unassigned.length) {
    score -= Math.min(25, unassigned.length * 2.5);
    warnings.push({
      level: t1Missing.length ? 'warn' : 'info',
      text: `${unassigned.length} role${unassigned.length > 1 ? 's' : ''} unassigned — the leader covers them: ${unassigned.slice(0, 4).map(r => crewRole(r).short).join(', ')}${unassigned.length > 4 ? '…' : ''}.`,
    });
  }

  // Balance
  const loads = memberIds.map(id => (assignment[id] ?? []).length);
  const fair = CREW_ROLE_IDS.length / Math.max(1, n);
  memberIds.forEach((id, i) => {
    if (loads[i] === 0 && n > 1) { score -= 12; warnings.push({ level: 'warn', text: 'A crew member has no role, so they have nothing to do in the mission room.' }); }
    else if (loads[i] > fair + 3) { score -= 8; warnings.push({ level: 'warn', text: `One member holds ${loads[i]} roles — consider spreading the load (ideal ≈ ${Math.round(fair)}).` }); }
  });

  // Separation of duties
  for (const pair of SEPARATION_PAIRS) {
    const a = owner.get(pair.a) ?? leaderId;
    const b = owner.get(pair.b) ?? leaderId;
    if (a === b && n > 1) { score -= 6; warnings.push({ level: 'warn', text: `${crewRole(pair.a).short} + ${crewRole(pair.b).short} on one person. ${pair.why}` }); }
  }

  // Cohesion: reward when a member's roles come from few groups
  const groupsPer = memberIds.map(id => new Set((assignment[id] ?? []).map(r => crewRole(r).group)).size);
  const avgGroups = groupsPer.reduce((a, b) => a + b, 0) / Math.max(1, groupsPer.length);
  if (avgGroups <= 1.6 && n >= 3) warnings.push({ level: 'info', text: 'Roles are grouped by discipline — great for fast, focused chat.' });
  else if (avgGroups > 2.6) score -= 5;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 55 ? 'Workable' : 'Risky';
  const bonus = score >= 90 ? { sciencePct: 8, riskPts: 3 } : score >= 75 ? { sciencePct: 4, riskPts: 2 } : score >= 55 ? { sciencePct: 0, riskPts: 0 } : { sciencePct: -4, riskPts: -2 };
  if (!warnings.length) warnings.push({ level: 'info', text: 'Balanced crew: every role has an owner and no one is overloaded.' });
  return { score, grade, assigned: owner.size, unassigned, warnings, bonus };
}

/** Why each role matters, ordered by how hard the flight stalls without it — shown in the Crew Planner. */
export const CRITICAL_ROLE_NOTES: { id: string; why: string }[] = [
  { id: 'mission_commander', why: 'Nothing moves past the briefing or onto the pad without their approval.' },
  { id: 'aerospace_engineer', why: 'Only role that can pick the launch vehicle and freeze the build.' },
  { id: 'flight_director', why: 'Declares GO / NO-GO and runs the live simulation clock.' },
  { id: 'flight_controller', why: 'Only role that can commit the countdown.' },
  { id: 'mission_director', why: 'Controls the budget cap that limits every other engineer.' },
  { id: 'risk_manager', why: 'Weather waivers and the radiation-storm decision.' },
];

export const ALL_ROLES_COUNT = CREW_ROLES.length;
