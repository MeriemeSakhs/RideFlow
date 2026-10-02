const express = require("express");
const router = express.Router();
const companyModel = require("../models/companyModel");
const { requireAuth, requireRole } = require("../middleware/auth");

// Public - no auth, and intentionally no sensitive data (no referenceNumber,
// no companyId). Used purely to show "Signing in to <Company Name>" on a
// company-specific login page (rideflow.com/<slug>/login) before the
// visitor has any account/session. Slugs are meant to be public URLs, so
// there's no information-leak concern in a plain 404 for an unknown one.
// This is display-only: it plays no role in authorization anywhere - every
// authenticated route still derives companyId exclusively from the
// verified JWT (see middleware/auth.js), never from this or any URL param.
router.get("/by-slug/:slug", async (req, res) => {
  try {
    const company = await companyModel.findOne({ slug: String(req.params.slug).toLowerCase() }).select("companyName slug");
    if (!company) return res.status(404).send({ message: "Company not found" });
    res.json({ companyName: company.companyName, slug: company.slug });
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve company information" });
  }
});

// Manager-only - the reference number must never reach a Dispatcher, so this
// whole route is gated by role, not just the frontend hiding it.
router.get("/", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const company = await companyModel.findById(req.user.companyId).select("companyName referenceNumber createdAt");
    if (!company) return res.status(404).send({ message: "Company not found" });
    res.json(company);
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve company information" });
  }
});

module.exports = router;
