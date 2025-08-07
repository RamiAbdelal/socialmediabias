# 🧠 Subreddit Political Bias Analyzer

## 📝 User Story

As a politically curious user,  
I want a small web application built with **Next.js** and **TypeScript**  
So that I can enter a subreddit name and view an analysis of whether that subreddit leans left or right on a scale from 0 (far-left) to 10 (far-right).

---

## ✅ Acceptance Criteria

| Category                    | Details |
|----------------------------|---------|
| **Frontend**               | Next.js 15+ App Router, TailwindCSS v4 |
|                            | Input for subreddit name |
|                            | Displays: bias score (0–10), label (e.g., "center-left") |
|                            | Shows: source breakdown, comment examples, DeepSeek summaries |
| **Backend**                | Node.js API routes with TypeScript |
| **Reddit API Integration** | Fetch top 50 posts from the last 30 days |
|                            | Extract: top, controversial, and comment chains |
|                            | Use Reddit OAuth for extended rate limits |
| **Bias Detection**         | Query MBFC (via cached dataset or scraping) |
|                            | Aggregate source bias from external links |
|                            | MBFC data stored in MySQL, loaded from JSON array |
| **Community Attitude**     | Send comment chains to DeepSeek |
|                            | Prompt: "Given this conversation, what is the political leaning and tone of the community?" |
|                            | Get bias score + summary |
| **Bias Score Logic**       | Combine source bias + comment bias |
|                            | Normalize to a 0–10 score with optional confidence estimate |
| **Results UI**             | Visual scale (0–10), primary sources, comment summaries |
| **DevOps**                 | Local (WSL2) and Production (Ubuntu 22 VPS) deployment via Docker Compose |
|                            | NGINX reverse proxy at `/etc/nginx/sites-available/socialmediabias` (symlinked to sites-enabled) |
|                            | Port convention: 9005+ for this app, frontend on 9005, backend on 9006 |
|                            | All configuration managed from `.env` file |
| **Automation**             | Reproducible with Makefile scripts for: DB export/import, NGINX testing, server deploys |

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
├── backend/                    # Express.js + TypeScript
│   ├── src/
│   │   └── index.ts           # Basic Express server (needs implementation)
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

The updated prompt now reflects:

1. **Current project structure** with actual implemented components
2. **Real file locations** and configurations
3. **Implementation status** showing what's completed vs. what needs work
4. **Detailed setup guide** for both development and production
5. **Actual MBFC dataset** that's included in the project
6. **Current Docker configurations** with proper port mappings
7. **Technology versions** (Next.js 15.4.5, React 19.1.0, etc.)
8. **Missing components** that need to be implemented

This serves as a comprehensive living brief that accurately represents the current state of your project and provides clear guidance for next steps.

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

# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_key

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
git clone <repository-url>
cd socialmediabias

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

## 🔧 Implementation Status

### ✅ Completed
- [x] Project structure with Docker Compose
- [x] Frontend: Next.js 15.4.5 + TypeScript + TailwindCSS v4
- [x] Backend: Express.js + TypeScript setup
- [x] Multi-stage Docker builds for both services
- [x] MySQL service with volume persistence
- [x] Environment variable configuration
- [x] MBFC dataset (3.1MB JSON file)

### 🚧 In Progress / Needs Implementation
- [ ] Frontend: Subreddit input form and bias analysis UI
- [ ] Backend: Reddit API integration and bias analysis logic
- [ ] Database: MySQL schema and MBFC data loading
- [ ] NGINX: Reverse proxy configuration
- [ ] Makefile: Automation scripts for deployment
- [ ] README.md: Project documentation

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

...this project is fully reproducible across local and VPS deployments with consistent behavior, environment-specific routing, and traceable DB change history.

---

## 🎯 Next Steps

1. **Implement Frontend**: Create subreddit input form and bias analysis display
2. **Implement Backend**: Add Reddit API integration and bias analysis endpoints
3. **Setup Database**: Create MySQL schema and load MBFC data
4. **Configure NGINX**: Set up reverse proxy configuration
5. **Create Makefile**: Add automation scripts for deployment
6. **Documentation**: Complete README.md with setup instructions