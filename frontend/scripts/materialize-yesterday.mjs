#!/usr/bin/env node
// Nightly job: materialize yesterday's calendar-day analyses (UTC) for a set of subreddits.
// This script can be run inside the frontend container. It will call the app's internal analyze route
// or, once persistence helpers exist, import and execute them directly.

import 'dotenv/config';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
// Load default list from popularSubreddits.js
async function loadPopular() {
  const p = path.resolve(process.cwd(), 'frontend/src/lib/popularSubreddits.js');
  const mod = await import(pathToFileURL(p).href);
  const arr = Array.isArray(mod.popularSubreddits) ? mod.popularSubreddits : [];
  return arr.map(x => (typeof x?.name === 'string' ? x.name : '')).map(n => n.replace(/^r\//i, '')).filter(Boolean);
}

const envOverride = (process.env.MATERIALIZE_SUBREDDITS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const defaultSubs = await loadPopular();
const subreddits = envOverride.length ? envOverride : defaultSubs;

if (subreddits.length === 0) {
  console.log('[materialize] No subreddits configured. Set MATERIALIZE_SUBREDDITS env var');
  process.exit(0);
}

const now = new Date();
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)); // today 00:00 UTC
const start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // yesterday 00:00 UTC

console.log(`[materialize] Window UTC: ${start.toISOString()} .. ${end.toISOString()}`);

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function materializeOne(sub) {
  const url = `${SITE_URL}/api/analyze/stream?redditUrl=${encodeURIComponent(`https://www.reddit.com/r/${sub}`)}`;
  // We hit the non-streamed analyze route once present; for now trigger SSE and read briefly to warm caches.
  console.log('[materialize] warming', sub, url);
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'text/event-stream' } });
    if (!res.ok) {
      console.warn('[materialize] SSE warm failed', sub, res.status);
      return;
    }
    // Read for a short time to let server compute and persist; then abort.
    const reader = res.body.getReader();
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) { // 5s warm window
      const { done } = await reader.read();
      if (done) break;
    }
    try { await res.body.cancel(); } catch {}
  } catch (e) {
    console.warn('[materialize] error', sub, e?.message || String(e));
  }
}

(async () => {
  for (const sub of subreddits) {
    await materializeOne(sub);
    await delay(200);
  }
  console.log('[materialize] done');
})();
