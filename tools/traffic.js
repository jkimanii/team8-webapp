// traffic.js: sends a mix of requests to the StrathShop API, to give /stats data.
//
// Run from the repo root (Git Bash or macOS/Linux):
//   API=http://localhost:5000 KEY=<your-key> node tools/traffic.js
// PowerShell:
//   $env:API="http://localhost:5000"; $env:KEY="<your-key>"; node tools/traffic.js
// Optional: N=200 to send more requests (the default is 60).
//
// Only GET requests: the script never changes data, so it is safe to point at
// the hosted API too.
const API = (process.env.API || 'http://localhost:5000').replace(/\/+$/, '');
const KEY = process.env.KEY;
const N = Number(process.env.N || 60);

if (!KEY) {
  console.error(
    'Set KEY to one of your API keys first (see the comment at the top).'
  );
  process.exit(1);
}

const mix = [
  { path: '/api/listings?category=wellness', key: true }, // 200
  { path: '/api/listings?category=counseling', key: true }, // 200
  { path: '/api/listings', key: true }, // 200, full catalogue
  { path: '/api/listings/13', key: true }, // 200
  { path: '/api/listings/9999', key: true }, // 404: no such id
  { path: '/api/listings?category=pizza', key: true }, // 400: bad category
  { path: '/api/categories', key: true }, // 200
  { path: '/api/categories/8', key: true }, // 200
  { path: '/api/listings?category=wellness', key: false }, // 401: no key at all
  { path: '/api/not-a-route', key: true }, // 404: no such path
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const counts = {};
  for (let i = 0; i < N; i++) {
    const r = mix[Math.floor(Math.random() * mix.length)];
    try {
      const res = await fetch(API + r.path, {
        headers: r.key ? { 'X-API-Key': KEY } : {},
      });
      counts[res.status] = (counts[res.status] || 0) + 1;
    } catch (err) {
      counts.failed = (counts.failed || 0) + 1;
    }
    await pause(50);
  }
  console.log('Status codes received:', counts);
})();
