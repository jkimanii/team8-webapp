// Shared config for the CampusHub (Team 7) partner tests.
//
// Their contract lists http://localhost:5000/v1 as the server, but that is
// OUR port. Point CAMPUSHUB_URL at wherever their server is actually running
// before running these tests:
//
//   Windows:  set CAMPUSHUB_URL=http://192.168.1.50:4000/v1 && npx jest campushub
//   bash:     CAMPUSHUB_URL=http://192.168.1.50:4000/v1 npx jest campushub

const BASE_URL = process.env.CAMPUSHUB_URL || "http://localhost:4000/v1";
const API_KEY = process.env.CAMPUSHUB_KEY || "";

// Every error body in their contract is {error, message}, both required.
function expectErrorShape(body) {
  expect(body).toHaveProperty("error");
  expect(body).toHaveProperty("message");
  expect(typeof body.error).toBe("string");
  expect(typeof body.message).toBe("string");
  expect(body.error.length).toBeGreaterThan(0);
  expect(body.message.length).toBeGreaterThan(0);
}

// Every list endpoint returns {data, page, limit, total}.
function expectPageShape(body) {
  expect(Array.isArray(body.data)).toBe(true);
  expect(typeof body.page).toBe("number");
  expect(typeof body.limit).toBe("number");
  expect(typeof body.total).toBe("number");
}

module.exports = { BASE_URL, API_KEY, expectErrorShape, expectPageShape };
