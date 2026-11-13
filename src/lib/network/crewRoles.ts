import {
  Crown, Briefcase, Map, ClipboardList, ShieldAlert, Rocket, Wrench, Zap, Terminal, Thermometer,
  FlaskConical, Telescope, Globe2, Database, Bot, Atom, Gauge, Target, Compass, Flame, RadioTower, Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The 20 squad crew roles. This is the ONE list used by the player directory
 * (/players invite dropdown), the squad page (crew cards, planner) and the
 * squad mission room (/squad/[squad]/[mission]).
 *
 * Ids must match `private.crew_role_label()` and the check constraints in
 * supabase/migrations/20261113120000_squad_game.sql.
 */
export type CrewRoleGroup = 'command' | 'engineering' | 'science' | 'operations';

export interface CrewRoleDef {
  id: string;
  label: string;
  /** Short label for compact dropdowns */
  short: string;
  group: CrewRoleGroup;
  /** 1 = mission-critical (gates the flight), 2 = subsystem owner, 3 = support / optimiser */
  tier: 1 | 2 | 3;
  icon: LucideIcon;
  /** One-line summary */
  blurb: string;
  /** Longer description shown in the (i) popup */
  description: string;
  /** What this person is responsible for */
  duties: readonly string[];
  /** What this role can actually DO in the mission room (and nobody else can) */
  controls: readonly string[];
}

export const CREW_ROLE_GROUPS: Record<CrewRoleGroup, { label: string; blurb: string }> = {
  command: { label: 'Command & Management', blurb: 'Decides, funds and signs off the mission' },
  engineering: { label: 'Vehicle Engineering', blurb: 'Designs and builds the rocket and spacecraft' },
  science: { label: 'Science & Data', blurb: 'Chooses instruments and turns data into discoveries' },
  operations: { label: 'Flight Operations', blurb: 'Launches, navigates and talks to the spacecraft' },
};

export const CREW_ROLES = [
  // ── Command & Management ──────────────────────────────────────────────
  {
    id: 'mission_commander', label: 'Mission Commander', short: 'Commander', group: 'command', tier: 1, icon: Crown,
    blurb: 'Final authority over the mission',
    description: 'The Mission Commander owns the mission outcome. In real programmes this is the person who signs the “go” for every major phase and who can call an abort when the crew’s safety or the mission’s value is at stake.',
    duties: ['Approves the mission plan after the briefing', 'Authorises the launch campaign once rocket and trajectory are locked', 'Calls a mission abort in an emergency', 'Keeps the whole crew aligned through chat'],
    controls: ['Approve briefing → opens the spacecraft design phase', 'Authorise launch campaign → moves the crew to the launch pad', 'Abort mission (ends the flight as a failure)'],
  },
  {
    id: 'mission_director', label: 'Mission Director', short: 'Director', group: 'command', tier: 1, icon: Briefcase,
    blurb: 'Owns the budget',
    description: 'The Mission Director controls the money. Raising the cap lets the team buy better hardware, but over-spending lowers the final Budget Efficiency score. Cutting it rewards a lean mission but limits options.',
    duties: ['Sets the budget cap (±30 % of the baseline)', 'Releases contingency funds during flight', 'Balances cost against science return'],
    controls: ['Increase / decrease the budget cap (before launch)', 'Authorise “contingency spend” in flight: buys down risk using unspent budget'],
  },
  {
    id: 'mission_planner', label: 'Mission Planner', short: 'Planner', group: 'command', tier: 2, icon: Map,
    blurb: 'Chooses the trajectory strategy',
    description: 'The Mission Planner designs the flight profile: slow and fuel-efficient, balanced, or a fast sprint. Each profile trades fuel, duration, risk and science opportunity.',
    duties: ['Selects the transfer trajectory profile', 'Explains trade-offs (fuel vs time vs risk) to the crew', 'Keeps the mission inside its time window'],
    controls: ['Select trajectory profile (Hohmann / Direct / Fast)'],
  },
  {
    id: 'project_manager', label: 'Project Manager', short: 'Project Mgr', group: 'command', tier: 3, icon: ClipboardList,
    blurb: 'Schedule and milestone reviews',
    description: 'The Project Manager keeps the programme on schedule. At each flight milestone they run the formal review; a clean review earns a small science and safety bonus for staying disciplined.',
    duties: ['Runs milestone reviews at 25 %, 50 % and 75 % of the flight', 'Tracks the integrated schedule', 'Chases open actions from every subsystem owner'],
    controls: ['Sign milestone reviews in flight (+science, −risk, 3 per mission)'],
  },
  {
    id: 'risk_manager', label: 'Risk Manager', short: 'Risk Mgr', group: 'command', tier: 1, icon: ShieldAlert,
    blurb: 'Weather waivers and risk reviews',
    description: 'The Risk Manager is the independent “what could go wrong” voice. They decide whether marginal weather can be waived at the pad, and they run Failure Mode & Effects reviews during the flight.',
    duties: ['Accepts or rejects weather launch-commit violations', 'Runs risk reviews (FMEA) during cruise', 'Owns radiation-storm decisions'],
    controls: ['Grant / withdraw the launch weather waiver', 'Run in-flight risk review (−risk, 3 per mission)', 'Decide radiation events'],
  },
  // ── Vehicle Engineering ───────────────────────────────────────────────
  {
    id: 'aerospace_engineer', label: 'Aerospace Engineer', short: 'Aerospace', group: 'engineering', tier: 1, icon: Rocket,
    blurb: 'Builds the rocket',
    description: 'The Aerospace Engineer integrates spacecraft and launch vehicle into one flight system. Only they can pick the launch vehicle and sign off the finished build, so the squad cannot fly an unverified rocket.',
    duties: ['Selects the launch vehicle for the payload mass', 'Finalises (freezes) the spacecraft build', 'Handles hardware / debris-impact emergencies'],
    controls: ['Select launch vehicle', 'Finalise build → moves to launcher & trajectory', 'Decide hardware events'],
  },
  {
    id: 'mechanical_engineer', label: 'Mechanical Engineer', short: 'Mechanical', group: 'engineering', tier: 2, icon: Wrench,
    blurb: 'Structure and mechanisms',
    description: 'The Mechanical Engineer owns the primary structure — the chassis that carries every other subsystem through launch loads and radiation.',
    duties: ['Chooses the structural bus', 'Checks mass and stiffness margins', 'Supports hardware emergencies'],
    controls: ['Add / remove Structure components', 'Decide hardware events'],
  },
  {
    id: 'electrical_engineer', label: 'Electrical Engineer', short: 'Electrical', group: 'engineering', tier: 2, icon: Zap,
    blurb: 'Power generation and storage',
    description: 'The Electrical Engineer sizes solar arrays, RTGs and batteries so the spacecraft never runs a power deficit — especially far from the Sun.',
    duties: ['Balances power generated vs consumed', 'Sizes battery storage for eclipses', 'Leads power-fault recovery'],
    controls: ['Add / remove Power components', 'Decide power and radiation events'],
  },
  {
    id: 'software_engineer', label: 'Software Engineer', short: 'Software', group: 'engineering', tier: 2, icon: Terminal,
    blurb: 'Flight software and patches',
    description: 'The Software Engineer owns the flight computer. A well-timed software patch can fix guidance bugs and close fault-protection gaps before they turn into anomalies.',
    duties: ['Maintains flight software', 'Co-owns communication-link recovery', 'Uploads patches while in flight'],
    controls: ['Upload flight-software patch in flight (−risk, 2 per mission)', 'Decide communication events'],
  },
  {
    id: 'thermal_engineer', label: 'Thermal Engineer', short: 'Thermal', group: 'engineering', tier: 2, icon: Thermometer,
    blurb: 'Keeps the spacecraft in temperature range',
    description: 'The Thermal Engineer chooses insulation and radiators so electronics survive both the searing sunlit side and the freezing shadow.',
    duties: ['Selects multi-layer insulation and radiators', 'Monitors thermal margins', 'Supports power-fault events (waste heat)'],
    controls: ['Add / remove Thermal components', 'Decide power events'],
  },
  // ── Science & Data ────────────────────────────────────────────────────
  {
    id: 'science_officer', label: 'Science Officer', short: 'Science', group: 'science', tier: 2, icon: FlaskConical,
    blurb: 'Cameras and imaging payload',
    description: 'The Science Officer leads the science payload and chooses the imaging cameras that make the mission worthwhile.',
    duties: ['Chooses cameras', 'Keeps the science return above the mission minimum', 'Advises on radiation-storm trade-offs'],
    controls: ['Add / remove Camera components', 'Decide discovery and radiation events'],
  },
  {
    id: 'planetary_scientist', label: 'Planetary Scientist', short: 'Planetary', group: 'science', tier: 2, icon: Globe2,
    blurb: 'Real NASA instruments',
    description: 'The Planetary Scientist knows the target body. They pick the real NASA flight instruments (LROC, LOLA, Diviner…) that fit the destination.',
    duties: ['Chooses NASA-heritage instruments', 'Interprets surface and atmosphere data', 'Leads anomaly-discovery investigations'],
    controls: ['Add / remove NASA instrument components', 'Decide discovery events'],
  },
  {
    id: 'research_scientist', label: 'Research Scientist', short: 'Research', group: 'science', tier: 2, icon: Atom,
    blurb: 'Spectrometers, radar, altimeters',
    description: 'The Research Scientist selects the sensing instruments — spectrometers, radar, laser altimeters, magnetometers — and designs the experiments that unlock synergy bonuses.',
    duties: ['Chooses spectrometer / radar / altimeter / magnetometer', 'Plans instrument synergies', 'Interprets unexpected readings'],
    controls: ['Add / remove Instrument components', 'Decide discovery events'],
  },
  {
    id: 'data_scientist', label: 'Data Scientist', short: 'Data', group: 'science', tier: 3, icon: Database,
    blurb: 'Data analysis campaigns',
    description: 'The Data Scientist turns raw telemetry into discoveries. Running a data-fusion pass in flight squeezes extra science out of the same instruments.',
    duties: ['Runs data-fusion analysis passes', 'Prioritises the downlink queue', 'Supports discovery decisions'],
    controls: ['Run analysis campaign in flight (+science, 3 per mission)', 'Decide discovery events'],
  },
  {
    id: 'robotics_engineer', label: 'Robotics Engineer', short: 'Robotics', group: 'science', tier: 3, icon: Bot,
    blurb: 'Arms, samplers and deployables',
    description: 'The Robotics Engineer operates arms, booms and samplers. Deploying them during science operations earns extra science but adds mechanical risk.',
    duties: ['Operates deployable mechanisms', 'Plans sampling sequences', 'Helps with hardware emergencies'],
    controls: ['Deploy robotic arm / sampler in the science phase (+science, +risk, 2 per mission)', 'Decide hardware events'],
  },
  // ── Flight Operations ─────────────────────────────────────────────────
  {
    id: 'flight_director', label: 'Flight Director', short: 'Flight Dir', group: 'operations', tier: 1, icon: Gauge,
    blurb: 'Go / No-Go and mission clock',
    description: 'The Flight Director runs Mission Control. They poll every station for Go / No-Go before launch and control the mission clock in flight. Their console also runs the live simulation for the whole squad.',
    duties: ['Runs the launch Go / No-Go poll', 'Declares GO or NO-GO (weather and hardware permitting)', 'Controls pause and time speed in flight'],
    controls: ['Declare launch GO / NO-GO', 'Pause / 1× / 2× / 4× mission clock', 'Hosts the live simulation for the squad'],
  },
  {
    id: 'flight_controller', label: 'Flight Controller and Astronaut', short: 'Flt Ctrl', group: 'operations', tier: 1, icon: Target,
    blurb: 'Presses the launch button',
    description: 'The Flight Controller and Astronaut is the operator at the pad: after the Flight Director’s GO, only they can commit the countdown and light the engines.',
    duties: ['Executes the countdown', 'Can scrub the launch', 'Monitors ascent telemetry'],
    controls: ['Commit launch (ignition)', 'Scrub launch'],
  },
  {
    id: 'navigation_officer', label: 'Navigation Officer', short: 'Navigation', group: 'operations', tier: 2, icon: Compass,
    blurb: 'Guidance hardware and course corrections',
    description: 'The Navigation Officer owns star trackers and optical navigation, and performs trajectory-correction manoeuvres in flight.',
    duties: ['Chooses IMU / optical navigation hardware', 'Plans mid-course corrections', 'Leads trajectory emergencies'],
    controls: ['Add / remove Navigation components', 'Trajectory-correction manoeuvre in flight (−risk, costs fuel, 2 per mission)', 'Decide trajectory events'],
  },
  {
    id: 'propulsion_engineer', label: 'Propulsion Engineer', short: 'Propulsion', group: 'operations', tier: 2, icon: Flame,
    blurb: 'Engines and propellant',
    description: 'The Propulsion Engineer selects the spacecraft’s thrusters and motors — and therefore the fuel margin that the whole mission relies on.',
    duties: ['Chooses engines and tanks', 'Protects propellant reserves', 'Supports trajectory emergencies'],
    controls: ['Add / remove Propulsion components', 'Decide trajectory events'],
  },
  {
    id: 'communication_officer', label: 'Communication Officer', short: 'Comms', group: 'operations', tier: 2, icon: RadioTower,
    blurb: 'Link to Earth',
    description: 'The Communication Officer keeps the spacecraft talking to the Deep Space Network: antennas, data rate and recovery from carrier loss.',
    duties: ['Chooses antennas and transponders', 'Leads link-loss recovery', 'Reports signal health to the crew'],
    controls: ['Add / remove Communication components', 'Decide communication events'],
  },
] as const satisfies readonly CrewRoleDef[];

export type CrewRole = (typeof CREW_ROLES)[number]['id'];
export const CREW_ROLE_IDS = CREW_ROLES.map(r => r.id) as [CrewRole, ...CrewRole[]];
export const CREW_ROLE_COUNT = CREW_ROLES.length;

const FALLBACK: CrewRoleDef = { ...CREW_ROLES[0], id: 'unknown', label: 'Crew member', short: 'Crew', icon: Users, blurb: 'Role not set', description: 'No role assigned.', duties: [], controls: [] };

/** Look up a role; unknown / legacy ids fall back to a neutral "Crew member". */
export const crewRole = (id: string | null | undefined): CrewRoleDef => (CREW_ROLES as readonly CrewRoleDef[]).find(r => r.id === id) ?? FALLBACK;
export const isCrewRole = (id: string): id is CrewRole => (CREW_ROLE_IDS as string[]).includes(id);

export const SQUAD_MIN_MEMBERS = 2;
export const SQUAD_MAX_MEMBERS = 4;
