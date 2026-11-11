import { Wrench, FlaskConical, Compass, RadioTower, type LucideIcon } from 'lucide-react';

/** Squad crew roles. Ids match the database check constraint (migration 20261111120000_crew_roles). */
export const CREW_ROLES = [
  { id: 'engineer', label: 'Space Engineer', short: 'Engineer', icon: Wrench, blurb: 'Builds and tunes the spacecraft' },
  { id: 'scientist', label: 'Mission Scientist', short: 'Scientist', icon: FlaskConical, blurb: 'Plans instruments and science goals' },
  { id: 'navigator', label: 'Flight Navigator', short: 'Navigator', icon: Compass, blurb: 'Owns trajectory and burns' },
  { id: 'comms', label: 'Communications Officer', short: 'Comms', icon: RadioTower, blurb: 'Keeps the link to Earth open' },
] as const satisfies readonly { id: string; label: string; short: string; icon: LucideIcon; blurb: string }[];

export type CrewRole = (typeof CREW_ROLES)[number]['id'];
export const CREW_ROLE_IDS = CREW_ROLES.map(r => r.id) as [CrewRole, ...CrewRole[]];
export const crewRole = (id: string | null | undefined) => CREW_ROLES.find(r => r.id === id) ?? CREW_ROLES[0];
