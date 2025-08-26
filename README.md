
# Social Media Political Bias Analyzer

Bias analysis for social media communities (MVP: Reddit) using media source link bias (MBFC) plus an extensible signal model (future: comments sentiment, images, cross‑platform). Current implementation focuses on MBFC link analysis with incremental UX + data plumbing to enable upcoming AI-driven signals.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 22+ (for local development)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd socialmediabias

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start the application (production build)
docker-compose up --build

# Development workflow
## Frontend (Next.js)
To develop the frontend (hot reload, port 3000):
```

```bash
cd frontend
npm install
npm run dev
```
This starts the Next.js dev server at http://localhost:3000 (separate from the Docker production port mapping 9005).

After changes, confirm the production build (optimized) via the container at http://localhost:9005 by rebuilding:
```bash
docker compose up frontend -d --build
```

## Backend (Express)
The backend runs on [http://localhost:9006](http://localhost:9006) (via Docker Compose or `npm run dev` in the backend folder).

## Production
Production builds run the frontend on port 9005 (http://localhost:9005) and the backend on port 9006.

## 🏗️ Architecture (Current vs Planned)

Current MVP (implemented):
- Thin Express backend: fetch subreddit posts (OAuth), extract external URLs, look up MBFC bias & related metadata (bias, credibility, factual reporting, media type, country) via MySQL.
- Next.js frontend (App Router): orchestrates request, merges Reddit posts + MBFC rows into displayable "RedditSignal" cards.
- On-demand enhancements: per-link OG image fetch, lazy single-comment-thread fetch (click to load), dynamic multi-attribute filtering.
- Documentation: `context.md` acts as canonical architecture & roadmap source (see it for complete domain model). 

Planned domain abstractions (future phases):
- Formal `SignalResult` aggregation pipeline (multi-signal weighting).
- Comment sentiment inference (DeepSeek → OpenAI → HuggingFace fallback) feeding dynamic bias confidence.
- Image / cross-platform signals and historical trend storage.

Key Data Objects (pragmatic forms):
- `MBFCDetail` (row from mbfc_sources table).
- `RedditPost` (subset of Reddit API response fields + permalink).
- `RedditSignal` (merged view keyed by resolved external URL).
- `AnalysisResult` (overall summary + collections; currently partially populated).

For full schema & evolution roadmap, consult `context.md`.

### Implemented Signal
1. **MBFCSignal (MVP)**
  - Extracts outbound URLs from top Reddit posts
  - Normalizes domains (handles subdomain & suffix variations)
  - Joins with MBFC dataset to surface bias, credibility, factual rating
  - Provides counts for breakdown & filtering

### Upcoming Signals
2. **RedditCommentSignal** (Planned)
  - Thread fetch on-demand → sentiment & ideological tone extraction
3. **ImageSignal** (Planned)
  - OCR + fact-check heuristics / external corroboration

### Request / Display Flow
1. User enters subreddit and triggers analyze
2. Backend returns posts + MBFC matches + bias breakdown
3. Frontend merges dataset → builds filter option sets (Bias, Credibility, Factual, Country, Media Type, Source URL)
4. User optionally loads OG image previews & a single comment thread per card (lazy)
5. Future: aggregated multi-signal scoring & confidence updates dynamically

### On-Demand Comment Loading (Current Behavior)
- Button on each relevant card fetches `/api/reddit-comment?permalink=...`
- Stores raw JSON in state keyed by permalink (null=loading, ''=error, object=loaded)
- Planned: exclusive open thread (auto-collapse others), extracted structured metadata panel, sentiment summarization.

## 📁 Project Structure (Concise)

```
socialmediabias/
├── frontend/
│   ├── .gitignore
│   ├── Dockerfile
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package-lock.json.backup
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── README.md
│   ├── tsconfig.json
│   ├── .next/
│   ├── public/
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   ├── src/
│   │   ├── app/
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── page.tsx
│   │   │   └── reddit/
│   │   │       └── r/
│   │   │           └── [subreddit]/
│   │   │               └── page.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Menu.tsx
│   │   │   └── SubredditResults.tsx
│   │   ├── context/
│   │   │   └── AnalysisContext.tsx
│   │   └── lib/
│   │       └── popularSubreddits.js
│   └── ... # Build, config, and cache files
├── backend/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── app/
│       ├── index.js
│       ├── mbfc-signal.js
│       └── signal/
│           ├── image.js
│           ├── mbfc.js
│           ├── reddit-discussion.js
│           ├── reddit-image.js
│           ├── reddit-link.js
│           ├── reddit-text.js
│           └── ...
├── database/
│   ├── init.sql
│   └── mbfc-current.json
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── mbfc-dataset-2025-08-05.json
├── .gitignore
├── README.md
├── Makefile
└── prompt.md
```

## 🔧 Development

### Makefile Targets (Summary)
```bash
make dev            # Start all services (build if needed)
make dev-logs       # Follow service logs
make setup          # Full environment bring-up + migrations + seed
make db-reset       # Fresh MySQL (drops volume)
make db-fetch-mbfc  # Fetch latest MBFC dataset (backend script)
make db-load-mbfc   # Run migrations + seed MBFC data
make db-update      # Fetch + load updated MBFC dataset
make db-export      # Dump database -> backup.sql
make db-import      # Import backup.sql
make mysql-shell    # Open MySQL shell using env credentials
make backend-reload # Rebuild/restart backend only
make deploy-local   # Rebuild & run detached
make clean          # Remove containers + volumes (prune)
make health         # Basic availability checks
make help           # Show all targets
```
Planned additions: `ci` (lint/test), `analyze-bundle`, `perf-sample`.

### Environment Variables
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

# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=mbfc
MYSQL_USER=mbfc_user
MYSQL_PASSWORD=mbfc_pass
```

## 🎯 Feature Snapshot

Implemented:
- MBFC link bias detection (domain normalization + metadata)
- Bias breakdown & multi-attribute filtering (Bias, Credibility, Factual, Country, Media Type, Source URL with counts)
- Lazy OG image fetching per external link
- Lazy per-card comment thread fetch (debug/raw view groundwork)
- `RedditSignalCard` componentization (clean separation of concerns)
- Dockerized full stack + Makefile automation
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

## 📊 API Endpoints (MVP)

### POST /api/analyze
Analyze a social media community for political bias.

**Request:**
```json
{
  "communityName": "politics",
  "platform": "reddit"
}
```

Key route (backend): `POST /api/analyze`
Returns JSON with subreddit posts, MBFC matched details, and bias breakdown (overall score currently placeholder). See `context.md` for the evolving `AnalysisResult` contract.

Internal frontend API routes:
- `GET /api/og-image?url=` – Extract OG image meta
- `GET /api/reddit-comment?permalink=` – Fetch raw Reddit thread JSON (lazy)

Example (truncated) Response:
```json
{
  "communityName": "politics",
  "platform": "reddit",
  "biasBreakdown": {"Least Biased": 5, "Left-Center": 3},
  "details": [{"source_url": "bbc.com", "bias": "Least Biased"}],
  "redditPosts": [{"id": "abc123", "permalink": "/r/politics/..."}],
  "overallScore": {"score": 5.0, "label": "center", "confidence": 0.5}
}
```

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
- DeepSeek, OpenAI, HuggingFace (planned sentiment/LLM pipeline)

---
For deeper architectural details, open `context.md` (single source of truth). Keep README concise; extend context instead of duplicating here.
