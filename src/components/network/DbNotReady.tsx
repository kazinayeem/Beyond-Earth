import { CheckCircle2, CircleDashed, DatabaseZap, XCircle } from 'lucide-react';
import { getSystemHealth, type HealthCheck } from '@/lib/network/health';

function Row({ c }: { c: HealthCheck }) {
  const Icon = c.state === 'ok' ? CheckCircle2 : c.state === 'fail' ? XCircle : CircleDashed;
  const tone = c.state === 'ok' ? 'text-emerald-300' : c.state === 'fail' ? 'text-rose-300' : 'text-slate-500';
  return (
    <li className="flex gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${tone}`} aria-hidden />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="hud-label text-slate-200">{c.label}</span>
          <span className={`text-xs font-mono ${tone}`}>{c.state === 'ok' ? 'OK' : c.state === 'fail' ? 'FAILED' : 'NOT CHECKED'}</span>
        </div>
        <p className="mt-1 text-sm text-slate-400 break-words">{c.detail}</p>
      </div>
    </li>
  );
}

/**
 * Shown when a multiplayer page can't load its data. Runs the real health
 * checks so the message names the actual cause instead of guessing.
 */
export async function DbNotReady() {
  const health = await getSystemHealth();
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <section className="rounded-2xl glass-panel p-6" aria-labelledby="sys-status">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-200 flex items-center justify-center"><DatabaseZap className="w-5 h-5" aria-hidden /></div>
          <div>
            <h1 id="sys-status" className="font-display text-lg text-white">Multiplayer system status</h1>
            <p className="text-sm text-slate-400">{health.ready ? 'All checks passed. Reload the page to try again.' : 'Something below needs attention. Single-player missions still work.'}</p>
          </div>
        </div>
        <ul className="space-y-2">{health.checks.map(c => <Row key={c.id} c={c} />)}</ul>
      </section>
    </div>
  );
}
