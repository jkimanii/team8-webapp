const crypto = require('crypto');
const round = (n) => Math.round(n * 10) / 10;

// ---- Running totals, kept in memory (they reset when the server restarts) ----
const stats = {
  startedAt: new Date().toISOString(),
  total: 0,
  clientErrors: 0, // 4xx: usually the caller's mistake
  serverErrors: 0, // 5xx: our fault
  totalMs: 0,
  fallbacks: 0, // times the Clubs page was served saved CampusHub data (Week 11)
  routes: {},
};

function newRoute() {
  return { count: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0 };
}

// A label for who called, without ever writing the key itself. The same key
// always gives the same six characters, and nobody can get the key back.
function who(req) {
  if (!req.apiKey) return 'none';
  const hash = crypto.createHash('sha256').update(req.apiKey).digest('hex');
  return 'key-' + hash.slice(0, 6);
}

function monitor(req, res, next) {
  const start = process.hrtime.bigint();

  // Read the path NOW. Routers mounted with app.use('/api/...') rewrite
  // req.url while they run, so by the time the response finishes req.path
  // can be just "/13". req.path never includes the query string.
  const path = req.path;

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;

    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        method: req.method,
        path,
        status: res.statusCode,
        ms: round(ms),
        caller: who(req),
      })
    );

    // Group by route PATTERN: /api/listings/13 and /api/listings/14 both
    // become "GET /api/listings/:id". Requests rejected before a route (401,
    // 429, unknown paths) have no req.route and land in "(no route)".
    // (A router's own "/" would give "/api/clubs/"; the replace trims that.)
    const route = req.route
      ? (req.baseUrl + req.route.path).replace(/(.)\/$/, '$1')
      : '(no route)';
    const label = `${req.method} ${route}`;
    const r = stats.routes[label] || newRoute();
    stats.routes[label] = r;

    stats.total += 1;
    stats.totalMs += ms;
    r.count += 1;
    r.totalMs += ms;
    r.maxMs = Math.max(r.maxMs, ms);

    if (res.statusCode >= 500) {
      stats.serverErrors += 1;
      r.serverErrors += 1;
    } else if (res.statusCode >= 400) {
      stats.clientErrors += 1;
      r.clientErrors += 1;
    }
  });

  next();
}

// Called by routes/clubs.js whenever it serves saved data because CampusHub
// could not be reached (the handout's stretch goal).
function countFallback() {
  stats.fallbacks += 1;
}

function statsHandler(req, res) {
  const routes = {};
  for (const [label, r] of Object.entries(stats.routes)) {
    routes[label] = {
      count: r.count,
      clientErrors: r.clientErrors,
      serverErrors: r.serverErrors,
      avgMs: round(r.totalMs / r.count),
      maxMs: round(r.maxMs),
    };
  }
  const rate = stats.total ? (stats.serverErrors / stats.total) * 100 : 0;
  const avg = stats.total ? stats.totalMs / stats.total : 0;

  res.json({
    startedAt: stats.startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    total: stats.total,
    clientErrors: stats.clientErrors,
    serverErrors: stats.serverErrors,
    errorRatePercent: round(rate),
    avgMs: round(avg),
    campushubFallbacks: stats.fallbacks,
    routes,
  });
}

module.exports = { monitor, statsHandler, countFallback };
