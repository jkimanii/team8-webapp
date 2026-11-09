const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const requireApiKey = require('./middleware/requireApiKey');
const rateLimit = require('./middleware/rateLimit');

const app = express();

// Render sits behind a proxy; without this every visitor would look like the
// same IP to the rate limiter.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.type('html').send(`
    <h1>StrathShop API</h1>
    <p>All endpoints live under <code>/api</code> and need an
    <code>X-API-Key</code> header.</p>
    <ul>
      <li><a href="/docs/">API documentation</a></li>
      <li><a href="/openapi.yaml">OpenAPI contract</a></li>
      <li><a href="/api/health">Health check</a></li>
    </ul>`);
});

// The one public API endpoint: no data, no parameters, and it is what the
// uptime monitor calls. The SELECT 1 checks the database is reachable too.
app.get(
  '/api/health',
  rateLimit({ windowMs: 60000, max: 30 }),
  async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('health check failed:', err.code || err.message);
      res.status(503).json({ status: 'unavailable' });
    }
  }
);

// Everything registered below this line needs a valid key. Order matters:
// this must come BEFORE the routes, or they would be open.
requireApiKey.loadConsumers(); // logs how many keys loaded (never the keys)
app.use(
  '/api',
  requireApiKey,
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  })
);

const listingRoutes = require('./routes/listings');
const categoryRoutes = require('./routes/categories');
const clubRoutes = require('./routes/clubs');

app.use('/api/listings', listingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/clubs', clubRoutes);

// Errors are JSON too, and never a stack trace or a file path.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;

   const { monitor, statsHandler } = require('./middleware/monitoring');
   app.use(monitor);                                   // FIRST
app.use(requireApiKey);
app.use(rateLimit({ windowMs: 60000, max: 100 }));
app.get('/stats', statsHandler);  

   
