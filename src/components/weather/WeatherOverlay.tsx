'use client';

import React, { useEffect, useRef } from 'react';
import type { WxVisual } from '@/lib/weather/launchWeather';
import { sounds } from '@/lib/sound';

interface Drop { x: number; y: number; l: number; v: number }
interface Blob { x: number; y: number; r: number; a: number; s: number }

/**
 * Canvas weather layer drawn on top of the launch pad: drifting storm clouds, slanted rain, ground fog,
 * wind streaks and forked lightning with a delayed thunder roll. Pure 2-D canvas, ~1 ms per frame.
 */
export function WeatherOverlay({ visual, reducedMotion = false, muted = false, className = '' }: { visual: WxVisual; reducedMotion?: boolean; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const vis = useRef(visual);
  const mutedRef = useRef(muted);
  useEffect(() => { vis.current = visual; mutedRef.current = muted; });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr)); canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    const drops: Drop[] = Array.from({ length: 700 }, () => ({ x: Math.random(), y: Math.random(), l: 10 + Math.random() * 22, v: 0.8 + Math.random() * 0.6 }));
    const blobs: Blob[] = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random() * 0.28, r: 0.12 + Math.random() * 0.2, a: 0.25 + Math.random() * 0.4, s: 0.2 + Math.random() * 0.8 }));
    let flash = 0;
    let bolt: { pts: [number, number][]; life: number } | null = null;
    let nextStrike = 1.5 + Math.random() * 3;
    let thunderAt = -1;
    let clock = 0;

    const makeBolt = () => {
      const pts: [number, number][] = [];
      let x = (0.15 + Math.random() * 0.7) * w, y = 0;
      pts.push([x, y]);
      const bottom = h * (0.55 + Math.random() * 0.25);
      while (y < bottom) { y += 18 + Math.random() * 34; x += (Math.random() - 0.5) * 70; pts.push([x, y]); }
      bolt = { pts, life: 1 };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
      const v = vis.current;
      ctx.clearRect(0, 0, w, h);
      const calm = reducedMotion ? 0.35 : 1;

      // Sky tint & cloud deck
      if (v.cloud > 0.25) {
        const dark = v.storm ? 0.62 : 0.18 + v.rain * 0.3;
        const g = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        g.addColorStop(0, `rgba(${v.storm ? '14,18,32' : '38,46,62'},${Math.min(0.85, (v.cloud - 0.2) * dark * 1.8)})`);
        g.addColorStop(1, 'rgba(20,26,40,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.7);
        for (const b of blobs) {
          b.x += dt * 0.012 * b.s * (0.4 + v.wind * 2.2) * calm; if (b.x > 1.3) b.x = -0.3;
          const cx = b.x * w, cy = b.y * h, r = b.r * w;
          const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          const c = v.storm ? '30,36,54' : '86,98,118';
          rg.addColorStop(0, `rgba(${c},${b.a * v.cloud * (v.storm ? 0.9 : 0.55)})`); rg.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = rg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        }
      }

      // Rain
      if (v.rain > 0.02) {
        const n = Math.floor(drops.length * Math.min(1, v.rain * 1.2 + 0.1));
        const slant = (0.12 + v.wind * 0.9);
        ctx.lineWidth = 1; ctx.strokeStyle = `rgba(190,215,255,${0.22 + v.rain * 0.28})`; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const d = drops[i];
          d.y += dt * d.v * (1.1 + v.rain) * (reducedMotion ? 0.5 : 1); d.x += dt * d.v * slant * 0.5;
          if (d.y > 1.05) { d.y = -0.05; d.x = Math.random() * 1.1 - 0.05; }
          if (d.x > 1.05) d.x = -0.05;
          const x = d.x * w, y = d.y * h;
          ctx.moveTo(x, y); ctx.lineTo(x - d.l * slant, y - d.l);
        }
        ctx.stroke();
      }

      // Wind streaks
      if (v.wind > 0.45) {
        ctx.strokeStyle = `rgba(220,235,255,${(v.wind - 0.4) * 0.22})`; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < 14; i++) {
          const y = ((i * 0.137 + clock * 0.03) % 1) * h * 0.85, x = ((clock * (0.4 + v.wind) * 0.8 + i * 0.173) % 1.3 - 0.15) * w;
          ctx.moveTo(x, y); ctx.lineTo(x + 40 + v.wind * 80, y + 2);
        }
        ctx.stroke();
      }

      // Ground fog
      if (v.fog > 0.05) {
        const g = ctx.createLinearGradient(0, h * 0.62, 0, h);
        g.addColorStop(0, 'rgba(210,220,235,0)'); g.addColorStop(1, `rgba(210,220,235,${v.fog * 0.42})`);
        ctx.fillStyle = g; ctx.fillRect(0, h * 0.62, w, h * 0.38);
      }

      // Lightning
      if (v.lightning > 0.5) {
        nextStrike -= dt;
        if (nextStrike <= 0) {
          nextStrike = (reducedMotion ? 6 : 1.6) + Math.random() * (reducedMotion ? 6 : 4.5);
          makeBolt(); flash = reducedMotion ? 0.18 : 0.7;
          thunderAt = clock + 0.4 + Math.random() * 1.4;
        }
        if (thunderAt > 0 && clock >= thunderAt) { thunderAt = -1; if (!mutedRef.current) sounds.playThunder(0.2 + Math.random() * 0.6); }
      }
      if (bolt) {
        bolt.life -= dt * 4;
        if (bolt.life <= 0) bolt = null;
        else {
          const a = Math.max(0, bolt.life) * (Math.random() > 0.2 ? 1 : 0.35);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.strokeStyle = `rgba(190,210,255,${a * 0.45})`; ctx.lineWidth = 7; ctx.beginPath(); bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; ctx.beginPath(); bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        }
      }
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(210,225,255,${flash * 0.55})`; ctx.fillRect(0, 0, w, h);
        flash *= Math.pow(0.0009, dt);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [reducedMotion]);

  return <canvas ref={ref} className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} aria-hidden />;
}
