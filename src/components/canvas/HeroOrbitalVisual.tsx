'use client';

import React, { useEffect, useRef } from 'react';

interface HeroOrbitalVisualProps {
  className?: string;
  size?: number;
}

export const HeroOrbitalVisual: React.FC<HeroOrbitalVisualProps> = ({
  className = '',
  size = 440
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let orbitAngle = 0;
    let lastTime = performance.now();

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!prefersReducedMotion) {
        // Orbit speed: 1 full orbit every ~16 seconds
        orbitAngle += dt * 0.38;
      }

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const earthRadius = size * 0.16; // ~70px on 440px canvas

      // --- 1. COORDINATE NAVIGATION GRID & RANGE RINGS ---
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      // Orbital Range Rings
      [size * 0.28, size * 0.38, size * 0.46].forEach((ringR) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringR, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshair Axes
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX - size * 0.46, centerY);
      ctx.lineTo(centerX + size * 0.46, centerY);
      ctx.moveTo(centerX, centerY - size * 0.46);
      ctx.lineTo(centerX, centerY + size * 0.46);
      ctx.stroke();
      ctx.restore();

      // --- 2. ELLIPTICAL ORBITAL PATH ---
      const a = size * 0.38; // semi-major axis
      const b = size * 0.24; // semi-minor axis
      const tiltAngle = -0.32; // ~-18 degrees tilt

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tiltAngle);

      // Orbital ellipse track
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Apogee & Perigee Marker Nodes
      ctx.setLineDash([]);
      // Perigee (closest)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-a, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Apogee (farthest)
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(a, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Trajectory direction arrows along ellipse
      [0.2, 0.7, 1.2, 1.7].forEach((posPhase) => {
        const theta = orbitAngle * 0.5 + posPhase * Math.PI;
        const arrowX = a * Math.cos(theta);
        const arrowY = b * Math.sin(theta);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.arc(arrowX, arrowY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // --- 3. REALISTIC EARTH VISUAL (NASA Blue Marble Inspired) ---
      // Outer Atmospheric Rayleigh scattering glow
      const earthAtmosphere = ctx.createRadialGradient(
        centerX,
        centerY,
        earthRadius * 0.9,
        centerX,
        centerY,
        earthRadius * 1.5
      );
      earthAtmosphere.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
      earthAtmosphere.addColorStop(0.35, 'rgba(14, 165, 233, 0.3)');
      earthAtmosphere.addColorStop(0.75, 'rgba(3, 105, 161, 0.1)');
      earthAtmosphere.addColorStop(1, 'rgba(2, 6, 23, 0)');

      ctx.fillStyle = earthAtmosphere;
      ctx.beginPath();
      ctx.arc(centerX, centerY, earthRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Base Ocean Sphere with 3D Specular Highlight
      const earthOcean = ctx.createRadialGradient(
        centerX - earthRadius * 0.35,
        centerY - earthRadius * 0.35,
        earthRadius * 0.1,
        centerX,
        centerY,
        earthRadius
      );
      earthOcean.addColorStop(0, '#38bdf8'); // specular sun reflection
      earthOcean.addColorStop(0.3, '#0284c7'); // deep azure ocean
      earthOcean.addColorStop(0.7, '#0369a1');
      earthOcean.addColorStop(1, '#082f49'); // deep limb shadow

      ctx.fillStyle = earthOcean;
      ctx.beginPath();
      ctx.arc(centerX, centerY, earthRadius, 0, Math.PI * 2);
      ctx.fill();

      // Continents & Landmasses (Masked inside Earth sphere)
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, earthRadius, 0, Math.PI * 2);
      ctx.clip();

      // Planetary rotation
      const rot = (now * 0.0003) % (Math.PI * 2);

      // Landmass Colors (Authentic vegetative & arid terrain)
      ctx.fillStyle = '#15803d'; // terrestrial green

      // Continental shapes with orbital rotation offset
      // North America
      ctx.beginPath();
      ctx.ellipse(
        centerX - earthRadius * 0.28 + Math.sin(rot) * 6,
        centerY - earthRadius * 0.25,
        earthRadius * 0.38,
        earthRadius * 0.26,
        0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // South America
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(
        centerX - earthRadius * 0.18 + Math.sin(rot) * 6,
        centerY + earthRadius * 0.35,
        earthRadius * 0.24,
        earthRadius * 0.42,
        -0.2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Eurasia / Africa
      ctx.fillStyle = '#1e3a1e';
      ctx.beginPath();
      ctx.ellipse(
        centerX + earthRadius * 0.4 + Math.sin(rot + 1.8) * 8,
        centerY - earthRadius * 0.1,
        earthRadius * 0.42,
        earthRadius * 0.48,
        -0.1,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Arid Sahara / Middle East terrain
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.ellipse(
        centerX + earthRadius * 0.35 + Math.sin(rot + 1.8) * 8,
        centerY + earthRadius * 0.05,
        earthRadius * 0.28,
        earthRadius * 0.18,
        0.1,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Swirling Atmospheric Cloud Layer
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(
        centerX - earthRadius * 0.1 + Math.sin(rot * 1.2) * 8,
        centerY - earthRadius * 0.35,
        earthRadius * 0.5,
        earthRadius * 0.14,
        -0.15,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        centerX + earthRadius * 0.2 + Math.sin(rot * 1.1) * 9,
        centerY + earthRadius * 0.2,
        earthRadius * 0.42,
        earthRadius * 0.12,
        0.25,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 3D Shadow Terminator (Day / Night Shading)
      const terminator = ctx.createLinearGradient(
        centerX - earthRadius * 0.8,
        centerY - earthRadius * 0.8,
        centerX + earthRadius * 0.9,
        centerY + earthRadius * 0.9
      );
      terminator.addColorStop(0, 'rgba(0, 0, 0, 0)');
      terminator.addColorStop(0.48, 'rgba(2, 6, 23, 0.15)');
      terminator.addColorStop(0.78, 'rgba(2, 6, 23, 0.78)');
      terminator.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
      ctx.fillStyle = terminator;
      ctx.fillRect(
        centerX - earthRadius,
        centerY - earthRadius,
        earthRadius * 2,
        earthRadius * 2
      );

      ctx.restore();

      // --- 4. REALISTIC SPACECRAFT PROBE MODEL ---
      // Spacecraft Position along tilted ellipse
      const cosO = Math.cos(orbitAngle);
      const sinO = Math.sin(orbitAngle);
      // Coordinate in un-tilted frame
      const ex = a * cosO;
      const ey = b * sinO;
      // Tangent velocity vector for probe heading
      const edx = -a * sinO;
      const edy = b * cosO;

      // Apply tilt transform
      const cosT = Math.cos(tiltAngle);
      const sinT = Math.sin(tiltAngle);
      const scX = centerX + (ex * cosT - ey * sinT);
      const scY = centerY + (ex * sinT + ey * cosT);
      const vX = edx * cosT - edy * sinT;
      const vY = edx * sinT + edy * cosT;
      const scHeading = Math.atan2(vY, vX);

      // Deep Space Network Telemetry Radio Beam (to Earth)
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -now * 0.04;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(scX, scY);
      ctx.stroke();
      ctx.restore();

      // Spacecraft Render
      ctx.save();
      ctx.translate(scX, scY);
      ctx.rotate(scHeading);

      // Ion Thruster Glow Plume
      const plumeGrad = ctx.createLinearGradient(-18, 0, -4, 0);
      plumeGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      plumeGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.5)');
      plumeGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(-16 + (Math.sin(now * 0.02) * 2), 0);
      ctx.lineTo(-5, 2);
      ctx.closePath();
      ctx.fill();

      // Photovoltaic Solar Wings (Top & Bottom)
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.8;
      // Top Wing
      ctx.fillRect(-6, -17, 12, 9);
      ctx.strokeRect(-6, -17, 12, 9);
      // Wing Solar Cell divider lines
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(0, -8);
      ctx.moveTo(-6, -12.5);
      ctx.lineTo(6, -12.5);
      ctx.stroke();

      // Bottom Wing
      ctx.fillRect(-6, 8, 12, 9);
      ctx.strokeRect(-6, 8, 12, 9);
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, 17);
      ctx.moveTo(-6, 12.5);
      ctx.lineTo(6, 12.5);
      ctx.stroke();

      // Wing Struts / Booms
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, -3);
      ctx.moveTo(0, 3);
      ctx.lineTo(0, 8);
      ctx.stroke();

      // Hexagonal Spacecraft Bus (Gold MLI Thermal Foil)
      ctx.fillStyle = '#f59e0b'; // amber/gold thermal blanket
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(3, -4);
      ctx.lineTo(7, 0);
      ctx.lineTo(3, 4);
      ctx.lineTo(-5, 4);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // High-Gain Parabolic Telemetry Dish
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(10, 0, 5, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      // Feed horn boom
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      ctx.restore();

      // --- 5. TECHNICAL TELEMETRY CALLOUTS ---
      ctx.save();
      ctx.font = '10px monospace';

      // Apogee Callout (Top Right)
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('APOGEE: 384,400 KM', size * 0.62, size * 0.14);
      ctx.fillStyle = '#64748b';
      ctx.fillText('INCLINATION: 28.5°', size * 0.62, size * 0.19);

      // Perigee Callout (Bottom Left)
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('PERIGEE: 185 KM', size * 0.04, size * 0.88);
      ctx.fillStyle = '#64748b';
      ctx.fillText('VELOCITY: 7.78 KM/S', size * 0.04, size * 0.93);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [size]);

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="max-w-full h-auto drop-shadow-[0_0_50px_rgba(6,182,212,0.25)]"
      />

      {/* Floating Telemetry Badges */}
      <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-slate-950/80 border border-cyan-500/30 font-mono text-[10px] text-cyan-400 backdrop-blur-sm pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block mr-1.5 animate-pulse" />
        LEO PARKING ORBIT // INC: 28.5°
      </div>

      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-700/60 font-mono text-[10px] text-slate-400 backdrop-blur-sm pointer-events-none">
        SIMULATION TELEMETRY
      </div>
    </div>
  );
};
