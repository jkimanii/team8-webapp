// Tests for the timeout and retry rules in resilientFetch.js.
// Uses small real servers on localhost, so the timing is real.
const http = require('http');
const { fetchWithRetry } = require('../resilientFetch');

// Timers made by slow handlers are cleared at the end, so Jest can exit cleanly.
const timers = [];
const later = (fn, ms) => {
  const t = setTimeout(fn, ms);
  timers.push(t);
  return t;
};
afterAll(() => timers.forEach(clearTimeout));

function startServer(handler) {
  return new Promise((resolve) => {
    const hits = [];
    const server = http.createServer((req, res) => {
      hits.push(req.method);
      handler(req, res, hits.length);
    });
    server.listen(0, () =>
      resolve({
        server,
        hits,
        url: `http://localhost:${server.address().port}/x`,
      })
    );
  });
}

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

const FAST = { timeoutMs: 300, retries: 2, delayMs: 5 };
let warn;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

let current;
afterEach(() => current && new Promise((r) => current.server.close(r)));

test('a healthy partner is called once', async () => {
  current = await startServer((req, res) => json(res, 200, { ok: true }));
  const res = await fetchWithRetry(current.url, {}, FAST);
  expect(res.status).toBe(200);
  expect(current.hits).toHaveLength(1);
});

test('503 twice then 200: the third attempt succeeds, with two "retrying" lines', async () => {
  current = await startServer((req, res, n) =>
    n < 3 ? json(res, 503, {}) : json(res, 200, { ok: true })
  );
  const res = await fetchWithRetry(current.url, {}, FAST);
  expect(res.status).toBe(200);
  expect(current.hits).toHaveLength(3);
  expect(warn).toHaveBeenCalledTimes(2);
});

test('always 500: exactly 2 retries (3 calls), then the failure comes back', async () => {
  current = await startServer((req, res) => json(res, 500, {}));
  const res = await fetchWithRetry(current.url, {}, FAST);
  expect(res.status).toBe(500);
  expect(current.hits).toHaveLength(3);
});

test.each([400, 401, 403, 404])('%i is never retried', async (status) => {
  current = await startServer((req, res) => json(res, status, {}));
  const res = await fetchWithRetry(current.url, {}, FAST);
  expect(res.status).toBe(status);
  expect(current.hits).toHaveLength(1);
});

test('a write (POST) is never retried, even on 503', async () => {
  current = await startServer((req, res) => json(res, 503, {}));
  const res = await fetchWithRetry(current.url, { method: 'POST' }, FAST);
  expect(res.status).toBe(503);
  expect(current.hits).toHaveLength(1);
});

test('retries: 0 means a single attempt', async () => {
  current = await startServer((req, res) => json(res, 503, {}));
  await fetchWithRetry(current.url, {}, { ...FAST, retries: 0 });
  expect(current.hits).toHaveLength(1);
});

test('a slow partner is cut off by the timeout (TimeoutError)', async () => {
  current = await startServer((req, res) =>
    later(() => json(res, 200, {}), 1500)
  );
  const started = Date.now();
  await expect(
    fetchWithRetry(current.url, {}, { timeoutMs: 100, retries: 0, delayMs: 5 })
  ).rejects.toMatchObject({ name: 'TimeoutError' });
  expect(Date.now() - started).toBeLessThan(800);
  current.server.closeAllConnections?.();
});

test('worst case is (retries + 1) x timeout + delays, and no more', async () => {
  current = await startServer((req, res) =>
    later(() => json(res, 200, {}), 5000)
  );
  const started = Date.now();
  await expect(
    fetchWithRetry(current.url, {}, { timeoutMs: 100, retries: 2, delayMs: 20 })
  ).rejects.toMatchObject({ name: 'TimeoutError' });
  const elapsed = Date.now() - started;
  // 3 x 100 + 20 + 40 = 360 ms, plus a little scheduling slack
  expect(elapsed).toBeGreaterThanOrEqual(340);
  expect(elapsed).toBeLessThan(900);
  expect(current.hits).toHaveLength(3);
  current.server.closeAllConnections?.();
});

test('a timed-out first attempt is retried and can succeed', async () => {
  current = await startServer((req, res, n) =>
    n === 1
      ? later(() => json(res, 200, { late: true }), 1000)
      : json(res, 200, { ok: true })
  );
  const res = await fetchWithRetry(
    current.url,
    {},
    { timeoutMs: 100, retries: 2, delayMs: 5 }
  );
  expect(await res.json()).toEqual({ ok: true });
  expect(current.hits).toHaveLength(2);
  current.server.closeAllConnections?.();
});

test('429 waits for Retry-After before the retry', async () => {
  current = await startServer((req, res, n) =>
    n === 1
      ? json(res, 429, {}, { 'Retry-After': '1' })
      : json(res, 200, { ok: true })
  );
  const started = Date.now();
  const res = await fetchWithRetry(current.url, {}, FAST);
  expect(res.status).toBe(200);
  expect(Date.now() - started).toBeGreaterThanOrEqual(950);
  expect(current.hits).toHaveLength(2);
});

test('nothing listening: gives up after 3 attempts with ECONNREFUSED', async () => {
  const dead = await startServer((req, res) => res.end());
  const url = dead.url;
  await new Promise((r) => dead.server.close(r));
  await expect(fetchWithRetry(url, {}, FAST)).rejects.toMatchObject({
    cause: { code: 'ECONNREFUSED' },
  });
  expect(warn).toHaveBeenCalledTimes(2);
  current = undefined;
});
