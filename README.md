
# Social Media Political Bias Analyzer

A domain-driven web application that analyzes political bias in social media communities using multiple signals including media source bias detection and AI-powered sentiment analysis.

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
To develop the frontend, run:

```bash
cd frontend
npm install
npm run dev
```
This will start the Next.js dev server at [http://localhost:3000](http://localhost:3000).

Be sure to test that the production build on [http://localhost:9005](http://localhost:9005) is working correctly after development before committing any changes by restarting the frontend Docker container (which will recompile the Next.js production build using ```npm run build```) with ```docker compose up frontend -d --build```

## Backend (Express)
The backend runs on [http://localhost:9006](http://localhost:9006) (via Docker Compose or `npm run dev` in the backend folder).

## Production
Production builds run the frontend on port 9005 (http://localhost:9005) and the backend on port 9006.
```

## 🏗️ Architecture

### Domain-Driven Design
- **BiasAnalyzer**: Main orchestrator that combines multiple signals
- **Signal Interface**: Abstract base for all bias detection signals
- **BiasScore**: Value object representing 0-10 bias scale with confidence
- **AnalysisResult**: Aggregate result with breakdown by signal type

### Signal Implementations
1. **MBFCSignal**: Media source bias detection
   - Extracts URLs from social media posts
   - Queries MBFC database for source bias ratings
   - Aggregates weighted bias scores

2. **RedditCommentSignal**: Community sentiment analysis (Future)
   - Fetches comment chains from Reddit API
   - Sends to AI models (DeepSeek → OpenAI → HuggingFace)
   - Analyzes political sentiment and community tone

3. **ImageSignal**: Visual content credibility (Future)
   - Extracts images from posts
   - Cross-references with fact-checking sources

socialmediabias/
## 📁 Project Structure

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

### Available Commands
```bash
# Development
make dev          # Start development environment
make dev-logs     # Show development logs

# Database
make db-reset     # Reset database
make db-export    # Export database to backup.sql
make db-import    # Import database from backup.sql

# Deployment
make deploy-local # Deploy locally
make clean        # Clean up containers and images
make health       # Check service health
make help         # Show all commands
```

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

## 🎯 MVP Features

### ✅ Implemented
- Domain-driven architecture with signal-based bias detection
- MBFCSignal for media source bias analysis
- MySQL database with MBFC dataset integration
- Next.js frontend with bias analysis UI
- Docker Compose deployment
- RESTful API with CORS support

### 🚧 In Progress
- RedditCommentSignal with AI sentiment analysis
- Real Reddit API integration
- Advanced bias scoring algorithms

### 🔮 Future Features
- Instagram and X (Twitter) platform support
- ImageSignal for visual content analysis
- Advanced metrics (Credibility, Demographics, etc.)
- Production NGINX configuration
- Performance monitoring and caching

## 📊 API Endpoints

### POST /api/analyze
Analyze a social media community for political bias.

**Request:**
```json
{
  "communityName": "politics",
  "platform": "reddit"
}
```

**Response:**
```json
{
  "communityName": "politics",
  "platform": "reddit",
  "overallScore": {
    "score": 6.2,
    "confidence": 0.8,
    "label": "center-right"
  },
  "signalResults": [
    {
      "signalType": "MBFCSignal",
      "score": {
        "score": 6.2,
        "confidence": 0.8,
        "label": "center-right"
      },
      "summary": "Analyzed 3 media sources from politics",
      "examples": ["news.sky.com", "bbc.com", "foxnews.com"]
    }
  ],
  "analysisDate": "2024-01-15T10:30:00.000Z"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Media Bias Fact Check (MBFC) for the bias dataset
- Reddit for API access
- DeepSeek, OpenAI, and HuggingFace for AI capabilities
