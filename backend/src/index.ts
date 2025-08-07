import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { BiasAnalyzer } from './domain/analysis/bias-analyzer';
import { MBFCSignal } from './domain/signals/mbfc-signal';

dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.SITE_URL || 'http://localhost:9005',
  credentials: true
}));

// Initialize bias analyzer with signals
const biasAnalyzer = new BiasAnalyzer([new MBFCSignal()]);

// Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { communityName, platform } = req.body;
    
    if (!communityName) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const result = await biasAnalyzer.analyze(communityName, platform || 'reddit');
    
    // Convert to plain object for JSON response
    const response = {
      communityName: result.communityName,
      platform: result.platform,
      overallScore: {
        score: result.overallScore.score,
        confidence: result.overallScore.confidence,
        label: result.overallScore.label
      },
      signalResults: result.signalResults.map(signal => ({
        signalType: signal.signalType,
        score: {
          score: signal.score.score,
          confidence: signal.score.confidence,
          label: signal.score.label
        },
        summary: signal.summary,
        examples: signal.examples
      })),
      analysisDate: result.analysisDate
    };
    
    res.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// Health check endpoint
app.get('/', (_, res) => res.json({ 
  message: 'Social Media Bias Analyzer Backend is running!',
  version: '1.0.0',
  signals: ['MBFCSignal']
}));

app.listen(port, '0.0.0.0', () => {
  console.info(`Backend listening on port ${port}`);
});
