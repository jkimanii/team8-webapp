//   curl http://localhost:4000/__mode/ok      normal, answers at once
//   curl http://localhost:4000/__mode/slow    answers after 10 seconds
//   curl http://localhost:4000/__mode/flaky   fails twice (503), then works
//   curl http://localhost:4000/__mode/error   always fails (500)
//
// Point your server at it with CAMPUSHUB_URL=http://localhost:4000/api in
// server/.env, restart, and put the real URL back afterwards.
const http = require('http');

const PORT = process.env.PORT || 4000;
let mode = 'ok';
const burst = {}; // per path: { count, last } for flaky mode

const clubs = [
  {
    id: 'club-01',
    name: 'Robotics Club',
    description: 'Builds and competes with autonomous robots.',
    category: 'Technology',
    logoUrl: null,
    meetingTime: 'Tuesdays, 6:00 PM',
    meetingLocation: 'Engineering Block, Room 204',
    tags: ['robots'],
  },
  {
    id: 'club-02',
    name: 'Debate Society',
    description: 'Weekly debates and tournaments.',
    category: 'Academic',
    logoUrl: null,
    meetingTime: 'Thursdays, 5:30 PM',
    meetingLocation: 'Main Hall',
    tags: ['debate'],
  },
  {
    id: 'club-03',
    name: 'Photography Club',
    description: 'Photo walks and workshops.',
    category: 'Arts',
    logoUrl: null,
    meetingTime: 'Saturdays, 10:00 AM',
    meetingLocation: 'Student Centre',
    tags: ['photos'],
  },
];
const events = [
  {
    id: 'event-01',
    clubId: 'club-01',
    title: 'Robotics Open House',
    description: "Live demos of this semester's robots.",
    category: 'Technology',
    startTime: '2026-11-05T14:00:00+03:00',
    location: 'Engineering Block, Room 204',
    imageUrl: null,
  },
  {
    id: 'event-02',
    clubId: 'club-02',
    title: 'Inter-Varsity Debate Final',
    description: 'The final of the debate series.',
    category: 'Academic',
    startTime: '2026-11-12T17:30:00+03:00',
    location: 'Main Hall',
    imageUrl: null,
  },
];

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

http
  .createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname.replace(
      /\/+$/,
      ''
    );

    const m = path.match(/^\/__mode\/(\w+)$/);
    if (m) {
      if (!['ok', 'slow', 'flaky', 'error'].includes(m[1])) {
        return send(res, 400, {
          message: 'mode must be ok, slow, flaky or error',
        });
      }
      mode = m[1];
      for (const k of Object.keys(burst)) delete burst[k];
      console.log(`--- mode is now ${mode}`);
      return send(res, 200, { mode });
    }

    if (path !== '/api/clubs' && path !== '/api/events') {
      return send(res, 404, { error: 'not_found', message: 'No such route' });
    }

    // Flaky: the first two hits of each burst fail, the rest work. A burst
    // ends after 2 quiet seconds. (So a page that asks twice at once, or a
    // retry, still ends up with an answer, like a real momentary failure.)
    const b = (burst[path] ||= { count: 0, last: 0 });
    const now = Date.now();
    if (now - b.last > 2000) b.count = 0;
    b.count += 1;
    b.last = now;

    console.log(`GET ${path} (hit ${b.count}, mode ${mode})`);

    if (mode === 'slow') await new Promise((r) => setTimeout(r, 10000));
    if (mode === 'flaky' && b.count <= 2)
      return send(res, 503, { message: 'Try again' });
    if (mode === 'error') return send(res, 500, { message: 'Internal error' });

    const list = path === '/api/clubs' ? clubs : events;
    send(res, 200, { data: list, page: 1, limit: 20, total: list.length });
  })
  .listen(PORT, () =>
    console.log(`Stand-in CampusHub on http://localhost:${PORT}/api (mode ok)`)
  );
