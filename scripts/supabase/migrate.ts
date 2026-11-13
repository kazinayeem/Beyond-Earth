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
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, SUPABASE_URL, env } from './shared';

const ref = new URL(SUPABASE_URL).host.split('.')[0];
let dbUrl = env('SUPABASE_DB_URL', false);
if (!dbUrl) {
  const password = env('SUPABASE_DB_PASSWORD');
  // db.<ref>.supabase.co is IPv6-only; on IPv4-only networks set SUPABASE_DB_POOLER_HOST to the
  // session pooler (Dashboard → Connect → Session pooler), e.g. aws-0-ap-southeast-1.pooler.supabase.com
  const pooler = env('SUPABASE_DB_POOLER_HOST', false);
  dbUrl = pooler
    ? `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${pooler}:5432/postgres`
    : `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

const dryRun = process.argv.includes('--dry-run');
console.log(`Applying migrations${process.argv.includes('--include-seed') ? ' and seed data' : ''} to project ${ref}${dryRun ? ' (dry run)' : ''}…`);
const args = ['-y', 'supabase@2', 'db', 'push', '--db-url', dbUrl, '--yes'];
if (dryRun) args.push('--dry-run');
const withSeed = process.argv.includes('--include-seed');
if (withSeed) args.push('--include-seed'); // runs [db.seed].sql_paths from supabase/config.toml once (hash-tracked)
// On Windows `npx` is a .cmd shim that spawnSync cannot launch without a shell (and a shell would mangle the URL),
// so run npm's npx-cli.js with the current Node binary instead.
const npxCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
const res = process.platform === 'win32' && existsSync(npxCli)
  ? spawnSync(process.execPath, [npxCli, ...args], { cwd: ROOT, encoding: 'utf8' })
  : spawnSync('npx', args, { cwd: ROOT, encoding: 'utf8' });
if (res.error) console.error(`Could not start the Supabase CLI: ${res.error.message}`);
// Never echo the connection string, even if the CLI includes it in an error
const scrub = (s: string) => s.split(dbUrl).join('postgresql://postgres:***@…').replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://***@');
process.stdout.write(scrub(res.stdout ?? ''));
process.stderr.write(scrub(res.stderr ?? ''));
if (res.status !== 0) {
  console.error('\nMigration failed. Check SUPABASE_DB_PASSWORD (Dashboard → Project Settings → Database → Reset password if unknown).');
  process.exit(res.status ?? 1);
}
console.log('\nDone. Open /status to confirm, or run: npm run verify:supabase');
