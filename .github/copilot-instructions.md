## Social Media Bias Analyzer – AI Assistant Working Guide

Purpose: Enable an AI coding agent to contribute productively within minutes. Focus on this repo’s concrete architecture, data flows, and established conventions (not generic advice).

### 1. High-Level Architecture
- Monorepo style root: `frontend/` (Next.js 15 App Router + Tailwind v4 + HeroUI) and `backend/` (Express + mysql2) plus MySQL & NGINX infrastructure.
- Backend is intentionally thin: fetch Reddit data, enrich with MBFC DB, return JSON. Almost all presentation, aggregation, and filtering logic lives on the frontend.
- Signals model: current implemented signals are (a) MBFC link bias, (b) heuristic Discussion/Comment sentiment (embedded in `/api/analyze`). Future signals will append—don’t prematurely abstract.
- `context.md` = canonical evolving design & roadmap. Always consult / update it when changing cross‑cutting behavior.

### 2. Key Data Objects (Pragmatic Shapes)
Returned analysis object (loose JS):
```
AnalysisResult {
  subreddit | communityName,
  biasBreakdown: Record<string, number>,
  details: MBFCDetail[],          // MBFC joined rows
  redditPosts: RedditPost[],      // Raw subset of Reddit API data
  overallScore?: { score, label, confidence },
  discussionSignal?: { samples[], leanRaw, leanNormalized, label }
}
```
Types are formalized for the frontend only in `frontend/src/lib/types.ts`; backend remains plain JS.

### 3. Backend Conventions
- Location: `backend/app/index.js` main Express server; route `/api/analyze` orchestrates everything.
- MBFC domain lookup logic: `backend/app/mbfc-signal.js`. If extending, keep normalization + DB querying side‑effect free except for the passed connection.
- Additional `signal/*` files are placeholders; create new files there for future signal logic rather than bloating `index.js`.
- Avoid adding ORMs—project deliberately uses `mysql2` + handwritten SQL for transparency.
- When adding an endpoint: keep it small, pure where possible, and return plain JSON (no view layer).

### 4. Frontend Conventions
- Next.js App Router under `frontend/src/app`. Root interactive experience in `page.tsx`. Dynamic subreddit route: `reddit/r/[subreddit]/page.tsx`.
- Shared client state (analysis data, loading, filters) via `context/AnalysisContext.tsx` – prefer evolving this provider instead of scattered `useState` in pages.
- Filtering & enrichment (OG image fetching, comment loading) handled in components: `SubredditResults.tsx` (aggregate view) and `RedditSignalCard.tsx` (per-item). Add new per-signal UI pieces here.
- API routes (frontend) for secondary fetches: `api/og-image/route.ts`, `api/reddit-comment/route.ts`. Follow this pattern (one small route per auxiliary concern) rather than overloading `/api/analyze`.
- Tailwind v4 + HeroUI: global CSS at `globals.css` uses `@import "tailwindcss";` and a custom plugin reference. Keep design tokens/extra utilities in `tailwind.config.js`. If adding variants, prefer `@custom-variant` in CSS or `theme.extend` in config.

### 5. Signals & Scoring Workflow (Current)
1. Reddit posts fetched (top timeframe) → extract external URLs.
2. Domains normalized → MBFC DB lookup → bias metadata attached.
3. Heuristic discussion signal (lexical sentiment * engagement * mapped bias) computed (prototype only).
4. Frontend merges & filters; overall score presently heuristic. Future: weighted aggregation per `context.md` roadmap.

### 6. Where to Add New Capabilities
- New analysis dimension (e.g., ImageSignal): backend `app/signal/<name>.js`, invoked inside `/api/analyze` after MBFC step; append result under `discussionSignal` sibling (e.g., `imageSignal`).
- New UI panel: extend `SubredditResults.tsx` (add memoized derivation + filter integration) and small presentational piece (new component in `components/`).
- Persistent caching (future): introduce lightweight module `backend/app/cache.js` (in‑memory Map first) and call inside existing signal functions.

### 7. Database Touchpoints
- Schema initialized via `database/init.sql` (MBFC table + seed). Avoid implicit migrations—edit `init.sql` & document change in `context.md` if schema evolves.
- Bulk MBFC ingestion logic assumed external/manual; if adding refresh automation, create a script in `backend/scripts/` and expose via `package.json` script.

### 8. Environment & Ports
- Standard local dev: frontend dev server on :3000 (not Docker) OR container on :9005; backend container on :9006.
- `.env` at repo root powers Docker Compose; variables must be referenced in compose and backend code (never hardcode secrets).

### 9. Makefile & Automation
- Some targets documented in `README.md` / `context.md`; if implementing new automation, centralize in `Makefile` and update both docs minimally (prefer table in `context.md`).

### 10. Styling & UI Patterns
- Typography & color derived from Tailwind utilities; gradient headings use `bg-clip-text text-transparent` pattern (see `Header.tsx`). Preserve semantic tags (`h1`, `h2`) for accessibility.
- Filters: add new categorical filter by: (1) compute counts in `SubredditResults.tsx`, (2) add state slice, (3) incorporate into AND filter predicate, (4) display buttons or Select (HeroUI) with counts.

### 11. Error Handling Pattern
- Backend: return `{ message: '...' }` with appropriate HTTP status; frontend checks `!ok` → sets error state in context.
- Frontend auxiliary routes (og-image, reddit-comment) wrap failures and still return 200 with `{ ogImage: null }` or `{ body: null, error }` to simplify consumer logic.

### 12. Performance Considerations
- Over-fetch avoidance: OG images and comment threads are lazy per-card. When adding new per-post enrichments, follow this lazy trigger model to prevent N+1 storms on initial load.
- Memoization: heavy derivations (filtering, grouping) should use `useMemo` keyed on underlying arrays + filter state, as done in `SubredditResults.tsx`.

### 13. Adding Tests (When Introduced)
- Focus initial tests on domain normalization & bias mapping (`mbfc-signal.js`). Provide isolated fixtures (domains with subdomains, tracking params) and assert expected canonical lookup.

### 14. Documentation Updates Required With Code Changes
Whenever you:
- Add a new signal → update `context.md` (Signals section + roadmap status) and list new result field(s).
- Change DB schema → amend `database/init.sql` + note rationale in `context.md` (schema evolution subsection).
- Introduce new Makefile target → update Makefile table in `context.md`.

### 15. Common Pitfalls Observed
- Forgetting to include new directories/globs in Tailwind `content` array (unused classes won’t compile).
- Adding heavy logic directly inside React components without memoization (hurts rerender performance on filter changes).
- Returning inconsistent field names (e.g., `communityName` vs `subreddit`). Keep both only if necessary for backward compatibility—otherwise normalize.

### 16. Lightweight Contribution Checklist (AI Agent)
1. Identify change scope (backend signal, frontend UI, infra) & open relevant files.
2. Implement minimal, composable addition (pure helpers where possible).
3. Update types in `lib/types.ts` if frontend consumes new fields.
4. Add lazy fetch pattern for any new per-post enrichment.
5. Run dev server locally (or rely on existing) and validate network responses.
6. Update `context.md` + this file if cross‑cutting.
7. Keep diffs focused—no sweeping formatting churn.

### 17. Style & Code Quality Notes
- JavaScript backend stays plain (no TypeScript migration until explicitly approved).
- Prefer descriptive but short function names: `fetchRedditPosts`, `mapMBFCDetails`.
- Avoid speculative abstractions (interfaces/factories) until a second concrete use-case exists.

### 18. Future Hooks (Preparation)
- Scoring refactor: expect a future `aggregateScores(signals[])` pure function. When adding new signal outputs, shape them so they can feed such an array (e.g., `{ id: 'mbfc', weight, value, confidence }`).
- Caching: design new functions with input determinism so output caching (key = JSON.stringify(input)) is trivial.

---
Questions or ambiguity during edits: inspect `context.md` first; if still unclear, leave a concise TODO comment referencing the uncertain domain decision.
