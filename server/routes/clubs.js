const express = require('express');
const router = express.Router();
const { fetchWithRetry } = require('../resilientFetch');

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
const EVENT_REQUIRED = ['id', 'clubId', 'title', 'startTime'];

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
    console.warn(
      `serving saved data for ${path} from ${saved.asOf} (${reason})`
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
    return res
      .status(500)
      .json({
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
      console.error('partner returned', upstream.status, path);
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
      console.error('partner returned a response we could not read', path);
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
    console.error('partner call failed:', reason, path);
    return fallback(res, path, reason);
  }
}

// Events first: "/events" must not be read as a club id by "/:id".
// GET /api/clubs/events -> CampusHub GET /events
router.get('/events', (req, res) =>
  forward(`/events${buildQuery(req.query, EVENT_PARAMS)}`, res, (b) =>
    buildPage(b, 'events', mapEvent, EVENT_REQUIRED, 'event')
  )
);

// GET /api/clubs/events/:id -> CampusHub GET /events/{id}
router.get('/events/:id', (req, res) =>
  forward(`/events/${encodeURIComponent(req.params.id)}`, res, (b) => {
    const event = b.event ?? b;
    warnIfMissing('event', [event], EVENT_REQUIRED);
    return mapEvent(event);
  })
);

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

module.exports = router;
