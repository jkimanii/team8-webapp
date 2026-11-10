// v1: FROZEN. Do not change the shape of anything here.
//
// v1 IS the existing listings.js and categories.js routers, mounted unchanged.
// Nothing was moved or edited, so nothing can have changed by accident. This
// file only adds the deprecation headers in front of them.
const express = require('express');
const listingRoutes = require('./listings');
const categoryRoutes = require('./categories');
const { deprecated } = require('../middleware/deprecate');

// The day v1 stops working. Set it to a date Group 9 can meet, no later than
// the day before Demo Day. Change it only here: the tests read it from here.
const SUNSET = '2026-11-13';

const router = express.Router();

router.use(
  '/listings',
  deprecated({ sunset: SUNSET, successor: '/api/v2/listings' }),
  listingRoutes
);
router.use(
  '/categories',
  deprecated({ sunset: SUNSET, successor: '/api/v2/categories' }),
  categoryRoutes
);

module.exports = router;
module.exports.SUNSET = SUNSET;
