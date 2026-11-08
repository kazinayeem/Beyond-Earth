/** Avatar / emblem presets: "<shape>-<color>" (validated by a DB check constraint). */
export const AVATAR_SHAPES = ['orbit', 'nova', 'comet', 'ring', 'rocket', 'planet', 'star', 'moon'] as const;
export const AVATAR_COLORS = ['cyan', 'violet', 'amber', 'emerald', 'rose', 'sky'] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const COLOR_GRADIENT: Record<AvatarColor, string> = {
  cyan: 'from-cyan-300 via-sky-500 to-blue-700',
  violet: 'from-violet-300 via-purple-500 to-indigo-800',
  amber: 'from-amber-200 via-orange-400 to-rose-700',
  emerald: 'from-emerald-200 via-teal-500 to-cyan-800',
  rose: 'from-rose-200 via-pink-500 to-fuchsia-800',
  sky: 'from-sky-100 via-sky-400 to-indigo-700',
};

export function parseAvatar(a: string | null | undefined): { shape: AvatarShape; color: AvatarColor } {
  const [s, c] = (a ?? '').split('-');
  return {
    shape: (AVATAR_SHAPES as readonly string[]).includes(s) ? (s as AvatarShape) : 'orbit',
    color: (AVATAR_COLORS as readonly string[]).includes(c) ? (c as AvatarColor) : 'cyan',
  };
}

export const RANKS = [
  { name: 'Cadet', min: 0 },
  { name: 'Specialist', min: 500 },
  { name: 'Mission Pilot', min: 1500 },
  { name: 'Commander', min: 4000 },
  { name: 'Flight Director', min: 10000 },
] as const;

/** Mirrors public.rank_for_xp() */
export function rankProgress(xp: number) {
  let i = 0;
  while (i < RANKS.length - 1 && xp >= RANKS[i + 1].min) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  return {
    rank: cur.name,
    next: next?.name ?? null,
    pct: next ? Math.min(1, (xp - cur.min) / (next.min - cur.min)) : 1,
    toNext: next ? next.min - xp : 0,
  };
}
