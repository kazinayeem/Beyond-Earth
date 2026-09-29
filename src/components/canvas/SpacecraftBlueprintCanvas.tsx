'use client';

import React, { useEffect, useRef } from 'react';

interface BlueprintCanvasProps {
  selectedComponentIds: string[];
  totalMassKg: number;
  totalCostM: number;
  netPowerW: number;
  className?: string;
}

export const SpacecraftBlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  selectedComponentIds,
  totalMassKg,
  totalCostM,
  netPowerW,
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

    const has = (id: string) => selectedComponentIds.includes(id);

    const hasSolarBasic = has('pwr-solar-basic');
    const hasSolarAdv = has('pwr-solar-adv');
    const hasSolar = hasSolarBasic || hasSolarAdv;
    const hasRtg = has('pwr-rtg');
    const hasDish = has('comm-high-gain');
    const hasCamera = has('cam-basic') || has('cam-hires');
    const hasHiRes = has('cam-hires');
    const hasSpec = has('inst-spectrometer');
    const hasRadar = has('inst-radar');
    const hasLidar = has('inst-altimeter');
    const hasMag = has('inst-magnetometer');
    const isTitanium = has('struct-heavy');
    const hasMediumEngine = has('prop-medium');
    const hasLargeEngine = has('prop-large');
    const hasRadiator = has('therm-radiator');

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2 + 10;

      ctx.clearRect(0, 0, width, height);

      // --- Background Blueprint Grid ---
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Tech Crosshairs and Boundary Marks
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      const mSize = 14;
      // Top Left
      ctx.strokeRect(18, 18, mSize, 1);
      ctx.strokeRect(18, 18, 1, mSize);
      // Top Right
      ctx.strokeRect(width - 18 - mSize, 18, mSize, 1);
      ctx.strokeRect(width - 18, 18, 1, mSize);
      // Bottom Left
      ctx.strokeRect(18, height - 18, mSize, 1);
      ctx.strokeRect(18, height - 18 - mSize, 1, mSize);
      // Bottom Right
      ctx.strokeRect(width - 18 - mSize, height - 18, mSize, 1);
      ctx.strokeRect(width - 18, height - 18 - mSize, 1, mSize);

      // Radar pulse ring
      if (hasRadar) {
        ctx.save();
        const pulse = (time * 25) % 120;
        ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, 0.4 - pulse / 120)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy - 80, 20 + pulse, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.restore();
      }

      // --- Left & Right Solar Arrays ---
      if (hasSolar) {
        const wingLength = hasSolarAdv ? 130 : 90;
        const wingHeight = hasSolarAdv ? 48 : 36;
        const panelSegments = hasSolarAdv ? 4 : 3;

        // Left Wing
        ctx.save();
        ctx.translate(cx - 55, cy);
        // Wing strut
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, 0);
        ctx.stroke();

        // Photovoltaic Panels
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(-20 - wingLength, -wingHeight / 2, wingLength, wingHeight);
        ctx.strokeRect(-20 - wingLength, -wingHeight / 2, wingLength, wingHeight);

        // Cell divisions
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        const segW = wingLength / panelSegments;
        for (let i = 1; i < panelSegments; i++) {
          ctx.beginPath();
          ctx.moveTo(-20 - i * segW, -wingHeight / 2);
          ctx.lineTo(-20 - i * segW, wingHeight / 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-20 - wingLength, 0);
        ctx.lineTo(-20, 0);
        ctx.stroke();
        ctx.restore();

        // Right Wing
        ctx.save();
        ctx.translate(cx + 55, cy);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(20, -wingHeight / 2, wingLength, wingHeight);
        ctx.strokeRect(20, -wingHeight / 2, wingLength, wingHeight);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        for (let i = 1; i < panelSegments; i++) {
          ctx.beginPath();
          ctx.moveTo(20 + i * segW, -wingHeight / 2);
          ctx.lineTo(20 + i * segW, wingHeight / 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(20 + wingLength, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Radiator Fins
      if (hasRadiator) {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.8)';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        // Upper angled radiator louvers
        [-1, 1].forEach((dir) => {
          ctx.beginPath();
          ctx.moveTo(cx + dir * 45, cy - 35);
          ctx.lineTo(cx + dir * 65, cy - 55);
          ctx.lineTo(cx + dir * 65, cy - 25);
          ctx.lineTo(cx + dir * 45, cy - 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }

      // RTG Module (if equipped)
      if (hasRtg) {
        ctx.save();
        ctx.translate(cx - 50, cy + 25);
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 8;
        ctx.fillRect(-15, -12, 16, 24);
        ctx.strokeRect(-15, -12, 16, 24);
        // Heat fins
        ctx.strokeStyle = '#fb923c';
        for (let f = -8; f <= 8; f += 4) {
          ctx.beginPath();
          ctx.moveTo(-18, f);
          ctx.lineTo(-15, f);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Magnetometer Boom (if equipped)
      if (hasMag) {
        ctx.save();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 45, cy + 30);
        ctx.lineTo(cx + 95, cy + 65);
        ctx.stroke();
        // Sensor head
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(cx + 95, cy + 65, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- Main Central Bus Structure ---
      const busW = 86;
      const busH = 100;

      ctx.save();
      // Bus Shadow / Outline
      ctx.shadowColor = isTitanium ? 'rgba(148, 163, 184, 0.4)' : 'rgba(56, 189, 248, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = isTitanium ? '#1e293b' : '#0f172a';
      ctx.strokeStyle = isTitanium ? '#cbd5e1' : '#38bdf8';
      ctx.lineWidth = 2;

      // Hexagonal chamfered bus box
      const chamfer = 14;
      ctx.beginPath();
      ctx.moveTo(cx - busW / 2 + chamfer, cy - busH / 2);
      ctx.lineTo(cx + busW / 2 - chamfer, cy - busH / 2);
      ctx.lineTo(cx + busW / 2, cy - busH / 2 + chamfer);
      ctx.lineTo(cx + busW / 2, cy + busH / 2 - chamfer);
      ctx.lineTo(cx + busW / 2 - chamfer, cy + busH / 2);
      ctx.lineTo(cx - busW / 2 + chamfer, cy + busH / 2);
      ctx.lineTo(cx - busW / 2, cy + busH / 2 - chamfer);
      ctx.lineTo(cx - busW / 2, cy - busH / 2 + chamfer);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Bus Interior Panels & Heat Foil pattern
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)'; // gold foil accent
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 30, cy - 35, 60, 70);
      ctx.strokeRect(cx - 24, cy - 28, 48, 56);

      // --- Rocket Engine (Aft / Bottom) ---
      const nozzleW = hasLargeEngine ? 38 : hasMediumEngine ? 28 : 20;
      const nozzleH = hasLargeEngine ? 30 : hasMediumEngine ? 22 : 16;
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - nozzleW / 3, cy + busH / 2);
      ctx.lineTo(cx + nozzleW / 3, cy + busH / 2);
      ctx.lineTo(cx + nozzleW / 2, cy + busH / 2 + nozzleH);
      ctx.lineTo(cx - nozzleW / 2, cy + busH / 2 + nozzleH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Engine Nozzle Inner Glow
      ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + busH / 2 + nozzleH, nozzleW / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // RCS Attitude Thruster Pods (4 corners)
      ctx.fillStyle = '#475569';
      [
        { x: cx - busW / 2, y: cy - busH / 2 + chamfer },
        { x: cx + busW / 2, y: cy - busH / 2 + chamfer },
        { x: cx - busW / 2, y: cy + busH / 2 - chamfer },
        { x: cx + busW / 2, y: cy + busH / 2 - chamfer }
      ].forEach((p) => {
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      });

      // --- High-Gain Parabolic Dish (Top) ---
      if (hasDish) {
        ctx.save();
        ctx.translate(cx, cy - busH / 2);
        // Strut
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -22);
        ctx.stroke();

        // Parabolic Dish Arc
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, -26, 32, Math.PI * 0.78, Math.PI * 0.22, true);
        ctx.stroke();

        // Subreflector & Feed horn
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -48, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(0, -48);
        ctx.stroke();
        ctx.restore();
      }

      // --- Optical Cameras & Scientific Sensors (Forward Deck) ---
      if (hasCamera) {
        ctx.save();
        const camX = cx - 18;
        const camY = cy - busH / 2 - (hasDish ? 8 : 14);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(camX - 7, camY - 14, 14, 18);
        ctx.strokeRect(camX - 7, camY - 14, 14, 18);

        // Lens element
        ctx.fillStyle = hasHiRes ? '#06b6d4' : '#3b82f6';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(camX, camY - 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Spectrometer Unit
      if (hasSpec) {
        ctx.save();
        const specX = cx + 18;
        const specY = cy - busH / 2 - (hasDish ? 8 : 14);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.fillRect(specX - 7, specY - 12, 14, 16);
        ctx.strokeRect(specX - 7, specY - 12, 14, 16);

        // Optical prism slit
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(specX - 4, specY - 10, 8, 3);
        ctx.restore();
      }

      // Laser Altimeter (LIDAR)
      if (hasLidar) {
        ctx.save();
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx, cy - 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.stroke();
        ctx.restore();
      }

      // --- Telemetry Dimension Callouts ---
      ctx.save();
      ctx.font = '10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';

      // Live Readouts inside blueprint
      ctx.fillText(`DRY MASS: ${totalMassKg} kg`, 24, 38);
      ctx.fillText(`PWR BAL : ${netPowerW >= 0 ? '+' : ''}${netPowerW} W`, 24, 52);
      ctx.fillText(`SYS STAT: ACTIVE`, 24, 66);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`SCALE: 1:25 CAD-VIEW`, width - 24, 38);
      ctx.fillText(`SPEC: NASA-GSFC-STD`, width - 24, 52);
      ctx.fillText(`ROTATION: 3-AXIS STABLE`, width - 24, 66);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selectedComponentIds, totalMassKg, totalCostM, netPowerW]);

  return (
    <div className={`relative flex items-center justify-center w-full h-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={540}
        height={460}
        className="w-full max-w-[540px] h-auto rounded-xl border border-cyan-500/20 bg-slate-950/80 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
      />
      <div className="absolute top-3 left-4 flex items-center space-x-2 text-xs font-mono text-cyan-400/80 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>SCHEMATIC TELEMETRY: 3D PROJECTION</span>
      </div>
    </div>
  );
};
