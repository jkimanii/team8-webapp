const express = require('express');
const router = express.Router();

const CAMPUSHUB_BASE =
  process.env.CAMPUSHUB_URL ||
  'https://movable-eastcoast-showman.ngrok-free.dev';

async function proxy(url, res) {
  try {
    const upstream = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Accept: 'application/json',
      },
    });

    const body = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return res.status(upstream.status).json(
        body || {
          error: 'upstream_error',
          message: `CampusHub returned ${upstream.status}`,
        }
      );
    }

    // Normalize response if Team 7 returns { clubs: [...] } instead of { data: [...] }
    if (body && Array.isArray(body.clubs)) {
      return res.json({
        data: body.clubs,
        page: 1,
        limit: body.clubs.length,
        total: body.clubs.length,
      });
    }

    res.json(body);
  } catch (err) {
    console.error('CampusHub unreachable:', err.message);
    res.status(502).json({
      error: 'upstream_unavailable',
      message: 'Could not reach CampusHub.',
    });
  }
}

// EVENTS ROUTES
router.get('/events', async (req, res) => {
  await proxy(`${CAMPUSHUB_BASE}/api/events`, res);
});

router.get('/events/:id', async (req, res) => {
  await proxy(
    `${CAMPUSHUB_BASE}/api/events/${encodeURIComponent(req.params.id)}`,
    res
  );
});

// CLUBS ROUTES
router.get('/', async (req, res) => {
  await proxy(`${CAMPUSHUB_BASE}/api/clubs`, res);
});

router.get('/:id', async (req, res) => {
  await proxy(
    `${CAMPUSHUB_BASE}/api/clubs/${encodeURIComponent(req.params.id)}`,
    res
  );
});

module.exports = router;
