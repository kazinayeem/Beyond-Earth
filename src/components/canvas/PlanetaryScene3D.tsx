'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { getEarthTextures, getMoonTextures, getMarsTextures } from '@/lib/planetTextures';

interface PlanetaryScene3DProps {
  width: number;
  height: number;
  earthX: number;
  earthY: number;
  earthR: number;
  targetX: number;
  targetY: number;
  targetR: number;
  targetType: string;
  simSpeed?: number;
}

// Custom Rayleigh Scattering Atmosphere Limb Shader
const AtmosphereShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(-1.2, 0.7, 1.2).normalize() },
    uColor: { value: new THREE.Color('#38bdf8') },
    uGlowIntensity: { value: 0.75 }
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
      
      // Fresnel rim glow: sharp at the planetary grazing edge
      float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
      float rimFactor = pow(rim, 3.2);

      // Sunlight terminator falloff: glow is bright on dayside, subtle on nightside
      float sunDot = max(0.0, dot(vNormal, uSunDirection));
      float sunFactor = smoothstep(-0.2, 0.5, sunDot);

      float alpha = rimFactor * (0.15 + sunFactor * 0.85) * uGlowIntensity;
      if (alpha < 0.003) discard;

      gl_FragColor = vec4(uColor, alpha);
    }
  `
};

/**
 * 3D Realistic Earth: Surface + Cloud Layer + Thin Atmosphere Limb
 */
function Earth3D({
  x,
  y,
  radius,
  simSpeed = 1
}: {
  x: number;
  y: number;
  radius: number;
  simSpeed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const textures = useMemo(() => getEarthTextures(), []);

  const cloudMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      alphaMap:    textures.cloudsMap,
      transparent: true,
      opacity:     0.28,
      depthWrite:  false,
      roughness:   1.0,
      metalness:   0.0,
      color:       '#ffffff'
    });
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
    mat.uniforms.uGlowIntensity.value = 0.55;
    mat.uniforms.uColor.value = new THREE.Color('#5bbfed');
    return mat;
  }, []);

  // Set axial tilt (~23.4 degrees)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = -23.4 * (Math.PI / 180);
    }
  }, []);

  // Slow subtle rotation loop
  useFrame((_, delta) => {
    const speed = simSpeed > 0 ? simSpeed : 0.2;
    if (surfaceRef.current) {
      surfaceRef.current.rotation.y += delta * 0.032 * speed;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.041 * speed;
    }
  });

  return (
    <group ref={groupRef} position={[x, y, 0]}>
      {/* 1. Earth Surface — Real NASA Blue Marble 2K texture */}
      <mesh ref={surfaceRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughnessMap={textures.specularMap}
          roughness={0.82}
          metalness={0.0}
        />
      </mesh>

      {/* 2. Transparent cloud layer — real atmospheric cloud map (alphaMap) */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.012, 64, 64]} />
        <primitive object={cloudMaterial} attach="material" />
      </mesh>

      {/* 3. Thin atmospheric Rayleigh limb — subtle, only visible at planetary edge */}
      <mesh>
        <sphereGeometry args={[radius * 1.038, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * 3D Realistic Moon: Cratered Regolith + LOLA DEM Bump Mapping (NO Atmosphere)
 */
function Moon3D({
  x,
  y,
  radius,
  simSpeed = 1
}: {
  x: number;
  y: number;
  radius: number;
  simSpeed?: number;
}) {
  const moonRef = useRef<THREE.Mesh>(null);
  const textures = useMemo(() => getMoonTextures(), []);

  // Subtle lunar rotation
  useFrame((_, delta) => {
    const speed = simSpeed > 0 ? simSpeed : 0.2;
    if (moonRef.current) {
      moonRef.current.rotation.y += delta * 0.012 * speed;
    }
  });

  return (
    <group position={[x, y, 0]}>
      {/* Moon Surface with Craters, Maria, and Highlands */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={textures.map}
          bumpMap={textures.bumpMap}
          bumpScale={radius * 0.08}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>
      {/* Strictly NO atmosphere for the Moon */}
    </group>
  );
}

/**
 * 3D Realistic Mars (for Mars destination missions)
 */
function Mars3D({
  x,
  y,
  radius,
  simSpeed = 1
}: {
  x: number;
  y: number;
  radius: number;
  simSpeed?: number;
}) {
  const marsRef = useRef<THREE.Mesh>(null);
  const textures = useMemo(() => getMarsTextures(), []);

  const marsAtmosphere = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AtmosphereShader.uniforms),
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide
    });
    mat.uniforms.uColor.value = new THREE.Color('#f97316');
    mat.uniforms.uGlowIntensity.value = 0.45;
    return mat;
  }, []);

  useFrame((_, delta) => {
    const speed = simSpeed > 0 ? simSpeed : 0.2;
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.028 * speed;
    }
  });

  return (
    <group position={[x, y, 0]}>
      <mesh ref={marsRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={textures.map}
          bumpMap={textures.bumpMap}
          bumpScale={radius * 0.06}
          roughness={0.88}
          metalness={0.05}
        />
      </mesh>
      {/* Very faint thin salmon CO2 limb */}
      <mesh>
        <sphereGeometry args={[radius * 1.035, 64, 64]} />
        <primitive object={marsAtmosphere} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Asteroid (for Asteroid/Bennu missions)
 */
function Asteroid3D({
  x,
  y,
  radius,
  simSpeed = 1
}: {
  x: number;
  y: number;
  radius: number;
  simSpeed?: number;
}) {
  const astRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const speed = simSpeed > 0 ? simSpeed : 0.2;
    if (astRef.current) {
      astRef.current.rotation.y += delta * 0.02 * speed;
      astRef.current.rotation.x += delta * 0.015 * speed;
    }
  });

  return (
    <group position={[x, y, 0]}>
      <mesh ref={astRef}>
        <dodecahedronGeometry args={[radius * 0.85, 2]} />
        <meshStandardMaterial color="#64748b" roughness={0.92} metalness={0.1} />
      </mesh>
    </group>
  );
}

/**
 * Space Scene Lighting: Realistic directional sunlight + subtle ambient space starlight
 */
function SceneLighting() {
  const sunDir = useMemo(() => new THREE.Vector3(-1.2, 0.7, 1.2).normalize(), []);

  return (
    <>
      {/* Deep space starlight ambient baseline */}
      <ambientLight color="#071020" intensity={0.25} />

      {/* Primary directional sunlight shining across both Earth and Moon */}
      <directionalLight
        position={[sunDir.x * 600, sunDir.y * 600, sunDir.z * 600]}
        intensity={2.8}
        color="#ffffff"
      />

      {/* Subtle fill light to soften pure black shadow edge */}
      <directionalLight
        position={[sunDir.x * -200, -200, 200]}
        intensity={0.15}
        color="#0369a1"
      />
    </>
  );
}

export const PlanetaryScene3D: React.FC<PlanetaryScene3DProps> = ({
  width,
  height,
  earthX,
  earthY,
  earthR,
  targetX,
  targetY,
  targetR,
  targetType,
  simSpeed = 1
}) => {
  // Translate 2D canvas coordinates (origin top-left) to Three.js orthographic coordinates (origin bottom-left)
  const earth3DY = height - earthY;
  const target3DY = height - targetY;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      <Canvas
        orthographic
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        className="w-full h-full block"
      >
        <OrthographicCamera
          makeDefault
          position={[0, 0, 500]}
          left={0}
          right={width}
          top={height}
          bottom={0}
          near={-1000}
          far={1000}
        />
        <SceneLighting />

        {/* 3D Earth */}
        <Earth3D x={earthX} y={earth3DY} radius={earthR} simSpeed={simSpeed} />

        {/* 3D Target Celestial Body (Moon / Mars / Asteroid) */}
        {targetType === 'Moon' && (
          <Moon3D x={targetX} y={target3DY} radius={targetR} simSpeed={simSpeed} />
        )}
        {targetType === 'Mars' && (
          <Mars3D x={targetX} y={target3DY} radius={targetR} simSpeed={simSpeed} />
        )}
        {targetType !== 'Moon' && targetType !== 'Mars' && (
          <Asteroid3D x={targetX} y={target3DY} radius={targetR} simSpeed={simSpeed} />
        )}
      </Canvas>
    </div>
  );
};
