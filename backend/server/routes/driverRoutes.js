const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Driver = require("../models/driverModel");
const Ride = require("../models/rideModel");
const { driverCreateValidation } = require("../models/driverValidator");
const { requireAuth, requireRole } = require("../middleware/auth");
const { BLOCKING_RIDE_STATUSES, hasScheduleConflict } = require("../utilities/driverSchedule");

// List drivers for the caller's own company. Two modes:
// - ?pickupDate=<ISO> (what the Assign Driver modal uses) - schedule-aware:
//   a driver's Driver.status is no longer the whole answer to "are they
//   free", since they can legitimately be busy with one ride and still free
//   for a different, non-overlapping one. Only status "unavailable" is
//   still an absolute exclusion; everyone else is checked against their
//   actual scheduled rides for a conflict with THIS pickup time.
// - ?status=<value> (unchanged) - a plain snapshot filter on Driver.status,
//   e.g. still used by DriversTable's "Available"/"Assigned" counts, which
//   are asking "what is this driver's current status", a different
//   question from "are they free for ride X".
// companyId always comes from the verified JWT, never the request.
router.get("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { status, pickupDate, estimatedDurationMinutes } = req.query;

  if (pickupDate) {
    if (Number.isNaN(new Date(pickupDate).getTime())) {
      return res.status(400).send({ message: "Invalid pickupDate" });
    }
    // Optional - lets the caller (the Assign Driver modal, passing the
    // actual ride's own estimatedDurationMinutes when it has one) check
    // against the real duration that ride will occupy rather than always
    // falling back to the default (see utilities/driverSchedule.js).
    let parsedDuration;
    if (estimatedDurationMinutes !== undefined) {
      parsedDuration = Number(estimatedDurationMinutes);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        return res.status(400).send({ message: "Invalid estimatedDurationMinutes" });
      }
    }
    const candidateRide = { rideDate: pickupDate, estimatedDurationMinutes: parsedDuration };

    try {
      const candidateDrivers = await Driver.find({ companyId: req.user.companyId, status: { $nin: ["unavailable", "removed"] } }).sort({
        name: 1,
      });
      const driverIds = candidateDrivers.map((d) => d._id);

      const blockingRides = await Ride.find({
        companyId: req.user.companyId,
        assignedDriver: { $in: driverIds },
        status: { $in: BLOCKING_RIDE_STATUSES },
      }).select("assignedDriver rideDate estimatedDurationMinutes");

      const ridesByDriverId = new Map();
      for (const ride of blockingRides) {
        const key = ride.assignedDriver.toString();
        if (!ridesByDriverId.has(key)) ridesByDriverId.set(key, []);
        ridesByDriverId.get(key).push(ride);
      }

      const availableDrivers = candidateDrivers.filter(
        (driver) => !hasScheduleConflict(candidateRide, ridesByDriverId.get(driver._id.toString()) || [])
      );
      return res.json(availableDrivers);
    } catch (err) {
      return res.status(500).send({ message: "Could not retrieve drivers" });
    }
  }

  if (status && !Driver.schema.path("status").enumValues.includes(status)) {
    return res.status(400).send({ message: "Invalid driver status filter" });
  }

  try {
    // No explicit ?status= filter: removed (soft-deleted) drivers are
    // excluded by default, matching "the normal list" semantics used by
    // GET /vehicle. An explicit ?status=removed still works like any other
    // status value, in case a removed driver ever needs to be looked up directly.
    const filter = { companyId: req.user.companyId, status: status || { $ne: "removed" } };
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

// Soft-delete only - NEVER a hard delete. A driver can be referenced by
// historical rides (ride.assignedDriver); deleting one just excludes them
// from the active driver list and new assignments (GET / above, and its
// schedule-aware ?pickupDate= branch), while existing rides referencing
// them keep resolving to a real document exactly as before. Manager only,
// company-scoped, idempotent-rejecting (409 if already removed) - same
// pattern as routes/vehicleRoutes.js's PATCH /:id/remove.
router.patch("/:id/remove", requireAuth, requireRole("manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send({ message: "Invalid driver id" });

  try {
    const driver = await Driver.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!driver) return res.status(404).send({ message: "Driver not found" });
    if (driver.status === "removed") return res.status(409).send({ message: "This driver has already been deleted" });

    driver.status = "removed";
    await driver.save();
    res.json(driver);
  } catch (err) {
    res.status(500).send({ message: "Could not delete driver" });
  }
});

module.exports = router;
