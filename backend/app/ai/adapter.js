// AI Adapter to unify sentiment analysis across multiple providers with fallback order.
// Domain-driven design style: expose a single orchestration function returning normalized result.

const crypto = require('crypto');
const { deepseekSentiment } = require('./providers/deepseek');
const { openAISentiment } = require('./providers/openai');

// In-memory cache (process lifetime) – simple; future: extract to redis/backing store.
const sentimentCache = new Map(); // key -> { ts, result }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const registry = {
  deepseek: deepseekSentiment,
  openai: openAISentiment
};

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * analyzeSentiment
 * @param {Object} opts
 * @param {string} opts.text Concatenated comments / content.
 * @param {string[]} [opts.providerOrder] Priority list of providers.
 * @returns {Promise<{provider:string, model:string, sentiment:string, score:number, reasoning:string, cached?:boolean}>}
 */
async function analyzeSentiment({ text, providerOrder }) {
  if (!text || !text.trim()) {
    return { provider: 'heuristic', model: 'none', sentiment: 'neutral', score: 0, reasoning: 'empty text' };
  }
  const order = providerOrder && providerOrder.length
    ? providerOrder
    : (process.env.AI_SENTIMENT_PROVIDER_ORDER || 'deepseek,openai').split(',').map(s => s.trim()).filter(Boolean);

  const key = hashText(`${order.join('|')}::${text}`);
  const cached = sentimentCache.get(key);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return { ...cached.result, cached: true };
  }

  let lastErr;
  for (const prov of order) {
    const fn = registry[prov];
    if (!fn) continue; // unknown provider silently skipped
    try {
      const result = await fn({ text });
      sentimentCache.set(key, { ts: Date.now(), result });
      return result;
    } catch (e) {
      lastErr = e;
      // Continue to next provider
    }
  }
  // All failed – return neutral fallback with error reasoning (omit sensitive details)
  return { provider: 'fallback', model: 'none', sentiment: 'neutral', score: 0, reasoning: lastErr ? 'all providers failed' : 'no providers configured' };
}

module.exports = { analyzeSentiment };
