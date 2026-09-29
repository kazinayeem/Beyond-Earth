'use client';

import React, { useEffect, useRef } from 'react';
import { MissionData } from '@/types/game';

interface OrbitMapCanvasProps {
  mission: MissionData;
  progress: number; // 0 to 100
  phase: string;
  className?: string;
}

export const OrbitMapCanvas: React.FC<OrbitMapCanvasProps> = ({
  mission,
  progress,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.025;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Deep space background gradient
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 50, width * 0.5, height * 0.5, width * 0.7);
      bg.addColorStop(0, '#0a1026');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Background telemetry grid & range rings
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      [100, 200, 320, 440].forEach((radius) => {
        ctx.beginPath();
        ctx.arc(width * 0.18, height * 0.5, radius, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();
      });

      // --- Celestial Coordinates ---
      const earthX = width * 0.18;
      const earthY = height * 0.5;
      const targetX = width * 0.82;
      const targetY = height * 0.45;

      // --- Earth (Origin) ---
      // Atmosphere Glow
      const earthGlow = ctx.createRadialGradient(earthX, earthY, 28, earthX, earthY, 48);
      earthGlow.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
      earthGlow.addColorStop(0.6, 'rgba(37, 99, 235, 0.2)');
      earthGlow.addColorStop(1, 'rgba(30, 58, 138, 0)');
      ctx.fillStyle = earthGlow;
      ctx.beginPath();
      ctx.arc(earthX, earthY, 48, 0, Math.PI * 2);
      ctx.fill();

      // Earth Globe
      const earthGrad = ctx.createLinearGradient(earthX - 25, earthY - 25, earthX + 25, earthY + 25);
      earthGrad.addColorStop(0, '#38bdf8');
      earthGrad.addColorStop(0.4, '#1d4ed8');
      earthGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(earthX, earthY, 28, 0, Math.PI * 2);
      ctx.fill();

      // Continents representation
      ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
      ctx.beginPath();
      ctx.arc(earthX - 8, earthY - 6, 9, 0, Math.PI * 2);
      ctx.arc(earthX + 10, earthY + 4, 7, 0, Math.PI * 2);
      ctx.arc(earthX - 2, earthY + 12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Earth Label
      ctx.font = '10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH (DSN BASE)', earthX, earthY + 44);

      // --- Target Celestial Body (Destination) ---
      if (mission.target === 'Moon') {
        // Moon Glow
        const moonGlow = ctx.createRadialGradient(targetX, targetY, 18, targetX, targetY, 36);
        moonGlow.addColorStop(0, 'rgba(241, 245, 249, 0.35)');
        moonGlow.addColorStop(1, 'rgba(241, 245, 249, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 36, 0, Math.PI * 2);
        ctx.fill();

        // Moon Body
        const moonGrad = ctx.createLinearGradient(targetX - 20, targetY - 20, targetX + 20, targetY + 20);
        moonGrad.addColorStop(0, '#f8fafc');
        moonGrad.addColorStop(0.7, '#64748b');
        moonGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 22, 0, Math.PI * 2);
        ctx.fill();

        // Lunar Craters
        ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
        ctx.beginPath();
        ctx.arc(targetX - 6, targetY - 5, 4, 0, Math.PI * 2);
        ctx.arc(targetX + 7, targetY + 4, 5, 0, Math.PI * 2);
        ctx.arc(targetX - 4, targetY + 8, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('MOON (ORBIT TARGET)', targetX, targetY + 38);
      } else if (mission.target === 'Mars') {
        // Mars Glow
        const marsGlow = ctx.createRadialGradient(targetX, targetY, 20, targetX, targetY, 40);
        marsGlow.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        marsGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = marsGlow;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 40, 0, Math.PI * 2);
        ctx.fill();

        // Mars Body
        const marsGrad = ctx.createLinearGradient(targetX - 22, targetY - 22, targetX + 22, targetY + 22);
        marsGrad.addColorStop(0, '#f87171');
        marsGrad.addColorStop(0.6, '#b91c1c');
        marsGrad.addColorStop(1, '#450a0a');
        ctx.fillStyle = marsGrad;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 24, 0, Math.PI * 2);
        ctx.fill();

        // Polar ice cap
        ctx.fillStyle = '#fef2f2';
        ctx.beginPath();
        ctx.arc(targetX, targetY - 20, 6, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = '#f87171';
        ctx.fillText('MARS (ORBIT TARGET)', targetX, targetY + 40);
      } else {
        // Asteroid / Bennu
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('TARGET OBJECT', targetX, targetY + 34);
      }

      // --- Orbit / Trajectory Curve (Bézier arc) ---
      const cp1X = width * 0.38;
      const cp1Y = height * 0.15;
      const cp2X = width * 0.65;
      const cp2Y = height * 0.22;

      // Trajectory Path Shadow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(earthX, earthY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trajectory Completed Arc (Glowing solid)
      // Evaluate Cubic Bezier point at t
      const t = Math.max(0.01, Math.min(0.99, progress / 100));
      const getBezierPoint = (tVal: number) => {
        const u = 1 - tVal;
        const tt = tVal * tVal;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * tVal;

        const x = uuu * earthX + 3 * uu * tVal * cp1X + 3 * u * tt * cp2X + ttt * targetX;
        const y = uuu * earthY + 3 * uu * tVal * cp1Y + 3 * u * tt * cp2Y + ttt * targetY;
        return { x, y };
      };

      const scPos = getBezierPoint(t);

      // Deep Space Network Telemetry Beam (Pulse ray from Earth to Spacecraft)
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath();
      ctx.moveTo(earthX, earthY);
      ctx.lineTo(scPos.x, scPos.y);
      ctx.stroke();
      ctx.restore();

      // Sensor Scanning Cone (when approaching target, progress > 60%)
      if (progress > 60) {
        ctx.save();
        const scanAngle = Math.sin(time * 3) * 0.15;
        const scanGrad = ctx.createRadialGradient(scPos.x, scPos.y, 5, scPos.x, scPos.y, 80);
        scanGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        scanGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = scanGrad;

        ctx.beginPath();
        ctx.moveTo(scPos.x, scPos.y);
        ctx.arc(scPos.x, scPos.y, 85, scanAngle - 0.4, scanAngle + 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // --- Spacecraft Symbol ---
      ctx.save();
      ctx.translate(scPos.x, scPos.y);

      // Reticle Ping
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 1.5;
      const pingR = 12 + Math.sin(time * 6) * 4;
      ctx.beginPath();
      ctx.arc(0, 0, pingR, 0, Math.PI * 2);
      ctx.stroke();

      // Spacecraft Icon Core
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Solar Wings
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-12, -2, 7, 4);
      ctx.fillRect(5, -2, 7, 4);

      // Label
      ctx.shadowBlur = 0;
      ctx.font = '10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText(`${mission.code} [${progress.toFixed(0)}%]`, 16, -6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`ALT: ${(mission.targetDistanceKm * (1 - t)).toLocaleString()} km`, 16, 8);
      ctx.restore();

      // Milestone Marks along Trajectory
      [0.2, 0.5, 0.8].forEach((mPoint) => {
        const pt = getBezierPoint(mPoint);
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
  }, [mission, progress]);

  return (
    <div className={`relative w-full h-full min-h-[340px] flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={720}
        height={380}
        className="w-full h-full rounded-xl border border-cyan-500/20 shadow-[0_0_35px_rgba(8,18,41,0.9)]"
      />
      <div className="absolute bottom-3 left-4 flex items-center space-x-2 text-xs font-mono text-cyan-400/80 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>DSN TRACKING CARRIER: 8.4 GHz LOCK</span>
      </div>
      <div className="absolute top-3 right-4 flex items-center space-x-2 text-xs font-mono text-slate-400 pointer-events-none">
        <span>TRAJECTORY VECTOR: POLAR INJECTION</span>
      </div>
    </div>
  );
};
