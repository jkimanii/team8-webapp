// Week 9 tests: keys, scopes, rate limiting and safe errors.
// Put this file next to your other tests (run with `npm test`).
// Needs: npm install --save-dev jest supertest

jest.mock('../db', () => ({ query: jest.fn() }));

// Set BEFORE the app is loaded: the app reads these when it starts.
process.env.API_KEYS =
  'group9:group9-test-key,website:website-test-key,team8-test:team8-test-key';
process.env.READ_ONLY_CONSUMERS = 'website';
process.env.RATE_LIMIT_MAX = '1000'; // out of the way; limiter has its own test below

const express = require('express');
const request = require('supertest');
const db = require('../db');
const app = require('../app');
const rateLimit = require('../middleware/rateLimit');

const GROUP9 = { 'X-API-Key': 'group9-test-key' };
const WEBSITE = { 'X-API-Key': 'website-test-key' };

const listingRow = {
  id: 13,
  title: 'Ibuprofen 200mg (24 tablets)',
  price: '250.00',
  condition: 'Like New',
  description: 'Sealed box.',
  imageUrl: 'https://placehold.co/400x300?text=Ibuprofen',
  status: 'available',
  datePosted: new Date('2026-09-11T08:41:01Z'),
  category: 'Wellness',
  sellerName: 'Strathmore Campus Pharmacy',
  sellerCampus: 'Strathmore University',
};

beforeEach(() => {
  db.query.mockReset();
  db.query.mockResolvedValue([[listingRow]]);
});

describe('authentication: every /api endpoint needs a key', () => {
  const endpoints = [
    ['get', '/api/listings?category=wellness'],
    ['get', '/api/listings/13'],
    ['patch', '/api/listings/13/availability'],
    ['get', '/api/categories'],
    ['get', '/api/categories/8'],
    ['get', '/api/clubs'],
    ['get', '/api/clubs/events'],
  ];

  test.each(endpoints)('%s %s with no key -> 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or invalid API key' });
    expect(db.query).not.toHaveBeenCalled(); // the handler never ran
  });

  test('a wrong key -> 401', async () => {
    const res = await request(app)
      .get('/api/listings?category=wellness')
      .set('X-API-Key', 'wrong');
    expect(res.status).toBe(401);
  });

  test('a valid key -> 200', async () => {
    const res = await request(app)
      .get('/api/listings?category=wellness')
      .set(GROUP9);
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(13);
  });

  test('each consumer has its own working key', async () => {
    for (const key of ['group9-test-key', 'website-test-key', 'team8-test-key']) {
      const res = await request(app).get('/api/listings/13').set('X-API-Key', key);
      expect(res.status).toBe(200);
    }
  });

  test('the 401 never echoes a key', async () => {
    const res = await request(app).get('/api/listings/13').set('X-API-Key', 'secret-guess');
    expect(JSON.stringify(res.body)).not.toContain('secret-guess');
  });

  test('the health check is the only open endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('health reports 503, without details, when the database is down', async () => {
    db.query.mockRejectedValue(Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:3306'), { code: 'ECONNREFUSED' }));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable' });
  });
});

describe('scopes: 401 vs 403', () => {
  test('the read-only website key can read', async () => {
    const res = await request(app).get('/api/listings/13').set(WEBSITE);
    expect(res.status).toBe(200);
  });

  test('the read-only website key cannot write -> 403', async () => {
    const res = await request(app)
      .patch('/api/listings/13/availability')
      .set(WEBSITE)
      .send({ status: 'booked' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'This API key is read-only' });
    expect(db.query).not.toHaveBeenCalled();
  });

  test("Group 9's key can write -> 200", async () => {
    const res = await request(app)
      .patch('/api/listings/13/availability')
      .set(GROUP9)
      .send({ status: 'Booked' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'booked' });
  });

  test('extra fields in the body are ignored, only status is saved', async () => {
    await request(app)
      .patch('/api/listings/13/availability')
      .set(GROUP9)
      .send({ status: 'booked', price: 1, id: 99, isAdmin: true });
    db.query.mock.calls.forEach(([sql]) => {
      expect(sql).toBe('UPDATE listings SET status = ? WHERE id = ?');
    });
    expect(db.query.mock.calls[0][1]).toEqual(['booked', '13']);
  });
});

describe('errors are JSON and leak nothing', () => {
  test('malformed JSON body -> 400 JSON, no stack trace', async () => {
    const res = await request(app)
      .patch('/api/listings/13/availability')
      .set(GROUP9)
      .set('Content-Type', 'application/json')
      .send('{"status":');
    expect(res.status).toBe(400);
    expect(res.type).toMatch(/json/);
    expect(res.text).not.toMatch(/node_modules|\.js:\d+|at /);
  });

  test('unknown path under /api -> 404 JSON', async () => {
    const res = await request(app).get('/api/nope').set(GROUP9);
    expect(res.status).toBe(404);
    expect(res.type).toMatch(/json/);
  });

  test('a database failure is a generic 500, not the database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    db.query.mockRejectedValue(new Error("Table 'strathshop.listings' doesn't exist"));
    const res = await request(app).get('/api/listings/13').set(GROUP9);
    expect(res.status).toBe(500);
    expect(res.text).not.toMatch(/strathshop|Table/);
    console.error.mockRestore();
  });
});

describe('rate limiting', () => {
  // The handout's demonstration: a tiny limit, five quick requests.
  const tiny = express();
  tiny.use((req, res, next) => { req.consumer = { name: 'demo', readOnly: false }; next(); });
  tiny.use(rateLimit({ windowMs: 60000, max: 3 }));
  tiny.get('/ping', (req, res) => res.json({ ok: true }));

  test('200 200 200 429 429, with Retry-After and a JSON body', async () => {
    const codes = [];
    let last;
    for (let i = 0; i < 5; i++) {
      last = await request(tiny).get('/ping');
      codes.push(last.status);
    }
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
    expect(last.body.error).toBe('Too many requests');
    expect(last.body.retryAfter).toBe(Number(last.headers['retry-after']));
  });

  test('one consumer hitting the limit does not block another', async () => {
    const two = express();
    two.use((req, res, next) => { req.consumer = { name: req.get('x-who'), readOnly: false }; next(); });
    two.use(rateLimit({ windowMs: 60000, max: 1 }));
    two.get('/ping', (req, res) => res.json({ ok: true }));

    await request(two).get('/ping').set('x-who', 'a');
    expect((await request(two).get('/ping').set('x-who', 'a')).status).toBe(429);
    expect((await request(two).get('/ping').set('x-who', 'b')).status).toBe(200);
  });
});
