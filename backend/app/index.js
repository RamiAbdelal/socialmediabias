// MVP Express backend for Social Media Bias Analyzer
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getMBFCBiasForUrls } = require('../app/mbfc-signal');
const fetch = require('node-fetch');

dotenv.config();
const app = express();
const port = parseInt(process.env.BACKEND_INTERNAL_PORT || '3001', 10);

app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      'http://localhost:9005', // production
      'http://localhost:3000', // Next.js dev
      process.env.SITE_URL
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Health check
app.get('/', (_, res) => res.json({
  message: 'Social Media Bias Analyzer Backend is running!',
  version: 'MVP-JS',
}));

// POST /api/analyze { redditUrl: string }
app.post('/api/analyze', async (req, res) => {
  console.info("Received analyze request");
  const { redditUrl } = req.body;
  if (!redditUrl || !/^https:\/\/(?:www\.)?reddit\.com\//.test(redditUrl)) {
    return res.status(400).json({ error: 'Valid redditUrl required' });
  }
  try {
    // Fetch top posts from subreddit (Reddit public API, no auth for MVP)
    const subredditMatch = redditUrl.match(/reddit\.com\/(r\/[^\/]+)/);
    if (!subredditMatch) return res.status(400).json({ error: 'Could not extract subreddit' });
    const subreddit = subredditMatch[1];
    const apiUrl = `https://www.reddit.com/${subreddit}/top.json?limit=25&t=month`;
    const apiRes = await fetch(apiUrl, { headers: { 'User-Agent': 'smb-mvp/0.1' } });
    if (!apiRes.ok) throw new Error('Failed to fetch subreddit');
    const apiJson = await apiRes.json();
    const posts = (apiJson.data && apiJson.data.children) ? apiJson.data.children : [];

    // Extract all URLs from posts
    const urls = posts.map(p => p.data && p.data.url).filter(u => u && /^https?:\/\//.test(u));
    
    // Check MBFC bias for each URL (mock if DB not loaded)
    let biasResults = [];
    let biasCount = {};
    let mbfcFound = false;
    let response = {};

    console.info("Checking MBFC bias for URLs:", urls);
    try {
      const dbConfig = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'mbfc_user',
        password: process.env.MYSQL_PASSWORD || 'mbfc_pass',
        database: process.env.MYSQL_DATABASE || 'mbfc',
      };
      biasResults = await getMBFCBiasForUrls(urls, dbConfig);

      console.log("Bias Results:", biasResults);

      for (const r of biasResults) {
        if (r.bias) biasCount[r.bias] = (biasCount[r.bias] || 0) + 1;
      }
      if (biasResults.length > 0 && Object.keys(biasCount).length > 0) {
        mbfcFound = true;
      }
    } catch {}

    if (mbfcFound) {
      // Return MBFC bias results as before
      response = {
        subreddit,
        totalPosts: posts.length,
        urlsChecked: urls.length,
        biasBreakdown: biasCount,
        details: biasResults,
        overallScore: { score: 5.0, label: 'center', confidence: 0.8 },
        signalResults: [
          {
            signalType: 'MBFCSignal',
            score: { score: 5.0, label: 'center', confidence: 0.8 },
            summary: 'MBFC bias result',
            examples: urls.slice(0, 3)
          }
        ],
        redditPosts: posts.map(p => ({
          title: p.data && p.data.title,
          url: p.data && p.data.url,
          permalink: p.data && p.data.permalink,
          author: p.data && p.data.author,
          score: p.data && p.data.score
        })),
        communityName: subreddit,
        platform: 'reddit',
        analysisDate: new Date().toISOString()
      }
      res.json(response);
      console.info("MBFC bias results found:", response);
    } else {
      // No MBFC data: return real Reddit post data for demo
      response = {
        subreddit,
        totalPosts: posts.length,
        urlsChecked: urls.length,
        redditPosts: posts.map(p => ({
          title: p.data && p.data.title,
          url: p.data && p.data.url,
          permalink: p.data && p.data.permalink,
          author: p.data && p.data.author,
          score: p.data && p.data.score
        })),
        message: 'No MBFC data found. Showing real Reddit post data only.'
      };
      res.json(response);
      console.info("No MBFC bias data found, returning Reddit posts:", response);
    }
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unknown error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.info(`Backend listening on ports ${port}`);
});
