const express = require('express');
const router = express.Router();
const db = require('../db');

// The categories this contract exposes to Group 9. Compared case-insensitively.
const CONTRACT_CATEGORIES = ['wellness', 'counseling'];

// The only two values a listing's availability may take.
const VALID_STATUSES = ['available', 'booked'];

// One SELECT, reused by both routes; each appends its own WHERE clause.
const BASE_QUERY = `
  SELECT
    listings.id,
    listings.title,
    listings.price,
    listings.\`condition\`,
    listings.description,
    listings.image_url    AS imageUrl,
    listings.status,
    listings.created_at   AS datePosted,
    categories.label      AS category,
    users.name            AS sellerName,
    users.campus          AS sellerCampus
  FROM listings
  JOIN categories ON listings.category_id = categories.category_id
  JOIN users      ON listings.seller_id   = users.user_id
`;

/**
 * Turn one raw database row into the exact shape the contract promises.
 * Every identifier-style value is lowercased here, so the API is the single
 * place casing is decided and the database is free to store "Wellness".
 */
function mapListing(row) {
  const category = String(row.category).toLowerCase();

  const listing = {
    id: row.id,
    title: row.title,
    price: Number(row.price), // DECIMAL arrives from mysql2 as a string
    description: row.description,
    category,
    condition: row.condition, // display text: kept as stored
    status: String(row.status).toLowerCase(),
    imageUrl: row.imageUrl,
    sellerName: row.sellerName,
    sellerCampus: row.sellerCampus,
    datePosted: new Date(row.datePosted).toISOString(),
  };

  // The two contract schemas differ by exactly one field.
  if (category === 'counseling') {
    listing.providerName = row.sellerName;
  }

  return listing;
}

// GET /api/listings           -> the full catalogue
// GET /api/listings?category= -> wellness or counseling, any casing
router.get('/', async (req, res) => {
  const { category } = req.query;

  // Validate before querying: an unknown category is a 400, not an empty array.
  if (category !== undefined) {
    const normalised = String(category).trim().toLowerCase();
    if (!CONTRACT_CATEGORIES.includes(normalised)) {
      return res.status(400).json({
        error: `category must be one of: ${CONTRACT_CATEGORIES.join(
          ', '
        )} (case-insensitive)`,
      });
    }
  }

  try {
    let sql = BASE_QUERY;
    const params = [];

    if (category) {
      // LOWER() on both sides states the intent explicitly rather than relying on the table's collation to be case-insensitive.
      sql += ' WHERE LOWER(categories.label) = LOWER(?)';
      params.push(String(category).trim());
    }

    const [rows] = await db.query(sql, params);
    res.json(rows.map(mapListing));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/:id
router.get('/:id', async (req, res) => {
  // The contract types id as an integer. MySQL would coerce "1abc" to 1 and
  // happily return listing 1, so reject anything that is not a plain positive
  // integer. It is a 404 rather than a 400 because the contract documents only
  // 200 and 404 on this path.
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  try {
    const [rows] = await db.query(`${BASE_QUERY} WHERE listings.id = ?`, [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(mapListing(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

/*
PATCH /api/listings/:id/availability
Called when a booking action in the Strathmore Mental Health App consumes a
listing (a doctor accepting an appointment, a wellness item being claimed).
Deliberately scoped to `status`: it cannot touch title, price or anything else.
*/
router.patch('/:id/availability', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const status = req.body && req.body.status;

  if (typeof status !== 'string') {
    return res.status(400).json({ error: 'status is required' });
  }

  const normalised = status.trim().toLowerCase();

  if (!VALID_STATUSES.includes(normalised)) {
    return res.status(400).json({
      error: `status must be one of: ${VALID_STATUSES.join(
        ', '
      )} (case-insensitive)`,
    });
  }

  try {
    const [result] = await db.query(
      'UPDATE listings SET status = ? WHERE id = ?',
      [normalised, req.params.id]
    );

    /*
    affectedRows counts rows MATCHED by the WHERE clause. mysql2 also exposes
    changedRows, which counts only rows whose value actually differed - using
    that would 404 when setting 'booked' on an already-booked listing, even
    though the listing exists and the end state is correct. Sending the same
    PATCH twice is meant to succeed both times; that is what idempotent means.
    */
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ status: normalised });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

module.exports = router;
