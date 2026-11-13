# Multiplayer setup and rules

Mission Control uses Supabase for accounts, player identity, squads, verified mission results and leaderboards. The single-player simulator still works without it.

## 1. Apply the database migrations

The schema lives in `supabase/migrations/`, applied in filename order:

| File | What it adds |
|---|---|
| `20261108120000_multiplayer_core.sql` | All tables, RLS policies, triggers and RPCs |
| `20261108130000_health_and_participants.sql` | `multiplayer_health()`, `ensure_my_profile()` (repairs accounts that have no profile), the `mission_participants` view, squad run visibility, stats timestamp trigger |

**With the database password (simplest):** add `SUPABASE_DB_PASSWORD=…` to `.env.local` (Dashboard → Project Settings → Database; reset it there if you don't know it), then run `npm run db:migrate`. This runs `supabase db push` against `db.<project-ref>.supabase.co:5432`. The password is read from the env file and scrubbed from the output.

**With a CLI login:**

```bash
npx supabase@2 login        # opens a browser once
npm run db:link             # asks for the database password (Dashboard → Project Settings → Database)
npm run db:push             # applies every pending migration, in order, and records it
```

**Or in the dashboard:** SQL Editor → New query, then paste and run each file in the order above. The core file refuses to run twice (`MULTIPLAYER_CORE_ALREADY_APPLIED`), and the second file is safe to re-run. Don't mix the two methods: the CLI doesn't know about files you ran by hand.

Then open `/status` in the app. All four checks should read OK (the profile check needs you to be signed in). The Supabase security advisors (Dashboard → Advisors) should show no RLS warnings.

## Seed accounts (optional)

`npm run seed:players` creates five real Supabase Auth accounts through the Admin API, plus the squad "Orbital Pioneers" (the primary account as leader, Nova and Kai as members; Lena and Arjun stay outside). It needs two extra values in `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=…   # Dashboard → Project Settings → API keys → secret key. Server scripts only.
SEED_PRIMARY_PASSWORD=…       # password for the primary account
```

- **Primary account:** `kazinayeem55085@gmail.com` (override with `SEED_PRIMARY_EMAIL`, `SEED_PRIMARY_USERNAME`, `SEED_PRIMARY_DISPLAY_NAME`). If the account already exists, its password is set to `SEED_PRIMARY_PASSWORD`.
- **Test accounts:** `mc-test-{nova,kai,lena,arjun}@example.com`. `example.com` is reserved (RFC 2606), so no mail reaches a real person; set `SEED_TEST_EMAIL_DOMAIN` to change it. Their random passwords are written to `.seed-credentials.local.json` (gitignored, mode 600) and never printed.
- **How it runs:** all accounts are email-confirmed. Profiles and player IDs come from the same database trigger a real sign-up uses, and squad membership goes through the real invite/accept RPCs. Everyone starts with 1,000 credits, 0 XP and 0 science.
- **Running it again** updates rather than duplicates: no extra users, profiles or squads, and earned progress is kept.

**Demo data without the service-role key:** `npm run db:seed-demo` runs [`supabase/seeds/demo_pilots.sql`](../supabase/seeds/demo_pilots.sql) with only `SUPABASE_DB_PASSWORD`. You can also paste that file into the SQL Editor. It creates the same 2,000 demo pilots described below directly in SQL; the CLI records the file's hash, so it runs once. To remove them, run [`supabase/seeds/demo_cleanup.sql`](../supabase/seeds/demo_cleanup.sql) in the SQL Editor. `npm run test:seed` checks the seed on a local Postgres first.

**Demo data (Admin API variant):** `npm run seed:demo` adds 2,000 demo pilots (`--count=N` to change the number). They come with mission history spread over the last 90 days, squads of 2–3, statistics and achievements, all computed with the same formula as `complete_mission()`. Each one is a real Auth user at `demo-pilot-NNNN@example.com`, tagged `app_metadata.demo = true`, with the bio "Demo pilot (seed data)" and a discarded random password, so nobody can sign in as them. They appear on the public leaderboards. `npm run seed:demo -- --clean` removes them all.

`npm run verify:supabase` then runs live checks against the project: sign-in for all five accounts, profiles and unique player IDs, RLS (no editing others' profiles, no writing credits, no forged results), the squad limit (it temporarily opens a seat, lets two outsiders try to accept, and confirms the 4th is refused, then restores the squad), and leaderboards. Add `APP_URL=http://localhost:3000` to also check that the app pages load without a database warning.

## 2. Configure Auth (Dashboard → Authentication)

| Setting | Value |
|---|---|
| Site URL | `https://beyond-earth-xi.vercel.app` (if this stays `http://localhost:3000`, confirmation emails link to localhost) |
| Redirect URLs | `https://beyond-earth-xi.vercel.app/**`, `https://*-<vercel-team>.vercel.app/**` (preview deployments, optional), `http://localhost:3000/**` |
| Email confirmations | On (recommended) |
| Google provider (optional) | Enable it and add the OAuth client ID and secret. The Google button appears automatically once it's on. |

The default email templates work as they are. Confirmation and recovery links land on `/auth/callback`. If you prefer the token-hash template, point links at `/auth/confirm?token_hash={{ .TokenHash }}&type=email` (or `type=recovery`).

## 3. Environment

`.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://czuofwvddtnohwnfienx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
NASA_API_KEY=your-api.nasa.gov-key   # server only; optional (falls back to DEMO_KEY)
```

The app itself never uses the service-role key. Only `scripts/supabase/seedPlayers.ts` and `verifyLive.ts` read `SUPABASE_SERVICE_ROLE_KEY`, and they run in Node, outside the Next.js bundle.

## Access model

| Feature | Visitors | Signed-in players |
|---|---|---|
| Browse missions and briefings | ✓ | ✓ |
| Player search, public profiles, leaderboards, squad directory | ✓ | ✓ |
| Build spacecraft, launch, earn rewards | — | ✓ |
| Profile editing, squads, invitations, notifications | — | ✓ |

`src/proxy.ts` refreshes sessions and redirects `/profile` and `/notifications` to sign-in. Every server action re-checks the session with `getClaims()`, and the database enforces the same rules again, independently.

## Identity

- **Player ID:** `MC-` plus 6 characters from an unambiguous alphabet. It's generated by the database when the auth user is created, guaranteed unique by a constraint, and can't be changed.
- **Username:** unique (case-insensitive) and permanent.
- **Editable profile fields:** display name, avatar, bio and privacy toggles.
- **Email:** never stored in `public.profiles`, so it can't appear in searches or on profiles.

## Squads

- A squad holds 2–4 members (a squad mission needs at least 2), and each player belongs to at most one squad.
- The 4-member limit is enforced under a row lock in `respond_to_invitation`, and again by a trigger on `group_members`. That makes it race-safe.
- Any member can invite. Invitations must be accepted and expire after 7 days. Duplicate pending invitations and self-invitations are rejected.
- Only the leader can remove members or transfer leadership. When the leader leaves, the longest-serving member takes over. When the last member leaves, the squad is dissolved.

## Crew roles (20) and squad mission rooms

Migration `20261113120000_squad_game.sql` adds:

- **20 crew roles** (`src/lib/network/crewRoles.ts` mirrors `private.all_crew_roles()`): Mission Commander, Mission Director, Mission Planner, Project Manager, Risk Manager, Aerospace / Mechanical / Electrical / Software / Thermal / Propulsion Engineer, Science Officer, Planetary Scientist, Data Scientist, Robotics Engineer, Research Scientist, Flight Director, Flight Controller, Navigation Officer, Communication Officer. Roles are exclusive within a squad; the leader assigns any number of roles to any member (`set_crew_roles`). Roles nobody holds fall to the leader, so every duty always has an owner. The squad page and the invite dialog use the same grouped role list, each with an (i) detail popup.
- **Mission rooms** at `/squad/<squad id or code>/<mission id>`. `create_squad_game` stores the room in `squad_games`; **every** change goes through `squad_game_act`, which checks membership, the caller's effective roles, the stage and per-mission limits:

| Stage | Who | Action |
|---|---|---|
| Briefing | Mission Director · Mission Commander | budget cap (±30 %) · approve the plan |
| Build | owner of each module family (see `componentOwnerRole`) · Aerospace Engineer | install / remove · freeze the build |
| Rocket & route | Aerospace Engineer · Mission Planner · Mission Commander | launch vehicle · trajectory · authorise |
| Launch | Flight Director · Risk Manager · Flight Controller | GO/NO-GO from live weather · weather waiver · LAUNCH |
| Flight | role owners per event category, `OPS` actions, Commander abort | the Flight Director's console runs the simulation and applies the queued commands |

- **Launch weather.** `src/lib/weather/launchWeather.ts` evaluates wind, gusts, precipitation, cloud, lightning and temperature against launch-commit-style limits and returns GO / MARGINAL / NO-GO plus a loss probability. Live data: Open-Meteo (real-time) cross-checked with NASA POWER, `GET /api/nasa/weather`. `GET /api/nasa/space-weather` (NASA DONKI flares/CMEs/storms) and `GET /api/nasa/neo` (NeoWs) add flight-risk points. The commit roll happens in the database (`launch.commit`): a loss destroys the vehicle at a random time during the first-stage burn and the debrief names the cause. A NO-GO needs the Risk Manager's waiver before the Flight Director can declare GO.
- **Squad chat.** `squad_messages` (RLS: squad members only, Realtime) plus the floating bubble (`SquadChatDock`) on every page. Key game moments are mirrored into the chat as system lines.
- **Rewards.** When the room ends, every member calls `squad_game_claim`, which creates a run and goes through `complete_mission` with the server-stored result (squad bonus included).

## Mission rewards (server-computed)

1. **Starting a run.** At launch commit, the client calls `start_mission`, which returns a run ID. A player has at most one active run.
2. **Completing a run.** At debrief, the client sends the simulation's readings (status, science, fuel, risk) to `complete_mission`. The database then:
   - rejects runs completed faster than the mission minimum (40 s);
   - caps science at the mission's limit;
   - downgrades SUCCESS to PARTIAL if science is below the target or risk is 70% or higher;
   - computes score = 0.45 × science score + 0.35 × safety + 0.20 × fuel efficiency (FAILURE is capped at 45);
   - awards credits from the mission catalog: 100% for SUCCESS, 50% for PARTIAL, 0 for FAILURE;
   - awards XP = base XP × (1 / 0.5 / 0.2) + score;
   - grants one reward per run, enforced by a unique `run_id`.
3. **Squad missions.** Each member flies the mission on their own schedule. Results add to the squad's totals. When at least two members succeed on the same squad mission, each successful member receives a one-time bonus of 10% of the mission reward.

**Known limitation:** the simulation itself runs in the browser, so the server can only bound and sanity-check what it reports. It can't replay the flight. Moving the simulation server-side would close that gap.

## Leaderboards

- Pilot boards: experience, science points, missions completed, credits.
- Squad board: mission XP earned together.
- Periods: all time, last 30 days, last 7 days (rolling windows over verified results).
- Players who hide their statistics aren't listed.

## Tests

```bash
npm test          # game data and flight model, plus the database suite
npm run test:db   # migrations + RLS + RPC tests on in-process Postgres (PGlite)
npm run verify:supabase   # live checks against your Supabase project (after seeding)
```

The database suite applies the real migration with a small Supabase auth shim and covers:
- identity and username rules;
- forged credits, scores and achievements;
- RLS isolation;
- squad limits, including a 4th member rejected both at acceptance and at the trigger;
- invitation states;
- reward capping and duplicate-reward prevention;
- squad bonuses, leaderboards and privacy.

PGlite runs a single connection, so the concurrency guarantees come from the row locks and constraints described above rather than from a parallel test.
