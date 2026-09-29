'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Radio, Compass, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { sounds } from '@/lib/sound';
import {
  REAL_SATELLITE_NETWORK,
  SatelliteData,
  calculateOrbitPoint
} from '@/data/satellites/satelliteNetwork';
import { getEarthTextures } from '@/lib/planetTextures';

interface HeroOrbitalVisualProps {
  className?: string;
  size?: number;
}

const emptySubscribe = () => () => {};

// Custom Rayleigh Scattering Atmosphere Limb Shader
const AtmosphereShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(-1.2, 0.7, 1.2).normalize() },
    uColor: { value: new THREE.Color('#38bdf8') },
    uGlowIntensity: { value: 0.72 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 uSunDirection;
    uniform vec3 uColor;
    uniform float uGlowIntensity;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
      float rimFactor = pow(rim, 3.2);

      float sunDot = max(0.0, dot(vNormal, uSunDirection));
      float sunFactor = smoothstep(-0.2, 0.5, sunDot);

      float alpha = rimFactor * (0.15 + sunFactor * 0.85) * uGlowIntensity;
      if (alpha < 0.003) discard;

      gl_FragColor = vec4(uColor, alpha);
    }
  `
};

// Earth physical radius used across all sub-meshes
const EARTH_R = 0.82;

/**
 * 3D Earth: Real NASA Blue Marble texture + transparent cloud layer + Rayleigh limb
 *
 * Texture sources (served from /public/textures/):
 *   Surface:  NASA Blue Marble 2K — earth_atmos_2048.jpg (three.js examples / NASA)
 *   Specular: Ocean/land mask     — earth_specular_2048.jpg
 *   Normal:   Elevation map       — earth_normal_2048.jpg
 *   Clouds:   Real cloud layer    — earth_clouds_4k.png (turban/webgl-earth / NASA)
 */
function CentralEarth3D() {
  const earthRef  = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const groupRef  = useRef<THREE.Group>(null);

  const textures = useMemo(() => getEarthTextures(), []);

  // Cloud material — real cloud alpha map, very transparent (0.25 opacity)
  const cloudMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      alphaMap:   textures.cloudsMap,
      transparent: true,
      opacity:    0.28,
      depthWrite: false,
      roughness:  1.0,
      metalness:  0.0,
      color:      '#ffffff'
    });
    return mat;
  }, [textures.cloudsMap]);

  const atmosphereMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AtmosphereShader.uniforms),
      vertexShader:   AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      blending:    THREE.AdditiveBlending,
      transparent: true,
      depthWrite:  false,
      side:        THREE.FrontSide
    });
    // Subtle blue atmosphere glow — not a neon halo
    mat.uniforms.uGlowIntensity.value = 0.55;
    mat.uniforms.uColor.value = new THREE.Color('#5bbfed');
    return mat;
  }, []);

  // 23.4° axial tilt
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = -23.4 * (Math.PI / 180);
    }
  }, []);

  useFrame((_, delta) => {
    // Slow Earth rotation — west-to-east
    if (earthRef.current)  earthRef.current.rotation.y  += delta * 0.032;
    // Clouds drift fractionally faster (atmospheric differential)
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.041;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Earth Surface — Real NASA Blue Marble 2K texture */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_R, 64, 64]} />
        <meshStandardMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughnessMap={textures.specularMap}
          roughness={0.82}
          metalness={0.0}
        />
      </mesh>

      {/* 2. Transparent cloud layer — real atmospheric cloud map */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_R * 1.012, 64, 64]} />
        <primitive object={cloudMaterial} attach="material" />
      </mesh>

      {/* 3. Thin Rayleigh atmosphere limb — only visible at the edge */}
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.038, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * 3D Orbit Trajectory Curve for a single satellite
 */
function OrbitTrajectory({
  sat,
  isHovered,
  isSelected,
  hasSelection
}: {
  sat: SatelliteData;
  isHovered: boolean;
  isSelected: boolean;
  hasSelection: boolean;
}) {
  // Orbit radius matches SatelliteOrbiter (1.6) — outside the Earth sphere (0.82)
  const orbitR = 1.6;
  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const pt = calculateOrbitPoint(sat, theta, orbitR);
      points.push(new THREE.Vector3(pt.x, pt.y, pt.z));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [sat]);

  // Visual opacity hierarchy
  const opacity = isSelected
    ? 0.95
    : isHovered
    ? 0.85
    : hasSelection
    ? 0.08 // Dim non-selected trajectories
    : 0.28;

  const color = isSelected || isHovered ? sat.color : '#38bdf8';

  return (
    <primitive
      object={
        new THREE.LineLoop(
          lineGeometry,
          new THREE.LineBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity,
            // depthWrite false — orbit lines sort naturally with depth buffer
            depthWrite: false
          })
        )
      }
    />
  );
}

// --- 5 DISTINCT RECOGNIZABLE SPACECRAFT SILHOUETTES ---

function ISSSilhouette({ color }: { color: string }) {
  return (
    <group scale={0.75}>
      {/* Central pressurized module cylinder */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Transverse Truss Structure */}
      <mesh>
        <boxGeometry args={[0.34, 0.012, 0.012]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Dual Port Solar Array Wings */}
      <mesh position={[-0.14, 0, 0]}>
        <boxGeometry args={[0.12, 0.002, 0.06]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#0369a1"
          emissiveIntensity={0.25}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Dual Starboard Solar Array Wings */}
      <mesh position={[0.14, 0, 0]}>
        <boxGeometry args={[0.12, 0.002, 0.06]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#0369a1"
          emissiveIntensity={0.25}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Beacon Light */}
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function HSTSilhouette({ color }: { color: string }) {
  return (
    <group scale={0.75}>
      {/* Cylindrical Optical Tube Assembly (OTA) */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.032, 0.032, 0.15, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Aperture Door Shield */}
      <mesh position={[0.08, 0.015, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.034, 0.034, 0.01, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Lateral Twin Solar Panels */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.07, 0.002, 0.045]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#6d28d9"
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[0.07, 0.002, 0.045]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#6d28d9"
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>
      {/* Beacon Light */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function Landsat9Silhouette({ color }: { color: string }) {
  return (
    <group scale={0.75}>
      {/* Gold MLI Earth Observation Bus */}
      <mesh>
        <boxGeometry args={[0.06, 0.06, 0.07]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.65} roughness={0.3} />
      </mesh>
      {/* OLI-2 / TIRS-2 Nadir Optical Aperture */}
      <mesh position={[0, -0.038, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Single Deployable Solar Wing */}
      <mesh position={[0.075, 0, 0]}>
        <boxGeometry args={[0.09, 0.002, 0.05]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#0369a1"
          emissiveIntensity={0.25}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Beacon Light */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function Sentinel2Silhouette({ color }: { color: string }) {
  return (
    <group scale={0.75}>
      {/* Hexagonal Multi-Spectral Payload Bus */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.032, 0.032, 0.08, 6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* MSI Instrument Hood */}
      <mesh position={[0, -0.028, 0]}>
        <boxGeometry args={[0.035, 0.015, 0.035]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Single-Sided Solar Array */}
      <mesh position={[-0.075, 0, 0]}>
        <boxGeometry args={[0.08, 0.002, 0.045]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Beacon Light */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function NOAA20Silhouette({ color }: { color: string }) {
  return (
    <group scale={0.75}>
      {/* JPSS Instrument Box */}
      <mesh>
        <boxGeometry args={[0.07, 0.05, 0.05]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.3} />
      </mesh>
      {/* VIIRS & Sounder Sensor Plate */}
      <mesh position={[0, -0.032, 0]}>
        <boxGeometry args={[0.04, 0.014, 0.03]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Steerable Solar Panel */}
      <mesh position={[0.075, 0, 0]}>
        <boxGeometry args={[0.085, 0.002, 0.045]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#d97706"
          emissiveIntensity={0.25}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Beacon Light */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function SpacecraftModel({ sat }: { sat: SatelliteData }) {
  switch (sat.id) {
    case 'iss':
      return <ISSSilhouette color={sat.color} />;
    case 'hst':
      return <HSTSilhouette color={sat.color} />;
    case 'landsat9':
      return <Landsat9ModelRenderer color={sat.color} />;
    case 'sentinel2':
      return <Sentinel2Silhouette color={sat.color} />;
    case 'noaa20':
      return <NOAA20Silhouette color={sat.color} />;
    default:
      return null;
  }
}

// Renamed helper to avoid name clash
function Landsat9ModelRenderer({ color }: { color: string }) {
  return <Landsat9Silhouette color={color} />;
}

/**
 * Animated Satellite Orbiter Node
 * Visual-only: 3D spacecraft model following its orbital path.
 * No labels, no connector lines, no text — purely visual.
 */
function SatelliteOrbiter({
  sat,
  isHovered,
  isSelected,
  onHover,
  onClick
}: {
  sat: SatelliteData;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onClick: (sat: SatelliteData) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const thetaRef = useRef<number>((sat.raanDeg * Math.PI) / 180);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    thetaRef.current = (thetaRef.current + delta * 0.24 * sat.speedFactor) % (Math.PI * 2);

    const orbitR = 1.6;
    const pt     = calculateOrbitPoint(sat, thetaRef.current, orbitR);
    const nextPt = calculateOrbitPoint(sat, thetaRef.current + 0.015, orbitR);

    groupRef.current.position.set(pt.x, pt.y, pt.z);
    groupRef.current.lookAt(nextPt.x, nextPt.y, nextPt.z);
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick(sat); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(sat.id); }}
      onPointerOut={() => onHover(null)}
    >
      {/* Spacecraft model — slightly brighter when hovered/selected, no text */}
      <group scale={isHovered || isSelected ? 1.12 : 1.0}>
        <SpacecraftModel sat={sat} />
      </group>
    </group>
  );
}


/**
 * Lighting setup for the 3D multi-satellite scene
 */
function MultiOrbitSceneLighting() {
  const sunDir = useMemo(() => new THREE.Vector3(-1.2, 0.7, 1.2).normalize(), []);

  return (
    <>
      {/* Deep space ambient — very dim, preserves day/night contrast */}
      <ambientLight color="#0a1628" intensity={0.18} />

      {/* Primary directional sun — creates strong day/night terminator */}
      <directionalLight
        position={[sunDir.x * 600, sunDir.y * 600, sunDir.z * 600]}
        intensity={3.2}
        color="#fff8f0"
      />

      {/* Very faint cool fill to keep night side from total black */}
      <directionalLight
        position={[-400, -300, 200]}
        intensity={0.08}
        color="#1a3a5c"
      />
    </>
  );
}

export const HeroOrbitalVisual: React.FC<HeroOrbitalVisualProps> = ({
  className = '',
  size = 440
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredSatId, setHoveredSatId] = useState<string | null>(null);
  const [selectedSat, setSelectedSat] = useState<SatelliteData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const hoveredSat = useMemo(() => {
    return REAL_SATELLITE_NETWORK.find((s) => s.id === hoveredSatId) || null;
  }, [hoveredSatId]);

  const handleSelectSat = (sat: SatelliteData) => {
    sounds.playClick();
    setSelectedSat(sat);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    sounds.playClick();
    setIsModalOpen(false);
    setSelectedSat(null);
  };

  return (
    <div
      ref={containerRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      onClick={() => {
        if (!isModalOpen) {
          setSelectedSat(null);
        }
      }}
      className={`relative flex items-center justify-center select-none cursor-pointer group max-w-full h-auto drop-shadow-[0_0_50px_rgba(6,182,212,0.25)] rounded-2xl overflow-hidden ${className}`}
      title="Click any satellite or orbit to inspect real orbital telemetry"
    >
      {/* 3D WebGL Canvas for Earth & 5 Orbital Planes */}
      {mounted && (
        <Canvas
          camera={{
            // Slightly narrower FOV — Earth is smaller, we need more orbital room
            position: [0, 1.4, 4.8],
            fov: 40
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
          className="w-full h-full block"
        >
          <MultiOrbitSceneLighting />

          {/* Central 3D Earth */}
          <CentralEarth3D />

          {/* 5 Distinct Real Satellite Orbits */}
          {REAL_SATELLITE_NETWORK.map((sat) => (
            <OrbitTrajectory
              key={`orbit-${sat.id}`}
              sat={sat}
              isHovered={hoveredSatId === sat.id}
              isSelected={selectedSat?.id === sat.id}
              hasSelection={selectedSat !== null}
            />
          ))}

          {/* 5 Animated Real Satellites — visual only, no labels */}
          {REAL_SATELLITE_NETWORK.map((sat) => (
            <SatelliteOrbiter
              key={`sat-${sat.id}`}
              sat={sat}
              isHovered={hoveredSatId === sat.id}
              isSelected={selectedSat?.id === sat.id}
              onHover={setHoveredSatId}
              onClick={handleSelectSat}
            />
          ))}


        </Canvas>
      )}

      {/* Top Left: Orbital Network Active Badge */}
      <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-slate-950/85 border border-cyan-500/30 font-mono text-[10px] text-cyan-400 backdrop-blur-sm pointer-events-none flex items-center space-x-1.5 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>● ORBITAL NETWORK ACTIVE {'//'} 5 SPACECRAFT TRACKED</span>
      </div>

      {/* Top Right: Simulation / Real Data Badge */}
      <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-950/85 border border-slate-800 font-mono text-[9px] text-slate-300 backdrop-blur-sm pointer-events-none hidden sm:flex items-center space-x-1.5">
        <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
        <span>SIMULATION {'//'} REAL ORBITAL DATA</span>
      </div>

      {/* Bottom Left: Provenance Sources Badge */}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-slate-950/85 border border-emerald-500/30 font-mono text-[9px] text-emerald-400 backdrop-blur-sm pointer-events-none flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>CELESTRAK / NASA / USGS / ESA</span>
      </div>

      {/* Bottom Right: Spacecraft Count Badge */}
      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-slate-950/85 border border-slate-700/60 font-mono text-[10px] text-slate-400 backdrop-blur-sm pointer-events-none">
        TRACKING: 05
      </div>



      {/* Detailed Spacecraft Telemetry Modal */}
      {isModalOpen && selectedSat && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-2 z-40 p-3.5 bg-slate-950/95 backdrop-blur-md rounded-2xl flex flex-col justify-between border border-cyan-500/40 text-left cursor-default animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-mono text-xs font-bold text-white uppercase">
                  SPACECRAFT TELEMETRY {'//'} {selectedSat.fullName}
                </div>
                <div className="font-mono text-[9px] text-slate-400">
                  OPERATOR: {selectedSat.operator}
                </div>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Telemetry Elements Grid */}
          <div className="grid grid-cols-2 gap-2 my-2 font-mono text-[10px]">
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <span className="text-slate-500">ORBIT REGIME</span>
              <div className="text-cyan-400 font-bold text-xs mt-0.5">
                {selectedSat.orbitClass}
              </div>
              <div className="text-slate-500 text-[9px]">{selectedSat.missionType}</div>
            </div>

            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <span className="text-slate-500">ALTITUDE (APO / PERI)</span>
              <div className="text-white font-bold text-xs mt-0.5">
                {selectedSat.apoapsisKm} / {selectedSat.periapsisKm} km
              </div>
              <div className="text-slate-500 text-[9px]">Mean: ~{selectedSat.altitudeKm} km</div>
            </div>

            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <span className="text-slate-500">INCLINATION / PERIOD</span>
              <div className="text-purple-400 font-bold text-xs mt-0.5">
                {selectedSat.inclinationDeg}° {'//'} {selectedSat.periodMinutes}m
              </div>
              <div className="text-slate-500 text-[9px]">Eccentricity: {selectedSat.eccentricity}</div>
            </div>

            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <span className="text-slate-500">ORBITAL VELOCITY</span>
              <div className="text-emerald-400 font-bold text-xs mt-0.5">
                {selectedSat.velocityKms} km/s
              </div>
              <div className="text-slate-500 text-[9px]">Vis-Viva Orbital Speed</div>
            </div>

            <div className="p-2 rounded bg-slate-900/90 border border-slate-800 col-span-2">
              <div className="flex items-center justify-between text-slate-500">
                <span>CATALOG IDENTIFIERS</span>
                <span className="text-emerald-400 text-[9px]">STATUS: NOMINAL</span>
              </div>
              <div className="text-slate-200 font-bold text-[11px] mt-0.5">
                NORAD #{selectedSat.noradId} {'//'} COSPAR: {selectedSat.intlDesig}
              </div>
              <div className="text-slate-400 text-[9px] mt-1 line-clamp-2">
                {selectedSat.description}
              </div>
            </div>
          </div>

          {/* Footer with Data Source & Link */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono">
            <div className="text-slate-400 flex items-center space-x-1.5 truncate max-w-[240px]">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">SOURCE: {selectedSat.source}</span>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={selectedSat.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white flex items-center space-x-1 transition-colors"
              >
                <span>OFFICIAL DATA</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={handleCloseModal}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
