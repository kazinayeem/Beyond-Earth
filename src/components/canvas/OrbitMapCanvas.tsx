'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MissionData } from '@/types/game';

interface OrbitMapCanvasProps {
  mission: MissionData;
  progress: number; // 0 to 100
  phase: string;
  simSpeed?: number;
  className?: string;
}

export const OrbitMapCanvas: React.FC<OrbitMapCanvasProps> = ({
  mission,
  progress,
  simSpeed = 1,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dims, setDims] = useState({ width: 780, height: 400 });

  // Handle dynamic container resizing
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

    const render = () => {
      if (simSpeed > 0) {
        time += 0.02 * simSpeed;
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Deep space background with subtle nebular depth
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 40, width * 0.5, height * 0.5, width * 0.8);
      bg.addColorStop(0, '#0a1329');
      bg.addColorStop(0.6, '#030712');
      bg.addColorStop(1, '#01040a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Telemetry grid rings
      const earthX = width * 0.16;
      const earthY = height * 0.52;
      const targetX = width * 0.84;
      const targetY = height * 0.44;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      [80, 160, 260, 380, 520].forEach((radius) => {
        ctx.beginPath();
        ctx.arc(earthX, earthY, radius, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      });

      // --- 1. REALISTIC EARTH RENDERING (NASA Blue Marble Inspired) ---
      const earthR = Math.max(26, Math.min(36, width * 0.038));

      // Atmospheric Rayleigh scattering glow (multi-layer halo)
      const earthAtmosphere = ctx.createRadialGradient(earthX, earthY, earthR * 0.9, earthX, earthY, earthR * 1.55);
      earthAtmosphere.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
      earthAtmosphere.addColorStop(0.4, 'rgba(14, 165, 233, 0.25)');
      earthAtmosphere.addColorStop(0.8, 'rgba(3, 105, 161, 0.08)');
      earthAtmosphere.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = earthAtmosphere;
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR * 1.55, 0, Math.PI * 2);
      ctx.fill();

      // Earth base ocean sphere with 3D directional specular lighting
      const earthOcean = ctx.createRadialGradient(
        earthX - earthR * 0.35,
        earthY - earthR * 0.35,
        earthR * 0.1,
        earthX,
        earthY,
        earthR
      );
      earthOcean.addColorStop(0, '#38bdf8'); // specular cyan highlight
      earthOcean.addColorStop(0.3, '#0284c7'); // deep azure ocean
      earthOcean.addColorStop(0.7, '#0369a1');
      earthOcean.addColorStop(1, '#082f49'); // deep shadow limb
      ctx.fillStyle = earthOcean;
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
      ctx.fill();

      // Continents with elevation shading (masked inside Earth sphere)
      ctx.save();
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
      ctx.clip();

      // Slow planetary rotation offset
      const rot = (time * 0.04) % (Math.PI * 2);

      // Continent shapes (Authentic terrestrial landmasses)
      ctx.fillStyle = '#15803d'; // vegetation green
      // North America
      ctx.beginPath();
      ctx.ellipse(earthX - earthR * 0.25 + Math.sin(rot) * 2, earthY - earthR * 0.25, earthR * 0.35, earthR * 0.25, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // South America
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(earthX - earthR * 0.15 + Math.sin(rot) * 2, earthY + earthR * 0.35, earthR * 0.22, earthR * 0.38, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Eurasia / Africa
      ctx.fillStyle = '#1e3a1e';
      ctx.beginPath();
      ctx.ellipse(earthX + earthR * 0.35 + Math.sin(rot) * 2, earthY - earthR * 0.1, earthR * 0.38, earthR * 0.32, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Sahara / Desert ochre
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(earthX + earthR * 0.32 + Math.sin(rot) * 2, earthY + earthR * 0.05, earthR * 0.22, earthR * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cloud layer (swirling white weather bands)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(earthX + Math.cos(rot * 1.5) * 4, earthY - earthR * 0.45, earthR * 0.7, earthR * 0.14, 0.1, 0, Math.PI * 2);
      ctx.ellipse(earthX + Math.sin(rot * 1.2) * 5, earthY + earthR * 0.1, earthR * 0.8, earthR * 0.18, -0.15, 0, Math.PI * 2);
      ctx.ellipse(earthX - Math.cos(rot * 1.3) * 4, earthY + earthR * 0.5, earthR * 0.6, earthR * 0.12, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // 3D Spherical Shadow / Day-Night Terminator
      const shadowGrad = ctx.createLinearGradient(
        earthX - earthR,
        earthY - earthR,
        earthX + earthR * 1.2,
        earthY + earthR * 1.2
      );
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.15)');
      shadowGrad.addColorStop(0.85, 'rgba(2, 6, 23, 0.75)');
      shadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(earthX - earthR, earthY - earthR, earthR * 2, earthR * 2);
      ctx.restore();

      // Earth Label (Prominent object name, clean hierarchy)
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', earthX, earthY + earthR + 18);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('DSN BASE // ORIGIN', earthX, earthY + earthR + 30);

      // --- 2. TARGET CELESTIAL BODY (Moon or Mars or Asteroid) ---
      const targetR = Math.max(22, Math.min(32, width * 0.034));

      if (mission.target === 'Moon') {
        // Moon Atmosphere Glow (subtle exosphere halo)
        const moonGlow = ctx.createRadialGradient(targetX, targetY, targetR * 0.8, targetX, targetY, targetR * 1.45);
        moonGlow.addColorStop(0, 'rgba(226, 232, 240, 0.35)');
        moonGlow.addColorStop(0.6, 'rgba(148, 163, 184, 0.12)');
        moonGlow.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetR * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // Moon Base Sphere
        const moonGrad = ctx.createRadialGradient(
          targetX - targetR * 0.35,
          targetY - targetR * 0.35,
          targetR * 0.1,
          targetX,
          targetY,
          targetR
        );
        moonGrad.addColorStop(0, '#f8fafc');
        moonGrad.addColorStop(0.4, '#cbd5e1');
        moonGrad.addColorStop(0.8, '#64748b');
        moonGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetR, 0, Math.PI * 2);
        ctx.fill();

        // Authentic Lunar Maria (Sea of Tranquility, Ocean of Storms basaltic dark plains)
        ctx.save();
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetR, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = 'rgba(51, 65, 85, 0.75)';
        // Oceanus Procellarum
        ctx.beginPath();
        ctx.ellipse(targetX - targetR * 0.35, targetY - targetR * 0.1, targetR * 0.38, targetR * 0.45, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Mare Imbrium
        ctx.beginPath();
        ctx.ellipse(targetX - targetR * 0.15, targetY - targetR * 0.38, targetR * 0.28, targetR * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Mare Tranquillitatis (Apollo 11 site)
        ctx.beginPath();
        ctx.ellipse(targetX + targetR * 0.28, targetY - targetR * 0.05, targetR * 0.25, targetR * 0.22, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Mare Serenitatis
        ctx.beginPath();
        ctx.ellipse(targetX + targetR * 0.22, targetY - targetR * 0.32, targetR * 0.20, targetR * 0.18, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Tycho Crater with white ejecta rays
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(targetX - targetR * 0.1, targetY + targetR * 0.45, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        [-0.4, 0.2, 0.8, -1.0].forEach((ang) => {
          ctx.beginPath();
          ctx.moveTo(targetX - targetR * 0.1, targetY + targetR * 0.45);
          ctx.lineTo(
            targetX - targetR * 0.1 + Math.cos(ang) * targetR * 0.6,
            targetY + targetR * 0.45 + Math.sin(ang) * targetR * 0.6
          );
          ctx.stroke();
        });

        // 3D Crescent Terminator
        const moonShadow = ctx.createLinearGradient(
          targetX - targetR,
          targetY - targetR,
          targetX + targetR * 1.1,
          targetY + targetR * 1.1
        );
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        moonShadow.addColorStop(0.6, 'rgba(15, 23, 42, 0.2)');
        moonShadow.addColorStop(0.85, 'rgba(15, 23, 42, 0.85)');
        moonShadow.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
        ctx.fillStyle = moonShadow;
        ctx.fillRect(targetX - targetR, targetY - targetR, targetR * 2, targetR * 2);
        ctx.restore();

        // Moon Label
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText('MOON', targetX, targetY + targetR + 18);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('ORBIT TARGET // 384,400 KM', targetX, targetY + targetR + 30);
      } else if (mission.target === 'Mars') {
        // --- REALISTIC MARS RENDERING ---
        // Atmospheric haze limb (salmon/amber glow)
        const marsGlow = ctx.createRadialGradient(targetX, targetY, targetR * 0.85, targetX, targetY, targetR * 1.5);
        marsGlow.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        marsGlow.addColorStop(0.5, 'rgba(185, 28, 28, 0.20)');
        marsGlow.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = marsGlow;
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetR * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Mars Base Body
        const marsGrad = ctx.createRadialGradient(
          targetX - targetR * 0.35,
          targetY - targetR * 0.35,
          targetR * 0.1,
          targetX,
          targetY,
          targetR
        );
        marsGrad.addColorStop(0, '#fb923c'); // bright oxidized iron
        marsGrad.addColorStop(0.4, '#ea580c');
        marsGrad.addColorStop(0.7, '#c2410c');
        marsGrad.addColorStop(1, '#450a0a'); // night side
        ctx.fillStyle = marsGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetR, 0, Math.PI * 2);
        ctx.fill();

        // Mars Surface Terrain Details (Syrtis Major & Valles Marineris)
        ctx.save();
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetR, 0, Math.PI * 2);
        ctx.clip();

        // Dark volcanic basalt albedo features
        ctx.fillStyle = 'rgba(69, 10, 10, 0.75)';
        // Syrtis Major
        ctx.beginPath();
        ctx.ellipse(targetX + targetR * 0.2, targetY - targetR * 0.15, targetR * 0.35, targetR * 0.25, 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Valles Marineris canyon rift
        ctx.strokeStyle = 'rgba(69, 10, 10, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(targetX - targetR * 0.45, targetY + targetR * 0.05);
        ctx.lineTo(targetX + targetR * 0.15, targetY + targetR * 0.18);
        ctx.stroke();

        // Polar Ice Cap (Planum Boreale)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(targetX - targetR * 0.05, targetY - targetR * 0.82, targetR * 0.38, targetR * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Shadow Terminator
        const marsShadow = ctx.createLinearGradient(
          targetX - targetR,
          targetY - targetR,
          targetX + targetR * 1.1,
          targetY + targetR * 1.1
        );
        marsShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        marsShadow.addColorStop(0.55, 'rgba(69, 10, 10, 0.25)');
        marsShadow.addColorStop(0.85, 'rgba(15, 23, 42, 0.85)');
        marsShadow.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
        ctx.fillStyle = marsShadow;
        ctx.fillRect(targetX - targetR, targetY - targetR, targetR * 2, targetR * 2);
        ctx.restore();

        // Mars Label
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#fb923c';
        ctx.textAlign = 'center';
        ctx.fillText('MARS', targetX, targetY + targetR + 18);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('ORBIT TARGET // 225M KM', targetX, targetY + targetR + 30);
      } else {
        // Asteroid / Bennu
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetR * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET OBJECT', targetX, targetY + targetR + 18);
      }

      // --- 3. TRAJECTORY ARCS (Smooth Cubic Bézier) ---
      const cp1X = width * 0.38;
      const cp1Y = height * 0.18;
      const cp2X = width * 0.65;
      const cp2Y = height * 0.22;

      // Trajectory Guide Path
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(earthX, earthY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cubic Bézier calculation with tangent heading
      const t = Math.max(0.01, Math.min(0.99, progress / 100));

      const getBezier = (tVal: number) => {
        const u = 1 - tVal;
        const tt = tVal * tVal;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * tVal;

        const x = uuu * earthX + 3 * uu * tVal * cp1X + 3 * u * tt * cp2X + ttt * targetX;
        const y = uuu * earthY + 3 * uu * tVal * cp1Y + 3 * u * tt * cp2Y + ttt * targetY;

        // Tangent derivative dx, dy
        const dx = 3 * uu * (cp1X - earthX) + 6 * u * tVal * (cp2X - cp1X) + 3 * tt * (targetX - cp2X);
        const dy = 3 * uu * (cp1Y - earthY) + 6 * u * tVal * (cp2Y - cp1Y) + 3 * tt * (targetY - cp2Y);
        const heading = Math.atan2(dy, dx);

        return { x, y, heading };
      };

      const scPos = getBezier(t);

      // Deep Space Network Telemetry Radio Beam (Carrier carrier pulse to Earth)
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 8]);
      ctx.lineDashOffset = -time * 18;
      ctx.beginPath();
      ctx.moveTo(earthX, earthY);
      ctx.lineTo(scPos.x, scPos.y);
      ctx.stroke();
      ctx.restore();

      // --- 4. PROFESSIONAL SPACECRAFT PROBE MODEL ---
      ctx.save();
      ctx.translate(scPos.x, scPos.y);
      ctx.rotate(scPos.heading);

      // Ion Propulsion Thruster Exhaust Plume (behind probe)
      if (progress < 95) {
        ctx.save();
        const plumeGrad = ctx.createLinearGradient(-22, 0, -4, 0);
        plumeGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        plumeGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.45)');
        plumeGrad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = plumeGrad;
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(-20 + Math.random() * 4, 0);
        ctx.lineTo(-6, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Solar Array Wings (Photovoltaic grid texture)
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.8;
      // Top Wing
      ctx.fillRect(-6, -18, 12, 10);
      ctx.strokeRect(-6, -18, 12, 10);
      // Wing Solar Cell dividers
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, -8);
      ctx.moveTo(-6, -13);
      ctx.lineTo(6, -13);
      ctx.stroke();

      // Bottom Wing
      ctx.fillRect(-6, 8, 12, 10);
      ctx.strokeRect(-6, 8, 12, 10);
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, 18);
      ctx.moveTo(-6, 13);
      ctx.lineTo(6, 13);
      ctx.stroke();

      // Central Spacecraft Bus Body (Gold Thermal Kapton Foil)
      const busGrad = ctx.createLinearGradient(-6, -6, 6, 6);
      busGrad.addColorStop(0, '#fef08a');
      busGrad.addColorStop(0.5, '#f59e0b');
      busGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = busGrad;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeRect(-6, -6, 12, 12);

      // High-Gain Parabolic Dish Antenna (facing forward/Earth direction)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(8, 0, 7, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      // Feed horn
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Restore probe transform

      // Spacecraft Telemetry Reticle Ping (non-rotated)
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1;
      const pingR = 14 + Math.sin(time * 5) * 3;
      ctx.beginPath();
      ctx.arc(scPos.x, scPos.y, pingR, 0, Math.PI * 2);
      ctx.stroke();

      // Spacecraft Telemetry HUD Tag
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'left';
      ctx.fillText(`${mission.code} [${progress.toFixed(0)}%]`, scPos.x + 18, scPos.y - 8);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94a3b8';
      const remainingDist = Math.max(0, mission.targetDistanceKm * (1 - t));
      ctx.fillText(`DIST: ${Math.round(remainingDist).toLocaleString()} km`, scPos.x + 18, scPos.y + 6);
      ctx.restore();

      // Trajectory Waypoint Markers
      [0.2, 0.5, 0.8].forEach((mPoint) => {
        const pt = getBezier(mPoint);
        const reached = progress >= mPoint * 100;
        ctx.fillStyle = reached ? '#22c55e' : '#64748b';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [mission, progress, simSpeed, dims]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[220px] flex items-center justify-center overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        className="w-full h-full block rounded-xl border border-cyan-500/20 shadow-[0_0_35px_rgba(8,18,41,0.9)]"
      />
      <div className="absolute bottom-2.5 left-3 flex items-center space-x-2 text-[10px] sm:text-xs font-mono text-cyan-400/90 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>DSN CARRIER: 8.4 GHz LOCK</span>
      </div>
      <div className="absolute top-2.5 right-3 flex items-center space-x-2 text-[10px] sm:text-xs font-mono text-slate-400 pointer-events-none">
        <span>NASA PDS CARTOGRAPHIC IMAGERY</span>
      </div>
    </div>
  );
};

