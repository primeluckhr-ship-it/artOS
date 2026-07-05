# IPSERA LifeOS

A Personal Life Operating System spanning six intentional-living dimensions:

- **I**dentity
- **P**hysical
- **S**piritual
- **E**conomic
- **R**elationships
- **A**chievement

IPSERA is not a productivity app, an AI chatbot, or a task manager — it's an operating system for designing, executing, evaluating, and improving every important area of life. The user is always the decision-maker; AI assists, coaches, and explains, but never decides or acts autonomously.

This app lives at `/ipsera` in the `artOS` repository as an isolated Next.js project, independent from the PrimeLuck Creative OS app at the repo root (separate `package.json`, separate deploy target).

## Tech stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui primitives (hand-integrated — the `ui.shadcn.com` registry is not reachable from this environment's network policy, so components live in `src/components/ui` as plain source, not CLI-managed)
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **State:** Zustand (client/UI state), Firestore `onSnapshot` hooks (server/data state)
- **Validation:** Zod
- **Forms:** React Hook Form
- **Charts:** Recharts
- **Icons:** lucide-react

## Architecture

```
src/
  app/            Next.js routes (presentation) — kept thin, delegate to components/hooks
  components/     Presentational components (ui/ primitives + feature components)
  domain/         Framework-free types and business rules (models, IPSERA scoring engine)
  infrastructure/ Firebase client + Firestore repositories (data access)
  hooks/          Application layer — hooks composing domain + infrastructure for the UI
  stores/         Zustand stores for client-only UI/session state
  lib/            Cross-cutting utilities and Zod schemas
  providers/      React context providers (auth, theme)
```

## Local development

```bash
cd ipsera
npm install
cp .env.example .env.local   # fill in your Firebase project config
npm run dev
```

## Status: v0.1 MVP in progress

Auth · Dashboard · Tasks · Projects · Goals · Reflection · IPSERA Scoring · Basic Analytics · Settings · Dark Mode.

Everything else in the long-term IPSERA vision (Knowledge OS, Business OS, Creative OS, Finance OS, Health OS, Relationship OS, deeper AI layer) is deliberately deferred.
