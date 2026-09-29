# 🚀 Mission Control: Beyond Earth
### Interactive NASA-Style Space Mission Strategy & Simulation Web Game

**Mission Control: Beyond Earth** is an astronautical space mission strategy and simulation game inspired by real-world NASA engineering trade-offs, orbital mechanics, and flight director operations. 

Play as the **Mission Director** at Houston Flight Control: design scientific spacecraft, select launch vehicles, calculate orbital trajectories, manage power, mass, and budgets, survive deep-space radiation storms and communication dropouts, and achieve groundbreaking scientific discoveries.

---

## 🌟 Key Features

### 1. Cinematic Title Screen & Space Ambience
- Deep space animated particle starfield with subtle parallax.
- Earth limb and orbiting Moon visual.
- Web Audio API procedural synthesizer providing realistic telemetry chirps, countdown audio, engine roar, warning klaxons, and victory chords with a master mute toggle.
- Flight Director manual, global leaderboard archives, and system settings.

### 2. Planetary Mission Selection
- **🌙 Mission 01 — Lunar Explorer (Easy | $500M | 1000 kg | 28 days)**: Map the lunar South Pole Aitken basin and search for volatile water ice.
- **🔴 Mission 02 — Mars Pathfinder (Medium | $850M | 1600 kg | 210 days)**: Deep space transit to Mars, executing Mars Orbit Insertion (MOI) and atmospheric spectrometry.
- **☄️ Mission 03 — Asteroid Surveyor (Hard | $700M | 1200 kg | 180 days)**: Rendezvous with near-Earth carbonaceous asteroid 101955 Bennu.
- **🌍 Mission 04 — Earth Observer (Medium | $350M | 800 kg | 14 days)**: Sun-synchronous climate sentinel satellite.

### 3. Flight Director Briefing
- Environmental parameters: surface gravity, atmospheric density, temperature extremes, radiation exposure, and orbital periods.
- Engineering resource constraints: Budget cap, payload mass ceiling, electrical power budget, and mission duration windows.
- Recommended operational strategy inspired by NASA LRO, Artemis, Mars 2020, and OSIRIS-REx.

### 4. Interactive Spacecraft Blueprint Builder
- **7 Subsystem Categories**:
  - **Structure**: Carbon-composite or Titanium radiation-shielded chassis.
  - **Instruments**: Optical Cameras, High-Resolution Multispectral Cameras, Infrared/UV Spectrometer, Synthetic Aperture Radar (SAR), Laser Altimeter (LIDAR), Magnetometer boom.
  - **Power**: High-efficiency UltraFlex solar arrays, Radioisotope Thermoelectric Generators (RTG), and Li-Ion battery banks.
  - **Communication**: Omnidirectional S-band antenna or Gimbaled High-Gain X/Ka-band dish.
  - **Propulsion**: Monopropellant RCS thrusters, Bipropellant chemical motors, or Heavy dual-mode propulsion engines.
  - **Thermal**: Multi-layer insulation (MLI) blankets and active fluid loop radiators.
  - **Navigation**: Star tracker IMUs and Autonomous Optical Navigation (AutoNav) computers.
- **Live CAD Blueprint Canvas**: Real-time 2D isometric schematic rendering unfolding solar wings, rotatable dishes, sensor apertures, and thruster bells.
- **Engineering Synergy Bonuses**: Pairing complementary sensors triggers synergistic bonuses (e.g. Geological Imaging Synergy +18 Science, 3D Topographic Mapping Synergy +24 Science).
- **Real-Time Trade-Off System**: Strict validation safeguards detecting:
  - ❌ `SPACECRAFT TOO HEAVY`
  - ❌ `POWER DEFICIT`
  - ❌ `BUDGET EXCEEDED`
  - ⚠️ `NO INSTRUMENTS / NO POWER / NO COMMS`

### 5. Launch Vehicle & Trajectory Design
- **Launchers**: AeroLift-1 (Small), Atlas-Titan V (Medium), and Nova Heavy (Heavy) with strict payload mass compatibility gates.
- **Trajectories**:
  - Fuel-Efficient Hohmann Transfer (minimum propellant, lower risk, optimal observation).
  - Direct Trans-Lunar Injection (Apollo-heritage balanced transit).
  - Fast Interplanetary Transfer (high-speed sprint, rapid data collection, high deceleration demand).

### 6. Cinematic Launch Sequence
- Audio countdown from T-10 down to ignition.
- Multi-stage rocket physics, cryogenic venting vapor, flame plume particle systems, smoke billowing, and gantry tower umbilical retraction.
- Flight telemetry meters tracking Altitude (km), Velocity (km/h), and staging events (Liftoff, Max-Q, Booster separation, Orbit parking).

### 7. Mission Control Live Dashboard
- **Interactive Orbit Map Canvas**: Visualizes Earth, target body, trajectory curve, spacecraft position, Deep Space Network (DSN) carrier beam, and radar sensor sweep cones.
- **Live Telemetry HUD**: Mission Elapsed Time (MET), Distance traveled, Velocity (km/s), Fuel %, Power Watts, Signal %, Risk %, and Science points.
- **Simulation Time Controls**: 1x, 2x, 4x speed and Pause.
- **Crisis Contingency Event Engine**: Branching in-flight engineering emergencies (Solar storms, Comm carrier loss, 28V bus faults, Micrometeorite strikes, and Anomaly discoveries) with concrete trade-off choices.

### 8. Mission Debrief & Educational Decision Analysis
- Overall Flight Director Score (0–100) and Rank:
  - 90–100: **MISSION LEGEND**
  - 75–89: **MISSION SPECIALIST**
  - 60–74: **MISSION SURVIVOR**
  - Below 60: **MISSION LEARNING EXPERIENCE**
- Animated circular score ratings across Science, Safety, Budget Efficiency, and Mission Efficiency.
- **Key Decision Timeline Analysis**: Step-by-step breakdown of how each choice affected spacecraft survival and scientific yield.
- Confetti victory celebration on success.

---

## 🛠️ Technology Stack

- **Framework**: Next.js (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Vanilla CSS
- **Animation & Transitions**: Framer Motion
- **State Management**: Zustand
- **Graphics & Visualization**: HTML5 Canvas (High-Performance 60 FPS 2D CAD & Space Orbit Renderers)
- **Audio Engine**: Web Audio API Procedural Synthesizer
- **Persistence**: Browser LocalStorage for credits, achievements, and leaderboard records

---

## 🚀 Running Locally

```bash
# Clone the repository
cd "Beyond Earth"

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```
