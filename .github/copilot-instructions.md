## Social Media Bias Analyzer – AI Agent Working Guide

Goal: Make agents productive fast with this repo’s actual architecture and workflows. For deep background and decisions, read `context.md` (single source of truth).

### Architecture snapshot (Next.js-only server)
- Frontend: `frontend/` (Next.js 15 App Router, React 19, Tailwind v4, HeroUI-style UI).
- Server APIs live inside Next.js: `frontend/src/app/api/*` (Express backend removed).
- Data: MySQL 8 via `mysql2/promise`; schema in `database/init.sql` with table `mbfc.mbfc_sources` (plus `analysis_results`).
- Reverse proxy: NGINX (SSE passthrough for `/api/analyze/stream`).

### Key server modules (where to work)
- `src/app/api/analyze/stream/route.ts` – SSE orchestrator. Emits phases: `reddit` → `mbfc` → `discussion` → `done`. Config constants at top.
- `src/app/api/analyze/route.ts` – one-shot analysis (non-streamed).
- `src/app/api/reddit-comment/route.ts` – fetch a thread JSON (OAuth + backoff).
- `src/server/reddit.ts` – Reddit OAuth, fetch top posts, comment fetch with backoff/jitter/timeouts.
- `src/server/scoring.ts` – bias mapping, sentiment multipliers, normalization helpers.
- `src/server/mbfc-signal.ts` – MBFC domain lookup against MySQL (hostname normalization).
- `src/server/ai/prompts.ts` – centralized, versioned prompts. Keys: `stance_source`, `stance_title`.
- `src/server/ai/providers/{deepseek,openai}.ts` – provider callers; use `resolvePrompt` and return JSON-only.
- `src/server/ai/adapter.ts` – provider fallback order and normalization.

### Client state & UI
- Global state: `src/context/AnalysisContext.tsx` (consumes SSE, merges phases progressively).
- Main views: `src/components/SubredditResults.tsx`, `RedditSignalCard.tsx`, `RedditPostsSection.tsx`.
- Route: `src/app/reddit/r/[subreddit]/page.tsx` renders analysis by param.

### MBFC data and ingestion
- Load dataset once into MySQL: `frontend/scripts/ingest-mbfc.mjs` (stream-json importer). Mounted file `database/mbfc-current.json` → `/app/database/mbfc-current.json` in container.
- Automation: `make db-init` (apply schema), `make db-ingest-mbfc` (run importer), `make db-seed` (both). Verify with a COUNT query.

### Dev vs container gotcha (DB host)
- In Docker (port 9005): use `MYSQL_HOST=mysql`.
- Local dev (port 3000): create `frontend/.env.local` with `MYSQL_HOST=127.0.0.1` (not `mysql`), plus the same DB creds. Otherwise MBFC lookups return empty.

### SSE and robustness patterns
- Headers: disable proxy buffering (`X-Accel-Buffering: no`); NGINX location for `/api/analyze/stream` should set `proxy_buffering off`.
- Streaming events: `reddit`, `mbfc`, `discussion` (batches), `done`, `error`.
- Reddit fetch: exponential backoff with jitter; small concurrency pool; comment timeout caps.

### Prompts and AI calls
- Always route prompts through `resolvePrompt(providerId, key, version?, override?)`.
- Choose prompt key per post: `stance_source` when MBFC bias exists; `stance_title` when it doesn’t.
- Providers must enforce JSON-only responses and parse strictly.

### Project conventions
- Keep API routes small; put heavy logic in `src/server/*` helpers.
- Config constants at file top; JSDoc on helpers; avoid ORMs.
- Error shape for routes: return `{ message }` on failure; SSE sends an `error` event then closes.

### Common workflows (commands)
- Run dev server (Next.js, port 3000):
  - `cd frontend && npm run dev`
- Build/run container (port 9005):
  - `docker compose up -d --build`
- DB init/seed:
  - `make db-init` → `make db-ingest-mbfc` (or `make db-seed`)
- MySQL shell:
  - Root: `docker exec -it mysql sh -lc 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; mysql -u root'`

### Pitfalls observed
- MBFC empty on localhost:3000 → fix `frontend/.env.local` `MYSQL_HOST=127.0.0.1`.
- SSE stalls behind proxies if buffering is on.
- `stream-json` is CJS: import with default + destructure and include `.js` suffix for subpaths (see importer).

If anything is unclear or cross-cutting, check `context.md`. Propose doc edits in PRs when you change behavior (prompts, SSE, DB schema, Makefile targets).

### Non-negotiables (must follow, every task)
- DRY first: extract helpers instead of repeating logic. If you copy code, stop and factor. Prefer a single function used in both places.
- Centralize config and constants at the file top. Do not inline magic numbers in multiple spots.
- Keep API routes thin; move logic into `src/server/*` helpers.
- Respect alias paths (`@/*`). Do not hardcode relative traversals when an alias exists.
- JSON-only from AI providers; never accept free-form text. Use `resolvePrompt` and strict parsing.
- SSE endpoints must send `error` then close on failure; include `X-Accel-Buffering: no`.
- DB host rule: Docker→`mysql`, local dev→`127.0.0.1`. Do not regress this.
- Type safety: Do NOT use `any` or type assertions (no `as Type`). Prefer narrowing and shared types.
- Shared types only: import types from `frontend/src/lib/types.ts`. If a type is missing, add it there first.

### End-of-task quality gates (block completion if any fail)
1) Build/Lint: ensure no TS/ESLint errors in changed files.
2) DRY audit: no duplicate logic introduced. If similar code exists, extract a helper (e.g., `computeDiscussionFinal()` instead of recomputing blocks).
3) Tests or tiny smoke: for public behavior change, add/adjust at least one minimal test or run a quick smoke and paste the relevant output.
4) Docs: update `context.md` and README when changing flows (SSE phases, prompts, DB, Makefile).
5) Env safety: confirm `.env.local` vs container env expectations when touching DB/AI keys.
 6) Typesafe: no `any`, no `as` assertions; new shapes live in `src/lib/types.ts`.

### DRY example (what to do)
- Bad: recomputing lean metrics in multiple places.
- Good: create `computeLean(samples)` returning `{ leanRaw, leanNormalized, overallScore }` and use it both for progressive emits and final caching.
