const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const Driver = require("../models/driverModel");
const { rideCreateValidation, rideUpdateValidation } = require("../models/rideValidator");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendAssignmentSms } = require("../utilities/smsNotifier");

const FINAL_STATUSES = ["completed", "cancelled"];
const ASSIGNED_DRIVER_FIELDS = "name phone licenseNumber status";

// Create a ride request - Managers may also create rides (e.g. while viewing
// the Dispatcher portal in Dispatcher Mode); they always retain their actual
// "manager" role for authorization purposes, this only affects what actions
// their token is permitted to perform.
router.post("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { success, data, error } = rideCreateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const ride = new Ride({
      ...data,
      companyId: req.user.companyId,
      companyName: req.user.companyName,
      companySlug: req.user.companySlug,
      createdBy: req.user.id,
    });
    const savedRide = await ride.save();
    res.status(201).json(savedRide);
  } catch (error) {
    res.status(400).json({ message: "Could not create ride request" });
  }
});

// List rides for the dispatcher/manager's own company, optionally filtered by status (?status=requested)
router.get("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { status } = req.query;

  if (status && !Ride.schema.path("status").enumValues.includes(status)) {
    return res.status(400).send({ message: "Invalid ride status filter" });
  }

  try {
    const filter = { companyId: req.user.companyId, ...(status ? { status } : {}) };
    const rides = await Ride.find(filter).populate("assignedDriver", ASSIGNED_DRIVER_FIELDS).sort({ rideDate: -1 });
    res.json(rides);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve rides" });
  }
});

// Retrieve a single ride belonging to the caller's company
router.get("/:id", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const ride = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId }).populate(
      "assignedDriver",
      ASSIGNED_DRIVER_FIELDS
    );
    if (!ride) return res.status(404).send({ message: "Ride not found" });
    res.json(ride);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve ride" });
  }
});

// Update a ride's details (pickup/dropoff/date/passenger info/vehicle type only)
router.put("/:id", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  const { success, data, error } = rideUpdateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const existingRide = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId });
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

// Assign a driver to a ride. The dispatcher always chooses the driver
// manually from the available list shown by the frontend - nothing here
// picks a driver automatically (by proximity, workload, or any other rule).
router.patch("/:id/assign", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  const { driverId } = req.body;
  if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
    return res.status(400).send({ message: "A valid driver must be selected" });
  }

  try {
    const rideCheck = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!rideCheck) return res.status(404).send({ message: "Ride not found" });

    if (rideCheck.status !== "requested") {
      return res.status(409).send({ message: `Cannot assign a driver to a ride that is already ${rideCheck.status}` });
    }

    // Atomic find-and-update, scoped to this company and to still being
    // available - this is what prevents a race between two dispatchers
    // assigning the same driver to two different rides at once.
    const driver = await Driver.findOneAndUpdate(
      { _id: driverId, companyId: req.user.companyId, status: "available" },
      { status: "assigned" },
      { new: true }
    );

    if (!driver) {
      const driverExistsInCompany = await Driver.exists({ _id: driverId, companyId: req.user.companyId });
      if (!driverExistsInCompany) return res.status(404).send({ message: "Driver not found" });
      return res.status(409).send({ message: "This driver is no longer available" });
    }

    // The ride claim is ALSO atomic and re-checks status:"requested" - this is
    // what actually prevents a duplicate/retried assignment request (or a
    // second dispatcher racing the first) from both succeeding and each
    // sending their own SMS for the same ride. Only one request can ever win this.
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId, status: "requested" },
      { assignedDriver: driver._id, status: "assigned" },
      { new: true }
    ).populate("assignedDriver", ASSIGNED_DRIVER_FIELDS);

    if (!updatedRide) {
      // Someone else claimed this ride between our check above and now -
      // release the driver we just locked so they aren't stuck "assigned"
      // to a ride that isn't actually theirs.
      await Driver.updateOne({ _id: driver._id, companyId: req.user.companyId }, { status: "available" });
      return res.status(409).send({ message: "This ride was just assigned by someone else" });
    }

    // The assignment is now durably saved. Everything from here is
    // best-effort - an SMS provider failure must never undo it.
    let smsStatus = "sent";
    try {
      await sendAssignmentSms(updatedRide, driver);
    } catch (smsErr) {
      console.error("Failed to send driver assignment SMS:", smsErr.message);
      smsStatus = "failed";
    }

    res.json({ ride: updatedRide, smsStatus });
  } catch (error) {
    res.status(500).send({ message: "Could not assign driver" });
  }
});

// Mark a ride completed. No dedicated frontend action exists for this yet
// (out of scope for #8, which is about assignment status + SMS) - added so
// "driver returns to available when their ride completes" (a #8 requirement)
// has a real path to occur, mirroring the existing /cancel endpoint's shape.
router.patch("/:id/complete", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const existingRide = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!existingRide) return res.status(404).send({ message: "Ride not found" });

    if (!["assigned", "in-progress"].includes(existingRide.status)) {
      return res.status(409).send({ message: `Cannot complete a ride that is ${existingRide.status}` });
    }

    if (existingRide.assignedDriver) {
      await Driver.updateOne(
        { _id: existingRide.assignedDriver, companyId: req.user.companyId, status: "assigned" },
        { status: "available" }
      );
    }

    existingRide.status = "completed";
    const completedRide = await existingRide.save();
    res.json(completedRide);
  } catch (error) {
    res.status(500).send({ message: "Could not complete ride" });
  }
});

// Cancel a ride
router.patch("/:id/cancel", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const existingRide = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!existingRide) return res.status(404).send({ message: "Ride not found" });

    if (existingRide.status === "cancelled") {
      return res.status(409).send({ message: "Ride is already cancelled" });
    }
    if (existingRide.status === "completed") {
      return res.status(409).send({ message: "Cannot cancel a completed ride" });
    }

    // Cancelling an already-assigned ride frees the driver back up - without
    // this they'd be stuck "assigned" forever with no ride to actually work.
    if (existingRide.assignedDriver) {
      await Driver.updateOne(
        { _id: existingRide.assignedDriver, companyId: req.user.companyId, status: "assigned" },
        { status: "available" }
      );
    }

    existingRide.status = "cancelled";
    const cancelledRide = await existingRide.save();
    res.json(cancelledRide);
  } catch (error) {
    res.status(500).send({ message: "Could not cancel ride" });
  }
});

module.exports = router;
