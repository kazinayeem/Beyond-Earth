'use client';

import React, { useEffect, useRef, useState } from 'react';

export type DetailedLaunchPhase = 
  | 'PRELAUNCH'
  | 'ENGINE_START'
  | 'IGNITION'
  | 'LIFTOFF'
  | 'PAD_CLEARANCE'
  | 'ASCENT'
  | 'MAX_Q'
  | 'HIGH_ALTITUDE'
  | 'STAGE_SEPARATION'
  | 'UPPER_STAGE'
  | 'ORBIT_INSERTION'
  | 'ORBIT_ACHIEVED';

interface LaunchCanvasProps {
  phase: DetailedLaunchPhase;
  countdown: number;
  altitudeKm: number;
  velocityKmh: number;
  accelerationG: number;
  dynamicPressureKPa: number;
  fuelPct: number;
  reducedMotion?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'flame' | 'smoke' | 'spark' | 'rcs';
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
}

export const LaunchSequenceCanvas: React.FC<LaunchCanvasProps> = ({
  phase,
  countdown,
  altitudeKm,
  velocityKmh,
  accelerationG,
  dynamicPressureKPa,
  fuelPct,
  reducedMotion = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dims, setDims] = useState({ width: 800, height: 450 });

  // Deterministic starfield in space
  const starsRef = useRef<Star[]>(
    Array.from({ length: 140 }, (_, i) => ({
      x: ((i * 137.5) % 1000) / 1000,
      y: ((i * 73.1) % 1000) / 1000,
      size: ((i * 19) % 18) / 10 + 0.4,
      baseAlpha: ((i * 31) % 70) / 100 + 0.3,
      twinkleSpeed: ((i * 17) % 20) / 10 + 1
    }))
  );

  // Separation animation state refs
  const stageSepRef = useRef({
    boosterOffset: 0,
    boosterRot: 0,
    fairingOffset: 0,
    fairingRot: 0
  });

  // Handle dynamic container resizing (ResizeObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDims({
            width: Math.floor(width),
            height: Math.floor(height)
          });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const particles: Particle[] = [];

    const render = () => {
      time += 0.035;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;

      // --- 1. CAMERA SHAKE BASED ON ENGINE & AERODYNAMIC FORCES ---
      let shakeX = 0;
      let shakeY = 0;
      if (!reducedMotion) {
        if (phase === 'ENGINE_START') {
          shakeX = (Math.random() - 0.5) * 1.2;
          shakeY = (Math.random() - 0.5) * 1.2;
        } else if (phase === 'IGNITION') {
          shakeX = (Math.random() - 0.5) * 3.5;
          shakeY = (Math.random() - 0.5) * 3.5;
        } else if (phase === 'LIFTOFF' || phase === 'PAD_CLEARANCE') {
          shakeX = (Math.random() - 0.5) * 4.2;
          shakeY = (Math.random() - 0.5) * 4.2;
        } else if (phase === 'ASCENT') {
          shakeX = (Math.random() - 0.5) * 2.8;
          shakeY = (Math.random() - 0.5) * 2.8;
        } else if (phase === 'MAX_Q') {
          // Dynamic transonic buffeting
          shakeX = (Math.random() - 0.5) * 3.8;
          shakeY = (Math.random() - 0.5) * 3.8;
        } else if (phase === 'STAGE_SEPARATION') {
          // Brief sharp staging jolt
          shakeX = (Math.random() - 0.5) * 4.5;
          shakeY = (Math.random() - 0.5) * 4.5;
        } else if (phase === 'UPPER_STAGE' || phase === 'ORBIT_INSERTION') {
          // Smooth vacuum upper stage burn
          shakeX = (Math.random() - 0.5) * 0.8;
          shakeY = (Math.random() - 0.5) * 0.8;
        }
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.clearRect(-15, -15, width + 30, height + 30);

      // --- 2. CAMERA TRACKING & ROCKET KINEMATICS ---
      // The rocket stays comfortably framed in the viewport!
      // In early launch it sits near lower-mid, then smoothly moves to center as camera follows.
      let rocketY: number;
      let rocketAngle = 0;

      if (phase === 'PRELAUNCH' || phase === 'ENGINE_START' || phase === 'IGNITION') {
        rocketY = height * 0.50;
      } else if (phase === 'ORBIT_ACHIEVED') {
        rocketY = height * 0.38;
        rocketAngle = Math.PI / 2.25; // Horizontal orbital flight attitude
      } else {
        // Liftoff to orbit: camera follows the rocket upward so it settles at ~height * 0.42
        const climbRatio = Math.min(1, altitudeKm / 12);
        rocketY = height * (0.50 - climbRatio * 0.09);

        // Realistic gravity turn pitch schedule:
        // Rocket begins gentle pitch over after 8 km, reaching horizontal at 180 km
        if (altitudeKm > 8) {
          const pitchProg = Math.min(1, Math.max(0, (altitudeKm - 8) / 170));
          rocketAngle = pitchProg * (Math.PI / 2.3);
        }
      }

      // Ground Position: moves smoothly downward as rocket gains altitude
      // Rocket altitude 0 -> pad at rocketY + 68
      // As rocket climbs, ground moves down and exits viewport
      const altitudePx = Math.min(height * 2.5, altitudeKm * 65);
      const groundY = (height * 0.50 + 68) + altitudePx;

      // --- 3. DYNAMIC ATMOSPHERIC SKY TO ORBITAL SPACE TRANSITION ---
      // Low altitude: coastal launch atmosphere
      // Mid altitude: deep stratospheric navy
      // High altitude (> 80 km): true vacuum space
      const spaceRatio = Math.max(0, Math.min(1, altitudeKm / 90));
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);

      if (spaceRatio < 0.25) {
        // Sea level / Troposphere
        skyGrad.addColorStop(0, '#030712');
        skyGrad.addColorStop(0.5, '#0a192f');
        skyGrad.addColorStop(0.85, '#0f2744');
        skyGrad.addColorStop(1, '#1b3b5f');
      } else if (spaceRatio < 0.7) {
        // Stratosphere / Mesosphere
        skyGrad.addColorStop(0, '#000000');
        skyGrad.addColorStop(0.4, '#030712');
        skyGrad.addColorStop(0.8, '#08213d');
        skyGrad.addColorStop(1, '#0e3a61');
      } else {
        // Thermosphere / Space
        skyGrad.addColorStop(0, '#000000');
        skyGrad.addColorStop(0.65, '#020617');
        skyGrad.addColorStop(1, '#071b30');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // --- 4. TWINKLING STARFIELD (Fades in as atmosphere thins) ---
      if (spaceRatio > 0.2) {
        const starAlpha = Math.min(1, (spaceRatio - 0.2) / 0.5);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        starsRef.current.forEach(star => {
          const sx = star.x * width;
          const sy = star.y * height;
          const twinkle = Math.sin(time * star.twinkleSpeed) * 0.25 + 0.75;
          ctx.globalAlpha = star.baseAlpha * starAlpha * twinkle;
          ctx.beginPath();
          ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // --- 5. REALISTIC EARTH HORIZON CURVATURE (High Altitude > 60 km) ---
      if (altitudeKm > 55) {
        const earthAlpha = Math.min(1, (altitudeKm - 55) / 75);
        ctx.save();
        ctx.globalAlpha = earthAlpha;

        // Earth horizon curve parameters
        const horizonCenterY = height + 560;
        const horizonRadius = 640;

        // Multi-layer Rayleigh scattering atmospheric glow
        const earthAtmosphere = ctx.createRadialGradient(
          cx, horizonCenterY, horizonRadius - 10,
          cx, horizonCenterY, horizonRadius + 45
        );
        earthAtmosphere.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
        earthAtmosphere.addColorStop(0.4, 'rgba(14, 165, 233, 0.35)');
        earthAtmosphere.addColorStop(0.8, 'rgba(3, 105, 161, 0.12)');
        earthAtmosphere.addColorStop(1, 'rgba(2, 6, 23, 0)');

        ctx.fillStyle = earthAtmosphere;
        ctx.beginPath();
        ctx.arc(cx, horizonCenterY, horizonRadius + 45, 0, Math.PI * 2);
        ctx.fill();

        // Earth Ocean & Dark Limb
        const oceanGrad = ctx.createRadialGradient(
          cx, horizonCenterY, horizonRadius - 60,
          cx, horizonCenterY, horizonRadius
        );
        oceanGrad.addColorStop(0, '#0369a1');
        oceanGrad.addColorStop(0.8, '#082f49');
        oceanGrad.addColorStop(1, '#020617');

        ctx.fillStyle = oceanGrad;
        ctx.beginPath();
        ctx.arc(cx, horizonCenterY, horizonRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // --- 6. LAUNCH PAD, GANTRY TOWER & FLAME TRENCH (Visible near ground) ---
      if (groundY < height + 100) {
        // Ground Concrete apron
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, groundY, width, height - groundY + 120);

        // Concrete pad seams and surface lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, groundY + 14);
        ctx.lineTo(width, groundY + 14);
        ctx.moveTo(0, groundY + 36);
        ctx.lineTo(width, groundY + 36);
        ctx.stroke();

        // Flame Trench Cavity (Dark heat-resistant deflector pit)
        ctx.fillStyle = '#090d16';
        ctx.fillRect(cx - 85, groundY - 6, 170, 50);

        // Launch Mount Platform & Hold-Down Support Base
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 32, groundY - 14, 64, 14);
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(cx - 32, groundY - 14, 64, 14);

        // Hold-down arms (clamping the rocket)
        const isHeldDown = phase === 'PRELAUNCH' || phase === 'ENGINE_START' || phase === 'IGNITION';
        const clampOffset = isHeldDown ? 0 : 8;

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx - 22 - clampOffset, groundY - 26, 6, 14);
        ctx.fillRect(cx + 16 + clampOffset, groundY - 26, 6, 14);

        // Red & White Launch Umbilical Tower (LUT)
        const towerX = cx - 74;
        const towerWidth = 26;
        const towerTop = groundY - 135;

        // Gantry vertical columns
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(towerX, towerTop, towerWidth, 135);

        // Gantry cross-bracing & floors
        ctx.lineWidth = 1.2;
        for (let gy = towerTop; gy < groundY; gy += 18) {
          ctx.beginPath();
          ctx.moveTo(towerX, gy);
          ctx.lineTo(towerX + towerWidth, gy + 14);
          ctx.moveTo(towerX + towerWidth, gy);
          ctx.lineTo(towerX, gy + 14);
          ctx.stroke();

          // Floor walkways
          ctx.fillStyle = '#64748b';
          ctx.fillRect(towerX - 2, gy, towerWidth + 4, 2);
        }

        // Lightning Mast on top of tower
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(towerX + towerWidth / 2, towerTop);
        ctx.lineTo(towerX + towerWidth / 2, towerTop - 25);
        ctx.stroke();

        // Umbilical Swing Arms (Retracting on ignition/liftoff)
        const armRetracted = !isHeldDown;
        const armAngle = armRetracted ? -0.45 : 0;

        ctx.save();
        ctx.translate(towerX + towerWidth, groundY - 80);
        ctx.rotate(armAngle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(34, 0);
        ctx.stroke();
        // Umbilical hose bundle
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(34, 8);
        ctx.stroke();
        ctx.restore();

        // Pad High-Intensity Xenon Floodlights
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        // Left floodlight beam
        ctx.beginPath();
        ctx.moveTo(cx - 160, groundY);
        ctx.lineTo(cx - 20, groundY - 110);
        ctx.lineTo(cx + 40, groundY - 110);
        ctx.lineTo(cx - 140, groundY);
        ctx.closePath();
        ctx.fill();

        // Right floodlight beam
        ctx.beginPath();
        ctx.moveTo(cx + 160, groundY);
        ctx.lineTo(cx + 20, groundY - 110);
        ctx.lineTo(cx - 40, groundY - 110);
        ctx.lineTo(cx + 140, groundY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // --- 7. PARTICLE ENGINE: BILLOWING TRENCH SMOKE & EXHAUST ---
      // A. Pad Cryo-venting (during countdown)
      if (phase === 'PRELAUNCH') {
        if (Math.random() < 0.4) {
          particles.push({
            x: cx + 10,
            y: rocketY - 42,
            vx: Math.random() * 1.6 + 0.6,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 3 + 2,
            color: 'rgba(241, 245, 249, 0.35)',
            alpha: 0.5,
            decay: 0.02,
            type: 'smoke'
          });
        }
      }

      // B. Engine Start sparklers (T-3s)
      if (phase === 'ENGINE_START') {
        for (let i = 0; i < 4; i++) {
          particles.push({
            x: cx + (Math.random() - 0.5) * 14,
            y: rocketY + 44,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            radius: Math.random() * 2 + 1,
            color: '#fef08a',
            alpha: 0.9,
            decay: 0.05,
            type: 'spark'
          });
        }
      }

      // C. Engine Firing (Ignition, Liftoff, Ascent, Max-Q, Upper Stage)
      const isFiring = 
        phase === 'IGNITION' || 
        phase === 'LIFTOFF' || 
        phase === 'PAD_CLEARANCE' || 
        phase === 'ASCENT' || 
        phase === 'MAX_Q' || 
        phase === 'HIGH_ALTITUDE' ||
        phase === 'UPPER_STAGE' ||
        phase === 'ORBIT_INSERTION';

      if (isFiring) {
        const isUpperStage = phase === 'UPPER_STAGE' || phase === 'ORBIT_INSERTION';
        const flameCount = reducedMotion ? (isUpperStage ? 4 : 8) : (isUpperStage ? 7 : 16);

        // Flame core particles
        const flameAngle = rocketAngle + Math.PI / 2;
        const baseSpeed = isUpperStage ? 8 : 12;

        for (let i = 0; i < flameCount; i++) {
          const colors = isUpperStage 
            ? ['#ffffff', '#a855f7', '#38bdf8', '#6366f1'] // Vacuum blue/violet bloom
            : ['#ffffff', '#38bdf8', '#fef08a', '#f97316', '#ef4444']; // Atmospheric high-thrust flame

          const spread = (Math.random() - 0.5) * (isUpperStage ? 14 : 9);
          const spd = baseSpeed + Math.random() * 6;

          particles.push({
            x: cx + Math.cos(rocketAngle) * spread,
            y: rocketY + 44 + Math.sin(rocketAngle) * spread,
            vx: Math.cos(flameAngle) * spd * 0.35 + (Math.random() - 0.5) * (isUpperStage ? 4 : 2),
            vy: Math.sin(flameAngle) * spd + Math.random() * 2,
            radius: Math.random() * (isUpperStage ? 7 : 5) + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 0.88,
            decay: isUpperStage ? 0.05 : 0.04,
            type: 'flame'
          });
        }

        // Billowing Ground Smoke across the flame trench (Ignition / Liftoff)
        if (groundY < height + 40 && !reducedMotion && !isUpperStage) {
          const smokeSpawnCount = phase === 'IGNITION' ? 5 : 3;
          for (let i = 0; i < smokeSpawnCount; i++) {
            // Leftward trench billow
            particles.push({
              x: cx - 25 - Math.random() * 40,
              y: groundY - 2 + (Math.random() - 0.5) * 6,
              vx: -(Math.random() * 6 + 3),
              vy: -(Math.random() * 1.5 + 0.2),
              radius: Math.random() * 14 + 10,
              color: 'rgba(203, 213, 225, 0.4)',
              alpha: 0.6,
              decay: 0.015,
              type: 'smoke'
            });

            // Rightward trench billow
            particles.push({
              x: cx + 25 + Math.random() * 40,
              y: groundY - 2 + (Math.random() - 0.5) * 6,
              vx: Math.random() * 6 + 3,
              vy: -(Math.random() * 1.5 + 0.2),
              radius: Math.random() * 14 + 10,
              color: 'rgba(203, 213, 225, 0.4)',
              alpha: 0.6,
              decay: 0.015,
              type: 'smoke'
            });
          }
        }
      }

      // D. Update & Render Particles
      const maxParticles = reducedMotion ? 40 : 110;
      if (particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.radius += p.type === 'smoke' ? 0.4 : 0.2;

        if (p.alpha <= 0 || p.y > height + 40) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // --- 8. DETAILED ROCKET RENDERING ---
      ctx.save();
      ctx.translate(cx, rocketY);
      ctx.rotate(rocketAngle);

      // Max-Q Aerodynamic Condensation Shock Cone (Prandtl-Glauert singularity)
      if (phase === 'MAX_Q') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 2.5;
        // Fairing shoulder vapor shock
        ctx.beginPath();
        ctx.ellipse(0, -56, 26, 8, 0, 0, Math.PI * 2);
        ctx.stroke();

        const vaporCone = ctx.createLinearGradient(0, -90, 0, -50);
        vaporCone.addColorStop(0, 'rgba(255, 255, 255, 0)');
        vaporCone.addColorStop(0.6, 'rgba(255, 255, 255, 0.22)');
        vaporCone.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
        ctx.fillStyle = vaporCone;
        ctx.beginPath();
        ctx.moveTo(0, -90);
        ctx.lineTo(-28, -54);
        ctx.lineTo(28, -54);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Boosters & First Stage Decoupling Kinematics
      const isStaged = 
        phase === 'STAGE_SEPARATION' || 
        phase === 'UPPER_STAGE' || 
        phase === 'ORBIT_INSERTION' || 
        phase === 'ORBIT_ACHIEVED';

      if (isStaged) {
        stageSepRef.current.boosterOffset += 0.8;
        stageSepRef.current.boosterRot += 0.015;

        // Decoupled First Stage Core / Boosters tumbling away downward
        const sepDist = stageSepRef.current.boosterOffset;
        const sepRot = stageSepRef.current.boosterRot;

        // Lower Core Stage Falling Away
        ctx.save();
        ctx.translate(0, 36 + sepDist * 1.5);
        ctx.rotate(sepRot * 0.4);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-9, 0, 18, 55);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(-9, 0, 18, 55);
        ctx.restore();

        // Left Booster Falling
        ctx.save();
        ctx.translate(-18 - sepDist * 0.8, 12 + sepDist * 1.2);
        ctx.rotate(-sepRot);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-3.5, -16, 7, 38);
        ctx.restore();

        // Right Booster Falling
        ctx.save();
        ctx.translate(18 + sepDist * 0.8, 12 + sepDist * 1.2);
        ctx.rotate(sepRot);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-3.5, -16, 7, 38);
        ctx.restore();
      } else {
        // Attached Dual Strap-On Solid Boosters
        // Left Booster
        const boosterGrad = ctx.createLinearGradient(-18, 0, -10, 0);
        boosterGrad.addColorStop(0, '#94a3b8');
        boosterGrad.addColorStop(0.5, '#ffffff');
        boosterGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = boosterGrad;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.fillRect(-18, -10, 8, 48);
        ctx.strokeRect(-18, -10, 8, 48);
        // Nosecone
        ctx.beginPath();
        ctx.moveTo(-18, -10);
        ctx.lineTo(-14, -20);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Booster
        const rightBGrad = ctx.createLinearGradient(10, 0, 18, 0);
        rightBGrad.addColorStop(0, '#64748b');
        rightBGrad.addColorStop(0.5, '#ffffff');
        rightBGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = rightBGrad;
        ctx.fillRect(10, -10, 8, 48);
        ctx.strokeRect(10, -10, 8, 48);
        ctx.beginPath();
        ctx.moveTo(10, -10);
        ctx.lineTo(14, -20);
        ctx.lineTo(18, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Main Core Stage (First stage cylinder) - only rendered before staging
      if (!isStaged) {
        const coreGrad = ctx.createLinearGradient(-10, 0, 10, 0);
        coreGrad.addColorStop(0, '#cbd5e1');
        coreGrad.addColorStop(0.35, '#ffffff');
        coreGrad.addColorStop(0.85, '#e2e8f0');
        coreGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = coreGrad;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.fillRect(-10, -38, 20, 76);
        ctx.strokeRect(-10, -38, 20, 76);

        // Core Stage NASA Meatball / Red Stripes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-8, -20, 16, 4);

        // Main Engine Bell (Core Booster)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(-7, 38);
        ctx.lineTo(7, 38);
        ctx.lineTo(10, 47);
        ctx.lineTo(-10, 47);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Upper Stage / Interstage Assembly
      const upperGrad = ctx.createLinearGradient(-9, 0, 9, 0);
      upperGrad.addColorStop(0, '#334155');
      upperGrad.addColorStop(0.4, '#64748b');
      upperGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = upperGrad;
      ctx.fillRect(-9, -56, 18, 18);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(-9, -56, 18, 18);

      // Upper Stage Vacuum Engine Bell
      if (isStaged) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-6, -38);
        ctx.lineTo(6, -38);
        ctx.lineTo(9, -26);
        ctx.lineTo(-9, -26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Hot throat glow
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, -36, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Payload Fairing (Aerodynamic Nosecone)
      // At High Altitude / Orbit: fairings separate to reveal payload
      const fairingJettisoned = phase === 'UPPER_STAGE' || phase === 'ORBIT_INSERTION' || phase === 'ORBIT_ACHIEVED';

      if (fairingJettisoned) {
        stageSepRef.current.fairingOffset += 0.5;
        const fDist = stageSepRef.current.fairingOffset;

        // Satellite Payload Exposed! (Gold MLI bus + solar arrays)
        ctx.save();
        ctx.translate(0, -68);
        // Gold hexagonal probe
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, -4);
        ctx.lineTo(3, -4);
        ctx.lineTo(6, 0);
        ctx.lineTo(3, 4);
        ctx.lineTo(-5, 4);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Solar panels deployed
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.fillRect(-15, -3, 8, 6);
        ctx.strokeRect(-15, -3, 8, 6);
        ctx.fillRect(7, -3, 8, 6);
        ctx.strokeRect(7, -3, 8, 6);
        ctx.restore();

        // Jettisoned fairing half 1 (left)
        ctx.save();
        ctx.translate(-fDist, -65 - fDist * 0.4);
        ctx.rotate(-fDist * 0.02);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-5, -20, 5, 26);
        ctx.restore();

        // Jettisoned fairing half 2 (right)
        ctx.save();
        ctx.translate(fDist, -65 - fDist * 0.4);
        ctx.rotate(fDist * 0.02);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, -20, 5, 26);
        ctx.restore();
      } else {
        // Closed Aerodynamic Payload Fairing
        const fairingGrad = ctx.createLinearGradient(-10, 0, 10, 0);
        fairingGrad.addColorStop(0, '#cbd5e1');
        fairingGrad.addColorStop(0.35, '#ffffff');
        fairingGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = fairingGrad;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-10, -56);
        ctx.quadraticCurveTo(-10, -88, 0, -98);
        ctx.quadraticCurveTo(10, -88, 10, -56);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fairing Center Split Line
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -98);
        ctx.lineTo(0, -56);
        ctx.stroke();
      }

      // --- 9. LAYERED ENGINE EXHAUST RENDERING ---
      if (isFiring) {
        const isUpper = phase === 'UPPER_STAGE' || phase === 'ORBIT_INSERTION';
        const flameOriginY = isUpper ? -26 : 47;

        if (isUpper) {
          // Vacuum Plume Expansion (Wide translucent violet/cyan bloom)
          const vacPlume = ctx.createRadialGradient(
            0, flameOriginY + 20, 4,
            0, flameOriginY + 35, 32
          );
          vacPlume.addColorStop(0, '#ffffff');
          vacPlume.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
          vacPlume.addColorStop(0.7, 'rgba(168, 85, 247, 0.4)');
          vacPlume.addColorStop(1, 'rgba(168, 85, 247, 0)');

          ctx.fillStyle = vacPlume;
          ctx.beginPath();
          ctx.moveTo(-8, flameOriginY);
          ctx.lineTo(8, flameOriginY);
          ctx.lineTo(26, flameOriginY + 50 + Math.random() * 6);
          ctx.lineTo(-26, flameOriginY + 50 + Math.random() * 6);
          ctx.closePath();
          ctx.fill();
        } else {
          // Atmospheric Staged Thrust Flame (High pressure supersonic core)
          // 1. Radiant Outer Flame
          const outerFlameGrad = ctx.createLinearGradient(0, flameOriginY, 0, flameOriginY + 75);
          outerFlameGrad.addColorStop(0, '#fef08a');
          outerFlameGrad.addColorStop(0.4, '#f97316');
          outerFlameGrad.addColorStop(0.85, 'rgba(239, 68, 68, 0.6)');
          outerFlameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

          ctx.fillStyle = outerFlameGrad;
          ctx.beginPath();
          ctx.moveTo(-8, flameOriginY);
          ctx.lineTo(8, flameOriginY);
          ctx.lineTo(0, flameOriginY + 75 + Math.random() * 10);
          ctx.closePath();
          ctx.fill();

          // 2. High-Temperature Mach Diamond Core (Shock diamonds)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(-5, flameOriginY);
          ctx.lineTo(5, flameOriginY);
          ctx.lineTo(0, flameOriginY + 38 + Math.random() * 5);
          ctx.closePath();
          ctx.fill();

          // Shock diamond nodes
          [16, 30, 44].forEach(dY => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.ellipse(0, flameOriginY + dY, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      ctx.restore(); // Restore rocket transform
      ctx.restore(); // Restore camera shake transform

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, [phase, countdown, altitudeKm, velocityKmh, accelerationG, dynamicPressureKPa, fuelPct, reducedMotion, dims]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[220px] flex items-center justify-center overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        className="w-full h-full block rounded-xl border border-cyan-500/20 bg-slate-950 shadow-[0_0_40px_rgba(2,6,23,0.9)]"
      />
    </div>
  );
};
