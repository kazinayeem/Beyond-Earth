import { Users } from 'lucide-react';
import { STUDENTS_PLAYED } from '@/data/siteStats';

const CREW = [
  'from-cyan-300 via-sky-500 to-blue-700',
  'from-violet-300 via-purple-500 to-indigo-800',
  'from-amber-200 via-orange-400 to-rose-700',
  'from-emerald-200 via-teal-500 to-cyan-800',
];

/** Home-page social proof: "2,500+ students have already flown a mission". */
export function PlayedByBadge() {
  const count = `${STUDENTS_PLAYED.toLocaleString('en-US')}+`;
  return (
    <div className="inline-flex items-center gap-3 rounded-full glass-panel pl-1.5 pr-4 py-1.5">
      <div className="flex -space-x-2" aria-hidden>
        {CREW.map((g, i) => (
          <span key={i} className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} ring-2 ring-slate-950`} />
        ))}
        <span className="w-7 h-7 rounded-full bg-slate-800 ring-2 ring-slate-950 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-cyan-200" />
        </span>
      </div>
      <p className="text-sm text-slate-300 leading-tight">
        <span className="font-display font-semibold text-white text-base tabular-nums">{count}</span>{' '}
        students have already flown a mission
      </p>
    </div>
  );
}
