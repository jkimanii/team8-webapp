const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("StrathShop API is running");
});

// Our own resources
const listingRoutes = require("./routes/listings");
const categoryRoutes = require("./routes/categories");
app.use("/api/listings", listingRoutes);
app.use("/api/categories", categoryRoutes);

// Upstream partner: CampusHub (Team 7), proxied so the browser talks only to us
const clubRoutes = require("./routes/clubs");
app.use("/api/clubs", clubRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
