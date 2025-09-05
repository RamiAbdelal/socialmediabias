// Deepseek provider wrapper (CommonJS)
// Assumes Deepseek OpenAI-compatible chat endpoint.
const fetch = require('node-fetch');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

async function deepseekSentiment({ text }) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY missing');
  }
  const prompt = `You are a political discussion sentiment analyzer. Classify the OVERALL stance of the following Reddit comment aggregate toward the ORIGINAL LINKED SOURCE. Output strict JSON with keys sentiment(one of positive|negative|neutral), score(-1..1 number), reasoning(brief phrase).\nText:\n${text.slice(0, 8000)}`;
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: 'You output only JSON. No prose.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0,
    max_tokens: 150
  };
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Deepseek error: ${res.status} ${errTxt}`);
  }
  const json = await res.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) throw new Error('Deepseek empty response');
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new Error('Deepseek non JSON response'); }
  return {
    provider: 'deepseek',
    model: DEEPSEEK_MODEL,
    sentiment: parsed.sentiment || 'neutral',
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    reasoning: parsed.reasoning || ''
  };
}

module.exports = { deepseekSentiment };
