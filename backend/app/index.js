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

// --- Reddit OAuth2 helper ---
async function getRedditAccessToken() {
  const creds = Buffer.from(
    process.env.REDDIT_CLIENT_ID + ':' + process.env.REDDIT_SECRET
  ).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': process.env.REDDIT_USER_AGENT || 'smb-mvp/0.1'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('Failed to get Reddit access token');
  const data = await res.json();
  return data.access_token;
}

const { analyzeSentiment } = require('./ai/adapter');

// POST /api/analyze { redditUrl: string, useAI?: boolean }
app.post('/api/analyze', async (req, res) => {
  console.info("Received analyze request");
  const { redditUrl } = req.body || {};
  const useAI = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!redditUrl || !/^https:\/\/(?:www\.)?reddit\.com\//.test(redditUrl)) {
    return res.status(400).json({ error: 'Valid redditUrl required' });
  }
  try {
    // Fetch top posts from subreddit (Reddit OAuth2 API)
    const subredditMatch = redditUrl.match(/reddit\.com\/(r\/[^\/]+)/);
    if (!subredditMatch) return res.status(400).json({ error: 'Could not extract subreddit' });
    const subreddit = subredditMatch[1];
    const accessToken = await getRedditAccessToken();
    const apiUrl = `https://oauth.reddit.com/${subreddit}/top.json?limit=25&t=month`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'smb-mvp/0.1'
      }
    });
    if (!apiRes.ok) throw new Error('Failed to fetch subreddit');
    const apiJson = await apiRes.json();
    const posts = (apiJson.data && apiJson.data.children) ? apiJson.data.children : [];

    console.info(`Fetched ${posts.length} posts from subreddit: ${subreddit}`);
    console.info("API JSON:", apiJson);

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

    // If MBFC data exists, attempt discussion sentiment scoring.
    if (mbfcFound) {
      // -------- Heuristic Discussion Sentiment & Combined Scoring --------
      const urlBiasMap = {};
      for (const r of biasResults) {
        if (r.url && r.bias) urlBiasMap[r.url] = r.bias;
      }

      function mapBiasToScore(bias) {
        const biasMap = {
          'Extreme-Left': -5,
          'Left': -4,
          'Left-Center': -2,
          'Least Biased': 0,
          'Right-Center': 2,
          'Right': 4,
          'Extreme-Right': 5,
          'Questionable': 4
        };
        return biasMap[bias] ?? 0;
      }

      function mapSentimentToMultiplier(sentiment) {
        switch (sentiment) {
          case 'positive': return 1;
          case 'negative': return -1;
          default: return 0;
        }
      }

      function normalizeOverall(avg) {
        const n = ((avg + 5) / 10) * 10;
        return Math.min(10, Math.max(0, n));
      }
      
      function labelForScore(s) {
        if (s <= 1.5) return 'far-left';
        if (s <= 3.5) return 'left';
        if (s < 6.5) return 'center';
        if (s < 8.5) return 'right';
        return 'far-right';
      }

      async function fetchComments(permalink, token) {
        try {
          const url = `https://oauth.reddit.com${permalink}.json?limit=50&depth=1`;
          const r = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'User-Agent': process.env.REDDIT_USER_AGENT || 'smb-mvp/0.1'
            }
          });
          if (!r.ok) return null;
          return await r.json();
        } catch { return null; }
      }

      function extractTopLevelCommentBodies(threadJson) {
        if (!Array.isArray(threadJson) || threadJson.length < 2) return [];
        const commentsListing = threadJson[1];
        const children = commentsListing?.data?.children || [];
        return children
          .filter(c => c && c.kind === 't1')
          .map(c => c.data && c.data.body)
          .filter(Boolean)
          .slice(0, 20);
      }

      function heuristicSentiment(commentTexts) {
        if (!commentTexts.length) return 'neutral';
        const joined = commentTexts.join('\n').toLowerCase();
        const negativeWords = ['propaganda','trash','fake','lies','lying','biased','hack','hate','disgusting','bad take','cope'];
        const positiveWords = ['agree','true','accurate','based','good point','well said','makes sense'];
        let neg = 0, pos = 0;
        for (const w of negativeWords) if (joined.includes(w)) neg++;
        for (const w of positiveWords) if (joined.includes(w)) pos++;
        if (neg === 0 && pos === 0) return 'neutral';
        if (neg > pos * 1.2) return 'negative';
        if (pos > neg * 1.2) return 'positive';
        return 'neutral';
      }

      let sentimentSamples = [];
      let subredditLeanScore = 5;
      let leanRaw = 0;
      let confidence = 0.3;

      try {

        const MAX_POSTS_FOR_SENTIMENT = 8;

        for (const p of posts.slice(0, MAX_POSTS_FOR_SENTIMENT)) {

          const postData = p.data || {};
          const biasLabel = urlBiasMap[postData.url];
          if (!biasLabel) continue;
            if (!postData.permalink) continue;
          const thread = await fetchComments(postData.permalink, accessToken);
          if (!thread) continue;
          const bodies = extractTopLevelCommentBodies(thread);
          const heuristic = heuristicSentiment(bodies);
          let sentiment = heuristic;
          let aiMeta = null;
          if (useAI) {
            try {
              // Combine bodies into one text blob for provider (could be improved with per-comment weighting later)
              const textBlob = bodies.join('\n---\n');
              console.log('Analyzing sentiment with AI for post:', postData.permalink, textBlob);
              const ai = await analyzeSentiment({ text: textBlob });
              // Map AI sentiment to expected label if valid
              if (['positive','negative','neutral'].includes(ai.sentiment)) {
                sentiment = ai.sentiment;
                aiMeta = ai;
              } else {
                aiMeta = ai; // keep for transparency even if mapping failed
              }
            } catch (e) {
              // Silent fallback; heuristic already assigned.
              aiMeta = { provider: 'error', error: true };
            }
          }
          const engagement = (postData.num_comments || 0) + (postData.score || 0) / 100;

          sentimentSamples.push({
            title: postData.title,
            url: postData.url,
            permalink: postData.permalink,
            bias: biasLabel,
            sentiment,
            engagement,
            sampleComments: bodies.slice(0,3),
            aiMeta
          });
        }

        let totalWeighted = 0;
        let totalEngagement = 0;

        for (const s of sentimentSamples) {
          const postBiasScore = mapBiasToScore(s.bias);
          const mult = mapSentimentToMultiplier(s.sentiment);
          if (mult === 0) continue;
          const postLean = postBiasScore * mult; // -5..5
          totalWeighted += postLean * s.engagement;
          totalEngagement += s.engagement;
        }

        if (totalEngagement > 0) {
          const avgRaw = totalWeighted / totalEngagement;
          leanRaw = avgRaw;
          subredditLeanScore = normalizeOverall(avgRaw);
        }

        confidence = sentimentSamples.length > 0 ? Math.min(0.95, 0.4 + 0.07 * sentimentSamples.length) : confidence;
        
      } catch (err) {
        console.warn('Discussion sentiment heuristic failed', err.message);
      }

      response = {
        subreddit,
        totalPosts: posts.length,
        urlsChecked: urls.length,
        biasBreakdown: biasCount,
        details: biasResults,
        overallScore: { score: subredditLeanScore, label: labelForScore(subredditLeanScore), confidence },
        signalResults: [
          {
            signalType: 'MBFCSignal',
            score: { score: subredditLeanScore, label: labelForScore(subredditLeanScore), confidence },
            summary: 'MBFC + heuristic discussion sentiment combined',
            examples: urls.slice(0, 3)
          }
        ],
        discussionSignal: {
          samples: sentimentSamples,
          leanRaw,
          leanNormalized: subredditLeanScore,
            label: labelForScore(subredditLeanScore)
        },
        redditPosts: posts.map(p => ({
          title: p.data && p.data.title,
          url: p.data && p.data.url,
          permalink: p.data && p.data.permalink,
          author: p.data && p.data.author,
          score: p.data && p.data.score
        })),
        communityName: subreddit,
        analysisDate: new Date().toISOString()
      };

      res.json(response);
      console.info('MBFC bias results (with discussion heuristic) sent');

    } else {
      // No MBFC data: basic Reddit post payload
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
      console.info('No MBFC bias data found, returning Reddit posts only');
    }
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unknown error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.info(`Backend listening on ports ${port}`);
});
