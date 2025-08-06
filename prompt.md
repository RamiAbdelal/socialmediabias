# 🧠 Subreddit Political Bias Analyzer

## 📝 User Story

As a politically curious user,  
I want a small web application built with **Next.js** and **TypeScript**  
So that I can enter a subreddit name and view an analysis of whether that subreddit leans left or right on a scale from 0 (far-left) to 10 (far-right).

---

## ✅ Acceptance Criteria

| Category                    | Details |
|----------------------------|---------|
| **Frontend**               | Next.js 14+ App Router, TailwindCSS |
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
|                            | Prompt: “Given this conversation, what is the political leaning and tone of the community?” |
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

## 📂 Folder Structure

```
.
├── backend/
├── frontend/
├── database/
│   └── init.sql
├── .env
├── docker-compose.yml
├── nginx.conf
├── Makefile
```

---

## 🔐 .env Configuration

```env
# Environment
ENVIRONMENT=LOCAL
SITE_URL=http://localhost:9005
DOCKER_PORT_FRONTEND=9005
DOCKER_PORT_BACKEND=9006

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

## 📦 `docker-compose.yml` Summary

- Frontend container (Next.js) runs on `${DOCKER_PORT_FRONTEND}`
- Backend container (Node.js API) runs on `${DOCKER_PORT_BACKEND}`
- MySQL container with volume and `init.sql` seeding
- All secrets and URLs pulled from `.env`

---

## 🌐 NGINX Reverse Proxy

Located at: `/etc/nginx/sites-available/socialmediabias`

Symlink it:
```bash
sudo ln -s /etc/nginx/sites-available/socialmediabias /etc/nginx/sites-enabled/
```

Use `make restart-server` to validate and reload config.

---

## 🛠️ Makefile Automation

Your project includes a `Makefile` to manage:

- Exporting + zipping MySQL DB
- Uploading DB dumps to VPS
- Importing dumps with optional search-replace
- Restarting and pruning Docker services
- NGINX validation and reloads
- `.gitignore` enforcement for SQL/zip outputs

All URL rewrites and deployment targets are pulled from `.env`.

---

## 💾 MBFC JSON Format (Database Source)

MBFC records should be structured like this (stored in MySQL):

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

This JSON will be parsed and loaded into a normalized table in `init.sql`.

---

## ✅ Reproducibility Goal

By combining:

- `.env` for environment-specific variables
- `docker-compose.yml` for orchestration
- `Makefile` for automation
- `nginx.conf` for networking

...this project is fully reproducible across local and VPS deployments with consistent behavior, environment-specific routing, and traceable DB change history.