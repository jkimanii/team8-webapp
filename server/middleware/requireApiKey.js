const crypto = require('crypto');

// Hash before comparing so timingSafeEqual always sees equal-length buffers,
// and a wrong key is rejected in the same time however close it is.
const digest = (value) =>
  crypto.createHash('sha256').update(String(value)).digest();

/*
One key per consumer, so you can tell callers apart and revoke one without
breaking the rest. Both settings live in the environment (server/.env locally,
the Environment tab on Render), never in source code:

  API_KEYS=group9:<key>,team8-test:<key>,website:<key>
  READ_ONLY_CONSUMERS=website

Each entry is name:key. A consumer listed in READ_ONLY_CONSUMERS may only
read (GET/HEAD); a write attempt is a 403. Names appear in logs and in the
rate limiter. The keys themselves are never logged.
*/
let loadedFrom = null;
let consumers = [];

function loadConsumers() {
  const raw = process.env.API_KEYS || '';
  const readOnly = new Set(
    (process.env.READ_ONLY_CONSUMERS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const signature = `${raw}|${[...readOnly].join(',')}`;

  if (signature !== loadedFrom) {
    loadedFrom = signature;
    consumers = raw
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const i = pair.indexOf(':');
        const name = i > 0 ? pair.slice(0, i).trim() : '';
        const key = i > 0 ? pair.slice(i + 1).trim() : '';
        return name && key
          ? { name, digest: digest(key), readOnly: readOnly.has(name) }
          : null;
      })
      .filter(Boolean);

    // Only the count and the names, never the keys.
    console.log(
      `API keys loaded: ${consumers.length} (${
        consumers.map((c) => c.name + (c.readOnly ? ' [read-only]' : '')).join(', ') || 'none'
      })`
    );
  }
  return consumers;
}

function requireApiKey(req, res, next) {
  const list = loadConsumers();

  if (list.length === 0) {
    // Fail closed: a missing setting must never mean "no key needed".
    console.error('API_KEYS is empty or malformed: refusing all keyed requests');
    return res.status(500).json({ error: 'Server is not configured' });
  }

  const provided = (req.get('X-API-Key') || '').trim();

  let match = null;
  if (provided) {
    const given = digest(provided);
    for (const c of list) {
      if (crypto.timingSafeEqual(given, c.digest)) match = c;
    }
  }

  if (!match) {
    console.warn(`401 ${req.method} ${req.originalUrl} from ${req.ip} (missing or invalid API key)`);
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  req.consumer = { name: match.name, readOnly: match.readOnly };

  // 401 = "I don't know who you are". 403 = "I know who you are, and this
  // key is not allowed to do that".
  if (match.readOnly && !['GET', 'HEAD'].includes(req.method)) {
    console.warn(`403 ${req.method} ${req.originalUrl} (${match.name} is read-only)`);
    return res.status(403).json({ error: 'This API key is read-only' });
  }
  req.apiKey = provided; // for monitoring.js to log a hash of it
  next();
}

module.exports = requireApiKey;
module.exports.loadConsumers = loadConsumers;
