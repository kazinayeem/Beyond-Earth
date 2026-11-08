import React from 'react';
import { Orbit, Sparkle, Wind, CircleDot, Rocket, Globe2, Star, Moon, type LucideIcon } from 'lucide-react';
import { COLOR_GRADIENT, parseAvatar, type AvatarShape } from '@/lib/network/avatars';

const ICONS: Record<AvatarShape, LucideIcon> = {
  orbit: Orbit, nova: Sparkle, comet: Wind, ring: CircleDot, rocket: Rocket, planet: Globe2, star: Star, moon: Moon,
};

/** Preset vector avatar: gradient disc + emblem glyph (no uploads, no external images). */
export function PlayerAvatar({ avatar, size = 40, ring = false, className = '' }: { avatar: string | null | undefined; size?: number; ring?: boolean; className?: string }) {
  const { shape, color } = parseAvatar(avatar);
  const Icon = ICONS[shape];
  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${COLOR_GRADIENT[color]} ${ring ? 'ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-slate-950' : ''} ${className}`}
      style={{ width: size, height: size, boxShadow: 'inset 0 -6px 14px rgba(0,0,0,0.35), inset 0 4px 10px rgba(255,255,255,0.25)' }}
    >
      <Icon className="text-white/95 drop-shadow" size={Math.round(size * 0.5)} />
    </span>
  );
}
