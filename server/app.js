const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('StrathShop API is running');
});

const listingRoutes = require('./routes/listings');
const categoryRoutes = require('./routes/categories');
const clubRoutes = require('./routes/clubs');

app.use('/api/listings', listingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/clubs', clubRoutes);

module.exports = app;
