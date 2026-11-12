/*
The ONE place that knows the shape of Team 7's (CampusHub) events.

Their v2 change (Team 7 ring bulletin, 12 Nov 2026): each event has a single
ISO 8601 `startTime` ("2026-11-02T06:30:00+03:00") instead of separate `date`
("2026-11-02") and `time` ("06:30") strings. Nothing else changed: clubs, the
{ "events": [...] } envelope, ids, keys and errors are the same.
v1 stops working on 30 Nov 2026.

Which version we call is chosen by PARTNER_VERSION in server/.env (v1 or v2),
so migrating, and rolling back, is a one-word change.

Each version has its own parser, and both give the rest of our code the same
thing: an event with a `startTime`. A parser that gets the wrong shape THROWS,
so a wrong version fails loudly (a "partner call failed" line in our log)
instead of quietly showing every event as "TBA".
*/

// v1 gives "2026-11-02" and "06:30" in East Africa Time, with no time zone.
// Joining them with +03:00 gives the same moment v2 sends.
function joinDateTime(date, time) {
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  return `${date}T${hhmmss}+03:00`;
}

const isDate = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s));

const versions = {
  v1: {
    eventsPath: '/events',
    parseEvent(e) {
      if (typeof e.date !== 'string' || typeof e.time !== 'string') {
        throw new Error('unexpected v1 shape: event has no date/time');
      }
      const startTime = joinDateTime(e.date, e.time);
      if (!isDate(startTime))
        throw new Error('unexpected v1 shape: bad date/time');
      return { ...e, startTime };
    },
  },
  v2: {
    eventsPath: '/v2/events',
    parseEvent(e) {
      if (!isDate(e.startTime)) {
        throw new Error('unexpected v2 shape: event has no startTime');
      }
      return e;
    },
  },
};

// Read at call time, so a changed .env is picked up after a restart.
// An unknown value is a configuration mistake: say so, never guess.
function current() {
  const name = (process.env.PARTNER_VERSION || 'v1').trim();
  const version = versions[name];
  if (!version) {
    throw new Error(`PARTNER_VERSION must be v1 or v2, not "${name}"`);
  }
  return { name, ...version };
}

module.exports = { versions, current, joinDateTime };
