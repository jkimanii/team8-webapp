// Week 12 tests: request logging and /api/stats.
// Run with `npm test` in server/.
jest.mock('../db', () => ({ query: jest.fn() }));

// Set BEFORE the app is loaded: the app reads these when it starts.
process.env.API_KEYS = 'team9:group9-test-key,team8-test:team8-test-key';
process.env.READ_ONLY_CONSUMERS = '';
process.env.RATE_LIMIT_MAX = '1000';

const request = require('supertest');
const db = require('../db');
const app = require('../app');

const KEY = 'team8-test-key';
const listingRow = {
  id: 13,
  title: 'Ibuprofen 200mg (24 tablets)',
  price: '250.00',
  condition: 'Like New',
  description: 'Sealed box.',
  imageUrl: null,
  status: 'available',
  datePosted: new Date('2026-09-11T08:41:01Z'),
  category: 'Wellness',
  sellerName: 'Strathmore Campus Pharmacy',
  sellerCampus: 'Strathmore University',
};

// Collect the JSON log lines that monitor() prints.
let lines;
beforeEach(() => {
  lines = [];
  db.query.mockReset();
  db.query.mockResolvedValue([[listingRow]]);
  jest.spyOn(console, 'log').mockImplementation((s) => {
    try {
      lines.push(JSON.parse(s));
    } catch {
      /* not a request line */
    }
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

// The log line is written on 'finish', just after supertest gets its answer.
const settle = () => new Promise((r) => setImmediate(r));

test('a good request is one JSON line with exactly the six fields', async () => {
  await request(app).get('/api/listings/13').set('X-API-Key', KEY);
  await settle();
  expect(lines).toHaveLength(1);
  expect(Object.keys(lines[0]).sort()).toEqual([
    'caller',
    'method',
    'ms',
    'path',
    'status',
    'time',
  ]);
  expect(lines[0]).toMatchObject({
    method: 'GET',
    path: '/api/listings/13',
    status: 200,
  });
  expect(lines[0].caller).toMatch(/^key-[0-9a-f]{6}$/);
  expect(lines[0].ms).toBeGreaterThan(0);
});

test('wrong key and no key are logged as 401 with caller "none"', async () => {
  await request(app).get('/api/listings/13').set('X-API-Key', 'wrong');
  await request(app).get('/api/listings/13');
  await settle();
  expect(lines.map((l) => [l.status, l.caller])).toEqual([
    [401, 'none'],
    [401, 'none'],
  ]);
});

test('the same key always gets the same label; different keys differ', async () => {
  await request(app).get('/api/categories').set('X-API-Key', KEY);
  await request(app).get('/api/categories').set('X-API-Key', KEY);
  await request(app).get('/api/categories').set('X-API-Key', 'group9-test-key');
  await settle();
  expect(lines[0].caller).toBe(lines[1].caller);
  expect(lines[2].caller).not.toBe(lines[0].caller);
});

test('no key, query string or body ever reaches any log output', async () => {
  const everything = [];
  for (const m of ['log', 'warn', 'error']) {
    console[m].mockImplementation((...a) => everything.push(a.join(' ')));
  }
  await request(app)
    .get('/api/listings?category=pizza&email=a@b.com')
    .set('X-API-Key', KEY);
  await request(app)
    .get('/api/listings?category=wellness&token=secret123')
    .set('X-API-Key', 'wrong-key-xyz');
  await request(app)
    .patch('/api/listings/13/availability')
    .set('X-API-Key', KEY)
    .send({ status: 'booked', note: 'private-note' });
  await settle();
  const all = everything.join('\n');
  for (const secret of [
    KEY,
    'wrong-key-xyz',
    'a@b.com',
    'secret123',
    'category=',
    'private-note',
    '?',
  ]) {
    expect(all).not.toContain(secret);
  }
});

test('/api/stats needs a key', async () => {
  const res = await request(app).get('/api/stats');
  expect(res.status).toBe(401);
});

test('/api/stats groups ids by route pattern and separates 4xx from 5xx', async () => {
  const agent = request(app);
  await agent.get('/api/listings/13').set('X-API-Key', KEY);
  await agent.get('/api/listings/14').set('X-API-Key', KEY);
  db.query.mockResolvedValueOnce([[]]); // no such listing
  await agent.get('/api/listings/9999').set('X-API-Key', KEY);
  db.query.mockRejectedValueOnce(new Error('db down')); // a real 500
  await agent.get('/api/listings/13').set('X-API-Key', KEY);
  await agent.get('/api/listings/13'); // 401, never reaches a route
  await settle();

  const { body } = await agent.get('/api/stats').set('X-API-Key', KEY);
  const row = body.routes['GET /api/listings/:id'];
  expect(row).toMatchObject({ clientErrors: 1, serverErrors: 1 });
  expect(row.count).toBeGreaterThanOrEqual(4);
  expect(body.routes['GET /api/listings/14']).toBeUndefined();
  expect(body.routes['GET (no route)'].clientErrors).toBeGreaterThanOrEqual(1);
  expect(body.serverErrors).toBeGreaterThanOrEqual(1);
  expect(body.errorRatePercent).toBe(
    Math.round((body.serverErrors / body.total) * 1000) / 10
  );
  for (const k of [
    'startedAt',
    'uptimeSeconds',
    'total',
    'clientErrors',
    'avgMs',
    'campushubFallbacks',
  ]) {
    expect(body).toHaveProperty(k);
  }
});

test('/api/stats does not count itself in its own reply, but does in the next', async () => {
  const a = (await request(app).get('/api/stats').set('X-API-Key', KEY)).body
    .total;
  await settle();
  const b = (await request(app).get('/api/stats').set('X-API-Key', KEY)).body
    .total;
  expect(b).toBe(a + 1);
});

test('the health check is logged and counted too', async () => {
  await request(app).get('/api/health');
  await settle();
  expect(lines[0]).toMatchObject({
    path: '/api/health',
    status: 200,
    caller: 'none',
  });
});
