// Week 13 tests: v1 is frozen, v2 has the new shape, v1 announces its sunset.
// Run with `npm test` in server/.
jest.mock('../db', () => ({ query: jest.fn() }));

process.env.API_KEYS = 'team8-test:test-key';
process.env.READ_ONLY_CONSUMERS = '';
process.env.RATE_LIMIT_MAX = '1000';

const request = require('supertest');
const db = require('../db');
const app = require('../app');
const { SUNSET } = require('../routes/v1');

const KEY = { 'X-API-Key': 'test-key' };

const listingRow = (id, category) => ({
  id,
  title: `Item ${id}`,
  price: '250.00',
  condition: 'N/A',
  description: null,
  imageUrl: null,
  status: 'available',
  datePosted: new Date('2026-09-11T08:41:01Z'),
  category,
  sellerName: 'Dr. Wanjiku Mwangi',
  sellerCampus: 'Strathmore University',
});
const categoryRows = [
  { category_id: 8, label: 'Wellness' },
  { category_id: 9, label: 'Counseling' },
];

// Answer each query from the SQL text, like the real database would.
beforeEach(() => {
  db.query.mockReset();
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.startsWith('UPDATE'))
      return [{ affectedRows: params[1] === '17' ? 1 : 0 }];
    if (sql.includes('FROM categories WHERE'))
      return [categoryRows.filter((c) => String(c.category_id) === params[0])];
    if (sql.includes('FROM categories')) return [categoryRows];
    if (sql.includes('WHERE listings.id'))
      return [params[0] === '17' ? [listingRow(17, 'Counseling')] : []];
    return [[listingRow(17, 'Counseling'), listingRow(18, 'Counseling')]];
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const LISTING_FIELDS = [
  'category',
  'condition',
  'datePosted',
  'description',
  'id',
  'imageUrl',
  'price',
  'providerName',
  'sellerCampus',
  'sellerName',
  'status',
  'title',
];

describe('v1 is frozen', () => {
  test('GET /api/v1/listings keeps its original shape: a bare list', async () => {
    const res = await request(app)
      .get('/api/v1/listings?category=counseling')
      .set(KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(Object.keys(res.body[0]).sort()).toEqual(LISTING_FIELDS);
  });

  test.each([
    '/listings?category=counseling',
    '/listings/17',
    '/categories',
    '/categories/8',
    '/listings/9999',
    '/listings?category=pizza',
  ])('old unversioned /api%s answers exactly like /api/v1', async (path) => {
    const a = await request(app)
      .get('/api' + path)
      .set(KEY);
    const b = await request(app)
      .get('/api/v1' + path)
      .set(KEY);
    expect(a.status).toBe(b.status);
    expect(a.body).toEqual(b.body);
  });

  test('v1 error shape is unchanged', async () => {
    const res = await request(app).get('/api/v1/listings/9999').set(KEY);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Listing not found' });
  });

  test('the PATCH still works on the old URL', async () => {
    const res = await request(app)
      .patch('/api/listings/17/availability')
      .set(KEY)
      .send({ status: 'booked' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'booked' });
  });
});

describe('v2 has the new shape', () => {
  test('the listings list is wrapped in { data, count }', async () => {
    const res = await request(app)
      .get('/api/v2/listings?category=counseling')
      .set(KEY);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['count', 'data']);
    expect(res.body.count).toBe(2);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(LISTING_FIELDS);
  });

  test('the categories list is wrapped too', async () => {
    const res = await request(app).get('/api/v2/categories').set(KEY);
    expect(res.body).toEqual({
      data: [
        { id: 8, label: 'wellness' },
        { id: 9, label: 'counseling' },
      ],
      count: 2,
    });
  });

  test('the items inside are identical to v1', async () => {
    const v1 = await request(app)
      .get('/api/v1/listings?category=counseling')
      .set(KEY);
    const v2 = await request(app)
      .get('/api/v2/listings?category=counseling')
      .set(KEY);
    expect(v2.body.data).toEqual(v1.body);
  });

  test('single items, the PATCH reply and errors are NOT wrapped', async () => {
    expect(
      (await request(app).get('/api/v2/listings/17').set(KEY)).body.id
    ).toBe(17);
    expect(
      (await request(app).get('/api/v2/categories/8').set(KEY)).body
    ).toEqual({ id: 8, label: 'wellness' });
    expect(
      (
        await request(app)
          .patch('/api/v2/listings/17/availability')
          .set(KEY)
          .send({ status: 'available' })
      ).body
    ).toEqual({ status: 'available' });
    const bad = await request(app)
      .get('/api/v2/listings?category=pizza')
      .set(KEY);
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body)).toEqual(['error']);
  });

  test('v2 needs a key, like everything else', async () => {
    expect((await request(app).get('/api/v2/listings')).status).toBe(401);
  });
});

describe('deprecation headers', () => {
  test.each([
    '/api/v1/listings',
    '/api/listings',
    '/api/v1/listings/17',
    '/api/categories',
    '/api/listings/9999',
  ])('%s announces the sunset', async (path) => {
    const res = await request(app).get(path).set(KEY);
    expect(res.headers.deprecation).toBe('true');
    expect(res.headers.sunset).toBe(new Date(SUNSET).toUTCString());
    expect(res.headers.link).toMatch(
      /<\/api\/v2\/(listings|categories)>; rel="successor-version"/
    );
  });

  test.each([
    '/api/v2/listings',
    '/api/v2/categories',
    '/api/nope',
    '/api/health',
    '/api/stats',
  ])('%s does not carry them', async (path) => {
    const res = await request(app).get(path).set(KEY);
    expect(res.headers.deprecation).toBeUndefined();
  });
});

describe('/api/stats can tell the versions apart', () => {
  test('old, v1 and v2 calls are three different rows', async () => {
    await request(app).get('/api/listings').set(KEY);
    await request(app).get('/api/v1/listings').set(KEY);
    await request(app).get('/api/v2/listings').set(KEY);
    await new Promise((r) => setImmediate(r));
    const { body } = await request(app).get('/api/stats').set(KEY);
    for (const row of [
      'GET /api/listings',
      'GET /api/v1/listings',
      'GET /api/v2/listings',
    ]) {
      expect(body.routes[row]).toBeDefined();
    }
  });
});
