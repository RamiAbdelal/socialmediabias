# Social Media Political Bias Analyzer

Bias analysis for social media communities (MVP: Reddit) using media source link bias (MBFC) plus an extensible signal model (future: comments sentiment, images, cross‑platform). Current implementation focuses on MBFC link analysis with incremental UX + data plumbing to enable upcoming AI-driven signals.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 22+ (for local development)

### Setup (containers)
```bash
# Clone the repository
git clone <repository-url>
cd socialmediabias

# Create environment file
cp .env.example .env
# Edit .env with your MySQL creds + Reddit keys (AI keys optional)

# Start services
docker compose up -d --build

# Initialize DB schema and ingest MBFC dataset
make db-seed

# (Optional) Apply schema changes via Drizzle CLI (from frontend/)
cd frontend
npm install
npm run db:migrate

# App is now available
echo http://localhost:9005
```

### Local development (Next.js dev server)
```bash
cd frontend
npm install
npm run dev
```
Dev server runs at http://localhost:3000.

Important: for local dev, configure DB host to your machine, not the container DNS.
Create `frontend/.env.local` with at least:
```env
MYSQL_HOST=127.0.0.1
MYSQL_USER=mbfc_user
MYSQL_PASSWORD=mbfc_pass
MYSQL_DATABASE=mbfc
DEEPSEEK_API_KEY=your_deepseek_key   # optional
OPENAI_API_KEY=your_openai_key       # optional
# Redis (required for caching). In Docker it's redis://redis:6379
# REDIS_URL=redis://127.0.0.1:6379
```

Rebuild the containerized app (served at http://localhost:9005):
```bash
docker compose up -d --build frontend
```

## Production
Production runs the Next.js app on port 9005 (http://localhost:9005). NGINX is recommended for TLS and SSE passthrough. See `nginx/nginx.conf` and `context.md` for proxy settings.

## 🏗️ Architecture (Current vs Planned)

Current MVP (implemented):
- Next.js (App Router) only: server API routes handle all backend logic.
- SSE streaming pipeline at `/api/analyze/stream` with phases: `reddit` → `mbfc` → `discussion` → `done` (and `error`).
- MySQL 8 stores MBFC data. Import via streaming Node script and Makefile.
- Summary persistence: per-run row saved to `analysis_results`; AI response caching persisted to `ai_results`.
- On-demand endpoints: OG image fetch, Reddit thread fetch.
- Documentation: `context.md` is the canonical architecture & operations doc.

Planned domain abstractions (future phases):
- Formal `SignalResult` aggregation pipeline (multi-signal weighting).
- Comment sentiment inference (DeepSeek → OpenAI fallback) feeding dynamic bias confidence.
- Image / cross-platform signals and historical trend storage.

Key Data Objects (pragmatic forms):
- `MBFCDetail` (row from mbfc_sources table).
- `RedditPost` (subset of Reddit API response fields + permalink).
- `RedditSignal` (merged view keyed by resolved external URL).
- `AnalysisResult` (overall summary + collections; streamed progressively).

### Implemented Signals
1. **MBFCSignal (MVP)**
  - Extracts outbound URLs from top Reddit posts
  - Normalizes domains (handles subdomain & suffix variations)
  - Joins with MBFC dataset to surface bias, credibility, factual rating
  - Provides counts for breakdown & filtering

2. **Discussion (batched)**
  - Fetches top-level comments for a small set of posts
  - Heuristic sentiment baseline; optional AI sentiment if keys are present
  - Streams progressive overall score updates

### Upcoming Signals
3. **ImageSignal** (Planned)
  - OCR + fact-check heuristics / external corroboration

### Request / Display Flow
1. User enters subreddit → `GET /api/analyze/stream?redditUrl=...`
2. SSE events stream in phases: `reddit`, `mbfc`, `discussion`, then `done`
3. Client merges events into state and renders progressively
4. Optional: per-card OG image fetch and comment thread fetch

### On-Demand Comment Loading (Current Behavior)
- Button on each relevant card fetches `/api/reddit-comment?permalink=...`
- Stores raw JSON in state keyed by permalink (null=loading, ''=error, object=loaded)
- Planned: exclusive open thread (auto-collapse others), extracted structured metadata panel, sentiment summarization.

## 📁 Project Structure (Concise)

```text
socialmediabias/
├── context.md
├── docker-compose.yml
├── env.example
├── Makefile
├── nginx/
│   └── nginx.conf
├── database/
│   ├── init.sql
│   └── mbfc-current.json
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── public/
│   ├── scripts/
│   │   └── ingest-mbfc.mjs
│   └── src/
│       ├── app/
│       │   ├── api/
│       │   │   ├── analyze/
│       │   │   │   └── stream/route.ts
│       │   │   ├── reddit-comment/route.ts
│       │   │   └── og-image/route.ts
│       │   ├── reddit/r/[subreddit]/page.tsx
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── Menu.tsx
│       │   ├── RedditPostsSection.tsx
│       │   ├── RedditSignalCard.tsx
│       │   └── SubredditResults.tsx
│       ├── context/
│       │   ├── AnalysisContext.tsx
│       │   └── HeroUIProvider.tsx
│       └── lib/
│           ├── popularSubreddits.js
│           ├── types.ts
│           └── utils.ts
└── README.md
```

## 🔧 Development

### Makefile Targets (Summary)
```bash
make dev             # Start all services (build if needed)
make dev-logs        # Follow service logs
make setup           # Bring up services and apply schema (no ingest)
make db-init         # Apply schema from database/init.sql
make db-ingest-mbfc  # Ingest MBFC JSON via importer script
make db-seed         # Schema + MBFC ingest
make db-reset        # Reset MySQL volume and restart mysql
make db-export       # Dump database -> backup.sql
make db-import       # Import backup.sql
make mysql-shell     # Open MySQL shell using env credentials
make deploy-local    # Rebuild & run detached
make nginx-test      # Test NGINX config
make nginx-reload    # Reload NGINX
make clean           # Remove containers + volumes
make health          # Basic availability checks
make help            # Show all targets
```
Note: `backend-reload` is a no-op (kept for compatibility).

### Environment Variables
Create a `.env` file in the root directory (used by Docker Compose):

```env
# Environment
ENVIRONMENT=LOCAL
SITE_URL=http://localhost:9005
DOCKER_PORT_FRONTEND=9005

# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_SECRET=your_reddit_secret
REDDIT_USER_AGENT=your_user_agent

# AI Models
DEEPSEEK_API_KEY=your_deepseek_key
OPENAI_API_KEY=your_openai_key

# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=mbfc
MYSQL_USER=mbfc_user
MYSQL_PASSWORD=mbfc_pass

# Redis (optional, used in Docker by default)
REDIS_URL=redis://redis:6379
```

## 🎯 Feature Snapshot

Implemented:
- MBFC link bias detection (domain normalization + metadata)
- Bias breakdown & multi-attribute filtering (Bias, Credibility, Factual, Country, Media Type, Source URL with counts)
- Lazy OG image fetching per external link
- Lazy per-card comment thread fetch (debug/raw view groundwork)
- `RedditSignalCard` componentization (clean separation of concerns)
- Dockerized full stack + Makefile automation
- SSE streaming with backoff/jitter; NGINX SSE passthrough
- Expanded living architecture doc (`context.md`)

In Progress / Planned (next):
- Exclusive comment browsing (single open thread)
- Comment metadata extraction & sentiment scoring
- Weighted multi-signal scoring + confidence calculation
- Caching (domain lookups, AI responses)
- Disclaimer component for "Questionable" heuristic

Future / Later Phases:
- Comment & image signals with AI classification
- Historical trend persistence & volatility measures
- Multi-platform (Instagram / X) & cross-domain correlation
- Advanced metrics: Credibility (decoupled), Authoritarian–Libertarian, Economic axis
- Observability: structured logging, metrics, tracing

Persistence & caching snapshot:
- MySQL stores MBFC dataset (`mbfc_sources`) and analysis summaries (`analysis_results`).
- `ai_results` caches AI responses by input hash (provider/model + stance/alignment fields).
- Redis is required for caching discussion results and AI responses (set `REDIS_URL`).

## 📊 API Endpoints (MVP)

### GET /api/analyze/stream
Server-Sent Events (SSE) endpoint. Query: `redditUrl=https://www.reddit.com/r/<subreddit>/...`

Emitted events:
- `reddit`: initial post list
- `mbfc`: MBFC breakdown and details
- `discussion`: progressive discussion samples + overall score
- `done`: terminal event
- `error`: error payload

Other endpoints:
- `GET /api/og-image?url=` – Extract OG image meta
- `GET /api/reddit-comment?permalink=` – Fetch raw Reddit thread JSON (lazy)

## 🛣️ Roadmap (Condensed)
Phases:
1. Core MBFC MVP (DONE / hardening)
2. Comment Sentiment & Scoring (NEXT)
3. Multi-Signal + Advanced Metrics
4. Platform Expansion & Historical Analytics
5. Intelligence & Feedback Loops

See `context.md` for full granular task list (statuses, Δ new items, partials).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Media Bias Fact Check (MBFC)
- Reddit API
- DeepSeek, OpenAI (sentiment/LLM pipeline)

---
For deeper architectural details, open `context.md` (single source of truth). Keep README concise; extend context instead of duplicating here.
