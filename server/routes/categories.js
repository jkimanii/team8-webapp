const express = require("express");
const router = express.Router();
const db = require("../db");

// Mapping step: the DB's primary key is category_id, the contract promises id
function mapCategory(row) {
  return {
    id: row.category_id,
    label: row.label,
  };
}

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT category_id, label FROM categories");
    res.json(rows.map(mapCategory));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT category_id, label FROM categories WHERE category_id = ?",
      [req.params.id],
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
