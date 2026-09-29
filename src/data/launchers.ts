import { LaunchVehicle } from '@/types/game';

export const LAUNCH_VEHICLES: LaunchVehicle[] = [
  {
    id: 'launch-small',
    name: 'AeroLift-1 (Small Launcher)',
    costM: 80,
    maxPayloadKg: 500,
    reliabilityPct: 88,
    stages: 2,
    thrustKn: 420,
    description: 'Cost-effective light launcher ideal for micro-sats and compact probes. Lower reliability and strict payload mass limit.',
    icon: 'Feather'
  },
  {
    id: 'launch-medium',
    name: 'Atlas-Titan V (Medium Launcher)',
    costM: 140,
    maxPayloadKg: 1000,
    reliabilityPct: 94,
    stages: 2,
    thrustKn: 890,
    description: 'Workhorse medium-lift rocket with solid upper-stage injection record. The standard choice for lunar science orbiters.',
    icon: 'Rocket'
  },
  {
    id: 'launch-heavy',
    name: 'Nova Heavy (Heavy Launcher)',
    costM: 220,
    maxPayloadKg: 2000,
    reliabilityPct: 97,
    stages: 3,
    thrustKn: 1950,
    description: 'Premier heavy-lift vehicle featuring triple-core cryogenic boosters and exceptional payload safety margin.',
    icon: 'Zap'
  }
];
