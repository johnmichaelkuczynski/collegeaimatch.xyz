# College Finder for AI

A B2B sales intelligence platform for Zhi Systems, used to identify colleges that are strong candidates to replace high-enrollment courses with AI-powered alternatives. Two workflows: College→Subject and Subject→College. Generates cost-analysis reports, decision-maker contact lists, and outreach proposal letters with charts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/college-finder run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## API Keys Required

- `COLLEGE_SCORECARD_API_KEY` — https://collegescorecard.ed.gov/data/documentation/
- `GOOGLE_PLACES_API_KEY` — Google Cloud Console (Places API)
- `OPENAI_API_KEY` — https://platform.openai.com/api-keys (used for outreach letter generation and course analysis)
- `GEMINI_API_KEY` — https://aistudio.google.com/app/apikey (used for college ranking and cost analysis)
- `SERPAPI_KEY` — https://serpapi.com (web search for college leadership contacts)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter + Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (proposals table only; college data from external APIs)
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- External: College Scorecard API, SerpAPI, OpenAI GPT-4o-mini, Gemini 1.5 Flash

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/proposals.ts` — proposals table schema
- `artifacts/api-server/src/lib/collegeScorecard.ts` — College Scorecard API client
- `artifacts/api-server/src/lib/aiClient.ts` — OpenAI + Gemini helpers (courses, contacts, proposals, cost analysis)
- `artifacts/api-server/src/lib/serpapi.ts` — web search for contacts
- `artifacts/api-server/src/routes/colleges.ts` — college search + detail routes
- `artifacts/api-server/src/routes/subjects.ts` — subject-to-college search
- `artifacts/api-server/src/routes/proposals.ts` — proposal CRUD + AI generation
- `artifacts/api-server/src/routes/dashboard.ts` — dashboard summary
- `artifacts/college-finder/src/` — React frontend

## Architecture decisions

- All college/course/contact data comes from external APIs (College Scorecard + AI generation) — no local college database. Only proposals are persisted in Postgres.
- Courses and contacts are AI-generated per request (OpenAI for courses/contacts/proposals, Gemini for subject ranking). No caching yet — add Redis or DB-backed cache to reduce latency.
- The orval config was modified to remove separate TypeScript type generation (`schemas` option removed) to avoid TS2308 name collision between Zod schemas and TypeScript interfaces when operations have both path and query params.
- All integer fields in the OpenAPI spec use `type: number` (not `type: integer`) because Orval generates `zod.int()` for integers, which is a Zod v4 feature not available in this project's Zod v3.

## Product

- **Workflow 1 (College → Subject):** Search colleges by type/state/dropout rate, pick one, explore AI-candidate courses, see decision-maker contacts, run cost analysis, generate proposal
- **Workflow 2 (Subject → College):** Enter a subject (e.g. "Psychology 101"), get colleges ranked by how much they need AI courses for that subject, drill into contacts and generate proposals
- **Proposals:** Save generated outreach letters + cost charts; track pipeline across colleges

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` and then restart both workflows.
- Do NOT add `type: integer` to the OpenAPI spec — use `type: number`. Orval generates `zod.int()` for integers which breaks typecheck in Zod v3.
- Do NOT re-add `schemas: { path: "generated/types", type: "typescript" }` to `lib/api-spec/orval.config.ts` — it causes TS2308 collisions for operations that have both path and query params.
- College Scorecard API pages are 0-indexed internally but our API uses 1-indexed pages (conversion happens in `collegeScorecard.ts`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
