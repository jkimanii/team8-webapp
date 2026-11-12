const express = require('express');
const router = express.Router();
const { fetchWithRetry } = require('../resilientFetch');
const { countFallback } = require('../middleware/monitoring');
const partner = require('../partner');

/*
Our side of the integration with Team 7 (CampusHub). The browser never talks to
CampusHub directly: it calls these routes and this server calls CampusHub.

server/.env:
  CAMPUSHUB_URL      their base URL including /api
  CAMPUSHUB_API_KEY  the key Team 7 issued to us
  DEBUG_PARTNER      true = print the raw partner response while building

  Resilience (all optional, these are the defaults):
  CAMPUSHUB_TIMEOUT_MS=1500        give up on one attempt after this long
  CAMPUSHUB_RETRIES=2              retries after the first attempt
  CAMPUSHUB_RETRY_DELAY_MS=200     first wait; doubles each time (200, 400)
*/

// Read at call time, so a changed .env is picked up after a restart and tests
// can point the proxy elsewhere.
const baseUrl = () => (process.env.CAMPUSHUB_URL || '').replace(/\/+$/, '');
const apiKey = () => (process.env.CAMPUSHUB_API_KEY || '').trim();
const timeoutMs = () => Number(process.env.CAMPUSHUB_TIMEOUT_MS) || 1500;
const retries = () =>
  process.env.CAMPUSHUB_RETRIES === undefined
    ? 2
    : Number(process.env.CAMPUSHUB_RETRIES);
const retryDelayMs = () => Number(process.env.CAMPUSHUB_RETRY_DELAY_MS) || 200;

// CampusHub rejects unknown query parameters with 400, so forward only the
// ones their contract documents.
const CLUB_PARAMS = ['search', 'category', 'page', 'limit'];
const EVENT_PARAMS = ['clubId', 'from', 'to', 'page', 'limit'];

const CLUB_REQUIRED = ['id', 'name', 'category'];
// The event's time is checked by the version's parser in partner.js.
const EVENT_REQUIRED = ['id', 'clubId', 'title'];

// The last good answer for each request, kept in memory. When CampusHub cannot
// be reached we serve it, flagged `stale`, so the page can say so. It is gone
// after a restart (fine for this course; production uses a cache or database).
const lastGood = new Map(); // upstream path -> { result, asOf }
const MAX_SAVED = 100;

function remember(path, result) {
  lastGood.delete(path); // re-insert so the newest is last
  lastGood.set(path, { result, asOf: new Date().toISOString() });
  if (lastGood.size > MAX_SAVED) lastGood.delete(lastGood.keys().next().value);
}

// Logs never carry query strings: ?search= is whatever a visitor typed.
const noQuery = (p) => p.split('?')[0];

function buildQuery(query, allowed) {
  const params = new URLSearchParams();
  for (const key of allowed) {
    const value = query[key];
    if (typeof value === 'string' && value !== '') params.append(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// logoUrl / imageUrl may be site-relative on CampusHub ("/uploads/a.png").
function absolute(url) {
  if (!url) return null;
  try {
    return new URL(url, `${baseUrl()}/`).toString();
  } catch {
    return null;
  }
}

function mapClub(c) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    category: c.category,
    logoUrl: absolute(c.logoUrl),
    meetingTime: c.meetingTime ?? null,
    meetingLocation: c.meetingLocation ?? null,
    tags: Array.isArray(c.tags) ? c.tags : [],
  };
}

function mapEvent(e) {
  return {
    id: e.id,
    clubId: e.clubId,
    title: e.title,
    description: e.description ?? null,
    category: e.category,
    startTime: e.startTime,
    location: e.location ?? null,
    imageUrl: absolute(e.imageUrl),
  };
}

function warnIfMissing(kind, items, required) {
  const missing = new Set();
  for (const item of items) {
    for (const field of required) {
      if (item[field] === undefined) missing.add(field);
    }
  }
  if (missing.size > 0) {
    console.warn(
      `partner shape: ${kind} is missing ${[...missing].join(', ')} (see CampusHub contract)`
    );
  }
}

// The contract promises { data, page, limit, total }. Accept the same list
// under a named key ({ clubs: [...] }) or as a bare array, and wrap it.
function buildPage(body, listKey, mapper, required, kind) {
  const list = Array.isArray(body.data)
    ? body.data
    : Array.isArray(body[listKey])
      ? body[listKey]
      : Array.isArray(body)
        ? body
        : null;
  if (!list) return null;

  if (!Array.isArray(body.data)) {
    console.warn(
      `partner shape: ${kind} list was not under "data" as the contract says`
    );
  }
  warnIfMissing(kind, list, required);

  return {
    data: list.map(mapper),
    page: body.page ?? 1,
    limit: body.limit ?? list.length,
    total: body.total ?? list.length,
  };
}

// Best to worst: live data, saved data (flagged), a friendly message.
function fallback(res, path, reason) {
  const saved = lastGood.get(path);
  if (saved) {
    countFallback(); // Week 12 stretch: shows in /api/stats as campushubFallbacks
    console.warn(
      `serving saved data for ${noQuery(path)} from ${saved.asOf} (${reason})`
    );
    return res.json({ ...saved.result, stale: true, asOf: saved.asOf });
  }
  return res.status(502).json({
    error: 'upstream_unavailable',
    message: 'CampusHub data is unavailable right now.',
  });
}

async function forward(path, res, build) {
  if (!baseUrl()) {
    console.error('CAMPUSHUB_URL is not set');
    return res.status(500).json({
      error: 'server_misconfigured',
      message: 'Partner data unavailable',
    });
  }

  try {
    const headers = {
      Accept: 'application/json',
      // ngrok's free plan puts a warning page in front of API calls without this.
      'ngrok-skip-browser-warning': 'true',
    };
    if (apiKey()) headers['X-API-Key'] = apiKey();

    const upstream = await fetchWithRetry(
      `${baseUrl()}${path}`,
      { headers },
      { timeoutMs: timeoutMs(), retries: retries(), delayMs: retryDelayMs() }
    );
    const body = await upstream.json().catch(() => null);

    if (process.env.DEBUG_PARTNER === 'true') {
      console.log(
        '[partner]',
        upstream.status,
        path,
        JSON.stringify(body)?.slice(0, 400)
      );
    }

    if (!upstream.ok) {
      console.error('partner returned', upstream.status, noQuery(path));
      // 400 and 404 are about the request itself, so the page can show them
      // as they are. Anything else (401, 429, 5xx) is a problem between the
      // two servers: serve saved data if we have it. The log above is how we
      // find out about, say, a wrong key that saved data would otherwise hide.
      if (
        (upstream.status === 400 || upstream.status === 404) &&
        body &&
        body.message
      ) {
        return res.status(upstream.status).json(body);
      }
      return fallback(res, path, `status ${upstream.status}`);
    }

    const result = body && typeof body === 'object' ? build(body) : null;
    if (!result) {
      console.error(
        'partner returned a response we could not read',
        noQuery(path)
      );
      return fallback(res, path, 'unreadable response');
    }

    remember(path, result);
    return res.json({
      ...result,
      stale: false,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    // timeout, ECONNREFUSED (nothing listening) or ENOTFOUND (wrong hostname)
    const reason =
      err.name === 'TimeoutError' ? 'timeout' : err.cause?.code || err.message;
    console.error('partner call failed:', reason, noQuery(path));
    return fallback(res, path, reason);
  }
}

// Which CampusHub version we call (PARTNER_VERSION), or a clear 500 if the
// setting is wrong.
function partnerVersion(res) {
  try {
    return partner.current();
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      error: 'server_misconfigured',
      message: 'Partner data unavailable',
    });
    return null;
  }
}

// Events first: "/events" must not be read as a club id by "/:id".
// GET /api/clubs/events -> CampusHub GET /events (v1) or /v2/events (v2)
router.get('/events', (req, res) => {
  const ver = partnerVersion(res);
  if (!ver) return;
  return forward(
    `${ver.eventsPath}${buildQuery(req.query, EVENT_PARAMS)}`,
    res,
    (b) =>
      buildPage(
        b,
        'events',
        (e) => mapEvent(ver.parseEvent(e)),
        EVENT_REQUIRED,
        'event'
      )
  );
});

// GET /api/clubs/events/:id -> CampusHub GET /events/{id} (v1) or /v2/events/{id} (v2)
router.get('/events/:id', (req, res) => {
  const ver = partnerVersion(res);
  if (!ver) return;
  return forward(
    `${ver.eventsPath}/${encodeURIComponent(req.params.id)}`,
    res,
    (b) => {
      const event = b.event ?? b;
      warnIfMissing('event', [event], EVENT_REQUIRED);
      return mapEvent(ver.parseEvent(event));
    }
  );
});

// GET /api/clubs -> CampusHub GET /clubs
router.get('/', (req, res) =>
  forward(`/clubs${buildQuery(req.query, CLUB_PARAMS)}`, res, (b) =>
    buildPage(b, 'clubs', mapClub, CLUB_REQUIRED, 'club')
  )
);

// GET /api/clubs/:id -> CampusHub GET /clubs/{id}
router.get('/:id', (req, res) =>
  forward(`/clubs/${encodeURIComponent(req.params.id)}`, res, (b) => {
    const club = b.club ?? b;
    warnIfMissing('club', [club], CLUB_REQUIRED);
    return mapClub(club);
  })
);

// GET /api/clubs/image?src=<CampusHub image URL>
// An <img> tag can't send headers, so the browser gets ngrok's warning page
// instead of the picture. We fetch it with the skip header and pass it on.
// Only CampusHub's own host is allowed, so this can't fetch anything else.
async function imageProxy(req, res) {
  let src;
  try {
    src = new URL(String(req.query.src || ''));
  } catch {
    return res
      .status(400)
      .json({ error: 'bad_request', message: 'src must be a full URL' });
  }
  if (!baseUrl() || src.origin !== new URL(baseUrl()).origin) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'Only CampusHub images are allowed',
    });
  }

  try {
    const upstream = await fetchWithRetry(
      src.toString(),
      { headers: { 'ngrok-skip-browser-warning': 'true' } },
      { timeoutMs: timeoutMs(), retries: 1, delayMs: retryDelayMs() }
    );
    const type = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !type.startsWith('image/')) {
      console.warn(
        'image proxy: CampusHub returned',
        upstream.status,
        type,
        src.pathname
      );
      return res.status(502).end();
    }
    res.set({
      'Content-Type': type,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      // SVGs can contain scripts; this stops them running if opened directly.
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'",
    });
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.warn(
      'image proxy failed:',
      err.name === 'TimeoutError' ? 'timeout' : err.cause?.code || err.message
    );
    return res.status(502).end();
  }
}

module.exports = router;
module.exports.imageProxy = imageProxy;
