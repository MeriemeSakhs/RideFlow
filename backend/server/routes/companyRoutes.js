const express = require("express");
const router = express.Router();
const companyModel = require("../models/companyModel");
const { requireAuth, requireRole } = require("../middleware/auth");

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
