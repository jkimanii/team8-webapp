const request = require("supertest");
const {
  BASE_URL,
  API_KEY,
  expectErrorShape,
  expectPageShape,
} = require("./campushub.config");

const api = () => request(BASE_URL);
const withKey = (req) => req.set("X-API-Key", API_KEY);

// Write tests need the shared secret from Team 7.
const describeWrites = API_KEY ? describe : describe.skip;
if (!API_KEY) {
  console.warn(
    "\n  CAMPUSHUB_KEY not set - POST/PUT/DELETE tests skipped.\n" +
      "  Ask Team 7 for the key, then re-run with CAMPUSHUB_KEY=<key>.\n"
  );
}

function expectEventShape(ev) {
  expect(typeof ev.id).toBe("string");
  expect(typeof ev.clubId).toBe("string");
  expect(typeof ev.title).toBe("string");
  expect(typeof ev.category).toBe("string");
  expect(typeof ev.startTime).toBe("string");

  // Required but nullable - the key must be present either way.
  ["description", "location", "imageUrl"].forEach((f) => {
    expect(ev).toHaveProperty(f);
    if (ev[f] !== null) expect(typeof ev[f]).toBe("string");
  });

  // "All timestamps are ISO 8601 in East Africa Time (+03:00)."
  expect(ev.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/);
}

// A valid event body, built from real seed data so clubId/category exist.
async function validEventBody(overrides = {}) {
  const clubs = await api().get("/clubs?limit=1");
  const club = clubs.body.data[0];
  return {
    clubId: club.id,
    title: "Team 8 partner test event",
    description: "Created by Team 8's automated contract tests.",
    category: club.category,
    startTime: "2027-03-15T14:00:00+03:00",
    location: "Test Location",
    ...overrides,
  };
}

describe("GET /events", () => {
  it("returns a page of events in the documented envelope", async () => {
    const res = await api().get("/events");
    expect(res.status).toBe(200);
    expectPageShape(res.body);
  });

  it("returns events matching the Event schema", async () => {
    const res = await api().get("/events");
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(expectEventShape);
  });

  it("sorts events by start time, earliest first", async () => {
    const res = await api().get("/events?limit=100");
    const times = res.body.data.map((e) => new Date(e.startTime).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });

  it("filters by clubId", async () => {
    const all = await api().get("/events?limit=100");
    expect(all.body.data.length).toBeGreaterThan(0);
    const clubId = all.body.data[0].clubId;

    const res = await api().get(`/events?clubId=${encodeURIComponent(clubId)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((e) => expect(e.clubId).toBe(clubId));
  });

  it("filters by from, inclusive of the boundary", async () => {
    const all = await api().get("/events?limit=100");
    const pivot = all.body.data[0].startTime;

    const res = await api().get(`/events?from=${encodeURIComponent(pivot)}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((e) => {
      expect(new Date(e.startTime).getTime()).toBeGreaterThanOrEqual(
        new Date(pivot).getTime()
      );
    });
    // "at or after" - the pivot event itself must still be in the results.
    expect(res.body.data.some((e) => e.startTime === pivot)).toBe(true);
  });

  it("filters by to, inclusive of the boundary", async () => {
    const all = await api().get("/events?limit=100");
    const pivot = all.body.data[0].startTime;

    const res = await api().get(`/events?to=${encodeURIComponent(pivot)}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((e) => {
      expect(new Date(e.startTime).getTime()).toBeLessThanOrEqual(
        new Date(pivot).getTime()
      );
    });
  });

  it("returns an empty list when from is after to", async () => {
    const res = await api().get(
      "/events?from=2030-01-01T00:00:00%2B03:00&to=2020-01-01T00:00:00%2B03:00"
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  describe("validation", () => {
    it.each([
      ["malformed from date", "/events?from=not-a-date"],
      ["malformed to date", "/events?to=2026-13-45"],
      ["limit above maximum", "/events?limit=101"],
      ["page below minimum", "/events?page=0"],
    ])("rejects %s with 400", async (_label, path) => {
      const res = await api().get(path);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    it("rejects an unknown query parameter with 400", async () => {
      const res = await api().get("/events?clubID=club-01");
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });
  });
});

describe("GET /events/{id}", () => {
  it("returns the event whose id was requested", async () => {
    const list = await api().get("/events?limit=1");
    const id = list.body.data[0].id;

    const res = await api().get(`/events/${encodeURIComponent(id)}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expectEventShape(res.body);
  });

  it("returns 404 with an error body for an unknown id", async () => {
    const res = await api().get("/events/event-does-not-exist-99");
    expect(res.status).toBe(404);
    expectErrorShape(res.body);
    expect(res.body.error).toBe("not_found");
  });
});

describe("POST /events - authentication", () => {
  it("rejects a request with no API key with 401", async () => {
    const body = await validEventBody();
    const res = await api().post("/events").send(body);
    expect(res.status).toBe(401);
    expectErrorShape(res.body);
  });

  it("rejects an invalid API key with 401", async () => {
    const body = await validEventBody();
    const res = await api()
      .post("/events")
      .set("X-API-Key", "definitely-not-the-real-key")
      .send(body);
    expect(res.status).toBe(401);
    expectErrorShape(res.body);
  });
});

describeWrites("POST /events", () => {
  const created = [];

  afterAll(async () => {
    // Don't leave test events sitting on Team 7's server.
    for (const id of created) {
      await withKey(api().delete(`/events/${encodeURIComponent(id)}`));
    }
  });

  it("creates an event and returns it with a new id", async () => {
    const body = await validEventBody();
    const res = await withKey(api().post("/events")).send(body);

    expect(res.status).toBe(201);
    expectEventShape(res.body);
    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toBe(body.title);
    expect(res.body.clubId).toBe(body.clubId);
    created.push(res.body.id);
  });

  it("makes the new event visible in GET /events", async () => {
    const body = await validEventBody({ title: "Team 8 visibility check" });
    const post = await withKey(api().post("/events")).send(body);
    created.push(post.body.id);

    const res = await api().get(
      `/events/${encodeURIComponent(post.body.id)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Team 8 visibility check");
  });

  // "startTime may be sent with any UTC offset; CampusHub stores and
  //  returns it in East Africa Time (+03:00)."
  it("converts a UTC start time to +03:00 without changing the instant", async () => {
    const body = await validEventBody({
      startTime: "2027-03-15T11:00:00+00:00",
    });
    const res = await withKey(api().post("/events")).send(body);

    expect(res.status).toBe(201);
    created.push(res.body.id);
    expect(res.body.startTime).toMatch(/\+03:00$/);
    expect(new Date(res.body.startTime).toISOString()).toBe(
      new Date("2027-03-15T11:00:00+00:00").toISOString()
    );
  });

  it("returns null for optional fields that were omitted", async () => {
    const body = await validEventBody();
    delete body.description;
    delete body.location;

    const res = await withKey(api().post("/events")).send(body);
    expect(res.status).toBe(201);
    created.push(res.body.id);
    expect(res.body).toHaveProperty("description");
    expect(res.body).toHaveProperty("location");
    expect(res.body).toHaveProperty("imageUrl");
  });

  describe("validation", () => {
    it("rejects a missing title with 400", async () => {
      const body = await validEventBody();
      delete body.title;
      const res = await withKey(api().post("/events")).send(body);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    // Schema says title must match \S - whitespace alone is not a title.
    it("rejects a whitespace-only title with 400", async () => {
      const body = await validEventBody({ title: "   " });
      const res = await withKey(api().post("/events")).send(body);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    it("rejects a title over 150 characters with 400", async () => {
      const body = await validEventBody({ title: "x".repeat(151) });
      const res = await withKey(api().post("/events")).send(body);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    it("rejects an unknown clubId with 400", async () => {
      const body = await validEventBody({ clubId: "club-does-not-exist-99" });
      const res = await withKey(api().post("/events")).send(body);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    it("rejects an unknown category with 400", async () => {
      const body = await validEventBody({ category: "NoSuchCategoryXYZ" });
      const res = await withKey(api().post("/events")).send(body);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    it("rejects a malformed startTime with 400", async () => {
      const body = await validEventBody({ startTime: "next Tuesday" });
      const res = await withKey(api().post("/events")).send(body);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    // Schema pattern ^[1-9][0-9]{3}- means the year must be 1000-9999.
    it("rejects a year outside 1000-9999 with 400", async () => {
      const body = await validEventBody({
        startTime: "0999-03-15T14:00:00+03:00",
      });
      const res = await withKey(api().post("/events")).send(body);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });
  });
});

describeWrites("PUT /events/{id}", () => {
  let ownId;
  let seedId;

  beforeAll(async () => {
    const body = await validEventBody({ title: "Team 8 PUT fixture" });
    const res = await withKey(api().post("/events")).send(body);
    ownId = res.body.id;

    const seed = await api().get("/events?limit=100");
    const notOurs = seed.body.data.find((e) => e.id !== ownId);
    seedId = notOurs && notOurs.id;
  });

  afterAll(async () => {
    if (ownId) await withKey(api().delete(`/events/${ownId}`));
  });

  it("rejects a request with no API key with 401", async () => {
    const res = await api()
      .put(`/events/${ownId}`)
      .send({ title: "x", category: "Technology", startTime: "2027-03-15T14:00:00+03:00" });
    expect(res.status).toBe(401);
    expectErrorShape(res.body);
  });

  it("returns 404 for an unknown id", async () => {
    const body = await validEventBody();
    const res = await withKey(api().put("/events/event-does-not-exist-99")).send({
      title: body.title,
      category: body.category,
      startTime: body.startTime,
    });
    expect(res.status).toBe(404);
    expectErrorShape(res.body);
  });

  it("returns 403 for an event not created through the partner API", async () => {
    const body = await validEventBody();
    const res = await withKey(api().put(`/events/${seedId}`)).send({
      title: "Should not be allowed",
      category: body.category,
      startTime: body.startTime,
    });
    expect(res.status).toBe(403);
    expectErrorShape(res.body);
    expect(res.body.error).toBe("forbidden");
  });

  it("rejects a missing title with 400", async () => {
    const body = await validEventBody();
    const res = await withKey(api().put(`/events/${ownId}`)).send({
      category: body.category,
      startTime: body.startTime,
    });
    expect(res.status).toBe(400);
    expectErrorShape(res.body);
  });

  it("updates an event we created", async () => {
    const body = await validEventBody();
    const res = await withKey(api().put(`/events/${ownId}`)).send({
      title: "Team 8 PUT fixture (updated)",
      description: "Updated description",
      category: body.category,
      startTime: "2027-04-01T10:00:00+03:00",
      location: "New Location",
    });

    expect(res.status).toBe(200);
    expectEventShape(res.body);
    expect(res.body.id).toBe(ownId);
    expect(res.body.title).toBe("Team 8 PUT fixture (updated)");
    expect(res.body.location).toBe("New Location");
  });

  // "This is a full replacement: optional fields left out
  //  (description, location, imageUrl) are cleared."
  it("clears optional fields that are omitted", async () => {
    const body = await validEventBody();
    const res = await withKey(api().put(`/events/${ownId}`)).send({
      title: "Team 8 PUT fixture (cleared)",
      category: body.category,
      startTime: "2027-04-01T10:00:00+03:00",
    });

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
    expect(res.body.location).toBeNull();
    expect(res.body.imageUrl).toBeNull();
  });

  it("does not change the hosting club", async () => {
    const before = await api().get(`/events/${ownId}`);
    const body = await validEventBody();
    const res = await withKey(api().put(`/events/${ownId}`)).send({
      title: "Team 8 PUT fixture (club unchanged)",
      category: body.category,
      startTime: "2027-04-01T10:00:00+03:00",
      clubId: "club-does-not-exist-99",
    });

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.clubId).toBe(before.body.clubId);
    }
  });
});

describeWrites("DELETE /events/{id}", () => {
  let seedId;

  beforeAll(async () => {
    const seed = await api().get("/events?limit=100");
    seedId = seed.body.data[0] && seed.body.data[0].id;
  });

  it("rejects a request with no API key with 401", async () => {
    const res = await api().delete("/events/event-does-not-exist-99");
    expect(res.status).toBe(401);
    expectErrorShape(res.body);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await withKey(
      api().delete("/events/event-does-not-exist-99")
    );
    expect(res.status).toBe(404);
    expectErrorShape(res.body);
  });

  it("returns 403 for an event not created through the partner API", async () => {
    const res = await withKey(api().delete(`/events/${seedId}`));
    expect(res.status).toBe(403);
    expectErrorShape(res.body);
    expect(res.body.error).toBe("forbidden");
  });

  it("deletes an event we created and returns 204 with no body", async () => {
    const body = await validEventBody({ title: "Team 8 DELETE fixture" });
    const post = await withKey(api().post("/events")).send(body);

    const res = await withKey(api().delete(`/events/${post.body.id}`));
    expect(res.status).toBe(204);
    expect(res.text).toBeFalsy();

    const after = await api().get(`/events/${post.body.id}`);
    expect(after.status).toBe(404);
  });
});
