const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Vehicle = require("../models/vehiculeModel");
const Driver = require("../models/driverModel");
const { vehicleCreateValidation, vehicleUpdateValidation } = require("../models/vehicleValidator");
const { requireAuth, requireRole } = require("../middleware/auth");

const { INACTIVE_STATUSES } = Vehicle;
const DRIVER_FIELDS = "name phone licenseNumber status";

// Verifies a driver belongs to the caller's own company - same ownership
// pattern as routes/pricingRoutes.js's findOwnedVehicle. Returns true if
// driverId is null/undefined (no assignment) or a real, owned driver.
const isOwnedDriverOrUnassigned = async (companyId, driverId) => {
  if (driverId === null || driverId === undefined) return true;
  return !!(await Driver.findOne({ _id: driverId, companyId }));
};

// List this company's ACTIVE vehicles (excludes inactive/removed - see
// INACTIVE_STATUSES) - this is "the normal vehicle list" the All Vehicles
// page and the pricing rule dropdown both read from. companyId always
// comes from the verified JWT, never the request.
router.get("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ companyId: req.user.companyId, status: { $nin: INACTIVE_STATUSES } })
      .populate("assignedDriver", DRIVER_FIELDS)
      .sort({ vehicleType: 1, make: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve vehicles" });
  }
});

// Manager-only - adds a vehicle to the manager's own company/fleet.
router.post("/", requireAuth, requireRole("manager"), async (req, res) => {
  const { success, data, error } = vehicleCreateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const existingVehicleId = await Vehicle.findOne({ companyId: req.user.companyId, vehicleId: data.vehicleId });
    if (existingVehicleId) return res.status(409).send({ message: "A vehicle with this Vehicle ID already exists" });

    const existingPlate = await Vehicle.findOne({ licensePlate: data.licensePlate });
    if (existingPlate) return res.status(409).send({ message: "A vehicle with this license plate already exists" });

    if (!(await isOwnedDriverOrUnassigned(req.user.companyId, data.assignedDriver))) {
      return res.status(404).send({ message: "Driver not found" });
    }

    const vehicle = new Vehicle({ ...data, companyId: req.user.companyId });
    const savedVehicle = await vehicle.save();
    await savedVehicle.populate("assignedDriver", DRIVER_FIELDS);
    res.status(201).json(savedVehicle);
  } catch (err) {
    if (err.code === 11000) return res.status(409).send({ message: "A vehicle with this Vehicle ID or license plate already exists" });
    res.status(400).send({ message: "Could not create vehicle" });
  }
});

// Edit a vehicle's details - manager only, company-scoped (404, not 403, on
// a mismatch, so a vehicle id reveals nothing about another company's
// fleet). vehicleId is never accepted here - see its model comment for why.
router.put("/:id", requireAuth, requireRole("manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send({ message: "Invalid vehicle id" });

  const { success, data, error } = vehicleUpdateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!vehicle) return res.status(404).send({ message: "Vehicle not found" });

    if (data.licensePlate && data.licensePlate !== vehicle.licensePlate) {
      const collision = await Vehicle.findOne({ _id: { $ne: vehicle._id }, licensePlate: data.licensePlate });
      if (collision) return res.status(409).send({ message: "A vehicle with this license plate already exists" });
    }

    if ("assignedDriver" in data && !(await isOwnedDriverOrUnassigned(req.user.companyId, data.assignedDriver))) {
      return res.status(404).send({ message: "Driver not found" });
    }

    Object.assign(vehicle, data);
    await vehicle.save();
    await vehicle.populate("assignedDriver", DRIVER_FIELDS);
    res.json(vehicle);
  } catch (err) {
    res.status(400).send({ message: "Could not update vehicle" });
  }
});

// Soft-delete only - NEVER a hard delete. A vehicle can be referenced by
// historical rides (ride.vehicleId) and by PriceRule documents; deleting it
// just flips status to "inactive" so those existing references keep
// resolving to a real document exactly as before. The only behavior change
// is forward-looking: an inactive vehicle is excluded from the "All
// Vehicles" list and the pricing rule dropdown (GET /, above), and rejected
// if used to create a NEW pricing rule or price a NEW ride
// (routes/pricingRoutes.js, routes/rideRoutes.js) - existing pricing rules
// and rides for it are left completely untouched. Manager only, company-
// scoped, idempotent-rejecting (409 if already inactive/removed).
router.patch("/:id/remove", requireAuth, requireRole("manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send({ message: "Invalid vehicle id" });

  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!vehicle) return res.status(404).send({ message: "Vehicle not found" });
    if (INACTIVE_STATUSES.includes(vehicle.status)) return res.status(409).send({ message: "This vehicle has already been deleted" });

    vehicle.status = "inactive";
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).send({ message: "Could not delete vehicle" });
  }
});

module.exports = router;
