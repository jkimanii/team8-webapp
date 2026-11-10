// Tests for the contract Group 9 depends on: listings and categories.
// The database is replaced with a fake, so these run without MySQL and never
// touch real data. Run with `npm test` in server/.
jest.mock('../db', () => ({ query: jest.fn() }));

process.env.API_KEYS = 'team8-test:test-key';
process.env.READ_ONLY_CONSUMERS = '';
process.env.RATE_LIMIT_MAX = '1000';

const request = require('supertest');
const db = require('../db');
const app = require('../app');

const KEY = { 'X-API-Key': 'test-key' };

// Rows shaped like what mysql2 returns: DECIMAL as a string, Date objects,
// labels capitalised as they are stored.
const wellness = {
  id: 13,
  title: 'Ibuprofen 200mg (24 tablets)',
  price: '250.00',
  condition: 'Like New',
  description: 'Sealed box, unopened.',
  imageUrl: 'https://placehold.co/400x300?text=Ibuprofen',
  status: 'available',
  datePosted: new Date('2026-09-11T08:41:01Z'),
  category: 'Wellness',
  sellerName: 'Strathmore Campus Pharmacy',
  sellerCampus: 'Strathmore University',
};
const counseling = {
  id: 17,
  title: '1-on-1 Counseling Session',
  price: '1500.00',
  condition: 'N/A',
  description: null,
  imageUrl: null,
  status: 'BOOKED',
  datePosted: new Date('2026-09-11T08:50:22Z'),
  category: 'Counseling',
  sellerName: 'Dr. Wanjiku Mwangi',
  sellerCampus: 'Strathmore University',
};

beforeEach(() => {
  db.query.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const get = (path) => request(app).get(path).set(KEY);
const patch = (path, body) => request(app).patch(path).set(KEY).send(body);

describe('GET /api/listings', () => {
  test('maps a row to the contract shape', async () => {
    db.query.mockResolvedValue([[wellness]]);
    const res = await get('/api/listings?category=wellness');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 13,
        title: 'Ibuprofen 200mg (24 tablets)',
        price: 250, // a JSON number, never the string "250.00"
        description: 'Sealed box, unopened.',
        category: 'wellness', // lowercase, though the database says "Wellness"
        condition: 'Like New', // display text, kept as stored
        status: 'available',
        imageUrl: 'https://placehold.co/400x300?text=Ibuprofen',
        sellerName: 'Strathmore Campus Pharmacy',
        sellerCampus: 'Strathmore University',
        datePosted: '2026-09-11T08:41:01.000Z',
      },
    ]);
  });

  test('counseling listings add providerName; wellness ones do not', async () => {
    db.query.mockResolvedValue([[wellness, counseling]]);
    const [w, c] = (await get('/api/listings')).body;
    expect(w).not.toHaveProperty('providerName');
    expect(c.providerName).toBe('Dr. Wanjiku Mwangi');
    expect(c.status).toBe('booked'); // lowercased
    expect(c.description).toBeNull(); // null passes through, not ""
  });

  test.each(['wellness', 'Wellness', ' WELLNESS ', 'counseling'])(
    'category=%p is accepted, trimmed, and sent to the database as a parameter',
    async (value) => {
      db.query.mockResolvedValue([[]]);
      const res = await get(
        `/api/listings?category=${encodeURIComponent(value)}`
      );
      expect(res.status).toBe(200);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('LOWER(?)');
      expect(params).toEqual([value.trim()]);
    }
  );

  test('no category returns the whole catalogue, with no WHERE clause', async () => {
    db.query.mockResolvedValue([[wellness, counseling]]);
    const res = await get('/api/listings');
    expect(res.body).toHaveLength(2);
    expect(db.query.mock.calls[0][0]).not.toContain('WHERE');
  });

  test.each(['pizza', 'textbooks', ''])(
    'category=%p is a 400 and the database is never asked',
    async (value) => {
      const res = await get(`/api/listings?category=${value}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/wellness, counseling/);
      expect(db.query).not.toHaveBeenCalled();
    }
  );

  test('a database failure is a generic 500 that leaks nothing', async () => {
    db.query.mockRejectedValue(
      new Error("Table 'strathshop.listings' doesn't exist")
    );
    const res = await get('/api/listings');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch listings' });
  });
});

describe('GET /api/listings/:id', () => {
  test('returns one listing as an object, not an array', async () => {
    db.query.mockResolvedValue([[counseling]]);
    const res = await get('/api/listings/17');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(17);
    expect(db.query.mock.calls[0][1]).toEqual(['17']);
  });

  test('an id that does not exist is a 404', async () => {
    db.query.mockResolvedValue([[]]);
    const res = await get('/api/listings/9999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Listing not found' });
  });

  test.each(['abc', '1abc', '-1', '1.5'])(
    'a non-integer id (%p) is a 404 and the database is never asked',
    async (id) => {
      const res = await get(`/api/listings/${id}`);
      expect(res.status).toBe(404);
      expect(db.query).not.toHaveBeenCalled();
    }
  );
});

describe('PATCH /api/listings/:id/availability', () => {
  test('sets the status and echoes it in lowercase', async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);
    const res = await patch('/api/listings/17/availability', {
      status: ' Booked ',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'booked' });
    expect(db.query.mock.calls[0]).toEqual([
      'UPDATE listings SET status = ? WHERE id = ?',
      ['booked', '17'],
    ]);
  });

  test('sending the same PATCH twice succeeds both times (idempotent)', async () => {
    db.query.mockResolvedValue([{ affectedRows: 1, changedRows: 0 }]);
    for (let i = 0; i < 2; i++) {
      const res = await patch('/api/listings/17/availability', {
        status: 'booked',
      });
      expect(res.status).toBe(200);
    }
  });

  test.each([
    [{}, 'status is required'],
    [{ status: 5 }, 'status is required'],
    [{ status: 'sold' }, /available, booked/],
  ])('body %p is a 400', async (body, message) => {
    const res = await patch('/api/listings/17/availability', body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('a listing that does not exist is a 404', async () => {
    db.query.mockResolvedValue([{ affectedRows: 0 }]);
    const res = await patch('/api/listings/9999/availability', {
      status: 'booked',
    });
    expect(res.status).toBe(404);
  });

  test('a non-integer id is a 404 and nothing is updated', async () => {
    const res = await patch('/api/listings/abc/availability', {
      status: 'booked',
    });
    expect(res.status).toBe(404);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('GET /api/categories', () => {
  test('renames category_id to id and lowercases the label', async () => {
    db.query.mockResolvedValue([
      [
        { category_id: 8, label: 'Wellness' },
        { category_id: 9, label: 'Counseling' },
      ],
    ]);
    const res = await get('/api/categories');
    expect(res.body).toEqual([
      { id: 8, label: 'wellness' },
      { id: 9, label: 'counseling' },
    ]);
  });

  test('one category by id', async () => {
    db.query.mockResolvedValue([[{ category_id: 8, label: 'Wellness' }]]);
    expect((await get('/api/categories/8')).body).toEqual({
      id: 8,
      label: 'wellness',
    });
  });

  test('an unknown id is a 404; a non-integer id is a 404 without asking the database', async () => {
    db.query.mockResolvedValue([[]]);
    expect((await get('/api/categories/99')).status).toBe(404);
    db.query.mockClear();
    expect((await get('/api/categories/8abc')).status).toBe(404);
    expect(db.query).not.toHaveBeenCalled();
  });
});
