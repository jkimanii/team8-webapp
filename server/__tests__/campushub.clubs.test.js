const request = require("supertest");
const {
  BASE_URL,
  expectErrorShape,
  expectPageShape,
} = require("./campushub.config");

const api = () => request(BASE_URL);

// Every field CampusHub marks as required on Club.
function expectClubShape(club) {
  expect(typeof club.id).toBe("string");
  expect(typeof club.name).toBe("string");
  expect(typeof club.category).toBe("string");
  expect(Array.isArray(club.tags)).toBe(true);
  club.tags.forEach((t) => expect(typeof t).toBe("string"));

  // Required but nullable: the key must exist even when the value is null.
  ["description", "logoUrl", "meetingTime", "meetingLocation"].forEach((f) => {
    expect(club).toHaveProperty(f);
    if (club[f] !== null) expect(typeof club[f]).toBe("string");
  });
}

describe("GET /clubs", () => {
  it("returns a page of clubs in the documented envelope", async () => {
    const res = await api().get("/clubs");
    expect(res.status).toBe(200);
    expectPageShape(res.body);
  });

  it("returns clubs matching the Club schema", async () => {
    const res = await api().get("/clubs");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(expectClubShape);
  });

  it("sorts clubs by name A to Z", async () => {
    const res = await api().get("/clubs?limit=100");
    const names = res.body.data.map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("searches case-insensitively over name, description and tags", async () => {
    const all = await api().get("/clubs?limit=100");
    expect(all.body.data.length).toBeGreaterThan(0);

    // Build a query from a real club so the test works against any seed data.
    const term = all.body.data[0].name.split(" ")[0].toUpperCase();
    const res = await api().get(`/clubs?search=${encodeURIComponent(term)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const hit = res.body.data.some((c) =>
      [c.name, c.description || "", ...c.tags]
        .join(" ")
        .toUpperCase()
        .includes(term)
    );
    expect(hit).toBe(true);
  });

  it("returns an empty list for an unknown category, not an error", async () => {
    const res = await api().get("/clubs?category=NoSuchCategoryXYZ");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("respects the limit parameter", async () => {
    const res = await api().get("/clubs?limit=1");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(1);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it("reports total as the count across all pages, not the page size", async () => {
    const page = await api().get("/clubs?limit=1");
    const all = await api().get("/clubs?limit=100");
    expect(page.body.total).toBe(all.body.total);
  });

  it("returns an empty page past the end rather than an error", async () => {
    const res = await api().get("/clubs?page=999999");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  describe("validation", () => {
    it.each([
      ["limit below minimum", "/clubs?limit=0"],
      ["limit above maximum", "/clubs?limit=101"],
      ["page below minimum", "/clubs?page=0"],
      ["non-numeric limit", "/clubs?limit=abc"],
    ])("rejects %s with 400", async (_label, path) => {
      const res = await api().get(path);
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });

    // Their stated convention: "a typo like ?serach= fails loudly".
    it("rejects an unknown query parameter with 400", async () => {
      const res = await api().get("/clubs?serach=robotics");
      expect(res.status).toBe(400);
      expectErrorShape(res.body);
    });
  });
});

describe("GET /clubs/{id}", () => {
  it("returns the club whose id was requested", async () => {
    const list = await api().get("/clubs?limit=1");
    const id = list.body.data[0].id;

    const res = await api().get(`/clubs/${encodeURIComponent(id)}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expectClubShape(res.body);
  });

  it("returns 404 with an error body for an unknown id", async () => {
    const res = await api().get("/clubs/club-does-not-exist-99");
    expect(res.status).toBe(404);
    expectErrorShape(res.body);
    expect(res.body.error).toBe("not_found");
  });
});
