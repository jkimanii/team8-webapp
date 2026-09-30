const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * Mapping step. Two deliberate differences from the database row:
 *   category_id -> id   the contract never exposes our column names
 *   label lowercased    so it is the same string as a listing's `category`
 *                       and the ?category= filter value. Capitalising for
 *                       display is the consumer's job.
 */
function mapCategory(row) {
  return {
    id: row.category_id,
    label: String(row.label).toLowerCase(),
  };
}

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT category_id, label FROM categories");
    res.json(rows.map(mapCategory));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/:id
router.get("/:id", async (req, res) => {
  // Same guard as listings: "8abc" would otherwise coerce to 8 and return
  // Wellness. The contract documents only 200 and 404 here.
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ error: "Category not found" });
  }

  try {
    const [rows] = await db.query(
      "SELECT category_id, label FROM categories WHERE category_id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(mapCategory(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

module.exports = router;
