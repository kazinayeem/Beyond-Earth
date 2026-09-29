'use client';

import React, { useEffect, useRef } from 'react';

interface LaunchCanvasProps {
  status: 'STANDBY' | 'COUNTING' | 'IGNITION' | 'LIFTOFF' | 'MAX_Q' | 'STAGING' | 'ORBIT_ACHIEVED' | 'ABORTED';
  countdown: number;
  altitudeKm: number;
  velocityKmh: number;
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
}

export const LaunchSequenceCanvas: React.FC<LaunchCanvasProps> = ({
  status,
  countdown,
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
    const particles: Particle[] = [];
    let rocketY = canvas.height * 0.62;
    let rocketVY = 0;
    let stageSeparated = false;
    let boosterLeftX = -12;
    let boosterRightX = 12;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;

      // Screen shake calculation
      let shakeX = 0;
      let shakeY = 0;
      if (status === 'IGNITION') {
        shakeX = (Math.random() - 0.5) * 4;
        shakeY = (Math.random() - 0.5) * 4;
      } else if (status === 'LIFTOFF' || status === 'MAX_Q') {
        shakeX = (Math.random() - 0.5) * 6;
        shakeY = (Math.random() - 0.5) * 6;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.clearRect(-10, -10, width + 20, height + 20);

      // Rocket ascent dynamics
      if (status === 'LIFTOFF') {
        rocketVY = Math.min(6, rocketVY + 0.08);
        rocketY -= rocketVY;
      } else if (status === 'MAX_Q' || status === 'STAGING') {
        rocketVY = Math.min(9, rocketVY + 0.05);
        rocketY -= rocketVY;
        if (status === 'STAGING') {
          stageSeparated = true;
          boosterLeftX -= 0.8;
          boosterRightX += 0.8;
        }
      } else if (status === 'ORBIT_ACHIEVED') {
        rocketY = -200; // rocket in orbit
      } else {
        rocketY = height * 0.62;
        rocketVY = 0;
        stageSeparated = false;
        boosterLeftX = -12;
        boosterRightX = 12;
      }

      // Background Sky transition based on rocket height
      const altRatio = Math.max(0, Math.min(1, (height * 0.62 - rocketY) / (height * 1.5)));
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (altRatio < 0.3) {
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.7, '#0f172a');
        skyGrad.addColorStop(1, '#1e293b');
      } else if (altRatio < 0.7) {
        skyGrad.addColorStop(0, '#000000');
        skyGrad.addColorStop(0.5, '#020617');
        skyGrad.addColorStop(1, '#0c4a6e');
      } else {
        skyGrad.addColorStop(0, '#000000');
        skyGrad.addColorStop(1, '#020617');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Ground & Launch Pad (moves down as rocket ascends)
      const groundY = height * 0.82 + (height * 0.62 - rocketY) * 0.8;
      if (groundY < height + 100) {
        // Pad concrete
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, groundY, width, height - groundY + 50);

        // Flame Trench
        ctx.fillStyle = '#090d16';
        ctx.fillRect(cx - 70, groundY - 10, 140, 40);

        // Gantry Tower
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 65, groundY - 130, 24, 130);
        // Gantry Cross braces
        for (let gy = groundY - 120; gy < groundY; gy += 20) {
          ctx.beginPath();
          ctx.moveTo(cx - 65, gy);
          ctx.lineTo(cx - 41, gy + 15);
          ctx.stroke();
        }

        // Umbilical Swing Arm
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        const armSwing = status === 'STANDBY' || status === 'COUNTING' ? 0 : 25;
        ctx.beginPath();
        ctx.moveTo(cx - 41, groundY - 95);
        ctx.lineTo(cx - 15 - armSwing, groundY - 95);
        ctx.stroke();

        // Floodlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(cx - 140, groundY);
        ctx.lineTo(cx - 30, groundY - 110);
        ctx.lineTo(cx + 30, groundY - 110);
        ctx.closePath();
        ctx.fill();
      }

      // Cryo-venting vapor (when on pad)
      if (status === 'COUNTING' || status === 'STANDBY') {
        if (Math.random() < 0.4) {
          particles.push({
            x: cx + 10,
            y: rocketY - 45,
            vx: Math.random() * 1.5 + 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 3 + 2,
            color: 'rgba(241, 245, 249, 0.4)',
            alpha: 0.6,
            decay: 0.02
          });
        }
      }

      // Exhaust Particles (Ignition, Liftoff, Max-Q)
      const isFiring = status === 'IGNITION' || status === 'LIFTOFF' || status === 'MAX_Q' || status === 'STAGING';
      if (isFiring) {
        const pCount = status === 'IGNITION' ? 12 : 18;
        for (let i = 0; i < pCount; i++) {
          const colors = ['#ffffff', '#fef08a', '#f97316', '#ef4444'];
          particles.push({
            x: cx + (Math.random() - 0.5) * 16,
            y: rocketY + 45,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 8 + 6,
            radius: Math.random() * 6 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 0.9,
            decay: 0.03
          });
        }
        // Billowing Smoke at launch pad
        if (groundY < height) {
          for (let i = 0; i < 6; i++) {
            particles.push({
              x: cx + (Math.random() - 0.5) * 40,
              y: groundY - 5,
              vx: (Math.random() - 0.5) * 7,
              vy: (Math.random() - 0.5) * 2,
              radius: Math.random() * 14 + 10,
              color: 'rgba(148, 163, 184, 0.35)',
              alpha: 0.6,
              decay: 0.015
            });
          }
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.radius += 0.2;

        if (p.alpha <= 0) {
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

      // --- Rocket Body ---
      if (rocketY > -150) {
        ctx.save();
        ctx.translate(cx, rocketY);

        // Solid Boosters (Strap-on)
        if (!stageSeparated) {
          // Left booster
          ctx.fillStyle = '#e2e8f0';
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

          // Right booster
          ctx.fillRect(10, -10, 8, 48);
          ctx.strokeRect(10, -10, 8, 48);
          ctx.beginPath();
          ctx.moveTo(10, -10);
          ctx.lineTo(14, -20);
          ctx.lineTo(18, -10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Detaching boosters drifting away
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(boosterLeftX - 4, 10, 8, 45);
          ctx.fillRect(boosterRightX - 4, 10, 8, 45);
        }

        // Main Core Stage
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-10, -40, 20, 80);
        ctx.strokeRect(-10, -40, 20, 80);

        // Core Stage NASA "Worm" / Stripes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-8, -25, 16, 4);

        // Interstage / Upper Stage
        ctx.fillStyle = '#334155';
        ctx.fillRect(-9, -58, 18, 18);

        // Payload Fairing (Aerodynamic Nose Cone)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, -58);
        ctx.quadraticCurveTo(-10, -90, 0, -100);
        ctx.quadraticCurveTo(10, -90, 10, -58);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Main Engine Bell
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(-7, 40);
        ctx.lineTo(7, 40);
        ctx.lineTo(10, 48);
        ctx.lineTo(-10, 48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Engine Fire Cone during ignition
        if (isFiring) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(-6, 48);
          ctx.lineTo(6, 48);
          ctx.lineTo(0, 68 + Math.random() * 8);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = 'rgba(249, 115, 22, 0.8)';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(-8, 48);
          ctx.lineTo(8, 48);
          ctx.lineTo(0, 82 + Math.random() * 12);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [status, countdown]);

  return (
    <div className={`relative w-full h-full min-h-[380px] flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={680}
        height={420}
        className="w-full h-full rounded-xl border border-cyan-500/20 bg-slate-950 shadow-[0_0_40px_rgba(2,6,23,0.9)]"
      />
    </div>
  );
};
