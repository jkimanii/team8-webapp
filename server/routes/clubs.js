const express = require("express");
const router = express.Router();

// Upstream partner: Team 7 (CampusHub). Their contract's server block lists
// port 5000, which is ours, so this must be set to wherever they actually run.
const CAMPUSHUB_URL = process.env.CAMPUSHUB_URL || "http://localhost:4000/v1";

// CampusHub rejects unknown query parameters with 400 ("a typo like ?serach=
// fails loudly"), so only forward the four their contract documents.
const ALLOWED_PARAMS = ["search", "category", "page", "limit"];

function buildQuery(query) {
  const params = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    const value = query[key];
    if (value !== undefined && value !== "") params.append(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function proxy(url, res) {
  try {
    const upstream = await fetch(url);
    const body = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      // Pass their status and error body through unchanged so the UI can
      // show what CampusHub actually said.
      return res.status(upstream.status).json(
        body || {
          error: "upstream_error",
          message: `CampusHub returned ${upstream.status}`,
        }
      );
    }

    res.json(body);
  } catch (err) {
    console.error("CampusHub unreachable:", err.message);
    res.status(502).json({
      error: "upstream_unavailable",
      message:
        "Could not reach CampusHub. Check that their server is running and CAMPUSHUB_URL is correct.",
    });
  }
}

// GET /api/clubs -> CampusHub GET /clubs
router.get("/", async (req, res) => {
  await proxy(`${CAMPUSHUB_URL}/clubs${buildQuery(req.query)}`, res);
});

// GET /api/clubs/:id -> CampusHub GET /clubs/{id}
router.get("/:id", async (req, res) => {
  await proxy(
    `${CAMPUSHUB_URL}/clubs/${encodeURIComponent(req.params.id)}`,
    res
  );
});

module.exports = router;
