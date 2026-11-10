// The clubs routes with a partner that fails: timeout, retries, saved data.
const http = require('http');
const express = require('express');
const request = require('supertest');

const SECRET = 'campushub-secret-key-123';

// A stand-in partner whose behaviour each test sets.
let behaviour;
let partnerHits;
let partner;

beforeAll(async () => {
  partner = http.createServer((req, res) => {
    partnerHits.push(req.url);
    behaviour(req, res, partnerHits.length);
  });
  await new Promise((r) => partner.listen(0, r));
  process.env.CAMPUSHUB_URL = `http://localhost:${partner.address().port}/api`;
  process.env.CAMPUSHUB_API_KEY = SECRET;
  process.env.CAMPUSHUB_TIMEOUT_MS = '150';
  process.env.CAMPUSHUB_RETRIES = '2';
  process.env.CAMPUSHUB_RETRY_DELAY_MS = '10';
});
afterAll(() => {
  timers.forEach(clearTimeout);
  partner.closeAllConnections?.();
  return new Promise((r) => partner.close(r));
});

const ok = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      data: [{ id: 'club-01', name: 'Robotics', category: 'Technology' }],
      page: 1,
      limit: 20,
      total: 1,
    })
  );
};
const status =
  (code, body = { message: 'x' }) =>
  (req, res) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
const timers = [];
const hang = (req, res) =>
  timers.push(setTimeout(() => res.headersSent || ok(req, res), 3000));

// A fresh copy of the route each time = a freshly restarted server (no saved data).
function freshApp() {
  let app;
  jest.isolateModules(() => {
    app = express();
    app.use('/api/clubs', require('../routes/clubs'));
  });
  return app;
}

let logs;
beforeEach(() => {
  partnerHits = [];
  logs = [];
  for (const m of ['log', 'warn', 'error']) {
    jest.spyOn(console, m).mockImplementation((...a) => logs.push(a.join(' ')));
  }
});
afterEach(() => jest.restoreAllMocks());

test('live data: stale is false and the answer has a time', async () => {
  behaviour = ok;
  const res = await request(freshApp()).get('/api/clubs');
  expect(res.status).toBe(200);
  expect(res.body.stale).toBe(false);
  expect(res.body.asOf).toEqual(expect.any(String));
  expect(res.body.data[0].name).toBe('Robotics');
});

test('the partner fails after one good call: saved data, flagged, with the original time', async () => {
  const app = freshApp();
  behaviour = ok;
  const live = await request(app).get('/api/clubs');
  behaviour = status(503);
  const res = await request(app).get('/api/clubs');
  expect(res.status).toBe(200);
  expect(res.body.stale).toBe(true);
  expect(res.body.asOf).toBe(live.body.asOf);
  expect(res.body.data).toEqual(live.body.data);
});

test('nothing saved and the partner is down: a friendly 502, not a crash', async () => {
  behaviour = status(500);
  const res = await request(freshApp()).get('/api/clubs');
  expect(res.status).toBe(502);
  expect(res.body).toEqual({
    error: 'upstream_unavailable',
    message: 'CampusHub data is unavailable right now.',
  });
});

test('a slow partner: cut off by the timeout, within the worst case, then saved data', async () => {
  const app = freshApp();
  behaviour = ok;
  await request(app).get('/api/clubs');
  partnerHits = [];
  behaviour = hang;
  const started = Date.now();
  const res = await request(app).get('/api/clubs');
  const elapsed = Date.now() - started;
  // worst case = 3 x 150 + 10 + 20 = 480 ms, plus slack
  expect(elapsed).toBeLessThan(1500);
  expect(partnerHits).toHaveLength(3);
  expect(res.body.stale).toBe(true);
  expect(logs.some((l) => /timeout/.test(l))).toBe(true);
});

test('a flaky partner (503, 503, then 200): the user never sees a failure', async () => {
  behaviour = (req, res, n) => (n < 3 ? status(503)(req, res) : ok(req, res));
  const res = await request(freshApp()).get('/api/clubs');
  expect(res.status).toBe(200);
  expect(res.body.stale).toBe(false);
  expect(partnerHits).toHaveLength(3);
  expect(logs.filter((l) => /retrying/.test(l))).toHaveLength(2);
});

test('always 500: exactly 3 calls to the partner (2 retries), then the fallback', async () => {
  behaviour = status(500);
  const res = await request(freshApp()).get('/api/clubs');
  expect(partnerHits).toHaveLength(3);
  expect(res.status).toBe(502);
});

test('a 404 from the partner passes through and is not retried', async () => {
  behaviour = status(404, {
    error: 'not_found',
    message: 'No club found with id club-99',
  });
  const res = await request(freshApp()).get('/api/clubs/club-99');
  expect(res.status).toBe(404);
  expect(res.body.message).toMatch(/club-99/);
  expect(partnerHits).toHaveLength(1);
});

test('a 401 (wrong key) is not retried, is logged, and saved data hides it from users', async () => {
  const app = freshApp();
  behaviour = ok;
  await request(app).get('/api/clubs');
  partnerHits = [];
  behaviour = status(401, { error: 'Missing or invalid API key.' });
  const res = await request(app).get('/api/clubs');
  expect(partnerHits).toHaveLength(1);
  expect(res.body.stale).toBe(true);
  expect(logs.some((l) => /partner returned 401/.test(l))).toBe(true);
});

test('restart = no saved data: the same failure now shows the friendly message', async () => {
  const before = freshApp();
  behaviour = ok;
  await request(before).get('/api/clubs');
  behaviour = status(503);
  expect((await request(before).get('/api/clubs')).body.stale).toBe(true);
  const restarted = freshApp();
  expect((await request(restarted).get('/api/clubs')).status).toBe(502);
});

test('the key is sent to the partner but never written to the log', async () => {
  let seenKey;
  behaviour = (req, res) => {
    seenKey = req.headers['x-api-key'];
    status(503)(req, res);
  };
  await request(freshApp()).get('/api/clubs');
  expect(seenKey).toBe(SECRET);
  expect(logs.join('\n')).not.toContain(SECRET);
});
