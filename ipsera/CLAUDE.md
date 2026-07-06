# IPSERA LifeOS — project context

Read this before doing anything else in this repo. This is a from-scratch
handoff document: the session that wrote it had no memory of this repo
existing before it started, and neither will you unless you read this.

## What IPSERA is

A Personal Life Operating System — not a productivity app, not a chatbot,
not a task manager. It helps people intentionally design, execute,
evaluate, and improve every important area of life, across six dimensions:

- **I**dentity — who am I becoming?
- **P**hysical — am I caring for my body?
- **S**piritual — am I grounded in what matters most?
- **E**conomic — am I building financial freedom?
- **R**elationships — am I investing in the people I love?
- **A**chievement — am I making progress on what matters?

The user is always the decision-maker. AI assists, coaches, and explains —
it never decides or acts autonomously on the user's behalf. Every task,
goal, and reflection can link to one or more of the six dimensions, and the
IPSERA score is a transparent, rule-based computation from real user
activity (task completion, goal progress, self-rated reflection check-ins)
— never an AI guess, and it always shows its breakdown.

Design philosophy: minimal, elegant, fast, calm, focused — inspired by
Apple, Notion, Linear, Headspace, Raycast. No clutter, no feature overload.

## Tech stack

- Next.js 15 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- shadcn/ui — **hand-integrated, not CLI-managed**. The environment this was
  built in blocked network access to `ui.shadcn.com`, so every primitive in
  `src/components/ui` is plain source code, not `shadcn add`-generated. If
  you have registry access in your environment, the CLI will still work
  going forward for *new* components — just don't assume `components.json`
  reflects CLI-tracked state.
- Supabase (Postgres + Auth + Realtime) — see "Backend" below
- Zustand (client/UI state only — auth session, theme), Supabase Realtime
  (`postgres_changes`) for server/data state
- Zod, React Hook Form, Recharts, lucide-react

## Architecture

```
src/
  app/            Next.js routes — kept thin, delegate to components/hooks
  components/     ui/ (shadcn primitives) + feature components + layout
  domain/         Framework-free types + the IPSERA scoring engine (pure functions)
  infrastructure/ Supabase client + a generic user-scoped Postgres repository
  hooks/          Application layer — composes domain + infrastructure for the UI
  stores/         Zustand (auth session, UI state only)
  lib/            Zod schemas, utils, date helpers, friendly auth-error mapping
  providers/      Auth + theme React context providers
supabase/migrations/   SQL migrations, applied in order (0001, 0002, ...)
```

Every feature module (tasks/projects/goals/reflections) follows the same
shape: a Postgres table with RLS, a thin repository built on
`createUserScopedRepository()` (`src/infrastructure/supabase/user-scoped-repository.ts`),
a hook built on `useCollection()` (`src/hooks/use-collection.ts`), and
feature components. Don't hand-roll a new CRUD pattern — extend the
existing one.

## Backend — Supabase (already provisioned, real project)

- Org: **coach lucky** (`wjjgrmvjjhetojchszux`)
- Project: **ipsera** (ref `xdlyttqvjdiqmhpeivuw`), region us-east-2, free tier
- URL: `https://xdlyttqvjdiqmhpeivuw.supabase.co`
- Migrations `0001_init.sql` and `0002_fix_updated_at_function_privileges.sql`
  are already applied to this live project (not just written — actually run).
- Tables: `tasks`, `projects`, `goals`, `reflections`, each `user_id`-scoped
  with RLS (`auth.uid() = user_id`), realtime enabled.
- **RLS was verified for real**, not just written: via direct SQL with
  simulated JWT claims for two different users (rolled back afterward, no
  test data persists) — confirmed each user sees only their own rows, and
  a cross-user UPDATE attempt affects 0 rows. If you touch RLS policies,
  re-verify the same way rather than trusting the SQL by inspection alone.
- To run locally: `cp .env.example .env.local`, fill in
  `NEXT_PUBLIC_SUPABASE_URL` (above) and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (get it from the Supabase dashboard → Project Settings → API, or ask the
  user — it's an anon/publishable key, safe to expose client-side, security
  is enforced by RLS not by keeping this secret).
- Supabase requires email confirmation on sign-up by default. The sign-up
  form already handles this (`needsEmailConfirmation` from `useAuth().signUp`)
  — don't assume a session exists immediately after sign-up.

## What's already built (v0.1 MVP — all done)

Auth (sign-in/sign-up/sign-out, route guard) · Dashboard (six dimension
rings + today's focus) · Tasks · Projects · Goals · Reflection · IPSERA
scoring engine · Analytics (dimension bar chart + mood trend line, built
using the `dataviz` skill's validated categorical palette — six dimension
colors were run through `validate_palette.js` for CVD-safety, not
eyeballed; don't change them without re-validating) · Settings · Dark mode
· Responsive app shell (sidebar/topbar/mobile nav).

Deliberately deferred (per the original spec): Knowledge OS, Business OS,
Creative OS, Finance OS, Health OS, Relationship OS, and the deeper AI
coaching layer. Don't build these unless explicitly asked.

## Known gaps / what to do next

1. **This code was originally developed as a subfolder inside a different,
   unrelated monorepo** (`primeluckhr-ship-it/artOS`, a PrimeLuck Creative OS
   app — nothing to do with IPSERA) and is meant to be extracted into its own
   dedicated repo (`luckymaingi/ipsera`) for a clean start. If you're reading
   this file from that dedicated repo, the export succeeded and this is now
   the source of truth going forward. If you're reading it from inside
   `artOS/ipsera` still, this file is a prepared-but-not-yet-executed handoff
   brief — the export/push described below hasn't happened yet.
2. **No live browser E2E test has been done yet.** The environment this was
   built in blocked outbound network access to `*.supabase.co` (and
   `*.vercel.app`/`api.vercel.com`) from its sandbox — confirmed via proxy
   logs, not assumed. Verification instead was done server-side: Supabase
   security advisor (clean), and the RLS/trigger SQL simulation described
   above. **The one thing still untested is the actual UI**: sign up for
   real, confirm the email, sign in, create a task/goal/reflection, and
   watch the dashboard score update. Do this before considering the app
   "done" — it's the highest-value remaining check.
3. **Vercel deployment is not yet set up.** Import this repo in the Vercel
   dashboard (repo root = app root now, no subfolder setting needed), add
   the two `NEXT_PUBLIC_SUPABASE_*` env vars, deploy.
4. Once you've done #2 against a real deployment, that closes the loop on
   the one thing the original build session couldn't verify itself.

## Working conventions from the original build

- Never generate everything at once — build incrementally, verify
  (`npm run build`, `npm run lint`) after each module.
- No premature abstraction, but the generic repository/collection-hook
  pattern above is intentional shared infrastructure, not premature — extend
  it rather than duplicating CRUD per entity.
- Commit incrementally with clear messages describing *why*, not just what.
