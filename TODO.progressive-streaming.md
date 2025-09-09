# Progressive Streaming (SSE) – Implementation TODO

Goal: Deliver phased updates (Reddit → MBFC → Discussion+AI) over SSE so the UI progressively enhances the overall bias rating.

Legend: [ ] pending · [x] done · [~] in progress

## Transport: SSE endpoint (Node runtime)
- [x] Create `GET /api/analyze/stream?redditUrl=...` in `frontend/src/app/api/analyze/stream/route.ts`
  - [x] Set SSE headers and keep-alive (text/event-stream, no-cache, connection: keep-alive)
  - [x] Helper: `writeEvent(name, payload)` to send JSON events
  - [~] Abort handling on client disconnect

## Phase A – Reddit (top posts)
- [x] Extract subreddit from `redditUrl`
- [x] Fetch `https://oauth.reddit.com/${subreddit}/top.json?limit=25&t=month`
- [x] Stream `event: reddit` with `{ subreddit, redditPosts, totalPosts }`

## Phase B – MBFC (MySQL)
- [x] Reuse `getMBFCBiasForUrls` from `frontend/src/server/mbfc-signal.ts`
- [x] Build `biasBreakdown`, `details`, `urlsChecked`
- [x] Compute provisional `overallScore` (center baseline; higher confidence when MBFC present)
- [x] Stream `event: mbfc` with `{ biasBreakdown, details, overallScore, urlsChecked }`

## Phase C – Discussion + AI (batched)
- [x] Select up to 8 posts that have an MBFC bias (cap = 8)
- [x] Concurrency pool = 3, 10s per-request timeout, small 100–300ms start jitter
- [ ] Rate-limit handling (429 / low `x-ratelimit-remaining` → short backoff)
- [x] Fetch comments: `https://oauth.reddit.com${permalink}.json?limit=50&depth=1`
- [x] Extract top-level comment bodies (max ~20)
- [x] Heuristic sentiment baseline
- [x] AI provider call (DeepSeek > OpenAI), no in-memory caching
- [x] Accumulate `samples`, compute `leanRaw`, `leanNormalized`, `label`, updated `overallScore`
- [x] Stream per-batch `event: discussion` with partial `{ discussionSignal, overallScore, progress: { done, total } }`
- [x] Final `event: discussion` (full set), then `event: done`

## Frontend – AnalysisContext (progressive state)
- [x] Switch from POST to `EventSource` against `/api/analyze/stream`
- [x] Maintain `phase`: `analyzing` (after reddit) → `digging` (after mbfc) → `ready` (after discussion/done)
- [x] Merge incremental payloads into a single `result` object
- [x] Handle errors/disconnects; retain already-received data

## UI tweaks – progressive cues
- [x] Show "Analyzing…" initially (Phase A)
- [x] After `mbfc`, show "Digging deeper… (n/8 analyzed)"
- [x] Ensure partial renders work (MBFC-only view before discussion)

## Server helpers (minimal)
- [x] (Inline or helper) Reddit OAuth access token
- [x] `frontend/src/server/ai/adapter.ts` exporting `analyzeSentiment`
- [x] Providers: `frontend/src/server/ai/providers/{deepseek.ts, openai.ts}` (DeepSeek > OpenAI)

## Docs / Infra
- [ ] Update `context.md` with new streaming flow and endpoint
- [ ] NGINX note for SSE (disable buffering on stream route)

## Verification
- [ ] Dev run: verify events arrive in order (reddit → mbfc → discussion → done)
- [ ] UI: observe progressive updates and final score
- [ ] Error paths: Reddit fetch fail, MBFC DB unavailable, AI off → still useful partial results
