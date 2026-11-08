'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyCode({ code, label = 'Copy ID' }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label={`${label}: ${code}`}
      onClick={async () => { try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/25 text-cyan-100 font-mono text-sm hover:bg-cyan-400/20">
      {code}{done ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
    </button>
  );
}
