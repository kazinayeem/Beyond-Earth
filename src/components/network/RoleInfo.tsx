'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { CREW_ROLES, CREW_ROLE_GROUPS, crewRole, type CrewRoleGroup } from '@/lib/network/crewRoles';

const noop = () => () => {};
const TIER_LABEL = { 1: 'Mission-critical', 2: 'Subsystem owner', 3: 'Support' } as const;
const TIER_STYLE = {
  1: 'bg-amber-400/10 text-amber-200 border-amber-400/30',
  2: 'bg-cyan-400/10 text-cyan-200 border-cyan-400/30',
  3: 'bg-slate-400/10 text-slate-300 border-slate-400/25',
} as const;

/** Pop-up with the full description of one or more roles. Has a Close button, Esc and backdrop-click to dismiss. */
export function RoleInfoModal({ roleIds, title, onClose }: { roleIds: string[]; title?: string; onClose: () => void }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [onClose]);

  if (!mounted) return null;
  const roles = roleIds.map(id => crewRole(id));
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label={title ?? 'Role details'}>
      <div className="relative w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-2xl border border-cyan-400/30 bg-slate-900/98 shadow-[0_0_60px_rgba(6,182,212,0.25)] animate-[hero-rise_0.35s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div>
            <div className="hud-label text-cyan-300/80">Crew role details</div>
            <h2 className="font-display text-lg text-white">{title ?? (roles.length === 1 ? roles[0].label : `${roles.length} roles`)}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm bg-white/[0.06] hover:bg-white/[0.12] text-slate-100 border border-white/10">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {roles.length === 0 && <p className="text-sm text-slate-400">No roles assigned yet.</p>}
          {roles.map(r => {
            const Icon = r.icon;
            return (
              <article key={r.id} className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-cyan-400/10 text-cyan-200 flex items-center justify-center"><Icon className="w-5 h-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <h3 className="text-white font-medium leading-tight">{r.label}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-mono uppercase tracking-wide">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-400">{CREW_ROLE_GROUPS[r.group].label}</span>
                      <span className={`rounded-full border px-2 py-0.5 ${TIER_STYLE[r.tier]}`}>{TIER_LABEL[r.tier]}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{r.description}</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="hud-label mb-1">Responsibilities</div>
                    <ul className="space-y-1 text-slate-300 list-disc pl-4 marker:text-cyan-400/60">{r.duties.map(x => <li key={x}>{x}</li>)}</ul>
                  </div>
                  <div>
                    <div className="hud-label mb-1 text-emerald-300/80">What only this role can do</div>
                    <ul className="space-y-1 text-slate-300 list-disc pl-4 marker:text-emerald-400/60">{r.controls.map(x => <li key={x}>{x}</li>)}</ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Small round “i” button that opens the role pop-up. */
export function RoleInfoButton({ roleIds, title, label, className = '' }: { roleIds: string[]; title?: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(true); }} aria-label={label ?? 'Role details'} title="Role details"
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/25 hover:text-white transition-colors ${className}`}>
        <Info className="w-3.5 h-3.5" aria-hidden />
      </button>
      {open && <RoleInfoModal roleIds={roleIds} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The same 20-role dropdown everywhere (player directory invite + crew planner), grouped by discipline. */
export function RoleSelect({ id, value, onChange, disabled, compact = false, className = '', 'aria-label': ariaLabel }: {
  id?: string; value: string; onChange: (v: string) => void; disabled?: boolean; compact?: boolean; className?: string; 'aria-label'?: string;
}) {
  const groups = Object.keys(CREW_ROLE_GROUPS) as CrewRoleGroup[];
  return (
    <select id={id} aria-label={ariaLabel} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} className={className}>
      {groups.map(g => (
        <optgroup key={g} label={CREW_ROLE_GROUPS[g].label}>
          {CREW_ROLES.filter(r => r.group === g).map(r => <option key={r.id} value={r.id}>{compact ? r.short : r.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

/** Role chips for a crew card. `covering` roles are the ones the leader holds only because nobody else does. */
export function RoleChips({ roleIds, covering = [], max = 3 }: { roleIds: string[]; covering?: string[]; max?: number }) {
  const all = [...roleIds.map(id => ({ id, covering: false })), ...covering.map(id => ({ id, covering: true }))];
  const shown = all.slice(0, max);
  const extra = all.length - shown.length;
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
      {shown.map(({ id, covering: cov }) => {
        const r = crewRole(id);
        const Icon = r.icon;
        return (
          <span key={id} title={cov ? `${r.label} (covered by the leader — nobody else holds it)` : r.blurb}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border ${cov ? 'border-dashed border-white/20 text-slate-400 bg-white/[0.02]' : 'bg-cyan-400/10 border-cyan-400/25 text-cyan-100'}`}>
            <Icon className="w-3 h-3" aria-hidden /> {r.short}
          </span>
        );
      })}
      {extra > 0 && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border border-white/10 text-slate-400">+{extra} more</span>}
      {all.length === 0 && <span className="text-[11px] text-slate-500">No roles yet</span>}
    </div>
  );
}
