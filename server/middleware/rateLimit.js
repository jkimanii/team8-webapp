/*
A simple in-memory limiter: counts requests per caller in a time window.
Honest limits: it lives in this server's memory, so it resets on restart and
would not work across several server copies. Fine for this course; production
systems use a shared store such as Redis.
*/
function rateLimit({ windowMs = 60000, max = 100 } = {}) {
  const hits = new Map(); // id -> { count, resetAt }

  // Drop expired entries so the map cannot grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of hits) {
      if (now >= entry.resetAt) hits.delete(id);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const c = req.consumer;
    // Partner keys are counted per consumer. A read-only key is public (it
    // ships inside the website's JavaScript and every visitor shares it), so
    // it is counted per visitor instead, or one busy visitor would use up
    // everyone's allowance. No key at all: count by IP.
    const id = c ? (c.readOnly ? `${c.name}:${req.ip}` : c.name) : `ip:${req.ip}`;

    const now = Date.now();
    let entry = hits.get(id);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      console.warn(`429 ${req.method} ${req.originalUrl} (${c ? c.name : 'no key'})`);
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }

    next();
  };
}

module.exports = rateLimit;
