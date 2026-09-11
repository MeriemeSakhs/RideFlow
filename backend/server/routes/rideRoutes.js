const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const { rideCreateValidation, rideUpdateValidation } = require("../models/rideValidator");
const { requireAuth, requireRole } = require("../middleware/auth");

const FINAL_STATUSES = ["completed", "cancelled"];

// Create a ride request
router.post("/", requireAuth, requireRole("dispatcher"), async (req, res) => {
  const { success, data, error } = rideCreateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const ride = new Ride(data);
    const savedRide = await ride.save();
    res.status(201).json(savedRide);
  } catch (error) {
    res.status(400).json({ message: "Could not create ride request" });
  }
});

// List rides, optionally filtered by status (?status=requested)
router.get("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { status } = req.query;

  if (status && !Ride.schema.path("status").enumValues.includes(status)) {
    return res.status(400).send({ message: "Invalid ride status filter" });
  }

  try {
    const filter = status ? { status } : {};
    const rides = await Ride.find(filter).sort({ rideDate: -1 });
    res.json(rides);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve rides" });
  }
});

// Retrieve a single ride
router.get("/:id", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).send({ message: "Ride not found" });
    res.json(ride);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve ride" });
  }
});

// Update a ride's details (pickup/dropoff/date/passenger info/vehicle type only)
router.put("/:id", requireAuth, requireRole("dispatcher"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  const { success, data, error } = rideUpdateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const existingRide = await Ride.findById(req.params.id);
    if (!existingRide) return res.status(404).send({ message: "Ride not found" });

    if (FINAL_STATUSES.includes(existingRide.status)) {
      return res.status(409).send({ message: `Cannot update a ride that is already ${existingRide.status}` });
    }

    Object.assign(existingRide, data);

    if (existingRide.pickupLocation.toLowerCase() === existingRide.dropoffLocation.toLowerCase()) {
      return res.status(400).send({ message: 'Pickup and dropoff locations cannot be the same' });
    }

    const updatedRide = await existingRide.save();
    res.json(updatedRide);
  } catch (error) {
    res.status(400).json({ message: "Could not update ride" });
  }
});

// Cancel a ride
router.patch("/:id/cancel", requireAuth, requireRole("dispatcher"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const existingRide = await Ride.findById(req.params.id);
    if (!existingRide) return res.status(404).send({ message: "Ride not found" });

    if (existingRide.status === "cancelled") {
      return res.status(409).send({ message: "Ride is already cancelled" });
    }
    if (existingRide.status === "completed") {
      return res.status(409).send({ message: "Cannot cancel a completed ride" });
    }

    existingRide.status = "cancelled";
    const cancelledRide = await existingRide.save();
    res.json(cancelledRide);
  } catch (error) {
    res.status(500).send({ message: "Could not cancel ride" });
  }
});

module.exports = router;
