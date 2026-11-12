// Week 13 Part E: our migration to Team 7's (CampusHub) events v2.
const http = require('http');
const express = require('express');
const request = require('supertest');
const { versions } = require('../partner');

// Shapes copied from Team 7's ring bulletin (12 Nov 2026).
const v1Event = {
  id: 'e1',
  clubId: 'c1',
  title: 'Robotics Open House',
  category: 'Technology',
  date: '2026-11-02',
  time: '06:30',
  location: 'Room 204',
};
const v2Event = {
  id: 'e1',
  clubId: 'c1',
  title: 'Robotics Open House',
  category: 'Technology',
  startTime: '2026-11-02T06:30:00+03:00',
  location: 'Room 204',
};

describe('the parsers', () => {
  test('v1 and v2 give our app exactly the same startTime', () => {
    expect(versions.v1.parseEvent(v1Event).startTime).toBe(
      '2026-11-02T06:30:00+03:00'
    );
    expect(versions.v2.parseEvent(v2Event).startTime).toBe(
      '2026-11-02T06:30:00+03:00'
    );
    expect(new Date(versions.v1.parseEvent(v1Event).startTime).getTime()).toBe(
      new Date(versions.v2.parseEvent(v2Event).startTime).getTime()
    );
  });

  test('the wrong parser fails loudly, not quietly', () => {
    expect(() => versions.v1.parseEvent(v2Event)).toThrow(
      'unexpected v1 shape'
    );
    expect(() => versions.v2.parseEvent(v1Event)).toThrow(
      'unexpected v2 shape'
    );
  });

  test('an unparseable startTime is rejected, not turned into "Invalid Date"', () => {
    expect(() =>
      versions.v2.parseEvent({ ...v2Event, startTime: 'undefinedTundefined' })
    ).toThrow();
  });
});

describe('the /api/clubs/events route', () => {
  let partnerServer;
  let seen;
  let serve; // what the stand-in CampusHub returns

  beforeAll(async () => {
    partnerServer = http.createServer((req, res) => {
      seen.push(req.url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(serve(req.url)));
    });
    await new Promise((r) => partnerServer.listen(0, r));
    process.env.CAMPUSHUB_URL = `http://localhost:${partnerServer.address().port}/api`;
    process.env.CAMPUSHUB_RETRIES = '0';
  });
  afterAll(() => new Promise((r) => partnerServer.close(r)));

  let logs;
  beforeEach(() => {
    seen = [];
    logs = [];
    for (const m of ['log', 'warn', 'error']) {
      jest
        .spyOn(console, m)
        .mockImplementation((...a) => logs.push(a.join(' ')));
    }
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.PARTNER_VERSION;
  });

  // A fresh copy of the route each time = a freshly restarted server.
  function freshApp() {
    let app;
    jest.isolateModules(() => {
      app = express();
      app.use('/api/clubs', require('../routes/clubs'));
    });
    return app;
  }

  test('PARTNER_VERSION=v2 calls /api/v2/events and gets live data (stale: false)', async () => {
    process.env.PARTNER_VERSION = 'v2';
    serve = () => ({ events: [v2Event] });
    const res = await request(freshApp()).get('/api/clubs/events?clubId=c1');
    expect(seen).toEqual(['/api/v2/events?clubId=c1']);
    expect(res.body.stale).toBe(false);
    expect(res.body.data[0].startTime).toBe('2026-11-02T06:30:00+03:00');
    expect(logs.join('\n')).not.toMatch(/partner call failed/);
  });

  test('no PARTNER_VERSION means v1, and v1 now gets a real startTime too', async () => {
    serve = () => ({ events: [v1Event] });
    const res = await request(freshApp()).get('/api/clubs/events');
    expect(seen).toEqual(['/api/events']);
    expect(res.body.data[0].startTime).toBe('2026-11-02T06:30:00+03:00');
  });

  test('v1 and v2 give the page exactly the same response data', async () => {
    serve = (url) => ({ events: [url.includes('/v2/') ? v2Event : v1Event] });
    process.env.PARTNER_VERSION = 'v1';
    const a = await request(freshApp()).get('/api/clubs/events');
    process.env.PARTNER_VERSION = 'v2';
    const b = await request(freshApp()).get('/api/clubs/events');
    expect(b.body.data).toEqual(a.body.data);
  });

  test('a single event uses the version path too', async () => {
    process.env.PARTNER_VERSION = 'v2';
    serve = () => v2Event;
    const res = await request(freshApp()).get('/api/clubs/events/e1');
    expect(seen).toEqual(['/api/v2/events/e1']);
    expect(res.body.startTime).toBe('2026-11-02T06:30:00+03:00');
  });

  test('clubs are not versioned: still /api/clubs in both', async () => {
    process.env.PARTNER_VERSION = 'v2';
    serve = () => ({
      data: [{ id: 'c1', name: 'Robotics', category: 'Technology' }],
    });
    await request(freshApp()).get('/api/clubs');
    expect(seen).toEqual(['/api/clubs']);
  });

  test('the quiet failure is loud: wrong shape on v2 is logged, never shown as live', async () => {
    process.env.PARTNER_VERSION = 'v2';
    serve = () => ({ events: [v1Event] }); // e.g. they deployed v1 under /v2 by mistake
    const res = await request(freshApp()).get('/api/clubs/events');
    expect(res.body.stale).not.toBe(false);
    expect(logs.join('\n')).toMatch(/partner call failed: unexpected v2 shape/);
  });

  test('a typo in PARTNER_VERSION is a clear 500, not a guess', async () => {
    process.env.PARTNER_VERSION = 'V3';
    serve = () => ({ events: [] });
    const res = await request(freshApp()).get('/api/clubs/events');
    expect(res.status).toBe(500);
    expect(seen).toEqual([]);
    expect(logs.join('\n')).toMatch(/PARTNER_VERSION must be v1 or v2/);
  });
});
