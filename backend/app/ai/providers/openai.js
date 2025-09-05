// OpenAI provider wrapper (CommonJS)
// Minimal chat completion request expecting JSON sentiment output.
// Avoids adding heavy SDK dependency; uses fetch available in Node 18+ runtime (polyfilled by node-fetch in parent scope if needed).

const fetch = require('node-fetch');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

async function openAISentiment({ text }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY missing');
  }
  const prompt = `You are a political discussion sentiment analyzer. Classify the OVERALL stance of the following Reddit comment aggregate toward the ORIGINAL LINKED SOURCE. Output strict JSON with keys sentiment(one of positive|negative|neutral), score(-1..1 number), reasoning(brief phrase).\nText:\n${text.slice(0, 8000)}`;
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You output only JSON. No prose.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0,
    max_tokens: 150
  };
  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${errTxt}`);
  }
  const json = await res.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) throw new Error('OpenAI empty response');
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new Error('OpenAI non JSON response'); }
  return {
    provider: 'openai',
    model: OPENAI_MODEL,
    sentiment: parsed.sentiment || 'neutral',
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    reasoning: parsed.reasoning || ''
  };
}

module.exports = { openAISentiment };
