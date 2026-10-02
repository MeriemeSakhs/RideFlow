const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { searchAddressSuggestions } = require("../utilities/geocoding");

// Address autocomplete for the Create Ride form (and reusable as-is by any
// future reservation flow) - proxies Nominatim from the backend (see
// utilities/geocoding.js) so every request carries the required
// descriptive User-Agent, and so the browser never talks to Nominatim
// directly. The frontend debounces keystrokes before ever calling this
// (see frontend/src/utilities/addressSuggestions.js); this endpoint does
// no additional throttling of its own beyond what that debounce already provides.
router.get("/search", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") return res.json([]);

  try {
    const suggestions = await searchAddressSuggestions(q);
    res.json(suggestions);
  } catch (error) {
    res.status(500).send({ message: "Could not search addresses" });
  }
});

module.exports = router;
