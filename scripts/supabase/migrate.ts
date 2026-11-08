/**
 * Applies supabase/migrations/ to the live project with the Supabase CLI,
 * using the database password from .env.local (never from the command line
 * or chat):
 *
 *   SUPABASE_DB_PASSWORD=…   (Dashboard → Project Settings → Database)
 *   npm run db:migrate
 *
 * Or set SUPABASE_DB_URL to a full connection string instead.
 * The CLI records each applied file in supabase_migrations.schema_migrations,
 * so running this again only applies new files.
 */
import { spawnSync } from 'node:child_process';
import { ROOT, SUPABASE_URL, env } from './shared';

const ref = new URL(SUPABASE_URL).host.split('.')[0];
let dbUrl = env('SUPABASE_DB_URL', false);
if (!dbUrl) {
  const password = env('SUPABASE_DB_PASSWORD');
  dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

const dryRun = process.argv.includes('--dry-run');
console.log(`Applying migrations to project ${ref}${dryRun ? ' (dry run)' : ''}…`);
const args = ['-y', 'supabase@2', 'db', 'push', '--db-url', dbUrl, '--yes'];
if (dryRun) args.push('--dry-run');
const res = spawnSync('npx', args, { cwd: ROOT, encoding: 'utf8' });
// Never echo the connection string, even if the CLI includes it in an error
const scrub = (s: string) => s.split(dbUrl).join('postgresql://postgres:***@…').replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://***@');
process.stdout.write(scrub(res.stdout ?? ''));
process.stderr.write(scrub(res.stderr ?? ''));
if (res.status !== 0) {
  console.error('\nMigration failed. Check SUPABASE_DB_PASSWORD (Dashboard → Project Settings → Database → Reset password if unknown).');
  process.exit(res.status ?? 1);
}
console.log('\nDone. Open /status to confirm, or run: npm run verify:supabase');
