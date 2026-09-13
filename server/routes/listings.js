const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
  SELECT
    listings.id,
    listings.title,
    listings.price,
    listings.\`condition\`,
    listings.description,
    listings.image_url AS imageUrl,
    categories.label AS category,
    users.name AS sellerName,
    users.campus AS sellerCampus,
    listings.created_at AS datePosted
  FROM listings
  JOIN categories ON listings.category_id = categories.category_id
  JOIN users ON listings.seller_id = users.user_id
`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

module.exports = router;
