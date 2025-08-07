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

# Start the application
docker-compose up --build

# Access the application
# Frontend: http://localhost:9005
# Backend: http://localhost:9006
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

## 📁 Project Structure

```
socialmediabias/
├── frontend/                    # Next.js 15.4.5 + TypeScript
│   ├── src/app/                # App Router structure
│   ├── Dockerfile              # Multi-stage build
│   └── package.json            # React 19.1.0, Next.js 15.4.5
├── backend/                    # Express.js + TypeScript + Domain Design
│   ├── src/
│   │   ├── domain/            # Domain-driven design core
│   │   │   ├── signals/       # Signal implementations
│   │   │   └── analysis/      # Bias analysis engine
│   │   ├── infrastructure/    # External integrations
│   │   └── index.ts           # Express server setup
│   ├── Dockerfile             # Multi-stage build
│   └── package.json           # Express 4.18.2, TypeScript
├── database/
│   └── init.sql               # MySQL initialization
├── docker-compose.yml         # 3 services: frontend, backend, mysql
├── mbfc-dataset-2025-08-05.json  # MBFC dataset (3.1MB)
└── Makefile                   # Automation scripts
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
