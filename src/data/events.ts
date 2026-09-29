import { MissionEvent } from '@/types/game';

export const MISSION_EVENTS: MissionEvent[] = [
  {
    id: 'evt-solar-storm',
    title: 'Coronal Mass Ejection: Solar Radiation Storm',
    category: 'radiation',
    severity: 'critical',
    description: 'The Space Weather Prediction Center alerts that a Class-X solar flare has erupted directly along our flight path. Intense proton flux is inundating spacecraft avionics and sensitive camera sensors.',
    realWorldContext: 'Coronal Mass Ejections (CMEs) accelerate solar energetic protons up to relativistic speeds. Unshielded integrated circuits risk single-event upsets (SEUs) and latch-ups. NASA missions like LRO use CRaTER detectors to monitor ionizing dosage and orient solar arrays edge-on during peak proton storms.',
    nasaSourceRef: 'NASA Heliophysics DONKI & LRO CRaTER PDS Archive (University of New Hampshire)',
    triggeredAtProgress: 0.28,
    options: [
      {
        label: 'A. Continue Science Operations',
        description: 'Keep sensors unshielded to capture unprecedented solar storm interaction data at the cost of high electronic stress.',
        effects: {
          science: 25,
          risk: 18,
          power: -20
        },
        decisionLogText: 'Elected to brave the solar storm to record high-energy proton flux data.'
      },
      {
        label: 'B. Enter Spacecraft Safe Mode',
        description: 'Orient solar panels edge-on, power down all scientific instruments, and tuck sensor apertures behind main bus shielding.',
        effects: {
          science: -5,
          risk: -12,
          power: 15
        },
        decisionLogText: 'Initiated emergency Safe Mode, shielding payload instruments from ionizing radiation.'
      },
      {
        label: 'C. Execute Evasive Attitude Burn',
        description: 'Fire RCS thrusters to angle the rocket engine nozzle as a sacrificial radiation shield.',
        effects: {
          fuel: -10,
          risk: -8,
          science: 5
        },
        decisionLogText: 'Used engine bell shielding attitude with minor RCS fuel consumption.'
      }
    ]
  },
  {
    id: 'evt-comm-drop',
    title: 'Deep Space Network Carrier Loss',
    category: 'comm',
    severity: 'medium',
    description: 'Goldstone ground station reports signal loss. Spacecraft telemetry stream dropped from 94% to 18%. An antenna gimbal misstep or thermal warpage is suspected.',
    realWorldContext: 'Interplanetary spacecraft communicate through the NASA Deep Space Network (DSN) complexes in Goldstone, Madrid, and Canberra. Extreme thermal gradients during orbital day/night transitions can cause parabolic antenna dish thermal deflection or transponder frequency drift, demanding re-pointing maneuvers.',
    nasaSourceRef: 'NASA Deep Space Network (DSN) Telemetry Standard (JPL D-16838)',
    triggeredAtProgress: 0.45,
    options: [
      {
        label: 'A. Blind Timer Routine',
        description: 'Allow autonomous flight computer to execute planned burns without real-time Houston ground confirmation.',
        effects: {
          risk: 16,
          science: 0
        },
        decisionLogText: 'Permitted autonomous unguided burns during Deep Space Network carrier drop.'
      },
      {
        label: 'B. Reset Transponder & Cycle Power',
        description: 'Perform a cold reboot of the radio frequency subsystem and throttle downlink data rate.',
        effects: {
          comm: 25,
          power: -15,
          risk: -4
        },
        decisionLogText: 'Rebooted RF transponder and re-established clean lock with Deep Space Network.'
      },
      {
        label: 'C. Dynamic Re-acquisition Slewing Burn',
        description: 'Perform a slow 360-degree helical scan while firing low-pulse thrusters to sweep the Earth receiver cone.',
        effects: {
          fuel: -12,
          comm: 35,
          risk: -9,
          science: 4
        },
        decisionLogText: 'Conducted helical thruster slewing scan to lock onto Deep Space Network Earth antenna.'
      }
    ]
  },
  {
    id: 'evt-power-fault',
    title: 'Main Bus 28V Power Surge',
    category: 'power',
    severity: 'critical',
    description: 'A transient short circuit occurred on the primary power distribution bus. Internal battery temperature is climbing and inverter efficiency has degraded.',
    realWorldContext: 'Spacecraft Electrical Power Subsystems (EPS) utilize shunt regulators and Li-Ion battery charge management units. When high-power active instruments (such as synthetic aperture radars) demand burst wattage, solar panel shading or thermal stresses can trigger transient over-current relays.',
    nasaSourceRef: 'NASA Spacecraft Power System Design Guidelines (NASA-STD-4001)',
    triggeredAtProgress: 0.62,
    options: [
      {
        label: 'A. Shed Camera & Optical Load',
        description: 'Disable high-wattage camera heaters and optical imagers to protect main battery cells.',
        effects: {
          science: -12,
          power: 35,
          risk: -5
        },
        decisionLogText: 'Cut power to optical imagers to prevent main bus circuit breaker trip.'
      },
      {
        label: 'B. Isolate Radar & High-Gain Transmitter',
        description: 'Drop heavy radar power draw, rerouting emergency wattage exclusively to flight avionics and navigation.',
        effects: {
          science: -22,
          power: 60,
          risk: -12
        },
        decisionLogText: 'De-energized SAR radar array to stabilize internal battery core temperatures.'
      },
      {
        label: 'C. Enter Cyclical Duty Cycling',
        description: 'Stagger sensor operations into 10-minute pulsed duty windows, preventing thermal runaway while preserving scientific objectives.',
        effects: {
          science: 8,
          power: 20,
          risk: 6
        },
        decisionLogText: 'Programmed aggressive cyclical duty timing across sensor packages.'
      }
    ]
  },
  {
    id: 'evt-anomaly-discovery',
    title: 'Target Body Scientific Anomaly Detected!',
    category: 'discovery',
    severity: 'low',
    description: 'Infrared telemetry reveals an anomalous thermal hotspot and unusual volatile gas venting inside an unexplored polar crater rim. This could represent a monumental planetary discovery!',
    realWorldContext: 'NASA Diviner and Mini-RF radar observations discovered that permanently shadowed regions (PSRs) at the lunar poles act as cryogenic cold traps, dipping to 25 Kelvin (-248°C) and harboring tens of billions of kilograms of water ice, hydroxyl, and methane volatiles.',
    nasaSourceRef: 'NASA PDS Geosciences Node - LRO Diviner & Mini-RF Volatiles Science Report',
    triggeredAtProgress: 0.76,
    options: [
      {
        label: 'A. Conduct Dedicated Low-Pass Dip',
        description: 'Fire delta-V thrusters to drop periapsis to 30km above the anomaly for comprehensive multispectral scanning.',
        effects: {
          science: 38,
          risk: 12,
          fuel: -14
        },
        decisionLogText: 'Executed audacious low-altitude orbit dip, confirming pristine volatile ice reservoirs!'
      },
      {
        label: 'B. Remote Telescopic Telemetry Survey',
        description: 'Maintain safe cruising altitude and slew high-resolution optical cameras for an angled zoom snapshot.',
        effects: {
          science: 18,
          risk: 3,
          fuel: -3
        },
        decisionLogText: 'Captured high-resolution standoff telephoto imagery of the polar surface anomaly.'
      },
      {
        label: 'C. Maintain Nominal Flight Plan',
        description: 'Avoid risking the primary mission timeline. Continue standard orbital mapping profile.',
        effects: {
          science: 0,
          risk: -3
        },
        decisionLogText: 'Prioritized baseline mission objectives over investigating the crater anomaly.'
      }
    ]
  },
  {
    id: 'evt-debris-impact',
    title: 'Micrometeorite Debris Grazing Strike',
    category: 'hardware',
    severity: 'medium',
    description: 'Accelerometer spikes confirm a high-velocity particle strike on the outer thermal blanket. Pressure sensors on propellant tank B show slight vibration.',
    realWorldContext: 'Interplanetary space contains hypervelocity micrometeoroids traveling at 11 to 72 km/s. NASA spacecraft use Multi-Layer Insulation (MLI) blankets and Whipple shielding to vaporize incoming particles upon impact, preventing puncture of pressurized propellant tanks.',
    nasaSourceRef: 'NASA Orbital Debris Program Office (ODPO) & Apollo Thermal Blanket Post-Flight Reports',
    triggeredAtProgress: 0.84,
    options: [
      {
        label: 'A. Initiate Spin Stabilization',
        description: 'Rotate spacecraft at 2 RPM along the longitudinal axis to equalize solar heating across the scarred blanket.',
        effects: {
          risk: -8,
          fuel: -4,
          power: -5
        },
        decisionLogText: 'Executed slow thermal-equilibrium spin maneuver following debris impact.'
      },
      {
        label: 'B. Run Ultrasonic Hull Diagnostic',
        description: 'Command internal transducers to verify fuel line integrity and acoustic resonance.',
        effects: {
          risk: -14,
          power: -12,
          science: 3
        },
        decisionLogText: 'Completed ultrasonic structural verification, securing propellant pressure seals.'
      },
      {
        label: 'C. Patch Avionics & Continue',
        description: 'Isolate affected thermal sensor telemetry channel and push forward.',
        effects: {
          risk: 10,
          fuel: 0
        },
        decisionLogText: 'Bypassed damaged thermal sensor channel without altering flight profile.'
      }
    ]
  }
];
