const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.type('html').send(`
    <h1>StrathShop API</h1>
    <p>All endpoints live under <code>/api</code>.</p>
    <ul>
      <li><a href="/api/listings?category=wellness">Try it: wellness listings</a></li>
      <li><a href="/api/listings?category=counseling">Try it: counseling listings</a></li>
      <li><a href="/api/categories">Try it: categories</a></li>
    </ul>`);
});

const listingRoutes = require('./routes/listings');
const categoryRoutes = require('./routes/categories');
const clubRoutes = require('./routes/clubs');

app.use('/api/listings', listingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/clubs', clubRoutes);

module.exports = app;
