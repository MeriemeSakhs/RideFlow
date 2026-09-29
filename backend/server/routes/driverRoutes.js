const express = require("express");
const router = express.Router();
const Driver = require("../models/driverModel");
const { driverCreateValidation } = require("../models/driverValidator");
const { requireAuth, requireRole } = require("../middleware/auth");

// List drivers for the caller's own company, optionally filtered by status
// (?status=available - what the ride-assignment UI uses). companyId always
// comes from the verified JWT, never the request.
router.get("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { status } = req.query;

  if (status && !Driver.schema.path("status").enumValues.includes(status)) {
    return res.status(400).send({ message: "Invalid driver status filter" });
  }

  try {
    const filter = { companyId: req.user.companyId, ...(status ? { status } : {}) };
    const drivers = await Driver.find(filter).sort({ name: 1 });
    res.json(drivers);
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve drivers" });
  }
});

// Manager-only - adds a driver to the manager's own company/fleet.
router.post("/", requireAuth, requireRole("manager"), async (req, res) => {
  const { success, data, error } = driverCreateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const existingDriver = await Driver.findOne({ licenseNumber: data.licenseNumber });
    if (existingDriver) return res.status(409).send({ message: "A driver with this license number already exists" });

    const driver = new Driver({ ...data, companyId: req.user.companyId });
    const savedDriver = await driver.save();
    res.status(201).json(savedDriver);
  } catch (err) {
    res.status(400).send({ message: "Could not create driver" });
  }
});

module.exports = router;
