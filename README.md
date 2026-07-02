# PrimeLuck Creative OS (PCOS)

> A self-improving AI operating system for visual arts education.
> Challenge → Create → Reflect → Analyze → Improve → Repeat.

## What this is

PCOS is the AI-powered creative learning platform for PrimeLuck Arts Academy. Unlike a traditional lesson planner, every lesson in PCOS is a versioned, living object that improves over time through teacher feedback, student engagement, and AI analysis.

This repository contains the **Phase 0 MVP frontend** — a React + Vite app wired to a dedicated Supabase backend (`primeluck-creative-os`).

## The three hero flows (Phase 0)

| Flow | Who | What happens |
|---|---|---|
| **Generate Mission** | Teacher | Form → AI Challenge Engine → vivid Mission Card saved to DB |
| **My Mission** | Student | Mission Card → reflect + upload → XP awarded → rank-up celebration |
| **Portfolio** | Student | Lifelong creative growth record with XP, rank ladder, badges |

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Edge Functions:** Deno (generate-mission, award-xp, get-portfolio)
- **Deployment:** Vercel (this repo, auto-deploy on push to main)

## Supabase project

Project: `primeluck-creative-os` (hpyznfxnltreviijyhct)

⚠️ **Do not confuse with the `pla system` project** — that is the live PrimeLuck Arts Connect operational backend (enrollment, billing, attendance). PCOS is a separate product on a separate backend.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Teacher | teacher@primeluckdemo.com | demo1234 |
| Student | student@primeluckdemo.com | demo1234 |

## Local development

```bash
npm install
npm run dev
```

## Deployment

Auto-deploys to Vercel on every push to `main`.
Preview URLs generated for every pull request.

## Architecture

See the [Notion living spec](https://app.notion.com/p/38f6aa313f8081ddb760cd303a5c93da) and [Miro architecture diagrams](https://miro.com/app/board/uXjVHAMikTs=/) for full system design.

## Phase roadmap

| Phase | Goal | Status |
|---|---|---|
| Phase 0 — MVP | Core loop working in real classrooms | 🟡 In progress |
| Phase 1 — Intelligence | Lesson Evolution Engine + AI Critique Coach | ⬜ Planned |
| Phase 2 — Ecosystem | Cross-school network effects, Beyond School | ⬜ Planned |
| Phase 3 — Enterprise | District/SIS integrations, franchise tooling | ⬜ Planned |

## Linear backlog

Phase 0 tickets tracked in [Linear — PCOS Phase 0 MVP](https://linear.app/primeluckhr/project/pcos-phase-0-mvp-1f8a2a5778f6).
