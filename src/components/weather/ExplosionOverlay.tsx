'use client';

import React, { useEffect, useRef } from 'react';
import { sounds } from '@/lib/sound';

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; hot: number; spark: boolean }

/**
 * Vehicle-loss effect: white flash → fireball with expanding shockwave → glowing sparks and drifting smoke.
 * Draws on a transparent canvas above the 3D scene and shakes its container.
 * `at` is the focus point as a fraction of the container (the rocket is roughly centred while chase-cam is on).
 */
export function ExplosionOverlay({ active, at = { x: 0.5, y: 0.5 }, reducedMotion = false, muted = false }: { active: boolean; at?: { x: number; y: number }; reducedMotion?: boolean; muted?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0, last = performance.now(), t = 0;
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = at.x * w, cy = at.y * h;
    if (!muted) sounds.playExplosion();

    const parts: P[] = [];
    const n = reducedMotion ? 70 : 260;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (40 + Math.random() * 380) * (Math.random() < 0.25 ? 1.6 : 1);
      const spark = Math.random() < 0.45;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: spark ? 0.8 + Math.random() * 1.4 : 1.4 + Math.random() * 2.2, r: spark ? 1.2 + Math.random() * 2 : 12 + Math.random() * 38, hot: 1, spark });
    }
    const host = canvas.parentElement;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      ctx.clearRect(0, 0, w, h);
      if (host && !reducedMotion) {
        const s = Math.max(0, 1 - t / 1.6) * 14;
        host.style.transform = `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)`;
      }
      // initial flash
      if (t < 0.45) { ctx.fillStyle = `rgba(255,244,214,${(1 - t / 0.45) * 0.95})`; ctx.fillRect(0, 0, w, h); }
      // fireball core
      if (t < 1.8) {
        const k = Math.min(1, t / 0.5), r = (60 + 240 * k) * (1 - Math.max(0, t - 1.2) / 0.6);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
        g.addColorStop(0, `rgba(255,250,225,${0.95 * (1 - t / 1.8)})`); g.addColorStop(0.35, `rgba(255,170,60,${0.85 * (1 - t / 1.8)})`);
        g.addColorStop(0.75, `rgba(220,60,20,${0.5 * (1 - t / 1.8)})`); g.addColorStop(1, 'rgba(120,20,10,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
      }
      // shockwave ring
      if (t < 1.4) {
        ctx.strokeStyle = `rgba(255,230,190,${(1 - t / 1.4) * 0.6})`; ctx.lineWidth = 3 + (1 - t / 1.4) * 8;
        ctx.beginPath(); ctx.arc(cx, cy, t * Math.max(w, h) * 0.55, 0, Math.PI * 2); ctx.stroke();
      }
      for (const p of parts) {
        p.life += dt; if (p.life >= p.max) continue;
        const f = p.life / p.max;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.spark ? 380 : -20) * dt; p.vx *= p.spark ? 0.99 : 0.97; p.vy *= p.spark ? 1 : 0.97;
        if (p.spark) {
          ctx.fillStyle = `rgba(255,${Math.round(210 - 130 * f)},${Math.round(90 - 70 * f)},${1 - f})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - f * 0.5), 0, Math.PI * 2); ctx.fill();
        } else {
          const rr = p.r * (1 + f * 2.2);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          const c = f < 0.3 ? '255,150,60' : '60,52,50';
          g.addColorStop(0, `rgba(${c},${(1 - f) * 0.5})`); g.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = g; ctx.fillRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); if (host) host.style.transform = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none z-30" aria-hidden />;
}
