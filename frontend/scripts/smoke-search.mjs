import fetch from 'node-fetch';

const q = process.argv[2] || 'news';
const url = `http://localhost:3000/api/subreddit/search?q=${encodeURIComponent(q)}`;
console.log('GET', url);
const r = await fetch(url);
console.log('status', r.status, r.headers.get('x-cache'));
const j = await r.json();
console.log('items', Array.isArray(j.items) ? j.items.slice(0, 5) : j);
