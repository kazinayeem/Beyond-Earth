import { DatabaseZap } from 'lucide-react';
import { EmptyState } from './ui';

/** Shown when the account exists but the multiplayer schema has not been applied yet. */
export function DbNotReady() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl glass-panel">
        <EmptyState icon={<DatabaseZap className="w-6 h-6" />} title="Multiplayer database not initialised">
          Apply the SQL in <code className="text-cyan-200">supabase/migrations/</code> to your Supabase project, then reload. Single-player missions keep working meanwhile.
        </EmptyState>
      </div>
    </div>
  );
}
