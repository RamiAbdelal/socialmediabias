# 🧠 Social Media Political Bias Analyzer

This file is the canonical, living knowledge base for the project. It consolidates: vision, domain decisions, architecture, data contracts, ops, and per-file responsibilities so anyone can ramp up fast. Always update this document (instead of creating ad‑hoc notes) when behavior, structure, or decisions change.

## 📝 User Story

As a politically curious user who cares about impartiality,  
I want a lightweight but scalable and expandable domain driven designed web application built with **Next.js** and that can estimate the political bias of social media applications and communities, such as Reddit subreddits, Instagram pages, and X profiles.

I want to be able to enter a social media community's name/URL, which will be a subreddit as an MVP, and view an analysis of whether that it leans left or right on a scale from 0 (far-left) to 10 (far-right) as an initial 'Core Metric' (including later perhaps Credibility, Demographics, Authoritarian vs Libertarian, Economy, etc...). 

Analyses will come from data which will be derived from 'Signals' that can be used for any potential social media app if supported.

Initial signal will be an MBFCSignal looking for links to other media websites and checking them against a Media Bias Fact Check (MBFC) sourced database.

Secondly a RedditCommentSignal using social media discussions either by scraping or querying their public APIs to understand the context of the discussion and the proportion and intensity of variables like interest in, approval of, political sentiment towards the source material. This can be done by querying the an AI model, initially DeepSeek Chat, then OpenAI but possibly a HuggingFace model I was told could better judge political sentiment.

Later an ImageSignal image searching a sample of image posts to check them for credibility, maybe against X posts with Community Notes suggesting lack of credibility, a Grok prompt, Snopes articles, or other sources like Google search.

---

## 🏗️ Domain-Driven Design Architecture (Updated for MVP)



### Core Domain: Bias Analysis Engine (MVP)

* **Frontend State Management:**

  * All application state and logic (input, fetching, error/result state, subreddit navigation) is managed at the root in `frontend/src/app/page.tsx`.
  * All other pages/components (e.g., `/reddit/r/[subreddit]`) are stateless/presentational and receive their data via props or navigation.
  * This ensures a single source of truth and enables seamless navigation and SSR/CSR compatibility.
* **BiasAnalyzer**: Simple orchestrator in JavaScript that combines signals
* **Signal**: For MVP, only MBFCSignal is implemented (no interfaces or types)
* **BiasScore**: Simple number (0-10) with optional label
* **AnalysisResult**: Plain JS object with signal breakdown

### Signal Implementations (MVP)

1. **MBFCSignal**: Media source bias detection

   * Extracts URLs from subreddit posts
   * Looks up MBFC bias ratings from JSON/DB
   * Aggregates bias scores
   * **Temporary Handling of "Questionable" Sources (Important)**:

     * During testing, a manual review of MBFC "Questionable" entries showed that the overwhelming majority (≈88%) are right-leaning or extreme-right, with a smaller portion categorized as Least Biased, and almost none leaning left.
     * For MVP purposes, we therefore treat `bias = Questionable` as **generally right-leaning** when scoring subreddit bias, while making it clear to users via a disclaimer.
     * Disclaimer text to show in UI: *“For MVP scoring, Questionable sources are treated as generally right-leaning. This is based on a sample showing \~88% right-leaning/questionable outlets. Future versions will separate credibility from political direction for greater nuance.”*

*All other signals and adapters are deferred until after MVP.*

2. **Discussion / Comment Sentiment Signal (Heuristic v0)**
  * Fetches a capped subset (currently up to 10) of posts that have MBFC-mapped external URLs.
  * Pulls up to 20 top-level comments (depth 1) per post via Reddit OAuth.
  * Applies lightweight lexical stance heuristic (positive / negative token lists) to approximate community agreement or disagreement with the linked source.
  * Computes per-post engagement weight: `engagement = num_comments + score/100`.
  * Maps source MBFC bias label to numeric lean (−5 far-left .. +5 far-right) and multiplies by sentiment multiplier (+1 agree / −1 disagree / 0 neutral) * engagement.
  * Aggregates weighted post contributions -> average raw lean (−5..+5) -> normalized 0..10 bias score with label bucket (far-left, left, center, right, far-right).
  * Confidence heuristic scales with sampled posts (capped at 0.95).
  * Status: Implemented heuristically in backend `/api/analyze` response under `discussionSignal`.

---

## ✅ Acceptance Criteria (MVP Focus)

| Category                    | Details |
|----------------------------|---------|
| **Frontend**               | Next.js 15+ App Router, TailwindCSS v4 |
|                            | Input for social media community name/URL |
|                            | Displays: bias score (0–10), label (e.g., "center-left") |
|                            | Shows: signal breakdown, source examples, AI summaries |
|                            | Expandable UI for future metrics (Credibility, Demographics, etc.) |
| **Backend**                | Node.js API in plain JavaScript (no TypeScript) |
|                            | Simple, minimal code for fast MVP |
| **Platform Integration**   | Reddit API (MVP), Instagram/X (future) |
|                            | Fetch top 50 posts from the last 30 days |
|                            | Extract: posts, comments, external links, images |
|                            | Use OAuth for extended rate limits |
| **Signal Processing**      | MBFCSignal: URL extraction + MBFC database lookup |
|                            | RedditCommentSignal: AI sentiment analysis |
|                            | ImageSignal: Fact-checking integration (future) |
| **AI Integration**         | DeepSeek Chat → OpenAI → HuggingFace pipeline |
|                            | Prompt: "Analyze political sentiment and community tone" |
|                            | Get bias score + confidence + summary |
|                            | Centralized versioned prompts with per-provider overrides (see below) |
| **Bias Score Logic**       | Weighted combination of all active signals |
|                            | Normalize to 0–10 score with confidence estimate |
|                            | Support for multiple metrics (Core, Credibility, etc.) |
| **Results UI**             | Visual scale (0–10), signal breakdown, examples |
|                            | Expandable sections for future metrics |
| **DevOps**                 | Local (WSL2) and Production (Ubuntu 22 VPS) deployment |
|                            | NGINX reverse proxy configuration |
|                            | Port convention: 9005+ for this app |
|                            | All configuration managed from `.env` file |
| **Automation**             | Reproducible with Makefile scripts |

---


## 📂 Current Project Structure (High-Level)
## 🗂️ Reference: 20 Popular Subreddits and Post Types

| Subreddit Name         | URL                                         | Dominant Post Types         | Topic/Notes                        |
|-----------------------|----------------------------------------------|-----------------------------|-------------------------------------|
| r/nottheonion         | https://www.reddit.com/r/nottheonion         | Link, News                  | Satirical real news                 |
| r/worldnews           | https://www.reddit.com/r/worldnews           | Link, News                  | International news                  |
| r/politics            | https://www.reddit.com/r/politics            | Link, News                  | US politics                         |
| r/LateStageCapitalism | https://www.reddit.com/r/LateStageCapitalism | Image, Meme, Text           | Political, anti-capitalist memes    |
| r/Conservative        | https://www.reddit.com/r/Conservative        | Link, Text, Discussion      | Conservative politics               |
| r/PoliticalHumor      | https://www.reddit.com/r/PoliticalHumor      | Image, Meme, Text           | Political memes                     |
| r/AskReddit           | https://www.reddit.com/r/AskReddit           | Text, Discussion            | General Q&A                         |
| r/WhitePeopleTwitter  | https://www.reddit.com/r/WhitePeopleTwitter  | Image, Screenshot, Meme     | Social commentary                   |
| r/Conspiracy          | https://www.reddit.com/r/conspiracy          | Image, Link, Text           | Conspiracy theories                 |
| r/news                | https://www.reddit.com/r/news                | Link, News                  | General news                        |
| r/ukpolitics          | https://www.reddit.com/r/ukpolitics          | Link, News, Discussion      | UK politics                         |
| r/PoliticalCompassMemes| https://www.reddit.com/r/PoliticalCompassMemes| Image, Meme, Gallery      | Political memes                     |
| r/TwoXChromosomes     | https://www.reddit.com/r/TwoXChromosomes     | Text, Link, Image           | Gender, social issues               |
| r/BlackPeopleTwitter  | https://www.reddit.com/r/BlackPeopleTwitter  | Image, Screenshot, Meme     | Social commentary                   |
| r/atheism             | https://www.reddit.com/r/atheism             | Text, Link, Meme            | Religion, discussion                |
| r/ConservativeMemes   | https://www.reddit.com/r/ConservativeMemes   | Image, Meme                 | Conservative memes                  |
| r/Libertarian         | https://www.reddit.com/r/Libertarian         | Link, Text, Discussion      | Libertarian politics                |
| r/Britain             | https://www.reddit.com/r/Britain             | Text, Meme, Image           | Leftist British politics            |
| r/centrist            | https://www.reddit.com/r/centrist            | Link, Text, Discussion      | Centrist politics                   |
| r/PoliticalDiscussion | https://www.reddit.com/r/PoliticalDiscussion | Text, Link, Discussion      | Political debate                    |

## 🧩 Reddit Post Type Function Plan
For MVP, we will use the following post types (with only one Reddit Image Post type; meme detection is a later step):

1. **Reddit Link Post**
  - Analyze external URLs (news/articles) using MBFC database for bias.
  - Function: `analyzeRedditLinkPost(post)`

2. **Reddit Image Post**
  - Analyze direct image posts (including galleries). Use OCR/Image-to-Text to extract text, then analyze for political sentiment. Meme detection is a future step.
  - Function: `analyzeRedditImagePost(post)`

3. **Reddit Text Post**
  - Analyze self-posts using NLP/AI for sentiment and political leaning.
  - Function: `analyzeRedditTextPost(post)`

4. **Reddit Discussion/Comment Thread**
  - Aggregate sentiment and political keywords from top comments. Use AI to summarize thread’s political leaning.
  - Function: `analyzeRedditDiscussion(post, comments)`

5. **Reddit Video Post**
  - Extract captions/transcripts, analyze for sentiment and political leaning.
  - Function: `analyzeRedditVideoPost(post)`

6. **Reddit Poll Post**
  - Analyze poll question/options for political content.
  - Function: `analyzeRedditPollPost(post)`

7. **Reddit Crosspost**
  - Analyze original post by type.
  - Function: `analyzeRedditCrosspost(post)`

8. **Reddit Mixed/Other**
  - Run all relevant analyzers and aggregate.
  - Function: `analyzeRedditMixedPost(post)`

## 🏁 Next Steps

- Implement a post type classifier: `getRedditPostType(post)`
- For each post, call the appropriate analysis function above.
- For MVP, focus on: Link, Image, Text, Discussion.
- Expand to Video, Poll, Crosspost, Mixed as needed.


socialmediabias/
### 📁 Project Folder Structure (as of August 2025)
```
frontend/                # Next.js 15 app (App Router). UI, API routes, state orchestration.
backend/                 # Express.js lightweight API service (MBFC signal + Reddit fetch)
database/                # DB seed/init artifacts (SQL + MBFC JSON snapshot)
nginx/                   # Reverse proxy configuration
docker-compose.yml       # Orchestrates frontend, backend, MySQL
Makefile                 # (Planned) automation targets
context.md               # This document (single source of truth)
README.md                # Public quickstart (shorter than context.md)
env.example              # Example environment variables
mbfc-dataset-2025-08-05.json # Raw MBFC dataset snapshot (importable)
```

### 🔎 File-by-File Responsibilities (Authoritative Inventory)

#### Root Level
- `docker-compose.yml` – Spins up services: `frontend` (Next.js), `backend` (Express), `mysql`. Wires env vars, mounts the DB seed volume.
- `Makefile` – Placeholder. Planned targets: build, deploy, db export/import, logs, clean, nginx reload.
- `context.md` – Canonical project knowledge (architecture + decisions). Update whenever adding/modifying behavior.
- `README.md` – External-facing concise overview & quickstart. Should not duplicate deep architecture detail.
- `env.example` – Template for `.env` (copy then customize). Keep keys alphabetized and documented inline where possible.
- `mbfc-dataset-2025-08-05.json` – Source MBFC dataset dump used for initial DB population.
- `.gitignore` – Ignores build artifacts, local env files, dependency folders.
- `prompt.md` – (If present) May contain AI prompt / experimentation text (not production logic).

#### `backend/`
- `backend/Dockerfile` – Multi-stage (expected) container build for production deployment of the API.
- `backend/package.json` – Declares Express + mysql2 + node-fetch dependencies, scripts (start, dev).
- `backend/index.js` – Bootstrapping entry (currently logs a startup message). Could in future delegate to `app/index.js`.
- `backend/app/index.js` – Main Express server: CORS config, health endpoint, `/api/analyze` POST route (fetches subreddit posts via Reddit OAuth, enriches with MBFC lookup), response assembly.
- `backend/app/mbfc-signal.js` – Implements `getMBFCBiasForUrls(urls, dbConfig)` performing domain normalization and flexible suffix matching against `mbfc_sources` table.
- `backend/app/signal/*` – Placeholder/future specialization modules (`reddit-link.js`, `reddit-text.js`, etc.) for planned multi-signal architecture (currently unused or skeletal).

##### Backend Runtime Data Flow
1. Client sends subreddit URL to `/api/analyze`.
2. Backend obtains OAuth token, fetches top posts.
3. Extracts outbound URLs → passes to `getMBFCBiasForUrls`.
4. Builds `AnalysisResult` structure (MBFC bias breakdown + raw posts) -> returns JSON consumed by frontend.

#### `database/`
- `init.sql` – MySQL initialization (schema + table creation + potential seed load). Ensure idempotency for repeated container starts.
- `mbfc-current.json` – (Working snapshot) MBFC transformed dataset suitable for ingestion; may differ from raw dataset naming.

#### `nginx/`
- `nginx.conf` – Reverse proxy definitions for production (ports → internal services). Handles routing `/api` to backend, root path to frontend.

#### `frontend/`
- `frontend/Dockerfile` – Multi-stage image for Next.js build (Turbopack) and production server (served on port 80 inside container).
- `frontend/package.json` – Declares Next.js 15, HeroUI, Tailwind, build scripts.
- `frontend/postcss.config.mjs` – Tailwind + PostCSS configuration.
- `frontend/tailwind.config.js` – Design tokens, scanning paths for utility generation.
- `frontend/tsconfig.json` – TypeScript project config (paths, strictness, module resolution).
- `frontend/eslint.config.mjs` – Linting rules (React/Next + TypeScript + custom overrides).
- `frontend/hero.ts` – Likely HeroUI provider/theme config (global styling injection) (verify when editing).
- `frontend/public/*` – Static assets (icons, SVG, fonts).
- `.next/` – Build & cache output (never manually edit; ignored by VCS except when cached in container context).

##### Frontend App Router (`src/app/`)
- `layout.tsx` – Global shell (fonts, providers, metadata).
- `globals.css` – Tailwind layers + custom global styles.
- `page.tsx` – Root landing page; hosts analysis input + triggers fetch.
- `not-found.tsx` – 404 boundary.
- `reddit/r/[subreddit]/page.tsx` – Dynamic route for direct deep-link to a subreddit analysis (consumes shared state or triggers fetch-by-param).

##### Frontend API Routes (`src/app/api/`)
- `og-image/route.ts` – Fetches target URL HTML, extracts `<meta property="og:image" ...>` and returns `ogImage` (used for link previews in cards).
- `reddit-comment/route.ts` – Given a Reddit comment permalink, fetches `<permalink>.json` from Reddit and returns raw JSON inside `{ body }`.

##### React Context & State
- `context/AnalysisContext.tsx` – Central client-side state store (community name, loading, results, errors) to avoid prop drilling and support multi-route navigation.
- `context/HeroUIProvider.tsx` (if present) – Wraps application with HeroUI theme config.

##### Components
- `components/Header.tsx` – Top navigation / branding.
- `components/Menu.tsx` – Likely quick links / navigation actions (verify when modified).
- `components/SubredditResults.tsx` – Orchestrates display of aggregated `AnalysisResult`: filters, bias score summary, MBFC + Reddit merged listing, dynamic OG image fetch, comment on-demand loading, and new source URL Select filter.
- `components/RedditSignalCard.tsx` – Presentational card for a merged `RedditSignal` (MBFC detail + Reddit post) with lazy comment fetch button.
- `components/RedditPostsSection.tsx` – (If present) Displays raw Reddit posts separate from MBFC detail list.

##### Lib & Utilities
- `lib/types.ts` – TypeScript domain model: `BiasScore`, `SignalResult`, `MBFCDetail`, `RedditSignal`, `AnalysisResult` + full Reddit API type declarations.
- `lib/utils.ts` – Utility helpers: default object seeds, style mappers (`getBiasColor`, `getConfidenceColor`), media URL detectors.
- `lib/popularSubreddits.js` – Static list used for UI selection/autocomplete.

### 🔄 Data Contracts
The backend returns an object conforming loosely to `AnalysisResult`:
```ts
interface AnalysisResult {
  subreddit?: string;            // (backend) also mapped to communityName client-side
  communityName?: string;        // (frontend merged)
  platform?: 'reddit';
  overallScore?: { score: number; label: string; confidence: number };
  biasBreakdown?: Record<string, number>; // counts per bias category
  details?: MBFCDetail[];        // enriched MBFC rows
  redditPosts?: RedditPost[];    // raw Reddit posts (subset of fields)
  totalPosts?: number;
  urlsChecked?: number;
  message?: string;              // fallback / informational
  analysisDate?: string;         // ISO timestamp
  signalResults?: SignalResult[];// optional future multi-signal array
  discussionSignal?: {
    samples: Array<{ title: string; url: string; permalink: string; bias: string; sentiment: 'positive'|'negative'|'neutral'; engagement: number; sampleComments: string[] }>;
    leanRaw: number;           // -5..5 raw combined lean
    leanNormalized: number;    // 0..10 normalized score
    label: string;             // categorical label
  };
}
```

### 🧪 Comment Fetching Flow (On Demand)
1. User clicks "Load Comment" on a `RedditSignalCard` with a comment-type permalink.
2. Component calls `/api/reddit-comment?permalink=...`.
3. API route fetches raw Reddit JSON listing for the thread and returns it inside `{ body }`.
4. Stored in `commentBodies[permalink]` (null = loading, '' = error, string/object = loaded; currently raw JSON object — refine later to text extraction).

### 🖼️ OG Image Fetch Flow
1. `SubredditResults` collects non-image, non-gallery URLs.
2. For each, calls `/api/og-image?url=<encoded>`.
3. Route fetches remote HTML, extracts `og:image`, caches result in component state.

### 🎯 Filtering Logic Summary
Filters are additive AND conditions across: Bias, Credibility, Factual Reporting, Country, Media Type, Source URL. Each filter updates state; derived `filteredDetails` recomputed with `useMemo` to avoid expensive per-render recalculation.

### 📊 Bias Interpretation (Interim Rule)
`Questionable` sources are tentatively bucketed as right-leaning for scoring heuristics (explicit disclaimer in UI planned). This is a temporary heuristic pending introduction of an orthogonal Credibility axis.

## 🧱 Architectural Principles
- Keep backend thin: fetch + minimal transform + DB lookup.
- Push presentational and aggregation logic to the frontend for rapid iteration.
- Avoid premature abstraction (single plain-object domain interfaces; no generics / inheritance yet).
- Each new signal should: (1) produce a `SignalResult`, (2) register into an aggregation function, (3) remain independently testable.

## 🧭 Open Technical Debt / TODO Tracking
- [ ] Implement actual scoring algorithm (currently static `5.0 center`).
- [ ] Add caching layer for MBFC domain lookups (in-memory LFU/LRU or Redis later).
- [ ] Extract Reddit API logic into service module with retry & rate-limit awareness.
- [ ] Normalize & store Reddit posts + MBFC results server-side for historical trending.
- [ ] Add unit tests (Jest) for `mbfc-signal` domain matching logic.
- [ ] Migrate comment JSON shape -> extracted top-level root comment body text.
- [ ] Introduce credential rotation/secrets manager for production.
- [ ] Implement Makefile automation targets listed below.
- [ ] Add structured logging (pino) with log levels and request IDs.
- [ ] Add graceful shutdown (SIGTERM) for backend DB connection pools.
- [ ] UI accessibility & dark/light theme toggle.

## 🧠 Centralized AI Prompts (Versioned)

Prompts for AI providers are centralized in `frontend/src/server/ai/prompts.ts`.

- Keys: `stance_source` (comments vs. original linked source) and `stance_title` (comments vs. post title).
- Versioning: `DEFAULT_PROMPT_VERSION = v1`. Add new versions to the `PROMPT_VERSIONS` map.
- Provider overrides: Use `PROVIDER_OVERRIDES` to override a specific key/version for `openai` or `deepseek`.
- Resolution order: explicit override string → provider override → default versioned prompt.

Usage:
- Providers call `resolvePrompt(providerId, key, version?, override?)` internally.
- API route `analyze/stream` selects `stance_source` when an MBFC bias exists for the URL, else `stance_title`.

## 🔐 Security / Privacy Considerations
- Do not log full access tokens (currently safe; ensure masking if added).
- Rate limiting / abuse prevention not yet implemented (future: NGINX + token bucket middleware).
- CORS whitelist explicitly enumerated; review before production wide exposure.
- No PII handled; continue to avoid storing user identifiers.

## 📦 Deployment Flow (Current Manual)
1. Update code & push to repo.
2. SSH into VPS → pull changes.
3. Rebuild: `docker compose up -d --build`.
4. Verify containers healthy; inspect logs for errors.
5. (Future) Automate with GitHub Actions + remote deploy key + health check gate.

## 🧰 Observability (Planned)
- Metrics: request counts, MBFC cache hit ratio.
- Tracing: add OpenTelemetry shim once multi-signal complexity increases.
- Error tracking: Sentry or Open Source alternative.

## 📚 Glossary
- **Signal**: A bounded analytic source (MBFC link analysis, comments sentiment, image fact-check, etc.).
- **RedditSignal**: Merged view of MBFC detail & Reddit post via shared URL.
- **Bias Score**: Normalized 0–10 axis representing left/right lean.
- **Confidence**: Heuristic probability (0–1) of correctness based on signal density & agreement.

## 🧪 Quick Validation Checklist (Developer)
- Run frontend dev: `npm run dev` (inside `frontend/`).
- Trigger analyze for a subreddit and inspect network tab: `/api/analyze` → structure matches `AnalysisResult`.
- Click "Load Comment" → network call to `/api/reddit-comment` returns JSON.
- Hover over filtered cards: ensure filters reduce card count logically.
- OG image loads only for non-image URLs.

## 🗺️ Future Evolution Outline
| Dimension | Near Term | Mid Term | Long Term |
|-----------|-----------|----------|-----------|
| Signals | MBFC | Reddit Comments | Images / Video / Cross-platform |
| Storage | Ephemeral | Persist MBFC lookups | Historical trend DB + analytics |
| Scoring | Static heuristic | Weighted multi-signal | ML calibration + feedback loop |
| Infra | Single VPS | Container health monitoring | Multi-region + CDN |
| Auth | None | API key for backend | User accounts / personalization |

---
Document updated: 2025-09-08 (SSE progressive streaming + backoff on Reddit comments; NGINX SSE notes)
Maintainer: (update with your name/contact)

---

## 🔐 Environment Configuration

Create a `.env` file in the root directory:

```env
# Environment
ENVIRONMENT=LOCAL
SITE_URL=http://localhost:9005
DOCKER_PORT_FRONTEND=9005
DOCKER_PORT_BACKEND=9006
BACKEND_INTERNAL_PORT=3001

# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_SECRET=your_reddit_secret
REDDIT_USER_AGENT=your_user_agent

# AI Models
DEEPSEEK_API_KEY=your_deepseek_key
OPENAI_API_KEY=your_openai_key
HUGGINGFACE_API_KEY=your_huggingface_key

# MBFC API
RAPIDAPI_KEY=your_rapidapi_key

# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=mbfc
MYSQL_USER=mbfc_user
MYSQL_PASSWORD=mbfc_pass

# VPS Configuration (used for deployment/DB sync)
VPS_USER=ubuntu
VPS_HOST=51.68.197.173
VPS_PROJECT_PATH=/home/ubuntu/socialmediabias

# URLs for Makefile automation
URL_LOCAL=http://localhost:9005
URL_PRODUCTION=https://smb.rami-abdelal.co.uk

```

---

## 📦 Docker Compose Configuration

The `docker-compose.yml` orchestrates three services:

### Frontend Service
- **Image**: Built from `./frontend/Dockerfile`
- **Port**: `${DOCKER_PORT_FRONTEND}:80` (default: 9005:80)
- **Environment**: `APP_ENV`, `SITE_URL`
- **Dependencies**: Backend service

### Backend Service  
- **Image**: Built from `./backend/Dockerfile`
- **Port**: `${DOCKER_PORT_BACKEND}:${BACKEND_INTERNAL_PORT}` (default: 9006:3001)
- **Environment**: All API keys, MySQL connection, site URL
- **Dependencies**: MySQL service

### MySQL Service
- **Image**: `mysql:8.0`
- **Port**: `3306:3306` (for local development access)
- **Volumes**: 
  - `mysql_data:/var/lib/mysql` (persistent data)
  - `./database/init.sql:/docker-entrypoint-initdb.d/init.sql` (initialization)
- **Environment**: Root password, database name, user credentials

---

## 📄 Setup Guide

### 1. Prerequisites
- Docker and Docker Compose installed
- Node.js 22+ (for local development)
- Git

### 2. Environment Setup
```bash
# Clone the repository
mkdir socialmediabias && cd socialmediabias
git clone git@github.com:RamiAbdelal/socialmediabias.git .

# Create environment file
cp .env.example .env  # Create from template
# Edit .env with your API keys and configuration
```

### 3. Database Setup
```bash
# Now using TypeORM (Active Record) for schema, migrations and seeding
# Run services
docker compose up -d

# Run migrations and seed (inside backend container)
docker exec backend npm run migration:run
docker exec backend npm run seed
```

### 4. Development
```bash
# Start all services
docker-compose up --build

# Or start individual services
docker-compose up frontend
docker-compose up backend
docker-compose up mysql
```

### 5. Production Deployment
```bash
# Build and deploy
docker-compose -f docker-compose.yml up -d --build

# Set up NGINX reverse proxy
sudo ln -s /etc/nginx/sites-available/socialmediabias /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

---


## 🏗️ Domain Implementation Roadmap (Updated August 2025)

This roadmap merges earlier phase planning with the "Future Evolution Outline" dimensions (Signals, Storage, Scoring, Infra, Auth) and reflects recently completed frontend enhancements (lazy comments, source URL filter, component extraction) and documentation upgrades.

Legend: [x] done · [~] in progress / partial · [ ] not started · (Δ) newly added

### Phase 1: Core MVP (COMPLETED / HARDENING)
Core objective: End‑to‑end MBFC-based subreddit bias surfacing with expandable architecture.

Build & Infra
- [x] Project structure with Docker Compose
- [x] Multi-stage Docker builds (frontend & backend)
- [x] MySQL service + volume persistence
- [x] Environment variable configuration (`env.example`)
- [x] NGINX reverse proxy config drafted

Backend
- [x] Express.js API (plain JS, no TypeORM) in `backend/app/index.js`
- [x] Removed TypeORM + ORM artifacts (direct `mysql2` queries)
- [x] MBFC dataset ingestion path (JSON -> MySQL via init SQL/manual ingest)
- [x] MBFC domain lookup (`mbfc-signal.js`) with flexible domain matching
- [~] Basic domain normalization heuristics (needs edge case hardening)

Frontend
- [x] Next.js 15 + TypeScript + TailwindCSS v4 scaffold
- [x] Analysis flow (input -> request -> results display)
- [x] Bias breakdown visualization (counts per bias label)
- [x] OG Image fetch route + per-link lazy image meta extraction
- [x] Lazy comment loading (on-demand fetch via `/api/reddit-comment`)
- [x] `RedditSignalCard` component extraction (maintainability)
- [x] Source URL filter (HeroUI Select with counts)
- [x] Multi-filter system (Bias, Credibility, Factual, Country, Media Type, Source URL)
- [x] File inventory & architecture documentation (`context.md` expanded)
- [~] Disclaimer surfacing for Questionable sources (logic present, UI text pending)

Scoring & Signals
- [x] Initial MBFCSignal integration (URL extraction + lookup)
- [x] Combined heuristic scoring (MBFC + comment sentiment engagement weighting)
- [ ] (Δ) Formal scoring function with tunable weights & calibration dataset

DX / Docs
- [x] Centralized living architecture doc (this file)
 - [x] (Δ) Makefile automation targets implemented (see Makefile Automation Summary)
- [ ] (Δ) Add Jest test harness (unit tests for domain matching)

Security / Ops
- [ ] (Δ) Structured logging (pino) + request correlation
- [ ] (Δ) Graceful shutdown for DB pool

### Phase 2: Signal Expansion & Foundational Intelligence (IN PROGRESS)
Signals
- [~] RedditCommentSignal (heuristic implemented; AI stance classification pending)
- [ ] (Δ) Comment body extraction/cleaning (current raw JSON -> text) feeding sentiment model
- [ ] (Δ) Basic sentiment + political entity extraction pipeline
 - [ ] (Δ) Exclusive Comment Browsing UI (single expanded comment thread at a time)
 - [ ] (Δ) Comment metadata inspection panel (author flair, awards, score trajectory)
 - [ ] (Δ) Global openCommentPermalink state + auto-collapse others

AI / NLP Pipeline
- [ ] DeepSeek → OpenAI → HuggingFace fallback strategy abstraction
- [ ] Prompt templates versioned & parameterized
- [ ] (Δ) Caching of AI responses (content hash -> response)

Scoring & Aggregation
- [x] Replace static overallScore with weighted combination (implicit engagement weighting)
- [ ] Introduce tunable weights (alpha_MBFC, alpha_comments)
- [ ] Confidence metric derived from signal agreement & volume (current heuristic based on sample count)

Frontend Enhancements
- [ ] UI disclaimer component (Questionable heuristic transparency)
- [ ] (Δ) Comment sentiment badges inline on cards
- [ ] (Δ) Loading skeletons for OG images & comments
 - [ ] (Δ) Collapse-others logic wired to exclusive comment browsing
 - [ ] (Δ) Dev-only raw comment JSON viewer toggle

Storage
- [ ] Persist MBFC lookup results (avoid re-querying same domain per day)
- [ ] (Δ) Table for cached AI analyses keyed by permalink/hash
 - [ ] (Δ) Lightweight local cache layer for per-session comment metadata parsing

Infra / DevEx
- [ ] Implement Makefile targets (deploy, db-export/import, logs, prune)
- [ ] (Δ) GitHub Actions CI (lint + minimal tests)
- [ ] (Δ) Basic rate limiting (middleware + NGINX burst config)

### Phase 3: Multi-Platform & Advanced Metrics
Signals
- [ ] ImageSignal (OCR + meme / manipulation heuristics)
- [ ] (Δ) Cross-platform link correlation (shared URL graph)
- [ ] (Δ) Emerging Platform placeholders (Instagram, X) interface contracts

Advanced Metrics
- [ ] Credibility metric decoupled from left/right axis
- [ ] Authoritarian vs Libertarian dimension (political compass extension)
- [ ] (Δ) Economic Left/Right dimension
- [ ] Source volume weighting normalization (avoid dominance by prolific domains)

Storage & Analytics
- [ ] Historical trend persistence (daily rollups per community)
- [ ] (Δ) Aggregated bias volatility metric
- [ ] (Δ) Materialized views for dashboard queries

Scoring Evolution
- [ ] Adaptive weight tuning (grid search or Bayesian optimization on labeled set)
- [ ] (Δ) User feedback loop (crowd-sourced validation / corrections)

Infra / Observability
- [ ] Structured logging + log shipping
- [ ] Metrics: bias computation latency, cache hit ratio, API error rates
- [ ] (Δ) OpenTelemetry tracing (span around each signal pipeline)

Auth / Access
- [ ] API key gating for backend endpoints
- [ ] (Δ) Session-less signed request tokens for limited public demo
- [ ] (Δ) Role-based feature flags (admin vs public)

### Phase 4: Production Hardening & Scale
- [ ] Horizontal scaling (container replicas + load balancing)
- [ ] Read replica / caching layer (Redis) for hot domain + comment lookups
- [ ] CDN for static + OG images
- [ ] (Δ) Auto backfill jobs (scheduled re-analysis of watched communities)
- [ ] (Δ) Incident playbooks & SLO definitions

### Phase 5: Intelligence & Feedback Loops
- [ ] Active learning loop (flag low-confidence outputs for review)
- [ ] Model retraining dataset assembly pipeline
- [ ] (Δ) Anomaly detection (sudden bias swings alerting)
- [ ] (Δ) User-driven corrections UI feeding ground truth store

### Cross-Cutting (Ongoing)
- [~] Accessibility & theme support (dark/light partially scaffolded via Tailwind)
- [ ] Performance budget (bundle size, LCP targets) & monitoring
- [ ] Security hardening (dependency scanning, secret rotation)
- [ ] Documentation freshness audits (quarterly)

### Makefile Automation Summary
Target | Purpose
-------|--------
`dev` | Start all services with build
`dev-logs` | Tail logs for all services
`db-reset` | Recreate MySQL container & volume (fresh state)
`db-fetch-mbfc` | Fetch refreshed MBFC dataset via backend script
`db-load-mbfc` | Run migrations & seed MBFC data
`db-setup` | Full DB reset + backend up + migrations + seed
`db-update` | Fetch then load MBFC dataset (refresh path)
`setup` | One-shot environment bring-up & seed
`db-export` | Dump DB to backup.sql
`db-import` | Restore DB from backup.sql
`deploy-local` | Local rebuild & detached run
`deploy-production` | Remote compose up (placeholder credentials)
`nginx-test` | Validate NGINX configuration
`nginx-reload` | Reload NGINX service
`clean` | Down + prune volumes/images
`health` | Basic service availability checks
`mysql-shell` | Interactive MySQL shell w/ env creds
`backend-reload` | Rebuild & restart backend only
`help` | List make targets with descriptions

Planned Additions:
- `ci` (lint + typecheck + unit tests)
- `analyze-bundle` (Next.js bundle analyzer run)
- `perf-sample` (synthetic request load to /api/analyze)

---

## 💾 MBFC JSON Format (Database Source)

The included `mbfc-dataset-2025-08-05.json` contains MBFC records structured like this:

```json
[
  {
    "Source": "Sky News",
    "MBFC URL": "https://mediabiasfactcheck.com/sky-news/",
    "Bias": "Least Biased",
    "Country": "United Kingdom", 
    "Factual Reporting": "High",
    "Media Type": "TV Station",
    "Source URL": "news.sky.com",
    "Credibility": "High",
    "Source ID#": 100684
  }
]
```

This JSON is parsed and loaded into MySQL via a TypeORM seeding script.

---

## 🌐 NGINX Reverse Proxy

Create `/etc/nginx/sites-available/socialmediabias`:

```nginx
server {
    listen 80;
    server_name smb.rami-abdelal.co.uk;

    location / {
        proxy_pass http://localhost:9005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
  proxy_pass http://localhost:9006/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
  # Important for Server-Sent Events (SSE)
  proxy_buffering off;
  chunked_transfer_encoding on;
  proxy_read_timeout 3600s;
  add_header X-Accel-Buffering no;
    }
}
```

Enable with:
```bash
sudo ln -s /etc/nginx/sites-available/socialmediabias /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 Progressive Streaming (SSE) Flow

Endpoint: `GET /api/analyze/stream?redditUrl=https://www.reddit.com/r/<subreddit>`

Phases emitted as SSE events:
- `reddit`: Initial batch of subreddit top posts (title, url, permalink, author, score). Enables UI to render quickly.
- `mbfc`: MBFC lookup results for extracted external URLs. Includes `biasBreakdown`, `details`, and a provisional `overallScore` placeholder.
- `discussion`: Repeated event as we analyze up to 10 candidate posts in batches of 2. Each emit contains `discussionSignal` (samples, leanRaw, leanNormalized, label), updated `overallScore`, and `progress { done, total }`.
- `done`: Terminal event indicating completion.
- `error`: If an unrecoverable error occurs, emits `{ message }` then stream closes.

Notes:
- Phase C (discussion) runs even when MBFC yields zero matches; in that case the AI prompt is anchored toward the POST TITLE and uses comment bodies + title for stance classification.
- Confidence for the combined score scales with sample count, capped at 0.95.

### Reddit API Backoff & Rate Limit Handling
- Comment fetches use OAuth with 10s request timeout and exponential backoff with jitter on errors.
- Specifically handles:
  - HTTP 429 or `x-ratelimit-remaining <= 1`: waits for `x-ratelimit-reset` seconds when present, otherwise uses exponential backoff.
  - HTTP 5xx: retried with backoff up to 4 additional attempts.
  - Network/abort errors: retried with backoff up to 4 additional attempts.
- Concurrency: small fixed pool (3) with 100–300ms jitter between tasks to smooth burstiness.

### Client Consumption
- The client uses `EventSource` to consume events and updates UI phases: “Analyzing…”, “Digging deeper… (n/10)”, then ready.
- `SubredditResults.tsx` renders progressively; `AnalysisContext` merges incoming partials.

### Proxy Requirements (SSE)
- Ensure NGINX disables buffering for the API location handling SSE, or set `X-Accel-Buffering: no` upstream (we do both as belt-and-suspenders).
- Long `proxy_read_timeout` avoids idle disconnects during long-running analyses.

## 🛠️ Makefile Automation (To Be Implemented)

Create a `Makefile` with these targets:

```makefile
# Database operations
db-export:
  docker exec mysql mysqldump -u root -p$(MYSQL_ROOT_PASSWORD) $(MYSQL_DATABASE) > backup.sql

db-import:
  docker exec -i mysql mysql -u root -p$(MYSQL_ROOT_PASSWORD) $(MYSQL_DATABASE) < backup.sql

# Deployment
deploy-local:
  docker-compose up -d --build

deploy-production:
  ssh user@server "cd /path/to/project && docker-compose up -d --build"

# NGINX
nginx-test:
  sudo nginx -t

nginx-reload:
  sudo systemctl reload nginx

# Development
dev:
  docker-compose up --build

logs:
  docker-compose logs -f

clean:
  docker-compose down -v
  docker system prune -f
```

---

## ✅ Reproducibility Goal

By combining:

- `.env` for environment-specific variables
- `docker-compose.yml` for orchestration  
- `Makefile` for automation
- `nginx.conf` for networking
- `mbfc-dataset-2025-08-05.json` for data
- Domain-driven design for extensibility

...this project is fully reproducible across local and VPS deployments with consistent behavior, environment-specific routing, traceable DB change history, and scalable architecture for future social media platforms.

---

## 🎯 Next Steps

1. **Domain Core**: Implement minimal bias scoring and result logic in plain JS (no interfaces/classes, no ORM)
2. **MBFCSignal**: Ensure URL extraction and MBFC database integration works in `/app/mbfc-signal.js` (using `mysql2` direct queries)
3. **Database Schema**: Ensure MySQL tables for MBFC data exist and are loaded (no ORM, just SQL)
4. **Basic Frontend**: Create social media input form and bias display
5. **RedditCommentSignal**: Implement Reddit API integration with DeepSeek analysis (future)