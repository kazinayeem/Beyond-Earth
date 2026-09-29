'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MissionData } from '@/types/game';
import { PlanetaryScene3D } from './PlanetaryScene3D';

interface OrbitMapCanvasProps {
  mission: MissionData;
  progress: number; // 0 to 100
  phase: string;
  simSpeed?: number;
  className?: string;
}

const emptySubscribe = () => () => {};

export const OrbitMapCanvas: React.FC<OrbitMapCanvasProps> = ({
  mission,
  progress,
  simSpeed = 1,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dims, setDims] = useState({ width: 780, height: 400 });
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

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

  // 2D Overlay Canvas Rendering (Telemetry, Trajectory, Satellite, Labels)
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

      // Telemetry grid coordinates
      const earthX = width * 0.16;
      const earthY = height * 0.52;
      const targetX = width * 0.84;
      const targetY = height * 0.44;

      const earthR = Math.max(26, Math.min(36, width * 0.038));
      const targetR = Math.max(22, Math.min(32, width * 0.034));

      // Telemetry grid rings around Earth
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      [80, 160, 260, 380, 520].forEach((radius) => {
        ctx.beginPath();
        ctx.arc(earthX, earthY, radius, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      });

      // Earth Label (Prominent object name, clean hierarchy)
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', earthX, earthY + earthR + 18);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('DSN BASE // ORIGIN', earthX, earthY + earthR + 30);

      // Target Celestial Body Label
      if (mission.target === 'Moon') {
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText('MOON', targetX, targetY + targetR + 18);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('ORBIT TARGET // 384,400 KM', targetX, targetY + targetR + 30);
      } else if (mission.target === 'Mars') {
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#fb923c';
        ctx.textAlign = 'center';
        ctx.fillText('MARS', targetX, targetY + targetR + 18);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('ORBIT TARGET // 225M KM', targetX, targetY + targetR + 30);
      } else {
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET OBJECT', targetX, targetY + targetR + 18);
      }

      // --- TRAJECTORY ARCS (Smooth Cubic Bézier) ---
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

      // Deep Space Network Telemetry Radio Beam (Carrier pulse to Earth)
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

      // --- SPACECRAFT PROBE MODEL ---
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

  // Planet positions and radii
  const earthX = dims.width * 0.16;
  const earthY = dims.height * 0.52;
  const targetX = dims.width * 0.84;
  const targetY = dims.height * 0.44;

  const earthR = Math.max(26, Math.min(36, dims.width * 0.038));
  const targetR = Math.max(22, Math.min(32, dims.width * 0.034));

  return (
    <div
      ref={containerRef}
      style={{
        background: 'radial-gradient(circle at 50% 50%, #0a1329 0%, #030712 60%, #01040a 100%)'
      }}
      className={`relative w-full h-full min-h-[220px] flex items-center justify-center overflow-hidden rounded-xl border border-cyan-500/20 shadow-[0_0_35px_rgba(8,18,41,0.9)] ${className}`}
    >
      {/* 3D WebGL Planetary Visualization for Earth and Target Body */}
      {mounted && dims.width > 0 && dims.height > 0 && (
        <PlanetaryScene3D
          width={dims.width}
          height={dims.height}
          earthX={earthX}
          earthY={earthY}
          earthR={earthR}
          targetX={targetX}
          targetY={targetY}
          targetR={targetR}
          targetType={mission.target}
          simSpeed={simSpeed}
        />
      )}

      {/* 2D Canvas for Telemetry Rings, Orbit Trajectory, Satellite, DSN Beam, Labels */}
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* HUD Meta Indicators */}
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
