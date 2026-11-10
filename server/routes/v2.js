// v2: the same data and the same handlers as v1, with ONE change:
// a list comes back as { data: [...], count: N } instead of a bare [...].
//
// Single listings, single categories, the PATCH reply and error bodies are
// objects, so they pass through exactly as in v1.
const express = require('express');
const listingRoutes = require('./listings');
const categoryRoutes = require('./categories');

const router = express.Router();

// The one place the v2 shape is decided. It wraps res.json for v2 requests
// only: when a handler sends an array, v2 sends it wrapped instead.
function wrapLists(req, res, next) {
  const send = res.json.bind(res);
  res.json = (body) =>
    Array.isArray(body) ? send({ data: body, count: body.length }) : send(body);
  next();
}

router.use(wrapLists);
router.use('/listings', listingRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;
