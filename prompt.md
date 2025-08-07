# 🧠 Social Media Political Bias Analyzer

This prompt should act as a living brief, specification document, setup guide, and roadmap. Update this prompt with any new changes and details reflected by new or modified files and folder structure so that it can continue acting as such.

## 📝 User Story

As a politically curious user who cares about impartiality,  
I want a lightweight but scalable and expandable domain driven designed web application built with **Next.js** and **TypeScript** that can estimate the political bias of social media applications and communities, such as Reddit subreddits, Instagram pages, and X profiles.

I want to be able to enter a social media community's name/URL, which will be a subreddit as an MVP, and view an analysis of whether that it leans left or right on a scale from 0 (far-left) to 10 (far-right) as an initial 'Core Metric' (including later perhaps Credibility, Demographics, Authoritarian vs Libertarian, Economy, etc...). 

Analyses will come from data which will be derived from 'Signals' that can be used for any potential social media app if supported.

Initial signal will be an MBFCSignal looking for links to other media websites and checking them against a Media Bias Fact Check (MBFC) sourced database.

Secondly a RedditCommentSignal using social media discussions either by scraping or querying their public APIs to understand the context of the discussion and the proportion and intensity of variables like interest in, approval of, political sentiment towards the source material. This can be done by querying the an AI model, initially DeepSeek Chat, then OpenAI but possibly a HuggingFace model I was told could better judge political sentiment.

Later an ImageSignal image searching a sample of image posts to check them for credibility, maybe against X posts with Community Notes suggesting lack of credibility, a Grok prompt, Snopes articles, or other sources like Google search.

---

## 🏗️ Domain-Driven Design Architecture

### Core Domain: Bias Analysis Engine
- **BiasAnalyzer**: Main orchestrator that combines multiple signals
- **Signal Interface**: Abstract base for all bias detection signals
- **BiasScore**: Value object representing 0-10 bias scale with confidence
- **AnalysisResult**: Aggregate result with breakdown by signal type

### Signal Implementations
1. **MBFCSignal**: Media source bias detection
   - Extracts URLs from social media posts
   - Queries MBFC database for source bias ratings
   - Aggregates weighted bias scores

2. **RedditCommentSignal**: Community sentiment analysis
   - Fetches comment chains from Reddit API
   - Sends to AI models (DeepSeek → OpenAI → HuggingFace)
   - Analyzes political sentiment and community tone

3. **ImageSignal**: Visual content credibility (Future)
   - Extracts images from posts
   - Cross-references with fact-checking sources
   - Community Notes, Snopes, Google search integration

### Social Media Platform Adapters
- **RedditAdapter**: MVP implementation
- **InstagramAdapter**: Future implementation  
- **XAdapter**: Future implementation
- **PlatformInterface**: Abstract base for platform-specific logic

---

## ✅ Acceptance Criteria

| Category                    | Details |
|----------------------------|---------|
| **Frontend**               | Next.js 15+ App Router, TailwindCSS v4 |
|                            | Input for social media community name/URL |
|                            | Displays: bias score (0–10), label (e.g., "center-left") |
|                            | Shows: signal breakdown, source examples, AI summaries |
|                            | Expandable UI for future metrics (Credibility, Demographics, etc.) |
| **Backend**                | Domain-driven Node.js API with TypeScript |
|                            | Signal-based architecture for extensibility |
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

## 📂 Current Project Structure

```
socialmediabias/
├── frontend/                    # Next.js 15.4.5 + TypeScript
│   ├── src/app/                # App Router structure
│   │   ├── page.tsx           # Main landing page (needs implementation)
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # TailwindCSS v4 styles
│   ├── Dockerfile             # Multi-stage build (Node 22 Alpine)
│   ├── package.json           # React 19.1.0, Next.js 15.4.5
│   └── tsconfig.json          # TypeScript configuration
├── backend/                    # Express.js + TypeScript + Domain Design
│   ├── src/
│   │   ├── domain/            # Domain-driven design core
│   │   │   ├── signals/       # Signal implementations
│   │   │   ├── platforms/     # Platform adapters
│   │   │   └── analysis/      # Bias analysis engine
│   │   ├── infrastructure/    # External integrations
│   │   └── index.ts           # Express server setup
│   ├── Dockerfile             # Multi-stage build (Node 22 Alpine)
│   ├── package.json           # Express 4.18.2, TypeScript
│   └── tsconfig.json          # TypeScript configuration
├── database/
│   └── init.sql               # MySQL initialization (empty - needs MBFC schema)
├── nginx/
│   └── nginx.conf             # NGINX configuration (empty - needs setup)
├── docker-compose.yml         # 3 services: frontend, backend, mysql
├── mbfc-dataset-2025-08-05.json  # MBFC dataset (3.1MB)
├── .gitignore                 # Root gitignore
├── README.md                  # Project documentation (empty)
├── Makefile                   # Automation scripts (empty)
└── prompt.md                  # This specification document
```

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

# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=mbfc
MYSQL_USER=mbfc_user
MYSQL_PASSWORD=mbfc_pass

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
# The MBFC dataset is already included: mbfc-dataset-2025-08-05.json
# Need to create init.sql to load this data into MySQL
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

## 🏗️ Domain Implementation Roadmap

### Phase 1: Core Infrastructure (Current)
- [x] Project structure with Docker Compose
- [x] Frontend: Next.js 15.4.5 + TypeScript + TailwindCSS v4
- [x] Backend: Express.js + TypeScript setup
- [x] Multi-stage Docker builds for both services
- [x] MySQL service with volume persistence
- [x] Environment variable configuration
- [x] MBFC dataset (3.1MB JSON file)

### Phase 2: Domain Core (Next)
- [ ] **Domain Models**: BiasScore, AnalysisResult, Signal interfaces
- [ ] **MBFCSignal**: URL extraction and MBFC database integration
- [ ] **Database Schema**: MySQL tables for MBFC data and analysis results
- [ ] **Basic Frontend**: Social media input form and bias display

### Phase 3: AI Integration
- [ ] **RedditCommentSignal**: Reddit API integration + DeepSeek analysis
- [ ] **AI Pipeline**: DeepSeek → OpenAI → HuggingFace fallback
- [ ] **Sentiment Analysis**: Political bias detection from comments
- [ ] **Signal Aggregation**: Weighted combination of MBFC + Comment signals

### Phase 4: Platform Expansion
- [ ] **InstagramAdapter**: Instagram API integration
- [ ] **XAdapter**: X/Twitter API integration
- [ ] **ImageSignal**: Visual content credibility analysis
- [ ] **Advanced Metrics**: Credibility, Demographics, Authoritarian/Libertarian

### Phase 5: Production & Scale
- [ ] **NGINX**: Reverse proxy configuration
- [ ] **Makefile**: Automation scripts for deployment
- [ ] **Documentation**: Complete README.md with setup instructions
- [ ] **Performance**: Caching, rate limiting, monitoring

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

This JSON needs to be parsed and loaded into a normalized MySQL table via `database/init.sql`.

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

1. **Domain Core**: Implement BiasScore, AnalysisResult, and Signal interfaces
2. **MBFCSignal**: Create URL extraction and MBFC database integration
3. **Database Schema**: Design MySQL tables for MBFC data and analysis results
4. **Basic Frontend**: Create social media input form and bias display
5. **RedditCommentSignal**: Implement Reddit API integration with DeepSeek analysis